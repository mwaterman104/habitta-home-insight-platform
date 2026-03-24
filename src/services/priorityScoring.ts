/**
 * Priority Scoring Service
 * 
 * Implements the frozen formula:
 * PriorityScore = FailureProbability12mo × ReplacementCostMidpoint × UrgencyMultiplier
 * 
 * DESIGN INVARIANTS:
 * - Formula is FROZEN - no ad-hoc adjustments
 * - Uses pre-computed failure probability (not remaining years)
 * - Tie-breaking is deterministic to prevent UI flicker
 * - Produces plain-language explanation for transparency
 */

import type { CapitalSystemType, SystemTimelineEntry } from '@/types/capitalTimeline';
import { computeFailureProbability12mo, getRemainingYears } from './failureProbability';

// ============== Types ==============

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type ClimateRisk = 'hurricane_zone' | 'freeze_zone' | 'temperate';

export interface PriorityScoreInputs {
  systemKey: CapitalSystemType;
  failureProbability12mo: number;
  replacementCostMid: number;
  season: Season;
  climateRisk?: ClimateRisk;
}

export interface PriorityScoreResult {
  score: number;
  urgencyMultiplier: number;
  explanation: string;
}

export interface ScoredSystem {
  system: SystemTimelineEntry;
  score: number;
  urgencyMultiplier: number;
  failureProbability: number;
  explanation: string;
}

// ============== Constants (FROZEN) ==============

/**
 * Urgency multipliers by system type and condition
 * 
 * HVAC: +25% during peak seasons (summer/winter)
 * Roof: +35% in hurricane zones (weather risk)
 * Others: 1.0 baseline
 */
const URGENCY_MULTIPLIERS: Record<CapitalSystemType, {
  seasonal?: Partial<Record<Season, number>>;
  climate?: Partial<Record<ClimateRisk, number>>;
}> = {
  hvac: {
    seasonal: {
      summer: 1.25,
      winter: 1.25,
      spring: 1.0,
      fall: 1.0,
    },
  },
  roof: {
    climate: {
      hurricane_zone: 1.35,
      temperate: 1.0,
      freeze_zone: 1.15,
    },
  },
  water_heater: {
    // No seasonal/climate multipliers - always urgent when failing
  },
};

/**
 * Base replacement cost midpoints by system type
 * Source: SYSTEM_CONFIGS in edge functions
 */
const REPLACEMENT_COST_MIDPOINTS: Record<CapitalSystemType, number> = {
  hvac: 9000,           // (6000 + 12000) / 2
  roof: 16500,          // (8000 + 25000) / 2
  water_heater: 2350,   // (1200 + 3500) / 2
};

// ============== Core Functions ==============

/**
 * Calculate priority score for a single system
 * 
 * Formula: FailureProbability12mo × ReplacementCostMid × UrgencyMultiplier
 */
export function calculatePriorityScore(inputs: PriorityScoreInputs): PriorityScoreResult {
  const { systemKey, failureProbability12mo, replacementCostMid, season, climateRisk } = inputs;
  
  // Get urgency multiplier
  const urgencyMultiplier = getUrgencyMultiplier(systemKey, season, climateRisk);
  
  // Calculate raw score
  const score = failureProbability12mo * replacementCostMid * urgencyMultiplier;
  
  // Generate explanation
  const explanation = generateExplanation(
    systemKey,
    failureProbability12mo,
    urgencyMultiplier,
    season
  );
  
  return {
    score,
    urgencyMultiplier,
    explanation,
  };
}

/**
 * Get urgency multiplier based on system type, season, and climate
 */
function getUrgencyMultiplier(
  systemKey: CapitalSystemType,
  season: Season,
  climateRisk?: ClimateRisk
): number {
  const config = URGENCY_MULTIPLIERS[systemKey];
  if (!config) return 1.0;
  
  // Check seasonal multiplier first (for HVAC)
  if (config.seasonal && config.seasonal[season]) {
    return config.seasonal[season]!;
  }
  
  // Check climate multiplier (for roof)
  if (config.climate && climateRisk && config.climate[climateRisk]) {
    return config.climate[climateRisk]!;
  }
  
  return 1.0;
}

/**
 * Generate plain-language explanation for the priority
 */
function generateExplanation(
  systemKey: CapitalSystemType,
  failureProbability: number,
  urgencyMultiplier: number,
  season: Season
): string {
  const systemNames: Record<CapitalSystemType, string> = {
    hvac: 'HVAC',
    roof: 'roof',
    water_heater: 'water heater',
  };
  
  const systemName = systemNames[systemKey];
  
  // High probability explanation
  if (failureProbability >= 0.5) {
    return `Your ${systemName} is in its typical replacement window.`;
  }
  
  // Moderate probability with seasonal urgency
  if (failureProbability >= 0.2 && urgencyMultiplier > 1.0) {
    const seasonNote = systemKey === 'hvac' 
      ? `${season} is a high-demand season` 
      : 'weather conditions increase urgency';
    return `Your ${systemName} is approaching replacement age, and ${seasonNote}.`;
  }
  
  // Moderate probability
  if (failureProbability >= 0.2) {
    return `Your ${systemName} is approaching typical replacement age.`;
  }
  
  // Low probability but still primary
  return `Your ${systemName} is worth monitoring as the next system to plan for.`;
}

// ============== System Selection ==============

/**
 * Get current season based on date
 */
export function getCurrentSeason(date: Date = new Date()): Season {
  const month = date.getMonth(); // 0-11
  
  if (month >= 2 && month <= 4) return 'spring';   // Mar-May
  if (month >= 5 && month <= 7) return 'summer';   // Jun-Aug
  if (month >= 8 && month <= 10) return 'fall';    // Sep-Nov
  return 'winter';                                   // Dec-Feb
}

/**
 * Get replacement cost midpoint for a system
 */
export function getReplacementCostMidpoint(systemKey: CapitalSystemType): number {
  return REPLACEMENT_COST_MIDPOINTS[systemKey] ?? 5000;
}

/**
 * Score all systems and select primary focus
 * 
 * Tie-Breaking Order (deterministic):
 * 1. Higher score
 * 2. Higher replacement cost
 * 3. Higher failure probability
 * 4. Alphabetical systemId (fallback)
 */
export function selectPrimarySystem(
  systems: SystemTimelineEntry[],
  climateRisk?: ClimateRisk
): { primary: ScoredSystem | null; scored: ScoredSystem[] } {
  if (!systems || systems.length === 0) {
    return { primary: null, scored: [] };
  }
  
  const currentYear = new Date().getFullYear();
  const season = getCurrentSeason();
  
  // Score each system
  const scored: ScoredSystem[] = systems.map(system => {
    const remainingYears = getRemainingYears(
      system.replacementWindow?.likelyYear,
      currentYear
    );
    
    const failureProbability = remainingYears !== null
      ? computeFailureProbability12mo(remainingYears, system.systemId)
      : 0.1; // Default for unknown systems
    
    const replacementCostMid = getReplacementCostMidpoint(system.systemId);
    
    const result = calculatePriorityScore({
      systemKey: system.systemId,
      failureProbability12mo: failureProbability,
      replacementCostMid,
      season,
      climateRisk,
    });
    
    return {
      system,
      score: result.score,
      urgencyMultiplier: result.urgencyMultiplier,
      failureProbability,
      explanation: result.explanation,
    };
  });
  
  // Sort with deterministic tie-breaking
  scored.sort((a, b) => {
    // 1. Higher score first
    if (b.score !== a.score) return b.score - a.score;
    
    // 2. Higher replacement cost
    const aCost = getReplacementCostMidpoint(a.system.systemId);
    const bCost = getReplacementCostMidpoint(b.system.systemId);
    if (bCost !== aCost) return bCost - aCost;
    
    // 3. Higher failure probability
    if (b.failureProbability !== a.failureProbability) {
      return b.failureProbability - a.failureProbability;
    }
    
    // 4. Alphabetical fallback (deterministic)
    return a.system.systemId.localeCompare(b.system.systemId);
  });
  
  return {
    primary: scored[0] ?? null,
    scored,
  };
}
