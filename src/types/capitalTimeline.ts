/**
 * HomeCapitalTimeline - Canonical Data Contracts
 * 
 * Single source of truth for the unified CapEx timeline view.
 * Designed to be system-agnostic, probabilistic, and honest about uncertainty.
 * 
 * DESIGN PRINCIPLES:
 * - Model uncertainty explicitly (dataQuality vs windowUncertainty)
 * - Separate facts from inference
 * - Support time + cost simultaneously
 * - Scale to portfolios without rewrites
 * 
 * @version v1
 */

export type CapitalSystemType = 'hvac' | 'roof' | 'water_heater';
export type SystemCategory = 'mechanical' | 'structural' | 'utility';
export type InstallSource = 'permit' | 'inferred' | 'unknown';
export type DataQuality = 'high' | 'medium' | 'low';
export type WindowUncertainty = 'narrow' | 'medium' | 'wide';

/**
 * HomeCapitalTimeline - The root timeline for a property
 */
export interface HomeCapitalTimeline {
  propertyId: string;
  /** Timeline horizon in years (default: 10) */
  horizonYears: number;
  /** Generation timestamp (ISO string) */
  generatedAt: string;
  /** All major home systems with capital impact */
  systems: SystemTimelineEntry[];
  /** Roll-up of expected capital exposure */
  capitalOutlook: CapitalOutlook;
  /** Overall data quality for the timeline */
  dataQuality: {
    completenessPercent: number; // 0–100
    limitingFactors: string[];   // e.g., ["No roof permit found"]
  };
}

/**
 * SystemTimelineEntry - Each lane on the timeline
 * 
 * IMPORTANT: dataQuality and windowUncertainty are SEPARATED
 * - dataQuality = How reliable is our input data (permits, user input)?
 * - windowUncertainty = How wide is the probabilistic window?
 */
export interface SystemTimelineEntry {
  systemId: CapitalSystemType;
  systemLabel: string;
  category: SystemCategory;
  
  // Data source (separate from uncertainty)
  installSource: InstallSource;
  installYear: number | null;
  /** How complete/reliable our input data is */
  dataQuality: DataQuality;
  
  // Probabilistic window (separate from data quality)
  replacementWindow: ReplacementWindow;
  /** How wide the probabilistic window is */
  windowUncertainty: WindowUncertainty;
  
  capitalCost: CapitalCostRange;
  lifespanDrivers: LifespanDriver[];
  maintenanceEffect: MaintenanceEffect;
  
  /** Always populated; roof gets calming disclosure */
  disclosureNote: string;
  
  // Event acknowledgment hooks
  lastEventAt?: string;  // ISO timestamp of last user-confirmed event
  eventShiftYears?: number;  // How much the window shifted after last event

  // Earned confidence fields (v3)
  materialType?: string;
  materialSource?: string;
  climateZone?: string;
  climateConfidence?: string;
  costConfidence?: string;
  costAttributionLine?: string;
  costDisclaimer?: string;
}

/**
 * ReplacementWindow - Time + Probability
 * 
 * Avoids fake precision while staying useful.
 * Maps to p10 (early), p50 (likely), p90 (late) in probabilistic terms.
 */
export interface ReplacementWindow {
  /** Earliest plausible replacement year (p10) */
  earlyYear: number;
  /** Most likely replacement year (p50) */
  likelyYear: number;
  /** Latest plausible replacement year (p90) */
  lateYear: number;
  /** Explanation for window size and position */
  rationale: string;
}

/**
 * CapitalCostRange - Financial impact
 */
export interface CapitalCostRange {
  /** Low-end expected cost */
  low: number;
  /** High-end expected cost */
  high: number;
  /** Tightened anchor low (confidence-gated) */
  typicalLow?: number;
  /** Tightened anchor high (confidence-gated) */
  typicalHigh?: number;
  currency: 'USD';
  /** What drives cost variability */
  costDrivers: string[];
}

/**
 * LifespanDriver - Why the window is where it is
 * Powers ChatDIY explanations
 */
export interface LifespanDriver {
  factor: string;   // "Climate stress"
  impact: 'increase' | 'decrease';
  severity: 'low' | 'medium' | 'high';
  description?: string;
}

/**
 * MaintenanceEffect - The differentiator
 * 
 * IMPORTANT: Maintenance does NOT remove CapEx — it moves it.
 */
export interface MaintenanceEffect {
  /** Does maintenance meaningfully shift the timeline? */
  shiftsTimeline: boolean;
  /** Expected shift in years (if maintained) */
  expectedDelayYears?: number; // e.g., 2–4
  /** Effect on uncertainty */
  uncertaintyReduction?: 'low' | 'medium' | 'high';
  /** Explanation shown to users */
  explanation: string;
}

/**
 * CapitalOutlook - Aggregated exposure across horizons
 * 
 * Uses WEIGHTED exposure, not naive binary inclusion.
 * - Early in horizon = 0.3× weight ("possible")
 * - Likely in horizon = 1.0× weight ("probable")
 */
export interface CapitalOutlook {
  horizons: Array<{
    yearsAhead: 3 | 5 | 10;
    lowEstimate: number;
    highEstimate: number;
    methodology: 'weighted';
  }>;
  methodologyNote: string;
}

/**
 * SystemReplacementEvent - Event acknowledgment for habit formation
 * 
 * When a user confirms a replacement, the timeline visibly shifts.
 */
export interface SystemReplacementEvent {
  systemId: CapitalSystemType;
  eventType: 'replacement' | 'major_repair' | 'upgrade';
  eventDate: string;
  verificationSource: 'user_reported' | 'permit_detected';
  beforeWindow: ReplacementWindow;
  afterWindow: ReplacementWindow;
  capitalOutlookDelta: {
    yearsAhead: number;
    previousEstimate: { low: number; high: number };
    newEstimate: { low: number; high: number };
  };
}

// ============== Material-Specific Constants ==============

export const ROOF_LIFESPANS: Record<string, { min: number; max: number }> = {
  asphalt: { min: 18, max: 25 },
  tile: { min: 35, max: 50 },
  metal: { min: 40, max: 70 },
  unknown: { min: 20, max: 30 }, // Conservative default
};

export const ROOF_COSTS: Record<string, { min: number; max: number }> = {
  asphalt: { min: 12000, max: 20000 },
  tile: { min: 18000, max: 35000 },
  metal: { min: 20000, max: 45000 },
  unknown: { min: 15000, max: 30000 },
};

export const WATER_HEATER_LIFESPANS: Record<string, { min: number; max: number }> = {
  tank: { min: 8, max: 12 },
  tankless: { min: 15, max: 20 },
  unknown: { min: 8, max: 12 }, // Default to tank (most common)
};

export const WATER_HEATER_COSTS: Record<string, { min: number; max: number }> = {
  tank: { min: 1800, max: 3000 },
  tankless: { min: 3500, max: 6000 },
  unknown: { min: 1800, max: 3500 },
};

export const HVAC_LIFESPAN = { min: 12, max: 18 };
export const HVAC_COST = { min: 9000, max: 14000 };
