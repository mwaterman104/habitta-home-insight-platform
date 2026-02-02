
# Implementation Plan: Fix Cost Comparison for Proposed Systems

## Problem Summary

When a user asks about **adding a mini-split** (a hypothetical/proposed system), the AI:
1. ✅ Correctly identifies the existing HVAC install date (2023)
2. ❌ Then claims "I don't have enough information about your HVAC system" when providing cost comparison

**Root Cause**: The `calculate_cost_impact` tool only works for **existing systems** in the database. When the lookup fails for a proposed system, it returns an epistemic error that the AI parrots.

---

## Solution: Three Coordinated Changes

### File 1: `supabase/functions/_shared/systemConfigs.ts`

**Add mini-split as a supported system type:**

1. Update `SystemType` union (line 13):
```typescript
export type SystemType = 'hvac' | 'roof' | 'water_heater' | 'electrical_panel' | 'plumbing' | 'pool' | 'solar' | 'mini_split';
```

2. Add `rushInstallPremium` to `SystemConfig` interface (optional field):
```typescript
rushInstallPremium?: number;
```

3. Add mini-split config to `SYSTEM_CONFIGS` (after solar, line 104):
```typescript
mini_split: {
  baselineLifespan: 20,
  sigma: 3.0,
  permitKeywords: ['mini-split', 'ductless', 'mini split', 'ductless heat pump', 'ductless ac'],
  replacementPenalty: 0.01,
  climateMultiplierMax: 0.10,
  displayName: 'Mini-Split',
  replacementCostRange: { min: 1500, max: 5000 }, // Per zone
  rushInstallPremium: 0.15, // 15% - expedited scheduling, not emergency
},
```

4. Add to `EMERGENCY_PREMIUMS` (line 135):
```typescript
mini_split: 0.20, // 20% premium - specialized but lower urgency
```

---

### File 2: `supabase/functions/ai-home-assistant/index.ts`

**Update tool definition (lines 583-598):**
```typescript
{
  type: 'function',
  function: {
    name: 'calculate_cost_impact',
    description: 'Calculate cost information for repairs, replacements, or NEW installations. Works for EXISTING systems (provides replacement timing + emergency vs planned costs) and PROPOSED additions (provides typical installation cost ranges).',
    parameters: {
      type: 'object',
      properties: {
        repair_type: { type: 'string', description: 'Type of repair, system, or addition (e.g., "hvac", "mini_split", "water_heater")' },
        delay_months: { type: 'number', description: 'Months to delay the work (for existing systems only)' },
        quantity: { type: 'number', description: 'Number of units or zones (for proposed additions, defaults to 1)' }
      },
      required: ['repair_type'],
      additionalProperties: false
    }
  }
}
```

**Update tool implementation (lines 1167-1256):**
```typescript
case 'calculate_cost_impact': {
  const { getSystemConfig, getEmergencyPremium } = await import('../_shared/systemConfigs.ts');
  
  const rawType = parsedArgs.repair_type || 'water_heater';
  const systemType = rawType.toLowerCase().replace(/\s+/g, '_');
  const quantity = parsedArgs.quantity ?? 1;
  const config = getSystemConfig(systemType);
  
  // Find the system in context
  const systemContext = context.systems?.find((s: EnrichedSystemContext) => 
    s.kind.toLowerCase() === systemType
  );
  
  // Determine system mode: existing (in DB) or proposed (new addition)
  const systemMode = systemContext ? 'existing' : 'proposed';
  
  // ===== PROPOSED SYSTEM PATH =====
  // Provide cost ranges for systems not yet in the home
  if (systemMode === 'proposed') {
    const baseLow = config.replacementCostRange.min * quantity;
    const baseHigh = config.replacementCostRange.max * quantity;
    
    // Use rush premium if defined, otherwise fall back to emergency premium
    const rushPremium = config.rushInstallPremium ?? getEmergencyPremium(systemType);
    const rushPremiumPercent = Math.round(rushPremium * 100);
    
    return JSON.stringify({
      type: 'proposed_addition',
      success: true,
      systemMode: 'proposed',
      systemType,
      displayName: config.displayName,
      quantity,
      estimatedCost: {
        low: baseLow,
        high: baseHigh,
        label: quantity > 1 
          ? `Typical installation range (${quantity} zones)` 
          : 'Typical installation range'
      },
      rushPremium: {
        percent: rushPremiumPercent,
        low: Math.round(baseLow * (1 + rushPremium)),
        high: Math.round(baseHigh * (1 + rushPremium)),
        label: 'Expedited scheduling'
      },
      expectedLifespan: config.baselineLifespan,
      recommendation: 'Get 2–3 quotes from licensed contractors for pricing specific to your home.'
    });
  }
  
  // ===== EXISTING SYSTEM PATH =====
  // Original logic continues unchanged...
  const plannedLow = config.replacementCostRange.min;
  // ... rest of existing code
}
```

**Add cost rules to system prompt (in createSystemPrompt, around line 950):**
```typescript
// Add after copy governance injection
COST CALCULATION RULES:
- For EXISTING systems: calculate_cost_impact returns replacement timing + emergency vs planned costs
- For PROPOSED additions (mini-split, new system): calculate_cost_impact returns typical installation cost ranges
- Never claim "no information" if a valid cost range exists — present what you know
- Use "rush install" language for new additions, not "emergency" language
- Always recommend getting 2–3 quotes from licensed contractors
```

---

## Behavior Changes

### Before (Bug)
```
User: "What would it cost to add a mini-split?"
AI: "Based on permit records, your main HVAC was installed in 2023..."
    [calls calculate_cost_impact("mini_split")]
    [tool returns error: "I don't have enough information"]
AI: "I don't have enough information about your HVAC to provide cost comparison."
```

### After (Fixed)
```
User: "What would it cost to add a mini-split?"
AI: "Based on permit records, your main HVAC was installed in 2023..."
    [calls calculate_cost_impact("mini_split")]
    [tool returns: { type: 'proposed_addition', estimatedCost: { low: 1500, high: 5000 } }]
AI: "A mini-split typically costs between $1,500–$5,000 per zone for installation. 
     Since your main HVAC is relatively new (2023), a mini-split would supplement it 
     for specific zones. I'd recommend getting 2–3 quotes from licensed contractors."
```

---

## Files Modified

| File | Action | Changes |
|------|--------|---------|
| `supabase/functions/_shared/systemConfigs.ts` | MODIFY | Add `mini_split` to type, config, and emergency premiums |
| `supabase/functions/ai-home-assistant/index.ts` | MODIFY | Update tool definition, add proposed system logic path, update system prompt |

---

## Test Scenarios

1. **Proposed addition**: Ask "What would it cost to add a mini-split?" → Returns $1,500–$5,000 range
2. **Multiple zones**: Ask about "3-zone mini-split" → Returns multiplied cost range
3. **Existing system**: Ask "What would it cost to replace my HVAC?" → Returns full replacement tradeoff with timeline
4. **Mixed context**: Ask about mini-split when HVAC is known → References HVAC date AND provides mini-split costs
5. **Unknown type normalization**: Ask about "ductless" → Normalizes to mini_split and provides costs
