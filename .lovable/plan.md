

# ATTOM Data Integration: Wiring Unused Signals Into the Intelligence Engine

## Overview

Thread 6 unused ATTOM fields into the data layer, inference engine, and UI in a strict sequence. Each sprint delivers immediate truthfulness improvement.

**Key principle**: Lifecycle inference produces a single best estimate. All range math stays in the existing confidence system. No new confidence engine -- we extend what exists.

---

## Sprint 1: Foundation (Must Ship First)

### 1.1 Database Migration

Add columns to `homes` table. These are written once during enrichment, read everywhere.

```sql
ALTER TABLE homes ADD COLUMN year_built_effective INTEGER;
ALTER TABLE homes ADD COLUMN build_quality TEXT;
ALTER TABLE homes ADD COLUMN arch_style TEXT;
ALTER TABLE homes ADD COLUMN data_match_confidence TEXT;
ALTER TABLE homes ADD COLUMN fips_code TEXT;
ALTER TABLE homes ADD COLUMN gross_sqft INTEGER;
ALTER TABLE homes ADD COLUMN rooms_total INTEGER;
ALTER TABLE homes ADD COLUMN ground_floor_sqft INTEGER;
```

None of these columns are required -- all nullable, all additive.

### 1.2 Canonical ATTOM Normalization

**New file: `supabase/functions/_shared/normalizeAttom.ts`**

Single normalization function. All ATTOM consumers read through this.

```text
Input:  Raw ATTOM property object (from attom-property response)
Output: NormalizedAttomProfile
  - effectiveYearBuilt: number      // yearBuiltEffective ?? yearBuilt
  - buildQuality: 'A'|'B'|'C'|'D' | null  (from bldgQuality)
  - archStyle: string | null        (from archStyle)
  - grossSqft: number | null        (from grossSize)
  - groundFloorSqft: number | null  (from groundFloorSize)
  - roomsTotal: number | null       (from roomsTotal)
  - bathsFull: number | null
  - bathsHalf: number | null
  - parking: { type, spaces }
  - lastSale: { amount, date, pricePerSqft, disclosureType }
  - dataMatchConfidence: 'high'|'medium'|'low'  (from matchCode)
  - fipsCode: string | null         (from identifier.fips)
```

**matchCode mapping** (internal, never shown to user):
- ExactMatch, StreetMatch -> 'high'
- CityMatch -> 'medium'
- Everything else -> 'low'

### 1.3 Update `attom-property` Edge Function

- Import and use `normalizeAttom()` to produce the canonical output
- Add a top-level `normalizedProfile` key to the transformed response (alongside existing `propertyDetails` and `extendedDetails`)
- Existing consumers continue working unchanged

### 1.4 Extend `extractAttom.ts`

Add new fields to `AttomPropertyFacts`:
- `effectiveYearBuilt`
- `buildQuality`
- `archStyle`
- `grossSqft`
- `roomsTotal`
- `groundFloorSqft`
- `dataMatchConfidence`
- `fipsCode`

### 1.5 Write-Through in `property-enrichment`

This is the critical persistence step. Currently `property-enrichment/index.ts` extracts `yearBuilt`, `squareFeet`, and `folio` from ATTOM and writes them to `homes`. We extend this to also write:

- `year_built_effective` (from `_attomData.building.summary.yearBuiltEffective`)
- `build_quality` (from `_attomData.building.summary.bldgQuality`, normalized to A/B/C/D)
- `arch_style` (from `_attomData.building.summary.archStyle`)
- `data_match_confidence` (mapped from `_attomData.address.matchCode`)
- `fips_code` (from `_attomData.identifier.fips`)
- `gross_sqft` (from `_attomData.building.size.grossSize`)
- `rooms_total` (from `_attomData.building.rooms.roomsTotal`)
- `ground_floor_sqft` (from `_attomData.building.size.groundFloorSize`)

Same pattern as existing fields: only write if currently null, never overwrite user data.

### 1.6 Wire `effectiveYearBuilt` Into Capital Timeline

**`supabase/functions/capital-timeline/index.ts`** line 651:

```typescript
// Before
yearBuilt: home.year_built || 2000,

// After
yearBuilt: home.year_built_effective ?? home.year_built ?? 2000,
```

This single change fixes the biggest silent trust leak. Every heuristic fallback in `resolveInstallAuthority` now anchors to the effective renovation year. No other inference changes needed -- the fix flows through `PropertyContext.yearBuilt` automatically.

### 1.7 Build Quality as Lifespan Degradation

**`supabase/functions/_shared/systemInference.ts`**

Extend `PropertyContext` with `buildQuality?: 'A'|'B'|'C'|'D'`.

Apply lifespan degradation only (not range widening) inside `calculateHVACLifecycle`, `calculateRoofLifecycle`, and `calculateWaterHeaterLifecycle`:
- Quality C: expected lifespan -10%
- Quality D: expected lifespan -20%
- Quality A/B: no change

Add a `LifespanDriver` when degradation is applied:
- `{ factor: 'Construction quality', impact: 'decrease', severity: 'low'|'medium', description: '...' }`

**Invariant**: Build quality never widens ranges. It shortens expected lifespan, which shifts the replacement window earlier. Range width remains governed by existing `windowUncertaintyFromConfidence()`.

---

## Sprint 2: Context Enrichment

### 2.1 FIPS-Based Climate Precision

**`supabase/functions/_shared/systemInference.ts`**

Extend `classifyClimate()` signature to accept optional `fipsCode?: string`.

- State-level FIPS prefix (first 2 digits) confirms state classification
- A hardcoded list of ~30 coastal county FIPS codes upgrades `climateConfidence` from `'medium'` to `'high'` for properties in those counties
- If FIPS is present but doesn't map cleanly, `climateConfidence` stays `'medium'`

**`supabase/functions/capital-timeline/index.ts`**:
```typescript
const climateContext = classifyClimate(propertyContext.state, propertyContext.city, home.fips_code);
```

### 2.2 Size Data as Advisory Context

Extend `PropertyContext`:
```typescript
grossSqft?: number;
roomsTotal?: number;
groundFloorSqft?: number;
```

Use in lifecycle calculators as advisory lifespan drivers only:
- `grossSqft > 3000` adds driver: "Larger thermal load increases system wear"
- `groundFloorSqft` vs `grossSqft` ratio infers multi-story (adds driver for zone complexity)
- These modify language and lifespan drivers, never replacement estimates or confidence bands

### 2.3 Home Profile UI Enrichment

**`src/components/HomeProfile/PropertyDetails.tsx`**

Add rows:
- "Architectural Style" (from `archStyle`)
- Build year display: "Built 1960 -- Renovated 2005" when `year_built_effective` differs from `year_built`
- Build quality shown as human-readable descriptor: "Standard construction" (C/D), "Above-average construction" (A/B)

Extend `PropertyHistory` interface in `src/lib/propertyAPI.ts` with:
```typescript
normalizedProfile?: {
  effectiveYearBuilt: number;
  buildQuality: string | null;
  archStyle: string | null;
  grossSqft: number | null;
  roomsTotal: number | null;
  dataMatchConfidence: string;
  fipsCode: string | null;
  lastSale?: {
    amount: number | null;
    date: string | null;
    pricePerSqft: number | null;
  };
};
```

### 2.4 Purchase Context Card

**New component: `src/components/HomeProfile/PurchaseContext.tsx`**

Minimal, restrained card:
- Last sale price
- Price per sqft at purchase
- Purchase date

Rules:
- Only renders when `lastSale.amount > 0` AND `lastSale.date` exists
- No projections, no arrows, no valuation language
- No empty states

---

## Sprint 3: Behavioral Confidence Gating

### 3.1 Data Match Confidence Effects

**`supabase/functions/capital-timeline/index.ts`**

Read `home.data_match_confidence` and apply at the orchestration layer:
- `'low'`: reduce base confidence score by 0.10 (making `windowUncertaintyFromConfidence` naturally widen bands)
- `'medium'`: reduce by 0.05
- `'high'`: no change

This uses the existing `windowUncertaintyFromConfidence()` function rather than creating parallel range math. The confidence score reduction propagates naturally through `dataQualityFromConfidence()` and `windowUncertaintyFromConfidence()`.

Add a `limitingFactor` when match confidence is low: "Property data match is approximate"

### 3.2 Sale History in Report

Surface existing `saleHistory` data in the Report/Home Profile under "Ownership and Purchase History". Only renders if data exists. No empty states. No analysis.

---

## Files to Create (2)

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/normalizeAttom.ts` | Canonical ATTOM normalization |
| `src/components/HomeProfile/PurchaseContext.tsx` | Purchase context card |

## Files to Modify (~8)

| File | Change |
|------|--------|
| `supabase/functions/attom-property/index.ts` | Import normalizeAttom, emit normalizedProfile |
| `supabase/functions/_shared/extractAttom.ts` | Extend AttomPropertyFacts with new fields |
| `supabase/functions/property-enrichment/index.ts` | Write-through new columns to homes |
| `supabase/functions/_shared/systemInference.ts` | Extend PropertyContext, add buildQuality degradation, FIPS in classifyClimate, size drivers |
| `supabase/functions/capital-timeline/index.ts` | Use year_built_effective, pass buildQuality + fips_code, apply data_match_confidence |
| `src/lib/propertyAPI.ts` | Extend PropertyHistory with normalizedProfile |
| `src/components/HomeProfile/PropertyDetails.tsx` | Show arch style, effective year, build quality |

## What Does NOT Change

- Capital timeline output shape (fields are additive)
- Authority resolution hierarchy (Permit > Owner > Heuristic)
- Confidence cap (0.85)
- Mobile navigation or layout
- Existing consumers of capital timeline data
- ChatConsole, AI advisor, or message persistence

## Hard Invariants (Non-Negotiable)

- `_attomData` is never read outside normalization after Sprint 1
- `effectiveYearBuilt` always resolves to `yearBuiltEffective ?? yearBuilt`
- Build quality never widens ranges -- it only shortens expected lifespan
- All range width is governed by existing `windowUncertaintyFromConfidence()` -- no parallel band math
- `data_match_confidence` is behavioral, never displayed
- FIPS code is internal plumbing only
- Sale data is descriptive, not predictive

