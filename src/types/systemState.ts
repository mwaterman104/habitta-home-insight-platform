/**
 * System State Model
 * 
 * DOCTRINE: 
 * - Elevated requires deviation, not just time
 * - Each system is in exactly one state
 * - No compound states ("Stable but...")
 * 
 * Critical Fix #2: Elevated requires deviation_detected, not just months < 12
 */

import type { SystemPrediction, LifespanPrediction } from './systemPrediction';

/**
 * Explicit system state - each system is in exactly one
 * 
 * SEMANTIC NOTE: "baseline_incomplete" is a phase, not a failure.
 * It means "Establishing baseline" — not "data gap" or "broken".
 */
export type SystemState = 
  | 'stable'               // Within expected range
  | 'planning_window'      // Aging curve intersects threshold (time-based only)
  | 'elevated'             // Deviation detected (NOT just time)
  | 'baseline_incomplete'; // Confidence below threshold (phase, not failure)

/**
 * System State Model - Complete state for a single system
 */
export interface SystemStateModel {
  /** System key (e.g., 'hvac', 'roof') */
  key: string;
  
  /** Display name (e.g., 'HVAC', 'Roof') */
  displayName: string;
  
  /** Current state - exactly one of the four */
  state: SystemState;
  
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  
  /** Months remaining until planning window */
  monthsRemaining?: number;
  
  /**
   * Critical Fix #2: Deviation detection for Elevated state
   * True only when actual deviation observed, not just aging
   */
  deviation_detected: boolean;
  
  /**
   * Specific anomaly flags that triggered deviation
   * e.g., ['unusual_runtime', 'efficiency_drop', 'unexpected_noise']
   */
  anomaly_flags?: string[];
  
  /** When state last changed */
  lastStateChange?: Date;
}

// ============================================
// Thresholds
// ============================================

/** Months remaining threshold for Planning Window state */
export const PLANNING_MONTHS = 36;    // <3 years

/** Months remaining threshold for Elevated state (requires deviation) */
export const ELEVATED_MONTHS = 12;    // <1 year AND deviation

/** Confidence threshold for Baseline Incomplete state */
export const BASELINE_INCOMPLETE_CONFIDENCE = 0.4;

// ============================================
// State Derivation
// ============================================

/**
 * Derive system state from prediction data
 * 
 * Critical Fix #2: Elevated requires deviation, not just time
 * 
 * Priority:
 * 1. Data Gap: Confidence too low
 * 2. Elevated: Deviation detected OR (time < threshold AND anomaly present)
 * 3. Planning Window: Time-based only (no deviation)
 * 4. Stable: Default
 */
export function deriveSystemState(
  prediction: SystemPrediction,
  displayName?: string
): SystemStateModel {
  const months = prediction.lifespan?.years_remaining_p50 
    ? prediction.lifespan.years_remaining_p50 * 12 
    : undefined;
  const confidence = prediction.lifespan?.confidence_0_1 ?? 0.5;
  
  // Extract deviation signals from prediction
  const deviation_detected = prediction.deviation_detected ?? false;
  const anomaly_flags = prediction.anomaly_flags ?? [];
  
  const baseModel: Omit<SystemStateModel, 'state'> = {
    key: prediction.systemKey,
    displayName: displayName ?? prediction.header?.name ?? prediction.systemKey,
    confidence,
    monthsRemaining: months,
    deviation_detected,
    anomaly_flags,
  };
  
  // Priority 1: Baseline Incomplete - Confidence too low
  if (confidence < BASELINE_INCOMPLETE_CONFIDENCE) {
    return { 
      ...baseModel,
      state: 'baseline_incomplete',
      deviation_detected: false,
      anomaly_flags: [],
    };
  }
  
  // Priority 2: Elevated - Deviation detected OR (time < threshold AND anomaly present)
  // Critical Fix #2: NOT just time
  if (deviation_detected || 
      (months !== undefined && months < ELEVATED_MONTHS && anomaly_flags.length > 0)) {
    return { 
      ...baseModel,
      state: 'elevated',
      deviation_detected: true,
    };
  }
  
  // Priority 3: Planning Window - Time-based only (no deviation)
  if (months !== undefined && months < PLANNING_MONTHS) {
    return { 
      ...baseModel,
      state: 'planning_window',
    };
  }
  
  // Priority 4: Stable - Default
  return { 
    ...baseModel,
    state: 'stable',
  };
}

/**
 * Get state label for display
 * Uses neutral language per doctrine
 */
export function getStateLabel(state: SystemState): string {
  switch (state) {
    case 'stable':
      return 'Stable';
    case 'planning_window':
      return 'Planning Window';
    case 'elevated':
      return 'Elevated';
    case 'baseline_incomplete':
      return 'Establishing baseline';
  }
}

/**
 * Check if any system has elevated deviation
 */
export function hasElevatedDeviation(systems: SystemStateModel[]): boolean {
  return systems.some(s => 
    s.deviation_detected === true || 
    (s.monthsRemaining !== undefined && 
     s.monthsRemaining < ELEVATED_MONTHS && 
     s.anomaly_flags && s.anomaly_flags.length > 0)
  );
}

/**
 * Check if any system is in planning window
 */
export function hasPlanningWindow(systems: SystemStateModel[]): boolean {
  return systems.some(s => 
    s.state === 'planning_window' || 
    (s.monthsRemaining !== undefined && s.monthsRemaining < PLANNING_MONTHS)
  );
}

/**
 * Check if any system has baseline incomplete state
 */
export function hasBaselineIncomplete(systems: SystemStateModel[]): boolean {
  return systems.some(s => s.state === 'baseline_incomplete' || s.confidence < BASELINE_INCOMPLETE_CONFIDENCE);
}
