/**
 * Home Outlook Computation Service
 * 
 * Pure function. No side effects. No UI coupling.
 * 
 * Implements: confidence-weighted, system-criticality-adjusted estimate
 * of how much planning time a homeowner has before a major system
 * replacement becomes necessary.
 * 
 * FORMULA:
 *   raw_outlook = Σ(adjusted_remaining_life × criticality_weight) / Σ(criticality_weight)
 *   displayYears = round(max(0, raw_outlook))
 * 
 * GUARDRAILS:
 * - All thresholds are named constants (no magic numbers)
 * - Negative values clamped before rounding
 * - Systems with null age excluded but degrade assessment quality
 * - Ring never turns red (color logic is in LifecycleRing, not here)
 */

import type { SystemTimelineEntry, DataQuality } from '@/types/capitalTimeline';
import {
  HOME_OUTLOOK_COPY,
  MICRO_SUMMARY_SEPARATOR,
} from '@/lib/mobileCopy';

// ============== Named Constants ==============

/** System criticality weights (internal only, never user-facing) */
export const CRITICALITY_WEIGHTS: Record<string, number> = {
  hvac: 1.0,
  roof: 0.9,
  electrical: 0.8,   // Future-safe
  water_heater: 0.6,
  plumbing: 0.6,     // Future-safe
  pool: 0.4,
  solar: 0.4,
  mini_split: 0.3,
};

/** Confidence multipliers — dampens overconfidence, never dominates */
export const CONFIDENCE_MULTIPLIERS: Record<DataQuality, number> = {
  high: 1.0,
  medium: 0.9,
  low: 0.75,
};

/** Assessment quality thresholds (Adjustment 2: explicit constants) */
export const ASSESSMENT_THRESHOLDS = {
  high: 0.8,
  medium: 0.4,
} as const;

/** Minimum weight to be considered a "critical" system */
const CRITICAL_WEIGHT_THRESHOLD = 0.6;

/** Threshold for "inside X years" micro-summary */
const INSIDE_YEARS_THRESHOLD = 5;

/** Threshold for planning-critical tier classification */
export const PLANNING_TIER_THRESHOLD = 0.8;

// ============== Planning Tier ==============

export type SystemPlanningTier = 'planning-critical' | 'routine-replacement';
export type LateLifeState = 'planning-critical-late' | 'routine-late' | 'not-late';

/** Locked code-to-copy mapping for tier labels */
export const PLANNING_TIER_LABELS: Record<SystemPlanningTier, string> = {
  'planning-critical': 'major system',
  'routine-replacement': 'routine replacement',
};

/** Derive planning tier from criticality weight */
export function getSystemPlanningTier(systemId: string): SystemPlanningTier {
  const weight = CRITICALITY_WEIGHTS[systemId] ?? 0.3;
  return weight >= PLANNING_TIER_THRESHOLD ? 'planning-critical' : 'routine-replacement';
}

/** Centralized late-life state helper */
export function getLateLifeState(system: SystemTimelineEntry): LateLifeState {
  const remaining = getRemainingYearsForSystem(system);
  if (remaining === null || remaining > 0) return 'not-late';
  const tier = getSystemPlanningTier(system.systemId);
  return tier === 'planning-critical' ? 'planning-critical-late' : 'routine-late';
}

// ============== Types ==============

export interface HomeOutlookResult {
  displayYears: number;
  rawYears: number;
  assessmentQuality: 'low' | 'medium' | 'high';
  microSummary: string;
  systemsInside5Years: number;
  stableSystemsCount: number;
  eligibleCount: number;
  totalCount: number;
  debug?: {
    systemContributions: SystemContribution[];
  };
}

export interface SystemContribution {
  systemType: string;
  estimatedAge: number | null;
  lifespanMid: number;
  remainingLife: number;
  adjustedRemainingLife: number;
  confidenceMultiplier: number;
  criticalityWeight: number;
  contribution: number;
}

export interface HomeOutlookOptions {
  debug?: boolean;
}

// ============== Core Computation ==============

/**
 * Compute the Home Outlook for a set of systems.
 * 
 * Returns null if no eligible systems exist.
 */
export function computeHomeOutlook(
  systems: SystemTimelineEntry[],
  options?: HomeOutlookOptions
): HomeOutlookResult | null {
  if (!systems || systems.length === 0) return null;

  const currentYear = new Date().getFullYear();
  const contributions: SystemContribution[] = [];

  let weightedSum = 0;
  let weightSum = 0;
  let systemsInside5Years = 0;
  let eligibleCount = 0;

  for (const system of systems) {
    const weight = CRITICALITY_WEIGHTS[system.systemId] ?? 0.3;
    const confidenceMultiplier = CONFIDENCE_MULTIPLIERS[system.dataQuality] ?? CONFIDENCE_MULTIPLIERS.low;

    // Derive age
    const estimatedAge = system.installYear != null
      ? currentYear - system.installYear
      : null;

    // Derive lifespan bounds from replacement window
    const lifespanMin = system.installYear != null && system.replacementWindow
      ? system.replacementWindow.earlyYear - system.installYear
      : null;
    const lifespanMax = system.installYear != null && system.replacementWindow
      ? system.replacementWindow.lateYear - system.installYear
      : null;

    // Skip if missing essential data
    if (estimatedAge === null || lifespanMin === null || lifespanMax === null) {
      if (options?.debug) {
        contributions.push({
          systemType: system.systemId,
          estimatedAge,
          lifespanMid: 0,
          remainingLife: 0,
          adjustedRemainingLife: 0,
          confidenceMultiplier,
          criticalityWeight: weight,
          contribution: 0,
        });
      }
      continue;
    }

    eligibleCount++;

    // Step 1: Lifespan midpoint
    const lifespanMid = (lifespanMin + lifespanMax) / 2;

    // Step 2: Raw remaining life
    const remainingLifeRaw = lifespanMid - estimatedAge;

    // Step 3: Clamp to [0, lifespanMax]
    const remainingLife = Math.max(0, Math.min(remainingLifeRaw, lifespanMax));

    // Step 4: Confidence adjustment
    const adjustedRemainingLife = remainingLife * confidenceMultiplier;

    // Accumulate
    const contribution = adjustedRemainingLife * weight;
    weightedSum += contribution;
    weightSum += weight;

    // Track "inside 5 years"
    if (adjustedRemainingLife <= INSIDE_YEARS_THRESHOLD) {
      systemsInside5Years++;
    }

    if (options?.debug) {
      contributions.push({
        systemType: system.systemId,
        estimatedAge,
        lifespanMid,
        remainingLife,
        adjustedRemainingLife,
        confidenceMultiplier,
        criticalityWeight: weight,
        contribution,
      });
    }
  }

  // No eligible systems
  if (eligibleCount === 0 || weightSum === 0) return null;

  // Adjustment 1: Clamp before rounding
  const rawOutlook = weightedSum / weightSum;
  const rawYears = Math.max(0, rawOutlook);
  const displayYears = Math.round(rawYears);

  // Assessment quality
  const assessmentQuality = computeAssessmentQuality(systems, eligibleCount);

  // Stable systems = eligible minus those inside 5 years
  const stableSystemsCount = eligibleCount - systemsInside5Years;

  // Micro-summary (tier-aware)
  const microSummary = buildMicroSummary(systems);

  return {
    displayYears,
    rawYears,
    assessmentQuality,
    microSummary,
    systemsInside5Years,
    stableSystemsCount,
    eligibleCount,
    totalCount: systems.length,
    ...(options?.debug ? { debug: { systemContributions: contributions } } : {}),
  };
}

// ============== Assessment Quality ==============

function computeAssessmentQuality(
  systems: SystemTimelineEntry[],
  eligibleCount: number
): 'low' | 'medium' | 'high' {
  // Count total critical systems (weight >= 0.6)
  const criticalTypes = Object.entries(CRITICALITY_WEIGHTS)
    .filter(([, w]) => w >= CRITICAL_WEIGHT_THRESHOLD)
    .map(([k]) => k);

  // Count how many critical system types are present AND eligible
  const presentCritical = systems.filter(
    s => criticalTypes.includes(s.systemId) && s.installYear != null
  ).length;

  const totalCritical = criticalTypes.length;
  if (totalCritical === 0) return 'low';

  const ratio = presentCritical / totalCritical;

  if (ratio >= ASSESSMENT_THRESHOLDS.high) return 'high';
  if (ratio >= ASSESSMENT_THRESHOLDS.medium) return 'medium';
  return 'low';
}

// ============== Micro-Summary ==============

function buildMicroSummary(systems: SystemTimelineEntry[]): string {
  let majorInside5 = 0;
  let routineDue = 0;
  let stable = 0;

  for (const system of systems) {
    const remaining = getRemainingYearsForSystem(system);
    if (remaining === null) continue;

    const tier = getSystemPlanningTier(system.systemId);

    if (remaining <= 0) {
      if (tier === 'planning-critical') {
        majorInside5++;
      } else {
        routineDue++;
      }
    } else if (remaining <= INSIDE_YEARS_THRESHOLD) {
      if (tier === 'planning-critical') {
        majorInside5++;
      } else {
        // Routine systems inside 5 yrs but not yet at end-of-life: count as stable
        stable++;
      }
    } else {
      stable++;
    }
  }

  // Stable ordering: major first, routine second, stable third
  const parts: string[] = [];

  if (majorInside5 > 0) {
    parts.push(`${majorInside5} ${PLANNING_TIER_LABELS['planning-critical']}${majorInside5 === 1 ? '' : 's'} inside 5 yrs`);
  }
  if (routineDue > 0) {
    parts.push(`${routineDue} ${PLANNING_TIER_LABELS['routine-replacement']}${routineDue === 1 ? '' : 's'} due`);
  }
  if (stable > 0) {
    parts.push(`${stable} stable`);
  }

  return parts.join(MICRO_SUMMARY_SEPARATOR);
}

// ============== Utility ==============

/**
 * Compute lifecycle percent consumed for a system.
 * Used by LifecycleRing to determine fill and color.
 */
export function getLifecyclePercent(system: SystemTimelineEntry): number {
  if (system.installYear == null || !system.replacementWindow) return 0;

  const currentYear = new Date().getFullYear();
  const age = currentYear - system.installYear;
  const lifespanMin = system.replacementWindow.earlyYear - system.installYear;
  const lifespanMax = system.replacementWindow.lateYear - system.installYear;
  const lifespanMid = (lifespanMin + lifespanMax) / 2;

  if (lifespanMid <= 0) return 100;
  return Math.min(100, Math.max(0, (age / lifespanMid) * 100));
}

/**
 * Get estimated remaining years for a system.
 */
export function getRemainingYearsForSystem(system: SystemTimelineEntry): number | null {
  if (system.installYear == null || !system.replacementWindow) return null;

  const currentYear = new Date().getFullYear();
  const age = currentYear - system.installYear;
  const lifespanMin = system.replacementWindow.earlyYear - system.installYear;
  const lifespanMax = system.replacementWindow.lateYear - system.installYear;
  const lifespanMid = (lifespanMin + lifespanMax) / 2;

  return Math.max(0, Math.round(lifespanMid - age));
}
