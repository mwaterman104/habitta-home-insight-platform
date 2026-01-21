// ============== V1 HVAC Survival Types ==============
// Miami-Dade specific, deterministic survival model

import type { HVACFailureProvenance } from './hvacFailure';

/**
 * Core survival output (pure math, no presentation)
 * This is the testable, reusable calculation result
 */
export interface HVACSurvivalCore {
  ageYears: number;
  remainingYears: number;
  adjustedLifespanYears: number;
  status: 'low' | 'moderate' | 'high';
  hasRecentMaintenance: boolean;
  installSource: 'permit_replacement' | 'permit_install' | 'inferred' | 'default';
}

/**
 * Lifespan prediction block - SEMANTIC ONLY (no formatting)
 * UI-layer formatting lives in src/utils/lifespanFormatters.ts
 */
export interface LifespanPrediction {
  /** System install date (ISO string) */
  install_date: string;
  /** Current age in years (calculated from install date) */
  current_age_years: number;
  /** Early failure date - 10th percentile (ISO string) */
  p10_failure_date: string;
  /** Most likely failure date - 50th percentile (ISO string) */
  p50_failure_date: string;
  /** Late failure date - 90th percentile (ISO string) */
  p90_failure_date: string;
  /** Years remaining until most likely failure */
  years_remaining_p50: number;
  /** Confidence score (0-1) based on data quality, NOT system condition */
  confidence_0_1: number;
  /** Full provenance for auditability (optional for backward compat) */
  provenance?: HVACFailureProvenance;
}

/**
 * Full presentation contract (all copy generated server-side)
 * CRITICAL: UI must not invent copy - it only renders what it receives
 */
export interface SystemPrediction {
  systemKey: 'hvac';
  status: 'low' | 'moderate' | 'high';

  header: {
    name: 'HVAC';
    installedLine: string;      // e.g., "Installed ~2018 (based on permit)"
    statusLabel: string;        // e.g., "Moderate Risk"
  };

  forecast: {
    headline: 'What to Expect';
    summary: string;            // Plain English forecast
    reassurance?: string;       // Calming context (optional)
    state: 'reassuring' | 'watch' | 'urgent';
  };

  why: {
    bullets: string[];          // Protective factors (for Home Health card)
    riskContext?: string[];     // Risk factors (for system drill-down only)
    sourceLabel?: string;       // e.g., "Based on permit records"
  };

  factors: {
    helps: string[];            // Positive factors
    hurts: string[];            // Risk factors
  };

  actions: Array<{
    title: string;
    metaLine: string;           // e.g., "$20 · 30 min DIY"
    priority: 'standard' | 'high';
    diyOrPro: 'DIY' | 'PRO' | 'Either';
    chatdiySlug: string;        // Link to ChatDIY guide
  }>;

  planning?: {
    text: string;               // Optional replacement cost guidance
  };

  history?: Array<{
    date: string;
    description: string;
    source: string;
  }>;

  /** 
   * Lifespan prediction block - SEMANTIC ONLY
   * For p10/p50/p90 failure window display
   * UI formatting via src/utils/lifespanFormatters.ts
   */
  lifespan?: LifespanPrediction;
  
  /** 
   * Optimization signals - SEMANTIC ONLY (no copy)
   * Frontend derives presentation from these signals
   * Mirrors lifespan pattern: semantic data here, formatting in optimizationCopy.ts
   */
  optimization?: SystemOptimizationSignals;
}

/**
 * System Optimization Signals - SEMANTIC ONLY (no copy)
 * Frontend derives presentation from these signals
 */
export interface SystemOptimizationSignals {
  /** Confidence bucket for copy selection */
  confidenceState: 'low' | 'medium' | 'high';

  /** Raw signals for UI composition */
  signals: {
    permitVerified: boolean;
    installSource: 'permit_install' | 'permit_replacement' | 'inferred' | 'default';
    maintenanceState: 'good' | 'unknown' | 'needs_attention';
    hasLimitedHistory: boolean;
    climateRegion: 'south_florida' | 'other';
    usageState: 'typical' | 'heavy' | 'unknown';
  };

  /** Planning eligibility (UI decides visibility/gating) */
  planningEligibility: {
    remainingYears: number;
    isForeseeable: boolean; // remainingYears <= 5
  };

  /** Context for tips selection */
  tipsContext: {
    season: 'spring' | 'summer' | 'fall' | 'winter';
    climateRegion: 'south_florida' | 'other';
  };
}

/**
 * Permit data structure for survival calculations
 */
export interface Permit {
  id: string;
  date_issued?: string;
  description?: string;
  system_tags?: string[];
  permit_type?: string;
}
