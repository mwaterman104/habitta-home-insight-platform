

# Implementation: Replacement Tradeoff Engine

## Overview

Replace the broken `calculate_cost_impact` stub with a deterministic replacement tradeoff engine that quantifies the financial consequences of waiting versus proactive replacement.

**Core Principle**: The system evaluates tradeoffs, not estimates. Every output answers:
> "What do I gain or risk by waiting versus acting now — and why?"

---

## Data Sources (Already Available)

| Source | Location | Data |
|--------|----------|------|
| System configs | `_shared/systemConfigs.ts` | `replacementCostRange`, `displayName`, `baselineLifespan` |
| System context | `ai-home-assistant/index.ts` | `EnrichedSystemContext` with `lifecycleStage`, `replacementWindow`, `dataQuality`, `disclosureNote` |
| Emergency premiums | `client/mock/cost_model.json` | Category-specific multipliers (will extract to constants) |

---

## Technical Changes

### File 1: `supabase/functions/_shared/systemConfigs.ts`

**Add emergency premium constants (after line 105):**

```typescript
/**
 * Emergency replacement premium multipliers by system type
 * Based on industry data for unplanned vs planned replacements
 * Emergency work typically costs 40-80% more due to:
 * - Rush scheduling
 * - Limited contractor availability
 * - No time for competitive bidding
 * - Potential secondary damage
 */
export const EMERGENCY_PREMIUMS: Record<SystemType, number> = {
  hvac: 0.60,           // 60% premium - high demand, specialized
  roof: 0.50,           // 50% premium - weather urgency
  water_heater: 0.60,   // 60% premium - immediate need
  electrical_panel: 0.40, // 40% premium - less time-critical
  plumbing: 0.70,       // 70% premium - water damage risk
  pool: 0.35,           // 35% premium - seasonal flexibility
  solar: 0.30,          // 30% premium - rarely emergency
};

export const DEFAULT_EMERGENCY_PREMIUM = 0.60;

export function getEmergencyPremium(systemType: string): number {
  const normalized = systemType.toLowerCase().replace(/[^a-z_]/g, '');
  return EMERGENCY_PREMIUMS[normalized as SystemType] ?? DEFAULT_EMERGENCY_PREMIUM;
}
```

---

### File 2: `supabase/functions/ai-home-assistant/index.ts`

**Update import (line 12):**

```typescript
import { 
  SYSTEM_CONFIGS, 
  getSystemConfig, 
  getEmergencyPremium,
  type SystemConfig 
} from '../_shared/systemConfigs.ts';
```

**Replace the `calculate_cost_impact` handler (lines 1167-1169):**

```typescript
case 'calculate_cost_impact': {
  // Normalize repair_type to system key
  const rawType = parsedArgs.repair_type || 'water_heater';
  const systemType = rawType.toLowerCase().replace(/\s+/g, '_');
  const config = getSystemConfig(systemType);
  
  // Find the system in context
  const systemContext = context.systems?.find((s: EnrichedSystemContext) => 
    s.kind.toLowerCase() === systemType
  );
  
  // HONESTY GATE: If no system data, don't fabricate
  if (!systemContext) {
    return JSON.stringify({
      type: 'replacement_tradeoff',
      success: false,
      systemType,
      displayName: config.displayName,
      message: `I don't have enough information about your ${config.displayName.toLowerCase()} to provide a cost comparison. Would you like to tell me when it was installed?`
    });
  }
  
  // Step 1: Establish cost baselines
  const plannedLow = config.replacementCostRange.min;
  const plannedHigh = config.replacementCostRange.max;
  
  // Step 2: Apply emergency premium
  const emergencyPremium = getEmergencyPremium(systemType);
  const emergencyPremiumPercent = Math.round(emergencyPremium * 100);
  const emergencyLow = Math.round(plannedLow * (1 + emergencyPremium));
  const emergencyHigh = Math.round(plannedHigh * (1 + emergencyPremium));
  
  // Step 3: Calculate timeline context
  const currentYear = new Date().getFullYear();
  const yearsUntilLikely = systemContext.replacementWindow?.likelyYear 
    ? systemContext.replacementWindow.likelyYear - currentYear 
    : null;
  
  // Step 4: Determine risk band (from lifecycle stage + years remaining)
  let riskBand: 'low' | 'moderate' | 'elevated';
  if (systemContext.lifecycleStage === 'late' || (yearsUntilLikely !== null && yearsUntilLikely <= 2)) {
    riskBand = 'elevated';
  } else if (systemContext.lifecycleStage === 'mid' || (yearsUntilLikely !== null && yearsUntilLikely <= 5)) {
    riskBand = 'moderate';
  } else {
    riskBand = 'low';
  }
  
  // Step 5: Compute tradeoff delta (cost of being forced vs choosing)
  const tradeoffLow = emergencyLow - plannedLow;
  const tradeoffHigh = emergencyHigh - plannedHigh;
  
  // Step 6: Neutral recommendations based on risk band
  const recommendations: Record<'low' | 'moderate' | 'elevated', string> = {
    elevated: 'Planning ahead reduces the risk of higher emergency costs.',
    moderate: 'This is a reasonable window to research options and budget.',
    low: 'No action needed now; periodic review is sufficient.',
  };
  
  return JSON.stringify({
    type: 'replacement_tradeoff',
    success: true,
    systemType,
    displayName: config.displayName,
    plannedReplacement: {
      low: plannedLow,
      high: plannedHigh,
      label: 'Planned replacement'
    },
    emergencyReplacement: {
      low: emergencyLow,
      high: emergencyHigh,
      label: 'Emergency replacement',
      premiumPercent: emergencyPremiumPercent
    },
    tradeoffDelta: {
      low: tradeoffLow,
      high: tradeoffHigh,
      description: 'By replacing proactively vs. emergency'
    },
    yearsUntilLikely,
    riskBand,
    recommendation: recommendations[riskBand],
    dataQuality: systemContext.dataQuality,
    disclosureNote: systemContext.disclosureNote
  });
}
```

---

### File 3: `src/lib/chatFormatting.ts`

**Add type definition (after line 39):**

```typescript
export interface ReplacementTradeoffData {
  success: boolean;
  systemType: string;
  displayName?: string;
  plannedReplacement?: { low: number; high: number; label: string };
  emergencyReplacement?: { low: number; high: number; label: string; premiumPercent: number };
  tradeoffDelta?: { low: number; high: number; description: string };
  yearsUntilLikely?: number | null;
  riskBand?: 'low' | 'moderate' | 'elevated';
  recommendation?: string;
  dataQuality?: string;
  disclosureNote?: string;
  message?: string;
}
```

**Update ExtractedStructuredData interface (line 41-51):**

```typescript
export interface ExtractedStructuredData {
  contractors?: {
    service?: string;
    disclaimer: string;
    confidence: string;
    items: ContractorRecommendation[];
    message?: string;
    suggestion?: string;
  };
  systemUpdate?: SystemUpdateData;
  replacementTradeoff?: ReplacementTradeoffData;  // NEW
}
```

**Add extraction function (after extractSystemUpdateData, around line 150):**

```typescript
/**
 * Extract replacement tradeoff JSON and convert to human-readable message
 */
function extractReplacementTradeoffData(content: string): {
  replacementTradeoff?: ReplacementTradeoffData;
  cleanedContent: string;
  humanReadableMessage?: string;
} {
  const jsonPattern = /\{[\s\S]*?"type":\s*"replacement_tradeoff"[\s\S]*?\}/g;
  
  let cleanedContent = content;
  let replacementTradeoff: ReplacementTradeoffData | undefined;
  let humanReadableMessage: string | undefined;
  
  const matches = content.match(jsonPattern);
  if (matches) {
    for (const match of matches) {
      try {
        const data = JSON.parse(match);
        if (data.type === 'replacement_tradeoff') {
          replacementTradeoff = data;
          humanReadableMessage = buildReplacementTradeoffMessage(data);
          cleanedContent = cleanedContent.replace(match, '');
        }
      } catch (e) {
        console.warn('Failed to parse replacement tradeoff JSON:', e);
        cleanedContent = cleanedContent.replace(match, '');
      }
    }
  }
  
  return { replacementTradeoff, cleanedContent, humanReadableMessage };
}

/**
 * Build human-readable tradeoff message
 * Following advisor copy governance: ranges only, no urgency language
 */
function buildReplacementTradeoffMessage(data: ReplacementTradeoffData): string {
  if (!data.success) {
    return data.message || "I couldn't generate a cost comparison for that system.";
  }
  
  const formatRange = (low: number, high: number) => {
    if (low === high) return `$${low.toLocaleString()}`;
    return `$${low.toLocaleString()}–$${high.toLocaleString()}`;
  };
  
  const displayName = data.displayName || data.systemType.replace(/_/g, ' ');
  
  let message = `**Replacement Cost Tradeoff: ${displayName}**\n\n`;
  
  // Planned replacement
  if (data.plannedReplacement) {
    message += `• **${data.plannedReplacement.label}**: ${formatRange(data.plannedReplacement.low, data.plannedReplacement.high)}\n`;
  }
  
  // Emergency replacement
  if (data.emergencyReplacement) {
    message += `• **${data.emergencyReplacement.label}**: ${formatRange(data.emergencyReplacement.low, data.emergencyReplacement.high)}`;
    if (data.emergencyReplacement.premiumPercent) {
      message += ` (${data.emergencyReplacement.premiumPercent}% premium)`;
    }
    message += '\n';
  }
  
  // Tradeoff delta
  if (data.tradeoffDelta) {
    message += `• **Potential cost difference**: ${formatRange(data.tradeoffDelta.low, data.tradeoffDelta.high)}\n`;
  }
  
  // Timeline
  if (data.yearsUntilLikely !== null && data.yearsUntilLikely !== undefined) {
    message += `\n**Timeline**: Replacement likely needed in ~${data.yearsUntilLikely} years.\n`;
  }
  
  // Recommendation (neutral framing)
  if (data.recommendation) {
    message += `\n${data.recommendation}`;
  }
  
  // Disclosure note
  if (data.disclosureNote) {
    message += `\n\n_${data.disclosureNote}_`;
  }
  
  return message;
}
```

**Update extractAndSanitize function (lines 281-311):**

```typescript
export function extractAndSanitize(content: string): NormalizedContent {
  const structuredData: ExtractedStructuredData = {};
  
  // 1. Extract contractor data first
  const { contractors, cleanedContent: afterContractors } = extractContractorData(content);
  if (contractors) {
    structuredData.contractors = contractors;
  }
  
  // 2. Extract system update data
  const { systemUpdate, cleanedContent: afterSystemUpdate, humanReadableMessage: systemUpdateMsg } = extractSystemUpdateData(afterContractors);
  if (systemUpdate) {
    structuredData.systemUpdate = systemUpdate;
  }
  
  // 3. Extract replacement tradeoff data (NEW)
  const { replacementTradeoff, cleanedContent: afterTradeoff, humanReadableMessage: tradeoffMsg } = extractReplacementTradeoffData(afterSystemUpdate);
  if (replacementTradeoff) {
    structuredData.replacementTradeoff = replacementTradeoff;
  }
  
  // 4. Strip remaining artifact tags
  let cleanText = stripArtifactTags(afterTradeoff);
  
  // 5. Append human-readable messages
  const messages = [systemUpdateMsg, tradeoffMsg].filter(Boolean);
  for (const msg of messages) {
    if (cleanText.trim() === '') {
      cleanText = msg!;
    } else {
      cleanText = `${cleanText.trim()}\n\n${msg}`;
    }
  }
  
  // 6. Clean up excessive whitespace
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();
  
  return { cleanText, structuredData };
}
```

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `supabase/functions/_shared/systemConfigs.ts` | Add `EMERGENCY_PREMIUMS` constants and `getEmergencyPremium()` helper |
| `supabase/functions/ai-home-assistant/index.ts` | Import emergency premium helper; replace `calculate_cost_impact` stub with full tradeoff logic |
| `src/lib/chatFormatting.ts` | Add `ReplacementTradeoffData` type, extraction function, message builder; update `extractAndSanitize` |

---

## Expected Output

### Before (Broken)

User: "yes" (to cost comparison offer)

> "Cost comparisons for water heater replacement require specific system and regional data..."

### After (Fixed)

User: "yes" (to cost comparison offer)

> **Replacement Cost Tradeoff: Water Heater**
>
> • **Planned replacement**: $1,200–$3,500
> • **Emergency replacement**: $1,920–$5,600 (60% premium)
> • **Potential cost difference**: $720–$2,100
>
> **Timeline**: Replacement likely needed in ~2 years.
>
> Planning ahead reduces the risk of higher emergency costs.
>
> _Based on confirmed installation data. Actual costs vary by region and unit._

---

## Governance Alignment

- **Honesty Gate**: Returns structured failure with clarifying prompt if system data is missing
- **Evidence-first**: Uses only data present in `EnrichedSystemContext`
- **Ranges, not precision**: Always shows `$X–$Y`, never false exactness
- **Neutral framing**: Recommendations reference planning, never urgency/commands
- **Normalization layer**: Follows existing pattern for `system_update` and `contractor_recommendations`

---

## Test Checklist

- [ ] Water heater tradeoff returns real numbers from `SYSTEM_CONFIGS`
- [ ] HVAC tradeoff works (verify $6,000–$12,000 base, 60% premium)
- [ ] Roof tradeoff works (verify $8,000–$25,000 base, 50% premium)
- [ ] Unknown system gracefully prompts for more info
- [ ] Currency formatting uses proper separators (e.g., `$12,000`)
- [ ] Disclosure notes appear when `disclosureNote` is present
- [ ] Risk bands correctly map to lifecycle stage
- [ ] No urgency language or commands in output

