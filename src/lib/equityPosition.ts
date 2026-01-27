/**
 * Equity Position Derivation Logic
 * 
 * Pure functions for deriving financing posture and confidence.
 * No UI logic. No copy. No rendering.
 * 
 * LTV Bands:
 * - > 0.7 → 'Majority financed'
 * - > 0.4 → 'Balanced ownership'
 * - ≤ 0.4 → 'Largely owned'
 * 
 * MarketValueState:
 * - 'verified' → Authoritative API value available
 * - 'unverified' → APIs unavailable, but ownership context exists
 * - 'unknown' → Insufficient data
 */

export type FinancingPosture = 
  | 'Majority financed' 
  | 'Balanced ownership' 
  | 'Largely owned';

export type EquityConfidence = 'High' | 'Moderate' | 'Early';

export type MortgageSource = 'inferred' | 'public_records' | null;

/**
 * Market value verification state.
 * Determines how the equity card renders - with value, with state message, or empty.
 */
export type MarketValueState =
  | 'verified'      // Authoritative API value
  | 'unverified'    // APIs unavailable, ownership context exists
  | 'unknown';      // Insufficient data

/**
 * Derive financing posture from market value and mortgage balance.
 * Returns null if either input is missing.
 */
export function deriveFinancingPosture(
  marketValue: number | null,
  mortgageBalance: number | null
): FinancingPosture | null {
  if (!marketValue || !mortgageBalance) return null;
  if (marketValue <= 0) return null;

  const ltv = mortgageBalance / marketValue;

  if (ltv > 0.7) return 'Majority financed';
  if (ltv > 0.4) return 'Balanced ownership';
  return 'Largely owned';
}

/**
 * Derive equity confidence based on data availability, source, and market value state.
 * 
 * @param hasMarketValue - Whether market value is available
 * @param hasMortgageData - Whether mortgage data is available
 * @param mortgageSource - Source of mortgage data ('inferred' | 'public_records' | null)
 * @param marketValueState - Verification state of market value
 */
export function deriveEquityConfidence(
  hasMarketValue: boolean,
  hasMortgageData: boolean,
  mortgageSource: MortgageSource,
  marketValueState?: MarketValueState
): EquityConfidence {
  // Unverified or unknown market value always returns Early confidence
  if (marketValueState === 'unverified' || marketValueState === 'unknown') {
    return 'Early';
  }
  
  // Both values from public records = High confidence
  if (hasMarketValue && hasMortgageData && mortgageSource === 'public_records') {
    return 'High';
  }
  
  // Market value exists but mortgage inferred = Moderate confidence
  if (hasMarketValue && hasMortgageData && mortgageSource === 'inferred') {
    return 'Moderate';
  }
  
  // Market value only, no mortgage data = Moderate (can still show value)
  if (hasMarketValue && !hasMortgageData) {
    return 'Moderate';
  }
  
  // Missing critical data = Early
  return 'Early';
}

/**
 * Format market value with softened precision (~ prefix).
 * Returns null if value is not available.
 */
export function formatSoftenedValue(value: number | null): string | null {
  if (!value || value <= 0) return null;
  
  return `~${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)}`;
}
