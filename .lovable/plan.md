

# Earned Confidence: Material-Aware, Climate-Gated, Confidence-Bounded Intelligence

## Summary

Transform Habitta's lifecycle intelligence from generic national ranges to material-specific, climate-adjusted, confidence-gated estimates. This directly addresses the trust critique: "The ranges feel generic where reality is highly specific."

Four backend files change. One frontend type file changes. One frontend component changes. No database schema changes.

All 6 QA findings from the review are addressed inline.

---

## What Changes (Overview)

| Change | Purpose | QA Fix |
|--------|---------|--------|
| Replace `RegionContext` with `ResolvedClimateContext` | Multi-zone climate with confidence gating | QA #6 (naming) |
| Add `climateConfidence` to gate copy tone | Prevent overconfident climate claims | QA #1 (implicit), from stress test |
| Add `costConfidence` with corrected derivation rules | Gate band tightness to data quality | QA #1 (cost confidence rules) |
| ATTOM material fallback via `systems.material` column | Leverage owned signal without fragile joins | QA #2 (ATTOM false positives) |
| HVAC duty cycle with cold-state heating adjustment | Model heating-heavy winters correctly | QA #4 (freeze state duty) |
| Telemetry logging per system | Track confidence levels for future calibration | QA #5 (telemetry blind spot) |
| Remove "Typical" from UI vocabulary | Keep "Planned" as action-framed label | QA #3 (semantics) |

---

## File 1: `supabase/functions/_shared/systemInference.ts`

### A. New Types (replace `RegionContext`)

```text
type ConfidenceLevel = 'high' | 'medium' | 'low';
type ClimateZoneType = 'high_heat' | 'coastal' | 'freeze_thaw' | 'moderate';
type HvacDutyCycle = 'low' | 'moderate' | 'high' | 'extreme';

// QA FIX #6: Named "ResolvedClimateContext" to distinguish from frontend's display-only climateZone.ts
interface ResolvedClimateContext {
  climateZone: ClimateZoneType;
  climateMultiplier: number;           // 0.80-1.0
  climateConfidence: ConfidenceLevel;  // Gates attribution copy tone
  dutyCycle: { hvac: HvacDutyCycle };
  lifespanModifiers: {
    hvac: number;
    roof: number;
    water_heater: number;
  };
}
```

### B. `classifyClimate()` replaces `getRegionContext()`

Aligned with frontend's `deriveClimateZone()` but adds confidence and duty cycle. The existing `getRegionContext()` is kept as a deprecated shim that constructs a minimal `ResolvedClimateContext`.

Climate multipliers and lifespan adjustments by zone:

| Zone | Multiplier | Climate Conf. | HVAC adj | Roof adj | WH adj |
|------|-----------|---------------|----------|----------|--------|
| coastal (FL + city match) | 0.80 | high | -3 | -5 | -2 |
| high_heat (FL, AZ, TX) | 0.82 | medium | -2 | -3 | -1 |
| freeze_thaw (MN, WI, MI...) | 0.85 | medium | -1 | -4 | 0 |
| moderate (everything else) | 1.0 | low | 0 | 0 | 0 |

Climate confidence rules:
- **high**: Explicit coastal city match (Miami Beach, Key West, Fort Lauderdale, etc.) in FL
- **medium**: State-level classification (FL, AZ, TX, freeze states)
- **low**: Fallback / moderate zone

HVAC duty cycle (QA FIX #4 -- cold-state heating):
- **extreme**: FL + coastal cities
- **high**: FL (rest), AZ, TX, AND freeze states with gas furnace assumption (heating-heavy winters destroy heat exchangers)
- **moderate**: Other freeze states, default
- **low**: CA (non-desert), Pacific Northwest

### C. HVAC Cost Bands by System Type

```text
const HVAC_COSTS: Record<string, { min: number; max: number }> = {
  split_standard:       { min: 7000, max: 14000 },
  split_high_efficiency: { min: 12000, max: 22000 },
  heat_pump:            { min: 9000, max: 18000 },
  package_unit:         { min: 8000, max: 16000 },
  unknown:              { min: 9000, max: 14000 },
};
```

### D. `deriveCostConfidence()` (QA FIX #1 -- corrected rules)

```text
function deriveCostConfidence(
  materialSource: string | null,
  installSource: string,
  climateConfidence: ConfidenceLevel
): ConfidenceLevel {
  // High: Permit-verified material OR ATTOM + strong climate signal
  if (materialSource === 'permit') return 'high';
  if (materialSource === 'attom' && climateConfidence === 'high') return 'high';

  // Medium: ATTOM or owner-reported material, OR climate medium
  if (materialSource === 'attom' || materialSource === 'owner_reported') return 'medium';
  if (climateConfidence === 'medium') return 'medium';

  // Low: everything else
  return 'low';
}
```

This removes the contradictory `hasPermit` check from the original plan. `materialSource === 'permit'` alone is sufficient for high confidence.

### E. `deriveTypicalBand()` -- Confidence-Gated Band Compression

```text
function deriveTypicalBand(
  low: number,
  high: number,
  confidence: ConfidenceLevel
): { typicalLow: number; typicalHigh: number } {
  const range = high - low;
  const factors = {
    high:   [0.25, 0.40],   // Tight: 15% of range
    medium: [0.40, 0.55],   // Medium: 15% of range
    low:    [0.60, 0.70],   // Wide: still anchored but honest
  }[confidence];
  return {
    typicalLow: Math.round(low + range * factors[0]),
    typicalHigh: Math.round(low + range * factors[1]),
  };
}
```

### F. HVAC Emergency Multiplier (Duty-Cycle-Aware)

```text
function hvacEmergencyMultiplier(duty: HvacDutyCycle): number {
  return { low: 1.20, moderate: 1.35, high: 1.50, extreme: 1.65 }[duty];
}
```

### G. ATTOM Material False Positive Brake (QA FIX #2)

Add `normalizeRoofMaterial()` with a safety valve:

```text
function normalizeRoofMaterial(
  raw: string,
  yearBuilt: number
): { material: 'asphalt' | 'tile' | 'metal' | 'unknown'; downgraded: boolean } {
  const lower = raw.toLowerCase();
  let material: 'asphalt' | 'tile' | 'metal' | 'unknown' = 'unknown';

  if (lower.includes('tile') || lower.includes('concrete')) material = 'tile';
  else if (lower.includes('metal') || lower.includes('standing seam')) material = 'metal';
  else if (lower.includes('shingle') || lower.includes('asphalt') || lower.includes('composition')) material = 'asphalt';

  // Safety brake: tile or metal on pre-1970 homes is suspicious
  // (may be ATTOM carrying stale/wrong data for older properties)
  const downgraded = (material === 'tile' || material === 'metal') && yearBuilt < 1970;

  return { material, downgraded };
}
```

When `downgraded === true`, `materialSource` is set to `'inferred'` instead of `'attom'`, which automatically softens cost confidence via `deriveCostConfidence()`.

### H. Updated Calculator Functions

All three calculator functions (`calculateHVACLifecycle`, `calculateRoofLifecycle`, `calculateWaterHeaterLifecycle`) accept `ResolvedClimateContext` instead of `RegionContext`:

- **HVAC**: Uses duty-cycle-adjusted lifespan (floor at 60% of base), type-specific cost bands, duty-cycle emergency multiplier
- **Roof**: Uses zone-aware lifespan modifiers instead of binary `isHotHumid ? -3 : 0`
- **Water heater**: Applies zone-specific lifespan modifier (coastal: -2 years)

The `calculateSystemLifecycle()` entry point accepts `ResolvedClimateContext`. A backward-compat shim wraps old `RegionContext` calls.

### I. `LifecycleOutput` Extended

```text
interface LifecycleOutput {
  // ...existing fields...
  materialType?: string;
  climateZone?: ClimateZoneType;
  climateConfidence?: ConfidenceLevel;
  costConfidence?: ConfidenceLevel;
}
```

---

## File 2: `supabase/functions/capital-timeline/index.ts`

### A. Extended `SystemTimelineEntry` (Internal Type)

Add to the edge function's internal type:
```text
materialType?: string;
materialSource?: string;
climateZone?: string;
climateConfidence?: string;
costConfidence?: string;
costAttributionLine?: string;
costDisclaimer?: string;
capitalCost: {
  low: number;
  high: number;
  typicalLow?: number;
  typicalHigh?: number;
  currency: 'USD';
  costDrivers: string[];
};
```

### B. ATTOM Material Fallback

The `enrichment_snapshots` table uses `address_id` from the validation pipeline's `addresses` table, but `homes` links through `property_id` to a separate `properties` table. There is no reliable FK join between these two pipelines.

Instead of adding a fragile cross-pipeline query, the ATTOM fallback works as follows:

1. Check `systems.material` first (authoritative if populated)
2. If null, query `enrichment_snapshots` using `homes.address_id` (when populated)
3. If `homes.address_id` is also null (most current records), fall through to `'unknown'` with appropriate confidence

This is explicitly transitional. The medium-term fix is for the onboarding/enrichment pipeline to write ATTOM-derived material to `systems.material` at property setup time. A code comment marks this as the future path.

When ATTOM data is found:
- Run through `normalizeRoofMaterial()` with false-positive brake
- If `downgraded`, set `materialSource = 'inferred'`
- Otherwise set `materialSource = 'attom'`

### C. `formatCostAttributionLine()` -- Confidence-Gated Copy

Server-side only. No UI copy invention allowed.

| Climate Conf. | Material Known | Output |
|---------------|---------------|--------|
| high | yes | "Estimates reflect your [material] [system], coastal exposure, and regional labor costs." |
| medium | yes | "Estimates reflect a [material] [system] and regional climate usage." |
| medium | no | "Estimates adjusted for regional climate usage." |
| low | any | "Estimates based on typical conditions for homes in your area." |

For HVAC specifically, duty cycle gates a variant:
- extreme: "HVAC estimates reflect heavy year-round usage in your climate."
- high: "HVAC estimates adjusted for above-average seasonal usage."
- moderate/low: "HVAC estimates based on typical usage for your area."

### D. `formatCostDisclaimer()` -- System-Specific Defensive Copy

Non-negotiable one-liner per system type:
- Roof: "Final pricing varies with roof complexity and access."
- HVAC: "Final pricing varies with equipment efficiency, ductwork condition, and access."
- Water heater: "Final pricing varies with fuel type and installation requirements."

### E. Updated `buildTimelineEntry()`

Populates all new fields from the lifecycle output:
```text
materialType, materialSource, climateZone, climateConfidence,
costConfidence, costAttributionLine, costDisclaimer,
capitalCost: { ...existing, typicalLow, typicalHigh }
```

### F. Replace `getRegionContext()` with `classifyClimate()`

Update the main handler (line 520) to use the new climate classification.

### G. Telemetry Logging (QA FIX #5)

Extend the existing `console.log` block (lines 614-625) to include per-system:
```text
sources: timelineEntries.map(e => ({
  system: e.systemId,
  source: e.installSource,
  year: e.installYear,
  confidence: e.confidenceScore,
  // NEW telemetry fields
  materialType: e.materialType,
  materialSource: e.materialSource,
  climateZone: e.climateZone,
  climateConfidence: e.climateConfidence,
  costConfidence: e.costConfidence,
}))
```

This enables future analysis of where confidence breaks, what percentage of roofs come from ATTOM vs unknown, and where users later override assumptions.

---

## File 3: `src/types/capitalTimeline.ts`

Add new optional fields to frontend types for backward-compatible consumption:

```text
// In SystemTimelineEntry:
materialType?: string;
materialSource?: string;
climateZone?: string;
climateConfidence?: string;
costConfidence?: string;
costAttributionLine?: string;
costDisclaimer?: string;

// In CapitalCostRange:
typicalLow?: number;
typicalHigh?: number;
```

All optional -- the UI gracefully falls back if the backend hasn't been deployed with these fields yet.

---

## File 4: `src/components/system/SystemPlanView.tsx`

### A. Delete Hardcoded Constants

Remove entirely:
- `COST_PREMIUMS` (lines 18-21)
- `EMERGENCY_PREMIUMS` (lines 24-28)
- `REPLACEMENT_COSTS` (lines 31-35)

### B. Rewrite `getCostTiers()` to Use Timeline Data

```text
function getCostTiers(system: SystemTimelineEntry): CostTierDisplay[] {
  const cost = system.capitalCost;
  const hasTypicalBand = cost.typicalLow != null && cost.typicalHigh != null;

  // "Planned" tier: uses tightened band when available (QA FIX #3: never call this "Typical" in UI)
  const plannedRange = hasTypicalBand
    ? { low: cost.typicalLow!, high: cost.typicalHigh! }
    : { low: cost.low, high: cost.high };

  // Emergency tier: full range with system-appropriate premium from backend
  const emergencyMultiplier = system.systemId === 'hvac' ? 1.50
    : system.systemId === 'roof' ? 1.40
    : 1.25;
  const emergencyRange = {
    low: Math.round(cost.low * emergencyMultiplier),
    high: Math.round(cost.high * emergencyMultiplier),
  };

  return [
    {
      label: PLAN_COPY.costTiers.planned.label,    // "Planned replacement"
      tier: 'planned',
      range: plannedRange,
      definition: PLAN_COPY.costTiers.planned.definition,
    },
    {
      label: PLAN_COPY.costTiers.emergency.label,   // "Emergency replacement"
      tier: 'emergency',
      range: emergencyRange,
      definition: PLAN_COPY.costTiers.emergency.definition,
    },
  ];
}
```

Note: The "Typical" tier is removed from the UI (QA FIX #3). Users see two tiers: Planned (anchored) and Emergency (worst case). This avoids the "Planned vs Typical" confusion. The word "typical" is only used internally for `typicalLow/typicalHigh` band math.

### C. Show Material in System Header

If `system.materialType` is present and not 'unknown':
```text
// "Roof -- Tile" instead of just "Roof"
const materialSuffix = system.materialType && system.materialType !== 'unknown'
  ? ` -- ${capitalize(system.materialType)}`
  : '';
const displayName = (system.systemLabel || getSystemDisplayName(system.systemId)) + materialSuffix;
```

### D. Render Attribution and Disclaimer

Below the cost tiers card, add two quiet lines:
1. `costAttributionLine` (if present): "Estimates reflect your tile roof, coastal exposure, and regional labor costs."
2. `costDisclaimer` (always): "Final pricing varies with roof complexity and access."

Both rendered as `text-xs text-muted-foreground` -- calm, not alarmist.

---

## File 5: `src/lib/mobileCopy.ts`

Remove the "Typical" cost tier from `PLAN_COPY.costTiers`:
```text
costTiers: {
  planned: {
    label: 'Planned replacement',
    definition: 'Scheduled in advance with flexibility',
  },
  // "typical" tier removed -- QA FIX #3: avoid "Planned" vs "Typical" confusion
  emergency: {
    label: 'Emergency replacement',
    definition: 'Post-failure, high urgency',
  },
},
```

---

## Callers of `getRegionContext()` That Need Migration

Three edge functions currently import `getRegionContext()`:

| Function | Action |
|----------|--------|
| `capital-timeline/index.ts` | Migrate to `classifyClimate()` (primary target) |
| `ai-home-assistant/index.ts` | Keep deprecated shim for now; it passes `RegionContext` to `calculateSystemLifecycle()` which will accept both via shim |
| `intelligence-engine/index.ts` | Keep deprecated shim; uses legacy `inferRoofTimeline()` / `inferWaterHeaterTimeline()` which already accept `RegionContext` |

Only `capital-timeline` migrates in this pass. The deprecated `getRegionContext()` function stays exported as a shim that constructs a minimal `ResolvedClimateContext` from the binary `isHotHumid` flag, ensuring zero breakage in the other two callers.

---

## What This Does NOT Change

- No database schema changes
- No new tables or columns
- Frontend `climateZone.ts` remains unchanged (display-only, no confidence concept)
- AI home assistant and chat unaffected
- Home Report tab unaffected
- `SYSTEM_CONFIGS.replacementCostRange` in `systemConfigs.ts` remains as a fallback for non-lifecycle surfaces

---

## Implementation Order

1. **`systemInference.ts`** -- Foundation: new types, climate classification, cost confidence, band compression, HVAC costs, ATTOM safety brake, updated calculators, deprecated shim
2. **`capital-timeline/index.ts`** -- Orchestrator: ATTOM fallback, attribution copy, disclaimer, new entry fields, telemetry, climate migration
3. **`src/types/capitalTimeline.ts`** -- Frontend types (backward-compatible optional fields)
4. **`src/lib/mobileCopy.ts`** -- Remove "Typical" tier copy
5. **`src/components/system/SystemPlanView.tsx`** -- Consume real data, remove hardcoded constants, show material + attribution + disclaimer

---

## QA Checklist (All 6 Fixes Addressed)

| # | Issue | Fix | Where |
|---|-------|-----|-------|
| 1 | Cost confidence rules inconsistent | Cleaned: `permit` alone = high; `attom` + high climate = high | `deriveCostConfidence()` |
| 2 | ATTOM roof false positives | Safety brake: tile/metal on pre-1970 homes downgrades to 'inferred' | `normalizeRoofMaterial()` |
| 3 | "Planned" vs "Typical" UI confusion | Remove "Typical" tier from UI entirely; word only used internally | `SystemPlanView.tsx`, `mobileCopy.ts` |
| 4 | Freeze-state HVAC duty underweighted | Freeze states with gas furnace = 'high' duty (heating-heavy) | `classifyClimate()` |
| 5 | Missing telemetry | Log `materialType`, `materialSource`, `climateZone`, `climateConfidence`, `costConfidence` per system | `capital-timeline` console.log |
| 6 | Naming confusion (ClimateContext vs climateZone.ts) | Backend type renamed to `ResolvedClimateContext` | `systemInference.ts` |

