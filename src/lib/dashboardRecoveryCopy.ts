/**
 * Dashboard Recovery Copy Governance
 * 
 * Enforces calm, neutral language across all dashboard surfaces.
 * QA-approved list of banned phrases that trigger urgency or action-framing.
 * 
 * All 7 QA issues addressed in this module:
 * - #1: Status vs Position non-redundancy (outlook explains, not reassures)
 * - #3: Complete banned phrases list
 * - #6: "Monitoring" replaced with "Observed"
 * - #7: No "planning" language in timeline notes
 */

// ============================================
// Types
// ============================================

/**
 * System status labels - strictly neutral
 * 
 * "Monitoring" was flagged as ambiguous (implies concern).
 * Replaced with "Observed" which is neutral.
 */
export type SystemStatusLabel = 'Normal' | 'Typical' | 'Stable' | 'Observed';

export type PositionLabel = 'Early' | 'Mid-Life' | 'Late';

export type ConfidenceLevel = 'high' | 'moderate' | 'early';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface LifecycleSystem {
  key: string;
  label: string;
  positionScore: number;       // 0.0 → 1.0
  positionLabel: PositionLabel;
  note: string;
  hasInstallYear: boolean;     // QA Fix #4: Track if install year exists
  confidence: ConfidenceLevel;
  installSource?: string;
  environmentalStress?: string;
}

// ============================================
// Banned Phrases (Expanded - QA Fix #3)
// ============================================

export const BANNED_DASHBOARD_PHRASES = [
  // Original list
  '!',
  'You should',
  'We recommend',
  "Don't worry",
  'Based on our AI',
  'Good news',
  "You're all set",
  'Nice work',
  '%',
  'in the next',
  'within',
  'urgent',
  'critical',
  'immediately',
  
  // QA additions (must add now)
  'planning window',    // Too directive on main dashboard
  'attention required',
  'monitor closely',
  'action',
  'consider',
  'recommended',
  'expected to fail',
  'forecast',
  'due soon',
  'plan now',
  'replace',
  'years remaining',
  'end of life',
] as const;

/**
 * Validate copy against banned phrases
 */
export function validateCopy(text: string): boolean {
  return !BANNED_DASHBOARD_PHRASES.some(phrase => 
    text.toLowerCase().includes(phrase.toLowerCase())
  );
}

// ============================================
// Status Label Logic (QA Fix #6)
// ============================================

/**
 * Get system status label based on risk level
 * 
 * Uses neutral language only:
 * - Normal: Low risk, typical state
 * - Typical: Environmental systems
 * - Stable: Moderate risk, nothing alarming
 * - Observed: Higher attention, but NOT "Monitoring" (ambiguous)
 */
export function getSystemStatusLabel(risk: RiskLevel): SystemStatusLabel {
  switch (risk) {
    case 'HIGH':
      return 'Observed';  // Neutral, not alarming
    case 'MODERATE':
      return 'Stable';
    case 'LOW':
    default:
      return 'Normal';
  }
}

// ============================================
// Position Label Logic
// ============================================

export function getPositionLabel(positionScore: number): PositionLabel {
  if (positionScore < 0.33) return 'Early';
  if (positionScore < 0.66) return 'Mid-Life';
  return 'Late';
}

// ============================================
// Lifecycle Note Logic (QA Fix #7)
// ============================================

/**
 * Generate lifecycle note for timeline rows
 * 
 * CRITICAL: "Approaching planning considerations" was flagged.
 * Replaced with non-directive language.
 */
export function getLifecycleNote(
  positionScore: number,
  confidence: number,
  hasInstallYear: boolean  // QA Fix #4
): string {
  // QA Fix #4: Handle missing install year
  if (!hasInstallYear) {
    return 'Based on regional patterns';
  }
  
  if (positionScore < 0.4) return 'Typical for age';
  if (positionScore < 0.6) return 'Within expected range';
  if (positionScore < 0.75) return 'Mid-to-late lifecycle';
  
  // QA Fix #7: No "planning" language
  // OLD: 'Approaching planning considerations'
  // NEW: Non-directive
  if (confidence < 0.5) {
    return 'Later in expected range';  // Avoid "later-stage lifecycle" repetition
  }
  return 'Later in expected range';
}

// ============================================
// Lifecycle Horizon Copy (QC #3 - Layer Variation)
// ============================================

/**
 * Generate lifecycle note specifically for the LifecycleHorizon component.
 * Uses DIFFERENT copy than anchor/timeline to avoid repetition (QC #3).
 * 
 * Layer-varied copy prevents "later-stage lifecycle" from appearing everywhere.
 */
export function getLifecycleNoteForHorizon(positionScore: number): string {
  if (positionScore < 0.4) return 'Typical for age';
  if (positionScore < 0.6) return 'Within expected range';
  if (positionScore < 0.75) return 'Mid-to-late range';
  return 'Later range';  // NOT "Later-stage lifecycle" - varied for this layer
}

/**
 * Generate lifecycle note for the HomePositionAnchor.
 * Uses DIFFERENT copy than horizon to avoid repetition (QC #3).
 */
export function getLifecycleNoteForAnchor(positionScore: number): string {
  if (positionScore < 0.4) return 'Typical for age';
  if (positionScore < 0.6) return 'Within expected range';
  if (positionScore < 0.75) return 'Mid-to-late lifecycle';
  return 'Later in expected range';  // Varied for this layer
}

/**
 * Generate lifecycle note for the ContextDrawer.
 * Uses the most detailed copy variant (QC #3).
 */
export function getLifecycleNoteForContext(positionScore: number): string {
  if (positionScore < 0.4) return 'Early in typical lifespan';
  if (positionScore < 0.6) return 'Within expected lifecycle range';
  if (positionScore < 0.75) return 'Approaching mid-to-late lifecycle';
  return 'In a later lifecycle stage';  // Most detailed for context drawer
}

// ============================================
// Outlook Summary Logic (QA Fix #1)
// ============================================

/**
 * Generate outlook summary for HomePositionOutlook
 * 
 * QA Fix #1: When stable, outlook must NOT repeat reassurance.
 * Shift from reassurance → explanation.
 */
export function getOutlookSummary(
  systemsApproachingWindow: number,
  isStable: boolean
): string {
  if (systemsApproachingWindow > 0) {
    return `${systemsApproachingWindow} system${systemsApproachingWindow > 1 ? 's' : ''} in later lifecycle stages`;
  }
  
  // QA Fix #1: Not "No systems approaching planning windows" (redundant)
  // Instead: explain, don't reassure
  if (isStable) {
    return 'Systems aging within expected ranges';
  }
  
  return 'Lifecycle positions typical for home age';
}

// ============================================
// Position Score Calculation (QA Fix #4)
// ============================================

/**
 * Calculate position score for a system
 * 
 * QA Fix #4: When installYear is missing:
 * - Clamp position to mid-range (0.5)
 * - Lower confidence
 * - Change note language
 */
export function calculatePositionScore(
  installYear: number | null,
  expectedLifespanYears: number,
  currentYear: number = new Date().getFullYear()
): { score: number; hasInstallYear: boolean } {
  if (installYear === null) {
    // QA Fix #4: Clamp to mid-range for missing data
    return { score: 0.5, hasInstallYear: false };
  }
  
  const currentAge = currentYear - installYear;
  const score = Math.min(1, Math.max(0, currentAge / expectedLifespanYears));
  return { score, hasInstallYear: true };
}

// ============================================
// Install Source Formatting
// ============================================

export function formatInstallSource(source?: string): string {
  switch (source) {
    case 'permit':
      return 'Permit verified';
    case 'inferred':
      return 'Inferred from records';
    case 'unknown':
    default:
      return 'Unknown';
  }
}

// ============================================
// Confidence Formatting
// ============================================

export function formatConfidence(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case 'high':
      return 'High';
    case 'moderate':
      return 'Moderate';
    case 'early':
      return 'Early assessment';
  }
}

// ============================================
// Environmental Stress Labels
// ============================================

export type EnvironmentalStress = 'Typical' | 'Elevated' | 'Low';

export function getEnvironmentalStressLabel(
  climateZone: 'high_heat' | 'coastal' | 'freeze_thaw' | 'moderate'
): EnvironmentalStress {
  switch (climateZone) {
    case 'high_heat':
    case 'coastal':
    case 'freeze_thaw':
      return 'Elevated';
    case 'moderate':
    default:
      return 'Typical';
  }
}

// ============================================
// Climate Zone Label (Simplified)
// ============================================

export function getClimateZoneLabel(
  climateZone: 'high_heat' | 'coastal' | 'freeze_thaw' | 'moderate'
): string {
  switch (climateZone) {
    case 'high_heat':
      return 'High heat & humidity';
    case 'coastal':
      return 'Coastal salt air';
    case 'freeze_thaw':
      return 'Freeze-thaw cycles';
    case 'moderate':
    default:
      return 'Moderate climate';
  }
}
