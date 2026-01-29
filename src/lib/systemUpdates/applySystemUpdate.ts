import { supabase } from '@/integrations/supabase/client';
import { resolveFieldUpdates } from './resolveFieldUpdates';
import { buildChatSummary } from './chatSummaryBuilder';
import { isMeaningfulDelta } from './confidenceCalculator';
import { syncToCanonicalSystems, isCanonicalSystem, normalizeSystemKey } from './syncToCanonicalSystems';
import type { SystemUpdateSource, FieldProvenance } from './authority';
import type { Json } from '@/integrations/supabase/types';

export interface ApplySystemUpdateInput {
  home_id: string;
  system_key: string;
  source: SystemUpdateSource;
  extracted_data: {
    brand?: string;
    model?: string;
    serial?: string;
    manufacture_year?: number;
    capacity_rating?: string;
    fuel_type?: string;
    system_type?: string;
  };
  confidence_signal: {
    visual_certainty?: number;
    source_reliability: number;
  };
  image_url?: string;
}

export interface SystemUpdateResult {
  system_id: string;
  update_applied: boolean;
  confidence_delta: number;
  authority_applied: 'accepted' | 'merged' | 'held_for_confirmation';
  chat_summary: string;
  fields_updated: string[];
  fields_held: string[];
  should_trigger_mode_recompute: boolean;  // Medium #4: Gated by delta
}

/**
 * Generate deterministic unique system key.
 * Minor #7: Same home + type + brand = same key (prevents duplicates)
 */
function generateUniqueSystemKey(systemType: string, brand?: string): string {
  const brandSuffix = brand?.toLowerCase().replace(/\s+/g, '_') || '';
  const timestamp = Date.now().toString(36);
  return brandSuffix 
    ? `${systemType}_${brandSuffix}_${timestamp}` 
    : `${systemType}_${timestamp}`;
}

/**
 * Core System Update Gate
 * 
 * This is the ONLY entry point for system-grade data updates.
 * All sources (photos, manual confirmations, permits, inference) must pass through here.
 * 
 * Responsibilities:
 * 1. Find existing system of same type
 * 2. Resolve field updates with authority rules
 * 3. Persist to database (if approved)
 * 4. Return chat-safe summary
 * 5. Gate mode recompute on meaningful delta
 */
export async function applySystemUpdate(
  input: ApplySystemUpdateInput
): Promise<SystemUpdateResult> {
  const { home_id, system_key, source, extracted_data, confidence_signal, image_url } = input;

  // 1. Find existing system of same type
  const { data: existingSystems } = await supabase
    .from('home_systems')
    .select('*')
    .eq('home_id', home_id)
    .ilike('system_key', `${system_key}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  const existing = existingSystems?.[0] ?? null;
  
  // Critical #2 Fix: Read provenance from dedicated column, not nested source
  // Safe type conversion through unknown for JSON fields
  const existingProvenance = (existing?.field_provenance as unknown as Record<string, FieldProvenance>) ?? {};
  const existingFields: Record<string, unknown> = {
    brand: existing?.brand,
    model: existing?.model,
    serial: existing?.serial,
    manufacture_year: existing?.manufacture_year,
    capacity_rating: existing?.capacity_rating,
    fuel_type: existing?.fuel_type,
  };

  // 2. Resolve field updates with authority rules
  const resolved = resolveFieldUpdates({
    existingFields,
    existingProvenance,
    extractedData: extracted_data,
    source,
    confidenceSignal: confidence_signal,
  });

  // 3. Build chat summary (includes wasOverwrite for accurate messaging)
  const chatSummary = buildChatSummary({
    applied: resolved.updateApplied,
    held: resolved.requiresConfirmation,
    wasOverwrite: resolved.wasOverwrite,
    fieldsUpdated: resolved.fieldsUpdated,
    fieldsHeld: resolved.fieldsHeld,
    systemType: extracted_data.system_type || system_key,
    brand: extracted_data.brand,
  });

  // 4. If held for confirmation, return early (no DB write)
  if (!resolved.updateApplied && resolved.requiresConfirmation) {
    return {
      system_id: existing?.id ?? '',
      update_applied: false,
      confidence_delta: 0,
      authority_applied: 'held_for_confirmation',
      chat_summary: chatSummary,
      fields_updated: [],
      fields_held: resolved.fieldsHeld,
      should_trigger_mode_recompute: false,
    };
  }

  // 5. Persist to database
  let systemId = existing?.id;

  if (existing) {
    // Merge into existing record
    const existingImages = Array.isArray(existing.images) ? existing.images as string[] : [];
    const newImages = image_url 
      ? [...existingImages, image_url]
      : existingImages;

    const existingDataSources = Array.isArray(existing.data_sources) ? existing.data_sources : [];
    const existingConfidenceScores = existing.confidence_scores && typeof existing.confidence_scores === 'object' && !Array.isArray(existing.confidence_scores)
      ? existing.confidence_scores as Record<string, unknown>
      : {};
    const existingSource = existing.source && typeof existing.source === 'object' && !Array.isArray(existing.source)
      ? existing.source as Record<string, unknown>
      : {};

    // Critical #2 Fix: Write provenance to dedicated column
    await supabase
      .from('home_systems')
      .update({
        ...resolved.updatedFields,
        images: newImages,
        data_sources: [...new Set([...existingDataSources, source])],
        confidence_scores: { 
          ...existingConfidenceScores,
          overall: resolved.newConfidence 
        },
        field_provenance: resolved.updatedProvenance as unknown as Json,  // Dedicated column
        confidence_score: resolved.newConfidence,      // Convenience column
        last_updated_at: new Date().toISOString(),
        source: {
          ...existingSource,
          last_update_source: source,
          last_update_at: new Date().toISOString(),
        } as Json,
      })
      .eq('id', existing.id);
  } else {
    // Create new system record
    const { data: inserted } = await supabase
      .from('home_systems')
      .insert([{
        home_id,
        system_key: generateUniqueSystemKey(system_key, extracted_data.brand),
        ...resolved.updatedFields,
        images: image_url ? [image_url] : [],
        data_sources: [source],
        confidence_scores: { overall: resolved.newConfidence } as Json,
        field_provenance: resolved.updatedProvenance as unknown as Json,
        confidence_score: resolved.newConfidence,
        source: {
          original_type: system_key,
          last_update_source: source,
          last_update_at: new Date().toISOString(),
        } as Json,
      }])
      .select()
      .single();

    systemId = inserted?.id;
  }

  // 6. CANONICAL CONSISTENCY CONTRACT: Sync to 'systems' table for core systems
  // This ensures AI, capital-timeline, and intelligence-engine see the update
  const normalizedKey = normalizeSystemKey(system_key);
  if (isCanonicalSystem(system_key)) {
    console.log('[applySystemUpdate] Syncing to canonical systems table:', normalizedKey);
    
    const syncResult = await syncToCanonicalSystems({
      home_id,
      kind: normalizedKey as 'hvac' | 'roof' | 'water_heater',
      manufactureYear: extracted_data.manufacture_year,
      confidence: resolved.newConfidence,
      source,
      photoUrl: image_url,
    });
    
    console.log('[applySystemUpdate] Canonical sync result:', syncResult);
  }

  // Medium #4 Fix: Only trigger mode recompute if delta is meaningful
  const shouldTrigger = isMeaningfulDelta(resolved.confidenceDelta);

  // Critical #3 Fix: Use wasOverwrite for authority_applied
  const authorityApplied = resolved.wasOverwrite ? 'accepted' : 'merged';

  return {
    system_id: systemId!,
    update_applied: true,
    confidence_delta: resolved.confidenceDelta,
    authority_applied: authorityApplied,
    chat_summary: chatSummary,
    fields_updated: resolved.fieldsUpdated,
    fields_held: [],
    should_trigger_mode_recompute: shouldTrigger,
  };
}
