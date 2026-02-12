

# Fix "Still Analyzing" Stuck State, Address Normalization, and Permits Visibility

## Problem Summary

Three interconnected issues:

1. **"Still analyzing your home..." never resolves** -- The enrichment chain (`create-home` -> `property-enrichment` -> `permit-enrichment`) breaks silently. Only `permit-enrichment` sets `pulse_status: 'live'` (line 120). If `property-enrichment` fails to chain, or `permit-enrichment` crashes before reaching that update, the home is permanently stuck at `enriching`.

2. **Shovels API misses permits due to un-normalized addresses** -- The `fetchShovelsPermits` function sends the raw address string (e.g., "Lake Breeze Court") to the Shovels address search API with no suffix normalization. If the API indexes as "Ct" instead of "Court", the search returns 404.

3. **Permits section hidden behind collapsed UI** -- The `PermitsHistory` component is inside a `Collapsible` block at the bottom of HomeProfilePage that defaults to closed.

## Implementation Plan

### 1. Backend: Guarantee `pulse_status: 'live'` in `property-enrichment`

**File: `supabase/functions/property-enrichment/index.ts`**

Wrap the main logic in a `try/finally` block that always sets `pulse_status: 'live'` as the last step, even if `chainToPermitEnrichment` fails or times out.

- Add a `finally` block after the main try/catch that updates `homes.pulse_status = 'live'` for the given `home_id`
- Add a 30-second timeout race on `chainToPermitEnrichment` so it doesn't hang indefinitely
- Log whether the permit chain succeeded or timed out

This means `permit-enrichment` can still update confidence and trigger downstream chains, but `property-enrichment` no longer depends on it completing for the home to become `live`.

### 2. Backend: Address suffix normalization in `shovels-permits`

**File: `supabase/functions/shovels-permits/index.ts`**

Add a normalization step in `fetchShovelsPermits` with retry logic:

- Define a suffix map: Court/Ct, Road/Rd, Street/St, Drive/Dr, Lane/Ln, Boulevard/Blvd, Avenue/Ave, Circle/Cir, Place/Pl, Terrace/Ter, Way/Wy, South/S, North/N, East/E, West/W
- Try the original address first
- If the address search returns 404 or 0 results, apply normalization (long to short form) and retry
- If still no results, try expanding (short to long form) and retry
- Log which variant succeeded for observability

The Miami-Dade address normalizer already exists (`normalizeMiamiDadeAddress`); this adds similar logic for the Shovels path specifically.

### 3. Frontend: Timeout fallback for stuck enrichment

**File: `src/pages/DashboardV3.tsx`**

Add a computed `isEffectivelyLive` check that treats a home as live if:
- `pulse_status` is `'live'`, OR
- `pulse_status` is `'enriching'` or `'initializing'` AND `created_at` is more than 5 minutes ago

Replace the current `isEnriching` derivation (line 523) with this logic. This prevents any future pipeline failures from permanently blocking the UI.

### 4. Frontend: Surface permits in Home Profile

**File: `src/pages/HomeProfilePage.tsx`**

Move `PermitsHistory` out of the collapsed "Deferred Sections" `Collapsible` block (lines 221-237) and place it as a standalone section after "Deferred Recommendations" (after line 217). The collapsed block will retain only Supporting Records and Activity Log.

### 5. Data fix: Unstick existing homes

Run a one-time SQL update to fix any homes currently stuck in `enriching`:

```text
UPDATE homes
SET pulse_status = 'live'
WHERE pulse_status IN ('enriching', 'initializing')
  AND created_at < NOW() - INTERVAL '5 minutes';
```

## Execution Order

1. `property-enrichment` resilience (prevents new stuck states)
2. Data fix migration (fixes existing stuck homes)
3. Frontend timeout (safety net)
4. Address normalization (improves permit coverage)
5. Permits visibility (UX fix)

## Technical Details

**Files modified:**
- `supabase/functions/property-enrichment/index.ts` -- `finally` block + 30s timeout on permit chain
- `supabase/functions/shovels-permits/index.ts` -- Address suffix normalization with bidirectional retry in `fetchShovelsPermits`
- `src/pages/DashboardV3.tsx` -- Replace `isEnriching` with time-aware `isEffectivelyLive` check
- `src/pages/HomeProfilePage.tsx` -- Move `PermitsHistory` above the collapsible block
- SQL migration -- Unstick existing homes

