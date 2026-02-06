

# Home Report Tab -- Hardened Implementation Plan

## Summary

Add "Report" as a permanent, first-class navigation surface at `/report`. This is a read-only document rendered as an interface -- structured, printable, and valuable from day one even when sparse. It aggregates data from `homes`, `home_assets`, `home_events`, and `systems` with explicit deduplication and resolution rules to prevent the five implementation traps identified in the QA review.

## Navigation Changes

### Mobile Bottom Bar
Add "Report" as a 4th item. New order: **Home Pulse | Chat | Report | Settings**.

File: `src/components/BottomNavigation.tsx`
- Add `FileText` import from lucide-react
- Insert `{ title: "Report", url: "/report", icon: FileText }` at position 3 (between Chat and Settings)

### Desktop Left Sidebar
Replace the current "Reports" item (which points to `/validation`, an internal admin tool) with a user-facing "Report" item pointing to `/report`.

File: `src/components/dashboard-v3/LeftColumn.tsx`
- In `bottomItems`, change the first entry from `{ title: "Reports", path: "/validation", ... }` to `{ title: "Report", path: "/report", ... }`

### Route
File: `src/pages/AppRoutes.tsx`
- Add a new protected route: `/report` rendering `HomeReportPage` (standalone, using `DashboardV3Layout` wrapper like Systems Hub and Home Profile)

## Data Hook: `src/hooks/useHomeReport.ts`

A single hook that fetches and assembles all report data. Uses TanStack `useQuery` for caching.

### Four Parallel Queries

1. **Property**: `homes` table, single row by `home_id` (from `useUserHome` context)
2. **Assets**: `home_assets` where `home_id = X` and `status != 'removed'`
3. **Events**: `home_events` where `home_id = X`, ordered by `created_at desc`, **limit 200** (client-side cap to prevent unbounded growth; documented as a future pagination point)
4. **Legacy systems**: `systems` where `home_id = X` (supplemental for core systems not yet in `home_assets`)

### Hardening Rule 1: Asset Deduplication

The `systems` table tracks core lifecycle systems (HVAC, roof, water heater) using a `kind` field. The `home_assets` table may also have entries for those same systems discovered via chat. To prevent showing duplicate rows:

```text
const assetKinds = new Set(homeAssets.map(a => a.kind));
const supplementalSystems = legacySystems.filter(s => !assetKinds.has(s.kind));
```

`home_assets` always wins. `systems` is fallback-only for items not yet discovered into the VIN layer. Supplemental systems are displayed with a label like "Estimated from public data".

### Hardening Rule 2: Issue Resolution Logic

An issue is considered **resolved** if any of the following exist in the event chain:
- A `status_change` event with `status = 'resolved'` and `related_event_id = issue.id`
- A `repair_completed` event with `related_event_id = issue.id`

This is computed client-side by building a lookup map: `Map<event_id, related_events[]>`. Each `issue_reported` event is checked against this map. Documented in code comments as the canonical resolution rule.

### Hardening Rule 3: Deferred Recommendation Guardrails

A recommendation is considered "deferred" only if:
1. `event_type = 'recommendation'`
2. No linked `user_decision` event exists (via `related_event_id`)
3. The associated asset (if any) still has `status = 'active'` (filters out zombie recommendations for replaced/removed assets)

### Hardening Rule 4: Event Cap

The events query is capped at 200 rows (`limit(200)`). This prevents unbounded reads as the ledger grows. A code comment marks this as a future materialized-view or pagination candidate.

### Return Shape

The hook returns a structured object with pre-categorized data:

```text
{
  property: { address, yearBuilt, squareFeet, ownershipSince }
  assets: { coreSystems: [...], appliances: [...] }   // deduplicated
  openIssues: [...]                                    // with linked recommendations
  resolvedHistory: [...]                               // repairs + resolved issues
  replacements: [...]
  deferredRecommendations: [...]                       // zombie-filtered
  coverage: { assetCount, issueCount, repairCount, avgConfidence, verifiedPct, estimatedPct }
  loading, error
}
```

## Page: `src/pages/HomeReportPage.tsx`

Wraps content in `DashboardV3Layout`. Renders all seven sections in fixed order. Shows the global framing header and "Download PDF" action (right-aligned, quiet).

## Report Section Components

All in `src/components/report/`. Each follows the document-first principle: if printed tomorrow, it still makes sense.

### 1. `ReportHeader.tsx`
- Title: "Home Report"
- Subtitle: address + build year
- Description: "A running record of the systems, appliances, issues, and work associated with this property."
- Actions: "Download PDF" button (right-aligned, secondary variant, `FileDown` icon)

### 2. `PropertyOverviewSection.tsx`
- Data: `homes` table (address, year_built, square_feet, created_at)
- Always visible. Unknown fields show "Not available"
- No inference, no estimation

### 3. `AssetInventorySection.tsx`
- Split into "Core Systems" and "Appliances" sub-sections
- Core Systems: `home_assets` where `category = 'system'` PLUS deduplicated `systems` fallback
- Appliances: `home_assets` where `category = 'appliance'`
- Each item shows: kind (display name), manufacturer, install date/estimate, confidence label
- Confidence labels: `< 50` = "Estimated", `50-74` = "Chat-reported", `75-89` = "Photo-verified", `>= 90` = "Verified"
- Empty state: "No appliances documented yet"

### 4. `OpenIssuesSection.tsx`
- Only renders if there are open issues (hidden entirely otherwise)
- Each issue shows: asset name, title, reported date, severity, status, linked recommendation (if any), cost estimate
- Linked recommendation found by scanning events where `related_event_id = issue.id` and `event_type = 'recommendation'`

### 5. `ResolvedHistorySection.tsx`
- Shows `repair_completed` and `maintenance_performed` events, plus issues determined resolved by the resolution logic
- Grouped by asset (not timeline) -- humans think in objects
- Each entry shows: asset, title, diagnosed date, resolved date, outcome, cost
- Empty state: "No resolved issues yet"

### 6. `ReplacementsSection.tsx`
- Shows `replacement` events with old/new asset context
- Each entry shows: asset kind, old install date, replacement date, source
- Empty state: "No replacements recorded"

### 7. `DeferredRecommendationsSection.tsx`
- Shows recommendations with no linked decision and active assets only
- Each shows: asset, recommendation path, urgency, date noted
- Neutral tone -- no warnings, no red banners, just facts
- Empty state: "No deferred recommendations"

### 8. `CoverageSummarySection.tsx`
- Derived metrics: assets documented, issues logged, repairs recorded, average confidence
- Additionally shows: % verified assets, % estimated assets (addresses the QA feedback that avg confidence alone is weak)
- Footer text: "Some records are estimated or inferred. Confidence increases as systems are verified through photos, permits, or professional work."

## PDF Export: `src/lib/reportPdfGenerator.ts`

Uses the same HTML-to-Blob approach proven in `src/components/validation/PDFReportGenerator.tsx`:
1. Generate a self-contained HTML string with inline CSS
2. Create a Blob of type `text/html`
3. Trigger download as `home-report-[address]-[date].html`

The generator accepts the same structured data returned by `useHomeReport`, ensuring the PDF and screen render from identical data (no drift). Section order and language match the on-screen report exactly. No UI chrome in the export.

## Empty-State Language (Doctrine Compliance)

The report never uses "incomplete", "missing", or "you should add". Instead:
- "Not yet documented"
- "Estimated from public data"
- "Will update over time"
- "As you chat with Habitta, this report builds itself."

Day-1 experience with no events:

```text
Home Report
123 Palm Ave -- Built 1989

This report tracks the systems, appliances, and work
associated with your home over time.

Current coverage:
  Home details: Available
  Core systems: Partial
  Appliances: Not yet documented
  Issues & repairs: None yet

As you chat with Habitta, this report will automatically
build itself.
```

## Files Created

| File | Purpose |
|------|---------|
| `src/pages/HomeReportPage.tsx` | Page container with DashboardV3Layout |
| `src/hooks/useHomeReport.ts` | Data fetching + dedup + resolution logic |
| `src/components/report/ReportHeader.tsx` | Title, address, PDF action |
| `src/components/report/PropertyOverviewSection.tsx` | Address, year, sqft |
| `src/components/report/AssetInventorySection.tsx` | Core systems + appliances (deduplicated) |
| `src/components/report/OpenIssuesSection.tsx` | Active issues with linked recommendations |
| `src/components/report/ResolvedHistorySection.tsx` | Repairs + maintenance, grouped by asset |
| `src/components/report/ReplacementsSection.tsx` | Major replacements |
| `src/components/report/DeferredRecommendationsSection.tsx` | Unacted recommendations (zombie-filtered) |
| `src/components/report/CoverageSummarySection.tsx` | Confidence + coverage metrics |
| `src/lib/reportPdfGenerator.ts` | HTML export from same data source |

## Files Modified

| File | Change |
|------|--------|
| `src/pages/AppRoutes.tsx` | Add `/report` protected route |
| `src/components/BottomNavigation.tsx` | Add "Report" as 4th nav item |
| `src/components/dashboard-v3/LeftColumn.tsx` | Replace "Reports" (admin) with "Report" (user-facing) |

## No Database Changes

This is a pure read surface. No migrations, no new tables, no RLS changes. All data sources (`homes`, `home_assets`, `home_events`, `systems`) already exist with appropriate RLS.

## Implementation Order

1. **Data hook** (`useHomeReport.ts`) -- all dedup, resolution, and filtering logic lives here
2. **Section components** -- all 8 report sections, each self-contained
3. **Page container** (`HomeReportPage.tsx`) -- assembles sections
4. **Navigation** -- route + bottom nav + sidebar updates
5. **PDF export** -- generator function + download trigger

## QA Checklist (All Five Traps Addressed)

| Trap | Fix | Where |
|------|-----|-------|
| Asset duplication (systems + home_assets) | Deduplicate by `kind`; `home_assets` wins | `useHomeReport.ts` |
| Event status resolution | Explicit rule: resolved = linked `repair_completed` or `status_change` to resolved | `useHomeReport.ts` |
| Zombie deferred recommendations | Filter by `asset.status = 'active'` | `useHomeReport.ts` |
| Unbounded event query | Cap at 200 rows; documented pagination point | `useHomeReport.ts` |
| PDF/screen drift | Single data source feeds both screen and PDF render | `reportPdfGenerator.ts` |

