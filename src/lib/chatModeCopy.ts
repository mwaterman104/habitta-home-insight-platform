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
  baseline_establishment: "I'm monitoring the systems shown above.",
  interpretive: "What would you like me to explain?",
  planning_window_advisory: "I can help you think through your options.",
  elevated_attention: "I'm seeing something worth discussing. Ask me about it.",
};

export function getEmptyStateForMode(mode: ChatMode): string {
  return EMPTY_STATE_MESSAGES[mode] || EMPTY_STATE_MESSAGES.silent_steward;
}

// ============================================
// Evidence-Anchored Messages
// ============================================

type EvidenceBasis = 'age' | 'region' | 'usage' | 'records';

/**
 * Get basis phrase for evidence anchoring
 */
function getBasisPhrase(basis: EvidenceBasis): string {
  switch (basis) {
    case 'age': return 'for homes of this age';
    case 'region': return 'for this region';
    case 'usage': return 'given typical usage patterns';
    case 'records': return 'based on available records';
  }
}

/**
 * Generate evidence-anchored chat message
 * 
 * RULE: Every evidence-anchored message must include one concrete basis
 * (age, region, usage, absence of deviation, etc.)
 */
export function getEvidenceAnchoredMessage(
  systemKey: string,
  state: 'stable' | 'planning_window' | 'elevated',
  displayName: string,
  basis: EvidenceBasis = 'age'
): string {
  const basisPhrase = getBasisPhrase(basis);
  
  switch (state) {
    case 'stable':
      return `Based on what you're seeing above, your ${displayName.toLowerCase()} is within the expected range ${basisPhrase}.`;
    case 'planning_window':
      return `The baseline shows your ${displayName.toLowerCase()} approaching typical limits ${basisPhrase}.`;
    case 'elevated':
      return `I'm seeing something with your ${displayName.toLowerCase()} that warrants discussion ${basisPhrase}.`;
  }
}

// ============================================
// "Why?" Response Rules (Complete Understanding)
// ============================================

/**
 * "Why?" Response Pattern Rules (Complete Understanding)
 * 
 * Structure: Belief → Reasons → Implication → [Optional CTA]
 * 
 * CRITICAL RULES:
 * - "Why?" should NEVER generate a question back to the user
 * - "Why?" delivers closure, not opens a thread
 * - Maximum one optional CTA, always invitational
 */
export const WHY_RESPONSE_RULES = {
  structure: ['belief', 'reasons', 'implication', 'optional_cta'] as const,
  
  /** What "Why?" responses MUST include */
  required: [
    'Belief: What Habitta believes about this system',
    'Reasons: Why it believes this (bullet list)',
    'Implication: What this means for the homeowner',
  ] as const,
  
  /** What "Why?" responses may NOT include */
  banned: [
    'Questions back to the user',
    'Open-ended threads',
    'Multiple CTAs',
    'Recommendations that require immediate action',
  ] as const,
  
  /** Optional: One invitational CTA max */
  optionalCta: 'If you want to improve accuracy, you can [invitational action].',
};

/**
 * Get state-specific implication copy for "Why?" responses
 * Delivers closure, not opens threads
 */
export type WhySystemState = 'stable' | 'planning_window' | 'elevated' | 'baseline_incomplete';

export function getStateImplication(state: WhySystemState): string {
  switch (state) {
    case 'stable':
      return "This means you don't need to take action right now. Routine monitoring is sufficient.";
    case 'planning_window':
      return "This is a good time to begin researching options. No immediate action is required.";
    case 'elevated':
      return "This warrants attention. Consider having it inspected before making decisions.";
    case 'baseline_incomplete':
      return "I don't have enough information to assess this system accurately yet.";
  }
}

/**
 * Get state label for "Why?" message injection
 */
export function getWhyStateLabel(state: WhySystemState): string {
  switch (state) {
    case 'stable':
      return 'stable';
    case 'planning_window':
      return 'approaching typical limits';
    case 'elevated':
      return 'elevated';
    case 'baseline_incomplete':
      return 'establishing baseline';
  }
}

// ============================================
// Session Storage Keys
// ============================================

export const BASELINE_OPENING_SHOWN_KEY = 'habitta_baseline_opening_shown';

/**
 * Check if baseline opening message was already shown for this property.
 * Property-scoped to prevent cross-property pollution.
 */
export function wasBaselineOpeningShown(propertyId?: string): boolean {
  try {
    if (propertyId) {
      // Property-specific check first
      return sessionStorage.getItem(`${BASELINE_OPENING_SHOWN_KEY}_${propertyId}`) === 'true';
    }
    // Legacy global check for backward compatibility
    return sessionStorage.getItem(BASELINE_OPENING_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark baseline opening message as shown for this property.
 */
export function markBaselineOpeningShown(propertyId?: string): void {
  try {
    if (propertyId) {
      sessionStorage.setItem(`${BASELINE_OPENING_SHOWN_KEY}_${propertyId}`, 'true');
    }
    // Also set global flag for legacy compatibility
    sessionStorage.setItem(BASELINE_OPENING_SHOWN_KEY, 'true');
  } catch {
    // Silent failure
  }
}

/**
 * Clear baseline opening shown flag for a property (for testing/reset).
 */
export function clearBaselineOpeningShown(propertyId?: string): void {
  try {
    if (propertyId) {
      sessionStorage.removeItem(`${BASELINE_OPENING_SHOWN_KEY}_${propertyId}`);
    }
    sessionStorage.removeItem(BASELINE_OPENING_SHOWN_KEY);
  } catch {
    // Silent failure
  }
}

// ============================================
// Personal Blurb Generator
// ============================================

const FIRST_VISIT_KEY = 'habitta_first_visit_complete';

/**
 * Check if this is the user's first visit
 */
export function isFirstVisit(): boolean {
  try {
    return localStorage.getItem(FIRST_VISIT_KEY) !== 'true';
  } catch {
    return false;
  }
}

/**
 * Mark the first visit as complete
 */
export function markFirstVisitComplete(): void {
  try {
    localStorage.setItem(FIRST_VISIT_KEY, 'true');
  } catch {
    // Silent failure
  }
}

/**
 * Get time-of-day greeting
 */
function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Generate a warm, personal greeting for the chat
 * Time-aware and context-sensitive
 * 
 * DOCTRINE COMPLIANCE:
 * - Uses observational language, not directive
 * - Invitational next steps ("If you'd like to...")
 * - No banned phrases
 */
export function generatePersonalBlurb(context: {
  yearBuilt?: number;
  systemCount: number;
  planningCount: number;
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  isFirstVisit?: boolean;
  // NEW: Verification context for honest baseline reporting
  verifiedSystemCount?: number;
  totalSystemCount?: number;
}): string {
  const greeting = getTimeOfDayGreeting();
  
  // First visit: explain what they're seeing
  if (context.isFirstVisit) {
    const systemWord = context.systemCount === 1 ? 'system' : 'systems';
    return `${greeting}. I've reviewed the information you provided and set up monitoring for ${context.systemCount} key ${systemWord}. I'll keep an eye on their expected lifespans and let you know when planning windows approach.`;
  }
  
  // Simplified: always use "Your home" without year to avoid data accuracy issues
  const homeRef = 'Your home';
  
  const systemWord = context.systemCount === 1 ? 'system' : 'systems';
  
  let statusLine = '';
  
  // NEW: Check verification status for honest reporting
  const verified = context.verifiedSystemCount ?? 0;
  const total = context.totalSystemCount ?? context.systemCount;
  const remaining = total - verified;
  
  if (verified > 0 && remaining > 0) {
    // HONEST: Acknowledge verified work AND remaining uncertainty
    const verifiedWord = verified === 1 ? 'system' : 'systems';
    statusLine = `I've verified ${verified} ${verifiedWord} from permit records. I'm still establishing the baseline for the remaining ${remaining}.`;
  } else if (verified === total && verified > 0) {
    // All verified: can claim stability
    statusLine = 'All systems are verified. Everything is currently within expected ranges.';
  } else if (context.planningCount > 0) {
    // Has planning systems
    statusLine = context.planningCount === 1
      ? `I'm keeping an eye on one system that may need attention in the coming years.`
      : `I'm keeping an eye on ${context.planningCount} systems that may need attention in the coming years.`;
  } else if (context.confidenceLevel === 'Unknown' || context.confidenceLevel === 'Early') {
    // HONEST: Don't claim "everything is fine" when we don't know
    statusLine = `I'm still establishing a complete picture of your systems.`;
  } else {
    statusLine = 'Everything is currently within expected ranges.';
  }
  
  let nextStep = '';
  if (context.confidenceLevel === 'Early' || context.confidenceLevel === 'Unknown') {
    nextStep = ` If you'd like to sharpen the picture, adding a photo of any system label helps me dial in the details.`;
  }
  
  return `${greeting}. ${homeRef} has ${context.systemCount} key ${systemWord} I'm tracking. ${statusLine}${nextStep}`;
}

// ============================================
// Artifact Summoning Justification Copy
// ============================================

/**
 * Get the justification message that earns the right to show the aging profile
 * 
 * SUMMONING PATTERN (exact):
 * a) JUSTIFY: "Given the age of your home..."
 * b) ANNOUNCE: "I pulled a typical system aging profile..."
 * c) [ARTIFACT RENDERS - system handles this]
 * d) REFERENCE: "Based on what you're seeing above..."
 * 
 * This message combines a) and b) to justify the artifact.
 */
export function getSummoningJustification(
  yearBuilt?: number,
  source: BaselineSource = 'inferred'
): string {
  const yearRef = yearBuilt ? `around ${yearBuilt}` : 'in this region';
  
  if (source === 'inferred') {
    return `Given the age of your home and what we typically see in this area, I pulled a typical system aging profile for homes built ${yearRef} to compare against what we know so far.`;
  }
  
  if (source === 'partial') {
    return `I have some confirmed details about your systems. I pulled an aging profile to show how they compare to typical patterns for homes built ${yearRef}.`;
  }
  
  // confirmed
  return `Your systems are well-documented. I pulled an aging profile to show how they're positioned relative to typical patterns for homes built ${yearRef}.`;
}

/**
 * Get the follow-up message to reference the artifact
 * This is step (d) of the summoning pattern.
 */
export function getArtifactReferenceMessage(
  systemsContext: Array<{ displayName: string; state: WhySystemState }>
): string {
  if (systemsContext.length === 0) {
    return "Based on what you're seeing above, your systems are within typical ranges for homes of this age.";
  }
  
  // Find the most notable system (elevated > planning_window > stable)
  const elevated = systemsContext.find(s => s.state === 'elevated');
  const planning = systemsContext.find(s => s.state === 'planning_window');
  
  if (elevated) {
    return `Based on what you're seeing above, your ${elevated.displayName.toLowerCase()} warrants attention, while the other systems are within expected ranges.`;
  }
  
  if (planning) {
    return `Based on what you're seeing above, your ${planning.displayName.toLowerCase()} is nearing the end of its typical lifespan, while the other systems have service life remaining.`;
  }
  
  return "Based on what you're seeing above, all your systems are operating within typical ranges for homes of this age.";
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
