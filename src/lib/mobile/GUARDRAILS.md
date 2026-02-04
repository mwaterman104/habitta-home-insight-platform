# Developer Guardrails (Read Before Coding)

These rules are **non-negotiable**. Violations are P0 bugs.

---

## 1. UI Components Must Not Compute Lifecycle Logic

All lifecycle math lives in:
- `src/services/failureProbability.ts`
- `src/services/priorityScoring.ts`

Components receive pre-computed values only. No `Math.exp()`, no probability calculations, no lifespan arithmetic in UI code.

**Why:** Prevents drift between dashboard and detail views.

---

## 2. All System Prioritization Flows Through `priorityScoring.ts`

No ad-hoc sorting in components. The formula is FROZEN:

```
PriorityScore = FailureProbability12mo × ReplacementCostMid × UrgencyMultiplier
```

Tie-breaking order:
1. Higher replacement cost
2. Higher failure probability
3. Alphabetical systemKey (deterministic fallback)

**Why:** Prevents UI flicker and ensures consistency.

---

## 3. If Data Is Missing, Fall Back to `SYSTEM_CONFIGS` — Never Silence

- Never say "unknown" if config data exists
- Default values are explicit and documented
- UI must always show something actionable

**Why:** Users should never feel abandoned.

---

## 4. Any Copy Change Must Go Through `mobileCopy.ts`

- No hardcoded strings in components
- Banned phrases are enforced at review time:
  - "Everything is normal"
  - "Let me know if"
  - "What should I do?"
  - "I'm not sure"
  - "Unknown"

**Why:** Maintains consistent, authoritative voice.

---

## 5. Any Contradiction Between Dashboard and Plan Is a P0 Bug

- Same data source for both views
- Same priority logic for both views
- If dashboard says "HVAC is primary," plan must agree

**Why:** Trust requires consistency.

---

## 6. Systems Past Expected Lifespan May Never Be Labeled "Stable"

Use "Aging — monitoring" instead.

Enforced in `getPlanningStatus()` and `deriveStatusLevel()` guardrails.

**Why:** "Stable" implies no action needed, which is misleading for aged systems.

---

## 7. Cost Premiums Must Use Named Constants

```typescript
import { COST_PREMIUMS, EMERGENCY_PREMIUMS } from '@shared/systemConfigs';
```

Never hardcode cost multipliers.

**Why:** Ensures UI, edge functions, and AI stay aligned.

---

## Quick Reference

| Rule | File(s) | Guardrail Function |
|------|---------|-------------------|
| No UI lifecycle math | All components | N/A — code review |
| Priority scoring | `priorityScoring.ts` | `selectPrimarySystem()` |
| Missing data fallback | `systemConfigs.ts` | `getSystemConfig()` |
| Copy governance | `mobileCopy.ts` | All exports |
| Dashboard/Plan consistency | Both views | Same data hooks |
| No "Stable" past lifespan | `mobileCopy.ts` | `getPlanningStatus()` |
| Named cost constants | `systemConfigs.ts` | `COST_PREMIUMS` |
