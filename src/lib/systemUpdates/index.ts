/**
 * System Update Contract
 * 
 * This module provides the non-bypassable gate for all system-grade data updates.
 * 
 * Core Principle: If data can change confidence, mode, recommendations, or lifespan
 * modeling — it must go through applySystemUpdate(). No exceptions.
 * 
 * Inputs that must use this gate:
 * - Photo analysis
 * - Manual user confirmations
 * - Permit ingestion
 * - Professional verification (future)
 * - User corrections
 * 
 * Authority Hierarchy (highest to lowest):
 * 1. professional_override
 * 2. user_confirmed
 * 3. photo_analysis
 * 4. permit_record
 * 5. inferred
 */

export { applySystemUpdate } from './applySystemUpdate';
export type { ApplySystemUpdateInput, SystemUpdateResult } from './applySystemUpdate';
export type { SystemUpdateSource, FieldProvenance } from './authority';
export { AUTHORITY_RANK } from './authority';
export { calculateSystemConfidence, isMeaningfulDelta, MINIMUM_MEANINGFUL_DELTA, FIELD_WEIGHTS } from './confidenceCalculator';
export { buildChatSummary, buildAnalysisFailedSummary, buildNoSystemDetectedSummary } from './chatSummaryBuilder';
export { resolveFieldUpdates } from './resolveFieldUpdates';
export type { ResolveInput, ResolveResult } from './resolveFieldUpdates';
