/**
 * Chat Mode Copy Governance
 * 
 * Mode-specific copy for chat interface.
 * Enforces doctrine: No task language in baseline mode.
 * 
 * BANNED in baseline mode:
 * - "Please upload"
 * - "To continue"
 * - "Required"
 * - "Missing data"
 * - "You need to"
 * - "Next step"
 */

import type { ChatMode } from '@/types/chatMode';

// ============================================
// Opening Messages (system-initiated, once per session)
// ============================================

export interface OpeningMessageConfig {
  primary: string;
  secondary?: string;
  clarifier?: string;
}

const OPENING_MESSAGES: Record<ChatMode, OpeningMessageConfig | null> = {
  baseline_establishment: {
    primary: "I'm currently working with limited system history for this home.\nI can still monitor patterns, but accuracy improves when installations can be confirmed.",
    secondary: "If you'd like, we can establish a clearer baseline by identifying what's installed.",
    clarifier: "Photos of equipment labels or installations are usually enough.",
  },
  observational: null, // No opening message
  advisory: null, // Context-aware (handled elsewhere)
  strategic: null, // No opening message
};

export function getOpeningMessage(mode: ChatMode): OpeningMessageConfig | null {
  return OPENING_MESSAGES[mode];
}

export function formatOpeningMessage(config: OpeningMessageConfig): string {
  const parts = [config.primary];
  if (config.secondary) parts.push(config.secondary);
  if (config.clarifier) parts.push(config.clarifier);
  return parts.join('\n\n');
}

// ============================================
// Suggested Prompts
// ============================================

const SUGGESTED_PROMPTS: Record<ChatMode, string[]> = {
  baseline_establishment: [
    "Help establish a clearer baseline",
    "What information would improve accuracy?",
    "What can you tell from what you see now?",
  ],
  observational: [
    "What are you seeing?",
    "How confident is this assessment?",
    "What factors influence this?",
  ],
  advisory: [
    "Walk me through my options",
    "What happens if I wait?",
    "Help me understand the timeline",
  ],
  strategic: [
    "Could I afford a renovation?",
    "What does my equity position enable?",
    "Help me think through financing options",
  ],
};

export function getPromptsForMode(mode: ChatMode): string[] {
  return SUGGESTED_PROMPTS[mode] || SUGGESTED_PROMPTS.observational;
}

// ============================================
// Empty State Messages (QC #5 Fix)
// ============================================

const EMPTY_STATE_MESSAGES: Record<ChatMode, string> = {
  // QC #5: Softened to observational posture (removed "Ask what I can see")
  baseline_establishment: "I'm monitoring with limited system history. I can share what I'm able to observe so far.",
  observational: "What would you like to understand about your home?",
  advisory: "I can help you think through your options.",
  strategic: "We can explore financial possibilities together.",
};

export function getEmptyStateForMode(mode: ChatMode): string {
  return EMPTY_STATE_MESSAGES[mode] || EMPTY_STATE_MESSAGES.observational;
}

// ============================================
// Session Storage Keys
// ============================================

export const BASELINE_OPENING_SHOWN_KEY = 'habitta_baseline_opening_shown';

/**
 * Check if baseline opening message was already shown this session.
 */
export function wasBaselineOpeningShown(): boolean {
  try {
    return sessionStorage.getItem(BASELINE_OPENING_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark baseline opening message as shown for this session.
 */
export function markBaselineOpeningShown(): void {
  try {
    sessionStorage.setItem(BASELINE_OPENING_SHOWN_KEY, 'true');
  } catch {
    // Silent failure
  }
}

/**
 * Clear baseline opening shown flag (for testing/reset).
 */
export function clearBaselineOpeningShown(): void {
  try {
    sessionStorage.removeItem(BASELINE_OPENING_SHOWN_KEY);
  } catch {
    // Silent failure
  }
}

// ============================================
// Behavior Flags by Mode
// ============================================

export interface ModeBehavior {
  showUploadAffordance: boolean;
  allowCostDiscussion: boolean;
  allowTimelineSpecifics: boolean;
  allowActionLanguage: boolean;
}

const MODE_BEHAVIORS: Record<ChatMode, ModeBehavior> = {
  baseline_establishment: {
    showUploadAffordance: true,
    allowCostDiscussion: false,
    allowTimelineSpecifics: false,
    allowActionLanguage: false,
  },
  observational: {
    showUploadAffordance: false,
    allowCostDiscussion: false,
    allowTimelineSpecifics: false, // Ranges only
    allowActionLanguage: false,
  },
  advisory: {
    showUploadAffordance: false,
    allowCostDiscussion: true,
    allowTimelineSpecifics: true,
    allowActionLanguage: true, // Soft
  },
  strategic: {
    showUploadAffordance: false,
    allowCostDiscussion: true,
    allowTimelineSpecifics: true,
    allowActionLanguage: true,
  },
};

export function getModeBehavior(mode: ChatMode): ModeBehavior {
  return MODE_BEHAVIORS[mode] || MODE_BEHAVIORS.observational;
}
