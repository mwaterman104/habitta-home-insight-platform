/**
 * Artifact Components - Barrel Export
 * 
 * ARTIFACT BEHAVIORAL CONTRACT:
 * - Artifacts are chat-summoned evidence, not dashboard widgets
 * - They prove the chat earned the right to speak
 * - They don't live anywhere — they were brought here
 * 
 * VALIDATION FIRST DOCTRINE:
 * - system_validation_evidence artifacts are injected BEFORE AI responses
 * - Visual evidence precedes explanation for "Why?" queries
 */

export { InlineArtifact } from './InlineArtifact';
export { SystemTimelineArtifact } from './SystemTimelineArtifact';
export { SystemAgingProfileArtifact } from './SystemAgingProfileArtifact';
export type { SystemAgingProfileData } from './SystemAgingProfileArtifact';
export { SystemValidationEvidenceArtifact } from './SystemValidationEvidenceArtifact';
export type { SystemValidationEvidenceData } from './SystemValidationEvidenceArtifact';
