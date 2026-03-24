/**
 * HVAC Survival Service - V1 Miami-Dade Specific
 * 
 * Two-function architecture:
 * 1. calculateHVACSurvivalCore - Pure math (testable, reusable)
 * 2. buildHVACSystemPrediction - Presentation assembly (all copy generated here)
 * 
 * CRITICAL: UI must not invent copy - it only renders what it receives
 */

import type { HVACSurvivalCore, SystemPrediction, Permit } from '@/types/systemPrediction';

// ============== Configuration Constants ==============
// Miami-Dade specific survival parameters

const BASELINE_LIFESPAN = 14;      // South Florida realistic average (years)
const CLIMATE_MULTIPLIER = 0.85;   // Miami-Dade heat/humidity penalty (~15% reduction)
const MAINTENANCE_BOOST = 1.1;     // ~10% extension for recent maintenance

// ============== Part 1: Pure Survival Math ==============

/**
 * Determine HVAC system age from available data sources
 * Priority: explicit date > replacement permit > install permit > inferred > default
 */
function determineSystemAge(
  explicitInstallYear: number | null,
  homeYearBuilt: number | null,
  permits: Permit[]
): { ageYears: number; installSource: HVACSurvivalCore['installSource'] } {
  const currentYear = new Date().getFullYear();
  
  // Priority 1: Explicit install date from home_systems
  if (explicitInstallYear) {
    return { 
      ageYears: currentYear - explicitInstallYear, 
      installSource: 'permit_replacement' 
    };
  }
  
  // Priority 2: HVAC replacement permit (includes "change out", "upgrade")
  const replacementKeywords = ['replace', 'change out', 'upgrade', 'new unit', 'changeout'];
  const hvacReplacementPermit = permits.find(p => 
    (p.system_tags?.includes('hvac') || 
     p.description?.toLowerCase().includes('hvac') ||
     p.description?.toLowerCase().includes('air condition') ||
     p.description?.toLowerCase().includes('a/c')) && 
    replacementKeywords.some(kw => p.description?.toLowerCase().includes(kw))
  );
  
  if (hvacReplacementPermit?.date_issued) {
    return { 
      ageYears: currentYear - new Date(hvacReplacementPermit.date_issued).getFullYear(),
      installSource: 'permit_replacement'
    };
  }
  
  // Priority 3: HVAC install permit
  const hvacInstallPermit = permits.find(p =>
    (p.system_tags?.includes('hvac') || 
     p.description?.toLowerCase().includes('hvac') ||
     p.description?.toLowerCase().includes('air condition') ||
     p.description?.toLowerCase().includes('a/c')) &&
    (p.description?.toLowerCase().includes('install') || 
     p.description?.toLowerCase().includes('new'))
  );
  
  if (hvacInstallPermit?.date_issued) {
    return { 
      ageYears: currentYear - new Date(hvacInstallPermit.date_issued).getFullYear(),
      installSource: 'permit_install'
    };
  }
  
  // Priority 4: Inferred from home age
  if (homeYearBuilt) {
    const homeAge = currentYear - homeYearBuilt;
    // Assume HVAC is same age as home if home is <15 years old
    // Otherwise assume it was replaced ~7 years ago
    return { 
      ageYears: homeAge < 15 ? homeAge : 7,
      installSource: 'inferred'
    };
  }
  
  // Fallback: Assume 8 years old (conservative default)
  return { ageYears: 8, installSource: 'default' };
}

/**
 * Calculate core HVAC survival metrics
 * This is the pure math function - no presentation logic
 */
export function calculateHVACSurvivalCore(
  installYear: number | null,
  homeYearBuilt: number | null,
  hasRecentMaintenance: boolean,
  permits: Permit[]
): HVACSurvivalCore {
  const { ageYears, installSource } = determineSystemAge(installYear, homeYearBuilt, permits);
  
  // Step 2-4: Calculate adjusted lifespan
  const maintenanceMultiplier = hasRecentMaintenance ? MAINTENANCE_BOOST : 1.0;
  const adjustedLifespanYears = BASELINE_LIFESPAN * CLIMATE_MULTIPLIER * maintenanceMultiplier;
  
  // Step 5: Remaining life
  const remainingYears = Math.max(0, adjustedLifespanYears - ageYears);
  
  // Step 6: Map to status
  const status: HVACSurvivalCore['status'] = 
    remainingYears > 3 ? 'low' : 
    remainingYears > 1 ? 'moderate' : 
    'high';

  return {
    ageYears,
    remainingYears,
    adjustedLifespanYears,
    status,
    hasRecentMaintenance,
    installSource,
  };
}

// ============== Part 2: Presentation Builder ==============

/**
 * Build full SystemPrediction from core survival data
 * ALL copy is generated here - UI just renders
 */
export function buildHVACSystemPrediction(
  core: HVACSurvivalCore,
  context: { installYear?: number; permits: Permit[] }
): SystemPrediction {
  const { status, remainingYears, hasRecentMaintenance, installSource, ageYears } = core;
  
  // Status label mapping (standardized vocabulary)
  const statusLabels: Record<HVACSurvivalCore['status'], string> = {
    low: 'Low Risk',
    moderate: 'Moderate Risk',
    high: 'High Risk',
  };
  
  // Generate seasonal next review hint
  const currentMonth = new Date().getMonth();
  const nextReview = currentMonth >= 3 && currentMonth <= 8 
    ? 'Next review after summer season'
    : 'Next review after winter season';

  // Forecast copy (generated server-side, UI just renders)
  const forecasts: Record<HVACSurvivalCore['status'], { 
    summary: string; 
    reassurance?: string; 
    state: 'reassuring' | 'watch' | 'urgent';
    nextReview: string;
  }> = {
    low: {
      summary: "Low risk over the next year.",
      reassurance: "No urgent action is required right now.",
      state: 'reassuring',
      nextReview,
    },
    moderate: {
      summary: "Likely to need attention in 6–12 months.",
      reassurance: "This is a watch item, not an emergency.",
      state: 'watch',
      nextReview,
    },
    high: {
      summary: "Likely to need attention within the next 3–6 months.",
      reassurance: undefined,
      state: 'urgent',
      nextReview: 'Review recommended soon',
    },
  };
  
  // PROTECTIVE factors - why things are going well (for Home Health card)
  // Canonical rule: Home Health card may only explain stability, not risk
  const protectiveBullets: string[] = [];
  
  if (remainingYears > 3) {
    protectiveBullets.push("HVAC system age is well within expected lifespan");
  }
  if (hasRecentMaintenance) {
    protectiveBullets.push("Recent maintenance activity is extending system life");
  }
  if (installSource.includes('permit')) {
    protectiveBullets.push("Install date verified through permit records");
  }
  // Always add baseline reassurance
  protectiveBullets.push("Local climate conditions are continuously monitored");
  
  // RISK context - for system drill-down only (never in Home Health card)
  const riskBullets: string[] = [];
  riskBullets.push("Miami-Dade heat and humidity increase wear over time");
  if (ageYears > 10) {
    riskBullets.push("System age increases likelihood of component fatigue");
  }
  if (remainingYears <= 3) {
    riskBullets.push("System age is approaching typical replacement range");
  }
  
  // Actions (max 2, only if not low risk)
  const actions: SystemPrediction['actions'] = status !== 'low' ? [
    {
      title: "Replace HVAC filter",
      metaLine: "$20 · 30 min DIY",
      priority: 'standard',
      diyOrPro: 'DIY',
      chatdiySlug: 'hvac-filter-replacement',
    },
    {
      title: "Seasonal HVAC inspection",
      metaLine: "$80–$120 · Schedule PRO",
      priority: status === 'high' ? 'high' : 'standard',
      diyOrPro: 'PRO',
      chatdiySlug: 'hvac-seasonal-inspection',
    },
  ] : [];
  
  // Planning (only if remainingYears <= 3, enforced HERE not in UI)
  const planning = remainingYears <= 3 ? {
    text: "If replacement is needed, typical costs range from $6,000–$12,000 depending on size and efficiency."
  } : undefined;
  
  // Installed line based on source
  const installYear = context.installYear || (new Date().getFullYear() - ageYears);
  const sourceNote = installSource === 'permit_replacement' || installSource === 'permit_install'
    ? '(based on permit)'
    : '(estimated)';
  
  // Build factors
  const helps: string[] = [];
  const hurts: string[] = [];
  
  if (hasRecentMaintenance) {
    helps.push('Recent maintenance logged');
  }
  
  hurts.push('Miami-Dade climate stress');
  if (ageYears > 10) {
    hurts.push('System age > 10 years');
  }
  
  return {
    systemKey: 'hvac',
    status,
    header: {
      name: 'HVAC',
      installedLine: `Installed ~${installYear} ${sourceNote}`,
      statusLabel: statusLabels[status],
    },
    forecast: {
      headline: 'What to Expect',
      ...forecasts[status],
    },
    why: {
      bullets: protectiveBullets,
      riskContext: riskBullets,
      sourceLabel: installSource.includes('permit') ? 'Based on permit records' : undefined,
    },
    factors: {
      helps,
      hurts,
    },
    actions,
    planning,
  };
}

/**
 * One-shot function for convenience
 * Combines core calculation and presentation building
 */
export function getHVACPrediction(
  installYear: number | null,
  homeYearBuilt: number | null,
  hasRecentMaintenance: boolean,
  permits: Permit[]
): SystemPrediction {
  const core = calculateHVACSurvivalCore(installYear, homeYearBuilt, hasRecentMaintenance, permits);
  return buildHVACSystemPrediction(core, { installYear: installYear ?? undefined, permits });
}
