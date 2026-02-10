import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserHome } from '@/hooks/useUserHome';
import { useCapitalTimeline } from '@/hooks/useCapitalTimeline';
import type { SystemTimelineEntry } from '@/types/capitalTimeline';
import { getInstallSourceLabel, deriveStatusLevel } from '@/lib/mobileCopy';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReportProperty {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  yearBuilt: number | null;
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  ownershipSince: string;
}

export interface ReportAsset {
  id: string;
  category: string;
  kind: string;
  manufacturer: string | null;
  model: string | null;
  installDate: string | null;
  confidence: number;
  source: string;
  serial: string | null;
  /** True if this asset was supplemented from the legacy home_systems table */
  isSupplemental: boolean;
}

export interface ReportEvent {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  source: string;
  assetId: string | null;
  assetKind: string | null;
  costActual: number | null;
  costEstimated: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  relatedEventId: string | null;
  createdAt: string;
}

export interface ReportOpenIssue extends ReportEvent {
  linkedRecommendation: ReportEvent | null;
}

export interface ReportResolvedItem {
  issue: ReportEvent;
  resolution: ReportEvent | null;
  resolvedAt: string | null;
}

export interface ReportCoverage {
  assetCount: number;
  issueCount: number;
  repairCount: number;
  avgConfidence: number;
  verifiedPct: number;
  estimatedPct: number;
}

// ─── Capital Outlook Types ──────────────────────────────────────────────────

export type ReportLifecycleStage = 'late_life' | 'planning_window' | 'mid_life' | 'early_life';

const LIFECYCLE_STAGE_LABELS: Record<ReportLifecycleStage, string> = {
  late_life: 'Late-life',
  planning_window: 'Planning window',
  mid_life: 'Mid-life',
  early_life: 'Early-life',
};

const PLANNING_GUIDANCE: Record<ReportLifecycleStage, string> = {
  late_life: 'Begin replacement planning',
  planning_window: 'This is a reasonable window to start researching options',
  mid_life: 'Routine monitoring sufficient',
  early_life: 'No action needed at this time',
};

const CLIMATE_NOTE_MAP: Record<string, string> = {
  high_heat: 'High heat and humidity',
  coastal: 'Coastal salt air and humidity',
  freeze_thaw: 'Freeze-thaw cycling',
  moderate: 'Typical conditions',
};

const CONFIDENCE_LABEL_MAP: Record<string, string> = {
  high: 'High',
  medium: 'Moderate',
  low: 'Low',
};

export interface ReportCapitalSystem {
  systemKey: string;
  systemLabel: string;
  installYear: number | null;
  installSource: string;
  installSourceLabel: string;
  lifecycleStage: ReportLifecycleStage;
  lifecycleStageLabel: string;
  replacementWindow: { earlyYear: number; likelyYear: number; lateYear: number } | null;
  windowDisplay: string;
  /** True when the entire replacement window is in the past */
  windowIsOverdue: boolean;
  planningGuidance: string;
  climateNote: string;
  confidenceLabel: string;
  confidenceDetail: string;
}

/**
 * normalizeTimelineForReport
 *
 * Maps SystemTimelineEntry[] to ReportCapitalSystem[].
 * The capital outlook reflects lifecycle intelligence as of report generation time,
 * not real-time recalculation. Raw edge function output never leaks into UI.
 */
function normalizeTimelineForReport(systems: SystemTimelineEntry[]): ReportCapitalSystem[] {
  const currentYear = new Date().getFullYear();

  return systems.map((s) => {
    // Lifecycle stage derivation — reuses mobileCopy thresholds
    const expectedLifespan = s.replacementWindow
      ? s.replacementWindow.likelyYear - (s.installYear ?? currentYear)
      : 20; // fallback
    const age = s.installYear ? currentYear - s.installYear : null;
    const lifecyclePercent = age !== null && expectedLifespan > 0
      ? (age / expectedLifespan) * 100
      : 0;

    const statusLevel = deriveStatusLevel(lifecyclePercent, age, expectedLifespan);

    const lifecycleStage: ReportLifecycleStage =
      statusLevel === 'aging' ? 'late_life'
      : statusLevel === 'elevated' ? 'planning_window'
      : statusLevel === 'planning_window' ? 'mid_life'
      : 'early_life';

    // Window display — suppress narrow ranges for low confidence
    const showWindow = !(s.dataQuality === 'low' && s.windowUncertainty === 'wide');
    const replacementWindow = showWindow && s.replacementWindow
      ? { earlyYear: s.replacementWindow.earlyYear, likelyYear: s.replacementWindow.likelyYear, lateYear: s.replacementWindow.lateYear }
      : null;

    // Fix 1: Detect overdue windows (entire range in the past)
    const windowIsOverdue = replacementWindow !== null && replacementWindow.lateYear < currentYear;
    const windowDisplay = replacementWindow
      ? windowIsOverdue
        ? `Past typical window (${replacementWindow.earlyYear}–${replacementWindow.lateYear})`
        : `${replacementWindow.earlyYear}–${replacementWindow.lateYear}`
      : 'Timing uncertain — more information needed';

    // Fix 2: Soften lifecycle label for estimated installs
    const baseLifecycleLabel = LIFECYCLE_STAGE_LABELS[lifecycleStage];
    const isEstimatedSource = s.installSource !== 'permit' && s.dataQuality !== 'high';
    const lifecycleStageLabel = isEstimatedSource
      ? `${baseLifecycleLabel} (estimated)`
      : baseLifecycleLabel;

    // Fix 4: Temporal override for overdue guidance
    const basePlanningGuidance = PLANNING_GUIDANCE[lifecycleStage];
    const planningGuidance = windowIsOverdue
      ? 'Replacement planning is recommended'
      : basePlanningGuidance;

    // Climate note
    const climateNote = CLIMATE_NOTE_MAP[s.climateZone ?? ''] ?? CLIMATE_NOTE_MAP.moderate;

    // Confidence
    const confidenceLabel = CONFIDENCE_LABEL_MAP[s.dataQuality] ?? 'Low';
    const sourceLabel = getInstallSourceLabel(s.installSource);
    const installDetail = s.installYear
      ? `${sourceLabel.toLowerCase()} install year`
      : 'no install year documented';
    const confidenceDetail = `${confidenceLabel} (${installDetail})`;

    return {
      systemKey: s.systemId,
      systemLabel: s.systemLabel,
      installYear: s.installYear,
      installSource: s.installSource,
      installSourceLabel: sourceLabel,
      lifecycleStage,
      lifecycleStageLabel,
      replacementWindow,
      windowDisplay,
      windowIsOverdue,
      planningGuidance,
      climateNote,
      confidenceLabel,
      confidenceDetail,
    };
  });
}

// ─── Report Data Interface ──────────────────────────────────────────────────

export interface ReportSaleRecord {
  date: string;
  price: number;
  type: string;
}

export interface HomeReportData {
  property: ReportProperty | null;
  assets: {
    coreSystems: ReportAsset[];
    appliances: ReportAsset[];
  };
  openIssues: ReportOpenIssue[];
  resolvedHistory: ReportResolvedItem[];
  replacements: ReportEvent[];
  deferredRecommendations: ReportEvent[];
  capitalOutlook: ReportCapitalSystem[];
  saleHistory: ReportSaleRecord[];
  coverage: ReportCoverage;
  loading: boolean;
  error: string | null;
}

// ─── Confidence Labels ──────────────────────────────────────────────────────

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'Verified';
  if (confidence >= 75) return 'Photo-verified';
  if (confidence >= 50) return 'Chat-reported';
  return 'Estimated';
}

export function getConfidenceVariant(confidence: number): 'default' | 'secondary' | 'outline' {
  if (confidence >= 75) return 'default';
  if (confidence >= 50) return 'secondary';
  return 'outline';
}

// ─── System key to display name ─────────────────────────────────────────────

const SYSTEM_KEY_DISPLAY: Record<string, string> = {
  hvac: 'HVAC',
  roof: 'Roof',
  water_heater: 'Water Heater',
  electrical: 'Electrical Service',
  plumbing: 'Plumbing',
  foundation: 'Foundation',
  siding: 'Siding',
  windows: 'Windows',
  garage_door: 'Garage Door',
  pool: 'Pool',
  septic: 'Septic System',
  well: 'Well',
};

function systemKeyToDisplayName(key: string): string {
  return SYSTEM_KEY_DISPLAY[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useHomeReport(): HomeReportData {
  const { userHome } = useUserHome();
  const homeId = userHome?.id ?? null;

  // Query 5: Capital timeline (non-fatal — failures don't block report)
  const { timeline, loading: timelineLoading } = useCapitalTimeline({
    homeId: homeId ?? undefined,
    enabled: !!homeId,
  });

  // Query 1: Property data (from homes via UserHomeContext — already available)
  const property: ReportProperty | null = userHome
    ? {
        address: userHome.address,
        city: userHome.city,
        state: userHome.state,
        zipCode: userHome.zip_code,
        yearBuilt: userHome.year_built ?? null,
        squareFeet: userHome.square_feet ?? null,
        bedrooms: userHome.bedrooms ?? null,
        bathrooms: userHome.bathrooms ?? null,
        propertyType: userHome.property_type ?? null,
        ownershipSince: '', // Will be enriched from direct query if needed
      }
    : null;

  // Query 2: Assets (VIN layer)
  const {
    data: rawAssets = [],
    isLoading: assetsLoading,
    error: assetsError,
  } = useQuery({
    queryKey: ['home-report-assets', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      const { data, error } = await supabase
        .from('home_assets')
        .select('*')
        .eq('home_id', homeId)
        .neq('status', 'removed')
        .order('category', { ascending: true })
        .order('kind', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!homeId,
  });

  // Query 3: Events (immutable ledger) — capped at 200 rows
  // FUTURE: Replace with materialized view or server-side pagination
  const {
    data: rawEvents = [],
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ['home-report-events', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      const { data, error } = await supabase
        .from('home_events')
        .select('*, home_assets!home_events_asset_id_fkey(kind)')
        .eq('home_id', homeId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!homeId,
  });

  // Query 4: Legacy home_systems (supplemental, for core systems not in home_assets)
  const {
    data: rawSystems = [],
    isLoading: systemsLoading,
    error: systemsError,
  } = useQuery({
    queryKey: ['home-report-systems', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      const { data, error } = await supabase
        .from('home_systems')
        .select('*')
        .eq('home_id', homeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!homeId,
  });

  // ─── Transform assets ──────────────────────────────────────────────────────

  const assets: ReportAsset[] = rawAssets.map((a) => ({
    id: a.id,
    category: a.category,
    kind: a.kind,
    manufacturer: a.manufacturer,
    model: a.model,
    installDate: a.install_date,
    confidence: a.confidence,
    source: a.source,
    serial: a.serial,
    isSupplemental: false,
  }));

  // ─── Hardening Rule 1: Asset Deduplication ────────────────────────────────
  // home_assets always wins. home_systems is fallback-only for items
  // not yet discovered into the VIN layer.
  const assetKinds = new Set(assets.map((a) => a.kind.toLowerCase()));

  const supplementalSystems: ReportAsset[] = rawSystems
    .filter((s) => !assetKinds.has(s.system_key.toLowerCase()))
    .map((s) => ({
      id: s.id,
      category: 'system',
      kind: systemKeyToDisplayName(s.system_key),
      manufacturer: s.brand,
      model: s.model,
      installDate: s.install_date,
      confidence: s.confidence_score ?? 30,
      source: (s.data_sources ?? []).join(', ') || 'public_data',
      serial: s.serial,
      isSupplemental: true,
    }));

  const allAssets = [...assets, ...supplementalSystems];
  const coreSystems = allAssets.filter((a) => a.category === 'system');
  const appliances = allAssets.filter((a) => a.category === 'appliance');

  // ─── Transform events ─────────────────────────────────────────────────────

  const events: ReportEvent[] = rawEvents.map((e: any) => ({
    id: e.id,
    eventType: e.event_type,
    title: e.title,
    description: e.description,
    severity: e.severity,
    status: e.status,
    source: e.source,
    assetId: e.asset_id,
    assetKind: e.home_assets?.kind ?? null,
    costActual: e.cost_actual,
    costEstimated: e.cost_estimated as Record<string, unknown> | null,
    metadata: (e.metadata ?? {}) as Record<string, unknown>,
    relatedEventId: e.related_event_id,
    createdAt: e.created_at,
  }));

  // ─── Build related-event lookup map ───────────────────────────────────────
  // Map<original_event_id, related_events[]>
  const relatedMap = new Map<string, ReportEvent[]>();
  for (const event of events) {
    if (event.relatedEventId) {
      const existing = relatedMap.get(event.relatedEventId) ?? [];
      existing.push(event);
      relatedMap.set(event.relatedEventId, existing);
    }
  }

  // ─── Open Issues ──────────────────────────────────────────────────────────

  const openIssues: ReportOpenIssue[] = events
    .filter(
      (e) =>
        e.eventType === 'issue_reported' &&
        (e.status === 'open' || e.status === 'in_progress')
    )
    .map((issue) => {
      const related = relatedMap.get(issue.id) ?? [];
      const linkedRecommendation =
        related.find((r) => r.eventType === 'recommendation') ?? null;
      return { ...issue, linkedRecommendation };
    });

  // ─── Hardening Rule 2: Issue Resolution Logic ─────────────────────────────
  // An issue is "resolved" if:
  //   - A repair_completed event exists with related_event_id = issue.id
  //   - OR a status_change event with status = 'resolved' and related_event_id = issue.id
  // This is the canonical resolution rule.

  const resolvedHistory: ReportResolvedItem[] = [];

  // Direct repair/maintenance events
  const directResolutions = events.filter(
    (e) =>
      e.eventType === 'repair_completed' ||
      e.eventType === 'maintenance_performed'
  );
  for (const resolution of directResolutions) {
    const originalIssue = resolution.relatedEventId
      ? events.find((e) => e.id === resolution.relatedEventId)
      : null;
    resolvedHistory.push({
      issue: originalIssue ?? resolution,
      resolution: originalIssue ? resolution : null,
      resolvedAt: resolution.createdAt,
    });
  }

  // Issues resolved by status_change
  const resolvedIssues = events.filter(
    (e) => e.eventType === 'issue_reported' && e.status === 'resolved'
  );
  for (const issue of resolvedIssues) {
    // Avoid duplicates if already captured by a repair_completed link
    const alreadyCaptured = resolvedHistory.some(
      (r) => r.issue.id === issue.id
    );
    if (!alreadyCaptured) {
      const related = relatedMap.get(issue.id) ?? [];
      const statusChange = related.find(
        (r) => r.eventType === 'status_change'
      );
      resolvedHistory.push({
        issue,
        resolution: statusChange ?? null,
        resolvedAt: statusChange?.createdAt ?? issue.createdAt,
      });
    }
  }

  // ─── Replacements ─────────────────────────────────────────────────────────

  const replacements = events.filter((e) => e.eventType === 'replacement');

  // ─── Hardening Rule 3: Deferred Recommendation Guardrails ─────────────────
  // Recommendations are deferred only if:
  //   1. event_type = 'recommendation'
  //   2. No linked user_decision event exists
  //   3. Associated asset (if any) still has status = 'active'

  const activeAssetIds = new Set(
    rawAssets.filter((a) => a.status === 'active').map((a) => a.id)
  );

  const deferredRecommendations = events.filter((e) => {
    if (e.eventType !== 'recommendation') return false;

    // Check no linked user_decision
    const related = relatedMap.get(e.id) ?? [];
    const hasDecision = related.some((r) => r.eventType === 'user_decision');
    if (hasDecision) return false;

    // Zombie filter: if linked to an asset, asset must be active
    if (e.assetId && !activeAssetIds.has(e.assetId)) return false;

    return true;
  });

  // ─── Coverage Summary ─────────────────────────────────────────────────────

  const allConfidences = allAssets.map((a) => a.confidence);
  const avgConfidence =
    allConfidences.length > 0
      ? allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length
      : 0;

  const verifiedCount = allAssets.filter((a) => a.confidence >= 75).length;
  const estimatedCount = allAssets.filter((a) => a.confidence < 50).length;

  const coverage: ReportCoverage = {
    assetCount: allAssets.length,
    issueCount: events.filter((e) => e.eventType === 'issue_reported').length,
    repairCount: events.filter((e) => e.eventType === 'repair_completed').length,
    avgConfidence: Math.round(avgConfidence),
    verifiedPct:
      allAssets.length > 0 ? Math.round((verifiedCount / allAssets.length) * 100) : 0,
    estimatedPct:
      allAssets.length > 0 ? Math.round((estimatedCount / allAssets.length) * 100) : 0,
  };

  // ─── Capital Outlook (non-fatal) ────────────────────────────────────────────

  const capitalOutlook = normalizeTimelineForReport(timeline?.systems ?? []);

  // ─── Loading / Error ──────────────────────────────────────────────────────

  const loading = assetsLoading || eventsLoading || systemsLoading || timelineLoading;
  const errorMsg = assetsError?.message || eventsError?.message || systemsError?.message || null;

  return {
    property,
    assets: { coreSystems, appliances },
    openIssues,
    resolvedHistory,
    replacements,
    deferredRecommendations,
    capitalOutlook,
    coverage,
    loading,
    error: errorMsg,
  };
}
