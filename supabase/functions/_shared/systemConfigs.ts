/**
 * System-Agnostic Configuration
 * 
 * Centralized constants for lifespan, variance, and scoring parameters
 * across all home systems. Designed for extensibility as new systems are added.
 * 
 * NOTE: permitKeywords are currently duplicated in permitSignal.ts for HVAC.
 * Long-term: derivePermitSignal should accept SystemConfig to eliminate duplication.
 * 
 * @version v1
 */

export type SystemType = 'hvac' | 'roof' | 'water_heater' | 'electrical_panel' | 'plumbing' | 'pool' | 'solar' | 'mini_split';

export interface SystemConfig {
  /** Baseline median lifespan in years (L50_base) */
  baselineLifespan: number;
  /** Standard deviation for uncertainty (sigma) */
  sigma: number;
  /** Keywords for permit matching */
  permitKeywords: string[];
  /** M_install penalty for replacement vs new install (affects quality, not lifespan) */
  replacementPenalty: number;
  /** Maximum climate stress multiplier reduction */
  climateMultiplierMax: number;
  /** Display name for UI */
  displayName: string;
  /** Typical replacement cost range */
  replacementCostRange: { min: number; max: number };
  /** Rush install premium for proposed additions (optional, defaults to emergency premium) */
  rushInstallPremium?: number;
}

/**
 * System configurations - single source of truth for lifespan models
 * 
 * Values calibrated from industry data:
 * - HVAC: 13-15 years (US national average)
 * - Roof: 20-25 years (varies by material)
 * - Water Heater: 10-12 years (tank), 20+ (tankless)
 * - Electrical Panel: 25-40 years
 */
export const SYSTEM_CONFIGS: Record<SystemType, SystemConfig> = {
  hvac: {
    baselineLifespan: 13,
    sigma: 2.5,
    permitKeywords: ['hvac', 'air condition', 'a/c', 'ac unit', 'heat pump', 'condenser', 'air handler', 'furnace', 'cooling', 'heating'],
    replacementPenalty: 0.03,
    climateMultiplierMax: 0.18,
    displayName: 'HVAC System',
    replacementCostRange: { min: 6000, max: 12000 },
  },
  roof: {
    baselineLifespan: 25,
    sigma: 4.0,
    permitKeywords: ['roof', 're-roof', 'reroof', 'shingle', 'tile roof', 'metal roof'],
    replacementPenalty: 0.02,
    climateMultiplierMax: 0.15,
    displayName: 'Roof',
    replacementCostRange: { min: 8000, max: 25000 },
  },
  water_heater: {
    baselineLifespan: 12,
    sigma: 2.0,
    permitKeywords: ['water heater', 'hot water', 'tankless', 'boiler'],
    replacementPenalty: 0.02,
    climateMultiplierMax: 0.10,
    displayName: 'Water Heater',
    replacementCostRange: { min: 1200, max: 3500 },
  },
  electrical_panel: {
    baselineLifespan: 40,
    sigma: 8.0,
    permitKeywords: ['electrical panel', 'service panel', 'breaker panel', 'main panel', '200 amp', 'panel upgrade'],
    replacementPenalty: 0.01,
    climateMultiplierMax: 0.05,
    displayName: 'Electrical Panel',
    replacementCostRange: { min: 1500, max: 4000 },
  },
  plumbing: {
    baselineLifespan: 50, // Pipes last long, but components vary
    sigma: 10.0,
    permitKeywords: ['plumbing', 'repipe', 'water line', 'sewer', 'drain'],
    replacementPenalty: 0.01,
    climateMultiplierMax: 0.08,
    displayName: 'Plumbing',
    replacementCostRange: { min: 2000, max: 15000 },
  },
  pool: {
    baselineLifespan: 15, // Equipment lifespan
    sigma: 3.0,
    permitKeywords: ['pool', 'spa', 'hot tub', 'pool pump', 'pool heater'],
    replacementPenalty: 0.02,
    climateMultiplierMax: 0.12,
    displayName: 'Pool Equipment',
    replacementCostRange: { min: 3000, max: 8000 },
  },
  solar: {
    baselineLifespan: 25,
    sigma: 5.0,
    permitKeywords: ['solar', 'photovoltaic', 'pv system', 'solar panel'],
    replacementPenalty: 0.01,
    climateMultiplierMax: 0.10,
    displayName: 'Solar Panels',
    replacementCostRange: { min: 15000, max: 35000 },
  },
  mini_split: {
    baselineLifespan: 20,
    sigma: 3.0,
    permitKeywords: ['mini-split', 'ductless', 'mini split', 'ductless heat pump', 'ductless ac'],
    replacementPenalty: 0.01,
    climateMultiplierMax: 0.10,
    displayName: 'Mini-Split',
    replacementCostRange: { min: 1500, max: 5000 }, // Per zone
    rushInstallPremium: 0.15, // 15% - expedited scheduling, not emergency
  },
};

/**
 * Get system config with fallback for unknown types
 */
export function getSystemConfig(systemType: string): SystemConfig {
  const normalized = systemType.toLowerCase().replace(/[^a-z_]/g, '');
  return SYSTEM_CONFIGS[normalized as SystemType] || SYSTEM_CONFIGS.hvac;
}

/**
 * HVAC-specific constants (for backward compatibility)
 * These should be phased out in favor of SYSTEM_CONFIGS.hvac
 */
/**
 * Emergency replacement premium multipliers by system type
 * Based on industry data for unplanned vs planned replacements
 * Emergency work typically costs 40-80% more due to:
 * - Rush scheduling
 * - Limited contractor availability
 * - No time for competitive bidding
 * - Potential secondary damage
 */
export const EMERGENCY_PREMIUMS: Record<SystemType, number> = {
  hvac: 0.60,           // 60% premium - high demand, specialized
  roof: 0.50,           // 50% premium - weather urgency
  water_heater: 0.60,   // 60% premium - immediate need
  electrical_panel: 0.40, // 40% premium - less time-critical
  plumbing: 0.70,       // 70% premium - water damage risk
  pool: 0.35,           // 35% premium - seasonal flexibility
  solar: 0.30,          // 30% premium - rarely emergency
  mini_split: 0.20,     // 20% premium - specialized but lower urgency
};

export const DEFAULT_EMERGENCY_PREMIUM = 0.60;

export function getEmergencyPremium(systemType: string): number {
  const normalized = systemType.toLowerCase().replace(/[^a-z_]/g, '');
  return EMERGENCY_PREMIUMS[normalized as SystemType] ?? DEFAULT_EMERGENCY_PREMIUM;
}

/**
 * HVAC-specific constants (for backward compatibility)
 * These should be phased out in favor of SYSTEM_CONFIGS.hvac
 */
export const HVAC_BASELINE_LIFESPAN = SYSTEM_CONFIGS.hvac.baselineLifespan;
export const HVAC_SIGMA = SYSTEM_CONFIGS.hvac.sigma;
export const HVAC_REPLACEMENT_PENALTY = SYSTEM_CONFIGS.hvac.replacementPenalty;
export const HVAC_CLIMATE_MAX = SYSTEM_CONFIGS.hvac.climateMultiplierMax;
