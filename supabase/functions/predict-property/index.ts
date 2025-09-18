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

// Phase 1.5 Configuration constants - Enhanced confidence system
export const BASES = {
  permit: 0.90,           // Permit-derived predictions (0.85-0.95 with bonuses)
  attom_enhanced: 0.70,   // ATTOM with cross-validation (0.6-0.8 range)
  attom_basic: 0.60,      // ATTOM data alone (0.5-0.7 range)
  inferred: 0.50,         // Regional inference (0.4-0.5 range)
  default: 0.28           // Defaults (0.25-0.35 range)
};

export const MODS = {
  recency: 0.05,          // Recent permit bonus
  crossVal: 0.05,         // Cross-validation bonus
  climate: 0.05,          // Climate factor bonus
  material: 0.05,         // ATTOM material data bonus
  exceedsNoPermit: -0.10  // Age exceeds lifespan without permit
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

// Phase 1.5: Enhanced climate zone detection with comprehensive Florida logic
function getClimateZone(smartyData: any, attomData: any): string {
  // Try Smarty data first
  const state = smartyData?.components?.state_abbreviation;
  if (state === 'FL') return 'florida';
  
  // Enhanced ATTOM data extraction
  const attomExtracted = extractAttomData(attomData);
  
  if (attomExtracted?.address?.state === 'FL') return 'florida';
  
  // Check locality/city for Florida indicators
  const locality = attomExtracted?.address?.locality;
  if (locality) {
    const floridaCities = [
      'miami', 'palm beach', 'boca raton', 'delray', 'fort lauderdale',
      'hollywood', 'pompano', 'coral springs', 'wellington', 'boynton',
      'west palm', 'dania', 'wilton manors', 'plantation', 'davie',
      'pembroke', 'sunrise', 'margate', 'coconut creek', 'orlando',
      'tampa', 'jacksonville', 'tallahassee', 'gainesville', 'pensacola',
      'clearwater', 'st petersburg', 'naples', 'sarasota', 'bradenton',
      'lakeland', 'ocala', 'melbourne', 'vero beach', 'winter park'
    ];
    
    const localityLower = locality.toLowerCase();
    if (floridaCities.some(city => localityLower.includes(city))) {
      console.log(`Climate zone detection: Florida detected via locality: ${locality}`);
      return 'florida';
    }
  }
  
  console.log(`Climate zone detection: Default (state: ${attomExtracted?.address?.state}, locality: ${locality})`);
  return 'default';
}

// Phase 1.5: Comprehensive ATTOM data extraction with multiple format support
function extractAttomData(attomPayload: any) {
  if (!attomPayload) return null;
  
  // Handle both direct ATTOM response and nested _attomData structure
  const data = attomPayload._attomData || attomPayload;
  
  // Enhanced extraction with comprehensive path fallbacks
  const extracted = {
    yearBuilt: data?.summary?.yearbuilt || 
               data?.building?.summary?.yearbuilt ||
               data?.property?.summary?.yearbuilt ||
               data?.year_built ||
               null,
    effectiveYear: data?.building?.summary?.yearbuilteffective ||
                   data?.summary?.yearbuilteffective ||
                   null,
    roofMaterial: data?.building?.construction?.roofcover ||
                  data?.construction?.roofcover ||
                  null,
    heatingFuel: data?.utilities?.heatingfuel ||
                 data?.building?.utilities?.heatingfuel ||
                 null,
    coolingType: data?.utilities?.coolingtype ||
                 data?.building?.utilities?.coolingtype ||
                 data?.utilities?.energyType ||
                 null,
    coordinates: {
      latitude: data?.location?.latitude || null,
      longitude: data?.location?.longitude || null
    },
    address: {
      state: data?.address?.countrySubd || data?.location?.state || null,
      locality: data?.address?.locality || data?.location?.city || null
    }
  };

  console.log('ATTOM data extraction:', {
    yearBuilt: extracted.yearBuilt,
    effectiveYear: extracted.effectiveYear,
    roofMaterial: extracted.roofMaterial,
    heatingFuel: extracted.heatingFuel,
    coolingType: extracted.coolingType,
    state: extracted.address.state,
    locality: extracted.address.locality,
    hasCoords: !!(extracted.coordinates.latitude && extracted.coordinates.longitude)
  });

  return extracted;
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

// Phase 1.5: Enhanced HVAC detection with comprehensive anti-patterns
function isHvacPermit(permit: any): boolean {
  const desc = (permit.description || '').toLowerCase();
  const workType = (permit.work_type || '').toLowerCase();
  const permitType = (permit.permit_type || '').toLowerCase();
  
  // Phase 1.5: Comprehensive anti-patterns - hard exclusions first
  const antiPatterns = [
    /\b(hurricane[\s-]?shutter|shutter|accordion|roll[\s-]?up|storm[\s-]?shutter)\b/,
    /\b(paver|driveway|concrete|walkway|sidewalk|asphalt)\b/,
    /\b(pool|spa|deck|fence|gate|pergola)\b/,
    /\b(window|door|screen|glass)\b.*\b(install|replace|repair|frame)\b/,
    /\b(misc|miscellaneous)\b.*\b(paver|driveway|shutter|fence|deck)\b/,
    /\b(electrical|plumbing)\b.*\b(outlet|fixture|pipe|drain)\b/,
    /\b(kitchen|bathroom|cabinet|counter|tile)\b/,
    /\b(paint|flooring|carpet|wood|vinyl)\b/,
    /\b(landscaping|irrigation|sprinkler)\b/
  ];
  
  // Check anti-patterns first - hard exclusion
  for (const antiPattern of antiPatterns) {
    if (antiPattern.test(`${desc} ${workType} ${permitType}`)) {
      return false;
    }
  }
  
  // Enhanced HVAC patterns - must match at least one
  const hvacPatterns = [
    /\b(a\/c|air\s*conditioning?|hvac|heat\s*pump|air\s*handler)\b/,
    /\b(change[\s-]?out|changeout|replacement|install|swap).*\b(a\/c|air|hvac|cooling|heating|unit)\b/,
    /\b(split|package|central)[\s-]?(system|unit|air)\b/,
    /\b(\d+[\s-]?ton|tonnage)\b.*\b(a\/c|air|cooling|system|unit)\b/,
    /\bmechanical\b.*\b(air|cooling|heating|ventilation)\b/,
    /\b(mechout|mech[\s-]?out|mechanical[\s-]?permit)\b/,
    /\b(ductwork|duct|ventilation|thermostat)\b/
  ];
  
  // Must match HVAC pattern
  const isHvac = hvacPatterns.some(pattern => pattern.test(`${desc} ${workType} ${permitType}`));
  
  if (isHvac) {
    console.log(`HVAC permit detected: ${desc} | ${workType} | ${permitType}`);
  }
  
  return isHvac;
}

// Enhanced helper functions with improved ATTOM data handling
function inferRoofMaterial(description: string, attomData?: any): string {
  const attomExtracted = extractAttomData(attomData);
  
  // Check ATTOM data first for higher confidence  
  if (attomExtracted?.roofMaterial) {
    const roofCover = attomExtracted.roofMaterial.toLowerCase();
    if (roofCover.includes('tile')) return 'tile';
    if (roofCover.includes('metal')) return 'metal';
    if (roofCover.includes('shingle') || roofCover.includes('asphalt') || roofCover.includes('composition')) return 'shingle';
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
  const desc = description?.toLowerCase() || '';
  const attomExtracted = extractAttomData(attomData);
  
  // Check permit description first
  if (desc.includes('tankless')) return 'tankless';
  if (desc.includes('electric')) return 'tank_electric';
  if (desc.includes('gas')) return 'tank_gas';
  
  // Phase 1.5: Enhanced ATTOM heating fuel prioritization
  if (attomExtracted?.heatingFuel) {
    const heatingFuel = attomExtracted.heatingFuel.toLowerCase();
    if (heatingFuel.includes('electric')) {
      return 'tank_electric'; // Prioritize ATTOM data over region
    } else if (heatingFuel.includes('gas')) {
      return 'tank_gas'; // Prioritize ATTOM data over region
    }
  }
  
  // Phase 1.5: Better Florida defaults - electric preferred in FL  
  return climateZone === 'florida' ? 'tank_electric' : 'tank_gas';
}

// Phase 1.5: Enhanced permit value normalization and date validation
function normalizePermitValue(value: number, description?: string): { value: number; normalized: boolean } {
  if (!value || value <= 0) return { value: 0, normalized: false };
  
  // Detect inflated values (likely in cents instead of dollars)
  const desc = (description || '').toLowerCase();
  const isLikelyCents = value > 50000 && (
    /\b(ac|air|hvac|roof|water[\s-]?heater|shutter|fence|driveway)\b/.test(desc) ||
    value > 1000000 // Values over $1M are almost certainly in cents
  );
  
  if (isLikelyCents) {
    console.log(`Permit value normalization: ${value} → ${Math.round(value / 100)} (likely cents → dollars)`);
    return {
      value: Math.round(value / 100),
      normalized: true
    };
  }
  
  return { value: value, normalized: false };
}

// Phase 1.5: Enhanced permit date validation with proper fallbacks
function extractPermitDate(permit: any): { date: Date | null; year: number | null; source: string } {
  const dateFields = [
    { field: permit.issue_date || permit.date_issued, name: 'issue_date' },
    { field: permit.start_date, name: 'start_date' },
    { field: permit.end_date || permit.date_finaled, name: 'end_date' },
    { field: permit.file_date || permit.applied_date, name: 'file_date' }
  ];
  
  for (const { field, name } of dateFields) {
    if (field) {
      const date = new Date(field);
      const year = date.getFullYear();
      
      // Validate year is reasonable (after 1980, before 2030)
      if (year >= 1980 && year <= 2030 && !isNaN(date.getTime())) {
        return { date, year, source: name };
      } else {
        console.warn(`Invalid permit date detected: ${field} (${name}) → year ${year}`);
      }
    }
  }
  
  console.warn('No valid permit date found, falling back to null');
  return { date: null, year: null, source: 'none' };
}

// Phase 1.5: Backfill property coordinates from ATTOM
function backfillPropertyCoords(currentLat: number | null, currentLon: number | null, attomData: any): { lat: number | null; lon: number | null; source?: string } {
  const attomExtracted = extractAttomData(attomData);
  
  if (!currentLat && !currentLon && attomExtracted?.coordinates?.latitude && attomExtracted?.coordinates?.longitude) {
    return {
      lat: parseFloat(attomExtracted.coordinates.latitude),
      lon: parseFloat(attomExtracted.coordinates.longitude),
      source: 'attom'
    };
  }
  return { lat: currentLat, lon: currentLon };
}

// Enhanced prediction rules with Phase 1.5 improvements
const predictionRules: PredictionRule[] = [
  {
    field: 'roof_age_bucket',
    predict: (snapshots, property, lifespanData, climateFactors) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      const attomData = snapshots.find(s => s.provider === 'attom')?.payload;
      const smartyData = snapshots.find(s => s.provider === 'smarty')?.payload;
      
      const climateZone = getClimateZone(smartyData, attomData);
      const attomExtracted = extractAttomData(attomData);
      
      let baseConfidence = BASES.default;
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
          const latestPermit = roofPermits.sort((a: any, b: any) => {
            const dateA = extractPermitDate(a);
            const dateB = extractPermitDate(b);
            return (dateB.date?.getTime() || 0) - (dateA.date?.getTime() || 0);
          })[0];
          
          const { date: permitDate, year: permitYear, source: dateSource } = extractPermitDate(latestPermit);
          
          if (!permitDate || !permitYear) {
            console.warn('Invalid roof permit date, skipping permit-based prediction');
          } else {
            const age = 2024 - permitYear;
          
          baseConfidence = BASES.permit;
          sources.push(`roof permit ${permitYear}`);
          
          // Recency bonus
          if (age < 2) {
            baseConfidence += MODS.recency;
            modifiers.push('recent permit');
          }
          
          const roofMaterial = inferRoofMaterial(latestPermit.description, attomData);
          const lifespanInfo = getLifespanData(lifespanData, 'roof', roofMaterial, climateZone);
          
          let replacementLikely = false;
          if (lifespanInfo) {
            const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
            replacementLikely = calculateReplacementLikelihood(age, adjustedMaxLifespan, true);
            
            if (climateZone !== 'default') {
              baseConfidence += MODS.climate;
              modifiers.push(`${climateZone} climate adjusted`);
            }
          }
          
          const bucket = bucketizeAge(age, 'roof');
          
            return {
              value: bucket,
              confidence: clampConfidence(baseConfidence),
              provenance: { 
                source: 'shovels_permit_enhanced',
                permit_year: permitYear,
                roof_material: roofMaterial,
                sources: sources,
                modifiers: modifiers,
                replacement_likely: replacementLikely,
                climate_zone: climateZone,
                date_source: dateSource,
                observed_at: permitDate.toISOString()
              }
            };
          }
        }
      }
      
      // Phase 1.5: Use ATTOM yearbuilt/effective with proper confidence tiers
      const installYear = attomExtracted?.effectiveYear || attomExtracted?.yearBuilt || property.year_built;
      
      if (installYear) {
        const houseAge = 2024 - installYear;
        sources.push(`built ${installYear}`);
        
        // Enhanced confidence based on available ATTOM data
        if (attomExtracted?.roofMaterial) {
          baseConfidence = BASES.attom_enhanced; // 0.70 base
          sources.push(`ATTOM roofcover: ${attomExtracted.roofMaterial}`);
          modifiers.push('material confirmed');
        } else {
          baseConfidence = BASES.attom_basic; // 0.60 base  
        }
        
        const roofMaterial = inferRoofMaterial('', attomData);
        const lifespanInfo = getLifespanData(lifespanData, 'roof', roofMaterial, climateZone);
        
        let estimatedRoofAge = houseAge;
        let replacementLikely = false;
        
        if (lifespanInfo) {
          const adjustedTypicalLifespan = applyClimateFactors(lifespanInfo.typical_years, climateFactors, climateZone);
          
          // Assume roof replacement based on typical lifespan
          if (houseAge > adjustedTypicalLifespan) {
            estimatedRoofAge = houseAge - adjustedTypicalLifespan;
            sources.push(`estimated replacement after ${adjustedTypicalLifespan}y`);
          }
          
          const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
          replacementLikely = calculateReplacementLikelihood(estimatedRoofAge, adjustedMaxLifespan, false);
          
          if (replacementLikely) {
            modifiers.push('age exceeds expected lifespan without permit');
            baseConfidence += MODS.exceedsNoPermit;
          }
        }
        
        if (climateZone !== 'default') {
          baseConfidence += MODS.climate;
          modifiers.push(`${climateZone} climate factors applied`);
        }
        
        const bucket = bucketizeAge(estimatedRoofAge, 'roof');
        
        return {
          value: bucket,
          confidence: clampConfidence(baseConfidence),
          provenance: { 
            source: attomExtracted?.roofMaterial ? 'attom_enhanced' : 'attom_basic',
            house_age: houseAge,
            estimated_roof_age: estimatedRoofAge,
            roof_material: roofMaterial,
            sources: sources,
            modifiers: modifiers,
            replacement_likely: replacementLikely,
            climate_zone: climateZone,
            install_year: installYear
          }
        };
      }
      
      return {
        value: '11-15',
        confidence: BASES.default,
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
      const smartyData = snapshots.find(s => s.provider === 'smarty')?.payload;
      
      const climateZone = getClimateZone(smartyData, attomData);
      const attomExtracted = extractAttomData(attomData);
      
      let baseConfidence = BASES.attom_basic; // 0.60 base confidence
      let sources = [];
      let modifiers = [];
      
      // Phase 1.5: Use ATTOM cooling data with cross-validation bonus
      if (attomExtracted?.coolingType) {
        const coolingType = attomExtracted.coolingType.toLowerCase();
        sources.push(`ATTOM cooling: ${attomExtracted.coolingType}`);
        
        // Check for recent HVAC permit for cross-validation
        const recentHvacPermit = shovelsData?.permits?.some((p: any) => {
          const isHvac = isHvacPermit(p);
          const permitDate = new Date(p.issue_date || p.date_issued);
          const age = 2024 - permitDate.getFullYear();
          return isHvac && age < 5;
        });
        
        if (recentHvacPermit) {
          baseConfidence = BASES.attom_enhanced; // Upgrade to 0.70
          baseConfidence += MODS.crossVal;
          modifiers.push('cross-validated with permit');
        }
        
        if (coolingType === 'yes' || coolingType.includes('central') || coolingType.includes('air')) {
          return {
            value: 'true',
            confidence: clampConfidence(baseConfidence),
            provenance: { 
              source: recentHvacPermit ? 'attom_cross_validated' : 'attom_enhanced',
              sources: sources,
              modifiers: modifiers,
              signal: coolingType,
              climate_zone: climateZone
            }
          };
        } else if (coolingType.includes('no') || coolingType.includes('none')) {
          return {
            value: 'false',
            confidence: clampConfidence(baseConfidence),
            provenance: { 
              source: recentHvacPermit ? 'attom_cross_validated' : 'attom_enhanced',
              sources: sources,
              modifiers: modifiers,
              signal: coolingType,
              climate_zone: climateZone
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
      const attomData = snapshots.find(s => s.provider === 'attom')?.payload;
      const smartyData = snapshots.find(s => s.provider === 'smarty')?.payload;
      
      const climateZone = getClimateZone(smartyData, attomData);
      const attomExtracted = extractAttomData(attomData);
      
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
          
          const hvacType = inferHvacType(description);
          const permitDate = new Date(latestPermit.issue_date || latestPermit.date_issued);
          const age = 2024 - permitDate.getFullYear();
          
          let baseConfidence = BASES.permit;
          
          // Recency bonus for recent permits
          if (age < 3) {
            baseConfidence += MODS.recency;
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
      
      // Phase 1.5: Use ATTOM heating fuel to infer system type
      let systemType = 'central_air'; // default
      let baseConfidence = BASES.inferred;
      
      if (attomExtracted?.heatingFuel) {
        const heatingFuel = attomExtracted.heatingFuel.toLowerCase();
        sources.push(`ATTOM heating fuel: ${attomExtracted.heatingFuel}`);
        baseConfidence = BASES.attom_basic; // 0.60
        
        if (heatingFuel.includes('gas')) {
          systemType = climateZone === 'florida' ? 'central_gas_split' : 'central_air';
        } else if (heatingFuel.includes('electric')) {
          systemType = climateZone === 'florida' ? 'central_electric_split' : 'central_air';
        }
      } else {
        // Default based on climate zone
        systemType = climateZone === 'florida' ? 'split_system' : 'central_air';
        sources.push(`${climateZone} climate default`);
      }
      
      if (climateZone !== 'default') {
        baseConfidence += MODS.climate;
        modifiers.push(`${climateZone} climate factors applied`);
      }
      
      return {
        value: systemType,
        confidence: clampConfidence(baseConfidence),
        provenance: { 
          source: attomExtracted?.heatingFuel ? 'attom_enhanced' : 'climate_default',
          sources: sources,
          modifiers: modifiers,
          climate_zone: climateZone,
          heating_fuel: attomExtracted?.heatingFuel
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
      
      const climateZone = getClimateZone(smartyData, attomData);
      const attomExtracted = extractAttomData(attomData);
      
      let sources = [];
      let modifiers = [];
      
      // Check for HVAC permits using enhanced detection
      if (shovelsData?.permits) {
        const hvacPermits = shovelsData.permits.filter((p: any) => isHvacPermit(p));
        
        if (hvacPermits.length > 0) {
          const latestPermit = hvacPermits.sort((a: any, b: any) => {
            const dateA = extractPermitDate(a);
            const dateB = extractPermitDate(b);
            return (dateB.date?.getTime() || 0) - (dateA.date?.getTime() || 0);
          })[0];
          
          const { date: permitDate, year: permitYear, source: dateSource } = extractPermitDate(latestPermit);
          
          if (!permitDate || !permitYear) {
            console.warn('Invalid HVAC permit date, skipping permit-based prediction');
          } else {
            const age = 2024 - permitYear;
          
          sources.push(`hvac permit ${permitYear}: ${latestPermit.description}`);
          
          const hvacType = inferHvacType(latestPermit.description);
          const lifespanInfo = getLifespanData(lifespanData, 'hvac', hvacType, climateZone);
          
          let baseConfidence = BASES.permit;
          let replacementLikely = false;
          
          // Recency bonus for very recent permits
          if (age < 2) {
            baseConfidence += MODS.recency;
            modifiers.push('recent permit');
          }
          
          if (lifespanInfo) {
            const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
            replacementLikely = calculateReplacementLikelihood(age, adjustedMaxLifespan, true);
            
            if (climateZone !== 'default') {
              baseConfidence += MODS.climate;
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
                date_source: dateSource,
                observed_at: permitDate.toISOString()
              }
            };
          }
        }
      }
      
      // Phase 1.5: Enhanced ATTOM-based age estimation
      const installYear = attomExtracted?.effectiveYear || attomExtracted?.yearBuilt || property.year_built;
      
      if (installYear) {
        const homeAge = 2024 - installYear;
        sources.push(`built ${installYear}`);
        
        let baseConfidence = BASES.attom_basic; // 0.60 for ATTOM data
        let estimatedHvacAge = homeAge;
        
        // Enhance confidence if we have ATTOM utilities data
        if (attomExtracted?.heatingFuel || attomExtracted?.coolingType) {
          baseConfidence = BASES.attom_enhanced; // 0.70 for enhanced ATTOM
          sources.push(`ATTOM utilities: ${attomExtracted.heatingFuel || attomExtracted.coolingType}`);
        }
        
        const typicalHvacType = climateZone === 'florida' ? 'split_system' : 'central_air';
        const lifespanInfo = getLifespanData(lifespanData, 'hvac', typicalHvacType, climateZone);
        
        let replacementLikely = false;
        
        if (lifespanInfo) {
          const adjustedTypicalLifespan = applyClimateFactors(lifespanInfo.typical_years, climateFactors, climateZone);
          
          // Assume HVAC replaced based on typical lifespan
          if (homeAge > adjustedTypicalLifespan) {
            estimatedHvacAge = homeAge - adjustedTypicalLifespan;
            sources.push(`estimated replacement after ${adjustedTypicalLifespan}y`);
          }
          
          const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
          replacementLikely = calculateReplacementLikelihood(estimatedHvacAge, adjustedMaxLifespan, false);
          
          if (replacementLikely) {
            modifiers.push('age exceeds expected lifespan without permit');
            baseConfidence += MODS.exceedsNoPermit;
          }
        }
        
        if (climateZone !== 'default') {
          baseConfidence += MODS.climate;
          modifiers.push(`${climateZone} climate factors applied`);
        }
        
        const bucket = bucketizeAge(estimatedHvacAge, 'hvac');
        
        return {
          value: bucket,
          confidence: clampConfidence(baseConfidence),
          provenance: { 
            source: (attomExtracted?.heatingFuel || attomExtracted?.coolingType) ? 'attom_enhanced' : 'attom_basic',
            home_age: homeAge,
            estimated_hvac_age: estimatedHvacAge,
            hvac_type: typicalHvacType,
            sources: sources,
            modifiers: modifiers,
            replacement_likely: replacementLikely,
            climate_zone: climateZone,
            install_year: installYear
          }
        };
      }
      
      return {
        value: '10-12',
        confidence: BASES.default,
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
      
      const climateZone = getClimateZone(smartyData, attomData);
      const attomExtracted = extractAttomData(attomData);
      
      let sources = [];
      let modifiers = [];
      
      // Check permits for water heater type first
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
            confidence: clampConfidence(BASES.permit - 0.1),
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
      
      // Phase 1.5: Prioritize ATTOM heating fuel over regional defaults
      if (attomExtracted?.heatingFuel) {
        const heatingFuel = attomExtracted.heatingFuel.toLowerCase();
        let whType;
        let baseConfidence;
        
        if (heatingFuel.includes('electric')) {
          whType = 'tank_electric';
          baseConfidence = BASES.attom_enhanced; // 0.70 for ATTOM fuel data
          sources.push(`ATTOM heating fuel: ${attomExtracted.heatingFuel} → electric WH`);
        } else if (heatingFuel.includes('gas')) {
          whType = 'tank_gas';
          baseConfidence = BASES.attom_enhanced; // 0.70 for ATTOM fuel data  
          sources.push(`ATTOM heating fuel: ${attomExtracted.heatingFuel} → gas WH`);
        } else {
          // Fallback to climate defaults for other fuel types
          whType = climateZone === 'florida' ? 'tank_electric' : 'tank_gas';
          baseConfidence = BASES.attom_basic; // 0.60
          sources.push(`ATTOM fuel: ${attomExtracted.heatingFuel}, climate default: ${whType}`);
        }
        
        if (climateZone !== 'default') {
          baseConfidence += MODS.climate;
          modifiers.push(`${climateZone} climate factors applied`);
        }
        
        return {
          value: whType,
          confidence: clampConfidence(baseConfidence),
          provenance: { 
            source: 'attom_fuel_enhanced',
            sources: sources,
            modifiers: modifiers,
            climate_zone: climateZone,
            heating_fuel: attomExtracted.heatingFuel
          }
        };
      }
      
      // Fallback to pure regional default only when ATTOM data missing
      const intelligentDefault = climateZone === 'florida' ? 'tank_electric' : 'tank_gas';
      sources.push(`${climateZone} statistical default (no ATTOM fuel data)`);
      
      return {
        value: intelligentDefault,
        confidence: clampConfidence(BASES.inferred),
        provenance: { 
          source: 'regional_statistical_default',
          sources: sources,
          modifiers: modifiers,
          climate_zone: climateZone,
          meta: 'Regional preference applied - no ATTOM fuel data available'
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
      
      const climateZone = getClimateZone(smartyData, attomData);
      const attomExtracted = extractAttomData(attomData);
      
      let sources = [];
      let modifiers = [];
      
      // Check for water heater permits
      if (shovelsData?.permits) {
        const whPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('water heater') ||
          p.description?.toLowerCase().includes('hot water')
        );
        
        if (whPermits.length > 0) {
          const latestPermit = whPermits.sort((a: any, b: any) => {
            const dateA = extractPermitDate(a);
            const dateB = extractPermitDate(b);
            return (dateB.date?.getTime() || 0) - (dateA.date?.getTime() || 0);
          })[0];
          
          const { date: permitDate, year: permitYear, source: dateSource } = extractPermitDate(latestPermit);
          
          if (!permitDate || !permitYear) {
            console.warn('Invalid water heater permit date, skipping permit-based prediction');
          } else {
            const age = 2024 - permitYear;
          
          sources.push(`water heater permit ${permitYear}: ${latestPermit.description}`);
          
          const whType = inferWaterHeaterType(latestPermit.description, attomData, climateZone);
          const lifespanInfo = getLifespanData(lifespanData, 'water_heater', whType, climateZone);
          
          let baseConfidence = BASES.permit;
          let replacementLikely = false;
          
          if (lifespanInfo) {
            const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
            replacementLikely = calculateReplacementLikelihood(age, adjustedMaxLifespan, true);
            
            if (climateZone !== 'default') {
              baseConfidence += MODS.climate;
              modifiers.push(`${climateZone} climate adjusted`);
            }
          }
          
          const bucket = bucketizeAge(age, 'water_heater');
          
            return {
              value: bucket,
              confidence: clampConfidence(baseConfidence),
              provenance: { 
                source: 'shovels_permit_enhanced',
                permit_year: permitYear,
                water_heater_type: whType,
                sources: sources,
                modifiers: modifiers,
                replacement_likely: replacementLikely,
                climate_zone: climateZone,
                date_source: dateSource,
                observed_at: permitDate.toISOString()
              }
            };
          }
        }
      }
      
      // Phase 1.5: Enhanced age estimation with proper lifespan logic
      const installYear = attomExtracted?.effectiveYear || attomExtracted?.yearBuilt || property.year_built;
      
      if (installYear) {
        const homeAge = 2024 - installYear;
        sources.push(`built ${installYear}`);
        
        const typicalWhType = inferWaterHeaterType('', attomData, climateZone);
        const lifespanInfo = getLifespanData(lifespanData, 'water_heater', typicalWhType, climateZone);
        
        let estimatedWhAge = homeAge; // Start with actual house age
        let baseConfidence = BASES.attom_basic; // 0.60 for ATTOM data
        let replacementLikely = false;
        
        // Enhance confidence if we have ATTOM heating fuel data
        if (attomExtracted?.heatingFuel) {
          baseConfidence = BASES.attom_enhanced; // 0.70 for enhanced ATTOM
          sources.push(`ATTOM heating fuel: ${attomExtracted.heatingFuel}`);
        }
        
        if (lifespanInfo) {
          const adjustedMaxLifespan = applyClimateFactors(lifespanInfo.max_years, climateFactors, climateZone);
          const adjustedTypicalLifespan = applyClimateFactors(lifespanInfo.typical_years, climateFactors, climateZone);
          
          // Phase 1.5: For houses older than max lifespan, force age to at least 13+ years
          if (homeAge > adjustedMaxLifespan) {
            estimatedWhAge = Math.max(homeAge, 13); // Force to 13+ bucket per feedback
            replacementLikely = true;
            modifiers.push('exceeds expected lifespan without permit');
            baseConfidence += MODS.exceedsNoPermit;
          } else if (homeAge > adjustedTypicalLifespan) {
            // Assume replacement based on typical lifespan
            estimatedWhAge = homeAge - adjustedTypicalLifespan;
            sources.push(`estimated replacement after ${adjustedTypicalLifespan}y`);
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
            source: attomExtracted?.heatingFuel ? 'attom_enhanced' : 'attom_basic',
            home_age: homeAge,
            estimated_wh_age: estimatedWhAge,
            water_heater_type: typicalWhType,
            sources: sources,
            modifiers: modifiers,
            replacement_likely: replacementLikely,
            climate_zone: climateZone,
            install_year: installYear
          }
        };
       }
      
      return {
        value: '9-12',
        confidence: BASES.default,
        provenance: { 
          source: 'typical_lifespan_default',
          sources: ['no data available'],
          modifiers: []
        }
      };
    }
  }
];

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

    // Generate predictions using enhanced rules
    const predictions = [];
    
    for (const rule of predictionRules) {
      try {
        const prediction = rule.predict(snapshots, property, lifespanData, climateFactors);
        
        const predictionRecord = {
          prediction_id: crypto.randomUUID(),
          address_id: address_id,
          prediction_run_id: predictionRunId,
          field: rule.field,
          predicted_value: prediction.value,
          confidence_0_1: prediction.confidence,
          data_provenance: prediction.provenance,
          predicted_at: new Date().toISOString(),
          model_version: 'phase_1_5_enhanced'
        };
        
        // Phase 1.5: Implement proper upsert to prevent duplicates
        const { error } = await supabase
          .from('predictions')
          .upsert(predictionRecord, {
            onConflict: 'address_id,field,model_version',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`Failed to save prediction for ${rule.field}:`, error);
          // Fallback to regular insert if upsert fails
          const { error: insertError } = await supabase
            .from('predictions')
            .insert(predictionRecord);
          if (insertError) {
            console.error(`Fallback insert also failed for ${rule.field}:`, insertError);
          }
        } else {
          console.log(`Saved enhanced prediction for ${rule.field}: ${prediction.value} (conf: ${prediction.confidence.toFixed(2)})`);
        }
        
        predictions.push(predictionRecord);
      } catch (error) {
        console.error(`Error generating prediction for ${rule.field}:`, error);
      }
    }

    console.log(`Enhanced predictions completed. Generated ${predictions.length} predictions with climate-aware logic.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        predictions_generated: predictions.length,
        prediction_run_id: predictionRunId,
        address_id: address_id,
        model_version: 'phase_1_5_enhanced'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in predict-property function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});