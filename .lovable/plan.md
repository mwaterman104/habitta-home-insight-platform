

# Semantic Tightening — QA-Approved Final Implementation

**Status: Approved with 5 Required Adjustments**

This plan incorporates all corrections from executive QA review.

---

## Summary of Required Adjustments

| # | Issue | Original Proposal | QA Correction |
|---|-------|-------------------|---------------|
| 1 | Timeline axis labels | "New / Mid-life / End of typical lifespan" | **"Within range / Approaching limit / Beyond range"** |
| 2 | Dashboard state label | "Later Stage" | **"Approaching typical limit"** |
| 3 | Confidence explainer | "Based on typical patterns" | **"Based on home age and regional patterns"** |
| 4 | Evidence-anchored copy | Generic ("is in good shape") | **Must include one concrete basis** |
| 5 | Empty chat state | "Ask me about any of them" | **Remove prompting language entirely** |

---

## File Changes

### 1. BaselineSurface.tsx — Timeline Labels & State Label

**File:** `src/components/dashboard-v3/BaselineSurface.tsx`

#### Change 1a: Timeline Axis Labels (lines 69-73)

```typescript
// BEFORE (ambiguous lifecycle stages)
<span>Early</span>
<span>Mid</span>
<span>Late</span>

// AFTER (condition-based language)
<span className="text-[10px]">Within range</span>
<span className="text-[10px]">Approaching limit</span>
<span className="text-[10px]">Beyond range</span>
```

#### Change 1b: State Label for Planning Window (line 219)

```typescript
// BEFORE (banned term)
case 'planning_window':
  return 'Planning Window';

// AFTER (neutral, descriptive)
case 'planning_window':
  return 'Approaching typical limit';
```

#### Change 1c: Add Confidence Explainer (lines 52-55)

Add helper function:
```typescript
function getConfidenceExplainer(level: 'Unknown' | 'Early' | 'Moderate' | 'High'): string {
  switch (level) {
    case 'High': return 'Verified by records';
    case 'Moderate': return 'Based on home age and regional patterns';  // QA-corrected
    case 'Early': return 'Limited data';
    default: return 'Still learning';
  }
}
```

Modify render:
```typescript
// BEFORE
<span>Confidence: <span className="text-foreground font-medium">{confidenceLevel}</span></span>

// AFTER
<div className="flex flex-col items-end">
  <span className="text-sm">
    Confidence: <span className="text-foreground font-medium">{confidenceLevel}</span>
  </span>
  <span className="text-[10px] text-muted-foreground/70">
    {getConfidenceExplainer(confidenceLevel)}
  </span>
</div>
```

---

### 2. chatModeCopy.ts — Empty State & Evidence Anchoring

**File:** `src/lib/chatModeCopy.ts`

#### Change 2a: Empty State Message (line 164)

```typescript
// BEFORE (prompting language)
baseline_establishment: "I'm monitoring with limited system history. I can share what I'm able to observe so far.",

// AFTER (stewardship, no prompting)
baseline_establishment: "I'm monitoring the systems shown above.",
```

#### Change 2b: Add Evidence-Anchored Message Helper (new function)

```typescript
/**
 * Generate evidence-anchored chat message
 * 
 * RULE: Every evidence-anchored message must include one concrete basis
 * (age, region, usage, absence of deviation, etc.)
 */
export function getEvidenceAnchoredMessage(
  systemKey: string,
  state: 'stable' | 'planning_window' | 'elevated',
  displayName: string,
  basis: 'age' | 'region' | 'usage' | 'records' = 'age'
): string {
  const basisPhrase = getBasisPhrase(basis);
  
  switch (state) {
    case 'stable':
      return `Based on what you're seeing above, your ${displayName.toLowerCase()} is within the expected range ${basisPhrase}.`;
    case 'planning_window':
      return `The baseline shows your ${displayName.toLowerCase()} approaching typical limits ${basisPhrase}.`;
    case 'elevated':
      return `I'm seeing something with your ${displayName.toLowerCase()} that warrants discussion ${basisPhrase}.`;
  }
}

function getBasisPhrase(basis: 'age' | 'region' | 'usage' | 'records'): string {
  switch (basis) {
    case 'age': return 'for homes of this age';
    case 'region': return 'for this region';
    case 'usage': return 'given typical usage patterns';
    case 'records': return 'based on available records';
  }
}
```

#### Change 2c: Add "Why?" Response Rules (new constant)

```typescript
/**
 * "Why?" Response Pattern Rules
 * 
 * Structure: Observation → Factors → Clarifier
 * 
 * CRITICAL RULE:
 * "Why?" responses may NOT introduce new recommendations or CTAs.
 * They explain why the current state exists, not what to do next.
 * Optional follow-up CTAs must live OUTSIDE the "Why?" explanation.
 */
export const WHY_RESPONSE_RULES = {
  structure: ['observation', 'factors', 'clarifier'],
  
  /** What "Why?" responses MUST include */
  required: [
    'Reference visible baseline state',
    'Include at least one concrete factor',
    'End with clarifier about confidence level',
  ],
  
  /** What "Why?" responses may NOT include */
  banned: [
    'Recommendations',
    'CTAs or calls to action',
    'Next steps',
    'Suggestions to take action',
  ],
};
```

---

### 3. lifespanFormatters.ts — Tense-Aware Formatting

**File:** `src/utils/lifespanFormatters.ts`

#### Change 3a: Update formatReplacementWindow (lines 14-23)

```typescript
/**
 * Format replacement window from p10/p90 dates
 * Now includes tense awareness for past-lifespan systems
 * 
 * @example "2036–2042" (future)
 * @example "Past typical lifespan (2020–2024)" (past)
 */
export function formatReplacementWindow(
  p10: string, 
  p90: string,
  options?: { includeTenseAwareness?: boolean }
): string {
  const y10 = new Date(p10).getFullYear();
  const y90 = new Date(p90).getFullYear();
  const currentYear = new Date().getFullYear();
  
  // Tense awareness: if current year is past the typical lifespan
  if (options?.includeTenseAwareness && currentYear > y90) {
    return `Past typical lifespan (${y10}–${y90})`;
  }
  
  if (y10 === y90) {
    return `~${y10}`;
  }
  
  return `${y10}–${y90}`;
}
```

---

### 4. ai-home-assistant Edge Function — Evidence Anchoring Rule

**File:** `supabase/functions/ai-home-assistant/index.ts`

#### Change 4a: Add Evidence Anchoring Rule to System Prompt (after line 473)

```typescript
prompt += `
EVIDENCE ANCHORING RULE (MANDATORY):
When discussing any system, you MUST:
1. Reference "what you're seeing above" or "the baseline shows"
2. Include at least one concrete basis (age, region, usage, records)

CORRECT EXAMPLES:
- "Based on what you're seeing above, your water heater is approaching typical limits for homes of this age."
- "The baseline shows your HVAC operating within expected range for this region."
- "Looking at the timeline above, your roof has significant service life remaining given typical usage patterns."

INCORRECT (too generic):
- "Your HVAC is in good shape." (no basis)
- "I can see that your water heater needs attention." (implies you see something user doesn't)
- "The system shows..." (which system?)

NEVER SAY:
- "I can see that..." (implies hidden knowledge)
- "According to my data..." (impersonal, removes agency)
- "The system shows..." (ambiguous reference)
`;
```

#### Change 4b: Add "Why?" Response Constraint (new section)

```typescript
prompt += `
"WHY?" RESPONSE CONSTRAINT:
If the user asks "Why?" about a system state:
1. EXPLAIN the observation (what the baseline shows)
2. LIST factors (age, region, patterns, records)
3. CLARIFY confidence level

DO NOT include in "Why?" responses:
- Recommendations
- CTAs or action items
- Suggestions for next steps

Guidance belongs in follow-up messages, not explanations.
`;
```

---

## Complete File Summary

| File | Lines Changed | Changes |
|------|---------------|---------|
| `src/components/dashboard-v3/BaselineSurface.tsx` | 52-55, 69-73, 214-224 | Confidence explainer, axis labels, state label |
| `src/lib/chatModeCopy.ts` | 164, new functions | Empty state, evidence anchoring, "Why?" rules |
| `src/utils/lifespanFormatters.ts` | 14-23 | Tense-aware window formatting |
| `supabase/functions/ai-home-assistant/index.ts` | After 473 | Evidence anchoring rule, "Why?" constraint |

---

## Verification Checklist

### Axis Labels (Adjustment 1)
- [ ] Timeline shows "Within range / Approaching limit / Beyond range"
- [ ] No lifecycle stage language (New/Mid-life/Late)

### State Label (Adjustment 2)
- [ ] Dashboard shows "Approaching typical limit" instead of "Planning Window"
- [ ] Consistent with axis label language

### Confidence Explainer (Adjustment 3)
- [ ] Shows "Based on home age and regional patterns" for Moderate
- [ ] Grounds confidence in specific evidence

### Evidence-Anchored Copy (Adjustment 4)
- [ ] Every chat message includes concrete basis
- [ ] AI prompt enforces basis requirement
- [ ] No generic statements like "is in good shape"

### Empty State (Adjustment 5)
- [ ] Says "I'm monitoring the systems shown above."
- [ ] No prompting language
- [ ] No "Ask me" or questions

### "Why?" Responses
- [ ] Follow Observation → Factors → Clarifier pattern
- [ ] Never include recommendations or CTAs
- [ ] Explanation only — guidance is separate

---

## Semantic Lock Statement

> "Every visible element explains itself.
> The chat references what the user sees with concrete basis.
> The user is never asked to interpret.
> 'Why?' explains — it does not advise."

