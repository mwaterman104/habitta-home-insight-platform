/**
 * Artifact Summoning Rules
 * 
 * ARTIFACT BEHAVIORAL CONTRACT:
 * 1. "This artifact does not explain itself. The chat explains why it exists."
 * 2. "The artifact proves the chat earned the right to speak."
 * 3. "It doesn't live anywhere. It was brought here."
 * 
 * CANONICAL DOCTRINE:
 * Artifacts may only be summoned if:
 * - A chat message is being emitted
 * - The artifact directly supports that message
 * 
 * Artifacts are NEVER summoned:
 * - On page load
 * - In Silent Steward mode
 * - Without an accompanying message
 * - When confidence is below Moderate
 * 
 * ARTIFACT LIFETIME RULE:
 * When the conversation context changes (new system, new mode),
 * prior artifacts should collapse automatically.
 * 
 * SESSION GUARD RULE:
 * An artifact may only be summoned ONCE per system per session
 * unless the user explicitly asks again.
 */

import type { ChatArtifact, ArtifactType } from '@/types/chatArtifact';
import type { ChatMode } from '@/types/chatMode';
import type { SystemAgingProfileData } from '@/components/dashboard-v3/artifacts/SystemAgingProfileArtifact';

// ============================================
// Session Storage Keys for Guard Rules
// ============================================

const ARTIFACT_SHOWN_PREFIX = 'habitta_artifact_shown_';
const AGING_PROFILE_KEY = 'habitta_artifact_shown_aging_profile';

/**
 * Check if an artifact was already shown for a specific system this session.
 * Prevents re-summoning spam per Risk 1 fix.
 */
export function hasShownArtifactForSystemThisSession(systemKey: string): boolean {
  try {
    return sessionStorage.getItem(`${ARTIFACT_SHOWN_PREFIX}${systemKey}`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark that an artifact was shown for a specific system this session.
 */
export function markArtifactShownForSystem(systemKey: string): void {
  try {
    sessionStorage.setItem(`${ARTIFACT_SHOWN_PREFIX}${systemKey}`, 'true');
  } catch {
    // Silent failure
  }
}

/**
 * Check if the aging profile artifact was already shown this session.
 * Aging profile is multi-system, so uses a special key.
 */
export function hasShownAgingProfileThisSession(): boolean {
  try {
    return sessionStorage.getItem(AGING_PROFILE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark that the aging profile artifact was shown this session.
 */
export function markAgingProfileShown(): void {
  try {
    sessionStorage.setItem(AGING_PROFILE_KEY, 'true');
  } catch {
    // Silent failure
  }
}

/**
 * Clear all artifact session guards (for testing/reset).
 */
export function clearArtifactSessionGuards(): void {
  try {
    // Remove all keys with our prefix
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(ARTIFACT_SHOWN_PREFIX) || key === AGING_PROFILE_KEY) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Silent failure
  }
}

// ============================================
// Artifact Context & Summoning
// ============================================

export interface ArtifactContext {
  chatMode: ChatMode;
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  messageId: string;
  systemKey?: string;
  userAskedForVisualization: boolean;
  /** Risk 1 fix: Prevent re-summoning spam */
  hasShownArtifactForSystem?: boolean;
}

/** Minimum confidence required to summon artifacts */
const ARTIFACT_ALLOWED_CONFIDENCE: Array<'Moderate' | 'High'> = ['Moderate', 'High'];

/**
 * Check if artifacts can be summoned in current context
 * Authority Fallback Rule: No artifacts below Moderate confidence
 */
export function canSummonArtifacts(context: ArtifactContext): boolean {
  // Never in Silent Steward
  if (context.chatMode === 'silent_steward') {
    return false;
  }
  
  // Authority Fallback: No artifacts below Moderate confidence
  if (!ARTIFACT_ALLOWED_CONFIDENCE.includes(context.confidenceLevel as 'Moderate' | 'High')) {
    return false;
  }
  
  // Must have an anchor message
  if (!context.messageId) {
    return false;
  }
  
  return true;
}

/**
 * Determine if an artifact should be summoned
 * 
 * Returns the artifact to summon, or null if none should appear
 */
export function shouldSummonArtifact(
  context: ArtifactContext
): { type: ArtifactType; systemKey?: string } | null {
  if (!canSummonArtifacts(context)) {
    return null;
  }
  
  // User explicitly asked "show me"
  if (context.userAskedForVisualization && context.systemKey) {
    return { type: 'system_timeline', systemKey: context.systemKey };
  }
  
  // Planning window: show timeline ONCE per system entry
  // Risk 1 fix: one-time guard prevents re-summoning spam
  if (
    context.chatMode === 'planning_window_advisory' &&
    context.systemKey &&
    !context.hasShownArtifactForSystem
  ) {
    return { type: 'system_timeline', systemKey: context.systemKey };
  }
  
  // Elevated with deviation explanation
  if (context.chatMode === 'elevated_attention' && context.systemKey) {
    return { type: 'confidence_explainer', systemKey: context.systemKey };
  }
  
  return null;
}

/**
 * Create an artifact with proper anchoring
 */
export function createArtifact(
  type: ArtifactType,
  anchorMessageId: string,
  data: Record<string, unknown>,
  systemKey?: string
): ChatArtifact {
  return {
    id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    summonedAt: new Date().toISOString(),
    anchorMessageId,
    systemKey,
    data,
    collapsed: false,
  };
}

/**
 * Create a system aging profile artifact
 */
export function createAgingProfileArtifact(
  anchorMessageId: string,
  data: SystemAgingProfileData
): ChatArtifact {
  return createArtifact('system_aging_profile', anchorMessageId, data as unknown as Record<string, unknown>);
}

/**
 * Check if artifact should auto-collapse
 * Artifact Lifetime Rule: Collapse when context changes
 */
export function shouldCollapseArtifact(
  artifact: ChatArtifact,
  currentSystemKey?: string,
  _currentMode?: ChatMode
): boolean {
  // Different system = collapse
  if (artifact.systemKey && currentSystemKey && artifact.systemKey !== currentSystemKey) {
    return true;
  }
  
  return false;
}
