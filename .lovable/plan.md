

# Tier-Aware Home Issue Responsiveness

## Problem Summary

When a user asks about a garbage disposal breaking (a $150-$400 repair), the AI incorrectly triggers HVAC cost analysis ($6,000-$19,200). This destroys trust by presenting a disproportionately high cost for a minor issue.

**Root Cause Chain:**
1. User mentions "garbage disposal" 
2. AI calls `calculate_cost_impact` with `repair_type: "garbage_disposal"`
3. `getSystemConfig("garbage_disposal")` fails to find a match
4. Falls back to `SYSTEM_CONFIGS.hvac` (line 124 of `systemConfigs.ts`)
5. User sees HVAC replacement costs for a $200 appliance

---

## Solution: Three-Tier Classification Framework

### Tier Model

| Tier | Category | Examples | Cost Range | Response Style |
|------|----------|----------|------------|----------------|
| 1 | Small Appliance | Garbage disposal, faucet, toilet, GFCI | $50-$500 | Calm, practical, DIY-eligible |
| 2 | Medium System | Water heater repair, sump pump, garage door | $300-$3,000 | Balanced, safety-aware |
| 3 | Capital System | HVAC, Roof, Electrical Panel | $5,000+ | Strategic, planning-oriented |

---

## Implementation

### Phase 1: Add Appliance Config Registry

**File:** `supabase/functions/_shared/applianceConfigs.ts` (New)

Create a parallel configuration for appliances and minor repairs, separate from capital systems:

```typescript
export type ApplianceType = 
  | 'garbage_disposal' 
  | 'faucet' 
  | 'toilet' 
  | 'dishwasher_repair'
  | 'gfci_outlet'
  | 'garage_door_opener'
  | 'sump_pump';

export type IssueTier = 'small_appliance' | 'medium_system' | 'capital_system';

export interface ApplianceConfig {
  tier: IssueTier;
  displayName: string;
  costRange: { min: number; max: number };
  typicalLifespan: number;
  diyEligible: boolean;
  keywords: string[];
}

export const APPLIANCE_CONFIGS: Record<ApplianceType, ApplianceConfig> = {
  garbage_disposal: {
    tier: 'small_appliance',
    displayName: 'Garbage Disposal',
    costRange: { min: 150, max: 400 },
    typicalLifespan: 12,
    diyEligible: true,
    keywords: ['disposal', 'garbage disposal', 'kitchen disposal', 'insinkerator']
  },
  faucet: {
    tier: 'small_appliance',
    displayName: 'Faucet',
    costRange: { min: 100, max: 350 },
    typicalLifespan: 20,
    diyEligible: true,
    keywords: ['faucet', 'tap', 'sink faucet', 'kitchen faucet', 'bathroom faucet']
  },
  toilet: {
    tier: 'small_appliance',
    displayName: 'Toilet',
    costRange: { min: 150, max: 500 },
    typicalLifespan: 25,
    diyEligible: true,
    keywords: ['toilet', 'flapper', 'fill valve', 'running toilet']
  },
  // ... additional appliances
};
```

### Phase 2: Update getSystemConfig with Fail-Closed Behavior

**File:** `supabase/functions/_shared/systemConfigs.ts`

Replace the HVAC fallback with explicit failure:

```typescript
// CURRENT (DANGEROUS):
export function getSystemConfig(systemType: string): SystemConfig {
  const normalized = systemType.toLowerCase().replace(/[^a-z_]/g, '');
  return SYSTEM_CONFIGS[normalized as SystemType] || SYSTEM_CONFIGS.hvac; // BAD
}

// FIXED:
export function getSystemConfig(systemType: string): SystemConfig | null {
  const normalized = systemType.toLowerCase().replace(/[^a-z_]/g, '');
  return SYSTEM_CONFIGS[normalized as SystemType] || null; // Fail-closed
}

// New helper for classification
export function classifyIssueType(issueType: string): {
  tier: 'small_appliance' | 'medium_system' | 'capital_system';
  config: ApplianceConfig | SystemConfig;
} | null {
  const normalized = issueType.toLowerCase().replace(/[^a-z_]/g, '');
  
  // Check appliances first
  if (APPLIANCE_CONFIGS[normalized]) {
    return { tier: APPLIANCE_CONFIGS[normalized].tier, config: APPLIANCE_CONFIGS[normalized] };
  }
  
  // Check capital systems
  if (SYSTEM_CONFIGS[normalized]) {
    return { tier: 'capital_system', config: SYSTEM_CONFIGS[normalized] };
  }
  
  return null; // Unknown - AI should ask clarifying question
}
```

### Phase 3: Add Tier-Aware Cost Tool

**File:** `supabase/functions/ai-home-assistant/index.ts`

Update `calculate_cost_impact` to handle tiers:

```typescript
case 'calculate_cost_impact': {
  const { classifyIssueType, APPLIANCE_CONFIGS } = await import('../_shared/systemConfigs.ts');
  
  const rawType = parsedArgs.repair_type || '';
  const normalized = rawType.toLowerCase().replace(/\s+/g, '_');
  
  // STEP 1: Classify the issue
  const classification = classifyIssueType(normalized);
  
  // STEP 2: Handle unknown issues (fail-closed)
  if (!classification) {
    return JSON.stringify({
      type: 'unknown_issue',
      success: false,
      issueType: rawType,
      message: 'I need more details to provide accurate cost information.',
      suggestion: 'Can you describe the specific component or system that needs attention?'
    });
  }
  
  // STEP 3: Route to tier-appropriate handler
  if (classification.tier === 'small_appliance') {
    const applianceConfig = classification.config as ApplianceConfig;
    return JSON.stringify({
      type: 'small_appliance_repair',
      success: true,
      tier: 'small_appliance',
      displayName: applianceConfig.displayName,
      costRange: {
        low: applianceConfig.costRange.min,
        high: applianceConfig.costRange.max,
        label: 'Typical replacement cost (installed)'
      },
      diyEligible: applianceConfig.diyEligible,
      typicalLifespan: applianceConfig.typicalLifespan,
      recommendation: applianceConfig.diyEligible 
        ? 'This is often a manageable DIY project, but a plumber can also handle it quickly.'
        : 'Most homeowners hire a professional for this type of repair.',
      // NO lifecycle language, NO emergency premiums for small repairs
    });
  }
  
  // Tier 2 and 3 continue to existing logic...
}
```

### Phase 4: Add Tier-Aware System Prompt Rules

**File:** `supabase/functions/ai-home-assistant/index.ts` (createSystemPrompt)

Add mandatory tier classification instructions:

```typescript
prompt += `
ISSUE CLASSIFICATION RULES (MANDATORY - READ BEFORE EVERY RESPONSE):

Before discussing costs, repairs, or recommendations, you MUST classify the issue:

TIER 1 - SMALL APPLIANCE ($50-$500):
Examples: Garbage disposal, faucet, toilet, dishwasher drain, GFCI outlet
Response rules:
- State clearly this is a small, contained issue
- Provide realistic cost range (never more than $500)
- Offer DIY vs Pro as equal, valid paths
- NO lifecycle language, NO "system failure", NO "baseline" references
- Tone: Calm, practical, encouraging

TIER 2 - MEDIUM SYSTEM ($300-$3,000):
Examples: Water heater repair, sump pump, garage door motor
Response rules:
- Balanced, informative tone
- Safety considerations are appropriate
- DIY possible for some users
- May reference lifecycle for larger components

TIER 3 - CAPITAL SYSTEM ($5,000+):
Examples: HVAC replacement, roof, sewer line, foundation
Response rules:
- Strategic, planning-oriented
- Lifecycle and timing tradeoffs appropriate
- Recommend professional assessment

CRITICAL GUARDRAIL:
HVAC, Roof, and other capital systems may NEVER be used as defaults.
If you cannot classify the issue, ask a clarifying question instead.

FORBIDDEN LANGUAGE FOR TIER 1:
- "System failure"
- "Disrupts your home"
- "Baseline degradation"
- "Long-term risk"
- "Capital investment"
`;
```

### Phase 5: Add Mode Switching (DIY vs Pro)

Update the AI assistant to explicitly switch modes based on user intent:

```typescript
// In system prompt
prompt += `
MODE SWITCHING RULES:

DIY MODE TRIGGER - User says:
- "I'll do it myself"
- "Can I fix this?"
- "Is this a DIY job?"

DIY MODE BEHAVIOR:
- Acknowledge their capability
- Provide step-by-step guidance
- Emphasize safety
- Focus on execution, not cost modeling
- Example: "Great — this is a very manageable DIY project. I'll walk you through it."

PRO MODE TRIGGER - User says:
- "I want a plumber"
- "I'd rather hire someone"
- "Can you recommend a pro?"

PRO MODE BEHAVIOR:
- Normalize hiring help
- Explain what to ask for
- Share fair pricing expectations
- Offer local recommendations
- Example: "That makes sense. Most plumbers can replace a disposal in under an hour."
`;
```

---

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/_shared/applianceConfigs.ts` | Appliance tier registry with cost bands |

### Modified Files
| File | Changes |
|------|---------|
| `supabase/functions/_shared/systemConfigs.ts` | Remove HVAC fallback, add `classifyIssueType()` |
| `supabase/functions/ai-home-assistant/index.ts` | Tier-aware `calculate_cost_impact`, updated system prompt |

---

## Expected Behavior After Fix

**User:** "My kitchen garbage disposal broke"

**AI Response (Correct):**
> "No problem — a broken garbage disposal is usually a small, contained repair.
> 
> Most replacements run about $150–$400 installed, depending on the unit.
> 
> This is often something homeowners can handle themselves, but a plumber can also swap it quickly.
> 
> Would you like to:
> - Try a DIY fix
> - Get help finding a pro
> - Do a quick diagnosis first"

**What Will NOT Happen:**
- No HVAC cost analysis
- No "system failure" language
- No "baseline degradation" references
- No $6,000-$19,000 cost ranges

---

## Success Criteria

This fix is working when:
1. Small problems feel small (garbage disposal = $150-$400)
2. Big problems feel navigable (HVAC = strategic planning)
3. Users don't feel talked down to
4. Users act immediately instead of abandoning the chat
5. HVAC is NEVER shown as a fallback for unrecognized issues

---

## Technical Notes

### Why Not Just Add Garbage Disposal to SYSTEM_CONFIGS?

That would be architecturally wrong. `SYSTEM_CONFIGS` is for capital/structural systems with:
- Multi-decade lifespans
- Replacement windows
- Climate stress factors
- Emergency premium calculations

Small appliances don't need this complexity. They need:
- Simple cost range
- DIY eligibility flag
- Calm, practical tone

Mixing these concerns would pollute the capital system logic.

### Alignment with Frontend

The frontend already has `src/lib/applianceTiers.ts` with Tier 1/Tier 2 appliances. This fix brings the edge function into alignment with that classification.

