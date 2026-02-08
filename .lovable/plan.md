

# Capital Outlook: Doctrine Compliance Repairs

## Context

The Capital Outlook section is structurally sound and correctly placed. These five fixes address credibility leaks where the presentation contradicts the report's own honesty rules. All changes are in the normalizer and presentation layers — no new data, no new calculations, no new features.

## Fix 1: Handle Past Replacement Windows

**Problem**: A system with `lateYear: 2023` displays "Projected window: 2019-2023" in 2026. This frames a missed window as a forward-looking projection — a temporal contradiction.

**File**: `src/hooks/useHomeReport.ts` (normalizer)

Add a new field `windowIsOverdue: boolean` to `ReportCapitalSystem`. In `normalizeTimelineForReport()`, after computing the replacement window, check if `replacementWindow.lateYear < currentYear`. When true:

- Set `windowIsOverdue = true`
- Change `windowDisplay` from `"2019-2023"` to `"Past typical window (2019-2023)"`

**File**: `src/components/report/CapitalOutlookSection.tsx`

In `SystemCard`, change the label from static `"Projected window"` to dynamic:
- If `system.windowIsOverdue`: show `"Typical window"` (the display value itself already says "Past typical window...")
- Otherwise: show `"Projected window"`

**File**: `src/lib/reportPdfGenerator.ts`

Same label logic in the HTML card builder.

---

## Fix 2: Soften Lifecycle Labels for Estimated Installs

**Problem**: "Early-life" displayed alongside "Confidence: Moderate (estimated install year)" overstates certainty. The lifecycle stage reads as authoritative when the underlying data is inferred.

**File**: `src/hooks/useHomeReport.ts` (normalizer)

When deriving `lifecycleStageLabel`, check if install source is not `permit` AND confidence is not `high`. When both conditions are true, append `" (estimated)"` to the label:

- `"Early-life"` becomes `"Early-life (estimated)"`
- `"Mid-life (estimated)"`
- `"Late-life (estimated)"`
- `"Planning window (estimated)"`

The typed `lifecycleStage` enum stays unchanged (machine-readable). Only `lifecycleStageLabel` (display string) is affected.

---

## Fix 3: Rename "Projected Window" Column

**Problem**: The summary table header says "Projected Window" but shows `earlyYear-lateYear` ranges, which may be entirely in the past. "Projected" implies forward-looking relevance.

**File**: `src/components/report/CapitalOutlookSection.tsx`

Rename the table column header from `"Projected Window"` to `"Typical Window"`.

**File**: `src/lib/reportPdfGenerator.ts`

Same rename in the HTML summary table header.

---

## Fix 4: Temporal Planning Guidance for Overdue Systems

**Problem**: A system past its entire replacement window shows "Begin replacement planning" — this is too calm for a system operating years beyond its projected end-of-life.

**File**: `src/hooks/useHomeReport.ts` (normalizer)

After computing `planningGuidance` from the static `PLANNING_GUIDANCE` map, add a temporal override:

- If `windowIsOverdue` is true (from Fix 1), replace the guidance with `"Replacement planning is recommended"`

This preserves the matter-of-fact tone (no panic) while acknowledging reality. The static map is not changed — the override is applied post-lookup.

---

## Fix 5: Clarify Overall Confidence Framing

**Problem**: The Coverage Summary shows "Overall confidence: Low" while individual capital systems show "High" or "Moderate". Users may perceive a contradiction. The overall metric includes all assets (appliances, supplementals) while capital confidence is per-system.

**File**: `src/components/report/CoverageSummarySection.tsx`

Change the metric label from `"Overall confidence"` to `"Record confidence"`.

Add a clarifying line below the verified/estimated percentages:
`"Based on all documented assets and systems."`

**File**: `src/lib/reportPdfGenerator.ts`

Same label change in the HTML coverage section: `"Overall confidence"` becomes `"Record confidence"`. Add the clarifying note in the `.disclaimer` block.

---

## Files Changed

| File | Changes | Risk |
|------|---------|------|
| `src/hooks/useHomeReport.ts` | Add `windowIsOverdue` field, overdue window display, estimated lifecycle label suffix, overdue guidance override | Low |
| `src/components/report/CapitalOutlookSection.tsx` | Dynamic window label, table column rename | Zero |
| `src/lib/reportPdfGenerator.ts` | Dynamic window label, table column rename, confidence label rename | Zero |
| `src/components/report/CoverageSummarySection.tsx` | Confidence label rename, clarifying note | Zero |

No new files. No new dependencies. No data layer changes.

---

## Testing Checklist

1. System with `lateYear < currentYear` shows "Past typical window (2019-2023)", not "Projected window: 2019-2023"
2. System with `lateYear >= currentYear` still shows "Projected window: 2025-2028"
3. Estimated-source system shows "Early-life (estimated)", not bare "Early-life"
4. Permit-verified system shows bare "Late-life" without "(estimated)" suffix
5. Summary table header reads "Typical Window"
6. Overdue system shows "Replacement planning is recommended" guidance
7. Non-overdue late-life system still shows "Begin replacement planning"
8. Coverage section shows "Record confidence" with clarifying note
9. HTML export reflects all five fixes with parity to UI
10. No new calculations, no new data fetching, no new promises introduced

