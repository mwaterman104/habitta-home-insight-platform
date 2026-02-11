/**
 * Home Confidence Computation Engine
 * 
 * Pure functions. No side effects. No UI coupling.
 * 
 * Measures: "How well-understood, documented, and actively managed is this home?"
 * Does NOT measure: home value, quality, age, cost, or condition.
 * 
 * Scoring Contract:
 * - Based on KEY_SYSTEMS only (hvac, roof, electrical, water_heater, plumbing)
 * - Each system contributes up to 20 points via boolean signals
 * - No stacking, no farming
 * - Freshness decay applied after normalization
 * - State label is primary, number is secondary
 */

import type { SystemTimelineEntry } from '@/types/capitalTimeline';
import { getSystemDisplayName } from '@/lib/mobileCopy';


// ============== Constants (Locked) ==============

export const KEY_SYSTEMS = ['hvac', 'roof', 'electrical', 'water_heater', 'plumbing'] as const;
export type KeySystem = typeof KEY_SYSTEMS[number];

const MAX_POINTS_PER_SYSTEM = 20;
const MAX_BASE_POINTS = KEY_SYSTEMS.length * MAX_POINTS_PER_SYSTEM; // 100

/** Systems where material is a meaningful distinguishing signal */
const MATERIAL_APPLICABLE_SYSTEMS: ReadonlySet<string> = new Set(['roof', 'plumbing']);

/** Systems assumed to be original to the home (install year = year_built) unless a permit or explicit user override exists */
const ORIGINAL_TO_HOME_SYSTEMS: ReadonlySet<string> = new Set(['electrical', 'plumbing']);

// ============== Types ==============

export interface SystemSignals {
  hasInstallYear: boolean;
  hasMaterial: boolean;
  hasSerial: boolean;
  hasPhoto: boolean;
  hasPermitOrInvoice: boolean;
  hasOwnerConfirmation: boolean;
  hasMaintenanceRecord: boolean;
  hasProfessionalService: boolean;
  hasMaintenanceNotes: boolean;
}

export type ConfidenceState = 'solid' | 'developing' | 'unclear' | 'at-risk';

export interface HomeConfidenceResult {
  score: number;
  state: ConfidenceState;
  stateMeaning: string;
  evidenceChips: string[];
  nextGain: {
    action: string;
    delta: number;
    systemKey?: string;
  } | null;
  breakdown: {
    documentation: number;
    maintenance: number;
    planning: number;
    freshness: number;
  };
}

export interface HomeAssetRecord {
  id: string;
  kind: string;
  serial: string | null;
  metadata: Record<string, unknown>;
  status: string;
  updated_at: string;
}

export interface HomeEventRecord {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  source: string;
  status: string;
  severity: string;
  metadata: Record<string, unknown>;
  asset_id: string | null;
  home_id: string;
  created_at: string;
}

// ============== Signal Point Values ==============

const SIGNAL_POINTS: Record<keyof SystemSignals, number> = {
  hasInstallYear: 6,
  hasMaterial: 3,
  hasSerial: 1,
  hasPhoto: 4,
  hasPermitOrInvoice: 2,
  hasOwnerConfirmation: 3,
  hasMaintenanceRecord: 2,
  hasProfessionalService: 1,
  hasMaintenanceNotes: 1,
};

// ============== State Mapping ==============

const STATE_MAP: Array<{ min: number; state: ConfidenceState; meaning: string }> = [
  { min: 80, state: 'solid', meaning: 'Most systems are understood and tracked' },
  { min: 55, state: 'developing', meaning: 'Key gaps exist, but nothing critical is hidden' },
  { min: 30, state: 'unclear', meaning: 'Too many unknowns to plan confidently' },
  { min: 0, state: 'at-risk', meaning: 'Major systems lack basic information' },
];

function getState(score: number): { state: ConfidenceState; meaning: string } {
  for (const entry of STATE_MAP) {
    if (score >= entry.min) return { state: entry.state, meaning: entry.meaning };
  }
  return STATE_MAP[STATE_MAP.length - 1];
}

// ============== Signal Derivation ==============

/**
 * Derive boolean signals for a single system.
 * Each signal contributes points exactly once.
 */
export function deriveSystemSignals(
  systemKind: string,
  system: SystemTimelineEntry | undefined,
  homeAssets: HomeAssetRecord[],
  homeEvents: HomeEventRecord[],
  yearBuilt?: number | null
): SystemSignals {
  // Filter assets and events for this system kind
  const systemAssets = homeAssets.filter(a => a.kind === systemKind && a.status === 'active');
  const systemEvents = homeEvents.filter(e => {
    // Match events by title/description containing the system kind or by asset_id
    const assetIds = systemAssets.map(a => a.id);
    if (e.asset_id && assetIds.includes(e.asset_id)) return true;
    const kindLower = systemKind.toLowerCase();
    const titleLower = (e.title || '').toLowerCase();
    return titleLower.includes(kindLower) || titleLower.includes(kindLower.replace('_', ' '));
  });

  const maintenanceEvents = systemEvents.filter(e => e.event_type === 'maintenance');

  return {
    hasInstallYear: system?.installYear != null || 
      (ORIGINAL_TO_HOME_SYSTEMS.has(systemKind) && yearBuilt != null),
    hasMaterial: MATERIAL_APPLICABLE_SYSTEMS.has(systemKind) 
      ? (system?.materialType != null && system.materialType !== 'unknown')
      : false,
    hasSerial: systemAssets.some(a => a.serial != null && a.serial.length > 0),
    hasPhoto: systemAssets.some(a => {
      const meta = a.metadata as Record<string, unknown>;
      return meta?.photo_url != null || meta?.has_photo === true;
    }),
    hasPermitOrInvoice: system?.installSource === 'permit',
    hasOwnerConfirmation: system?.installSource != null && 
      system.installSource !== 'inferred' && system.installSource !== 'unknown',
    hasMaintenanceRecord: maintenanceEvents.length > 0,
    hasProfessionalService: maintenanceEvents.some(e => {
      return e.source === 'professional' || 
        (e.metadata as Record<string, unknown>)?.professional === true;
    }),
    hasMaintenanceNotes: maintenanceEvents.some(e => e.description != null && e.description.length > 0),
  };
}

// ============== Scoring ==============

/**
 * Calculate points for a single system from its signals.
 * Returns clamped value (max 20).
 */
function scoreSystem(
  systemKind: string,
  signals: SystemSignals
): { total: number; documentation: number; maintenance: number; planning: number } {
  let documentation = 0;
  let maintenance = 0;
  let planning = 0;

  // Documentation signals
  if (signals.hasInstallYear) documentation += SIGNAL_POINTS.hasInstallYear;
  if (MATERIAL_APPLICABLE_SYSTEMS.has(systemKind) && signals.hasMaterial) {
    documentation += SIGNAL_POINTS.hasMaterial;
  }
  if (signals.hasSerial) documentation += SIGNAL_POINTS.hasSerial;
  if (signals.hasPhoto) documentation += SIGNAL_POINTS.hasPhoto;
  if (signals.hasPermitOrInvoice) documentation += SIGNAL_POINTS.hasPermitOrInvoice;

  // Owner confirmation (documentation-adjacent)
  if (signals.hasOwnerConfirmation) documentation += SIGNAL_POINTS.hasOwnerConfirmation;

  // Maintenance signals
  if (signals.hasMaintenanceRecord) maintenance += SIGNAL_POINTS.hasMaintenanceRecord;
  if (signals.hasProfessionalService) maintenance += SIGNAL_POINTS.hasProfessionalService;
  if (signals.hasMaintenanceNotes) maintenance += SIGNAL_POINTS.hasMaintenanceNotes;

  const total = Math.min(MAX_POINTS_PER_SYSTEM, documentation + maintenance + planning);
  return { total, documentation, maintenance, planning };
}

// ============== Freshness Decay ==============

function computeFreshnessDecay(lastTouchAt: Date | null): number {
  if (!lastTouchAt) return -10;
  
  const now = new Date();
  const monthsSinceTouch = (now.getTime() - lastTouchAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  if (monthsSinceTouch >= 36) return -10;
  if (monthsSinceTouch >= 18) return -5;
  return 0;
}

// ============== Evidence Chips ==============

function buildEvidenceChips(
  systemSignalsMap: Map<string, SystemSignals>
): string[] {
  const chips: string[] = [];
  
  let fullyDocumented = 0;
  let serviceConfirmed = 0;
  let replacementsAcknowledged = 0;

  for (const [kind, signals] of systemSignalsMap) {
    const docSignals = [signals.hasInstallYear, signals.hasOwnerConfirmation];
    if (MATERIAL_APPLICABLE_SYSTEMS.has(kind)) docSignals.push(signals.hasMaterial);
    if (docSignals.every(Boolean)) fullyDocumented++;
    if (signals.hasProfessionalService || signals.hasMaintenanceRecord) serviceConfirmed++;
    if (signals.hasOwnerConfirmation) replacementsAcknowledged++;
  }

  if (fullyDocumented > 0) {
    chips.push(`${fullyDocumented} system${fullyDocumented === 1 ? '' : 's'} documented`);
  }
  if (serviceConfirmed > 0) {
    chips.push(`${serviceConfirmed} service${serviceConfirmed === 1 ? '' : 's'} confirmed`);
  }
  if (replacementsAcknowledged > 0) {
    chips.push(`${replacementsAcknowledged} system${replacementsAcknowledged === 1 ? '' : 's'} confirmed`);
  }

  return chips.slice(0, 3);
}

// ============== Next Gain ==============

interface NextGainCandidate {
  action: string;
  delta: number;
  systemKey: string;
  priority: number; // higher = more impactful
}

function findNextGain(
  systemSignalsMap: Map<string, SystemSignals>,
  systems: SystemTimelineEntry[]
): HomeConfidenceResult['nextGain'] {
  const candidates: NextGainCandidate[] = [];

  const tierWeight = (kind: string): number => {
    return ['hvac', 'roof', 'electrical'].includes(kind) ? 1.0 : 0.7;
  };

  for (const [kind, signals] of systemSignalsMap) {
    const weight = tierWeight(kind);
    const displayName = getSystemDisplayName(kind);

    if (!signals.hasPhoto) {
      candidates.push({
        action: `Upload a photo of your ${displayName}`,
        delta: SIGNAL_POINTS.hasPhoto,
        systemKey: kind,
        priority: SIGNAL_POINTS.hasPhoto * weight * 1.2, // Boost photos as most accessible
      });
    }
    if (!signals.hasInstallYear) {
      candidates.push({
        action: `Confirm when your ${displayName} was installed`,
        delta: SIGNAL_POINTS.hasInstallYear,
        systemKey: kind,
        priority: SIGNAL_POINTS.hasInstallYear * weight,
      });
    }
    if (MATERIAL_APPLICABLE_SYSTEMS.has(kind) && !signals.hasMaterial) {
      candidates.push({
        action: `Confirm your ${displayName} material type`,
        delta: SIGNAL_POINTS.hasMaterial,
        systemKey: kind,
        priority: SIGNAL_POINTS.hasMaterial * weight,
      });
    }
    if (!signals.hasMaintenanceRecord) {
      candidates.push({
        action: `Log a ${displayName} service visit`,
        delta: SIGNAL_POINTS.hasMaintenanceRecord,
        systemKey: kind,
        priority: SIGNAL_POINTS.hasMaintenanceRecord * weight,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.priority - a.priority);
  const best = candidates[0];
  return { action: best.action, delta: best.delta, systemKey: best.systemKey };
}

// ============== Main Computation ==============

export function computeHomeConfidence(
  systems: SystemTimelineEntry[],
  homeAssets: HomeAssetRecord[],
  homeEvents: HomeEventRecord[],
  lastTouchAt: Date | null,
  yearBuilt?: number | null
): HomeConfidenceResult {
  // Filter to key systems only
  const keySystems = systems.filter(s => (KEY_SYSTEMS as readonly string[]).includes(s.systemId));

  const systemSignalsMap = new Map<string, SystemSignals>();
  let totalDoc = 0;
  let totalMaint = 0;
  let totalPlan = 0;
  let earnedPoints = 0;

  // Score each key system (even if not present in data, we still evaluate)
  for (const kind of KEY_SYSTEMS) {
    const system = keySystems.find(s => s.systemId === kind);
    const signals = deriveSystemSignals(kind, system, homeAssets, homeEvents, yearBuilt);
    systemSignalsMap.set(kind, signals);

    const result = scoreSystem(kind, signals);
    earnedPoints += result.total;
    totalDoc += result.documentation;
    totalMaint += result.maintenance;
    totalPlan += result.planning;
  }

  // Normalize to 0-100
  const normalizedScore = Math.min(100, Math.round((earnedPoints / MAX_BASE_POINTS) * 100));

  // Apply freshness decay
  const freshnessDecay = computeFreshnessDecay(lastTouchAt);
  const finalScore = Math.max(0, normalizedScore + freshnessDecay);

  // State mapping
  const { state, meaning } = getState(finalScore);

  // Evidence chips
  const evidenceChips = buildEvidenceChips(systemSignalsMap);

  // Next gain
  const nextGain = findNextGain(systemSignalsMap, systems);

  return {
    score: finalScore,
    state,
    stateMeaning: meaning,
    evidenceChips,
    nextGain,
    breakdown: {
      documentation: totalDoc,
      maintenance: totalMaint,
      planning: totalPlan,
      freshness: freshnessDecay,
    },
  };
}
