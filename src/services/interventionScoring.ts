/**
 * INTERVENTION SCORING SERVICE
 * 
 * FROZEN FORMULA (Do Not Modify):
 * InterventionScore = (FailureProbability × EmergencyCost) + UrgencyPremium
 * 
 * Rules:
 * ❌ NO engagement multipliers
 * ❌ NO "user anxiety" signals
 * ❌ NO normalization away from dollars
 * ✅ Dollar-denominated logic only
 * ✅ Must remain explainable and auditable
 */

import type { RiskContext } from '@/types/riskContext';

export interface InterventionScoreInputs {
  /** Failure probability in next 12 months (0.0 - 1.0) */
  failureProbability12mo: number;
  /** Cost of proactive replacement in dollars */
  proactiveCost: number;
  /** Cost of emergency replacement in dollars (includes labor premium) */
  emergencyCost: number;
  /** Potential collateral damage in dollars */
  potentialDamage: number;
  /** Urgency premium calculated from context */
  urgencyPremium: number;
}

export interface InterventionScoreResult {
  score: number;
  breakdown: {
    baseRisk: number;
    urgencyPremium: number;
  };
}

/**
 * FROZEN: Calculate intervention score
 * 
 * InterventionScore = (FailureProbability × EmergencyCost) + UrgencyPremium
 */
export function calculateInterventionScore(
  inputs: InterventionScoreInputs
): InterventionScoreResult {
  const { failureProbability12mo, emergencyCost, urgencyPremium } = inputs;
  
  // Validate inputs
  const clampedProbability = Math.max(0, Math.min(1, failureProbability12mo));
  const clampedEmergencyCost = Math.max(0, emergencyCost);
  const clampedUrgencyPremium = Math.max(0, urgencyPremium);
  
  // FROZEN FORMULA
  const baseRisk = clampedProbability * clampedEmergencyCost;
  const score = baseRisk + clampedUrgencyPremium;
  
  return {
    score: Math.round(score * 100) / 100, // Round to cents
    breakdown: {
      baseRisk: Math.round(baseRisk * 100) / 100,
      urgencyPremium: clampedUrgencyPremium,
    },
  };
}

/**
 * Check if a system is in contractor peak season
 */
export function isContractorPeakSeason(
  context: RiskContext,
  systemType: string
): boolean {
  if (systemType === 'hvac' && context.peakSeasonHvac) {
    return true;
  }
  if (systemType === 'roof' && context.peakSeasonRoofing) {
    return true;
  }
  return false;
}

/**
 * Calculate urgency premium based on environmental and market conditions
 * 
 * This is DERIVED at calculation time, never stored directly.
 * The result is SNAPSHOTTED when an intervention is created.
 */
export function calculateUrgencyPremium(
  systemType: string,
  context: RiskContext
): { premium: number; factors: Record<string, boolean> } {
  let premium = 0;
  const factors: Record<string, boolean> = {
    hurricaneSeason: false,
    freezeWarning: false,
    heatWave: false,
    peakSeason: false,
  };

  // Hurricane season risk (+$2000 for roofs)
  if (context.hurricaneSeason && systemType === 'roof') {
    premium += 2000;
    factors.hurricaneSeason = true;
  }

  // Freeze warning risk (+$1500 for water heater/hvac)
  if (context.freezeWarning && 
      (systemType === 'water_heater' || systemType === 'hvac')) {
    premium += 1500;
    factors.freezeWarning = true;
  }

  // Heat wave risk (+$1200 for HVAC)
  if (context.heatWave && systemType === 'hvac') {
    premium += 1200;
    factors.heatWave = true;
  }

  // Peak season contractor availability (+$500)
  if (isContractorPeakSeason(context, systemType)) {
    premium += 500;
    factors.peakSeason = true;
  }

  return { premium, factors };
}

/**
 * Convert risk_outlook_12mo (0-100) to failure probability (0-1)
 */
export function riskOutlookToFailureProbability(riskOutlook: number): number {
  // Risk outlook of 100 = 100% chance of failure
  // Risk outlook of 0 = 0% chance of failure
  return Math.max(0, Math.min(100, riskOutlook)) / 100;
}

/**
 * Determine if an intervention should be triggered
 */
export function shouldTriggerIntervention(
  score: number,
  threshold: number
): boolean {
  return score >= threshold;
}

/**
 * Calculate complete intervention eligibility
 */
export interface InterventionEligibilityResult {
  eligible: boolean;
  score: number;
  threshold: number;
  breakdown: {
    baseRisk: number;
    urgencyPremium: number;
  };
  urgencyFactors: Record<string, boolean>;
}

export function calculateInterventionEligibility(
  riskOutlook12mo: number,
  emergencyCost: number,
  proactiveCost: number,
  potentialDamage: number,
  systemType: string,
  context: RiskContext,
  homeThreshold: number
): InterventionEligibilityResult {
  // Calculate urgency premium
  const { premium, factors } = calculateUrgencyPremium(systemType, context);
  
  // Calculate intervention score
  const result = calculateInterventionScore({
    failureProbability12mo: riskOutlookToFailureProbability(riskOutlook12mo),
    proactiveCost,
    emergencyCost,
    potentialDamage,
    urgencyPremium: premium,
  });
  
  return {
    eligible: shouldTriggerIntervention(result.score, homeThreshold),
    score: result.score,
    threshold: homeThreshold,
    breakdown: result.breakdown,
    urgencyFactors: factors,
  };
}
