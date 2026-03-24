/**
 * Chat Mode Selector - V1 Spec Compliant
 * 
 * DOCTRINE: Habitta does not advise until it can explain why it believes something.
 * If chatMode = 'baseline_establishment', all advisory language is blocked.
 * 
 * This is a DETERMINISTIC selector, not conversationally guessed.
 * 
 * Mode Priority Order (Critical Fix #1):
 * 1. Elevated Attention (safety exception - but gates behavior by confidence)
 * 2. Baseline Establishment (incomplete confidence blocks advisory)
 * 3. Planning Window Advisory
 * 4. Interpretive (user-triggered, ephemeral)
 * 5. Silent Steward (default)
 */

import type { ChatMode, ChatModeInput, SystemModeInput } from '@/types/chatMode';
import { 
  PLANNING_MONTHS, 
  ELEVATED_MONTHS, 
  BASELINE_INCOMPLETE_CONFIDENCE,
  hasElevatedDeviation,
  hasPlanningWindow,
  hasBaselineIncomplete,
  type SystemStateModel,
} from '@/types/systemState';

/**
 * Deterministically select chat mode based on system data context.
 * 
 * Priority Order (Critical Fix #1):
 * 1. Elevated Attention: Deviation detected (safety exception)
 *    - BUT: If baseline incomplete, Elevated mode only asks questions
 * 2. Baseline Establishment: Early confidence OR insufficient coverage
 * 3. Planning Window Advisory: System in planning window
 * 4. Silent Steward: Default (silence is authority)
 * 
 * Note: Interpretive mode is NOT selected here - it's triggered by user "why/how" questions
 */
export function determineChatMode(ctx: ChatModeInput): ChatMode {
  const { systemConfidence, criticalSystemsCoverage, systems } = ctx;
  
  // Baseline confidence gate (Critical Fix #1)
  const isBaselineIncomplete = 
    systemConfidence === 'Early' || 
    criticalSystemsCoverage < 0.5;

  // Convert systems to SystemStateModel for helper functions
  const systemModels: SystemStateModel[] = (systems ?? []).map(s => ({
    key: s.key,
    displayName: s.key,
    state: s.state,
    confidence: s.confidence,
    monthsRemaining: s.months_remaining,
    deviation_detected: s.deviation_detected,
    anomaly_flags: s.anomaly_flags,
  }));

  // Check for elevated deviation (Critical Fix #2 - requires actual deviation)
  const hasElevated = hasElevatedDeviation(systemModels);

  // Priority 1: Elevated Attention (safety exception)
  // BUT: The Elevated mode BEHAVIOR is constrained by isBaselineIncomplete
  if (hasElevated) {
    return 'elevated_attention';
  }

  // Priority 2: Baseline Establishment (gates advisory)
  if (isBaselineIncomplete || hasBaselineIncomplete(systemModels)) {
    return 'baseline_establishment';
  }

  // Priority 3: Planning Window (only after baseline complete)
  if (hasPlanningWindow(systemModels)) {
    return 'planning_window_advisory';
  }

  // Priority 4: Interpretive (triggered by user action, handled separately)
  // Not selected by this function - see enterInterpretiveMode()

  // Priority 5: Silent Steward (default)
  return 'silent_steward';
}

/**
 * Check if user intent triggers interpretive mode.
 * Returns true if user asks "why", "how", or "what does this mean"
 */
export function shouldEnterInterpretive(userMessage: string): boolean {
  const interpretiveIntents = [
    'why',
    'how',
    'what does',
    'what is',
    'explain',
    'tell me about',
    'understand',
    'meaning',
  ];

  const normalizedMessage = userMessage.toLowerCase();
  return interpretiveIntents.some(intent => normalizedMessage.includes(intent));
}

/**
 * Get display label for chat mode (used in state indicator).
 * Silent Steward and Planning Window don't show indicators (authority through silence)
 */
export function getChatModeLabel(mode: ChatMode): string | null {
  switch (mode) {
    case 'baseline_establishment':
      return '• Establishing baseline';
    case 'interpretive':
      return '• Explaining';
    case 'elevated_attention':
      return '• Elevated attention';
    case 'silent_steward':
      return null; // Silence is authority
    case 'planning_window_advisory':
      return null; // No indicator needed
    default:
      return null;
  }
}

/**
 * Check if baseline is complete (gates advisory modes)
 */
export function isBaselineComplete(ctx: ChatModeInput): boolean {
  return ctx.systemConfidence !== 'Early' && ctx.criticalSystemsCoverage >= 0.5;
}
