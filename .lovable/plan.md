

# Tier-Aware Late-Life Language + Copy Fixes

## Overview

Three execution-level fixes to resolve the trust contradiction between "Home outlook ~12 years" and "~0 yrs remaining" on system tiles. Introduces tier-aware language, standardizes terminology, and adds a hero clarifier.

---

## Changes

### 1. `src/services/homeOutlook.ts` — Add Tier Classification + Update Micro-Summary

**New constants and function:**

- `PLANNING_TIER_THRESHOLD = 0.8` — systems with criticality weight >= 0.8 are "planning-critical"
- `SystemPlanningTier` type: `'planning-critical' | 'routine-replacement'`
- `PLANNING_TIER_LABELS` mapping: `{ 'planning-critical': 'major system', 'routine-replacement': 'routine replacement' }` — locks code-to-copy mapping per reviewer nit
- `getSystemPlanningTier(systemId)` — derives tier from existing `CRITICALITY_WEIGHTS`
- `getLateLifeState(system)` — centralized helper returning `'planning-critical-late' | 'routine-late' | 'not-late'` based on tier + remaining years <= 0 (reviewer's optional-but-smart suggestion, worth doing now to prevent tile/micro-summary divergence)

**Update `buildMicroSummary`:**

Change signature to accept the systems array (not just counts) so it can classify each system by tier. New output format with stable ordering (major first, routine second, stable third):

- `"1 major system inside 5 yrs · 1 routine replacement due"`
- `"2 stable"`
- `"1 routine replacement due · 2 stable"`

### 2. `src/lib/mobileCopy.ts` — Add Tier-Aware Copy Constants

New constants:

```
LATE_LIFE_COPY = {
  routineReplacement: {
    primary: "At end of expected life",
    secondary: "Typically replaced as needed",
  },
  planningCritical: {
    primary: "Inside planning window",
    secondary: "Replacement likely soon",
  },
}

HOME_OUTLOOK_CLARIFIER = "Reflects planning-critical systems only"
REPLACEMENT_WINDOW_PREFIX = "Replacement window"
```

All verified against banned phrases list.

### 3. `src/components/mobile/SystemTileScroll.tsx` — Tier-Aware Tile Rendering

Import `getSystemPlanningTier` and new copy constants. Changes to tile content:

- **Ring center**: When `remainingYears <= 0`, show `—` (em dash) instead of `~0`. Add `aria-label` with the tier-appropriate late-life text for accessibility.
- **Status line**: When `remainingYears <= 0`, show tier-aware copy (`LATE_LIFE_COPY[tier].primary` + `.secondary`) instead of `~0 yrs remaining`.
- **Replacement window**: Prefix with `REPLACEMENT_WINDOW_PREFIX`: `"Replacement window: 2019-2023"`
- **Quality label**: Change from `"{qualityLabel} confidence"` to `"Assessment quality: {qualityLabel}"` using existing `ASSESSMENT_QUALITY_PREFIX` constant.

### 4. `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` — Hero Clarifier

Add one line below the Home Outlook subtext (after line 149):

```
<p className="text-xs text-muted-foreground/60">
  {HOME_OUTLOOK_CLARIFIER}
</p>
```

Import `HOME_OUTLOOK_CLARIFIER` from `mobileCopy.ts`.

---

## Files Summary

| File | Changes |
|------|---------|
| `src/services/homeOutlook.ts` | Add `getSystemPlanningTier()`, `getLateLifeState()`, `PLANNING_TIER_LABELS`, update `buildMicroSummary` |
| `src/lib/mobileCopy.ts` | Add `LATE_LIFE_COPY`, `HOME_OUTLOOK_CLARIFIER`, `REPLACEMENT_WINDOW_PREFIX` |
| `src/components/mobile/SystemTileScroll.tsx` | Tier-aware late-life copy, assessment quality label, window label, ring a11y |
| `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` | Add clarifier line below hero subtext |

No new files. No math changes. No backend changes. Desktop unaffected.

