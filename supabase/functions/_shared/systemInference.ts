/**
 * SystemInference - Deterministic rules for timeline calculation
 * 
 * GLOBAL RULES (Non-Negotiable):
 * G1: Permits always win — permit date becomes anchor
 * G2: No permit ≠ no replacement — absence doesn't imply original
 * G3: Inference widens windows, never tightens
 * G4: Climate modifies, never replaces
 * 
 * @version v1
 */

import { SYSTEM_CONFIGS, type SystemType } from './systemConfigs.ts';

// ============== Types ==============

export interface PropertyContext {
  yearBuilt: number;
  state: string;
  city?: string;
  roofMaterial?: 'asphalt' | 'tile' | 'metal' | 'unknown';
  waterHeaterType?: 'tank' | 'tankless' | 'unknown';
}

export interface RegionContext {
  isHotHumid: boolean;  // South Florida, Gulf Coast
  climateMultiplier: number;  // 0.85–1.0 (lower = harsher climate)
}

export interface InferredInstall {
  installYear: number | null;
  installSource: 'permit' | 'inferred' | 'unknown';
  dataQuality: 'high' | 'medium' | 'low';
  rationale: string;
}

export interface ReplacementWindow {
  earlyYear: number;
  likelyYear: number;
  lateYear: number;
  windowUncertainty: 'narrow' | 'medium' | 'wide';
  rationale: string;
}

export interface CapitalCostRange {
  low: number;
  high: number;
  costDrivers: string[];
}

export interface LifespanDriver {
  factor: string;
  impact: 'increase' | 'decrease';
  severity: 'low' | 'medium' | 'high';
  description?: string;
}

export interface MaintenanceEffect {
  shiftsTimeline: boolean;
  expectedDelayYears?: number;
  uncertaintyReduction?: 'low' | 'medium' | 'high';
  explanation: string;
}

export interface InferredTimeline {
  systemId: 'hvac' | 'roof' | 'water_heater';
  systemLabel: string;
  category: 'mechanical' | 'structural' | 'utility';
  install: InferredInstall;
  replacementWindow: ReplacementWindow;
  capitalCost: CapitalCostRange;
  lifespanDrivers: LifespanDriver[];
  maintenanceEffect: MaintenanceEffect;
  disclosureNote: string;
}

// ============== Material-Specific Constants ==============

const ROOF_LIFESPANS: Record<string, { min: number; max: number }> = {
  asphalt: { min: 18, max: 25 },
  tile: { min: 35, max: 50 },
  metal: { min: 40, max: 70 },
  unknown: { min: 20, max: 30 },
};

const ROOF_COSTS: Record<string, { min: number; max: number }> = {
  asphalt: { min: 12000, max: 20000 },
  tile: { min: 18000, max: 35000 },
  metal: { min: 20000, max: 45000 },
  unknown: { min: 15000, max: 30000 },
};

const WATER_HEATER_LIFESPANS: Record<string, { min: number; max: number }> = {
  tank: { min: 8, max: 12 },
  tankless: { min: 15, max: 20 },
  unknown: { min: 8, max: 12 },
};

const WATER_HEATER_COSTS: Record<string, { min: number; max: number }> = {
  tank: { min: 1800, max: 3000 },
  tankless: { min: 3500, max: 6000 },
  unknown: { min: 1800, max: 3500 },
};

// ============== Permit Helpers ==============

interface PermitRecord {
  description?: string;
  permit_type?: string;
  date_finaled?: string;
  final_date?: string;
  approval_date?: string;
  date_issued?: string;
  issue_date?: string;
}

function hasValidPermit(systemType: 'hvac' | 'roof' | 'water_heater', permits: PermitRecord[]): boolean {
  if (!permits?.length) return false;
  const config = SYSTEM_CONFIGS[systemType];
  
  return permits.some(p => {
    const text = `${p.description || ''} ${p.permit_type || ''}`.toLowerCase();
    const hasKeyword = config.permitKeywords.some(kw => text.includes(kw));
    const hasDate = p.date_finaled || p.final_date || p.approval_date || p.date_issued || p.issue_date;
    return hasKeyword && hasDate;
  });
}

function extractPermitYear(systemType: 'hvac' | 'roof' | 'water_heater', permits: PermitRecord[]): number | null {
  if (!permits?.length) return null;
  const config = SYSTEM_CONFIGS[systemType];
  
  // Find matching permits with dates
  const matchingPermits = permits.filter(p => {
    const text = `${p.description || ''} ${p.permit_type || ''}`.toLowerCase();
    return config.permitKeywords.some(kw => text.includes(kw));
  });
  
  if (!matchingPermits.length) return null;
  
  // Sort by most authoritative date (finalization preferred)
  matchingPermits.sort((a, b) => {
    const getDate = (p: PermitRecord) => 
      p.date_finaled || p.final_date || p.approval_date || p.date_issued || p.issue_date;
    const dateA = getDate(a);
    const dateB = getDate(b);
    if (!dateA) return 1;
    if (!dateB) return -1;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  
  const latest = matchingPermits[0];
  const dateStr = latest.date_finaled || latest.final_date || latest.approval_date || latest.date_issued || latest.issue_date;
  
  return dateStr ? new Date(dateStr).getFullYear() : null;
}

// ============== Inference Functions ==============

/**
 * HVAC Inference (Reference - Already Validated)
 * 
 * Cases:
 * - HVAC-1: Permit found → installYear = permit.year, high confidence
 * - HVAC-2: No permit, yearBuilt ≤ 2005 → likely replaced, medium confidence
 * - HVAC-3: No permit, yearBuilt ≥ 2006 → likely original, medium confidence
 */
export function inferHVACTimeline(
  property: PropertyContext,
  region: RegionContext,
  permits: PermitRecord[]
): InferredTimeline {
  const currentYear = new Date().getFullYear();
  const { yearBuilt } = property;
  
  let install: InferredInstall;
  
  // Case HVAC-1: Permit found
  if (hasValidPermit('hvac', permits)) {
    const permitYear = extractPermitYear('hvac', permits);
    install = {
      installYear: permitYear,
      installSource: 'permit',
      dataQuality: 'high',
      rationale: 'HVAC replacement verified via building permit'
    };
  }
  // Case HVAC-2: No permit, older home
  else if (yearBuilt <= 2005) {
    const inferredYear = yearBuilt + 12; // Typical first replacement
    install = {
      installYear: Math.min(inferredYear, currentYear - 5),
      installSource: 'inferred',
      dataQuality: 'medium',
      rationale: 'HVAC replacement inferred based on typical service life and home age'
    };
  }
  // Case HVAC-3: No permit, newer home
  else {
    install = {
      installYear: yearBuilt,
      installSource: 'inferred',
      dataQuality: 'medium',
      rationale: 'HVAC assumed original with newer construction'
    };
  }
  
  const lifespan = { min: 12, max: 18 };
  const climateAdjustment = region.isHotHumid ? -2 : 0;
  const baseInstall = install.installYear || yearBuilt;
  
  const replacementWindow: ReplacementWindow = {
    earlyYear: baseInstall + lifespan.min + climateAdjustment,
    likelyYear: baseInstall + Math.round((lifespan.min + lifespan.max) / 2) + climateAdjustment,
    lateYear: baseInstall + lifespan.max,
    windowUncertainty: install.dataQuality === 'high' ? 'narrow' : 'medium',
    rationale: install.rationale
  };
  
  const lifespanDrivers: LifespanDriver[] = [];
  if (region.isHotHumid) {
    lifespanDrivers.push({
      factor: 'Hot/humid climate',
      impact: 'decrease',
      severity: 'medium',
      description: 'South Florida climate accelerates wear on HVAC systems'
    });
  }
  
  return {
    systemId: 'hvac',
    systemLabel: 'HVAC System',
    category: 'mechanical',
    install,
    replacementWindow,
    capitalCost: {
      low: 9000,
      high: 14000,
      costDrivers: ['System type', 'SEER rating', 'Labor rates']
    },
    lifespanDrivers,
    maintenanceEffect: {
      shiftsTimeline: true,
      expectedDelayYears: 3,
      uncertaintyReduction: 'medium',
      explanation: 'Regular maintenance typically extends HVAC lifespan and narrows uncertainty'
    },
    disclosureNote: 'Based on typical HVAC replacement patterns for your region'
  };
}

/**
 * Water Heater Inference
 * 
 * Cases:
 * - WH-1: Permit found → installYear = permit.year, high confidence
 * - WH-2: No permit, yearBuilt ≥ 2012 → likely original, medium confidence
 * - WH-3: No permit, 1990-2011 → likely replaced, low-medium confidence, wide window
 * - WH-4: No permit, < 1990 → assume at least one replacement, low confidence
 */
export function inferWaterHeaterTimeline(
  property: PropertyContext,
  region: RegionContext,
  permits: PermitRecord[]
): InferredTimeline {
  const currentYear = new Date().getFullYear();
  const { yearBuilt, waterHeaterType = 'unknown' } = property;
  
  let install: InferredInstall;
  let windowWidth: 'narrow' | 'medium' | 'wide' = 'medium';
  
  // Case WH-1: Permit found
  if (hasValidPermit('water_heater', permits)) {
    const permitYear = extractPermitYear('water_heater', permits);
    install = {
      installYear: permitYear,
      installSource: 'permit',
      dataQuality: 'high',
      rationale: 'Water heater replacement verified via building permit'
    };
    windowWidth = 'narrow';
  }
  // Case WH-2: No permit, recent build
  else if (yearBuilt >= 2012) {
    install = {
      installYear: yearBuilt,
      installSource: 'inferred',
      dataQuality: 'medium',
      rationale: 'Water heater assumed original with recent construction'
    };
    windowWidth = 'medium';
  }
  // Case WH-3: No permit, 1990-2011
  else if (yearBuilt >= 1990) {
    const inferredYear = yearBuilt + 12;
    install = {
      installYear: Math.min(inferredYear, currentYear - 3),
      installSource: 'inferred',
      dataQuality: 'low',
      rationale: 'Water heater replacement inferred due to missing permit history'
    };
    windowWidth = 'wide';
  }
  // Case WH-4: Pre-1990
  else {
    const inferredYear = yearBuilt + 18;
    install = {
      installYear: Math.min(inferredYear, currentYear - 5),
      installSource: 'inferred',
      dataQuality: 'low',
      rationale: 'At least one water heater replacement assumed for pre-1990 home'
    };
    windowWidth = 'wide';
  }
  
  const lifespan = WATER_HEATER_LIFESPANS[waterHeaterType] || WATER_HEATER_LIFESPANS.unknown;
  const costs = WATER_HEATER_COSTS[waterHeaterType] || WATER_HEATER_COSTS.unknown;
  const baseInstall = install.installYear || yearBuilt;
  
  const replacementWindow: ReplacementWindow = {
    earlyYear: baseInstall + lifespan.min,
    likelyYear: baseInstall + Math.round((lifespan.min + lifespan.max) / 2),
    lateYear: baseInstall + lifespan.max,
    windowUncertainty: windowWidth,
    rationale: install.rationale
  };
  
  return {
    systemId: 'water_heater',
    systemLabel: 'Water Heater',
    category: 'utility',
    install,
    replacementWindow,
    capitalCost: {
      low: costs.min,
      high: costs.max,
      costDrivers: ['Tank type', 'Fuel type', 'Labor rates']
    },
    lifespanDrivers: [],
    maintenanceEffect: {
      shiftsTimeline: false,
      expectedDelayYears: 1,
      uncertaintyReduction: 'low',
      explanation: 'Routine maintenance reduces surprise failures but has minimal lifespan impact'
    },
    disclosureNote: 'Water heaters are often replaced without permits; this estimate reflects typical patterns'
  };
}

/**
 * Roof Inference (High-CapEx, Emotionally Sensitive)
 * 
 * Cases:
 * - R-1: Permit found → installYear = permit.year, high confidence
 * - R-2: No permit, yearBuilt ≤ 1995 → likely original, low confidence, very wide
 * - R-3: No permit, 1996-2010 → possible replacement, low-medium confidence
 * - R-4: No permit, yearBuilt ≥ 2011 → likely original, medium confidence
 */
export function inferRoofTimeline(
  property: PropertyContext,
  region: RegionContext,
  permits: PermitRecord[]
): InferredTimeline {
  const { yearBuilt, roofMaterial = 'unknown', state } = property;
  
  // Florida default to tile if unknown
  const material = roofMaterial === 'unknown' && state.toLowerCase() === 'fl' 
    ? 'tile' 
    : roofMaterial;
  
  let install: InferredInstall;
  let windowWidth: 'narrow' | 'medium' | 'wide' = 'medium';
  
  // Case R-1: Permit found
  if (hasValidPermit('roof', permits)) {
    const permitYear = extractPermitYear('roof', permits);
    install = {
      installYear: permitYear,
      installSource: 'permit',
      dataQuality: 'high',
      rationale: 'Roof replacement verified via building permit'
    };
    windowWidth = 'narrow';
  }
  // Case R-2: No permit, very old home
  else if (yearBuilt <= 1995) {
    install = {
      installYear: yearBuilt,
      installSource: 'unknown',
      dataQuality: 'low',
      rationale: 'Likely original roof based on home age and permit history'
    };
    windowWidth = 'wide';
  }
  // Case R-3: No permit, 1996-2010
  else if (yearBuilt <= 2010) {
    install = {
      installYear: yearBuilt,
      installSource: 'inferred',
      dataQuality: 'low',
      rationale: 'Roof age inferred from year built; no replacement permit found'
    };
    windowWidth = 'wide';
  }
  // Case R-4: No permit, recent build
  else {
    install = {
      installYear: yearBuilt,
      installSource: 'inferred',
      dataQuality: 'medium',
      rationale: 'Roof assumed original with recent construction'
    };
    windowWidth = 'medium';
  }
  
  const lifespan = ROOF_LIFESPANS[material] || ROOF_LIFESPANS.unknown;
  const costs = ROOF_COSTS[material] || ROOF_COSTS.unknown;
  const baseInstall = install.installYear || yearBuilt;
  const climateAdjustment = region.isHotHumid ? -3 : 0;
  
  const replacementWindow: ReplacementWindow = {
    earlyYear: baseInstall + lifespan.min + climateAdjustment,
    likelyYear: baseInstall + Math.round((lifespan.min + lifespan.max) / 2) + climateAdjustment,
    lateYear: baseInstall + lifespan.max,
    windowUncertainty: windowWidth,
    rationale: install.rationale
  };
  
  const lifespanDrivers: LifespanDriver[] = [];
  if (material === 'tile') {
    lifespanDrivers.push({
      factor: 'Tile roofing',
      impact: 'increase',
      severity: 'high',
      description: 'Tile roofs typically last longer than asphalt shingles'
    });
  }
  if (region.isHotHumid) {
    lifespanDrivers.push({
      factor: 'Hot/humid climate',
      impact: 'decrease',
      severity: 'low',
      description: 'Florida weather can accelerate roof wear'
    });
  }
  
  return {
    systemId: 'roof',
    systemLabel: 'Roof',
    category: 'structural',
    install,
    replacementWindow,
    capitalCost: {
      low: costs.min,
      high: costs.max,
      costDrivers: ['Material', 'Roof pitch', 'Insurance requirements']
    },
    lifespanDrivers,
    maintenanceEffect: {
      shiftsTimeline: false,
      expectedDelayYears: 0,
      uncertaintyReduction: 'low',
      explanation: 'Roof maintenance reduces leak risk but does not meaningfully extend lifespan'
    },
    // EMOTIONAL GUARDRAIL: This note appears on all roof presentations
    disclosureNote: 'Roofs vary widely; this window reflects typical outcomes for similar homes.'
  };
}

/**
 * Main entry point - infer timeline for any system
 */
export function inferSystemTimeline(
  systemType: 'hvac' | 'roof' | 'water_heater',
  property: PropertyContext,
  region: RegionContext,
  permits: PermitRecord[]
): InferredTimeline {
  switch (systemType) {
    case 'hvac':
      return inferHVACTimeline(property, region, permits);
    case 'water_heater':
      return inferWaterHeaterTimeline(property, region, permits);
    case 'roof':
      return inferRoofTimeline(property, region, permits);
    default:
      throw new Error(`Unknown system type: ${systemType}`);
  }
}

/**
 * Determine region context from state/city
 */
export function getRegionContext(state: string, city?: string): RegionContext {
  const s = state.toLowerCase();
  const c = (city || '').toLowerCase();
  
  // South Florida / Gulf Coast = hot and humid
  const isHotHumid = s === 'fl' || 
    (s === 'tx' && (c.includes('houston') || c.includes('galveston'))) ||
    s === 'la' || s === 'ms' || s === 'al';
  
  return {
    isHotHumid,
    climateMultiplier: isHotHumid ? 0.85 : 1.0
  };
}
