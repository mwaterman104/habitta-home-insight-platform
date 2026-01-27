/**
 * Chat Mode Selector
 * 
 * DOCTRINE: Habitta does not advise until it can explain why it believes something.
 * If chatMode = 'baseline_establishment', all advisory language is blocked.
 * 
 * This is a DETERMINISTIC selector, not conversationally guessed.
 */

import type { ChatMode, ChatModeInput } from '@/types/chatMode';

/**
 * Deterministically select chat mode based on system data context.
 * 
 * Hierarchy:
 * 1. baseline_establishment: Early confidence AND insufficient coverage (< 50%)
 * 2. observational: Moderate confidence
 * 3. advisory: High confidence OR user confirmed systems
 * 4. Fallback: observational
 * 
 * Note: Strategic mode is NOT selected here - it's a sub-state entered via canEnterStrategic()
 */
export function determineChatMode(ctx: ChatModeInput): ChatMode {
  // QC #3: Require 50%+ critical systems coverage
  const hasAdequateCoverage = ctx.criticalSystemsCoverage >= 0.5;

  // Baseline: Early confidence AND insufficient coverage
  if (ctx.systemConfidence === 'Early' && !hasAdequateCoverage) {
    return 'baseline_establishment';
  }

  // Observational: Moderate confidence
  if (ctx.systemConfidence === 'Moderate') {
    return 'observational';
  }

  // Advisory: High confidence OR user confirmed
  if (ctx.systemConfidence === 'High' || ctx.userConfirmedSystems) {
    return 'advisory';
  }

  // Fallback
  return 'observational';
}

/**
 * QC #1 FIX: Strategic mode is nested inside advisory, not parallel.
 * A user cannot skip from baseline → strategic by asking about renovation.
 * 
 * Strategic mode requires:
 * 1. Current mode is already 'advisory'
 * 2. User intent matches strategic topics
 */
export function canEnterStrategic(currentMode: ChatMode, userIntent: string): boolean {
  // Strategic requires advisory eligibility first
  if (currentMode !== 'advisory') {
    return false;
  }

  const strategicIntents = [
    'renovation',
    'equity',
    'refinancing',
    'refinance',
    'second property',
    'heloc',
    'home equity',
  ];

  const normalizedIntent = userIntent.toLowerCase();
  return strategicIntents.some(intent => normalizedIntent.includes(intent));
}

/**
 * Get display label for chat mode (used in state indicator).
 */
export function getChatModeLabel(mode: ChatMode): string | null {
  switch (mode) {
    case 'baseline_establishment':
      return '• Establishing baseline';
    case 'observational':
      return '• Observing patterns';
    case 'advisory':
      return null; // No indicator in advisory mode
    case 'strategic':
      return null; // No indicator in strategic mode
    default:
      return null;
  }
}
