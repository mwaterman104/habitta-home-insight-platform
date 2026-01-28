/**
 * Chat Mode Copy Governance - V1 Spec Compliant
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
 * 
 * LANGUAGE GOVERNANCE (Strict):
 * Allowed verbs: watching, monitoring, noting, preparing, confirming
 * Banned verbs: fix, solve, optimize, upgrade, save you money
 * 
 * EPISTEMIC COHERENCE RULE:
 * "Habitta never denies its own evidence.
 *  When knowledge is inferred, it is labeled — not dismissed."
 * 
 * NEVER say when baseline is visible:
 * - "blank slate"
 * - "no systems"
 * - "no information"
 * - "don't have any"
 * - "can't tell anything"
 */

import type { ChatMode, BaselineSource } from '@/types/chatMode';

// ============================================
// Opening Messages (system-initiated, once per session)
// ============================================

export interface OpeningMessageConfig {
  primary: string;
  secondary?: string;
  clarifier?: string;
}

const OPENING_MESSAGES: Record<ChatMode, OpeningMessageConfig | null> = {
  silent_steward: null, // Never speaks first (silence is authority)
  
  baseline_establishment: null, // Now handled by provenance-aware messages below
  
  interpretive: null, // Context-dependent, not pre-defined
  
  planning_window_advisory: {
    primary: "Based on what you're seeing above, one of your systems is entering a planning window.",
    secondary: "Nothing needs to be done yet — this is about being ready.",
  },
  
  elevated_attention: {
    primary: "I'm seeing something that warrants attention.",
    secondary: "Let me explain what I'm observing.",
  },
};

// ============================================
// Provenance-Aware Opening Messages (Epistemic Coherence)
// ============================================

/**
 * Opening messages based on baseline source.
 * These replace the old baseline_establishment messages to ensure
 * the chat never contradicts visible baseline evidence.
 */
export const BASELINE_PROVENANCE_MESSAGES: Record<BaselineSource, OpeningMessageConfig> = {
  inferred: {
    primary: "What you're seeing above is an inferred baseline.",
    secondary: "It's based on the age of the home, location, and typical system lifespans in this region.",
    clarifier: "I haven't yet confirmed the specific details of your systems — but it's enough to begin monitoring and identify planning windows.",
  },
  
  partial: {
    primary: "I have confirmed details for some of your systems.",
    secondary: "The remaining systems are estimated based on typical patterns.",
    clarifier: "We can improve accuracy for any system with a photo or quick confirmation.",
  },
  
  confirmed: {
    primary: "Your baseline is well-established.",
    secondary: "I can provide specific guidance based on confirmed system data.",
  },
};

/**
 * Get provenance-aware opening message for baseline modes
 */
export function getProvenanceOpeningMessage(source: BaselineSource): OpeningMessageConfig {
  return BASELINE_PROVENANCE_MESSAGES[source];
}

/**
 * Format provenance opening message to string
 */
export function formatProvenanceOpeningMessage(source: BaselineSource): string {
  const config = BASELINE_PROVENANCE_MESSAGES[source];
  const parts = [config.primary];
  if (config.secondary) parts.push(config.secondary);
  if (config.clarifier) parts.push(config.clarifier);
  return parts.join('\n\n');
}

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
  silent_steward: [
    "What are you monitoring?",
    "Walk me through my home's status",
    "Any patterns you're seeing?",
  ],
  
  baseline_establishment: [
    "Help establish a clearer baseline",
    "What information would improve accuracy?",
    "What can you tell from what you see now?",
  ],
  
  interpretive: [
    "Tell me more",
    "What does that mean for me?",
    "How confident are you?",
  ],
  
  planning_window_advisory: [
    "Walk me through my options",
    "What happens if I wait?",
    "Help me understand the timeline",
  ],
  
  elevated_attention: [
    "What are you seeing?",
    "How concerned should I be?",
    "What do you recommend?",
  ],
};

export function getPromptsForMode(mode: ChatMode): string[] {
  return SUGGESTED_PROMPTS[mode] || SUGGESTED_PROMPTS.silent_steward;
}

// ============================================
// Empty State Messages
// ============================================

const EMPTY_STATE_MESSAGES: Record<ChatMode, string> = {
  silent_steward: "All systems stable. What would you like to understand about your home?",
  baseline_establishment: "I'm monitoring with limited system history. I can share what I'm able to observe so far.",
  interpretive: "What would you like me to explain?",
  planning_window_advisory: "I can help you think through your options.",
  elevated_attention: "I'm seeing something worth discussing. Ask me about it.",
};

export function getEmptyStateForMode(mode: ChatMode): string {
  return EMPTY_STATE_MESSAGES[mode] || EMPTY_STATE_MESSAGES.silent_steward;
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
  /** Show photo upload affordance */
  showUploadAffordance: boolean;
  /** Allow cost discussion */
  allowCostDiscussion: boolean;
  /** Allow specific timelines */
  allowTimelineSpecifics: boolean;
  /** Allow action language */
  allowActionLanguage: boolean;
  /** Chat may speak first */
  canAutoInitiate: boolean;
  /** Maximum consecutive agent messages */
  maxConsecutiveMessages: number;
}

const MODE_BEHAVIORS: Record<ChatMode, ModeBehavior> = {
  silent_steward: {
    showUploadAffordance: false,
    allowCostDiscussion: false,
    allowTimelineSpecifics: false,
    allowActionLanguage: false,
    canAutoInitiate: false, // Never speaks first
    maxConsecutiveMessages: 3,
  },
  
  baseline_establishment: {
    showUploadAffordance: true,
    allowCostDiscussion: false,
    allowTimelineSpecifics: false,
    allowActionLanguage: false,
    canAutoInitiate: true, // Speaks first to establish baseline
    maxConsecutiveMessages: 3,
  },
  
  interpretive: {
    showUploadAffordance: false,
    allowCostDiscussion: false,
    allowTimelineSpecifics: false, // Ranges only
    allowActionLanguage: false,
    canAutoInitiate: false,
    maxConsecutiveMessages: 1, // Subtle Risk #1: Hard limit
  },
  
  planning_window_advisory: {
    showUploadAffordance: false,
    allowCostDiscussion: true,
    allowTimelineSpecifics: true,
    allowActionLanguage: true, // Soft, preparation-focused
    canAutoInitiate: true, // Once per window entry
    maxConsecutiveMessages: 3,
  },
  
  elevated_attention: {
    showUploadAffordance: false,
    allowCostDiscussion: true,
    allowTimelineSpecifics: true,
    allowActionLanguage: true, // More directive
    canAutoInitiate: true,
    maxConsecutiveMessages: 3,
  },
};

export function getModeBehavior(mode: ChatMode): ModeBehavior {
  return MODE_BEHAVIORS[mode] || MODE_BEHAVIORS.silent_steward;
}

// ============================================
// Elevated Mode Behavior Constraint
// ============================================

/**
 * Elevated Mode Behavior - Constrained by Confidence
 * 
 * If baseline incomplete:
 *   - Elevated mode ASKS questions
 *   - Does NOT give recommendations
 *   - Tone: "I'm seeing something unusual, can you confirm X?"
 * 
 * If baseline complete:
 *   - Elevated mode is DIRECTIVE
 *   - Clear next steps allowed
 *   - Tone: "This is outside normal range. I recommend X."
 */
export interface ElevatedModeBehavior {
  canRecommend: boolean;
  canGiveTimelines: boolean;
  canMentionCosts: boolean;
  toneDirective: 'questioning' | 'advisory';
}

export function getElevatedBehavior(
  isBaselineComplete: boolean
): ElevatedModeBehavior {
  if (!isBaselineComplete) {
    // Baseline incomplete: Elevated asks questions only
    return {
      canRecommend: false,
      canGiveTimelines: false,
      canMentionCosts: false,
      toneDirective: 'questioning',
    };
  }
  
  // Baseline complete: Elevated is directive
  return {
    canRecommend: true,
    canGiveTimelines: true,
    canMentionCosts: true,
    toneDirective: 'advisory',
  };
}
