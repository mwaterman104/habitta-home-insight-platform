/**
 * Chat Mode Type System
 * 
 * DOCTRINE: Chat modes represent epistemic readiness, not user intent.
 * User intent can never elevate chat mode on its own.
 * 
 * Modes control:
 * - Opening message
 * - Suggested prompts
 * - Allowed behaviors
 * - Escalation paths
 */

/**
 * The four chat modes representing epistemic readiness.
 * 
 * baseline_establishment: Confidence = Early, insufficient install data
 * observational: Moderate confidence, partial data
 * advisory: High confidence OR user confirmed systems
 * strategic: User-initiated AND already in advisory mode
 */
export type ChatMode = 
  | 'baseline_establishment'
  | 'observational'
  | 'advisory'
  | 'strategic';

/**
 * Confidence levels for system data (separate from equity confidence).
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
  
  /** Previous mode for strategic transition validation (QC #1) */
  previousMode?: ChatMode;
}

/**
 * Input context for mode selector function.
 */
export interface ChatModeInput {
  systemConfidence: SystemConfidence;
  permitsFound: boolean;
  criticalSystemsCoverage: number;
  userConfirmedSystems: boolean;
}
