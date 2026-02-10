/**
 * SystemInference - Pure Lifecycle Calculators
 * 
 * ARCHITECTURE:
 * - This module is a CALCULATOR, not a POLICY ENGINE
 * - It receives RESOLVED install data from the orchestrator
 * - It computes lifespans, windows, costs, and disclosures
 * - It NEVER decides which data source wins (that's capital-timeline's job)
 * 
 * GLOBAL RULES (Non-Negotiable):
 * G1: Accept resolved input, compute lifecycle math
 * G2: Climate modifies, never replaces
 * G3: Confidence widens windows, never tightens
 * G4: Return honest disclosures
 * 
 * @version v3 - Earned Confidence: Material-aware, climate-gated, confidence-bounded
 */

import { SYSTEM_CONFIGS, type SystemType } from './systemConfigs.ts';

// ============== Core Types ==============

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ClimateZoneType = 'high_heat' | 'coastal' | 'freeze_thaw' | 'moderate';
export type HvacDutyCycle = 'low' | 'moderate' | 'high' | 'extreme';

/**
 * ResolvedClimateContext - Multi-zone climate with confidence gating
 * 
 * QA FIX #6: Named "ResolvedClimateContext" to distinguish from frontend's
 * display-only climateZone.ts
 */
export interface ResolvedClimateContext {
  climateZone: ClimateZoneType;
  climateMultiplier: number;           // 0.80-1.0
  climateConfidence: ConfidenceLevel;  // Gates attribution copy tone
  dutyCycle: { hvac: HvacDutyCycle };
  lifespanModifiers: {
    hvac: number;          // years: -5 to 0
    roof: number;          // years: -5 to 0
    water_heater: number;  // years: -2 to 0
  };
}

/**
 * @deprecated Use ResolvedClimateContext instead
 */
export interface RegionContext {
  isHotHumid: boolean;
  climateMultiplier: number;
}

export interface PropertyContext {
  yearBuilt: number;
  state: string;
  city?: string;
  roofMaterial?: 'asphalt' | 'tile' | 'metal' | 'unknown';
  waterHeaterType?: 'tank' | 'tankless' | 'unknown';
  buildQuality?: 'A' | 'B' | 'C' | 'D';
}

/**
 * ResolvedInstallInput - Authority-resolved install data
 */
export interface ResolvedInstallInput {
  installYear: number | null;
  installSource: 'permit_verified' | 'owner_reported' | 'inspection' | 'heuristic';
  confidenceScore: number;
  replacementStatus: 'original' | 'replaced' | 'unknown';
  rationale: string;
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
  typicalLow?: number;   // Tightened anchor (confidence-gated)
  typicalHigh?: number;   // Tightened anchor (confidence-gated)
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

/**
 * LifecycleOutput - Pure calculation output (no authority decisions)
 * Extended with material and confidence metadata
 */
export interface LifecycleOutput {
  systemId: 'hvac' | 'roof' | 'water_heater';
  systemLabel: string;
  category: 'mechanical' | 'structural' | 'utility';
  replacementWindow: ReplacementWindow;
  capitalCost: CapitalCostRange;
  lifespanDrivers: LifespanDriver[];
  maintenanceEffect: MaintenanceEffect;
  disclosureNote: string;
  // Earned confidence metadata
  materialType?: string;
  climateZone?: ClimateZoneType;
  climateConfidence?: ConfidenceLevel;
  costConfidence?: ConfidenceLevel;
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

/**
 * HVAC cost bands by system type
 * Split out from the flat $9k-$14k to model real equipment variation
 */
const HVAC_COSTS: Record<string, { min: number; max: number }> = {
  split_standard:        { min: 7000, max: 14000 },
  split_high_efficiency: { min: 12000, max: 22000 },
  heat_pump:             { min: 9000, max: 18000 },
  package_unit:          { min: 8000, max: 16000 },
  unknown:               { min: 9000, max: 14000 },
};

const HVAC_LIFESPAN = { min: 12, max: 18 };

// ============== Climate Classification ==============

/**
 * Coastal cities that warrant high-confidence climate attribution.
 * Must be explicitly matched — no fuzzy inference.
 */
const COASTAL_CITIES = [
  'miami', 'miami beach', 'fort lauderdale', 'west palm beach',
  'key west', 'key largo', 'key biscayne',
  'tampa', 'clearwater', 'st petersburg', 'sarasota',
  'naples', 'cape coral', 'fort myers',
  'jacksonville beach', 'daytona beach', 'cocoa beach',
  'santa monica', 'san diego', 'malibu',
  'galveston', 'corpus christi',
];

const COASTAL_KEYWORDS = ['beach', 'coast', 'key ', 'island'];

const FREEZE_STATES = ['MN', 'WI', 'MI', 'ND', 'SD', 'MT', 'WY', 'VT', 'NH', 'ME'];
const HOT_STATES = ['FL', 'AZ', 'TX', 'NV'];

/**
 * classifyClimate - Multi-zone classification with confidence gating
 * 
 * Aligned with frontend's deriveClimateZone() heuristics but adds:
 * - climateConfidence (gates attribution copy tone)
 * - dutyCycle (models HVAC usage intensity)
 * - lifespanModifiers (zone-specific adjustments)
 */
export function classifyClimate(
  state: string,
  city?: string
): ResolvedClimateContext {
  const s = state.toUpperCase();
  const c = (city || '').toLowerCase();

  // Check explicit coastal city match (high confidence)
  const isExplicitCoastal = COASTAL_CITIES.some(cc => c.includes(cc));
  const isCoastalKeyword = COASTAL_KEYWORDS.some(kw => c.includes(kw));
  const isCoastal = isExplicitCoastal || isCoastalKeyword;

  // Coastal FL/TX = highest confidence climate signal
  if (isCoastal && (s === 'FL' || s === 'TX' || s === 'CA')) {
    return {
      climateZone: 'coastal',
      climateMultiplier: 0.80,
      climateConfidence: 'high',
      dutyCycle: { hvac: s === 'FL' ? 'extreme' : 'high' },
      lifespanModifiers: { hvac: -3, roof: -5, water_heater: -2 },
    };
  }

  // Hot states (non-coastal)
  if (HOT_STATES.includes(s)) {
    // FL gets extreme duty for coastal cities, high for rest
    const hvacDuty: HvacDutyCycle = s === 'FL'
      ? (isCoastal ? 'extreme' : 'high')
      : 'high';

    return {
      climateZone: 'high_heat',
      climateMultiplier: 0.82,
      climateConfidence: 'medium',
      dutyCycle: { hvac: hvacDuty },
      lifespanModifiers: { hvac: -2, roof: -3, water_heater: -1 },
    };
  }

  // Freeze-thaw states
  // QA FIX #4: Gas furnace assumption = 'high' duty (heating-heavy winters)
  if (FREEZE_STATES.includes(s)) {
    return {
      climateZone: 'freeze_thaw',
      climateMultiplier: 0.85,
      climateConfidence: 'medium',
      dutyCycle: { hvac: 'high' }, // Heating-heavy winters destroy heat exchangers
      lifespanModifiers: { hvac: -1, roof: -4, water_heater: 0 },
    };
  }

  // Additional freeze cities in non-freeze states
  const freezeCities = ['boston', 'chicago', 'minneapolis', 'denver', 'detroit',
    'milwaukee', 'buffalo', 'cleveland', 'pittsburgh'];
  if (freezeCities.some(fc => c.includes(fc))) {
    return {
      climateZone: 'freeze_thaw',
      climateMultiplier: 0.85,
      climateConfidence: 'medium',
      dutyCycle: { hvac: 'high' },
      lifespanModifiers: { hvac: -1, roof: -4, water_heater: 0 },
    };
  }

  // Moderate climate (low confidence — we don't know enough to make specific claims)
  // Low duty: CA non-desert, Pacific Northwest
  const lowDutyStates = ['CA', 'OR', 'WA'];
  const hvacDuty: HvacDutyCycle = lowDutyStates.includes(s) ? 'low' : 'moderate';

  return {
    climateZone: 'moderate',
    climateMultiplier: 1.0,
    climateConfidence: 'low',
    dutyCycle: { hvac: hvacDuty },
    lifespanModifiers: { hvac: 0, roof: 0, water_heater: 0 },
  };
}

// ============== Cost Confidence ==============

/**
 * deriveCostConfidence - Gate band tightness to data quality
 * 
 * QA FIX #1: Cleaned rules. permit alone = high.
 * ATTOM + high climate = high. No contradictory hasPermit check.
 */
export function deriveCostConfidence(
  materialSource: string | null,
  installSource: string,
  climateConfidence: ConfidenceLevel
): ConfidenceLevel {
  // High: Permit-verified material OR ATTOM + strong climate signal
  if (materialSource === 'permit') return 'high';
  if (materialSource === 'attom' && climateConfidence === 'high') return 'high';

  // Medium: ATTOM or owner-reported material, OR climate medium
  if (materialSource === 'attom' || materialSource === 'owner_reported') return 'medium';
  if (climateConfidence === 'medium') return 'medium';

  // Low: everything else
  return 'low';
}

/**
 * deriveTypicalBand - Confidence-gated band compression
 * 
 * Tighter bands when data is strong, wider when uncertain.
 * "typicalLow/typicalHigh" is internal vocabulary only —
 * the UI labels this as "Planned replacement" (QA FIX #3).
 */
export function deriveTypicalBand(
  low: number,
  high: number,
  confidence: ConfidenceLevel
): { typicalLow: number; typicalHigh: number } {
  const range = high - low;
  const factors: Record<ConfidenceLevel, [number, number]> = {
    high:   [0.25, 0.40],   // Tight: 15% of range
    medium: [0.40, 0.55],   // Medium: 15% of range
    low:    [0.60, 0.70],   // Wide: still anchored but honest
  };
  const [f0, f1] = factors[confidence];
  return {
    typicalLow: Math.round(low + range * f0),
    typicalHigh: Math.round(low + range * f1),
  };
}

/**
 * HVAC emergency multiplier gated by duty cycle
 * Higher duty = higher emergency premium (urgency + availability pressure)
 */
export function hvacEmergencyMultiplier(duty: HvacDutyCycle): number {
  const multipliers: Record<HvacDutyCycle, number> = {
    low: 1.20,
    moderate: 1.35,
    high: 1.50,
    extreme: 1.65,
  };
  return multipliers[duty];
}

// ============== ATTOM Material Normalization ==============

/**
 * normalizeRoofMaterial - Convert ATTOM roofcover values to canonical types
 * 
 * QA FIX #2: Safety brake — tile/metal on pre-1970 homes is suspicious.
 * Returns downgraded=true to soften materialSource from 'attom' to 'inferred'.
 */
export function normalizeRoofMaterial(
  raw: string,
  yearBuilt: number
): { material: 'asphalt' | 'tile' | 'metal' | 'unknown'; downgraded: boolean } {
  const lower = raw.toLowerCase();
  let material: 'asphalt' | 'tile' | 'metal' | 'unknown' = 'unknown';

  if (lower.includes('tile') || lower.includes('concrete')) material = 'tile';
  else if (lower.includes('metal') || lower.includes('standing seam')) material = 'metal';
  else if (lower.includes('shingle') || lower.includes('asphalt') || lower.includes('composition')) material = 'asphalt';

  // Safety brake: tile or metal on pre-1970 homes is suspicious
  // (ATTOM may carry stale/wrong data for older properties)
  const downgraded = (material === 'tile' || material === 'metal') && yearBuilt < 1970;

  return { material, downgraded };
}

// ============== Confidence → Quality Mapping ==============

/**
 * Derive dataQuality from confidence score
 * Single source of truth - no ad-hoc mappings elsewhere
 */
export function dataQualityFromConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.80) return 'high';
  if (score >= 0.50) return 'medium';
  return 'low';
}

/**
 * Derive window uncertainty from confidence score
 */
function windowUncertaintyFromConfidence(score: number): 'narrow' | 'medium' | 'wide' {
  if (score >= 0.80) return 'narrow';
  if (score >= 0.50) return 'medium';
  return 'wide';
}

/**
 * Map new install sources to legacy format for backward compatibility
 */
function mapInstallSourceToLegacy(source: ResolvedInstallInput['installSource']): 'permit' | 'inferred' | 'unknown' {
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

// ============== Permit Helpers (for fallback inference) ==============

interface PermitRecord {
  description?: string;
  permit_type?: string;
  date_finaled?: string;
  final_date?: string;
  approval_date?: string;
  date_issued?: string;
  issue_date?: string;
}

export function hasValidPermit(systemType: 'hvac' | 'roof' | 'water_heater', permits: PermitRecord[]): boolean {
  if (!permits?.length) return false;
  const config = SYSTEM_CONFIGS[systemType];
  
  return permits.some(p => {
    const text = `${p.description || ''} ${p.permit_type || ''}`.toLowerCase();
    const hasKeyword = config.permitKeywords.some(kw => text.includes(kw));
    const hasDate = p.date_finaled || p.final_date || p.approval_date || p.date_issued || p.issue_date;
    return hasKeyword && hasDate;
  });
}

export function extractPermitYear(systemType: 'hvac' | 'roof' | 'water_heater', permits: PermitRecord[]): number | null {
  if (!permits?.length) return null;
  const config = SYSTEM_CONFIGS[systemType];
  
  const matchingPermits = permits.filter(p => {
    const text = `${p.description || ''} ${p.permit_type || ''}`.toLowerCase();
    return config.permitKeywords.some(kw => text.includes(kw));
  });
  
  if (!matchingPermits.length) return null;
  
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

// ============== Build Quality Degradation ==============

/**
 * Build quality degradation factor.
 * Quality C = 10% lifespan reduction, Quality D = 20%.
 * A/B = no change. Never tightens ranges — only shortens expected lifespan.
 */
function getBuildQualityDegradation(quality?: 'A' | 'B' | 'C' | 'D'): number {
  if (!quality) return 0;
  switch (quality) {
    case 'C': return 0.10;
    case 'D': return 0.20;
    default: return 0;
  }
}

// ============== Pure Calculator Functions ==============

/**
 * Calculate HVAC lifecycle from resolved input
 * 
 * Uses duty-cycle-adjusted lifespan (floor at 60% of base)
 * and type-specific cost bands.
 */
export function calculateHVACLifecycle(
  resolvedInstall: ResolvedInstallInput,
  property: PropertyContext,
  climate: ResolvedClimateContext
): LifecycleOutput {
  const baseLifespan = HVAC_LIFESPAN;
  
  // Duty-cycle-aware lifespan adjustment (QA FIX #4)
  const dutyPenalty: Record<HvacDutyCycle, number> = {
    low: 0, moderate: -1, high: -3, extreme: -5,
  };
  let adjustedMin = Math.max(
    baseLifespan.min + dutyPenalty[climate.dutyCycle.hvac] + climate.lifespanModifiers.hvac,
    Math.round(baseLifespan.min * 0.6) // Floor: never reduce below 60%
  );
  let adjustedMax = baseLifespan.max + climate.lifespanModifiers.hvac;

  // Build quality degradation (Sprint 1): shortens lifespan, never widens ranges
  const bqDegradation = getBuildQualityDegradation(property.buildQuality);
  if (bqDegradation > 0) {
    adjustedMin = Math.round(adjustedMin * (1 - bqDegradation));
    adjustedMax = Math.round(adjustedMax * (1 - bqDegradation));
  }

  const baseInstall = resolvedInstall.installYear || property.yearBuilt;
  const uncertainty = windowUncertaintyFromConfidence(resolvedInstall.confidenceScore);
  
  const replacementWindow: ReplacementWindow = {
    earlyYear: baseInstall + adjustedMin,
    likelyYear: baseInstall + Math.round((adjustedMin + adjustedMax) / 2),
    lateYear: baseInstall + adjustedMax,
    windowUncertainty: uncertainty,
    rationale: resolvedInstall.rationale
  };
  
  // Use HVAC type-specific costs (unknown = standard split)
  const hvacCosts = HVAC_COSTS.unknown;
  
  // Cost confidence and typical bands
  const costConfidence = deriveCostConfidence(null, resolvedInstall.installSource, climate.climateConfidence);
  const { typicalLow, typicalHigh } = deriveTypicalBand(hvacCosts.min, hvacCosts.max, costConfidence);
  
  const lifespanDrivers: LifespanDriver[] = [];
  if (climate.dutyCycle.hvac === 'extreme' || climate.dutyCycle.hvac === 'high') {
    lifespanDrivers.push({
      factor: climate.climateZone === 'freeze_thaw' ? 'Heavy heating usage' : 'High cooling demand',
      impact: 'decrease',
      severity: climate.dutyCycle.hvac === 'extreme' ? 'high' : 'medium',
      description: climate.climateZone === 'freeze_thaw'
        ? 'Long heating seasons accelerate heat exchanger and blower wear'
        : 'Year-round cooling duty accelerates compressor and fan wear'
    });
  }
  if (bqDegradation > 0) {
    lifespanDrivers.push({
      factor: 'Construction quality',
      impact: 'decrease',
      severity: bqDegradation >= 0.20 ? 'medium' : 'low',
      description: 'Lower construction quality correlates with shorter system lifespan'
    });
  }
  
  return {
    systemId: 'hvac',
    systemLabel: 'HVAC System',
    category: 'mechanical',
    replacementWindow,
    capitalCost: {
      low: hvacCosts.min,
      high: hvacCosts.max,
      typicalLow,
      typicalHigh,
      costDrivers: ['System type', 'SEER rating', 'Labor rates']
    },
    lifespanDrivers,
    maintenanceEffect: {
      shiftsTimeline: true,
      expectedDelayYears: 3,
      uncertaintyReduction: 'medium',
      explanation: 'Regular maintenance typically extends HVAC lifespan and narrows uncertainty'
    },
    disclosureNote: resolvedInstall.installSource === 'heuristic'
      ? 'Install year estimated from home construction date'
      : 'Based on typical HVAC replacement patterns for your region',
    // Earned confidence metadata
    materialType: undefined, // HVAC type not yet tracked
    climateZone: climate.climateZone,
    climateConfidence: climate.climateConfidence,
    costConfidence,
  };
}

/**
 * Calculate Water Heater lifecycle from resolved input
 */
export function calculateWaterHeaterLifecycle(
  resolvedInstall: ResolvedInstallInput,
  property: PropertyContext,
  climate: ResolvedClimateContext
): LifecycleOutput {
  const { waterHeaterType = 'unknown' } = property;
  const lifespan = WATER_HEATER_LIFESPANS[waterHeaterType] || WATER_HEATER_LIFESPANS.unknown;
  const costs = WATER_HEATER_COSTS[waterHeaterType] || WATER_HEATER_COSTS.unknown;
  const baseInstall = resolvedInstall.installYear || property.yearBuilt;
  const uncertainty = windowUncertaintyFromConfidence(resolvedInstall.confidenceScore);
  
  // Zone-specific lifespan modifier (coastal: -2 years)
  let adjustedMin = Math.max(lifespan.min + climate.lifespanModifiers.water_heater, Math.round(lifespan.min * 0.6));
  let adjustedMax = lifespan.max + climate.lifespanModifiers.water_heater;

  // Build quality degradation (Sprint 1)
  const bqDegradation = getBuildQualityDegradation(property.buildQuality);
  if (bqDegradation > 0) {
    adjustedMin = Math.round(adjustedMin * (1 - bqDegradation));
    adjustedMax = Math.round(adjustedMax * (1 - bqDegradation));
  }
  
  const replacementWindow: ReplacementWindow = {
    earlyYear: baseInstall + adjustedMin,
    likelyYear: baseInstall + Math.round((adjustedMin + adjustedMax) / 2),
    lateYear: baseInstall + adjustedMax,
    windowUncertainty: uncertainty,
    rationale: resolvedInstall.rationale
  };
  
  // Material source for water heater is the type (tank/tankless)
  const materialSource = waterHeaterType !== 'unknown' ? 'owner_reported' : null;
  const costConfidence = deriveCostConfidence(materialSource, resolvedInstall.installSource, climate.climateConfidence);
  const { typicalLow, typicalHigh } = deriveTypicalBand(costs.min, costs.max, costConfidence);
  
  const lifespanDrivers: LifespanDriver[] = [];
  if (climate.lifespanModifiers.water_heater < 0) {
    lifespanDrivers.push({
      factor: 'Coastal water quality',
      impact: 'decrease',
      severity: 'low',
      description: 'Mineral content and humidity can accelerate tank corrosion'
    });
  }
  if (bqDegradation > 0) {
    lifespanDrivers.push({
      factor: 'Construction quality',
      impact: 'decrease',
      severity: bqDegradation >= 0.20 ? 'medium' : 'low',
      description: 'Lower construction quality correlates with shorter system lifespan'
    });
  }
  
  return {
    systemId: 'water_heater',
    systemLabel: 'Water Heater',
    category: 'utility',
    replacementWindow,
    capitalCost: {
      low: costs.min,
      high: costs.max,
      typicalLow,
      typicalHigh,
      costDrivers: ['Tank type', 'Fuel type', 'Labor rates']
    },
    lifespanDrivers,
    maintenanceEffect: {
      shiftsTimeline: false,
      expectedDelayYears: 1,
      uncertaintyReduction: 'low',
      explanation: 'Routine maintenance reduces surprise failures but has minimal lifespan impact'
    },
    disclosureNote: resolvedInstall.installSource === 'heuristic'
      ? 'Install year estimated; water heaters are often replaced without permits'
      : 'Water heater timeline based on your provided install date',
    materialType: waterHeaterType !== 'unknown' ? waterHeaterType : undefined,
    climateZone: climate.climateZone,
    climateConfidence: climate.climateConfidence,
    costConfidence,
  };
}

/**
 * Calculate Roof lifecycle from resolved input
 * 
 * Uses zone-aware lifespan modifiers instead of binary isHotHumid.
 */
export function calculateRoofLifecycle(
  resolvedInstall: ResolvedInstallInput,
  property: PropertyContext,
  climate: ResolvedClimateContext,
  resolvedMaterial?: string,
  resolvedMaterialSource?: string
): LifecycleOutput {
  const { roofMaterial = 'unknown', state } = property;
  
  // Use resolved material if provided, otherwise fall back to property context
  const effectiveMaterial = resolvedMaterial || roofMaterial;
  
  // Florida default to tile if unknown
  const material = effectiveMaterial === 'unknown' && state.toLowerCase() === 'fl' 
    ? 'tile' 
    : effectiveMaterial;
  
  const lifespan = ROOF_LIFESPANS[material] || ROOF_LIFESPANS.unknown;
  const costs = ROOF_COSTS[material] || ROOF_COSTS.unknown;
  const baseInstall = resolvedInstall.installYear || property.yearBuilt;
  const uncertainty = windowUncertaintyFromConfidence(resolvedInstall.confidenceScore);
  
  // Zone-aware lifespan adjustment (replaces binary isHotHumid ? -3 : 0)
  const adjustedMin = Math.max(lifespan.min + climate.lifespanModifiers.roof, Math.round(lifespan.min * 0.6));
  const adjustedMax = lifespan.max + climate.lifespanModifiers.roof;
  
  const replacementWindow: ReplacementWindow = {
    earlyYear: baseInstall + adjustedMin,
    likelyYear: baseInstall + Math.round((adjustedMin + adjustedMax) / 2),
    lateYear: baseInstall + adjustedMax,
    windowUncertainty: uncertainty,
    rationale: resolvedInstall.rationale
  };
  
  // Cost confidence from material source
  const costConfidence = deriveCostConfidence(
    resolvedMaterialSource || (material !== 'unknown' ? 'inferred' : null),
    resolvedInstall.installSource,
    climate.climateConfidence
  );
  const { typicalLow, typicalHigh } = deriveTypicalBand(costs.min, costs.max, costConfidence);
  
  const lifespanDrivers: LifespanDriver[] = [];
  if (material === 'tile') {
    lifespanDrivers.push({
      factor: 'Tile roofing',
      impact: 'increase',
      severity: 'high',
      description: 'Tile roofs typically last longer than asphalt shingles'
    });
  }
  if (material === 'metal') {
    lifespanDrivers.push({
      factor: 'Metal roofing',
      impact: 'increase',
      severity: 'high',
      description: 'Metal roofs offer exceptional longevity with proper maintenance'
    });
  }
  if (climate.climateZone === 'coastal') {
    lifespanDrivers.push({
      factor: 'Coastal exposure',
      impact: 'decrease',
      severity: 'medium',
      description: 'Salt air and UV exposure accelerate roof degradation'
    });
  } else if (climate.climateZone === 'high_heat') {
    lifespanDrivers.push({
      factor: 'Heat and UV stress',
      impact: 'decrease',
      severity: 'low',
      description: 'Extended heat and UV cycles can accelerate roof wear'
    });
  } else if (climate.climateZone === 'freeze_thaw') {
    lifespanDrivers.push({
      factor: 'Freeze-thaw cycles',
      impact: 'decrease',
      severity: 'medium',
      description: 'Repeated freezing and thawing damages underlayment and flashing'
    });
  }
  
  return {
    systemId: 'roof',
    systemLabel: 'Roof',
    category: 'structural',
    replacementWindow,
    capitalCost: {
      low: costs.min,
      high: costs.max,
      typicalLow,
      typicalHigh,
      costDrivers: ['Material', 'Roof pitch', 'Insurance requirements']
    },
    lifespanDrivers,
    maintenanceEffect: {
      shiftsTimeline: false,
      expectedDelayYears: 0,
      uncertaintyReduction: 'low',
      explanation: 'Roof maintenance reduces leak risk but does not meaningfully extend lifespan'
    },
    disclosureNote: 'Roofs vary widely; this window reflects typical outcomes for similar homes.',
    materialType: material !== 'unknown' ? material : undefined,
    climateZone: climate.climateZone,
    climateConfidence: climate.climateConfidence,
    costConfidence,
  };
}

/**
 * Main pure calculator entry point
 * Accepts ResolvedClimateContext (new) or RegionContext (backward compat via shim)
 */
export function calculateSystemLifecycle(
  systemType: 'hvac' | 'roof' | 'water_heater',
  resolvedInstall: ResolvedInstallInput,
  property: PropertyContext,
  region: RegionContext | ResolvedClimateContext
): LifecycleOutput {
  // Shim: convert legacy RegionContext to ResolvedClimateContext
  const climate = isResolvedClimateContext(region)
    ? region
    : shimRegionToClimate(region);

  switch (systemType) {
    case 'hvac':
      return calculateHVACLifecycle(resolvedInstall, property, climate);
    case 'water_heater':
      return calculateWaterHeaterLifecycle(resolvedInstall, property, climate);
    case 'roof':
      return calculateRoofLifecycle(resolvedInstall, property, climate);
    default:
      throw new Error(`Unknown system type: ${systemType}`);
  }
}

function isResolvedClimateContext(ctx: RegionContext | ResolvedClimateContext): ctx is ResolvedClimateContext {
  return 'climateZone' in ctx && 'dutyCycle' in ctx;
}

function shimRegionToClimate(region: RegionContext): ResolvedClimateContext {
  return {
    climateZone: region.isHotHumid ? 'high_heat' : 'moderate',
    climateMultiplier: region.climateMultiplier,
    climateConfidence: region.isHotHumid ? 'medium' : 'low',
    dutyCycle: { hvac: region.isHotHumid ? 'high' : 'moderate' },
    lifespanModifiers: {
      hvac: region.isHotHumid ? -2 : 0,
      roof: region.isHotHumid ? -3 : 0,
      water_heater: region.isHotHumid ? -1 : 0,
    },
  };
}

// ============== Legacy Inference Functions (Backward Compatibility) ==============

/**
 * @deprecated Use resolveInstallAuthority() + calculateSystemLifecycle() instead
 */
export function inferHVACTimeline(
  property: PropertyContext,
  region: RegionContext,
  permits: PermitRecord[]
): InferredTimeline {
  const currentYear = new Date().getFullYear();
  const { yearBuilt } = property;
  
  let install: InferredInstall;
  
  if (hasValidPermit('hvac', permits)) {
    const permitYear = extractPermitYear('hvac', permits);
    install = {
      installYear: permitYear,
      installSource: 'permit',
      dataQuality: 'high',
      rationale: 'HVAC replacement verified via building permit'
    };
  } else if (yearBuilt <= 2005) {
    const inferredYear = yearBuilt + 12;
    install = {
      installYear: Math.min(inferredYear, currentYear - 5),
      installSource: 'inferred',
      dataQuality: 'medium',
      rationale: 'HVAC replacement inferred based on typical service life and home age'
    };
  } else {
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
 * @deprecated Use resolveInstallAuthority() + calculateSystemLifecycle() instead
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
  
  if (hasValidPermit('water_heater', permits)) {
    const permitYear = extractPermitYear('water_heater', permits);
    install = {
      installYear: permitYear,
      installSource: 'permit',
      dataQuality: 'high',
      rationale: 'Water heater replacement verified via building permit'
    };
    windowWidth = 'narrow';
  } else if (yearBuilt >= 2012) {
    install = {
      installYear: yearBuilt,
      installSource: 'inferred',
      dataQuality: 'medium',
      rationale: 'Water heater assumed original with recent construction'
    };
    windowWidth = 'medium';
  } else if (yearBuilt >= 1990) {
    const inferredYear = yearBuilt + 12;
    install = {
      installYear: Math.min(inferredYear, currentYear - 3),
      installSource: 'inferred',
      dataQuality: 'low',
      rationale: 'Water heater replacement inferred due to missing permit history'
    };
    windowWidth = 'wide';
  } else {
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
 * @deprecated Use resolveInstallAuthority() + calculateSystemLifecycle() instead
 */
export function inferRoofTimeline(
  property: PropertyContext,
  region: RegionContext,
  permits: PermitRecord[]
): InferredTimeline {
  const { yearBuilt, roofMaterial = 'unknown', state } = property;
  
  const material = roofMaterial === 'unknown' && state.toLowerCase() === 'fl' 
    ? 'tile' 
    : roofMaterial;
  
  let install: InferredInstall;
  let windowWidth: 'narrow' | 'medium' | 'wide' = 'medium';
  
  if (hasValidPermit('roof', permits)) {
    const permitYear = extractPermitYear('roof', permits);
    install = {
      installYear: permitYear,
      installSource: 'permit',
      dataQuality: 'high',
      rationale: 'Roof replacement verified via building permit'
    };
    windowWidth = 'narrow';
  } else if (yearBuilt <= 1995) {
    install = {
      installYear: yearBuilt,
      installSource: 'unknown',
      dataQuality: 'low',
      rationale: 'Likely original roof based on home age and permit history'
    };
    windowWidth = 'wide';
  } else if (yearBuilt <= 2010) {
    install = {
      installYear: yearBuilt,
      installSource: 'inferred',
      dataQuality: 'low',
      rationale: 'Roof age inferred from year built; no replacement permit found'
    };
    windowWidth = 'wide';
  } else {
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
    disclosureNote: 'Roofs vary widely; this window reflects typical outcomes for similar homes.'
  };
}

/**
 * @deprecated Use resolveInstallAuthority() + calculateSystemLifecycle() instead
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
 * @deprecated Use classifyClimate() instead
 * Kept as backward-compat shim for ai-home-assistant and intelligence-engine
 */
export function getRegionContext(state: string, city?: string): RegionContext {
  const s = state.toLowerCase();
  const c = (city || '').toLowerCase();
  
  const isHotHumid = s === 'fl' || 
    (s === 'tx' && (c.includes('houston') || c.includes('galveston'))) ||
    s === 'la' || s === 'ms' || s === 'al';
  
  return {
    isHotHumid,
    climateMultiplier: isHotHumid ? 0.85 : 1.0
  };
}
