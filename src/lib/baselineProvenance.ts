/**
 * Baseline Provenance — Epistemic Coherence Layer
 * 
 * CANONICAL RULE:
 * "Habitta may infer, but it must label inference as inference.
 *  It may not deny its own visible evidence."
 * 
 * This module determines the source of the baseline (inferred vs confirmed)
 * and ensures the chat never contradicts visible evidence.
 */

import type { BaselineSystem } from '@/components/dashboard-v3/BaselineSurface';

// ============================================
// Types
// ============================================

/**
 * Baseline source determines how data was obtained:
 * - 'inferred': Derived from property age, region, typical lifespans
 * - 'partial': Some systems confirmed, some inferred
 * - 'confirmed': User-verified or permit-verified data
 */
export type BaselineSource = 'inferred' | 'partial' | 'confirmed';

/**
 * A system visible in the baseline for chat context
 */
export interface VisibleBaselineSystem {
  key: string;
  displayName: string;
  state: 'stable' | 'planning_window' | 'elevated' | 'baseline_incomplete';
}

/**
 * Confirmed system from database
 */
export interface ConfirmedSystem {
  system_key: string;
  data_sources?: string[];
  confidence_score?: number;
}

// ============================================
// Provenance Computation
// ============================================

/**
 * Compute the baseline source based on confirmed vs inferred systems.
 * 
 * Rules:
 * - 'inferred' → No confirmed systems, but inferred baseline visible
 * - 'partial' → Some confirmed, some still inferred
 * - 'confirmed' → All visible systems have been confirmed
 */
export function computeBaselineSource(
  confirmedSystems: ConfirmedSystem[],
  inferredSystems: BaselineSystem[]
): BaselineSource {
  // Count systems with verified sources
  const confirmedCount = confirmedSystems.filter(s => {
    const sources = s.data_sources ?? [];
    return sources.some(d => 
      d.includes('permit') || 
      d.includes('owner') || 
      d.includes('user') ||
      d.includes('photo')
    );
  }).length;

  // Determine source based on counts
  if (confirmedCount === 0 && inferredSystems.length > 0) {
    return 'inferred';
  }
  
  if (confirmedCount > 0 && confirmedCount < inferredSystems.length) {
    return 'partial';
  }
  
  if (confirmedCount >= inferredSystems.length && confirmedCount > 0) {
    return 'confirmed';
  }
  
  // Default to inferred if we have any visible baseline
  return 'inferred';
}

/**
 * Transform baseline systems to visible format for AI context
 */
export function mapToVisibleBaseline(
  systems: BaselineSystem[]
): VisibleBaselineSystem[] {
  return systems.map(s => ({
    key: s.key,
    displayName: s.displayName,
    state: s.state,
  }));
}

// ============================================
// Confidence Constraints by Source
// ============================================

/**
 * Maximum confidence level allowed based on baseline source.
 * 
 * Rules:
 * - Inferred baseline caps at 'Moderate'
 * - Partial baseline caps at 'Moderate' 
 * - Confirmed baseline can reach 'High'
 */
export function getMaxConfidenceForSource(
  source: BaselineSource
): 'Unknown' | 'Early' | 'Moderate' | 'High' {
  switch (source) {
    case 'inferred':
      return 'Moderate';
    case 'partial':
      return 'Moderate';
    case 'confirmed':
      return 'High';
    default:
      return 'Moderate';
  }
}

/**
 * Clamp confidence level to the maximum allowed by baseline source
 */
export function clampConfidenceToSource(
  confidence: 'Unknown' | 'Early' | 'Moderate' | 'High',
  source: BaselineSource
): 'Unknown' | 'Early' | 'Moderate' | 'High' {
  const maxConfidence = getMaxConfidenceForSource(source);
  
  const levels = ['Unknown', 'Early', 'Moderate', 'High'] as const;
  const currentIndex = levels.indexOf(confidence);
  const maxIndex = levels.indexOf(maxConfidence);
  
  if (currentIndex > maxIndex) {
    return maxConfidence;
  }
  
  return confidence;
}

// ============================================
// Chat Context Builder
// ============================================

/**
 * Build baseline context for AI prompt injection
 */
export function buildBaselineContextForAI(
  source: BaselineSource,
  visibleSystems: VisibleBaselineSystem[]
): {
  baselineSource: BaselineSource;
  visibleBaseline: VisibleBaselineSystem[];
  contextPrompt: string;
} {
  let contextPrompt: string;

  switch (source) {
    case 'inferred':
      contextPrompt = `BASELINE CONTEXT:
The user sees an INFERRED baseline above. It is derived from property age, location, and typical system lifespans.
Do NOT say you have "no information" or that you have a "blank slate."
Acknowledge what is visible. Label estimates as estimates.`;
      break;
      
    case 'partial':
      contextPrompt = `BASELINE CONTEXT:
The user sees a PARTIALLY confirmed baseline. Some systems are confirmed by user input or permits, some are inferred.
Reference both confirmed data (with confidence) and inferred estimates (with appropriate hedging).`;
      break;
      
    case 'confirmed':
      contextPrompt = `BASELINE CONTEXT:
The baseline is CONFIRMED through user input, permits, or photo analysis.
You can be specific about timelines and provide confident recommendations.`;
      break;
  }

  // Add visible systems to context
  if (visibleSystems.length > 0) {
    contextPrompt += `\n\nVISIBLE SYSTEMS (user can see these above):
${visibleSystems.map(s => `- ${s.displayName}: ${formatStateForAI(s.state)}`).join('\n')}`;
  }

  contextPrompt += `\n\nHARD RULE: Never contradict what is visible. If systems appear above, acknowledge them.`;

  return {
    baselineSource: source,
    visibleBaseline: visibleSystems,
    contextPrompt,
  };
}

/**
 * Format system state for AI context
 */
function formatStateForAI(state: VisibleBaselineSystem['state']): string {
  switch (state) {
    case 'stable':
      return 'Stable (within expected range)';
    case 'planning_window':
      return 'Planning Window (approaching replacement timeframe)';
    case 'elevated':
      return 'Elevated (warrants attention)';
    case 'baseline_incomplete':
      return 'Establishing baseline (low confidence)';
    default:
      return 'Unknown';
  }
}
