/**
 * Equity Copy Governance Module
 * 
 * Centralized copy for equity position card.
 * No conditionals in JSX. All copy comes from here.
 * 
 * Doctrine: Equity information may only increase understanding, never motivation.
 */

import type { FinancingPosture, EquityConfidence, MarketValueState } from './equityPosition';

/**
 * Get the "What this enables" line based on financing posture.
 * 
 * Rules (hard):
 * - No verbs like do, take, start, act
 * - No timelines
 * - No "now"
 * - No conditional "if you…"
 */
export function getEquityEnablementLine(posture: FinancingPosture | null): string {
  if (!posture) {
    return 'This ownership profile is still being established.';
  }

  switch (posture) {
    case 'Majority financed':
      return 'This position typically supports limited financing flexibility.';
    case 'Balanced ownership':
      return 'This position typically supports optional financing flexibility.';
    case 'Largely owned':
      return 'This position provides strong financial flexibility.';
  }
}

/**
 * Get the inference note for when financing posture is derived from public records.
 */
export function getPostureInferenceNote(): string {
  return 'Financing posture inferred from public records';
}

/**
 * Get the market context section label.
 */
export function getMarketContextLabel(): string {
  return 'Market Context';
}

/**
 * Get the financing posture section label.
 */
export function getFinancingPostureLabel(): string {
  return 'Financing Posture';
}

/**
 * Get the enablement section label.
 */
export function getEnablementLabel(): string {
  return 'What this enables';
}

/**
 * Get confidence display text.
 */
export function getConfidenceText(confidence: EquityConfidence): string {
  return `Confidence: ${confidence}`;
}

/**
 * Get area context line for market value.
 * This is observational, no percentages, no up/down language.
 */
export function getAreaContextLine(city?: string | null, state?: string | null): string {
  if (city && state) {
    return `Based on market data for similar homes in ${city}, ${state}.`;
  }
  return 'Based on regional market data for similar homes.';
}

/**
 * Empty state copy when market value is unavailable.
 */
export function getValueUnavailableText(): string {
  return 'Value context unavailable';
}

/**
 * Empty state copy when financing posture is unavailable.
 */
export function getPostureUnavailableText(): string {
  return 'Financing posture unavailable';
}

/**
 * Link text for viewing market context.
 */
export function getViewMarketContextText(): string {
  return 'View market context';
}

/**
 * Get market context display based on valuation state.
 * Returns empty string for verified (will show actual value).
 */
export function getMarketContextDisplay(
  marketValueState: MarketValueState
): string {
  switch (marketValueState) {
    case 'verified':
      return ''; // Will show actual value
    case 'unverified':
      return 'Market value not yet established';
    case 'unknown':
      return 'Insufficient data to establish market context';
  }
}

/**
 * Get enablement line for unverified posture.
 */
export function getUnverifiedEnablementLine(
  posture: FinancingPosture | null
): string {
  if (!posture) {
    return 'Additional property data would improve financial insight.';
  }
  return 'This ownership profile typically supports optional financing, pending market verification.';
}
