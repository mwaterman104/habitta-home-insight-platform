
# Signal Orchestration Implementation Plan

## Overview

This plan implements the **Resolved Appliance Identity** pattern with the three refinements from QA:
1. Explicit confidence resolution separation
2. Tier-aware lifespan/planning label suppression
3. Locked "Needs confirmation" copy guardrails

---

## Architecture: Three-Layer Signal Orchestration

```text
┌─────────────────────────────────────────────────────────────────┐
│                      UI LAYER                                   │
│  ApplianceDetailView / SystemsHub Cards                         │
│  Consumes ResolvedApplianceIdentity ONLY                        │
│  Never touches raw fields                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  NORMALIZATION LAYER (NEW)                      │
│  resolveApplianceIdentity(system, catalog) →                    │
│  { title, subtitle, category, tier, confidenceState, ... }      │
│                                                                 │
│  Uses: resolveConfidenceState() (new explicit function)         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   EXTRACTION LAYER                              │
│  analyze-device-photo edge function                             │
│  Extracts: brand, model, category, year, confidence_scores      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Explicit Confidence Resolution (QA Issue #1)

### Problem
The plan called for overloading `confidenceStateFromScore` with a second parameter. This silently changes the meaning of confidence from "how sure the AI is" to "how sure the system should behave."

### Solution
Create a new explicit function `resolveConfidenceState` that clearly separates concerns.

**File: `src/lib/systemConfidence.ts`** (add new function)

```typescript
/**
 * Resolve confidence state for UI display
 * 
 * EXPLICIT ORCHESTRATOR - separates visual score from user confirmation
 * 
 * Rules (locked):
 * - userConfirmed === true → always 'high' (Guardrail 3)
 * - visualScore ≥ 0.75 → 'high' 
 * - visualScore ≥ 0.40 → 'estimated'
 * - visualScore < 0.40 → 'needs_confirmation'
 */
export function resolveConfidenceState(input: {
  visualScore: number;
  userConfirmed: boolean;
}): ConfidenceState {
  // User confirmation always grants high - this is immutable
  if (input.userConfirmed) return 'high';
  
  // Vision-only scoring
  if (input.visualScore >= 0.75) return 'high';
  if (input.visualScore >= 0.40) return 'estimated';
  return 'needs_confirmation';
}
```

This preserves the existing `confidenceStateFromScore` for backward compatibility while adding explicit orchestration logic.

---

## Phase 2: Create Resolved Appliance Identity Resolver

**New File: `src/lib/resolveApplianceIdentity.ts`**

This becomes the **sacred file** that all UI consumes. The UI never renders raw fields again.

### Interface

```typescript
import { ConfidenceState, resolveConfidenceState, getConfidenceStateLabel } from './systemConfidence';

export interface ResolvedApplianceIdentity {
  // Core identity
  title: string;                 // "LG Refrigerator"
  subtitle: string;              // "Model E82904" | "Model not identified"
  category: string | 'unknown';
  tier: 1 | 2;
  
  // Confidence
  confidenceState: ConfidenceState;
  confidenceLabel: string | null; // "Estimated" or null for high
  
  // Age & Planning (Tier 1 ONLY)
  ageLabel?: string;             // "~13 years old"
  lifespanLabel?: string;        // "Typical lifespan: 10–14 years"
  planningLabel?: string;        // "Within typical lifespan" | "Planning window"
  
  // Help messaging
  helperMessage?: string;        // One sentence max, never mentions "confidence score"
  showHelpCTA: boolean;          // Show "Help Habitta learn more"
}
```

### Resolution Rules (Locked)

| Field | Logic |
|-------|-------|
| `title` | `brand + catalog.display_name` if both known, else `brand + " appliance"`, else `display_name`, else `"Appliance"` |
| `subtitle` | `"Model " + model` if known, else `"Model not identified"` (not "unknown" - database language) |
| `confidenceState` | Uses `resolveConfidenceState({ visualScore, userConfirmed })` |
| `ageLabel` | `"~" + age + " years old"` - always uses `~` prefix for estimates |
| `lifespanLabel` | **Tier 1 only**: `"Typical lifespan: X–Y years"` (±2 year range). **Tier 2: undefined** |
| `planningLabel` | **Tier 1 only**: `"Within typical lifespan"` / `"Later part of lifespan"` / `"Planning window"`. **Tier 2: undefined** |
| `helperMessage` | One sentence max. Never mentions "confidence score". Never asks a question directly. |
| `showHelpCTA` | `confidenceState !== 'high'` |

### Key Guardrail: Tier 2 Suppression (QA Issue #2)

```typescript
// Tier 2 appliances should NOT invite planning thinking
const lifespanLabel = tier === 1
  ? `Typical lifespan: ${typicalLifespan - 2}–${typicalLifespan + 2} years`
  : undefined;

const planningLabel = tier === 1
  ? derivePlanningLabel(remainingYears)
  : undefined;
```

---

## Phase 3: Upgrade ApplianceDetailView

**File: `src/components/system/ApplianceDetailView.tsx`**

### Changes

1. **Import and use resolver** instead of computing display values inline
2. **Header shows composed identity** with inline confidence label
3. **Rename "Details" → "What I know about this appliance"**
4. **Add "Health & Planning" card** (Tier 1) or disclaimer (Tier 2)
5. **Add "Confidence & Help CTA" section** when `confidenceState !== 'high'`

### Header Update

```tsx
// Before (raw fields)
<h1>{appliance.brand} {appliance.system_catalog?.display_name}</h1>
<p>{appliance.model || 'Model unknown'}</p>

// After (composed identity)
<h1 className="text-xl font-semibold">
  {identity.title}
  {identity.confidenceLabel && (
    <span className="text-sm font-normal text-muted-foreground ml-2">
      · {identity.confidenceLabel}
    </span>
  )}
</h1>
<p className="text-muted-foreground text-sm">{identity.subtitle}</p>
{identity.ageLabel && (
  <p className="text-muted-foreground text-sm">{identity.ageLabel}</p>
)}
```

### Card Renames and New Cards

| Current | New |
|---------|-----|
| "Details" | "What I know about this appliance" |
| "Planning Outlook" | "Health & Planning" |
| (new) | "Confidence" section with CTA |

### Tier 2 Behavior

Tier 2 appliances:
- Show `identity.subtitle` ("Model not identified" if unknown)
- Show muted disclaimer: "I'll keep an eye on this, but it won't affect your home's outlook."
- Do NOT show lifespan or planning cards
- Do NOT show age framing (optional: can show age, not remaining years)

---

## Phase 4: Upgrade SystemsHub Cards

**File: `src/pages/SystemsHub.tsx`**

### Changes

1. **Use resolver for card content**
2. **Add confidence label inline** with title
3. **Replace status badges with meaningful copy** for Tier 1
4. **Keep "Tracked" badge for Tier 2** (no status language)

### Card Display

**Tier 1 Card:**
```
┌───────────────────────────────────┐
│ LG Refrigerator · Estimated       │
│ ~13 years old                     │
│ Within typical lifespan           │
└───────────────────────────────────┘
```

**Tier 2 Card (muted):**
```
┌───────────────────────────────────┐
│ Microwave · Estimated             │
│ ~6 years old                      │
│ Tracked                           │
└───────────────────────────────────┘
```

### Status Language Mapping (Tier 1 only)

| Internal Status | User Copy |
|-----------------|-----------|
| `healthy` | "Within typical lifespan" |
| `planning` | "Later part of lifespan" |
| `attention` | "Planning window" |

---

## Phase 5: Upgrade Vision Extraction (Edge Function)

**File: `supabase/functions/analyze-device-photo/index.ts`**

### Problem
Currently returns `system_type: 'appliance'` (generic). Should detect specific category.

### Solution
Expand `systemTypeKeywords` to include specific appliance categories:

```typescript
const systemTypeKeywords = {
  // Structural systems (Tier 0)
  'hvac': ['heat pump', 'air conditioner', 'furnace', ...],
  'water_heater': ['water heater', 'hot water', ...],
  'electrical': ['breaker', 'panel', ...],
  'pool_equipment': ['pool', 'pump', 'filter', ...],
  
  // Tier 1 Appliances (SPECIFIC - not generic 'appliance')
  'refrigerator': ['refrigerator', 'fridge', 'freezer'],
  'oven_range': ['oven', 'range', 'stove', 'cooktop', 'cook top'],
  'dishwasher': ['dishwasher', 'dish washer'],
  'washer': ['washer', 'washing machine', 'front load wash', 'top load wash'],
  'dryer': ['dryer', 'clothes dryer'],
  
  // Tier 2 Appliances
  'microwave': ['microwave'],
  'garbage_disposal': ['disposal', 'garbage disposal', 'disposer'],
};
```

Also update `SYSTEM_DISPLAY_NAMES` to include appliance-specific names for improved Habitta messaging.

---

## Phase 6: Upgrade TeachHabittaModal Correction Step

**File: `src/components/TeachHabittaModal.tsx`**

### Changes

1. **Update header copy**: "Just help me get closer. Rough answers are totally fine."
2. **Add age range picker** instead of exact year input
3. **Apply confidence boost logic** on user correction

### Age Range Picker

Replace year input with range buckets:

```typescript
const AGE_RANGES = [
  { value: 2, label: 'Less than 5 years' },   // midpoint for modeling
  { value: 7, label: '5–10 years' },
  { value: 12, label: '10–15 years' },
  { value: 17, label: '15+ years' },
  { value: null, label: 'Not sure' },
];
```

Document: `value` represents the midpoint used for modeling, not an exact age.

### Confidence Boost Logic (On Save)

```typescript
// When user confirms/corrects:
let boostedConfidence = baseConfidence;
if (userConfirmedSystemType) boostedConfidence += 0.25;
if (userProvidedBrand) boostedConfidence += 0.15;
if (userProvidedAgeRange) boostedConfidence += 0.15;
boostedConfidence = Math.min(boostedConfidence, 0.9);
```

---

## Copy Guardrails (Locked - QA Issue #3)

### "Needs confirmation" Rules

| Element | Behavior |
|---------|----------|
| Header label | Shown inline, muted |
| Body message | Required: calm helper message |
| CTA | Required: "Help Habitta learn more" |
| Style | No red, no icons, no urgency |

### Helper Message Rules

- Maximum one sentence
- Never mention "confidence score"
- Never ask a question directly (CTA handles that)

### Copy Examples

**Estimated:**
- Label: `· Estimated`
- Helper: "This is an estimate based on the photo."

**Needs confirmation:**
- Label: `· Needs confirmation`
- Helper: "I'm not fully sure about this yet — you can help me refine it."

---

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `src/lib/resolveApplianceIdentity.ts` | Central resolver - sacred file for all appliance display logic |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/systemConfidence.ts` | Add `resolveConfidenceState()` explicit orchestrator |
| `src/components/system/ApplianceDetailView.tsx` | Use resolver, new card layout, add Health & Planning, add Help CTA |
| `src/pages/SystemsHub.tsx` | Use resolver for cards, add confidence label, status copy |
| `src/components/TeachHabittaModal.tsx` | Update copy, add age range picker |
| `supabase/functions/analyze-device-photo/index.ts` | Expand category detection from generic 'appliance' to specific types |

---

## Expected Outcomes

**Before:**
- "LG Appliance" (no category)
- "Model unknown" (raw database field)
- No confidence signal
- No age framing
- User doesn't know what to do

**After:**
- "LG Refrigerator · Estimated" (composed identity)
- "Model E82904" or "Model not identified" (formatted)
- "~13 years old" (age framing)
- "Later part of lifespan" (planning context - Tier 1 only)
- "Help Habitta learn more" (clear next action)

**Critical:**
- Tier 2 appliances show NO lifespan/planning labels
- Confidence is visible but never loud
- The UI never renders raw fields again
