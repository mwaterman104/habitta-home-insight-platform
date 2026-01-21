/**
 * Lifespan Formatting Utilities
 * 
 * UI-layer derivation helpers for presenting failure window data.
 * These functions transform semantic prediction data into display-ready strings.
 * 
 * IMPORTANT: Presentation logic lives HERE, not in the prediction contract.
 */

/**
 * Format replacement window from p10/p90 dates
 * @example "2036–2042"
 */
export function formatReplacementWindow(p10: string, p90: string): string {
  const y10 = new Date(p10).getFullYear();
  const y90 = new Date(p90).getFullYear();
  
  if (y10 === y90) {
    return `~${y10}`;
  }
  
  return `${y10}–${y90}`;
}

/**
 * Extract most likely year from p50 date
 * @example 2039
 */
export function getMostLikelyYear(p50: string): number {
  return new Date(p50).getFullYear();
}

/**
 * Format most likely year for display
 * @example "2039"
 */
export function formatMostLikelyYear(p50: string): string {
  return String(getMostLikelyYear(p50));
}

/**
 * Map confidence score to human-readable label
 * Confidence reflects data completeness, NOT system condition
 */
export function mapConfidenceLabel(confidence: number): 'Low' | 'Medium' | 'High' {
  if (confidence < 0.4) return 'Low';
  if (confidence < 0.7) return 'Medium';
  return 'High';
}

/**
 * Format years remaining for dashboard display
 * @example "~13–15 years remaining"
 */
export function formatYearsRemaining(years: number): string {
  if (years <= 0) return 'End of expected lifespan';
  if (years < 1) return 'Less than 1 year remaining';
  
  // Round to nearest integer for cleaner display
  const rounded = Math.round(years);
  return `~${rounded} years remaining`;
}

/**
 * Format years remaining as a range for dashboard
 * Uses p10/p50/p90 to create a range like "~13–15 years"
 */
export function formatYearsRemainingRange(
  yearsP10: number,
  yearsP50: number,
  yearsP90: number
): string {
  if (yearsP90 <= 0) return 'End of expected lifespan';
  if (yearsP90 < 1) return 'Less than 1 year remaining';
  
  // Use p50 and p90 for a reassuring range
  const low = Math.max(1, Math.round(yearsP50));
  const high = Math.round(yearsP90);
  
  if (low === high) {
    return `~${low} years remaining`;
  }
  
  return `~${low}–${high} years remaining`;
}

/**
 * Calculate current age from install date
 */
export function calculateAge(installDate: string | Date): number {
  const install = typeof installDate === 'string' ? new Date(installDate) : installDate;
  const now = new Date();
  return Math.max(0, (now.getTime() - install.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

/**
 * Format age for display
 * @example "2 years"
 */
export function formatAge(installDate: string | Date): string {
  const age = calculateAge(installDate);
  const rounded = Math.round(age);
  
  if (rounded === 0) return 'Less than 1 year';
  if (rounded === 1) return '1 year';
  return `${rounded} years`;
}

/**
 * Calculate lifespan years from install date to failure date
 */
export function calculateLifespanYears(installDate: string, failureDate: string): number {
  const install = new Date(installDate);
  const failure = new Date(failureDate);
  return (failure.getTime() - install.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Generate "why this window" explanation bullets based on context
 */
export function generateWindowExplanation(context: {
  yearsRemaining: number;
  hasRecentMaintenance: boolean;
  installVerified: boolean;
  isSouthFlorida: boolean;
  hasLimitedHistory: boolean;
}): string[] {
  const bullets: string[] = [];
  
  if (context.yearsRemaining > 3) {
    bullets.push('HVAC age well within expected lifespan');
  } else if (context.yearsRemaining > 1) {
    bullets.push('System approaching typical replacement window');
  } else {
    bullets.push('System at or beyond typical service life');
  }
  
  if (context.installVerified) {
    bullets.push('Install verified through permit records');
  }
  
  if (context.isSouthFlorida) {
    bullets.push('South Florida climate increases system wear');
  }
  
  if (context.hasLimitedHistory) {
    bullets.push('Limited service history adds uncertainty');
  }
  
  if (context.hasRecentMaintenance) {
    bullets.push('Recent maintenance may extend system life');
  }
  
  return bullets;
}
