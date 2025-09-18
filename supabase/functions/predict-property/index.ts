import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PredictionRule {
  field: string;
  predict: (snapshots: any[], property: any, lifespanData: any[], climateFactors: any[]) => { value: string; confidence: number; provenance: any };
}

interface LifespanData {
  system_type: string;
  system_subtype: string;
  climate_zone: string;
  min_years: number;
  max_years: number;
  typical_years: number;
  quality_tier: string;
}

interface ClimateFactor {
  climate_zone: string;
  factor_type: string;
  multiplier: number;
  description: string;
}

// Confidence base scores and modifiers
const CONFIDENCE_BASES = {
  permit: 0.90,
  attom: 0.70,
  vision: 0.75,
  inferred: 0.50,
  default: 0.28
};

const CONFIDENCE_MODIFIERS = {
  recency: 0.05,
  crossVal: 0.05,
  climate: 0.05,
  exceedsNoPermit: -0.10,
  agreement: 0.05
};

// Utility functions
function getClimateZone(smartyData: any): string {
  const state = smartyData?.components?.state_abbreviation;
  if (state === 'FL') return 'florida';
  // Add more climate zone mappings as needed
  return 'default';
}

function getLifespanData(lifespanData: LifespanData[], systemType: string, subtype: string, climateZone: string): LifespanData | null {
  // Try to find exact match first
  let match = lifespanData.find(l => 
    l.system_type === systemType && 
    l.system_subtype === subtype && 
    l.climate_zone === climateZone
  );
  
  // Fall back to default climate zone if no match
  if (!match) {
    match = lifespanData.find(l => 
      l.system_type === systemType && 
      l.system_subtype === subtype && 
      l.climate_zone === 'default'
    );
  }
  
  return match || null;
}

function applyClimateFactors(baseLifespan: number, climateFactors: ClimateFactor[], climateZone: string): number {
  let adjustedLifespan = baseLifespan;
  
  climateFactors
    .filter(f => f.climate_zone === climateZone)
    .forEach(factor => {
      adjustedLifespan *= factor.multiplier;
    });
  
  return Math.round(adjustedLifespan);
}

function calculateReplacementLikelihood(age: number, expectedMax: number, hasPermit: boolean): boolean {
  return !hasPermit && age > expectedMax * 0.9;
}

function bucketizeAge(age: number, systemType: string): string {
  switch (systemType) {
    case 'roof':
      if (age <= 5) return '0-5';
      if (age <= 10) return '6-10';
      if (age <= 15) return '11-15';
      if (age <= 20) return '16-20';
      if (age <= 25) return '21-25';
      if (age <= 30) return '26-30';
      return '30+';
    
    case 'hvac':
      if (age <= 5) return '0-5';
      if (age <= 9) return '6-9';
      if (age <= 12) return '10-12';
      if (age <= 15) return '13-15';
      return '16+';
    
    case 'water_heater':
      if (age <= 4) return '0-4';
      if (age <= 8) return '5-8';
      if (age <= 12) return '9-12';
      return '13+';
    
    default:
      // Generic buckets
      if (age <= 3) return 'new';
      if (age <= 7) return 'early';
      if (age <= 15) return 'midlife';
      if (age <= 25) return 'late';
      return 'eol_imminent';
  }
}

function clampConfidence(confidence: number): number {
  return Math.max(0, Math.min(0.98, confidence));
}

// Enhanced prediction rules with database-driven lifespans and climate factors
const predictionRules: PredictionRule[] = [
  {
    field: 'roof_age_bucket',
    predict: (snapshots, property, lifespanData, climateFactors) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      const attomData = snapshots.find(s => s.provider === 'attom')?.payload;
      const smartyData = snapshots.find(s => s.provider === 'smarty')?.payload;
      
      const climateZone = getClimateZone(smartyData);
      let baseConfidence = CONFIDENCE_BASES.default;
      let sources = [];
      let modifiers = [];
      
      // Check for roof permits first (highest confidence)
      if (shovelsData?.permits) {
        const roofPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('roof') || 
          p.work_type?.toLowerCase().includes('roof') ||
          p.permit_type?.toLowerCase().includes('roof')
        );
        
        if (roofPermits.length > 0) {
          const latestPermit = roofPermits.sort((a: any, b: any) => 
            new Date(b.issue_date || b.date_issued).getTime() - new Date(a.issue_date || a.date_issued).getTime()
          )[0];
          
          const permitDate = new Date(latestPermit.issue_date || latestPermit.date_issued);
          const permitYear = permitDate.getFullYear();
          const age = 2024 - permitYear;
          
          baseConfidence = CONFIDENCE_BASES.permit;
          sources.push(`roof permit ${permitYear}`);
          
          // Recency bonus
          if (age < 2) {
            baseConfidence += CONFIDENCE_MODIFIERS.recency;
            modifiers.push('recent permit');
          }
          
          // Get roof material type and lifespan
          const roofMaterial = inferRoofMaterial(latestPermit.description);
          const lifespanInfo = getLifespanData(lifespanData, 'roof', roofMaterial, climateZone);
          
          let replacementLikely = false;
          if (lifespanInfo) {
            const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
            replacementLikely = calculateReplacementLikelihood(age, adjustedMaxLifespan, true);
            
            if (climateZone !== 'default') {
              baseConfidence += CONFIDENCE_MODIFIERS.climate;
              modifiers.push(`${climateZone} climate adjusted`);
            }
          }
          
          const bucket = bucketizeAge(age, 'roof');
          
          return {
            value: bucket,
            confidence: clampConfidence(baseConfidence),
            provenance: { 
              source: 'shovels_permit',
              permit_year: permitYear,
              roof_material: roofMaterial,
              sources: sources,
              modifiers: modifiers,
              replacement_likely: replacementLikely,
              climate_zone: climateZone,
              observed_at: permitDate.toISOString()
            }
          };
        }
      }
      
      // Estimate from house age with climate-adjusted lifespans
      if (attomData?.year_built || property.year_built) {
        const yearBuilt = attomData?.year_built || property.year_built;
        const houseAge = 2024 - yearBuilt;
        sources.push(`built ${yearBuilt}`);
        
        // Assume typical roof material for region
        const typicalMaterial = climateZone === 'florida' ? 'shingle' : 'shingle';
        const lifespanInfo = getLifespanData(lifespanData, 'roof', typicalMaterial, climateZone);
        
        let estimatedRoofAge = houseAge;
        baseConfidence = CONFIDENCE_BASES.inferred;
        
        if (lifespanInfo) {
          const adjustedTypicalLifespan = applyClimateFactors(lifespanInfo.typical_years, climateFactors, climateZone);
          
          // Assume roof replacement based on typical lifespan
          if (houseAge > adjustedTypicalLifespan) {
            estimatedRoofAge = houseAge - adjustedTypicalLifespan;
            sources.push(`estimated replacement after ${adjustedTypicalLifespan}y`);
          }
          
          const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
          const replacementLikely = calculateReplacementLikelihood(estimatedRoofAge, adjustedMaxLifespan, false);
          
          if (replacementLikely) {
            modifiers.push('age exceeds expected lifespan without permit');
            baseConfidence += CONFIDENCE_MODIFIERS.exceedsNoPermit;
          }
        }
        
        if (climateZone !== 'default') {
          baseConfidence += CONFIDENCE_MODIFIERS.climate;
          modifiers.push(`${climateZone} climate factors applied`);
        }
        
        const bucket = bucketizeAge(estimatedRoofAge, 'roof');
        
        return {
          value: bucket,
          confidence: clampConfidence(baseConfidence),
          provenance: { 
            source: 'estimated_from_house_age',
            house_age: houseAge,
            estimated_roof_age: estimatedRoofAge,
            roof_material: typicalMaterial,
            sources: sources,
            modifiers: modifiers,
            climate_zone: climateZone
          }
        };
      }
      
      return {
        value: '11-15',
        confidence: CONFIDENCE_BASES.default,
        provenance: { 
          source: 'default_assumption',
          sources: ['no data available'],
          modifiers: []
        }
      };
    }
  },
  {
    field: 'hvac_present',
    predict: (snapshots, property, lifespanData, climateFactors) => {
      // HVAC is typically present in most homes
      return {
        value: 'true',
        confidence: 0.8,
        provenance: { 
          source: 'statistical_default',
          sources: ['typical home assumption'],
          modifiers: [],
          meta: 'Most homes have HVAC systems'
        }
      };
    }
  },
  {
    field: 'hvac_system_type',
    predict: (snapshots, property, lifespanData, climateFactors) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      const smartyData = snapshots.find(s => s.provider === 'smarty')?.payload;
      const climateZone = getClimateZone(smartyData);
      
      let sources = [];
      let modifiers = [];
      
      // Check permits for HVAC type clues
      if (shovelsData?.permits) {
        const hvacPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('hvac') || 
          p.description?.toLowerCase().includes('air') ||
          p.work_type?.toLowerCase().includes('mechanical')
        );
        
        if (hvacPermits.length > 0) {
          const description = hvacPermits[0].description?.toLowerCase() || '';
          sources.push('hvac permit description');
          
          if (description.includes('central') || description.includes('split')) {
            return {
              value: 'central_air',
              confidence: clampConfidence(CONFIDENCE_BASES.permit),
              provenance: { 
                source: 'shovels_permit_text',
                sources: sources,
                modifiers: modifiers,
                signal: description,
                climate_zone: climateZone
              }
            };
          }
          
          if (description.includes('heat pump')) {
            return {
              value: 'heat_pump',
              confidence: clampConfidence(CONFIDENCE_BASES.permit),
              provenance: { 
                source: 'shovels_permit_text',
                sources: sources,
                modifiers: modifiers,
                signal: description,
                climate_zone: climateZone
              }
            };
          }
          
          if (description.includes('packaged')) {
            return {
              value: 'packaged_unit',
              confidence: clampConfidence(CONFIDENCE_BASES.permit),
              provenance: { 
                source: 'shovels_permit_text',
                sources: sources,
                modifiers: modifiers,
                signal: description,
                climate_zone: climateZone
              }
            };
          }
        }
      }
      
      // Default based on climate zone
      const defaultType = climateZone === 'florida' ? 'central_air' : 'central_air';
      sources.push(`${climateZone} climate default`);
      
      return {
        value: defaultType,
        confidence: clampConfidence(CONFIDENCE_BASES.inferred),
        provenance: { 
          source: 'climate_default',
          sources: sources,
          modifiers: modifiers,
          climate_zone: climateZone
        }
      };
    }
  },
  {
    field: 'hvac_age_bucket',
    predict: (snapshots, property, lifespanData, climateFactors) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      const attomData = snapshots.find(s => s.provider === 'attom')?.payload;
      const smartyData = snapshots.find(s => s.provider === 'smarty')?.payload;
      
      const climateZone = getClimateZone(smartyData);
      let sources = [];
      let modifiers = [];
      
      // Check for HVAC permits
      if (shovelsData?.permits) {
        const hvacPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('hvac') || 
          p.description?.toLowerCase().includes('air') ||
          p.work_type?.toLowerCase().includes('mechanical')
        );
        
        if (hvacPermits.length > 0) {
          const latestPermit = hvacPermits.sort((a: any, b: any) => 
            new Date(b.issue_date || b.date_issued).getTime() - new Date(a.issue_date || a.date_issued).getTime()
          )[0];
          
          const permitYear = new Date(latestPermit.issue_date || latestPermit.date_issued).getFullYear();
          const age = 2024 - permitYear;
          
          sources.push(`hvac permit ${permitYear}`);
          
          // Get HVAC type and lifespan
          const hvacType = inferHvacType(latestPermit.description);
          const lifespanInfo = getLifespanData(lifespanData, 'hvac', hvacType, climateZone);
          
          let baseConfidence = CONFIDENCE_BASES.permit;
          let replacementLikely = false;
          
          if (lifespanInfo) {
            const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
            replacementLikely = calculateReplacementLikelihood(age, adjustedMaxLifespan, true);
            
            if (climateZone !== 'default') {
              baseConfidence += CONFIDENCE_MODIFIERS.climate;
              modifiers.push(`${climateZone} climate adjusted`);
            }
          }
          
          const bucket = bucketizeAge(age, 'hvac');
          
          return {
            value: bucket,
            confidence: clampConfidence(baseConfidence),
            provenance: { 
              source: 'shovels_permit',
              permit_year: permitYear,
              hvac_type: hvacType,
              sources: sources,
              modifiers: modifiers,
              replacement_likely: replacementLikely,
              climate_zone: climateZone
            }
          };
        }
      }
      
      // Estimate based on home age with climate-adjusted HVAC lifespan
      if (attomData?.year_built || property.year_built) {
        const yearBuilt = attomData?.year_built || property.year_built;
        const homeAge = 2024 - yearBuilt;
        sources.push(`built ${yearBuilt}`);
        
        const typicalHvacType = climateZone === 'florida' ? 'central_air' : 'central_air';
        const lifespanInfo = getLifespanData(lifespanData, 'hvac', typicalHvacType, climateZone);
        
        let estimatedHvacAge = homeAge;
        let baseConfidence = CONFIDENCE_BASES.inferred;
        
        if (lifespanInfo) {
          const adjustedTypicalLifespan = applyClimateFactors(lifespanInfo.typical_years, climateFactors, climateZone);
          
          // Assume HVAC replaced based on typical lifespan
          if (homeAge > adjustedTypicalLifespan) {
            estimatedHvacAge = homeAge - adjustedTypicalLifespan;
            sources.push(`estimated replacement after ${adjustedTypicalLifespan}y`);
          }
          
          const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
          const replacementLikely = calculateReplacementLikelihood(estimatedHvacAge, adjustedMaxLifespan, false);
          
          if (replacementLikely) {
            modifiers.push('age exceeds expected lifespan without permit');
            baseConfidence += CONFIDENCE_MODIFIERS.exceedsNoPermit;
          }
        }
        
        if (climateZone !== 'default') {
          baseConfidence += CONFIDENCE_MODIFIERS.climate;
          modifiers.push(`${climateZone} climate factors applied`);
        }
        
        const bucket = bucketizeAge(estimatedHvacAge, 'hvac');
        
        return {
          value: bucket,
          confidence: clampConfidence(baseConfidence),
          provenance: { 
            source: 'estimated_from_home_age',
            home_age: homeAge,
            estimated_hvac_age: estimatedHvacAge,
            hvac_type: typicalHvacType,
            sources: sources,
            modifiers: modifiers,
            climate_zone: climateZone
          }
        };
      }
      
      return {
        value: '10-12',
        confidence: CONFIDENCE_BASES.default,
        provenance: { 
          source: 'default_assumption',
          sources: ['no data available'],
          modifiers: []
        }
      };
    }
  },
  {
    field: 'water_heater_type',
    predict: (snapshots, property, lifespanData, climateFactors) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      let sources = [];
      let modifiers = [];
      
      // Check permits for water heater type
      if (shovelsData?.permits) {
        const whPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('water heater') ||
          p.description?.toLowerCase().includes('hot water') ||
          p.work_type?.toLowerCase().includes('plumbing')
        );
        
        if (whPermits.length > 0) {
          const description = whPermits[0].description?.toLowerCase() || '';
          sources.push('water heater permit description');
          
          if (description.includes('tankless')) {
            return {
              value: 'tankless',
              confidence: clampConfidence(CONFIDENCE_BASES.permit),
              provenance: { 
                source: 'shovels_permit_text',
                sources: sources,
                modifiers: modifiers,
                signal: description
              }
            };
          }
          
          if (description.includes('electric')) {
            return {
              value: 'tank_electric',
              confidence: clampConfidence(CONFIDENCE_BASES.permit - 0.1),
              provenance: { 
                source: 'shovels_permit_text',
                sources: sources,
                modifiers: modifiers,
                signal: description
              }
            };
          }
          
          if (description.includes('gas')) {
            return {
              value: 'tank_gas',
              confidence: clampConfidence(CONFIDENCE_BASES.permit - 0.1),
              provenance: { 
                source: 'shovels_permit_text',
                sources: sources,
                modifiers: modifiers,
                signal: description
              }
            };
          }
        }
      }
      
      // Default assumption - tank style is most common
      sources.push('statistical default');
      return {
        value: 'tank_gas',
        confidence: clampConfidence(CONFIDENCE_BASES.default + 0.1),
        provenance: { 
          source: 'statistical_default',
          sources: sources,
          modifiers: modifiers,
          meta: 'Tank-style water heaters are most common'
        }
      };
    }
  },
  {
    field: 'water_heater_age_bucket',
    predict: (snapshots, property, lifespanData, climateFactors) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      const attomData = snapshots.find(s => s.provider === 'attom')?.payload;
      const smartyData = snapshots.find(s => s.provider === 'smarty')?.payload;
      
      const climateZone = getClimateZone(smartyData);
      let sources = [];
      let modifiers = [];
      
      // Check for water heater permits
      if (shovelsData?.permits) {
        const whPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('water heater') ||
          p.description?.toLowerCase().includes('hot water')
        );
        
        if (whPermits.length > 0) {
          const latestPermit = whPermits.sort((a: any, b: any) => 
            new Date(b.issue_date || b.date_issued).getTime() - new Date(a.issue_date || a.date_issued).getTime()
          )[0];
          
          const permitYear = new Date(latestPermit.issue_date || latestPermit.date_issued).getFullYear();
          const age = 2024 - permitYear;
          
          sources.push(`water heater permit ${permitYear}`);
          
          // Get water heater type and lifespan
          const whType = inferWaterHeaterType(latestPermit.description);
          const lifespanInfo = getLifespanData(lifespanData, 'water_heater', whType, climateZone);
          
          let baseConfidence = CONFIDENCE_BASES.permit;
          let replacementLikely = false;
          
          if (lifespanInfo) {
            const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
            replacementLikely = calculateReplacementLikelihood(age, adjustedMaxLifespan, true);
            
            if (climateZone !== 'default') {
              baseConfidence += CONFIDENCE_MODIFIERS.climate;
              modifiers.push(`${climateZone} climate adjusted`);
            }
          }
          
          const bucket = bucketizeAge(age, 'water_heater');
          
          return {
            value: bucket,
            confidence: clampConfidence(baseConfidence),
            provenance: { 
              source: 'shovels_permit',
              permit_year: permitYear,
              water_heater_type: whType,
              sources: sources,
              modifiers: modifiers,
              replacement_likely: replacementLikely,
              climate_zone: climateZone
            }
          };
        }
      }
      
      // Estimate based on typical water heater lifespan
      if (attomData?.year_built || property.year_built) {
        const yearBuilt = attomData?.year_built || property.year_built;
        const homeAge = 2024 - yearBuilt;
        sources.push(`built ${yearBuilt}`);
        
        const typicalWhType = 'tank_gas';
        const lifespanInfo = getLifespanData(lifespanData, 'water_heater', typicalWhType, climateZone);
        
        let estimatedWhAge = homeAge;
        let baseConfidence = CONFIDENCE_BASES.inferred;
        
        if (lifespanInfo) {
          const adjustedTypicalLifespan = applyClimateFactors(lifespanInfo.typical_years, climateFactors, climateZone);
          
          // Water heaters typically replaced multiple times during home life
          const replacementCycles = Math.floor(homeAge / adjustedTypicalLifespan);
          if (replacementCycles > 0) {
            estimatedWhAge = homeAge - (replacementCycles * adjustedTypicalLifespan);
            sources.push(`estimated ${replacementCycles} replacement cycles`);
          }
          
          const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
          const replacementLikely = calculateReplacementLikelihood(estimatedWhAge, adjustedMaxLifespan, false);
          
          if (replacementLikely) {
            modifiers.push('age exceeds expected lifespan without permit');
            baseConfidence += CONFIDENCE_MODIFIERS.exceedsNoPermit;
          }
        }
        
        if (climateZone !== 'default') {
          baseConfidence += CONFIDENCE_MODIFIERS.climate;
          modifiers.push(`${climateZone} climate factors applied`);
        }
        
        const bucket = bucketizeAge(estimatedWhAge, 'water_heater');
        
        return {
          value: bucket,
          confidence: clampConfidence(baseConfidence),
          provenance: { 
            source: 'estimated_from_home_age',
            home_age: homeAge,
            estimated_wh_age: estimatedWhAge,
            water_heater_type: typicalWhType,
            sources: sources,
            modifiers: modifiers,
            climate_zone: climateZone
          }
        };
      }
      
      return {
        value: '5-8',
        confidence: CONFIDENCE_BASES.default,
        provenance: { 
          source: 'typical_lifespan_default',
          sources: ['no data available'],
          modifiers: []
        }
      };
    }
  }
];

// Helper functions for material/type inference
function inferRoofMaterial(description: string): string {
  const desc = description?.toLowerCase() || '';
  if (desc.includes('tile')) return 'tile';
  if (desc.includes('metal')) return 'metal';
  if (desc.includes('shingle')) return 'shingle';
  return 'shingle'; // default
}

function inferHvacType(description: string): string {
  const desc = description?.toLowerCase() || '';
  if (desc.includes('heat pump')) return 'heat_pump';
  if (desc.includes('packaged')) return 'packaged_unit';
  return 'central_air'; // default
}

function inferWaterHeaterType(description: string): string {
  const desc = description?.toLowerCase() || '';
  if (desc.includes('tankless')) return 'tankless';
  if (desc.includes('electric')) return 'tank_electric';
  return 'tank_gas'; // default
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { address_id } = await req.json();

    if (!address_id) {
      return new Response(
        JSON.stringify({ error: 'address_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Starting enhanced predictions for address_id: ${address_id}`);

    // Load reference data from database
    const [propertyResult, snapshotsResult, lifespanResult, climateResult] = await Promise.all([
      supabase
        .from('properties_sample')
        .select('*')
        .eq('address_id', address_id)
        .single(),
      supabase
        .from('enrichment_snapshots')
        .select('*')
        .eq('address_id', address_id),
      supabase
        .from('lifespan_reference')
        .select('*'),
      supabase
        .from('climate_factors')
        .select('*')
    ]);

    if (propertyResult.error) {
      throw new Error(`Failed to fetch property: ${propertyResult.error.message}`);
    }

    if (snapshotsResult.error) {
      throw new Error(`Failed to fetch snapshots: ${snapshotsResult.error.message}`);
    }

    if (lifespanResult.error) {
      console.warn(`Failed to fetch lifespan data: ${lifespanResult.error.message}`);
    }

    if (climateResult.error) {
      console.warn(`Failed to fetch climate factors: ${climateResult.error.message}`);
    }

    const property = propertyResult.data;
    const snapshots = snapshotsResult.data;
    const lifespanData = lifespanResult.data || [];
    const climateFactors = climateResult.data || [];
    const predictionRunId = crypto.randomUUID();

    console.log(`Found ${snapshots.length} snapshots, ${lifespanData.length} lifespan entries, ${climateFactors.length} climate factors`);

    // Generate predictions for each field using enhanced logic
    const predictions = [];
    for (const rule of predictionRules) {
      try {
        const result = rule.predict(snapshots, property, lifespanData, climateFactors);
        
        const prediction = {
          address_id,
          prediction_run_id: predictionRunId,
          field: rule.field,
          predicted_value: result.value,
          confidence_0_1: result.confidence,
          data_provenance: result.provenance,
          model_version: 'enhanced_rules_v1.0'
        };

        const { data: savedPrediction } = await supabase
          .from('predictions')
          .insert(prediction)
          .select()
          .single();

        if (savedPrediction) {
          predictions.push(savedPrediction);
          console.log(`Saved enhanced prediction for ${rule.field}: ${result.value} (conf: ${result.confidence.toFixed(2)})`);
        }
      } catch (error) {
        console.error(`Failed to generate prediction for ${rule.field}:`, error);
      }
    }

    console.log(`Enhanced predictions completed. Generated ${predictions.length} predictions with climate-aware logic.`);

    return new Response(
      JSON.stringify({
        status: 'success',
        prediction_run_id: predictionRunId,
        predictions: predictions.length,
        enhancements: {
          climate_aware: true,
          replacement_likelihood: true,
          standardized_buckets: true,
          confidence_modifiers: true
        },
        message: `Enhanced predictions generated for address ${property.street_address}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Enhanced prediction error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Enhanced prediction failed',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});