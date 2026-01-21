/**
 * HVAC Failure Window Types
 * 
 * Pure data contracts for failure window prediction.
 * All indices are normalized to [0,1] before use.
 * 
 * @version hvac_failure_v1
 */

/**
 * Explicit provenance interface - prevents schema entropy
 * Tracks all inputs and calculated multipliers for auditability
 */
export interface HVACFailureProvenance {
  model_version: string;
  multipliers: {
    M_climate: number;
    M_maintenance: number;
    M_install: number;
    M_usage: number;
    M_environment: number;
    M_unknowns: number;
    M_total: number;
  };
  baseline: {
    L50_base: number;
    sigma_base: number;
  };
  effective: {
    L50_effective: number;
    sigma_effective: number;
  };
  inputs: HVACFailureInputs;
  extras?: Record<string, unknown>; // Future extensibility
}

/**
 * Input parameters for failure window calculation
 * All index values are clamped to [0,1] in the scoring function
 */
export interface HVACFailureInputs {
  /** HVAC system installation date */
  installDate: Date;
  
  /** Climate stress index (0 = mild, 1 = harsh). Clamped to [0,1] before use */
  climateStressIndex: number;
  
  /** Maintenance quality score (0 = no records, 1 = excellent documented service). Clamped to [0,1] */
  maintenanceScore: number;
  
  /** Data completeness score (0 = minimal data, 1 = full data). Clamped to [0,1] */
  featureCompleteness: number;
  
  /** Usage intensity index (0 = normal, 1 = heavy). Optional, defaults to 0 */
  usageIndex?: number;
  
  /** Environmental stress index (0 = inland, 1 = coastal/harsh). Optional, defaults to 0 */
  environmentIndex?: number;
  
  /** Whether the install date is verified via permit or explicit record */
  installVerified: boolean;
  
  /** Explicit boolean for confidence calculation - true if usage telemetry exists */
  hasUsageSignal: boolean;
}

/**
 * Output of the failure window calculation
 * Pure semantic data - no presentation formatting
 */
export interface HVACFailureResult {
  /** Early failure date (10th percentile) - ISO date string */
  p10_failure_date: string;
  
  /** Most likely failure date (50th percentile) - ISO date string */
  p50_failure_date: string;
  
  /** Late failure date (90th percentile) - ISO date string */
  p90_failure_date: string;
  
  /** Years remaining until most likely failure */
  years_remaining_p50: number;
  
  /** Confidence score (0-1) based on data quality, NOT system condition */
  confidence_0_1: number;
  
  /** Full provenance for auditability */
  provenance: HVACFailureProvenance;
}

/**
 * Model constants - versioned for reproducibility
 */
export interface HVACFailureConstants {
  model_version: string;
  baseline: {
    /** Median lifespan in years (national average) */
    median_lifespan_years: number;
    /** Standard deviation in years for uncertainty */
    sigma_years: number;
  };
  clamps: {
    /** Minimum total multiplier */
    multiplier_min: number;
    /** Maximum total multiplier */
    multiplier_max: number;
  };
}
