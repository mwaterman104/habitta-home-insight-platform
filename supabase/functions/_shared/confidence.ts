/**
 * Centralized confidence calculator for home data quality
 * 
 * Single source of truth for confidence scoring across all enrichment functions.
 * 
 * Scoring Rules:
 * - Base: 30 (address known)
 * - +10: year_built known
 * - +20: user HVAC input (explicit)
 * - +25: permit-derived HVAC
 * - +5: permits found
 * - Cap: 85 (never claim 100% certainty)
 */

export interface ConfidenceFactors {
  addressKnown?: boolean;
  yearBuiltKnown?: boolean;
  squareFeetKnown?: boolean;
  hvacAgeKnown?: boolean;
  hvacSource?: 'user' | 'permit' | 'inferred' | 'unknown';
  permitsCount?: number;
  roofAgeKnown?: boolean;
  roofSource?: 'user' | 'permit' | 'inferred' | 'unknown';
}

export interface ConfidenceResult {
  score: number;
  breakdown: {
    base: number;
    yearBuilt: number;
    hvac: number;
    permits: number;
    total: number;
  };
  summary: string;
}

/**
 * Calculate home confidence score based on available data factors
 */
export function calculateHomeConfidence(factors: ConfidenceFactors): ConfidenceResult {
  let score = 30; // Base: address known
  
  const breakdown = {
    base: 30,
    yearBuilt: 0,
    hvac: 0,
    permits: 0,
    total: 0,
  };
  
  // Year built adds reliability to age calculations
  if (factors.yearBuiltKnown) {
    score += 10;
    breakdown.yearBuilt = 10;
  }
  
  // HVAC source scoring (exclusive - use highest applicable)
  if (factors.hvacSource === 'user') {
    score += 20;
    breakdown.hvac = 20;
  } else if (factors.hvacSource === 'permit') {
    score += 25; // Permits are actually more reliable than user input
    breakdown.hvac = 25;
  }
  
  // Permits found adds general property intelligence
  if (factors.permitsCount && factors.permitsCount > 0) {
    score += 5;
    breakdown.permits = 5;
  }
  
  // Cap at 85 - we never claim 100% certainty
  score = Math.min(score, 85);
  breakdown.total = score;
  
  // Generate summary
  let summary = 'Based on available public data';
  if (score >= 70) {
    summary = 'High confidence from permit records and property data';
  } else if (score >= 50) {
    summary = 'Moderate confidence from property enrichment';
  } else if (score >= 40) {
    summary = 'Basic property data verified';
  }
  
  return { score, breakdown, summary };
}

/**
 * Calculate confidence factors from database records
 */
export function extractConfidenceFactors(
  home: { year_built?: number | null; square_feet?: number | null },
  system: { install_source?: string | null; install_year?: number | null } | null,
  permitsCount: number
): ConfidenceFactors {
  return {
    addressKnown: true, // If we have a home record, address is known
    yearBuiltKnown: !!home.year_built,
    squareFeetKnown: !!home.square_feet,
    hvacAgeKnown: !!system?.install_year,
    hvacSource: (system?.install_source as ConfidenceFactors['hvacSource']) || 'unknown',
    permitsCount,
  };
}
