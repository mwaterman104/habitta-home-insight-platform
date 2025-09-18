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

// Phase 1.5 Configuration constants - exact values from spec
export const BASES = {
  permit: 0.90,
  attom: 0.70,  
  vision: 0.75,
  inferred: 0.50,
  default: 0.28
};

export const MODS = {
  recency: 0.05,
  crossVal: 0.05,
  climate: 0.05,
  exceedsNoPermit: -0.10
};

export const LIFESPAN = {
  FL: {
    roof: { tile: [28, 35], shingle: [12, 18], metal: [30, 45], flat: [12, 20], other: [15, 25] },
    hvac: [10, 14],
    wh: { tank_electric: [8, 12], tank_gas: [10, 15], tankless: [18, 25] }
  },
  DEFAULT: {
    roof: { tile: [30, 40], shingle: [15, 25], metal: [35, 50], flat: [15, 25], other: [20, 30] },
    hvac: [12, 18],
    wh: { tank_electric: [10, 15], tank_gas: [12, 18], tankless: [20, 30] }
  }
};

// Legacy constants for compatibility
const CONFIDENCE_BASES = BASES;
const CONFIDENCE_MODIFIERS = MODS;

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
          
          // Get roof material type and lifespan - use ATTOM data for material
          const roofMaterial = inferRoofMaterial(latestPermit.description, attomData);
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
      
      // Phase 1.5: Use ATTOM yearbuilt or yearbuilteffective for roof age
      const installYear = attomData?.summary?.yearbuilt ?? attomData?.building?.summary?.yearbuilteffective ?? attomData?.year_built ?? property.year_built;
      
      if (installYear) {
        const houseAge = 2024 - installYear;
        sources.push(`built ${installYear}`);
        
        // Use ATTOM roof material if available, otherwise regional default
        const roofMaterial = inferRoofMaterial('', attomData);
        if (attomData?.building?.construction?.roofcover) {
          baseConfidence = BASES.inferred + MODS.climate; // 0.55 as per Phase 1.5 spec
          sources.push(`ATTOM roofcover: ${attomData.building.construction.roofcover}`);
        } else {
          baseConfidence = BASES.inferred;
        }
        
        const lifespanInfo = getLifespanData(lifespanData, 'roof', roofMaterial, climateZone);
        
        let estimatedRoofAge = houseAge;
        
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
            source: attomData?.building?.construction?.roofcover ? 'attom_enhanced' : 'estimated_from_house_age',
            house_age: houseAge,
            estimated_roof_age: estimatedRoofAge,
            roof_material: roofMaterial,
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
      const attomData = snapshots.find(s => s.provider === 'attom')?.payload;
      
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      let baseConfidence = BASES.attom; // 0.7 base confidence
      let sources = [];
      let modifiers = [];
      
      // Phase 1.5: Use ATTOM cooling data with cross-validation bonus
      if (attomData?.utilities?.coolingtype) {
        const coolingType = attomData.utilities.coolingtype.toLowerCase();
        sources.push(`ATTOM cooling: ${attomData.utilities.coolingtype}`);
        
        // Check for recent HVAC permit for cross-validation
        const recentHvacPermit = shovelsData?.permits?.some((p: any) => {
          const isHvac = isHvacPermit(p);
          const permitDate = new Date(p.issue_date || p.date_issued);
          const age = 2024 - permitDate.getFullYear();
          return isHvac && age < 5;
        });
        
        if (recentHvacPermit) {
          baseConfidence += MODS.crossVal;
          modifiers.push('cross-validated with permit');
        }
        
        if (coolingType === 'yes' || coolingType.includes('central') || coolingType.includes('air')) {
          return {
            value: 'true',
            confidence: clampConfidence(baseConfidence),
            provenance: { 
              source: 'attom_cooling_enhanced',
              sources: sources,
              modifiers: modifiers,
              signal: coolingType
            }
          };
        } else if (coolingType.includes('no') || coolingType.includes('none')) {
          return {
            value: 'false',
            confidence: clampConfidence(baseConfidence),
            provenance: { 
              source: 'attom_cooling_enhanced',
              sources: sources,
              modifiers: modifiers,
              signal: coolingType
            }
          };
        }
      }
      
      // Statistical default for most homes
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
      
      // Check permits for HVAC type clues using enhanced detection
      if (shovelsData?.permits) {
        const hvacPermits = shovelsData.permits.filter((p: any) => isHvacPermit(p));
        
        if (hvacPermits.length > 0) {
          const latestPermit = hvacPermits.sort((a: any, b: any) => 
            new Date(b.issue_date || b.date_issued).getTime() - new Date(a.issue_date || a.date_issued).getTime()
          )[0];
          
          const description = latestPermit.description?.toLowerCase() || '';
          sources.push(`hvac permit: ${latestPermit.description}`);
          
          // Enhanced HVAC type detection for "a/c change out 4 ton split system"
          const hvacType = inferHvacType(description);
          const permitDate = new Date(latestPermit.issue_date || latestPermit.date_issued);
          const age = 2024 - permitDate.getFullYear();
          
          let baseConfidence = CONFIDENCE_BASES.permit;
          
          // Recency bonus for recent permits
          if (age < 3) {
            baseConfidence += CONFIDENCE_MODIFIERS.recency;
            modifiers.push('recent permit');
          }
          
          return {
            value: hvacType,
            confidence: clampConfidence(baseConfidence),
            provenance: { 
              source: 'shovels_permit_enhanced',
              sources: sources,
              modifiers: modifiers,
              signal: description,
              climate_zone: climateZone,
              permit_year: permitDate.getFullYear(),
              observed_at: permitDate.toISOString()
            }
          };
        }
      }
      
      // Default based on climate zone - prefer split_system for Florida
      const defaultType = climateZone === 'florida' ? 'split_system' : 'central_air';
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
      
      // Check for HVAC permits using enhanced detection
      if (shovelsData?.permits) {
        const hvacPermits = shovelsData.permits.filter((p: any) => isHvacPermit(p));
        
        if (hvacPermits.length > 0) {
          const latestPermit = hvacPermits.sort((a: any, b: any) => 
            new Date(b.issue_date || b.date_issued).getTime() - new Date(a.issue_date || a.date_issued).getTime()
          )[0];
          
          const permitDate = new Date(latestPermit.issue_date || latestPermit.date_issued);
          const permitYear = permitDate.getFullYear();
          const age = 2024 - permitYear;
          
          sources.push(`hvac permit ${permitYear}: ${latestPermit.description}`);
          
          // Get HVAC type and lifespan
          const hvacType = inferHvacType(latestPermit.description);
          const lifespanInfo = getLifespanData(lifespanData, 'hvac', hvacType, climateZone);
          
          let baseConfidence = CONFIDENCE_BASES.permit;
          let replacementLikely = false;
          
          // Recency bonus for very recent permits
          if (age < 2) {
            baseConfidence += CONFIDENCE_MODIFIERS.recency;
            modifiers.push('recent permit');
          }
          
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
              source: 'shovels_permit_enhanced',
              permit_year: permitYear,
              hvac_type: hvacType,
              sources: sources,
              modifiers: modifiers,
              replacement_likely: replacementLikely,
              climate_zone: climateZone,
              observed_at: permitDate.toISOString()
            }
          };
        }
      }
      
      // Estimate based on home age with climate-adjusted HVAC lifespan
      if (attomData?.year_built || property.year_built) {
        const yearBuilt = attomData?.year_built || property.year_built;
        const homeAge = 2024 - yearBuilt;
        sources.push(`built ${yearBuilt}`);
        
        const typicalHvacType = climateZone === 'florida' ? 'split_system' : 'central_air';
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
      const attomData = snapshots.find(s => s.provider === 'attom')?.payload;
      const smartyData = snapshots.find(s => s.provider === 'smarty')?.payload;
      
      const climateZone = getClimateZone(smartyData);
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
          sources.push(`water heater permit: ${whPermits[0].description}`);
          
          const whType = inferWaterHeaterType(description, attomData, climateZone);
          
          return {
            value: whType,
            confidence: clampConfidence(CONFIDENCE_BASES.permit - 0.1),
            provenance: { 
              source: 'shovels_permit_enhanced',
              sources: sources,
              modifiers: modifiers,
              signal: description,
              climate_zone: climateZone
            }
          };
        }
      }
      
      // Use ATTOM heating fuel data for better regional defaults - Phase 1.5: Updated confidence
      const intelligentDefault = inferWaterHeaterType('', attomData, climateZone);
      
      if (attomData?.utilities?.heatingfuel) {
        sources.push(`ATTOM heating fuel: ${attomData.utilities.heatingfuel}`);
        sources.push(`${climateZone} regional pattern`);
        
        return {
          value: intelligentDefault,
          confidence: clampConfidence(0.35), // Phase 1.5: Exact confidence per feedback
          provenance: { 
            source: 'regional_default',
            sources: sources,
            modifiers: modifiers,
            climate_zone: climateZone,
            heating_fuel: attomData.utilities.heatingfuel
          }
        };
      }
            heating_fuel: attomData.utilities.heatingfuel,
            climate_zone: climateZone
          }
        };
      }
      
      // Fallback to pure regional default
      sources.push(`${climateZone} statistical default`);
      return {
        value: intelligentDefault,
        confidence: clampConfidence(CONFIDENCE_BASES.default + 0.05),
        provenance: { 
          source: 'regional_statistical_default',
          sources: sources,
          modifiers: modifiers,
          climate_zone: climateZone,
          meta: 'Regional preference applied'
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
          
          const permitDate = new Date(latestPermit.issue_date || latestPermit.date_issued);
          const permitYear = permitDate.getFullYear();
          const age = 2024 - permitYear;
          
          sources.push(`water heater permit ${permitYear}: ${latestPermit.description}`);
          
          // Get water heater type and lifespan
          const whType = inferWaterHeaterType(latestPermit.description, attomData, climateZone);
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
              climate_zone: climateZone,
              observed_at: permitDate.toISOString()
            }
          };
        }
      }
      
      // Estimate based on typical water heater lifespan - Phase 1.5: Fixed age logic
      if (attomData?.summary?.yearbuilt || attomData?.building?.summary?.yearbuilteffective || attomData?.year_built || property.year_built) {
        const yearBuilt = attomData?.summary?.yearbuilt || attomData?.building?.summary?.yearbuilteffective || attomData?.year_built || property.year_built;
        const homeAge = 2024 - yearBuilt;
        sources.push(`built ${yearBuilt}`);
        
        const typicalWhType = inferWaterHeaterType('', attomData, climateZone);
        const lifespanInfo = getLifespanData(lifespanData, 'water_heater', typicalWhType, climateZone);
        
        let estimatedWhAge = homeAge; // Phase 1.5: Start with actual house age
        let baseConfidence = BASES.inferred;
        let replacementLikely = false;
        
        if (lifespanInfo) {
          const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
          
          // Phase 1.5: For houses older than max lifespan, force age to at least 13+ years
          if (homeAge > adjustedMaxLifespan) {
            estimatedWhAge = Math.max(homeAge, 13); // Force to 13+ bucket per feedback
            replacementLikely = true;
            modifiers.push('exceeds expected lifespan without permit');
            baseConfidence += MODS.exceedsNoPermit;
          }
          
          if (climateZone !== 'default') {
            baseConfidence += MODS.climate;
            modifiers.push(`${climateZone} climate factors applied`);
          }
        }
        
        const bucket = bucketizeAge(estimatedWhAge, 'water_heater');
        
        return {
          value: bucket,
          confidence: clampConfidence(baseConfidence),
          provenance: { 
            source: 'estimated_from_home_age_corrected',
            home_age: homeAge,
            estimated_wh_age: estimatedWhAge,
            water_heater_type: typicalWhType,
            sources: sources,
            modifiers: modifiers,
            replacement_likely: replacementLikely,
            climate_zone: climateZone
          }
        };
      }
        };
      }
      
      return {
        value: '9-12',
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

// Phase 1.5: Enhanced HVAC detection with stricter anti-patterns
function isHvacPermit(permit: any): boolean {
  const desc = (permit.description || '').toLowerCase();
  const workType = (permit.work_type || '').toLowerCase();
  
  // Phase 1.5: Stricter anti-patterns first - exclude non-HVAC items
  const antiPatterns = [
    /\b(hurricane[\s-]?shutter|shutter|accordion|roll[\s-]?up)\b/,
    /\b(paver|driveway|concrete|walkway|sidewalk)\b/,
    /\b(pool|spa|deck|fence|gate)\b/,
    /\b(misc|miscellaneous)\b.*\b(paver|driveway|shutter)\b/
  ];
  
  // Check anti-patterns first - hard exclusion
  for (const antiPattern of antiPatterns) {
    if (antiPattern.test(desc) || antiPattern.test(workType)) {
      return false;
    }
  }
  
  // Enhanced HVAC patterns - must match at least one
  const hvacPatterns = [
    /\b(a\/c|air\s*conditioning?|hvac|heat\s*pump)\b/,
    /\b(change[\s-]?out|changeout|replacement|install|swap).*\b(a\/c|air|hvac|cooling|heating)\b/,
    /\b(split|package)[\s-]?(system|unit)\b/,
    /\b(\d+[\s-]?ton|tonnage)\b.*\b(a\/c|air|cooling|system)\b/,
    /\bmechanical\b.*\b(air|cooling|heating)\b/
  ];
  
  // Must match HVAC pattern
  return hvacPatterns.some(pattern => pattern.test(desc) || pattern.test(workType));
}

// Helper functions for material/type inference with ATTOM integration
function inferRoofMaterial(description: string, attomData?: any): string {
  // Check ATTOM data first for higher confidence
  if (attomData?.building?.construction?.roofcover) {
    const roofCover = attomData.building.construction.roofcover.toLowerCase();
    if (roofCover.includes('tile')) return 'tile';
    if (roofCover.includes('metal')) return 'metal';
    if (roofCover.includes('shingle') || roofCover.includes('asphalt')) return 'shingle';
  }
  
  // Fall back to permit description
  const desc = description?.toLowerCase() || '';
  if (desc.includes('tile')) return 'tile';
  if (desc.includes('metal')) return 'metal';
  if (desc.includes('shingle')) return 'shingle';
  return 'shingle'; // default
}

function inferHvacType(description: string): string {
  const desc = description?.toLowerCase() || '';
  
  // Enhanced matching for audit case: "a/c change out 4 ton split system"
  if (desc.includes('split') || desc.includes('split system')) return 'split_system';
  if (desc.includes('heat pump')) return 'heat_pump';
  if (desc.includes('packaged') || desc.includes('package unit')) return 'packaged_unit';
  if (desc.includes('central air') || desc.includes('central')) return 'central_air';
  
  return 'central_air'; // default
}

function inferWaterHeaterType(description: string, attomData?: any, climateZone?: string): string {
  // Enhanced defaults based on ATTOM heating fuel and region
  const desc = description?.toLowerCase() || '';
  
  // Check permit description first
  if (desc.includes('tankless')) return 'tankless';
  if (desc.includes('electric')) return 'tank_electric';
  if (desc.includes('gas')) return 'tank_gas';
  
  // Use ATTOM heating fuel data for better regional defaults - Phase 1.5: Enhanced confidence
  if (attomData?.utilities?.heatingfuel) {
    const heatingFuel = attomData.utilities.heatingfuel.toLowerCase();
    if (heatingFuel.includes('electric') && climateZone === 'florida') {
      return 'tank_electric'; // Florida with electric heating likely has electric WH
    } else if (heatingFuel.includes('electric')) {
      return 'tank_electric';
    } else if (heatingFuel.includes('gas')) {
      return 'tank_gas';
    }
  }
  
  // Phase 1.5: Better Florida defaults - electric preferred in FL
  return climateZone === 'florida' ? 'tank_electric' : 'tank_gas';
}

// Phase 1.5: Money normalization for implausible permit values
function normalizePermitValue(value: number, permitType?: string): { value: number; normalized: boolean } {
  const type = (permitType || '').toLowerCase();
  const likelyCents = value > 100000 && /air|driveway|shutter|misc|paver/i.test(type);
  
  return {
    value: likelyCents ? Math.round(value / 100) : value,
    normalized: likelyCents
  };
}

// Phase 1.5: Backfill property coordinates from ATTOM
function backfillPropertyCoords(currentLat: number | null, currentLon: number | null, attomData: any): { lat: number | null; lon: number | null; source?: string } {
  if (!currentLat && !currentLon && attomData?.location?.latitude && attomData?.location?.longitude) {
    return {
      lat: parseFloat(attomData.location.latitude),
      lon: parseFloat(attomData.location.longitude),
      source: 'attom'
    };
  }
  return { lat: currentLat, lon: currentLon };
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

    // Phase 1.5: Backfill lat/lon from ATTOM if missing
    const attomData = snapshots.find(s => s.provider === 'attom')?.payload;
    if (attomData && !property.lat && !property.lon) {
      const coords = backfillPropertyCoords(property.lat, property.lon, attomData);
      if (coords.lat && coords.lon) {
        await supabase
          .from('properties_sample')
          .update({ lat: coords.lat, lon: coords.lon })
          .eq('address_id', address_id);
        console.log(`Backfilled coordinates from ATTOM: ${coords.lat}, ${coords.lon}`);
      }
    }

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