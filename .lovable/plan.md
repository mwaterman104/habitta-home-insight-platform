

# Future-in-the-Record: Capital Timeline in Home Report

## Objective

Upgrade the Home Report from a backward-looking inventory into a forward-looking intelligence artifact by embedding the capital lifecycle data that already exists in the system.

After this ships, the Home Report answers: **What do I own, what's happened, and what's coming next -- and how confident are we?**

No new calculations. No new edge functions. No new promises. Strictly surfaces existing intelligence in a durable, portable form.

---

## Architecture

The capital-timeline edge function already computes replacement windows, lifecycle stages, and confidence for each system. The report currently ignores all of it. This plan threads that data through three layers:

```text
                    capital-timeline
                     edge function
                          |
                          v
useHomeReport.ts --> normalizeTimelineForReport() --> ReportCapitalSystem[]
       |                                                     |
       v                                                     v
HomeReportPage.tsx                              CapitalOutlookSection.tsx
       |                                                     |
       v                                                     v
reportPdfGenerator.ts -----> Capital Outlook HTML section in export
```

---

## New Types

Added to `useHomeReport.ts`. The normalizer converts raw `SystemTimelineEntry` fields into report-safe shapes. Raw edge function output never leaks into UI.

### `ReportCapitalSystem`

| Field | Type | Source |
|-------|------|--------|
| `systemKey` | `string` | `SystemTimelineEntry.systemId` |
| `systemLabel` | `string` | `SystemTimelineEntry.systemLabel` |
| `installYear` | `number or null` | `SystemTimelineEntry.installYear` |
| `installSource` | `string` | `SystemTimelineEntry.installSource` |
| `installSourceLabel` | `string` | Via `getInstallSourceLabel()` from `mobileCopy.ts` |
| `lifecycleStage` | enum | `'late_life' / 'planning_window' / 'mid_life' / 'early_life'` |
| `lifecycleStageLabel` | `string` | Human-readable: "Late-life", "Planning window", "Mid-life", "Early-life" |
| `replacementWindow` | `object or null` | `{ earlyYear, likelyYear, lateYear }` -- null if too low confidence |
| `windowDisplay` | `string` | e.g. "2024--2026" or "Timing uncertain -- more information needed" |
| `planningGuidance` | `string` | Deterministic from lifecycle stage |
| `climateNote` | `string` | From `SystemTimelineEntry.climateZone` or fallback to property-level climate |
| `confidenceLabel` | `string` | "High" / "Moderate" / "Low" |
| `confidenceDetail` | `string` | e.g. "Moderate (owner-reported install year)" |

The `lifecycleStage` field is a typed union (not free text), with a separate `lifecycleStageLabel` for display. This prevents copy drift and keeps the report machine-readable for future use.

---

## Step 1: Extend `useHomeReport.ts` -- Data Layer

### Add timeline fetch

Import `useCapitalTimeline` and call it alongside the existing asset/event/system queries:

```text
const { timeline, loading: timelineLoading, error: timelineError } = useCapitalTimeline({
  homeId: homeId ?? undefined,
  enabled: !!homeId,
});
```

Timeline errors are **non-fatal**: if the edge function fails, the report still renders -- the Capital Outlook section shows an honest empty state.

### Add `normalizeTimelineForReport()` function

A pure function that maps each `SystemTimelineEntry` to a `ReportCapitalSystem`:

**Lifecycle stage derivation** -- Reuses the same `deriveStatusLevel()` thresholds from `mobileCopy.ts`:
- `aging` maps to `'late_life'` / "Late-life"
- `elevated` maps to `'planning_window'` / "Planning window"
- `planning_window` maps to `'mid_life'` / "Mid-life"
- `stable` maps to `'early_life'` / "Early-life"

**Window display logic**:
- If `dataQuality === 'low'` AND `windowUncertainty === 'wide'`: show "Timing uncertain -- more information needed"
- Otherwise: show `"earlyYear--lateYear"` (the full probabilistic range, never a single year)

**Planning guidance** -- Deterministic from lifecycle stage:
- Late-life: "Begin replacement planning"
- Planning window: "This is a reasonable window to start researching options"
- Mid-life: "Routine monitoring sufficient"
- Early-life: "No action needed at this time"

**Climate note** -- From `SystemTimelineEntry.climateZone`:
- `high_heat` maps to "High heat and humidity"
- `coastal` maps to "Coastal salt air and humidity"
- `freeze_thaw` maps to "Freeze-thaw cycling"
- `moderate` or undefined maps to "Typical conditions"

**Confidence** -- From `SystemTimelineEntry.dataQuality`:
- `high` maps to "High"
- `medium` maps to "Moderate"
- `low` maps to "Low"
- Combined with source: e.g. "Moderate (owner-reported install year)"

**Install source** -- Uses existing `getInstallSourceLabel()` from `mobileCopy.ts`

### Update `HomeReportData` interface

Add `capitalOutlook: ReportCapitalSystem[]`. The `loading` state includes `timelineLoading`. Error aggregation includes `timelineError` but as non-fatal (only blocks if all other queries also fail).

### Snapshot contract (docstring)

A comment on the normalizer clarifying: "The capital outlook reflects lifecycle intelligence as of report generation time, not real-time recalculation."

---

## Step 2: Create `CapitalOutlookSection.tsx` -- UI Layer

New file: `src/components/report/CapitalOutlookSection.tsx`

Pure presentational component. No internal fetching. No side effects.

### Props

```text
interface CapitalOutlookSectionProps {
  systems: ReportCapitalSystem[];
}
```

### Structure

1. **Section header**: "Capital Outlook" (uses `heading-h3 text-foreground`)

2. **Subtitle**: "Forward-looking planning based on system age, climate, and typical lifespans."

3. **Disclaimer** (always visible, non-dismissable): "Projections are estimates, not guarantees. They update as new information is added."

4. **Per-system cards** (one per `ReportCapitalSystem`):
   - System name (bold) + install source badge (muted)
   - Install year or "Install year not documented"
   - Lifecycle stage as text label (no color coding that implies urgency -- `text-muted-foreground` for all stages)
   - Projected window display (range or "Timing uncertain")
   - Planning guidance (one-line, non-actionable)
   - Climate context (short clause)
   - Confidence line: "Confidence: Moderate (owner-reported install year)"

5. **Summary table** (rendered if 2+ systems):

   | System | Status | Projected Window | Confidence |
   |--------|--------|------------------|------------|

   Column header says "Projected Window" (not "Likely Window") to match the fact that we show `earlyYear--lateYear`, not just `likelyYear`.

6. **Empty state** (zero systems with timeline data): Section header always renders. Body shows: "No lifecycle projections available yet. As system details are added, capital planning estimates will appear here."

### No CTAs. No buttons. No reminders. No cost estimates.

### Visual patterns

Follows existing report component conventions (`AssetInventorySection`, `CoverageSummarySection`):
- `bg-card rounded-lg border border-border p-4`
- `heading-h3` for section title
- `text-label text-muted-foreground uppercase tracking-wide` for subsection labels
- `text-sm` for content, `text-xs text-muted-foreground` for metadata

---

## Step 3: Wire into `HomeReportPage.tsx` -- Layout

### Import and render

Insert between Asset Inventory and Open Issues:

```text
<AssetInventorySection ... />
<CapitalOutlookSection systems={report.capitalOutlook} />
<OpenIssuesSection ... />
```

This creates the narrative: **What you have** (assets) then **What's coming** (outlook) then **What's happened** (issues/history).

### Update Day-1 framing

Add one line to the empty-state coverage list:
- "Capital outlook: Not yet available"

---

## Step 4: Extend `reportPdfGenerator.ts` -- Export Layer

### Updated section order

```text
${propertySection}
${assetSection}
${capitalOutlookSection}    <-- NEW
${issuesSection}
${resolvedSection}
${replacementsSection}
${deferredSection}
${coverageSection}
```

### New `capitalOutlookSection` builder

Uses the same `ReportCapitalSystem[]` data. Renders:

1. Section header with `.section-title` styling (left border, serif font)
2. Disclaimer in `.meta` style
3. Per-system entries as `.card` elements (matching existing card patterns)
4. Summary table using `.data-table` styling

Empty state: Same honest message as the UI component.

No new CSS classes needed -- reuses existing `.section`, `.section-title`, `.card`, `.data-table`, `.meta`, `.empty` classes already defined in the HTML template.

---

## Confidence and Honesty Rules (enforced in the normalizer)

These are non-negotiable and implemented in `normalizeTimelineForReport()`:

1. Never show a single year -- always show a range (`earlyYear--lateYear`)
2. Never show cost estimates in the report (costs are excluded from `ReportCapitalSystem`)
3. Never imply urgency with language (all planning guidance is matter-of-fact)
4. Always state install source when known
5. If lifecycle data is missing, say so plainly: "Lifecycle projection unavailable. Add an install year to enable planning estimates."
6. Low-confidence systems with wide uncertainty show "Timing uncertain" instead of a numeric range

---

## Files Changed

| File | Change | Risk |
|------|--------|------|
| `src/hooks/useHomeReport.ts` | Add `ReportCapitalSystem` type, `useCapitalTimeline` query, `normalizeTimelineForReport()`, extend return type | Low |
| `src/components/report/CapitalOutlookSection.tsx` | New file -- pure presentational component | Zero |
| `src/pages/HomeReportPage.tsx` | Import + render new section, update Day-1 empty state | Zero |
| `src/lib/reportPdfGenerator.ts` | Add capital outlook HTML section in correct position | Low |

No edge function changes. No database changes. No new dependencies.

---

## What This Does NOT Include

- No cost estimates in the report (costs belong in interactive planning, not a static document)
- No reminder CTAs or action buttons
- No new lifecycle calculations (the report consumes existing edge function output)
- No changes to the capital-timeline edge function
- No notification hooks
- No engagement cadence references

---

## Testing Checklist

1. Report renders with no capital timeline data -- honest empty state in Capital Outlook section
2. Report renders with mixed-confidence systems -- appropriate window display per confidence level
3. Late-life systems show planning guidance, not panic language
4. Low-confidence systems show "Timing uncertain" instead of narrow ranges
5. System with permit-verified install year but inferred climate shows appropriate mixed confidence
6. HTML export includes Capital Outlook section in correct position between Assets and Issues
7. Print view renders Capital Outlook cleanly
8. Day-1 empty state includes capital outlook coverage line
9. Timeline fetch failure does not block report rendering (non-fatal error handling)

