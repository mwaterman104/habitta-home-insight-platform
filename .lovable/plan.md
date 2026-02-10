

# Merge Home Profile and Home Report Into a Single "Home Record" Page

## What Changes

The two pages (`/home-profile` and `/report`) merge into a single authoritative surface at `/home-profile`. The Report's data layer (`useHomeReport`) becomes the sole data source. Profile-unique sections (HomeStructure, Permits, Supporting Records, Activity Log) fold into the page alongside existing Report sections.

## Section Order (Final)

The merged page renders in this fixed order:

1. **Header** -- ReportHeader (address, subtitle, download button)
2. **Day-1 empty state** (when data is sparse)
3. **Property Overview** (facts table from Report)
4. **Home Structure and Materials** (from Profile -- unique value)
5. **Asset Inventory** (core systems + appliances with provenance inline)
6. **Capital Outlook**
7. **Open Issues**
8. **Resolved History**
9. **Ownership and Purchase History** (PurchaseContext card + sale history list merged)
10. **Replacements**
11. **Deferred Recommendations**
12. **Permits and Construction History** (from Profile -- deferred section, collapsed by default)
13. **Supporting Records** (from Profile -- deferred section, with chat CTA)
14. **Home Activity Log** (from Profile -- deferred section, with chat CTA)
15. **Record Confidence** (coverage summary)

Sections 12-14 are "deferred" -- rendered inside a Collapsible that starts collapsed with a subtle "Show more" toggle. This prevents scroll fatigue while preserving completeness.

## Data Layer

`useHomeReport` is extended to also expose:
- `attomData` (already fetched internally, just not returned)
- `homeId` (from `userHome.id`)
- `home` (the raw `userHome` object for lat/lng and new ATTOM columns)
- `fullAddress` (from `useUserHome`)

This eliminates the Profile page's separate `useEffect` fetch, `useAttomProperty`, `useSystemsData`, and `useHomeIntelligence` calls.

The hook's return type comment is updated to document the contract:
"This hook returns a read-only, authoritative snapshot of the home record. It does not perform writes or side effects."

## Interaction Pattern

All interaction on the merged page happens via chat CTAs ("Add Evidence", "Log Activity", "Upload Record") -- never inline edits. The `useChatContext` wrapper pattern (already used by the Profile) carries forward for sections that need it.

## Technical Plan

### Files to create: 0

### Files to rewrite: 1
- **`src/pages/HomeProfilePage.tsx`** -- Complete rewrite. Replaces the old Profile page with the merged surface. Uses `useHomeReport` as sole data source. Renders all 15 sections in order. Sections 12-14 wrapped in a Collapsible. Chat CTA wrappers for SupportingRecords, HomeActivityLog, and SystemProvenance remain inside `DashboardV3Layout` as before.

### Files to modify: 5

1. **`src/hooks/useHomeReport.ts`**
   - Expose `attomData`, `homeId` (string or null), `home` (the `userHome` object), and `fullAddress` on the return type
   - Add `home` (the raw userHome) and `homeId` to the returned object
   - Add contract comment at the top of the hook
   - Add `fullAddress` from `useUserHome`

2. **`src/components/report/ReportHeader.tsx`**
   - Change title from "Home Report" to "Home Record"
   - Update subtitle to include effective build year when it differs from original (using new `yearBuiltEffective` prop)

3. **`src/components/report/SaleHistorySection.tsx`**
   - Accept optional `lastSale` prop (PurchaseContext data)
   - Render the PurchaseContext card at the top of the section when lastSale data exists
   - This absorbs PurchaseContext into the sale history section cleanly

4. **`src/pages/AppRoutes.tsx`**
   - Change `/report` route to redirect to `/home-profile` via `Navigate`
   - Keep `/home-profile` route pointing to `HomeProfilePage`

5. **`src/components/dashboard-v3/LeftColumn.tsx`**
   - Remove the "Report" item from `bottomItems`
   - The "Home Profile" item in `navItems` already exists and stays

### Files to delete: 3
- `src/components/HomeProfile/HomeProfileContextHeader.tsx` -- absorbed into ReportHeader
- `src/components/HomeProfile/PropertyHero.tsx` -- replaced by PropertyOverviewSection
- `src/components/HomeProfile/KeyMetrics.tsx` -- data already in PropertyOverviewSection

### Files that stay unchanged
- All `src/components/report/*` section components (PropertyOverview, AssetInventory, CapitalOutlook, OpenIssues, ResolvedHistory, Replacements, DeferredRecommendations, CoverageSummary)
- `HomeStructure`, `PermitsHistory`, `SupportingRecords`, `HomeActivityLog` from `src/components/HomeProfile/`
- `SystemProvenance` from `src/components/HomeProfile/` (reused in Asset Inventory area)
- `PurchaseContext` component file stays (imported by SaleHistorySection)
- `generateHomeReportHtml` and export functionality
- `BottomNavigation.tsx` (no Report link there currently)
- Mobile navigation, chat context, auth
- `useCapitalTimeline`, `useSystemsData` hooks (still used elsewhere)

## Deferred Sections Implementation

Sections 12-14 (Permits, Supporting Records, Activity Log) are wrapped in a single Collapsible block using the existing `@radix-ui/react-collapsible` component:

```text
[Collapsible - starts closed]
  Trigger: "Show permits, records, and activity log"
  Content:
    - PermitsHistory
    - SupportingRecords (with chat CTA)
    - HomeActivityLog (with chat CTA)
```

This keeps the primary reading experience focused on the "what's in this home and what's coming" narrative while making the evidence layer accessible.

## What Does NOT Change
- Data composition rules in `useHomeReport`
- Authority resolution hierarchy
- Capital timeline logic
- Chat integration pattern
- Export/download functionality (reads same data shape)
- Mobile bottom navigation
- `HomeReportPage.tsx` is removed from routes but file can be deleted later (low priority)
