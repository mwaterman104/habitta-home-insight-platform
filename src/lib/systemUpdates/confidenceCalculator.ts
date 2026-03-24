import type { FieldProvenance } from './authority';

/**
 * Field weights for confidence calculation.
 * These weights determine the contribution of each field to overall system confidence.
 */
export const FIELD_WEIGHTS: Record<string, number> = {
  brand: 0.25,
  model: 0.25,
  manufacture_year: 0.20,
  serial: 0.15,
  capacity_rating: 0.10,
  fuel_type: 0.05,
};

/**
 * Minimum confidence delta required to trigger mode recompute.
 * Medium #4 Fix: Prevents trivial updates from inflating confidence.
 */
export const MINIMUM_MEANINGFUL_DELTA = 0.05;

/**
 * Calculate system confidence score from field provenance.
 * Each field contributes its weight multiplied by its individual confidence.
 */
export function calculateSystemConfidence(
  provenance: Record<string, FieldProvenance>
): number {
  let score = 0;

  Object.entries(FIELD_WEIGHTS).forEach(([field, weight]) => {
    const fieldProv = provenance[field];
    if (fieldProv) {
      score += weight * fieldProv.confidence;
    }
  });

  return Math.min(1, Number(score.toFixed(2)));
}

/**
 * Check if confidence delta is meaningful enough to trigger mode recompute.
 * Medium #4 Fix: Only trigger mode transition for substantial changes.
 */
export function isMeaningfulDelta(delta: number): boolean {
  return Math.abs(delta) >= MINIMUM_MEANINGFUL_DELTA;
}
