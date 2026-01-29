/**
 * Canonical Consistency Contract: Sync to systems table
 * 
 * This module ensures photo analysis and other system updates land in the
 * canonical 'systems' table (not just 'home_systems'), so that:
 * - capital-timeline sees the data
 * - intelligence-engine sees the data
 * - AI chat context reflects accurate state
 * 
 * AUTHORITY HIERARCHY (preserved):
 * permit_verified (0.85) > inspection (0.75) > owner_reported (0.60-0.70) > heuristic (0.30)
 * 
 * Photo evidence CANNOT overwrite permit-verified data.
 * Photo evidence CAN upgrade heuristic data.
 */

import { supabase } from '@/integrations/supabase/client';
import type { SystemUpdateSource } from './authority';
import type { Json } from '@/integrations/supabase/types';

// Core systems that should sync to canonical table
export const CANONICAL_SYSTEMS = ['hvac', 'roof', 'water_heater'] as const;
type CanonicalSystemKind = typeof CANONICAL_SYSTEMS[number];

export interface SyncToCanonicalInput {
  home_id: string;
  kind: CanonicalSystemKind;
  manufactureYear?: number;
  confidence: number;
  source: SystemUpdateSource;
  photoUrl?: string;
}

export interface SyncToCanonicalResult {
  synced: boolean;
  reason: 'higher_authority_exists' | 'duplicate_photo' | 'synced' | 'created' | 'no_data';
  systemId?: string;
}

/**
 * Authority ranking for install_source values in the canonical systems table.
 * Higher = more authoritative.
 */
const INSTALL_SOURCE_PRIORITY: Record<string, number> = {
  permit: 4,          // From permit records
  permit_verified: 4, // Alias
  inspection: 3,      // Professional inspection
  user: 2,            // Owner-reported
  owner_reported: 2,  // Alias
  inferred: 1,        // Heuristic/age-based
  heuristic: 1,       // Alias
};

/**
 * Map SystemUpdateSource to canonical install_source value.
 */
function mapToInstallSource(source: SystemUpdateSource): string {
  switch (source) {
    case 'photo_analysis':
      return 'user'; // Photos are user-provided evidence
    case 'user_confirmed':
      return 'user';
    case 'permit_record':
      return 'permit';
    case 'professional_override':
      return 'inspection';
    case 'inferred':
    default:
      return 'inferred';
  }
}

/**
 * Check if incoming source can overwrite existing source.
 */
function canOverwrite(existing: string | null, incoming: string): boolean {
  const existingPriority = existing ? INSTALL_SOURCE_PRIORITY[existing] || 0 : 0;
  const incomingPriority = INSTALL_SOURCE_PRIORITY[incoming] || 0;
  // Allow overwrite if incoming is >= existing (same authority can update)
  return incomingPriority >= existingPriority;
}

/**
 * Infer install year from manufacture year with guardrails.
 * 
 * RULE: manufacture_year ≠ install_year
 * Units can sit in inventory 1-3 years before installation.
 */
interface InferInstallYearResult {
  year: number | null;
  isEstimated: boolean;
  basis: 'serial_decode' | 'manufacture_year' | 'unknown';
}

function inferInstallYear(manufactureYear?: number, confidence?: number): InferInstallYearResult {
  if (!manufactureYear) {
    return { year: null, isEstimated: true, basis: 'unknown' };
  }
  
  // If high confidence (serial decode worked), trust manufacture year exactly
  if (confidence && confidence >= 0.7) {
    return { year: manufactureYear, isEstimated: false, basis: 'serial_decode' };
  }
  
  // Otherwise, add 1 year buffer (median inventory time)
  return { 
    year: manufactureYear + 1, 
    isEstimated: true, 
    basis: 'manufacture_year' 
  };
}

/**
 * Generate idempotency hash for photo processing.
 * Prevents duplicate confidence inflation from the same photo.
 */
function generatePhotoHash(photoUrl: string, systemKind: string): string {
  const combined = `${photoUrl}:${systemKind}`;
  // Simple base64 hash truncated for storage
  return btoa(combined).substring(0, 24);
}

/**
 * Sync photo analysis data to the canonical 'systems' table.
 * 
 * This ensures the AI, capital timeline, and intelligence engine
 * all see the same system data.
 */
export async function syncToCanonicalSystems(
  input: SyncToCanonicalInput
): Promise<SyncToCanonicalResult> {
  const { home_id, kind, manufactureYear, confidence, source, photoUrl } = input;
  
  // Map to canonical install_source
  const installSource = mapToInstallSource(source);
  
  console.log('[syncToCanonical] Starting sync:', { home_id, kind, source, installSource, manufactureYear });
  
  // 1. Check existing record
  const { data: existing, error: fetchError } = await supabase
    .from('systems')
    .select('id, install_source, confidence, raw_data')
    .eq('home_id', home_id)
    .ilike('kind', kind)
    .maybeSingle();
    
  if (fetchError) {
    console.error('[syncToCanonical] Error fetching existing system:', fetchError);
    return { synced: false, reason: 'no_data' };
  }
  
  // 2. Check authority hierarchy - don't overwrite higher authority
  if (existing && !canOverwrite(existing.install_source, installSource)) {
    console.log('[syncToCanonical] Skipping - existing has higher authority:', {
      existing: existing.install_source,
      incoming: installSource,
    });
    return { synced: false, reason: 'higher_authority_exists', systemId: existing.id };
  }
  
  // 3. Check for duplicate photo processing (idempotency)
  if (photoUrl && existing) {
    const photoHash = generatePhotoHash(photoUrl, kind);
    const rawData = existing.raw_data as Record<string, unknown> | null;
    const previousHashes = (rawData?.processed_photo_hashes as string[]) || [];
    
    if (previousHashes.includes(photoHash)) {
      console.log('[syncToCanonical] Skipping duplicate photo processing');
      return { synced: false, reason: 'duplicate_photo', systemId: existing.id };
    }
  }
  
  // 4. Infer install year with guardrails
  const inferredYear = inferInstallYear(manufactureYear, confidence);
  
  // 5. Prepare photo hash for idempotency tracking
  const newPhotoHash = photoUrl ? generatePhotoHash(photoUrl, kind) : null;
  
  if (existing) {
    // UPDATE existing record
    const rawData = (existing.raw_data as Record<string, unknown>) || {};
    const previousHashes = (rawData.processed_photo_hashes as string[]) || [];
    
    const updatePayload: Record<string, unknown> = {
      install_source: installSource,
      confidence: Math.max(confidence, existing.confidence || 0), // Never decrease confidence
      updated_at: new Date().toISOString(),
    };
    
    // Only update install_year if we have a valid inferred year
    if (inferredYear.year !== null) {
      updatePayload.install_year = inferredYear.year;
    }
    
    // Append photo hash for idempotency
    if (newPhotoHash) {
      updatePayload.raw_data = {
        ...rawData,
        processed_photo_hashes: [...previousHashes, newPhotoHash],
        last_photo_analysis_at: new Date().toISOString(),
        install_year_estimated: inferredYear.isEstimated,
        install_year_basis: inferredYear.basis,
      } as Json;
    }
    
    const { error: updateError } = await supabase
      .from('systems')
      .update(updatePayload)
      .eq('id', existing.id);
      
    if (updateError) {
      console.error('[syncToCanonical] Error updating system:', updateError);
      return { synced: false, reason: 'no_data', systemId: existing.id };
    }
    
    console.log('[syncToCanonical] Updated existing system:', existing.id);
    return { synced: true, reason: 'synced', systemId: existing.id };
  } else {
    // CREATE new record
    // Get user_id from home
    const { data: home, error: homeError } = await supabase
      .from('homes')
      .select('user_id')
      .eq('id', home_id)
      .single();
      
    if (homeError || !home?.user_id) {
      console.error('[syncToCanonical] Error fetching home for user_id:', homeError);
      return { synced: false, reason: 'no_data' };
    }
    
    const insertPayload: Record<string, unknown> = {
      home_id,
      user_id: home.user_id,
      kind,
      install_source: installSource,
      confidence,
      status: 'ACTIVE',
    };
    
    if (inferredYear.year !== null) {
      insertPayload.install_year = inferredYear.year;
    }
    
    if (newPhotoHash) {
      insertPayload.raw_data = {
        processed_photo_hashes: [newPhotoHash],
        last_photo_analysis_at: new Date().toISOString(),
        install_year_estimated: inferredYear.isEstimated,
        install_year_basis: inferredYear.basis,
      } as Json;
    }
    
    const { data: inserted, error: insertError } = await supabase
      .from('systems')
      .insert([{
        home_id,
        user_id: home.user_id,
        kind,
        install_source: installSource,
        confidence,
        status: 'ACTIVE',
        install_year: inferredYear.year ?? undefined,
        raw_data: insertPayload.raw_data as Json | undefined,
      }])
      .select('id')
      .single();
      
    if (insertError) {
      console.error('[syncToCanonical] Error creating system:', insertError);
      return { synced: false, reason: 'no_data' };
    }
    
    console.log('[syncToCanonical] Created new system:', inserted?.id);
    return { synced: true, reason: 'created', systemId: inserted?.id };
  }
}

/**
 * Check if a system key maps to a canonical system type.
 */
export function isCanonicalSystem(systemKey: string): boolean {
  const normalized = normalizeSystemKey(systemKey);
  return (CANONICAL_SYSTEMS as readonly string[]).includes(normalized);
}

/**
 * Normalize system key to canonical form.
 * e.g., "water_heater_rheem_abc123" → "water_heater"
 */
export function normalizeSystemKey(systemKey: string): string {
  const lower = systemKey.toLowerCase();
  
  if (lower.includes('hvac') || lower.includes('furnace') || lower.includes('air_condition')) {
    return 'hvac';
  }
  if (lower.includes('roof') || lower.includes('shingle')) {
    return 'roof';
  }
  if (lower.includes('water_heater') || lower.includes('waterheater')) {
    return 'water_heater';
  }
  
  // Return first segment as fallback
  return lower.split('_')[0];
}
