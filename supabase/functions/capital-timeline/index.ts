/**
 * capital-timeline - Generates unified CapEx timeline for a home
 * 
 * ARCHITECTURE (v3 - Earned Confidence):
 * - This is the ORCHESTRATOR and POLICY ENGINE
 * - It decides which data source wins (authority resolution)
 * - It calls pure calculators for lifecycle math
 * - It returns pre-formatted labels (UI renders blindly)
 * - NEW: Material-aware, climate-gated, confidence-bounded
 * 
 * Authority Priority:
 * 1. User overrides (owner_reported, inspection) — User corrects data
 * 2. Permit data (permit_verified) — Authoritative public records
 * 3. Heuristic inference — Fallback from yearBuilt
 * 
 * Actions:
 * - 'timeline': Full HomeCapitalTimeline
 * - 'rollup': Just the CapitalOutlook
 * - 'system-detail': Single SystemTimelineEntry with full disclosure
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { 
  calculateSystemLifecycle,
  calculateRoofLifecycle,
  dataQualityFromConfidence,
  hasValidPermit,
  extractPermitYear,
  classifyClimate,
  getRegionContext,
  deriveCostConfidence,
  deriveTypicalBand,
  normalizeRoofMaterial,
  type ResolvedInstallInput,
  type LifecycleOutput,
  type PropertyContext,
  type ResolvedClimateContext,
  type ConfidenceLevel,
} from '../_shared/systemInference.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============== Types ==============

interface HomeCapitalTimeline {
  propertyId: string;
  horizonYears: number;
  generatedAt: string;
  systems: SystemTimelineEntry[];
  capitalOutlook: CapitalOutlook;
  dataQuality: {
    completenessPercent: number;
    limitingFactors: string[];
  };
}

interface SystemTimelineEntry {
  systemId: 'hvac' | 'roof' | 'water_heater';
  systemLabel: string;
  category: 'mechanical' | 'structural' | 'utility';
  installSource: 'permit' | 'inferred' | 'unknown';
  installYear: number | null;
  dataQuality: 'high' | 'medium' | 'low';
  replacementWindow: {
    earlyYear: number;
    likelyYear: number;
    lateYear: number;
    rationale: string;
  };
  windowUncertainty: 'narrow' | 'medium' | 'wide';
  capitalCost: {
    low: number;
    high: number;
    typicalLow?: number;
    typicalHigh?: number;
    currency: 'USD';
    costDrivers: string[];
  };
  lifespanDrivers: Array<{
    factor: string;
    impact: 'increase' | 'decrease';
    severity: 'low' | 'medium' | 'high';
    description?: string;
  }>;
  maintenanceEffect: {
    shiftsTimeline: boolean;
    expectedDelayYears?: number;
    uncertaintyReduction?: 'low' | 'medium' | 'high';
    explanation: string;
  };
  disclosureNote: string;
  // Pre-formatted labels for UI
  installedLine: string;
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  lastEventAt?: string;
  eventShiftYears?: number;
  // Earned confidence fields (v3)
  materialType?: string;
  materialSource?: string;
  climateZone?: string;
  climateConfidence?: string;
  costConfidence?: string;
  costAttributionLine?: string;
  costDisclaimer?: string;
}

interface CapitalOutlook {
  horizons: Array<{
    yearsAhead: 3 | 5 | 10;
    lowEstimate: number;
    highEstimate: number;
    methodology: 'weighted';
  }>;
  methodologyNote: string;
}

// ============== Confidence Scoring ==============

function getBaseConfidenceScore(source: string): number {
  switch (source) {
    case 'permit_verified': return 0.85;
    case 'inspection': return 0.75;
    case 'owner_reported': return 0.60;
    case 'heuristic':
    default: return 0.30;
  }
}

function formatInstallSourceLabel(source: string): string {
  switch (source) {
    case 'permit_verified': return 'permit-verified';
    case 'inspection': return 'inspector-confirmed';
    case 'owner_reported': return 'owner-confirmed';
    case 'heuristic':
    default: return 'estimated';
  }
}

function mapInstallSourceToLegacy(source: string): 'permit' | 'inferred' | 'unknown' {
  switch (source) {
    case 'permit_verified':
      return 'permit';
    case 'owner_reported':
    case 'inspection':
      return 'inferred';
    case 'heuristic':
    default:
      return 'unknown';
  }
}

function formatInstalledLine(
  installYear: number | null,
  installSource: string,
  replacementStatus: string
): string {
  if (!installYear) {
    return 'Install year unknown';
  }
  
  const sourceLabel = formatInstallSourceLabel(installSource);
  
  if (replacementStatus === 'original') {
    return `Original (${installYear})`;
  }
  
  return `Installed ${installYear} (${sourceLabel})`;
}

// ============== Attribution & Disclaimer Copy ==============

/**
 * formatCostAttributionLine - Confidence-gated server-side copy
 * 
 * No UI copy invention allowed. This is the single source of truth
 * for cost attribution language.
 */
function formatCostAttributionLine(
  systemType: string,
  material: string | null | undefined,
  climate: ResolvedClimateContext
): string {
  const systemLabel = systemType === 'water_heater' ? 'water heater'
    : systemType === 'hvac' ? 'HVAC system'
    : systemType;

  // HVAC has duty-cycle-specific copy
  if (systemType === 'hvac') {
    if (climate.dutyCycle.hvac === 'extreme') {
      return 'HVAC estimates reflect heavy year-round usage in your climate.';
    }
    if (climate.dutyCycle.hvac === 'high') {
      return 'HVAC estimates adjusted for above-average seasonal usage.';
    }
    return 'HVAC estimates based on typical usage for your area.';
  }

  // Climate confidence gates copy tone
  if (climate.climateConfidence === 'high' && material && material !== 'unknown') {
    const climateDesc = climate.climateZone === 'coastal' ? 'coastal exposure'
      : climate.climateZone === 'high_heat' ? 'high heat and humidity'
      : climate.climateZone === 'freeze_thaw' ? 'freeze-thaw cycles'
      : 'regional conditions';
    return `Estimates reflect your ${material} ${systemLabel}, ${climateDesc}, and regional labor costs.`;
  }

  if (climate.climateConfidence === 'medium' && material && material !== 'unknown') {
    return `Estimates reflect a ${material} ${systemLabel} and regional climate usage.`;
  }

  if (climate.climateConfidence === 'medium') {
    return 'Estimates adjusted for regional climate usage.';
  }

  return 'Estimates based on typical conditions for homes in your area.';
}

/**
 * formatCostDisclaimer - System-specific defensive copy
 * Non-negotiable one-liner per system type.
 */
function formatCostDisclaimer(systemType: string): string {
  switch (systemType) {
    case 'roof':
      return 'Final pricing varies with roof complexity and access.';
    case 'hvac':
      return 'Final pricing varies with equipment efficiency, ductwork condition, and access.';
    case 'water_heater':
      return 'Final pricing varies with fuel type and installation requirements.';
    default:
      return 'Final pricing varies based on site conditions.';
  }
}

// ============== Authority Resolution ==============

interface SystemRow {
  kind: string;
  install_year: number | null;
  install_source: string | null;
  replacement_status: string | null;
  material: string | null;
  confidence: number | null;
  created_at?: string | null;
}

function selectBestSystemRecord(
  systems: SystemRow[] | null,
  systemType: string
): SystemRow | undefined {
  if (!systems) return undefined;
  
  const matching = systems.filter(s => 
    s.kind.toLowerCase() === systemType.toLowerCase()
  );
  
  if (matching.length === 0) return undefined;
  if (matching.length === 1) return matching[0];
  
  console.warn(
    `[capital-timeline] Found ${matching.length} records for "${systemType}". Using authority resolution.`
  );
  
  const authorityOrder: Record<string, number> = {
    'permit_verified': 4,
    'inspection': 3,
    'owner_reported': 2,
    'heuristic': 1,
  };
  
  return matching.reduce((best, current) => {
    const bestAuth = authorityOrder[best.install_source || 'heuristic'] || 0;
    const currentAuth = authorityOrder[current.install_source || 'heuristic'] || 0;
    
    if (currentAuth > bestAuth) return current;
    if (currentAuth < bestAuth) return best;
    
    const bestConf = best.confidence || 0;
    const currentConf = current.confidence || 0;
    if (currentConf > bestConf) return current;
    if (currentConf < bestConf) return best;
    
    const bestDate = new Date(best.created_at || 0).getTime();
    const currentDate = new Date(current.created_at || 0).getTime();
    return currentDate > bestDate ? current : best;
  });
}

interface PermitRecord {
  description?: string;
  permit_type?: string;
  date_finaled?: string;
  final_date?: string;
  approval_date?: string;
  date_issued?: string;
  issue_date?: string;
}

function resolveInstallAuthority(
  systemType: 'hvac' | 'roof' | 'water_heater',
  userSystem: SystemRow | undefined,
  permits: PermitRecord[],
  yearBuilt: number
): ResolvedInstallInput {
  const currentYear = new Date().getFullYear();
  
  // Priority 1: User override (if source is NOT heuristic)
  if (userSystem && userSystem.install_source && userSystem.install_source !== 'heuristic') {
    const source = userSystem.install_source as ResolvedInstallInput['installSource'];
    const confidenceScore = userSystem.confidence ?? getBaseConfidenceScore(source);
    
    return {
      installYear: userSystem.install_year,
      installSource: source,
      confidenceScore,
      replacementStatus: (userSystem.replacement_status as ResolvedInstallInput['replacementStatus']) || 'replaced',
      rationale: userSystem.replacement_status === 'original'
        ? 'Original system confirmed by owner'
        : `Install date provided by owner (${userSystem.install_year})`
    };
  }
  
  // Priority 2: Permit data
  if (hasValidPermit(systemType, permits)) {
    const permitYear = extractPermitYear(systemType, permits);
    return {
      installYear: permitYear,
      installSource: 'permit_verified',
      confidenceScore: 0.85,
      replacementStatus: 'replaced',
      rationale: `${formatSystemLabel(systemType)} replacement verified via building permit`
    };
  }
  
  // Priority 3: Heuristic fallback
  let inferredYear: number;
  let rationale: string;
  
  switch (systemType) {
    case 'hvac':
      if (yearBuilt <= 2005) {
        inferredYear = Math.min(yearBuilt + 12, currentYear - 5);
        rationale = 'HVAC replacement inferred based on typical service life and home age';
      } else {
        inferredYear = yearBuilt;
        rationale = 'HVAC assumed original with newer construction';
      }
      break;
      
    case 'water_heater':
      if (yearBuilt >= 2012) {
        inferredYear = yearBuilt;
        rationale = 'Water heater assumed original with recent construction';
      } else if (yearBuilt >= 1990) {
        inferredYear = Math.min(yearBuilt + 12, currentYear - 3);
        rationale = 'Water heater replacement inferred due to missing permit history';
      } else {
        inferredYear = Math.min(yearBuilt + 18, currentYear - 5);
        rationale = 'At least one water heater replacement assumed for pre-1990 home';
      }
      break;
      
    case 'roof':
      if (yearBuilt >= 2011) {
        inferredYear = yearBuilt;
        rationale = 'Roof assumed original with recent construction';
      } else {
        inferredYear = yearBuilt;
        rationale = 'Roof age inferred from year built; no replacement permit found';
      }
      break;
      
    default:
      inferredYear = yearBuilt;
      rationale = 'Age estimated from home construction date';
  }
  
  return {
    installYear: inferredYear,
    installSource: 'heuristic',
    confidenceScore: 0.30,
    replacementStatus: 'unknown',
    rationale
  };
}

function formatSystemLabel(systemType: 'hvac' | 'roof' | 'water_heater'): string {
  switch (systemType) {
    case 'hvac': return 'HVAC System';
    case 'water_heater': return 'Water Heater';
    case 'roof': return 'Roof';
  }
}

// ============== ATTOM Material Fallback ==============

/**
 * Attempt to resolve roof material from ATTOM enrichment data.
 * 
 * This is a READ-THROUGH CACHE — it never writes back to systems.material.
 * Explicitly transitional: the medium-term fix is for the onboarding pipeline
 * to write ATTOM-derived material to systems.material at property setup time.
 */
async function resolveRoofMaterialFromAttom(
  supabase: ReturnType<typeof createClient>,
  home: { address_id?: string | null; property_id?: string | null },
  yearBuilt: number
): Promise<{ material: string; materialSource: string } | null> {
  // Only attempt if we have an address_id to query enrichment_snapshots
  if (!home.address_id) {
    console.log('[capital-timeline] No address_id for ATTOM fallback — skipping');
    return null;
  }

  try {
    const { data: snapshot } = await supabase
      .from('enrichment_snapshots')
      .select('payload')
      .eq('address_id', home.address_id)
      .eq('provider', 'attom')
      .order('retrieved_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!snapshot?.payload) return null;

    // Extract roofcover from ATTOM payload
    // ATTOM structures: payload.property[0].building.summary.roofcover
    // or payload.property[0].building.construction.roofcover
    const payload = snapshot.payload as Record<string, unknown>;
    let roofcover: string | null = null;

    try {
      const property = (payload as any)?.property?.[0];
      roofcover = property?.building?.summary?.roofcover
        || property?.building?.construction?.roofcover
        || null;
    } catch {
      // Payload structure varies
    }

    if (!roofcover) return null;

    // Normalize with false-positive brake (QA FIX #2)
    const { material, downgraded } = normalizeRoofMaterial(roofcover, yearBuilt);

    if (material === 'unknown') return null;

    console.log(`[capital-timeline] ATTOM roof material resolved: ${roofcover} → ${material}${downgraded ? ' (downgraded)' : ''}`);

    return {
      material,
      materialSource: downgraded ? 'inferred' : 'attom',
    };
  } catch (err) {
    console.warn('[capital-timeline] ATTOM fallback query failed:', err);
    return null;
  }
}

// ============== Weighted Exposure Logic ==============

function calculateWeightedExposure(
  system: SystemTimelineEntry,
  horizonCutoff: number
): { low: number; high: number } {
  const { earlyYear, likelyYear } = system.replacementWindow;
  
  if (earlyYear > horizonCutoff) {
    return { low: 0, high: 0 };
  }
  
  if (likelyYear <= horizonCutoff) {
    return { 
      low: system.capitalCost.low, 
      high: system.capitalCost.high 
    };
  }
  
  if (earlyYear <= horizonCutoff) {
    return { 
      low: Math.round(system.capitalCost.low * 0.3), 
      high: Math.round(system.capitalCost.high * 0.5) 
    };
  }
  
  return { low: 0, high: 0 };
}

function calculateCapitalOutlook(
  systems: SystemTimelineEntry[],
  currentYear: number
): CapitalOutlook {
  const horizons: CapitalOutlook['horizons'] = [];
  
  for (const years of [3, 5, 10] as const) {
    const cutoff = currentYear + years;
    let low = 0;
    let high = 0;
    
    for (const sys of systems) {
      const exposure = calculateWeightedExposure(sys, cutoff);
      low += exposure.low;
      high += exposure.high;
    }
    
    horizons.push({ 
      yearsAhead: years, 
      lowEstimate: low, 
      highEstimate: high,
      methodology: 'weighted'
    });
  }
  
  return {
    horizons,
    methodologyNote: 'Estimates weighted by replacement probability within each horizon'
  };
}

// ============== Entry Builder ==============

/**
 * Build a SystemTimelineEntry from resolved authority + calculated lifecycle
 * Now includes earned confidence metadata (v3)
 */
function buildTimelineEntry(
  systemType: 'hvac' | 'roof' | 'water_heater',
  resolvedInstall: ResolvedInstallInput,
  lifecycle: LifecycleOutput,
  climate: ResolvedClimateContext,
  materialSource?: string
): SystemTimelineEntry {
  const dataQuality = dataQualityFromConfidence(resolvedInstall.confidenceScore);
  const confidenceLevel = dataQuality;
  
  return {
    systemId: systemType,
    systemLabel: lifecycle.systemLabel,
    category: lifecycle.category,
    installSource: mapInstallSourceToLegacy(resolvedInstall.installSource),
    installYear: resolvedInstall.installYear,
    dataQuality,
    replacementWindow: {
      earlyYear: lifecycle.replacementWindow.earlyYear,
      likelyYear: lifecycle.replacementWindow.likelyYear,
      lateYear: lifecycle.replacementWindow.lateYear,
      rationale: lifecycle.replacementWindow.rationale,
    },
    windowUncertainty: lifecycle.replacementWindow.windowUncertainty,
    capitalCost: {
      low: lifecycle.capitalCost.low,
      high: lifecycle.capitalCost.high,
      typicalLow: lifecycle.capitalCost.typicalLow,
      typicalHigh: lifecycle.capitalCost.typicalHigh,
      currency: 'USD',
      costDrivers: lifecycle.capitalCost.costDrivers,
    },
    lifespanDrivers: lifecycle.lifespanDrivers,
    maintenanceEffect: lifecycle.maintenanceEffect,
    disclosureNote: lifecycle.disclosureNote,
    // Pre-formatted labels
    installedLine: formatInstalledLine(
      resolvedInstall.installYear,
      resolvedInstall.installSource,
      resolvedInstall.replacementStatus
    ),
    confidenceScore: resolvedInstall.confidenceScore,
    confidenceLevel,
    // Earned confidence fields (v3)
    materialType: lifecycle.materialType,
    materialSource: materialSource || (lifecycle.materialType ? 'inferred' : undefined),
    climateZone: lifecycle.climateZone,
    climateConfidence: lifecycle.climateConfidence,
    costConfidence: lifecycle.costConfidence,
    costAttributionLine: formatCostAttributionLine(systemType, lifecycle.materialType, climate),
    costDisclaimer: formatCostDisclaimer(systemType),
  };
}

// ============== Main Handler ==============

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, homeId, systemType } = await req.json();
    
    if (!homeId) {
      return new Response(
        JSON.stringify({ error: 'homeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const currentYear = new Date().getFullYear();

    // Fetch home data
    const { data: home, error: homeError } = await supabase
      .from('homes')
      .select('*')
      .eq('id', homeId)
      .single();

    if (homeError || !home) {
      return new Response(
        JSON.stringify({ error: 'Home not found', details: homeError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch permits for this home
    const { data: permits } = await supabase
      .from('permits')
      .select('*')
      .eq('home_id', homeId);

    // Fetch existing systems (including user-provided data)
    const { data: systems } = await supabase
      .from('systems')
      .select('*')
      .eq('home_id', homeId);

    // Resolve roof material: systems.material → ATTOM fallback → 'unknown'
    const roofSystem = selectBestSystemRecord(systems, 'roof');
    let roofMaterial = roofSystem?.material || 'unknown';
    let roofMaterialSource: string | undefined = roofSystem?.material ? 'owner_reported' : undefined;

    // ATTOM fallback for roof material (transitional — read-through cache)
    if (roofMaterial === 'unknown') {
      const attomResult = await resolveRoofMaterialFromAttom(
        supabase,
        { address_id: home.address_id, property_id: home.property_id },
        home.year_built || 2000
      );
      if (attomResult) {
        roofMaterial = attomResult.material;
        roofMaterialSource = attomResult.materialSource;
      }
    }

    // Build property context
    // Sprint 1: Use year_built_effective as primary age anchor
    const propertyContext: PropertyContext = {
      yearBuilt: home.year_built_effective ?? home.year_built ?? 2000,
      state: home.state || 'FL',
      city: home.city,
      roofMaterial: roofMaterial as PropertyContext['roofMaterial'],
      waterHeaterType: selectBestSystemRecord(systems, 'water_heater')?.material || 'unknown',
      buildQuality: home.build_quality || undefined,
      grossSqft: home.gross_sqft || undefined,
      roomsTotal: home.rooms_total || undefined,
      groundFloorSqft: home.ground_floor_sqft || undefined,
    };

    // Use new climate classification with FIPS precision (Sprint 2)
    const climateContext = classifyClimate(propertyContext.state, propertyContext.city, home.fips_code || undefined);

    // Single system detail request
    if (action === 'system-detail' && systemType) {
      const userSystem = selectBestSystemRecord(systems, systemType);
      
      const resolvedInstall = resolveInstallAuthority(
        systemType,
        userSystem,
        permits || [],
        propertyContext.yearBuilt
      );
      
      // For roof, use the dedicated calculator with resolved material
      let lifecycle: LifecycleOutput;
      let entryMaterialSource: string | undefined;
      
      if (systemType === 'roof') {
        const { calculateRoofLifecycle: calcRoof } = await import('../_shared/systemInference.ts');
        lifecycle = calcRoof(resolvedInstall, propertyContext, climateContext, roofMaterial, roofMaterialSource);
        entryMaterialSource = roofMaterialSource;
      } else {
        lifecycle = calculateSystemLifecycle(
          systemType,
          resolvedInstall,
          propertyContext,
          climateContext
        );
      }
      
      const entry = buildTimelineEntry(systemType, resolvedInstall, lifecycle, climateContext, entryMaterialSource);
      
      return new Response(
        JSON.stringify(entry),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sprint 3: Apply data_match_confidence as confidence reduction
    // This feeds into windowUncertaintyFromConfidence naturally
    const dataMatchConfidence: string | null = home.data_match_confidence ?? null;
    let confidenceReduction = 0;
    if (dataMatchConfidence === 'low') {
      confidenceReduction = 0.10;
    } else if (dataMatchConfidence === 'medium') {
      confidenceReduction = 0.05;
    }

    // Generate timelines for all systems
    const systemTypes: ('hvac' | 'roof' | 'water_heater')[] = ['hvac', 'roof', 'water_heater'];
    const timelineEntries: SystemTimelineEntry[] = [];
    const limitingFactors: string[] = [];

    if (dataMatchConfidence === 'low') {
      limitingFactors.push('Property data match is approximate');
    }

    for (const sysType of systemTypes) {
      const userSystem = selectBestSystemRecord(systems, sysType);
      
      const resolvedInstall = resolveInstallAuthority(
        sysType,
        userSystem,
        permits || [],
        propertyContext.yearBuilt
      );
      
      // For roof, use dedicated calculator with resolved material
      let lifecycle: LifecycleOutput;
      let entryMaterialSource: string | undefined;
      
      if (sysType === 'roof') {
        lifecycle = calculateRoofLifecycle(resolvedInstall, propertyContext, climateContext, roofMaterial, roofMaterialSource);
        entryMaterialSource = roofMaterialSource;
      } else {
        lifecycle = calculateSystemLifecycle(
          sysType,
          resolvedInstall,
          propertyContext,
          climateContext
        );
      }
      
      // Sprint 3: Apply data match confidence reduction to the resolved install
      if (confidenceReduction > 0) {
        resolvedInstall.confidenceScore = Math.max(0, resolvedInstall.confidenceScore - confidenceReduction);
      }

      const entry = buildTimelineEntry(sysType, resolvedInstall, lifecycle, climateContext, entryMaterialSource);
      timelineEntries.push(entry);
      
      if (entry.dataQuality === 'low') {
        limitingFactors.push(`${entry.systemLabel} install date is estimated`);
      }
    }

    // Calculate data completeness
    const highQualityCount = timelineEntries.filter(e => e.dataQuality === 'high').length;
    const completenessPercent = Math.round((highQualityCount / timelineEntries.length) * 100);

    // Calculate capital outlook
    const capitalOutlook = calculateCapitalOutlook(timelineEntries, currentYear);

    // Just rollup
    if (action === 'rollup') {
      return new Response(
        JSON.stringify(capitalOutlook),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Full timeline
    const timeline: HomeCapitalTimeline = {
      propertyId: homeId,
      horizonYears: 10,
      generatedAt: new Date().toISOString(),
      systems: timelineEntries,
      capitalOutlook,
      dataQuality: {
        completenessPercent,
        limitingFactors: [...new Set(limitingFactors)],
      },
    };

    // Telemetry logging (QA FIX #5)
    console.log('[capital-timeline] Generated timeline for', homeId, {
      systemCount: timelineEntries.length,
      completeness: completenessPercent,
      outlook3yr: capitalOutlook.horizons[0],
      climateZone: climateContext.climateZone,
      climateConfidence: climateContext.climateConfidence,
      hvacDutyCycle: climateContext.dutyCycle.hvac,
      // Per-system telemetry with earned confidence fields
      sources: timelineEntries.map(e => ({ 
        system: e.systemId, 
        source: e.installSource, 
        year: e.installYear,
        confidence: e.confidenceScore,
        materialType: e.materialType,
        materialSource: e.materialSource,
        climateZone: e.climateZone,
        climateConfidence: e.climateConfidence,
        costConfidence: e.costConfidence,
      }))
    });

    return new Response(
      JSON.stringify(timeline),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[capital-timeline] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
