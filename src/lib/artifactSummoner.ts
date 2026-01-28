/**
 * Artifact Summoning Rules
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
 */

import type { ChatArtifact, ArtifactType } from '@/types/chatArtifact';
import type { ChatMode } from '@/types/chatMode';

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
