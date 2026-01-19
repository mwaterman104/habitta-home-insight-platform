import type { RiskDelta } from '@/types/riskDelta';

interface EstimateConfig {
  systemType: string;
  category?: string;
}

// Fallback estimates based on system type when no historical data
const SYSTEM_DEFAULTS: Record<string, Partial<RiskDelta>> = {
  hvac: { scoreChange: 5, monthsAdded: 6, failureProbReduction: 0.05 },
  roof: { scoreChange: 3, monthsAdded: 12, failureProbReduction: 0.03 },
  water_heater: { scoreChange: 4, monthsAdded: 8, failureProbReduction: 0.04 },
  plumbing: { scoreChange: 3, monthsAdded: 6, failureProbReduction: 0.03 },
  electrical_panel: { scoreChange: 4, monthsAdded: 12, failureProbReduction: 0.04 },
  electrical: { scoreChange: 4, monthsAdded: 12, failureProbReduction: 0.04 },
  pool: { scoreChange: 3, monthsAdded: 6, failureProbReduction: 0.03 },
  foundation: { scoreChange: 2, monthsAdded: 24, failureProbReduction: 0.02 },
  windows: { scoreChange: 2, monthsAdded: 12, failureProbReduction: 0.02 },
  doors: { scoreChange: 2, monthsAdded: 12, failureProbReduction: 0.02 },
  siding: { scoreChange: 2, monthsAdded: 18, failureProbReduction: 0.02 },
  appliances: { scoreChange: 3, monthsAdded: 6, failureProbReduction: 0.03 },
  garage_door: { scoreChange: 2, monthsAdded: 6, failureProbReduction: 0.02 },
  irrigation: { scoreChange: 2, monthsAdded: 6, failureProbReduction: 0.02 },
  septic: { scoreChange: 3, monthsAdded: 12, failureProbReduction: 0.03 },
  well: { scoreChange: 3, monthsAdded: 12, failureProbReduction: 0.03 },
};

// Generic fallback for unknown system types
const GENERIC_ESTIMATE: Partial<RiskDelta> = {
  scoreChange: 3,
  monthsAdded: 6,
  failureProbReduction: 0.03,
};

/**
 * Get estimated impact based on historical data or fallback defaults
 * 
 * Strategy:
 * 1. Query historical impacts for same systemType + category (future enhancement)
 * 2. Fall back to system-level defaults
 * 3. Use generic estimate if system type unknown
 * 
 * @param config - System type and optional category
 * @returns Estimated risk delta or null if unable to estimate
 */
export function getEstimatedImpact(config: EstimateConfig): Partial<RiskDelta> | null {
  const { systemType } = config;
  
  if (!systemType) return null;
  
  // Normalize system type (lowercase, handle common aliases)
  const normalizedType = systemType.toLowerCase().replace(/[-\s]/g, '_');
  
  // Look up system defaults
  const defaults = SYSTEM_DEFAULTS[normalizedType];
  
  if (defaults) {
    return {
      scoreChange: defaults.scoreChange,
      monthsAdded: defaults.monthsAdded,
      failureProbReduction: defaults.failureProbReduction,
      statusChange: null,
    };
  }
  
  // Return generic estimate for unknown system types
  return {
    ...GENERIC_ESTIMATE,
    statusChange: null,
  };
}

/**
 * Format estimated impact for display
 */
export function formatEstimatedImpact(estimate: Partial<RiskDelta> | null): string | null {
  if (!estimate) return null;
  
  const parts: string[] = [];
  
  if (estimate.scoreChange) {
    parts.push(`~${estimate.scoreChange}pts`);
  }
  
  if (estimate.monthsAdded) {
    parts.push(`~${estimate.monthsAdded}mo`);
  }
  
  return parts.length > 0 ? `Est: ${parts.join(', ')}` : null;
}
