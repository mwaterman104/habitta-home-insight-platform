/**
 * capital-timeline - Generates unified CapEx timeline for a home
 * 
 * ARCHITECTURE (v2):
 * - This is the ORCHESTRATOR and POLICY ENGINE
 * - It decides which data source wins (authority resolution)
 * - It calls pure calculators for lifecycle math
 * - It returns pre-formatted labels (UI renders blindly)
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
  dataQualityFromConfidence,
  hasValidPermit,
  extractPermitYear,
  getRegionContext,
  type ResolvedInstallInput,
  type LifecycleOutput,
  type PropertyContext 
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
  // NEW: Pre-formatted labels for UI
  installedLine: string;
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  lastEventAt?: string;
  eventShiftYears?: number;
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

/**
 * Base confidence scores by install source
 * Matches the canonical model in memory
 */
function getBaseConfidenceScore(source: string): number {
  switch (source) {
    case 'permit_verified': return 0.85;
    case 'inspection': return 0.75;
    case 'owner_reported': return 0.60;
    case 'heuristic':
    default: return 0.30;
  }
}

/**
 * Map install source to UI label
 */
function formatInstallSourceLabel(source: string): string {
  switch (source) {
    case 'permit_verified': return 'permit-verified';
    case 'inspection': return 'inspector-confirmed';
    case 'owner_reported': return 'owner-confirmed';
    case 'heuristic':
    default: return 'estimated';
  }
}

/**
 * Map new install sources to legacy format for backward compatibility
 */
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

/**
 * Format the installed line for UI display
 * Canonical formatter - UI renders this blindly
 */
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

/**
 * Select the best system record from potentially duplicate records
 * Uses case-insensitive matching and authority-based selection
 */
function selectBestSystemRecord(
  systems: SystemRow[] | null,
  systemType: string
): SystemRow | undefined {
  if (!systems) return undefined;
  
  // Case-insensitive matching
  const matching = systems.filter(s => 
    s.kind.toLowerCase() === systemType.toLowerCase()
  );
  
  if (matching.length === 0) return undefined;
  if (matching.length === 1) return matching[0];
  
  // Log warning if duplicates found (shouldn't happen after cleanup)
  console.warn(
    `[capital-timeline] Found ${matching.length} records for "${systemType}". Using authority resolution.`
  );
  
  // Authority priority with proper tiebreaking
  const authorityOrder: Record<string, number> = {
    'permit_verified': 4,
    'inspection': 3,
    'owner_reported': 2,
    'heuristic': 1,
  };
  
  return matching.reduce((best, current) => {
    const bestAuth = authorityOrder[best.install_source || 'heuristic'] || 0;
    const currentAuth = authorityOrder[current.install_source || 'heuristic'] || 0;
    
    // 1. Higher authority wins
    if (currentAuth > bestAuth) return current;
    if (currentAuth < bestAuth) return best;
    
    // 2. Same authority: higher confidence wins
    const bestConf = best.confidence || 0;
    const currentConf = current.confidence || 0;
    if (currentConf > bestConf) return current;
    if (currentConf < bestConf) return best;
    
    // 3. Same authority + confidence: newer record wins
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

/**
 * resolveInstallAuthority - THE POLICY ENGINE
 * 
 * Decides which data source wins for a given system.
 * This is the ONLY place where precedence is determined.
 * 
 * Priority:
 * 1. User overrides (owner_reported, inspection) if NOT heuristic
 * 2. Permit data if available
 * 3. Heuristic fallback from yearBuilt
 */
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
  // Use different heuristics based on system type and home age
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

// ============== Weighted Exposure Logic ==============

/**
 * Calculate weighted capital exposure
 */
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

/**
 * Calculate capital outlook with weighted exposure
 */
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
 */
function buildTimelineEntry(
  systemType: 'hvac' | 'roof' | 'water_heater',
  resolvedInstall: ResolvedInstallInput,
  lifecycle: LifecycleOutput
): SystemTimelineEntry {
  const dataQuality = dataQualityFromConfidence(resolvedInstall.confidenceScore);
  const confidenceLevel = dataQuality; // Same mapping
  
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
      currency: 'USD',
      costDrivers: lifecycle.capitalCost.costDrivers,
    },
    lifespanDrivers: lifecycle.lifespanDrivers,
    maintenanceEffect: lifecycle.maintenanceEffect,
    disclosureNote: lifecycle.disclosureNote,
    // Pre-formatted labels for UI
    installedLine: formatInstalledLine(
      resolvedInstall.installYear,
      resolvedInstall.installSource,
      resolvedInstall.replacementStatus
    ),
    confidenceScore: resolvedInstall.confidenceScore,
    confidenceLevel,
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

    // Build property context
    const propertyContext: PropertyContext = {
      yearBuilt: home.year_built || 2000,
      state: home.state || 'FL',
      city: home.city,
      roofMaterial: selectBestSystemRecord(systems, 'roof')?.material || 'unknown',
      waterHeaterType: selectBestSystemRecord(systems, 'water_heater')?.material || 'unknown',
    };

    const regionContext = getRegionContext(propertyContext.state, propertyContext.city);

    // Single system detail request
    if (action === 'system-detail' && systemType) {
      const userSystem = selectBestSystemRecord(systems, systemType);
      
      // Step A: Resolve authority (POLICY)
      const resolvedInstall = resolveInstallAuthority(
        systemType,
        userSystem,
        permits || [],
        propertyContext.yearBuilt
      );
      
      // Step B: Calculate lifecycle (MATH)
      const lifecycle = calculateSystemLifecycle(
        systemType,
        resolvedInstall,
        propertyContext,
        regionContext
      );
      
      // Step C: Build entry with formatted output
      const entry = buildTimelineEntry(systemType, resolvedInstall, lifecycle);
      
      return new Response(
        JSON.stringify(entry),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate timelines for all systems
    const systemTypes: ('hvac' | 'roof' | 'water_heater')[] = ['hvac', 'roof', 'water_heater'];
    const timelineEntries: SystemTimelineEntry[] = [];
    const limitingFactors: string[] = [];

    for (const sysType of systemTypes) {
      // Find user-provided system data (case-insensitive with authority resolution)
      const userSystem = selectBestSystemRecord(systems, sysType);
      
      // Step A: Resolve authority (POLICY)
      const resolvedInstall = resolveInstallAuthority(
        sysType,
        userSystem,
        permits || [],
        propertyContext.yearBuilt
      );
      
      // Step B: Calculate lifecycle (MATH)
      const lifecycle = calculateSystemLifecycle(
        sysType,
        resolvedInstall,
        propertyContext,
        regionContext
      );
      
      // Step C: Build entry with formatted output
      const entry = buildTimelineEntry(sysType, resolvedInstall, lifecycle);
      timelineEntries.push(entry);
      
      // Track limiting factors
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

    console.log('[capital-timeline] Generated timeline for', homeId, {
      systemCount: timelineEntries.length,
      completeness: completenessPercent,
      outlook3yr: capitalOutlook.horizons[0],
      // Log authority resolution results
      sources: timelineEntries.map(e => ({ 
        system: e.systemId, 
        source: e.installSource, 
        year: e.installYear,
        confidence: e.confidenceScore 
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
