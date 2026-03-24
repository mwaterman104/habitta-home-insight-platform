/**
 * Resolved Appliance Identity - The Sacred File
 * 
 * Single source of truth for appliance display logic.
 * The UI never renders raw fields again - it renders meaning.
 * 
 * This file transforms raw appliance data into a stable identity
 * object that all UI components consume.
 */

import { 
  ConfidenceState, 
  resolveConfidenceState, 
  getConfidenceStateLabel 
} from './systemConfidence';
import { getApplianceTier } from './applianceTiers';

// =============================================================================
// TYPES
// =============================================================================

export interface ResolvedApplianceIdentity {
  // Core identity
  title: string;                 // "LG Refrigerator"
  subtitle: string;              // "Model E82904" | "Model not identified"
  category: string | 'unknown';
  tier: 1 | 2;
  
  // Confidence
  confidenceState: ConfidenceState;
  confidenceLabel: string | null; // "Estimated" or null for high
  
  // Age & Planning (Tier 1 ONLY - suppressed for Tier 2)
  ageLabel?: string;             // "~13 years old"
  lifespanLabel?: string;        // "Typical lifespan: 10–14 years"
  planningLabel?: string;        // "Within typical lifespan" | "Planning window"
  
  // Help messaging (one sentence max, never mentions "confidence score")
  helperMessage?: string;
  showHelpCTA: boolean;          // Show "Help Habitta learn more"
}

export interface ApplianceInput {
  brand?: string | null;
  model?: string | null;
  manufacture_year?: number | null;
  confidence_scores?: Record<string, number> | null;
  source?: {
    install_source?: string;
    [key: string]: unknown;
  } | null;
}

export interface CatalogInput {
  key: string;
  display_name: string;
  typical_lifespan_years: number;
  appliance_tier?: number;
}

// =============================================================================
// DISPLAY NAMES (Fallback if catalog not available)
// =============================================================================

const APPLIANCE_DISPLAY_NAMES: Record<string, string> = {
  refrigerator: 'Refrigerator',
  oven_range: 'Oven/Range',
  dishwasher: 'Dishwasher',
  washer: 'Washing Machine',
  dryer: 'Dryer',
  microwave: 'Microwave',
  garbage_disposal: 'Garbage Disposal',
  wine_cooler: 'Wine Cooler',
};

// =============================================================================
// RESOLVER (THE CORE FUNCTION)
// =============================================================================

/**
 * Resolve raw appliance data into a stable identity for UI rendering.
 * 
 * The UI should ONLY consume the output of this function.
 * Never render raw database fields directly.
 */
export function resolveApplianceIdentity(
  system: ApplianceInput,
  catalog: CatalogInput | null
): ResolvedApplianceIdentity {
  const currentYear = new Date().getFullYear();
  
  // === Category & Tier ===
  const category = catalog?.key ?? 'unknown';
  const rawTier = catalog?.appliance_tier ?? getApplianceTier(category);
  const tier: 1 | 2 = rawTier === 1 ? 1 : 2;
  
  // === Age Calculation ===
  const age = system.manufacture_year 
    ? currentYear - system.manufacture_year 
    : null;
  
  // === Confidence Calculation ===
  const scores = system.confidence_scores || {};
  const visualCertainty = computeVisualCertainty(scores);
  
  // Check if user has confirmed this system
  const installSource = system.source?.install_source;
  const userConfirmed = 
    installSource === 'owner_reported' ||
    installSource === 'owner_confirmed' ||
    installSource === 'inspection' ||
    installSource === 'permit_verified';
  
  const confidenceState = resolveConfidenceState({
    visualScore: visualCertainty,
    userConfirmed,
  });
  
  const confidenceLabel = getConfidenceStateLabel(confidenceState);
  
  // === Title Composition ===
  const displayName = catalog?.display_name || 
    APPLIANCE_DISPLAY_NAMES[category] || 
    'Appliance';
  
  let title: string;
  if (system.brand && category !== 'unknown') {
    title = `${system.brand} ${displayName}`;
  } else if (system.brand) {
    title = `${system.brand} appliance`;
  } else if (category !== 'unknown') {
    title = displayName;
  } else {
    title = 'Appliance';
  }
  
  // === Subtitle (Model) ===
  // Use "Model not identified" instead of "Model unknown" (database language)
  const subtitle = system.model 
    ? `Model ${system.model}` 
    : 'Model not identified';
  
  // === Age Label (uses ~ prefix for estimates) ===
  const ageLabel = age !== null ? `~${age} years old` : undefined;
  
  // === Lifespan Label (TIER 1 ONLY - Guardrail) ===
  const typicalLifespan = catalog?.typical_lifespan_years || 12;
  const lifespanLabel = tier === 1
    ? `Typical lifespan: ${typicalLifespan - 2}–${typicalLifespan + 2} years`
    : undefined;
  
  // === Planning Label (TIER 1 ONLY - Guardrail) ===
  const planningLabel = tier === 1
    ? derivePlanningLabel(age, typicalLifespan)
    : undefined;
  
  // === Helper Message (one sentence max, never mentions "confidence score") ===
  let helperMessage: string | undefined;
  if (confidenceState === 'needs_confirmation') {
    helperMessage = "I'm not fully sure about this yet — you can help me refine it.";
  } else if (confidenceState === 'estimated') {
    helperMessage = "This is an estimate based on the photo.";
  }
  
  // === Show Help CTA ===
  const showHelpCTA = confidenceState !== 'high';
  
  return {
    title,
    subtitle,
    category,
    tier,
    confidenceState,
    confidenceLabel,
    ageLabel,
    lifespanLabel,
    planningLabel,
    helperMessage,
    showHelpCTA,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Compute visual certainty from confidence scores.
 * This is a composite of all signals weighted appropriately.
 */
function computeVisualCertainty(scores: Record<string, number>): number {
  return (
    (scores.brand ?? 0) * 0.25 +
    (scores.model ?? 0) * 0.25 +
    (scores.system_type ?? 0) * 0.35 +
    (scores.serial ? 0.15 : 0)
  );
}

/**
 * Derive planning label from age and lifespan.
 * Returns user-friendly copy instead of raw status.
 */
function derivePlanningLabel(
  age: number | null, 
  typicalLifespan: number
): string | undefined {
  if (age === null) return undefined;
  
  const remainingYears = Math.max(0, typicalLifespan - age);
  
  // Doctrine compliance: Replace "planning window" with lifecycle language
  if (remainingYears <= 2) {
    return 'Later-stage lifecycle';
  } else if (remainingYears <= 5) {
    return 'Later part of lifespan';
  } else {
    return 'Within typical lifespan';
  }
}

// =============================================================================
// STATUS MAPPING (For SystemsHub cards)
// =============================================================================

/**
 * Get user-friendly status copy from internal status.
 * Tier 2 appliances always return "Tracked".
 */
export function getStatusCopy(
  status: 'healthy' | 'planning' | 'attention',
  tier: 1 | 2
): string {
  if (tier === 2) return 'Tracked';
  
  // Doctrine compliance: Replace "planning window" with lifecycle language
  switch (status) {
    case 'healthy':
      return 'Within typical lifespan';
    case 'planning':
      return 'Later part of lifespan';
    case 'attention':
      return 'Later-stage lifecycle';
    default:
      return '';
  }
}
