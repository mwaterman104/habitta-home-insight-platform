// ============== V1 HVAC Survival Types ==============
// Miami-Dade specific, deterministic survival model

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
