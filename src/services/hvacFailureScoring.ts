/**
 * HVAC Failure Window Scoring Engine
 * 
 * Pure, deterministic scoring function for HVAC failure window prediction.
 * All indices are normalized to [0,1] before multiplier calculation.
 * 
 * @version hvac_failure_v1
 */

import type { 
  HVACFailureInputs, 
  HVACFailureResult, 
  HVACFailureConstants,
  HVACFailureProvenance 
} from '@/types/hvacFailure';

/**
 * Model constants - versioned for reproducibility
 * Baseline values calibrated for US national averages
 */
const HVAC_FAILURE_CONSTANTS: HVACFailureConstants = {
  model_version: 'hvac_failure_v1',
  baseline: {
    median_lifespan_years: 13,
    sigma_years: 2.5
  },
  clamps: {
    multiplier_min: 0.6,
    multiplier_max: 1.3
  }
};

// ============== Helper Utilities ==============

/**
 * CRITICAL: All index inputs are normalized to [0,1] before use
 * This prevents invalid multipliers and ensures deterministic output
 */
function normalizeIndex(value: number | undefined): number {
  return Math.min(Math.max(value ?? 0, 0), 1);
}

/**
 * Generic clamp function
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate years between two dates
 */
function yearsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Add years to a date
 */
function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * 365.25 * 24 * 60 * 60 * 1000);
}

// ============== Core Scoring Function ==============

/**
 * Score HVAC failure window using multi-factor risk model
 * 
 * @param inputs - Normalized input parameters
 * @param now - Reference date for calculations (defaults to current date)
 * @returns HVACFailureResult with p10/p50/p90 dates and provenance
 * 
 * @example
 * ```ts
 * const result = scoreHVACFailure({
 *   installDate: new Date('2023-12-01'),
 *   climateStressIndex: 0.8,
 *   maintenanceScore: 0.5,
 *   featureCompleteness: 0.5,
 *   installVerified: true,
 *   hasUsageSignal: false
 * });
 * console.log(result.years_remaining_p50); // ~10.6 years
 * ```
 */
export function scoreHVACFailure(
  inputs: HVACFailureInputs,
  now: Date = new Date()
): HVACFailureResult {
  const {
    installDate,
    climateStressIndex,
    maintenanceScore,
    featureCompleteness,
    usageIndex,
    environmentIndex,
    installVerified,
    hasUsageSignal
  } = inputs;

  // ========== Normalize all indices ==========
  const normClimate = normalizeIndex(climateStressIndex);
  const normMaintenance = normalizeIndex(maintenanceScore);
  const normCompleteness = normalizeIndex(featureCompleteness);
  const normUsage = normalizeIndex(usageIndex);
  const normEnvironment = normalizeIndex(environmentIndex);

  // ========== Calculate multipliers ==========
  // M_climate: 1 - 0.18 * index → range [0.82, 1.0]
  const M_climate = 1 - 0.18 * normClimate;
  
  // M_maintenance: 0.85 + 0.25 * score → range [0.85, 1.10]
  const M_maintenance = 0.85 + 0.25 * normMaintenance;
  
  // M_install: 0.97 + 0.06 if verified → range [0.97, 1.03]
  const M_install = 0.97 + (installVerified ? 0.06 : 0);
  
  // M_usage: 1 - 0.12 * index → range [0.88, 1.0]
  const M_usage = 1 - 0.12 * normUsage;
  
  // M_environment: 1 - 0.10 * index → range [0.90, 1.0]
  const M_environment = 1 - 0.10 * normEnvironment;
  
  // M_unknowns: 0.90 + 0.10 * completeness → range [0.90, 1.0]
  const M_unknowns = 0.90 + 0.10 * normCompleteness;

  // ========== Calculate total multiplier (clamped) ==========
  let M_total = M_climate * M_maintenance * M_install * M_usage * M_environment * M_unknowns;
  M_total = clamp(
    M_total,
    HVAC_FAILURE_CONSTANTS.clamps.multiplier_min,
    HVAC_FAILURE_CONSTANTS.clamps.multiplier_max
  );

  // ========== Lifespan calculations ==========
  const L50_base = HVAC_FAILURE_CONSTANTS.baseline.median_lifespan_years;
  const sigma_base = HVAC_FAILURE_CONSTANTS.baseline.sigma_years;

  const L50_effective = L50_base * M_total;

  const age_years = Math.max(yearsBetween(installDate, now), 0);
  const years_remaining_p50 = Math.max(L50_effective - age_years, 0);

  // ========== Dynamic uncertainty expansion ==========
  // Widen spread when data is incomplete
  const sigma_effective = sigma_base * (1 + 0.9 * (1 - normCompleteness));

  // Z-score for 10th/90th percentile (normal distribution)
  const Z_10 = 1.2816;

  let L10 = L50_effective - Z_10 * sigma_effective;
  let L90 = L50_effective + Z_10 * sigma_effective;

  // Clamp lifespan bounds to reasonable values
  L10 = clamp(L10, 3, 30);
  L90 = clamp(L90, 3, 30);

  // ========== Calculate failure dates ==========
  // Edge case: if system is already beyond expected lifespan, 
  // set dates to current or near-future
  const p10_failure_date = addYears(installDate, L10);
  const p50_failure_date = addYears(installDate, L50_effective);
  const p90_failure_date = addYears(installDate, L90);

  // Ensure dates don't go backwards for old systems
  const ensureFutureDate = (date: Date): Date => {
    return date < now ? now : date;
  };

  // ========== Confidence score ==========
  // Based on data quality, NOT system condition
  // All signals are explicit booleans or normalized scores
  const confidence = clamp(
    0.25 +
    (installVerified ? 0.30 : 0) +
    0.25 * normMaintenance +
    0.10 * normCompleteness +
    0.10 * (hasUsageSignal ? 1 : 0),
    0,
    1
  );

  // ========== Build provenance ==========
  const provenance: HVACFailureProvenance = {
    model_version: HVAC_FAILURE_CONSTANTS.model_version,
    multipliers: {
      M_climate,
      M_maintenance,
      M_install,
      M_usage,
      M_environment,
      M_unknowns,
      M_total
    },
    baseline: {
      L50_base,
      sigma_base
    },
    effective: {
      L50_effective,
      sigma_effective
    },
    inputs
  };

  return {
    p10_failure_date: ensureFutureDate(p10_failure_date).toISOString(),
    p50_failure_date: ensureFutureDate(p50_failure_date).toISOString(),
    p90_failure_date: ensureFutureDate(p90_failure_date).toISOString(),
    years_remaining_p50: Number(years_remaining_p50.toFixed(1)),
    confidence_0_1: Number(confidence.toFixed(2)),
    provenance
  };
}

/**
 * Get the model constants (for testing/debugging)
 */
export function getHVACFailureConstants(): HVACFailureConstants {
  return { ...HVAC_FAILURE_CONSTANTS };
}
