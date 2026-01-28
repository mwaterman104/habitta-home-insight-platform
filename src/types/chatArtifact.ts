/**
 * Chat Artifact Type System
 * 
 * CANONICAL DOCTRINE:
 * Artifacts are summoned evidence that appear inside the chat stream.
 * They are NOT dashboard elements. They are conversation supplements.
 * 
 * CONSTRAINTS:
 * - Artifacts must be tied to a specific message (anchorMessageId required)
 * - Artifacts may not appear on page load
 * - Artifacts may not appear in Silent Steward mode
 * - Artifacts may not appear without an accompanying message
 * - No generic "chart" or "dashboard" types allowed
 */

/** Allowed artifact types — each must justify its existence */
export type ArtifactType = 
  | 'system_timeline'       // Mini lifecycle visual for one system
  | 'comparison_table'      // Side-by-side options
  | 'cost_range'            // Budget ranges (Planning mode ONLY)
  | 'confidence_explainer'  // Why we believe what we believe
  | 'local_context';        // Climate/environmental data
  // NOTE: No generic "chart" or "dashboard" types allowed

export interface ChatArtifact {
  id: string;
  type: ArtifactType;
  /** ISO timestamp when artifact was summoned */
  summonedAt: string;
  /** REQUIRED: Artifact must be tied to a message */
  anchorMessageId: string;
  /** System key if artifact is system-specific */
  systemKey?: string;
  /** Raw data for rendering */
  data: Record<string, unknown>;
  /** Whether user has collapsed this artifact */
  collapsed?: boolean;
}

export interface ArtifactMessage {
  id: string;
  role: 'artifact';
  artifact: ChatArtifact;
}

/**
 * Check if artifact type is allowed in current mode
 */
export function isArtifactAllowedInMode(
  type: ArtifactType, 
  chatMode: string
): boolean {
  // cost_range only allowed in planning mode
  if (type === 'cost_range') {
    return chatMode === 'planning_window_advisory';
  }
  return true;
}
