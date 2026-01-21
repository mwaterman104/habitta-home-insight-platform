/**
 * capital-timeline - Generates unified CapEx timeline for a home
 * 
 * Returns HomeCapitalTimeline with all active systems
 * Used by: Timeline visualization, CapEx roll-up dashboard
 * 
 * Actions:
 * - 'timeline': Full HomeCapitalTimeline
 * - 'rollup': Just the CapitalOutlook
 * - 'system-detail': Single SystemTimelineEntry with full disclosure
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { 
  inferSystemTimeline, 
  getRegionContext,
  type InferredTimeline,
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

// ============== Weighted Exposure Logic ==============

/**
 * Calculate weighted capital exposure
 * 
 * IMPORTANT: Uses probabilistic weighting, not naive binary inclusion
 * - Early in horizon = 0.3× weight ("possible")
 * - Likely in horizon = 1.0× weight ("probable")
 * - Late only in horizon = 0.5× weight ("partial risk")
 */
function calculateWeightedExposure(
  system: SystemTimelineEntry,
  horizonCutoff: number
): { low: number; high: number } {
  const { earlyYear, likelyYear, lateYear } = system.replacementWindow;
  
  // No exposure if even early is beyond horizon
  if (earlyYear > horizonCutoff) {
    return { low: 0, high: 0 };
  }
  
  // Full exposure if likely is within horizon
  if (likelyYear <= horizonCutoff) {
    return { 
      low: system.capitalCost.low, 
      high: system.capitalCost.high 
    };
  }
  
  // Partial exposure: early is in, likely is out
  // Apply 0.3× weight for "possible but not probable"
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

// ============== Transform Helper ==============

function transformToEntry(inferred: InferredTimeline): SystemTimelineEntry {
  return {
    systemId: inferred.systemId,
    systemLabel: inferred.systemLabel,
    category: inferred.category,
    installSource: inferred.install.installSource,
    installYear: inferred.install.installYear,
    dataQuality: inferred.install.dataQuality,
    replacementWindow: {
      earlyYear: inferred.replacementWindow.earlyYear,
      likelyYear: inferred.replacementWindow.likelyYear,
      lateYear: inferred.replacementWindow.lateYear,
      rationale: inferred.replacementWindow.rationale,
    },
    windowUncertainty: inferred.replacementWindow.windowUncertainty,
    capitalCost: {
      low: inferred.capitalCost.low,
      high: inferred.capitalCost.high,
      currency: 'USD',
      costDrivers: inferred.capitalCost.costDrivers,
    },
    lifespanDrivers: inferred.lifespanDrivers,
    maintenanceEffect: inferred.maintenanceEffect,
    disclosureNote: inferred.disclosureNote,
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

    // Fetch existing systems
    const { data: systems } = await supabase
      .from('systems')
      .select('*')
      .eq('home_id', homeId);

    // Build property context
    const propertyContext: PropertyContext = {
      yearBuilt: home.year_built || 2000,
      state: home.state || 'FL',
      city: home.city,
      roofMaterial: systems?.find(s => s.kind === 'roof')?.material || 'unknown',
      waterHeaterType: systems?.find(s => s.kind === 'water_heater')?.material || 'unknown',
    };

    const regionContext = getRegionContext(propertyContext.state, propertyContext.city);

    // Single system detail request
    if (action === 'system-detail' && systemType) {
      const inferred = inferSystemTimeline(
        systemType,
        propertyContext,
        regionContext,
        permits || []
      );
      
      return new Response(
        JSON.stringify(transformToEntry(inferred)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate timelines for all systems
    const systemTypes: ('hvac' | 'roof' | 'water_heater')[] = ['hvac', 'roof', 'water_heater'];
    const timelineEntries: SystemTimelineEntry[] = [];
    const limitingFactors: string[] = [];

    for (const sysType of systemTypes) {
      const inferred = inferSystemTimeline(
        sysType,
        propertyContext,
        regionContext,
        permits || []
      );
      
      const entry = transformToEntry(inferred);
      timelineEntries.push(entry);
      
      // Track limiting factors
      if (entry.installSource === 'unknown') {
        limitingFactors.push(`No ${entry.systemLabel.toLowerCase()} permit found`);
      } else if (entry.installSource === 'inferred') {
        limitingFactors.push(`${entry.systemLabel} age inferred from home age`);
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
        limitingFactors: [...new Set(limitingFactors)], // Dedupe
      },
    };

    console.log('[capital-timeline] Generated timeline for', homeId, {
      systemCount: timelineEntries.length,
      completeness: completenessPercent,
      outlook3yr: capitalOutlook.horizons[0],
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
