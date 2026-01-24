/**
 * Onboarding Helpers
 * 
 * Utilities for the handshake onboarding flow:
 * - Climate-based system priority
 * - Confidence/source display helpers
 * - Baseline strength labels
 */

import { ClimateZoneType } from './climateZone';

// ============================================================================
// Types
// ============================================================================

export interface SystemConfig {
  key: 'hvac' | 'roof' | 'water_heater';
  label: string;
}

/**
 * Confidence level (how sure we are)
 * Separate from source (where the data came from)
 */
export type ConfidenceDisplay = 'High confidence' | 'Moderate confidence' | 'Estimated' | 'Confirmed';

/**
 * Data source (where the data came from)
 */
export type SourceDisplay = 'Permit' | 'Owner-reported' | 'Inferred' | 'Deterministic';

export interface SystemConfidenceInfo {
  confidence: ConfidenceDisplay;
  source: SourceDisplay;
}

// ============================================================================
// Climate-Based System Priority (Risk 4 Fix)
// ============================================================================

/**
 * Get system priority order based on climate zone
 * 
 * Rationale:
 * - High heat: HVAC first (highest stress)
 * - Coastal: HVAC first (salt air exposure)
 * - Freeze-thaw: Roof first (ice damage risk)
 * - Moderate: Standard order
 * 
 * This makes future expansion explicit and prevents drift.
 */
export function getSystemPriorityByClimate(zone: ClimateZoneType): SystemConfig[] {
  switch (zone) {
    case 'high_heat':
    case 'coastal':
      return [
        { key: 'hvac', label: 'HVAC' },
        { key: 'roof', label: 'Roof' },
        { key: 'water_heater', label: 'Water Heater' },
      ];
    case 'freeze_thaw':
      return [
        { key: 'roof', label: 'Roof' },
        { key: 'hvac', label: 'HVAC' },
        { key: 'water_heater', label: 'Water Heater' },
      ];
    case 'moderate':
    default:
      return [
        { key: 'hvac', label: 'HVAC' },
        { key: 'roof', label: 'Roof' },
        { key: 'water_heater', label: 'Water Heater' },
      ];
  }
}

// ============================================================================
// Confidence Display Helpers (Risk 3 Fix)
// ============================================================================

/**
 * Derive display confidence and source from install source
 * 
 * Keeps confidence (how sure) and source (where from) as separate concepts.
 * This prevents the taxonomy gap where "Owner-reported" was conflated with confidence.
 */
export function getSystemConfidenceInfo(
  installSource: string | null,
  hasPermit: boolean = false
): SystemConfidenceInfo {
  if (hasPermit || installSource === 'permit' || installSource === 'permit_verified') {
    return { confidence: 'High confidence', source: 'Permit' };
  }
  
  if (installSource === 'user' || installSource === 'owner_reported') {
    return { confidence: 'Moderate confidence', source: 'Owner-reported' };
  }
  
  // Inferred/heuristic
  return { confidence: 'Estimated', source: 'Inferred' };
}

/**
 * Get climate confidence (always deterministic from location data)
 */
export function getClimateConfidenceInfo(): SystemConfidenceInfo {
  return { confidence: 'Confirmed', source: 'Deterministic' };
}

/**
 * Get roof confidence display based on available data
 */
export function getRoofConfidenceDisplay(hasPermit: boolean): ConfidenceDisplay {
  return hasPermit ? 'High confidence' : 'Estimated';
}

/**
 * Get cooling confidence display based on available data
 */
export function getCoolingConfidenceDisplay(hasPermit: boolean): ConfidenceDisplay {
  return hasPermit ? 'High confidence' : 'Estimated';
}

// ============================================================================
// Baseline Strength Helpers
// ============================================================================

/**
 * Get baseline strength label from confidence score
 * 
 * Reframes raw percentage as human-readable progress indicator.
 * "35%" reads as weakness; "Early baseline established" reads as progress.
 */
export function getBaselineStrengthLabel(confidence: number): string {
  if (confidence >= 70) return 'Strong baseline';
  if (confidence >= 50) return 'Moderate baseline';
  return 'Early baseline established';
}

/**
 * Check if snapshot is "thin" (enrichment may have failed)
 * 
 * Risk 5 mitigation: Show defensive UI when data is sparse.
 */
export function isSnapshotThin(confidence: number, hasYearBuilt: boolean): boolean {
  return confidence < 35 && !hasYearBuilt;
}

/**
 * Get the summary text for baseline strength section
 */
export function getBaselineSummaryText(isEnriching: boolean): string {
  if (isEnriching) {
    return 'Finding more data...';
  }
  return 'We refine this over time — with or without input.';
}
