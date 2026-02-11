/**
 * Recommendation Engine
 * 
 * Deterministic, four-pass generator.
 * Surfaces the top 3 highest-leverage actions to increase Home Confidence.
 * 
 * RULES:
 * - Recommendations must reduce uncertainty or increase readiness
 * - Max 3 visible at once
 * - No urgency, no scare language, no spending suggestions
 * - Each recommendation maps to a real route
 * - Dismissal has no penalty
 */

import type { SystemTimelineEntry } from '@/types/capitalTimeline';
import {
  KEY_SYSTEMS,
  deriveSystemSignals,
  type HomeAssetRecord,
  type HomeEventRecord,
  type SystemSignals,
} from './homeConfidence';
import { getSystemDisplayName } from '@/lib/mobileCopy';
import { getRemainingYearsForSystem } from './homeOutlook';

// ============== Types ==============

export interface Recommendation {
  id: string;
  type: 'documentation' | 'maintenance' | 'planning' | 'freshness';
  systemId?: string;
  title: string;
  rationale: string;
  confidenceDelta: number;
  priorityScore: number;
  actionType: string;
  route: string;
}

// ============== Constants ==============

const MAX_RECOMMENDATIONS = 3;

const SYSTEM_TIER_WEIGHT: Record<string, number> = {
  hvac: 1.0,
  roof: 1.0,
  electrical: 1.0,
  water_heater: 0.7,
  plumbing: 0.7,
};

const SIGNAL_DELTAS: Record<string, number> = {
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

// ============== Action Routing ==============

function getRoute(actionType: string, systemKey?: string): string {
  switch (actionType) {
    case 'add_year':
    case 'upload_doc':
    case 'upload_photo':
    case 'add_serial':
    case 'confirm_material':
      return systemKey ? `/systems/${systemKey}` : '/home-profile';
    case 'log_maintenance':
    case 'acknowledge':
      return systemKey ? `/systems/${systemKey}/plan` : '/home-profile';
    case 'review_freshness':
      return '/home-profile';
    default:
      return '/home-profile';
  }
}

// ============== Rationale Templates ==============

const RATIONALE: Record<string, (name: string) => string> = {
  add_year: (name) => `Knowing the ${name} installation year improves replacement planning accuracy`,
  upload_doc: (name) => `A permit or invoice for your ${name} strengthens data confidence`,
  upload_photo: (name) => `A photo helps verify ${name} condition and age`,
  add_serial: (name) => `Adding the ${name} serial number enables warranty and recall tracking`,
  confirm_material: (name) => `Confirming ${name} material improves lifespan estimates`,
  log_maintenance: (name) => `Logging ${name} service confirms active maintenance`,
  acknowledge: (name) => `Acknowledging ${name} replacement window reduces surprise risk`,
};

// ============== Uncertainty Multiplier ==============

function getUncertaintyMultiplier(signals: SystemSignals): number {
  const allSignals = Object.values(signals);
  const missingCount = allSignals.filter(v => !v).length;
  return 1 + (missingCount / allSignals.length) * 0.5;
}

// ============== Generation Passes ==============

function passDocumentation(
  systems: SystemTimelineEntry[],
  signalsMap: Map<string, SystemSignals>,
  dismissedIds: Set<string>
): Recommendation[] {
  const recs: Recommendation[] = [];

  const docChecks: Array<{
    signal: keyof SystemSignals;
    actionType: string;
    materialOnly?: boolean;
  }> = [
    { signal: 'hasInstallYear', actionType: 'add_year' },
    { signal: 'hasPermitOrInvoice', actionType: 'upload_doc' },
    { signal: 'hasMaterial', actionType: 'confirm_material', materialOnly: true },
    { signal: 'hasPhoto', actionType: 'upload_photo' },
    { signal: 'hasSerial', actionType: 'add_serial' },
  ];

  for (const kind of KEY_SYSTEMS) {
    const signals = signalsMap.get(kind);
    if (!signals) continue;

    const tierWeight = SYSTEM_TIER_WEIGHT[kind] ?? 0.7;
    const uncertainty = getUncertaintyMultiplier(signals);
    const displayName = getSystemDisplayName(kind);

    for (const check of docChecks) {
      if (check.materialOnly && !['roof', 'plumbing'].includes(kind)) continue;
      if (signals[check.signal]) continue;

      const id = `documentation:${kind}:${check.signal}`;
      if (dismissedIds.has(id)) continue;

      const delta = SIGNAL_DELTAS[check.signal] ?? 2;
      recs.push({
        id,
        type: 'documentation',
        systemId: kind,
        title: (RATIONALE[check.actionType] ? `Add ${displayName} ${check.actionType.replace('_', ' ')}` : `Document ${displayName}`).replace(/^Add .+ add /, 'Add '),
        rationale: RATIONALE[check.actionType]?.(displayName.toLowerCase()) ?? `Improves ${displayName} data quality`,
        confidenceDelta: delta,
        priorityScore: delta * tierWeight * uncertainty,
        actionType: check.actionType,
        route: getRoute(check.actionType, kind),
      });
    }
  }

  return recs;
}

function passMaintenance(
  systems: SystemTimelineEntry[],
  signalsMap: Map<string, SystemSignals>,
  dismissedIds: Set<string>
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const kind of KEY_SYSTEMS) {
    const signals = signalsMap.get(kind);
    if (!signals || signals.hasMaintenanceRecord) continue;

    const id = `maintenance:${kind}:hasMaintenanceRecord`;
    if (dismissedIds.has(id)) continue;

    const tierWeight = SYSTEM_TIER_WEIGHT[kind] ?? 0.7;
    const uncertainty = getUncertaintyMultiplier(signals);
    const displayName = getSystemDisplayName(kind);
    const delta = SIGNAL_DELTAS.hasMaintenanceRecord;

    recs.push({
      id,
      type: 'maintenance',
      systemId: kind,
      title: `Log recent ${displayName} service`,
      rationale: RATIONALE.log_maintenance(displayName.toLowerCase()),
      confidenceDelta: delta,
      priorityScore: delta * tierWeight * uncertainty,
      actionType: 'log_maintenance',
      route: getRoute('log_maintenance', kind),
    });
  }

  return recs;
}

function passPlanning(
  systems: SystemTimelineEntry[],
  signalsMap: Map<string, SystemSignals>,
  dismissedIds: Set<string>
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const kind of KEY_SYSTEMS) {
    const system = systems.find(s => s.systemId === kind);
    if (!system) continue;

    const remaining = getRemainingYearsForSystem(system);
    if (remaining === null || remaining > 2) continue; // Only late-life

    const signals = signalsMap.get(kind);
    if (!signals || signals.hasOwnerConfirmation) continue;

    const id = `planning:${kind}:hasOwnerConfirmation`;
    if (dismissedIds.has(id)) continue;

    const tierWeight = SYSTEM_TIER_WEIGHT[kind] ?? 0.7;
    const uncertainty = getUncertaintyMultiplier(signals);
    const displayName = getSystemDisplayName(kind);
    const delta = SIGNAL_DELTAS.hasOwnerConfirmation;

    recs.push({
      id,
      type: 'planning',
      systemId: kind,
      title: `Confirm ${displayName} details`,
      rationale: RATIONALE.acknowledge(displayName.toLowerCase()),
      confidenceDelta: delta,
      priorityScore: delta * tierWeight * uncertainty,
      actionType: 'acknowledge',
      route: getRoute('acknowledge', kind),
    });
  }

  return recs;
}

function passFreshness(
  lastTouchAt: Date | null,
  dismissedIds: Set<string>
): Recommendation[] {
  if (!lastTouchAt) {
    const id = 'freshness:home:dataFreshness';
    if (dismissedIds.has(id)) return [];
    return [{
      id,
      type: 'freshness',
      title: 'Review and confirm home details',
      rationale: 'Confirming your home profile keeps planning data current',
      confidenceDelta: 5,
      priorityScore: 3.5,
      actionType: 'review_freshness',
      route: getRoute('review_freshness'),
    }];
  }

  const monthsSince = (Date.now() - lastTouchAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsSince < 18) return [];

  const id = 'freshness:home:dataFreshness';
  if (dismissedIds.has(id)) return [];

  return [{
    id,
    type: 'freshness',
    title: 'Review and confirm home details',
    rationale: 'Your home record may be drifting from reality — a quick review keeps confidence accurate',
    confidenceDelta: 5,
    priorityScore: 3.5,
    actionType: 'review_freshness',
    route: getRoute('review_freshness'),
  }];
}

// ============== Main Generator ==============

export function generateRecommendations(
  systems: SystemTimelineEntry[],
  homeAssets: HomeAssetRecord[],
  homeEvents: HomeEventRecord[],
  dismissedIds: string[],
  lastTouchAt: Date | null,
  yearBuilt?: number | null
): Recommendation[] {
  const dismissed = new Set(dismissedIds);
  
  // Build signals map for all key systems
  const signalsMap = new Map<string, SystemSignals>();
  for (const kind of KEY_SYSTEMS) {
    const system = systems.find(s => s.systemId === kind);
    signalsMap.set(kind, deriveSystemSignals(kind, system, homeAssets, homeEvents, yearBuilt));
  }

  // Four sequential passes
  const all: Recommendation[] = [
    ...passDocumentation(systems, signalsMap, dismissed),
    ...passMaintenance(systems, signalsMap, dismissed),
    ...passPlanning(systems, signalsMap, dismissed),
    ...passFreshness(lastTouchAt, dismissed),
  ];

  // Sort by priority score descending
  all.sort((a, b) => b.priorityScore - a.priorityScore);

  // Cap at 3
  return all.slice(0, MAX_RECOMMENDATIONS);
}
