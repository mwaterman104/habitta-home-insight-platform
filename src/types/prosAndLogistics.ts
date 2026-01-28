/**
 * Pros & Logistics Type System
 * 
 * CANONICAL DOCTRINE:
 * Habitta is an advisor, not a broker.
 * Pros are presented as orientation support, not sales.
 * 
 * CONSTRAINTS:
 * - User must explicitly request options
 * - Baseline must be complete
 * - Only in planning_window_advisory or elevated_attention modes
 * - Maximum 3 options
 * - Always dismissible
 * - Never rendered as artifacts (they are offers, not evidence)
 */

import type { ChatMode } from '@/types/chatMode';

export interface ProOption {
  id: string;
  type: 'contractor' | 'financing' | 'material_supplier';
  name: string;
  /** Brief description, no marketing language */
  summary: string;
  /** Estimated cost range (if applicable) */
  costRange?: { low: number; high: number };
  /** Distance from property (km) */
  distanceKm?: number;
}

export interface ServiceOptionsContext {
  /** Current chat mode - must be planning or elevated */
  chatMode: ChatMode;
  /** 
   * System being discussed
   * 
   * CANONICAL RULE:
   * Service options may only be offered for the currently discussed system.
   * No cross-system bundling or upsell.
   */
  systemKey: string;
  /** Whether baseline is complete (required for pros) */
  isBaselineComplete: boolean;
  /** REQUIRED: User must explicitly request options */
  userRequested: boolean;
}

/**
 * Check if service options can be shown
 * 
 * All conditions must be true:
 * 1. User explicitly requested
 * 2. Baseline is complete
 * 3. Mode is planning or elevated
 */
export function canShowServiceOptions(context: ServiceOptionsContext): boolean {
  return (
    context.userRequested &&
    context.isBaselineComplete &&
    (context.chatMode === 'planning_window_advisory' || context.chatMode === 'elevated_attention')
  );
}

/**
 * Maximum options to display
 * More than 3 feels like shopping, not support.
 */
export const MAX_SERVICE_OPTIONS = 3;
