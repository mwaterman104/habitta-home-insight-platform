/**
 * Canonical System Confidence Module
 * 
 * Single source of truth for:
 * - Confidence scoring
 * - Install line formatting
 * - Confidence level derivation
 * 
 * Used by both server (edge functions) and client (UI).
 */

// =============================================================================
// TYPES
// =============================================================================

export type InstallSource = 'heuristic' | 'owner_reported' | 'inspection' | 'permit_verified';
export type ReplacementStatus = 'original' | 'replaced' | 'unknown';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ConfidenceInput {
  installSource: InstallSource;
  hasMonth?: boolean;
  hasCorroboration?: boolean;
  hasBrand?: boolean;
  hasModel?: boolean;
  hasPhoto?: boolean;
  hasConflictingDates?: boolean;
  hasImplausibleDate?: boolean;
}

export interface ConfidenceResult {
  score: number;
  level: ConfidenceLevel;
  breakdown: {
    base: number;
    modifiers: number;
    penalties: number;
    final: number;
  };
}

export interface InstallLineInput {
  installYear: number | null;
  installSource: InstallSource;
  replacementStatus: ReplacementStatus;
}

// =============================================================================
// CONSTANTS (LOCKED)
// =============================================================================

/** Base scores by install_source */
const BASE_SCORES: Record<InstallSource, number> = {
  heuristic: 0.30,
  owner_reported: 0.60,
  inspection: 0.75,
  permit_verified: 0.85,
};

/** Positive modifiers */
const MODIFIERS = {
  month: 0.05,
  corroboration: 0.05,
  brand: 0.03,
  model: 0.05,
  photo: 0.07,
};

/** Negative modifiers (rare, use carefully) */
const PENALTIES = {
  conflictingDates: 0.10,
  implausibleDate: 0.15,
};

/** UI thresholds */
const THRESHOLDS = {
  low: 0.50,
  high: 0.80,
};

// =============================================================================
// SCORING
// =============================================================================

/**
 * Calculate confidence score based on install source and modifiers
 * 
 * Rules:
 * - Base score from install_source
 * - Add modifiers for additional data
 * - Subtract penalties for issues
 * - Clamp between base and 1.0 (never auto-downgrade)
 */
export function scoreInstallConfidence(input: ConfidenceInput): ConfidenceResult {
  const base = BASE_SCORES[input.installSource];
  
  let modifiers = 0;
  if (input.hasMonth) modifiers += MODIFIERS.month;
  if (input.hasCorroboration) modifiers += MODIFIERS.corroboration;
  if (input.hasBrand) modifiers += MODIFIERS.brand;
  if (input.hasModel) modifiers += MODIFIERS.model;
  if (input.hasPhoto) modifiers += MODIFIERS.photo;
  
  let penalties = 0;
  if (input.hasConflictingDates) penalties += PENALTIES.conflictingDates;
  if (input.hasImplausibleDate) penalties += PENALTIES.implausibleDate;
  
  // Calculate raw score
  const raw = base + modifiers - penalties;
  
  // Clamp: never go below base, never exceed 1.0
  const final = Math.max(base, Math.min(1.0, raw));
  
  return {
    score: final,
    level: confidenceLevelFromScore(final),
    breakdown: {
      base,
      modifiers,
      penalties,
      final,
    },
  };
}

/**
 * Convert numeric score to confidence level
 */
export function confidenceLevelFromScore(score: number): ConfidenceLevel {
  if (score >= THRESHOLDS.high) return 'high';
  if (score >= THRESHOLDS.low) return 'medium';
  return 'low';
}

/**
 * Get base score for a given install source
 */
export function getBaseScore(source: InstallSource): number {
  return BASE_SCORES[source];
}

// =============================================================================
// INSTALL LINE FORMATTING
// =============================================================================

/**
 * Format the install line for display
 * 
 * Examples:
 * - heuristic: "Installed ~2005 (estimated)"
 * - owner_reported: "Installed 2018 (owner-reported)"
 * - permit_verified: "Installed 2016 (permit-verified)"
 * - original: "Installed 1987 (original system)"
 */
export function formatInstalledLine(input: InstallLineInput): string {
  const { installYear, installSource, replacementStatus } = input;
  
  // Handle missing year
  if (!installYear) {
    return 'Install date unknown';
  }
  
  // Original system takes precedence
  if (replacementStatus === 'original') {
    return `Installed ${installYear} (original system)`;
  }
  
  // Format by source
  switch (installSource) {
    case 'heuristic':
      return `Installed ~${installYear} (estimated)`;
    case 'owner_reported':
      return `Installed ${installYear} (owner-reported)`;
    case 'inspection':
      return `Installed ${installYear} (verified)`;
    case 'permit_verified':
      return `Installed ${installYear} (permit-verified)`;
    default:
      return `Installed ${installYear}`;
  }
}

/**
 * Get short source label for badges
 */
export function getSourceLabel(source: InstallSource): string {
  switch (source) {
    case 'heuristic':
      return 'Estimated';
    case 'owner_reported':
      return 'Owner-reported';
    case 'inspection':
      return 'Verified';
    case 'permit_verified':
      return 'Permit-verified';
    default:
      return 'Unknown';
  }
}

/**
 * Get confidence level label for display
 */
export function getConfidenceLevelLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'low':
      return 'Low confidence';
    case 'medium':
      return 'Moderate confidence';
    case 'high':
      return 'High confidence';
    default:
      return 'Unknown';
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if a year is plausible for a system installation
 */
export function isPlausibleInstallYear(year: number, yearBuilt?: number): boolean {
  const currentYear = new Date().getFullYear();
  
  // Cannot be in the future
  if (year > currentYear) return false;
  
  // Cannot be before reasonable construction era
  if (year < 1900) return false;
  
  // Cannot be before home was built (if known)
  if (yearBuilt && year < yearBuilt) return false;
  
  return true;
}

/**
 * Validate install source value
 */
export function isValidInstallSource(source: string): source is InstallSource {
  return ['heuristic', 'owner_reported', 'inspection', 'permit_verified'].includes(source);
}

/**
 * Validate replacement status value
 */
export function isValidReplacementStatus(status: string): status is ReplacementStatus {
  return ['original', 'replaced', 'unknown'].includes(status);
}
