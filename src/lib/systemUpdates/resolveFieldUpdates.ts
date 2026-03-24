import { AUTHORITY_RANK, type SystemUpdateSource, type FieldProvenance } from './authority';
import { FIELD_WEIGHTS, calculateSystemConfidence } from './confidenceCalculator';

export interface ResolveInput {
  existingFields: Record<string, any>;
  existingProvenance: Record<string, FieldProvenance>;
  extractedData: Record<string, any>;
  source: SystemUpdateSource;
  confidenceSignal: {
    visual_certainty?: number;
    source_reliability: number;
  };
}

export interface ResolveResult {
  updateApplied: boolean;
  wasOverwrite: boolean;  // Critical #3: Explicitly tracked
  requiresConfirmation: boolean;
  updatedFields: Record<string, any>;
  updatedProvenance: Record<string, FieldProvenance>;
  fieldsUpdated: string[];
  fieldsHeld: string[];
  confidenceDelta: number;
  newConfidence: number;
}

/**
 * Resolve field-level updates using authority precedence rules.
 * 
 * Rules:
 * 1. If no existing value → Accept new value
 * 2. If incoming authority > existing authority → Overwrite
 * 3. If incoming authority < existing authority → Ignore (preserve existing)
 * 4. If same authority but different value → Hold for confirmation
 * 
 * Critical #3 Fix: Explicitly tracks wasOverwrite for accurate authority_applied reporting.
 */
export function resolveFieldUpdates(input: ResolveInput): ResolveResult {
  const { existingFields, existingProvenance, extractedData, source, confidenceSignal } = input;
  
  const updatedFields: Record<string, any> = {};
  const updatedProvenance: Record<string, FieldProvenance> = { ...existingProvenance };
  const fieldsUpdated: string[] = [];
  const fieldsHeld: string[] = [];
  
  let applied = false;
  let wasOverwrite = false;  // Critical #3: Track if we're overwriting existing data
  let held = false;

  const incomingRank = AUTHORITY_RANK[source];
  const incomingConfidence = confidenceSignal.visual_certainty ?? confidenceSignal.source_reliability;

  // Only process fields that have weights (system-grade fields)
  const relevantFields = Object.keys(FIELD_WEIGHTS);
  
  Object.entries(extractedData).forEach(([field, value]) => {
    // Skip undefined, null, or non-system-grade fields
    if (value === undefined || value === null) return;
    if (!relevantFields.includes(field) && field !== 'system_type') return;

    const current = existingProvenance[field];
    const currentRank = current ? AUTHORITY_RANK[current.source] : 0;
    const existingValue = existingFields[field];

    if (!current || incomingRank > currentRank) {
      // Accept: new field or higher authority
      updatedFields[field] = value;
      updatedProvenance[field] = {
        source,
        confidence: incomingConfidence,
        updated_at: new Date().toISOString(),
      };
      fieldsUpdated.push(field);
      applied = true;
      
      // Critical #3: Mark as overwrite if existing value existed
      if (existingValue !== undefined && existingValue !== null) {
        wasOverwrite = true;
      }
    } else if (incomingRank === currentRank && value !== existingValue) {
      // Same authority, different value → hold for confirmation
      fieldsHeld.push(field);
      held = true;
    }
    // Lower authority → silently ignore (no action needed)
  });

  // Calculate confidence scores
  const oldConfidence = calculateSystemConfidence(existingProvenance);
  const newConfidence = calculateSystemConfidence(updatedProvenance);
  const confidenceDelta = newConfidence - oldConfidence;

  return {
    updateApplied: applied,
    wasOverwrite,  // Critical #3: Return it
    requiresConfirmation: held && !applied,
    updatedFields,
    updatedProvenance,
    fieldsUpdated,
    fieldsHeld,
    confidenceDelta,
    newConfidence,
  };
}
