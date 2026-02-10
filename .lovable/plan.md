

# Fix: Wire Missing Property Metrics (Bedrooms, Bathrooms, Property Type)

## Root Cause

The `property-enrichment` edge function extracts `year_built` and `square_feet` from ATTOM but never extracts or persists `bedrooms`, `bathrooms`, or `property_type`. These fields exist on the `homes` table but stay null after enrichment.

The `PropertyOverviewSection` only reads from the `homes` table (via `useHomeReport` -> `UserHomeContext`), so when the DB values are null, it shows "Not available."

## Fix (Two Parts)

### Part 1: Persist missing fields during enrichment

**File: `supabase/functions/property-enrichment/index.ts`**

In the extraction block (around line 109-168), add extraction and write-through for:

- `bedrooms` from `attomData.propertyDetails?.bedrooms` or `rawProperty.building?.rooms?.beds`
- `bathrooms` from `attomData.propertyDetails?.bathrooms` or `rawProperty.building?.rooms?.bathsFull` (+ half baths as 0.5)
- `property_type` from `attomData.propertyDetails?.propertyType` or `rawProperty.summary?.propType`

Same null-guard pattern as existing fields: only write if currently null.

### Part 2: Fall back to ATTOM live data in PropertyOverviewSection

**File: `src/hooks/useHomeReport.ts`** (lines 321-334)

When building the `property` object, overlay ATTOM live data for any null fields:

```
yearBuilt: userHome.year_built ?? attomData?.propertyDetails?.yearBuilt ?? null
squareFeet: userHome.square_feet ?? attomData?.propertyDetails?.sqft ?? null
bedrooms: userHome.bedrooms ?? attomData?.propertyDetails?.bedrooms ?? null
bathrooms: userHome.bathrooms ?? attomData?.propertyDetails?.bathrooms ?? null
propertyType: userHome.property_type ?? attomData?.propertyDetails?.propertyType ?? null
```

This ensures:
- DB values always take precedence (user data wins)
- ATTOM live data fills gaps immediately (no waiting for enrichment to re-run)
- Existing homes that were enriched before this fix still show correct data on next page load

### Part 3: Backfill existing homes

**One-time consideration**: The ~5 existing homes with null bedrooms/bathrooms/property_type won't auto-fix from enrichment (it already ran). The ATTOM live fallback in Part 2 covers them on the UI side. If you want the DB permanently fixed, you'd re-trigger enrichment for those homes -- but the UI fix is immediate.

## Files to Modify (2)

| File | Change |
|------|--------|
| `supabase/functions/property-enrichment/index.ts` | Extract and write bedrooms, bathrooms, property_type from ATTOM |
| `src/hooks/useHomeReport.ts` | Overlay ATTOM live data on null property fields |

## What Does NOT Change

- PropertyOverviewSection component (it already renders the fields correctly)
- UserHomeContext (already uses `select('*')`)
- Authority hierarchy (DB values always win over ATTOM live)
- No new database columns needed (bedrooms, bathrooms, property_type already exist on homes)
