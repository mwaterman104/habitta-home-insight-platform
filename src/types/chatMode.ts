/**
 * Chat Mode Type System - V1 Spec Compliant
 * 
 * DOCTRINE: Chat modes represent epistemic readiness, not user intent.
 * User intent can never elevate chat mode on its own.
 * 
 * Mode Priority Order (Critical Fix #1):
 * 1. Elevated Attention (safety exception - but gates behavior by confidence)
 * 2. Baseline Establishment (incomplete confidence blocks advisory)
 * 3. Planning Window Advisory
 * 4. Interpretive (user-triggered, ephemeral)
 * 5. Silent Steward (default)
 */

/**
 * The five chat modes representing epistemic readiness.
 * 
 * silent_steward: Default - All systems stable, waits for user
 * baseline_establishment: New user or data gaps
 * interpretive: User asks "why/how" (ephemeral, auto-returns)
 * planning_window_advisory: System aging, preparation focus
 * elevated_attention: Deviation detected, more directive
 */
export type ChatMode = 
  | 'silent_steward'
  | 'baseline_establishment'
  | 'interpretive'
  | 'planning_window_advisory'
  | 'elevated_attention';

/**
 * DEPRECATED: Legacy mode aliases for backwards compatibility
 * New code should use the V1 mode names directly
 */
export type LegacyChatMode = 
  | 'baseline_establishment'  // Maps to baseline_establishment
  | 'observational'           // Maps to silent_steward or interpretive
  | 'advisory'                // Maps to planning_window_advisory
  | 'strategic';              // Not used in V1

/**
 * Map legacy mode to V1 mode (for migration)
 */
export function mapLegacyMode(legacy: LegacyChatMode): ChatMode {
  switch (legacy) {
    case 'baseline_establishment':
      return 'baseline_establishment';
    case 'observational':
      return 'silent_steward';
    case 'advisory':
      return 'planning_window_advisory';
    case 'strategic':
      return 'planning_window_advisory'; // Strategic collapsed into planning
    default:
      return 'silent_steward';
  }
}

/**
 * System State - Each system must be in exactly one state.
 * No compound states. No "Stable but..." language.
 * 
 * DOCTRINE:
 * - Elevated requires deviation, not just time
 * - Data Gap requires confidence below threshold
 * - Planning Window is time-based (no deviation)
 * - Stable is the default healthy state
 */
export type SystemState = 
  | 'stable'           // Within expected range
  | 'planning_window'  // Aging curve intersects threshold (time-based)
  | 'elevated'         // Deviation detected (NOT just time)
  | 'data_gap';        // Confidence below threshold

/**
 * Confidence levels for system data.
 * Used for chat mode determination.
 */
export type SystemConfidence = 'Early' | 'Moderate' | 'High';

/**
 * Critical systems that must be tracked for baseline coverage.
 * Requires 50%+ coverage to exit baseline mode.
 */
export const CRITICAL_SYSTEMS = ['hvac', 'roof', 'water_heater', 'electrical'] as const;

export type CriticalSystemKey = typeof CRITICAL_SYSTEMS[number];

/**
 * Context passed to chat mode selector and components.
 */
export interface ChatModeContext {
  /** Current chat mode */
  mode: ChatMode;
  
  /** System-level confidence (separate from equity confidence) */
  systemConfidence: SystemConfidence;
  
  /** Whether permit data was found */
  permitsFound: boolean;
  
  /** Ratio of critical systems with known install dates (0.0 → 1.0) */
  criticalSystemsCoverage: number;
  
  /** Whether any system was confirmed by user input */
  userConfirmedSystems: boolean;
  
  /** System keys with low confidence (< 0.4) */
  systemsWithLowConfidence: string[];
  
  /** Previous mode for interpretive return (Subtle Risk #1) */
  previousMode?: ChatMode;
  
  /** Whether baseline is complete (gates advisory modes) */
  isBaselineComplete: boolean;
}

/**
 * Input context for mode selector function.
 */
export interface ChatModeInput {
  systemConfidence: SystemConfidence;
  permitsFound: boolean;
  criticalSystemsCoverage: number;
  userConfirmedSystems: boolean;
  /** System states for elevated/planning detection */
  systems?: SystemModeInput[];
}

/**
 * System input for mode derivation
 */
export interface SystemModeInput {
  key: string;
  state: SystemState;
  months_remaining?: number;
  deviation_detected: boolean;
  anomaly_flags?: string[];
  confidence: number;
}
