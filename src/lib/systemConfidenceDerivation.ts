/**
 * System Confidence Derivation
 * 
 * Separates system-level confidence (for chat mode) from equity confidence (for financial cards).
 * This addresses QC #2: Confidence derivation overloaded.
 * 
 * Key Rule: This is NOT equity confidence. Chat mode uses system confidence.
 */

import type { HomeSystem } from '@/hooks/useHomeSystems';
import { CRITICAL_SYSTEMS, type SystemConfidence, type CriticalSystemKey } from '@/types/chatMode';

/**
 * Derive overall system confidence from home systems.
 * 
 * Logic:
 * 1. Filter to critical systems only (HVAC, roof, water_heater, electrical)
 * 2. For each, compute individual confidence from install_date, manufacture_year, data_sources
 * 3. Average the scores across critical systems
 * 4. Map to bucket: < 0.40 → 'Early', 0.40 - 0.70 → 'Moderate', >= 0.70 → 'High'
 */
export function deriveSystemConfidence(systems: HomeSystem[]): SystemConfidence {
  // Filter to critical systems
  const criticalSystems = systems.filter(sys => 
    isCriticalSystem(sys.system_key)
  );

  // No critical systems = Early confidence
  if (criticalSystems.length === 0) {
    return 'Early';
  }

  // Compute individual confidence scores
  const scores = criticalSystems.map(sys => computeIndividualConfidence(sys));
  
  // Average the scores
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Map to bucket
  if (avgScore < 0.40) return 'Early';
  if (avgScore < 0.70) return 'Moderate';
  return 'High';
}

/**
 * Compute confidence coverage ratio for critical systems.
 * 
 * QC #3 Fix: Requires 50%+ of critical systems to have install data
 * to exit baseline mode.
 */
export function computeCriticalSystemsCoverage(systems: HomeSystem[]): number {
  // Count critical systems with install_date OR manufacture_year
  const coveredCount = systems.filter(sys => 
    isCriticalSystem(sys.system_key) && 
    (sys.install_date || sys.manufacture_year)
  ).length;

  // Divide by total critical systems count
  return coveredCount / CRITICAL_SYSTEMS.length;
}

/**
 * Check if a system is in the critical systems list.
 * Handles prefixed system keys (e.g., 'hvac_carrier_abc123' → 'hvac')
 */
function isCriticalSystem(systemKey: string): boolean {
  const baseKey = systemKey.split('_')[0];
  return CRITICAL_SYSTEMS.includes(baseKey as CriticalSystemKey);
}

/**
 * Compute individual confidence score for a single system.
 * 
 * Factors:
 * - install_date presence: +0.30
 * - manufacture_year presence: +0.25
 * - data_sources containing 'permit': +0.25
 * - data_sources containing 'user' or 'manual': +0.20
 * - confidence_scores.overall if present
 */
function computeIndividualConfidence(system: HomeSystem): number {
  let score = 0.10; // Base score (system exists)

  // Install date gives strong confidence
  if (system.install_date) {
    score += 0.30;
  }

  // Manufacture year gives moderate confidence
  if (system.manufacture_year) {
    score += 0.25;
  }

  // Permit data gives high confidence
  if (system.data_sources?.some(s => s.toLowerCase().includes('permit'))) {
    score += 0.25;
  }

  // User-confirmed data gives moderate confidence
  if (system.data_sources?.some(s => 
    s.toLowerCase().includes('user') || 
    s.toLowerCase().includes('manual') ||
    s.toLowerCase().includes('owner')
  )) {
    score += 0.20;
  }

  // Use stored confidence score if present and higher
  const storedConfidence = system.confidence_scores?.overall;
  if (storedConfidence && storedConfidence > score) {
    score = storedConfidence;
  }

  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * Check if any system was confirmed by user input.
 */
export function hasUserConfirmedSystems(systems: HomeSystem[]): boolean {
  return systems.some(sys => 
    sys.data_sources?.some(s => 
      s.toLowerCase().includes('user') || 
      s.toLowerCase().includes('manual') ||
      s.toLowerCase().includes('owner_reported')
    )
  );
}

/**
 * Find systems with low confidence (< 0.4).
 */
export function findLowConfidenceSystems(systems: HomeSystem[]): string[] {
  return systems
    .filter(sys => {
      const conf = computeIndividualConfidence(sys);
      return conf < 0.4;
    })
    .map(sys => sys.system_key);
}
