

# Home Pulse v1 — Final Implementation Plan (With Feedback Incorporated)

## Overview

Implements the Home Outlook Calculation Spec as a pure computation service, replaces the mobile dashboard layout with the Home Pulse v1 design, and incorporates all reviewer feedback.

---

## Part 1: Home Outlook Computation Service

**New file**: `src/services/homeOutlook.ts`

Core intelligence service. Pure function, no side effects, no UI coupling.

### Inputs

Consumes `SystemTimelineEntry[]` from the capital timeline. Derives per-system:

- `estimated_age_years`: `currentYear - installYear` (null if no installYear)
- `lifespan_min` / `lifespan_max`: from `replacementWindow` (earlyYear/lateYear minus installYear) or `SYSTEM_CONFIGS`
- `confidence_level`: from `dataQuality` field

### Criticality Weights (Named Constants)

```text
CRITICALITY_WEIGHTS = {
  hvac:          1.0,
  roof:          0.9,
  electrical:    0.8,   // Not yet in CapitalSystemType, future-safe
  water_heater:  0.6,
  plumbing:      0.6,   // Future-safe
  pool:          0.4,
  solar:         0.4,
  mini_split:    0.3,
}
```

### Confidence Multipliers (Named Constants)

```text
CONFIDENCE_MULTIPLIERS = {
  high:   1.0,
  medium: 0.9,
  low:    0.75,
}
```

### Assessment Quality Thresholds (Named Constants -- Adjustment 2)

```text
ASSESSMENT_THRESHOLDS = {
  high: 0.8,
  medium: 0.4,
}
```

No magic numbers in logic. Thresholds are constants, making future tuning explicit.

### Core Algorithm

For each eligible system (has `estimated_age_years` and lifespan data):

1. `lifespan_mid = (lifespan_min + lifespan_max) / 2`
2. `remaining_life_raw = lifespan_mid - estimated_age`
3. `remaining_life = clamp(remaining_life_raw, 0, lifespan_max)`
4. `adjusted_remaining_life = remaining_life * confidence_multiplier`

Aggregation:

```text
raw_outlook = sum(adjusted_remaining_life * criticality_weight) / sum(criticality_weight)
```

**Adjustment 1 (Clamp before rounding):**

```text
rawYears = max(0, raw_outlook)
displayYears = round(rawYears)
```

Explicit early clamp prevents negative display values if future multipliers or weights change.

### Assessment Quality

```text
assessment_quality = eligible_systems / total_critical_systems
```

Critical systems = weight >= 0.6 (HVAC, Roof, Electrical, Water Heater, Plumbing).

Thresholds use `ASSESSMENT_THRESHOLDS` constants:
- `>= ASSESSMENT_THRESHOLDS.high` (0.8): "High"
- `>= ASSESSMENT_THRESHOLDS.medium` (0.4): "Medium"
- Below: "Low"

### Micro-Summary (Adjustment 3: Locked Separator)

```text
"1 system inside 5 yrs · 3 stable"
```

Uses middle dot `·` consistently. Never `.` or `-`. This is a named constant: `MICRO_SUMMARY_SEPARATOR = ' · '`

### Debug Payload (Architectural Addition)

`computeHomeOutlook` optionally returns debug metadata behind a `debug` flag:

```text
debug?: {
  systemContributions: Array<{
    systemType: string,
    estimatedAge: number | null,
    lifespanMid: number,
    remainingLife: number,
    adjustedRemainingLife: number,
    confidenceMultiplier: number,
    criticalityWeight: number,
    contribution: number,  // adjustedRemainingLife * weight
  }>
}
```

Not surfaced in UI. Available for QA validation and future "How this was calculated" views. Controlled by an optional parameter: `computeHomeOutlook(systems, { debug: true })`.

### Exported Interface

```text
computeHomeOutlook(
  systems: SystemTimelineEntry[],
  options?: { debug?: boolean }
): HomeOutlookResult

HomeOutlookResult = {
  displayYears: number
  rawYears: number
  assessmentQuality: 'low' | 'medium' | 'high'
  microSummary: string
  systemsInside5Years: number
  stableSystemsCount: number
  eligibleCount: number
  totalCount: number
  debug?: { systemContributions: [...] }
}
```

### Edge Cases

- Systems with null age: excluded from outlook, degrade assessment quality
- Single-system homes: outlook = that system's adjusted remaining life
- All past lifespan: rawYears clamps to 0, displayYears = 0, UI stays calm
- No eligible systems: returns null result, empty state renders

---

## Part 2: LifecycleRing Component

**New file**: `src/components/mobile/LifecycleRing.tsx`

Purpose-built ring (not retrofitting `Donut.tsx`). Different semantics, different color logic, different copy contract.

### Props

- `percentConsumed`: 0-100+ (clamped to 0-100 internally)
- `size`: pixel dimension (default 96)
- `children`: center content (hero shows `~7 years`, tiles show `~6 yrs`)

### Color Logic

```text
< 40%:  muted green  -- hsl(145, 30%, 55%)
40-70%: neutral teal -- hsl(180, 25%, 50%)
70-90%: soft amber   -- hsl(38, 60%, 55%)
> 90%:  soft amber   -- same (NEVER red)
```

Ring thickness: 10px proportional to size. Track color: `hsl(var(--muted))`. Conic-gradient approach, children-based center content.

---

## Part 3: Since Last Month Section

**New file**: `src/components/mobile/SinceLastMonth.tsx`

v1 is static. No historical delta system exists. Following credibility stewardship doctrine:

- Default: "No meaningful changes this period"
- Neutral `text-sm text-muted-foreground`
- Code comment marks future delta plug point
- Max 2 items when delta data is available (future)

---

## Part 4: System Tile Scroll

**New file**: `src/components/mobile/SystemTileScroll.tsx`

Horizontal scrolling system preview tiles.

### Each Tile

- Small `LifecycleRing` (56px)
- System name (via `getSystemDisplayName`)
- `~X yrs` remaining
- Replacement window: `2029-2033`
- Assessment quality label (from `dataQuality`)
- No cost (per spec)

### Behavior

- Tappable: navigates to `/systems/:id/plan` (Adjustment 4: route name is consistent with existing `SystemPlanPage` routing; verified against `AppRoutes.tsx`)
- Ordered by priority score (reuses `selectPrimarySystem` ordering)
- `overflow-x-auto`, `snap-x snap-mandatory`, each tile `snap-start`, ~160px width

---

## Part 5: MobileDashboardView Layout Rewrite

**Modified file**: `src/components/dashboard-v3/mobile/MobileDashboardView.tsx`

### New Layout (Top to Bottom)

1. **Home Outlook Hero**
   - Large `LifecycleRing` (96px), centered
   - Center: `~X years` (from `computeHomeOutlook`)
   - Label: "Home outlook"
   - Subtext: "Until a major system replacement is likely"
   - Micro-summary: "1 system inside 5 yrs · 3 stable" (locked `·` separator)
   - Assessment quality: "Assessment quality: Medium"

2. **Since Last Month**
   - `SinceLastMonth` component

3. **Key Systems Preview**
   - `SystemTileScroll` component

### Removed (From Mobile Summary Only)

- `HomeStatusSummary` (Now/Next/Later) -- replaced by hero
- `PrimarySystemFocusCard` -- replaced by tiles
- `SecondarySystemsList` -- replaced by tiles
- `ContextualChatLauncher` -- chat via bottom nav

Component files are kept (potential desktop use). Only their usage in `MobileDashboardView` is removed.

### Preserved

- Empty state framing card ("Your home systems are being analyzed")
- Staggered fade-in with `prefers-reduced-motion` guardrail
- Analytics tracking
- Priority scoring for tile ordering

### Props

`healthStatus` and `onChatOpen` become unused but kept for backward compatibility with `DashboardV3.tsx` caller. No breaking change to parent.

---

## Part 6: Header Update

**Modified file**: `src/components/dashboard-v3/TopHeader.tsx`

Mobile condensed mode only:

- Brand text changes from "Habitta" to "Home Pulse" (line 85, inside `condensed` check)
- Remove `healthStatus` badge on condensed mode (line 101 condition already handles this)
- Desktop header completely unchanged

---

## Part 7: Copy Constants

**Modified file**: `src/lib/mobileCopy.ts`

New constants:

```text
HOME_OUTLOOK_LABEL = "Home outlook"
HOME_OUTLOOK_SUBTEXT = "Until a major system replacement is likely"
SINCE_LAST_MONTH_EMPTY = "No meaningful changes this period"
SINCE_LAST_MONTH_HEADER = "Since last month"
ASSESSMENT_QUALITY_LABELS = { low: "Low", medium: "Medium", high: "High" }
ASSESSMENT_QUALITY_PREFIX = "Assessment quality"
MICRO_SUMMARY_SEPARATOR = " · "
```

All verified against banned phrases list.

---

## Files Summary

| File | Action | Risk |
|------|--------|------|
| `src/services/homeOutlook.ts` | New -- core computation + debug payload | Zero (pure function) |
| `src/components/mobile/LifecycleRing.tsx` | New -- display component | Zero (stateless) |
| `src/components/mobile/SinceLastMonth.tsx` | New -- display component | Zero (static v1) |
| `src/components/mobile/SystemTileScroll.tsx` | New -- display + navigation | Low |
| `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` | Layout rewrite | Medium |
| `src/components/dashboard-v3/TopHeader.tsx` | Mobile header text | Low |
| `src/lib/mobileCopy.ts` | Add constants | Zero |

No new dependencies. No backend changes. No data layer modifications. Desktop unaffected.

---

## Reviewer Feedback Integration Summary

| Feedback | Resolution |
|----------|------------|
| Clamp negative aggregation before rounding | `rawYears = max(0, raw_outlook)` before `round()` |
| Extract assessment quality thresholds to constants | `ASSESSMENT_THRESHOLDS = { high: 0.8, medium: 0.4 }` |
| Lock micro-summary separator to `·` | `MICRO_SUMMARY_SEPARATOR` constant, used everywhere |
| Route naming check (`/systems/:id/plan`) | Verified: matches existing `SystemPlanPage` route pattern |
| Add debug payload to `computeHomeOutlook` | Optional `debug` parameter returns per-system contribution breakdown |

---

## Guardrail Compliance

- All lifecycle math in `homeOutlook.ts`, not UI components
- Copy flows through `mobileCopy.ts`
- Priority ordering reuses `selectPrimarySystem()`
- Ring never turns red
- No urgency language, no countdowns, no failure predictions
- Assessment quality never affects color, never blocks outlook
- Empty/null states handled honestly
- `prefers-reduced-motion` respected
- Debug payload is internal-only, zero UI impact
- No magic numbers -- all thresholds are named constants

---

## Testing Checklist

1. Mobile `/dashboard` shows lifecycle ring hero with `~X years`
2. Outlook value matches manual calculation (weighted average of adjusted remaining lives)
3. Ring color follows lifecycle thresholds (green/teal/amber) -- never red
4. Assessment quality displays correctly based on eligible/total ratio
5. Micro-summary uses `·` separator consistently
6. "Since Last Month" shows "No meaningful changes this period"
7. System tiles scroll horizontally with snap behavior
8. Tapping a tile navigates to `/systems/:id/plan`
9. Single-system home shows that system's remaining life as outlook
10. All-past-lifespan shows `~0 years`, UI stays calm (no negative values)
11. Systems with null age excluded from outlook, degrade assessment quality
12. Header shows "Home Pulse" on mobile, "Habitta" on desktop
13. Reduced-motion preference disables all fade-in animations
14. Desktop 3-column layout completely unaffected
15. `computeHomeOutlook(systems, { debug: true })` returns per-system contributions
16. No banned phrases in any new copy

