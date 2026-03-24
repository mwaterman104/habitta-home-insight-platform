/**
 * Confidence Rules - Explicit, Deterministic
 * 
 * DOCTRINE: Confidence may only change through these explicit paths.
 * No background magic. No implicit derivation.
 * 
 * Critical Fix #3: Define exactly what changes confidence.
 */

export type ConfidenceChangeReason = 
  | 'user_provided_data'
  | 'user_photo_analysis'
  | 'user_manual_confirmation'
  | 'permit_verification'
  | 'system_state_confirmed'
  | 'quarterly_stable_confirmation'
  | 'external_data_match'
  | 'time_decay'
  | 'data_gap_persists'
  | 'contradictory_signal'
  | 'no_confirmation_decay';

export interface ConfidenceChange {
  reason: ConfidenceChangeReason;
  direction: 'increase' | 'decrease' | 'unchanged';
  delta: number;
  timestamp: string;
  systemKey?: string;
}

/**
 * CONFIDENCE INCREASE RULES (Explicit)
 * 
 * Confidence increases only when:
 * 1. User confirms system details (photo, manual entry)
 * 2. System state remains stable over time (confirmation via no-change)
 * 3. External data corroborates prediction (permit matches estimate)
 */
export const CONFIDENCE_INCREASE_TRIGGERS: Record<string, number> = {
  /** User uploads a photo that is analyzed */
  user_photo_analysis: 0.15,
  
  /** User manually confirms system details */
  user_manual_confirmation: 0.20,
  
  /** Permit data verifies system install */
  permit_verification: 0.25,
  
  /** Quarterly check-in confirms no change */
  quarterly_stable_confirmation: 0.01,
  
  /** External data matches prediction */
  external_data_match: 0.10,
};

/**
 * CONFIDENCE DECREASE RULES (Explicit)
 * 
 * Confidence decays when:
 * 1. Data gaps persist beyond threshold
 * 2. Contradictory signals appear (photo ≠ permit)
 * 3. Time passes without confirmation (slow decay)
 */
export const CONFIDENCE_DECREASE_TRIGGERS: Record<string, number> = {
  /** Data gap persists for 30 days */
  data_gap_persists_30d: -0.05,
  
  /** Contradictory signal detected (photo ≠ permit) */
  contradictory_signal: -0.10,
  
  /** No confirmation for 90 days */
  no_confirmation_90d: -0.02,
};

/**
 * Apply confidence change with explicit logging
 */
export function applyConfidenceChange(
  currentConfidence: number,
  reason: ConfidenceChangeReason,
  delta: number,
  systemKey?: string
): { newConfidence: number; change: ConfidenceChange } {
  const newConfidence = Math.max(0, Math.min(1, currentConfidence + delta));
  
  return {
    newConfidence,
    change: {
      reason,
      direction: delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'unchanged',
      delta,
      timestamp: new Date().toISOString(),
      systemKey,
    },
  };
}

/**
 * Check if confidence should decay based on time since last confirmation
 */
export function shouldDecayConfidence(
  lastConfirmationDate: Date | null,
  now: Date = new Date()
): { shouldDecay: boolean; reason?: string; delta?: number } {
  if (!lastConfirmationDate) {
    return { shouldDecay: false };
  }
  
  const daysSinceConfirmation = Math.floor(
    (now.getTime() - lastConfirmationDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceConfirmation >= 90) {
    return {
      shouldDecay: true,
      reason: 'no_confirmation_90d',
      delta: CONFIDENCE_DECREASE_TRIGGERS.no_confirmation_90d,
    };
  }
  
  return { shouldDecay: false };
}

/**
 * Check if data gap has persisted too long
 */
export function shouldDecayForDataGap(
  dataGapStartDate: Date | null,
  now: Date = new Date()
): { shouldDecay: boolean; reason?: string; delta?: number } {
  if (!dataGapStartDate) {
    return { shouldDecay: false };
  }
  
  const daysSinceGap = Math.floor(
    (now.getTime() - dataGapStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceGap >= 30) {
    return {
      shouldDecay: true,
      reason: 'data_gap_persists_30d',
      delta: CONFIDENCE_DECREASE_TRIGGERS.data_gap_persists_30d,
    };
  }
  
  return { shouldDecay: false };
}

/**
 * Get the confidence delta for a given trigger
 */
export function getConfidenceDelta(trigger: string): number {
  return (
    CONFIDENCE_INCREASE_TRIGGERS[trigger] ?? 
    CONFIDENCE_DECREASE_TRIGGERS[trigger] ?? 
    0
  );
}
