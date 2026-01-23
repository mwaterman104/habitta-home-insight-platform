/**
 * Appliance Tiering System
 * 
 * Locked Guardrails:
 * 1. Tier 0 = Structural systems (HVAC, Roof, Water Heater) - full health impact
 * 2. Tier 1 = Critical appliances (Refrigerator, Oven, etc.) - capped health impact
 * 3. Tier 2 = Contextual appliances (Microwave, etc.) - tracked only, no health impact
 * 4. Appliances cap at 5-point penalty on home health
 * 5. ≥2 Attention rule: Single aging appliance = advisory only
 */

export type ApplianceTier = 0 | 1 | 2;

export interface ApplianceCategory {
  key: string;
  displayName: string;
  tier: ApplianceTier;
  healthWeightCap: number;
  typicalLifespan: number;
  icon: string;
}

// Tier 1 Critical Appliances - contribute to health score (capped)
export const TIER_1_APPLIANCES = [
  'refrigerator',
  'oven_range', 
  'dishwasher',
  'washer',
  'dryer'
] as const;

// Tier 2 Contextual Appliances - tracked only, no health impact
export const TIER_2_APPLIANCES = [
  'microwave',
  'garbage_disposal',
  'wine_cooler'
] as const;

// All appliance keys (Tier 1 + Tier 2)
export const ALL_APPLIANCE_KEYS = [...TIER_1_APPLIANCES, ...TIER_2_APPLIANCES] as const;

export type Tier1ApplianceKey = typeof TIER_1_APPLIANCES[number];
export type Tier2ApplianceKey = typeof TIER_2_APPLIANCES[number];
export type ApplianceKey = Tier1ApplianceKey | Tier2ApplianceKey;

/**
 * Check if a system key is a Tier 1 appliance
 */
export function isTier1Appliance(key: string): key is Tier1ApplianceKey {
  return TIER_1_APPLIANCES.includes(key as Tier1ApplianceKey);
}

/**
 * Check if a system key is a Tier 2 appliance
 */
export function isTier2Appliance(key: string): key is Tier2ApplianceKey {
  return TIER_2_APPLIANCES.includes(key as Tier2ApplianceKey);
}

/**
 * Check if a system key is any appliance (Tier 1 or 2)
 */
export function isAppliance(key: string): key is ApplianceKey {
  return isTier1Appliance(key) || isTier2Appliance(key);
}

/**
 * Get the tier for a system key
 * Returns 0 for structural systems, 1 for critical appliances, 2 for contextual
 */
export function getApplianceTier(key: string): ApplianceTier {
  if (isTier1Appliance(key)) return 1;
  if (isTier2Appliance(key)) return 2;
  return 0; // Structural system
}

/**
 * Get display name for appliance
 */
export const APPLIANCE_DISPLAY_NAMES: Record<ApplianceKey, string> = {
  refrigerator: 'Refrigerator',
  oven_range: 'Oven/Range',
  dishwasher: 'Dishwasher',
  washer: 'Washing Machine',
  dryer: 'Dryer',
  microwave: 'Microwave',
  garbage_disposal: 'Garbage Disposal',
  wine_cooler: 'Wine Cooler',
};

/**
 * Get icon emoji for appliance
 */
export const APPLIANCE_ICONS: Record<ApplianceKey, string> = {
  refrigerator: '🧊',
  oven_range: '🍳',
  dishwasher: '🍽️',
  washer: '🧺',
  dryer: '👕',
  microwave: '📻',
  garbage_disposal: '🗑️',
  wine_cooler: '🍷',
};

/**
 * Calculate appliance status based on age and lifespan
 * Uses standardized language: Healthy / Planning / Attention
 */
export function calculateApplianceStatus(
  ageYears: number | null, 
  typicalLifespan: number
): 'healthy' | 'planning' | 'attention' {
  if (ageYears === null) return 'healthy'; // Unknown = no alarm
  
  const remainingYears = Math.max(0, typicalLifespan - ageYears);
  
  if (remainingYears <= 2) return 'attention';
  if (remainingYears <= 5) return 'planning';
  return 'healthy';
}

/**
 * Get tier-specific messaging for success states
 */
export function getTierSuccessMessage(key: string): string {
  if (isTier2Appliance(key)) {
    return "I'll keep an eye on this, but it won't affect your home's outlook.";
  }
  return "Added. I'll start tracking this.";
}
