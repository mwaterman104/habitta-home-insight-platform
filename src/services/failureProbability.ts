/**
 * Failure Probability Computation
 * 
 * Converts remaining lifespan years to 12-month failure probability.
 * This separation ensures Priority Score uses probability (not years),
 * preventing future drift and keeping math honest.
 * 
 * Model: Exponential decay calibrated to real-world system failure curves
 * - At 0 remaining years: ~0.8 probability (80% chance of failure in next year)
 * - At 5 remaining years: ~0.15 probability
 * - At 10+ remaining years: ~0.05 probability (baseline maintenance failures)
 */

import type { CapitalSystemType } from '@/types/capitalTimeline';

/**
 * System-specific calibration factors
 * 
 * Some systems have steeper failure curves (HVAC) vs gradual (roof)
 * decay_rate: Higher = faster probability increase as lifespan ends
 * min_probability: Baseline failure probability even for new systems
 * max_probability: Cap to prevent overconfidence in failure prediction
 */
const SYSTEM_CALIBRATION: Record<CapitalSystemType, {
  decayRate: number;
  minProbability: number;
  maxProbability: number;
}> = {
  hvac: {
    decayRate: 0.35,        // Faster decay - HVAC fails more predictably at EOL
    minProbability: 0.03,   // 3% baseline even for new systems
    maxProbability: 0.85,   // 85% max - never 100% certain
  },
  roof: {
    decayRate: 0.25,        // Slower decay - roofs degrade gradually
    minProbability: 0.02,   // 2% baseline
    maxProbability: 0.70,   // 70% max - roofs often survive past estimates
  },
  water_heater: {
    decayRate: 0.40,        // Fastest decay - water heaters fail abruptly
    minProbability: 0.03,   // 3% baseline
    maxProbability: 0.90,   // 90% max - very predictable failure at EOL
  },
};

/**
 * Compute 12-month failure probability from remaining years
 * 
 * @param remainingYears - Years until expected replacement (can be negative if past EOL)
 * @param systemType - System type for calibration
 * @returns Probability [0, 1] of failure within next 12 months
 */
export function computeFailureProbability12mo(
  remainingYears: number,
  systemType: CapitalSystemType
): number {
  const calibration = SYSTEM_CALIBRATION[systemType] ?? SYSTEM_CALIBRATION.hvac;
  const { decayRate, minProbability, maxProbability } = calibration;
  
  // Past expected lifespan: high probability
  if (remainingYears <= 0) {
    // Scale up based on how far past EOL
    // At 0 years: maxProbability * 0.9
    // At -5 years: maxProbability
    const pastEolFactor = Math.min(1, 0.9 + (Math.abs(remainingYears) * 0.02));
    return maxProbability * pastEolFactor;
  }
  
  // Very far from EOL: minimum probability
  if (remainingYears >= 10) {
    return minProbability;
  }
  
  // Exponential decay model: P = maxProbability * e^(-decayRate * years)
  // Scaled to ensure smooth transition
  const rawProbability = maxProbability * Math.exp(-decayRate * remainingYears);
  
  // Clamp to valid range
  return Math.max(minProbability, Math.min(maxProbability, rawProbability));
}

/**
 * Get remaining years from system timeline entry
 * 
 * @param likelyReplacementYear - The p50 replacement year
 * @param currentYear - Current year (defaults to now)
 * @returns Remaining years (can be negative if past EOL)
 */
export function getRemainingYears(
  likelyReplacementYear: number | undefined,
  currentYear: number = new Date().getFullYear()
): number | null {
  if (!likelyReplacementYear) return null;
  return likelyReplacementYear - currentYear;
}

/**
 * Get descriptive probability tier for UI display
 */
export function getFailureProbabilityTier(probability: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (probability < 0.10) return 'low';
  if (probability < 0.30) return 'moderate';
  if (probability < 0.60) return 'high';
  return 'critical';
}
