/**
 * Canonical System Copy Module
 * 
 * Single source of truth for confidence-based copy.
 * Pure functions, no side effects.
 * 
 * HARD RULE: If confidence is 'low', never use "within X years" language.
 */

import type { ConfidenceLevel } from './systemConfidence';

// =============================================================================
// TYPES
// =============================================================================

export type SystemKey = 'hvac' | 'roof' | 'water_heater' | 'electrical';
export type ActionsTier = 'preventive' | 'preparatory' | 'decisive';

export interface WhatToExpect {
  headline: string;
  body: string;
}

// =============================================================================
// WINDOW LABELS
// =============================================================================

/**
 * Get the label for the replacement window visualization
 * 
 * low → "Planning horizon" (soft, no urgency)
 * medium → "Likely replacement window" (reasonable confidence)
 * high → "Expected replacement window" (firm)
 */
export function getWindowLabel(confLevel: ConfidenceLevel): string {
  switch (confLevel) {
    case 'low':
      return 'Planning horizon';
    case 'medium':
      return 'Likely replacement window';
    case 'high':
      return 'Expected replacement window';
    default:
      return 'Replacement window';
  }
}

// =============================================================================
// WHAT TO EXPECT COPY
// =============================================================================

/**
 * Get "What to Expect" copy based on system, confidence, and years remaining
 * 
 * HARD RULE: If confLevel is 'low', do NOT use "within X years" language.
 */
export function getWhatToExpect(
  systemKey: SystemKey,
  confLevel: ConfidenceLevel,
  yearsRemaining: number
): WhatToExpect {
  const systemLabel = getSystemLabel(systemKey);
  
  // LOW CONFIDENCE - Never use specific timelines
  if (confLevel === 'low') {
    return getLowConfidenceCopy(systemKey, systemLabel);
  }
  
  // MEDIUM CONFIDENCE - Moderate certainty
  if (confLevel === 'medium') {
    return getMediumConfidenceCopy(systemKey, systemLabel, yearsRemaining);
  }
  
  // HIGH CONFIDENCE - Can be more direct
  return getHighConfidenceCopy(systemKey, systemLabel, yearsRemaining);
}

function getLowConfidenceCopy(systemKey: SystemKey, systemLabel: string): WhatToExpect {
  // Special case for electrical - never use "failure" language
  if (systemKey === 'electrical') {
    return {
      headline: 'System age unknown',
      body: 'Many older homes retain original electrical systems unless updated during renovations. An evaluation can help identify capacity limitations or safety considerations.',
    };
  }
  
  return {
    headline: 'Based on typical patterns',
    body: `Based on typical ${systemLabel.toLowerCase()} lifespans and home age, this system may be in its later years. Planning ahead can help avoid surprises.`,
  };
}

function getMediumConfidenceCopy(systemKey: SystemKey, systemLabel: string, yearsRemaining: number): WhatToExpect {
  // Special case for electrical
  if (systemKey === 'electrical') {
    return {
      headline: 'System may need evaluation',
      body: 'Based on reported updates, this system may not fully meet modern electrical demands. An evaluation can help identify limitations.',
    };
  }
  
  // Late life (0-3 years remaining)
  if (yearsRemaining <= 3) {
    return {
      headline: 'In late service life',
      body: `Given the reported install date, this ${systemLabel.toLowerCase()} is likely in its later years. Monitoring performance and planning for replacement is recommended.`,
    };
  }
  
  // Mid life (3-7 years)
  if (yearsRemaining <= 7) {
    return {
      headline: 'Approaching replacement window',
      body: `This ${systemLabel.toLowerCase()} is approaching the typical replacement window. Consider budgeting for future replacement.`,
    };
  }
  
  // Good condition
  return {
    headline: 'Within expected lifespan',
    body: `This ${systemLabel.toLowerCase()} appears to be within its expected service life. Regular maintenance will help maximize longevity.`,
  };
}

function getHighConfidenceCopy(systemKey: SystemKey, systemLabel: string, yearsRemaining: number): WhatToExpect {
  // Special case for electrical
  if (systemKey === 'electrical') {
    return {
      headline: 'Verified system standard',
      body: 'Based on verified records, this electrical system reflects modern standards for its time. Future upgrades may still be needed as usage increases.',
    };
  }
  
  // Late life (0-3 years remaining)
  if (yearsRemaining <= 3) {
    return {
      headline: 'Nearing end of service life',
      body: `Based on verified installation data, this ${systemLabel.toLowerCase()} is nearing the end of its expected service life. Planning replacement within the next ${yearsRemaining <= 1 ? '1-2' : '2-3'} years is advisable.`,
    };
  }
  
  // Mid life (3-7 years)
  if (yearsRemaining <= 7) {
    return {
      headline: 'Mid-life, replacement ahead',
      body: `This ${systemLabel.toLowerCase()} has approximately ${yearsRemaining} years of expected service remaining. Consider planning for replacement in the coming years.`,
    };
  }
  
  // Good condition
  return {
    headline: 'Good condition',
    body: `This ${systemLabel.toLowerCase()} has significant service life remaining based on verified installation records. Continue regular maintenance.`,
  };
}

// =============================================================================
// WHY WE'RE SHOWING THIS
// =============================================================================

/**
 * Get "Why we're showing this" explanatory copy
 */
export function getWhyShowingThis(confLevel: ConfidenceLevel): string[] {
  switch (confLevel) {
    case 'low':
      return [
        'This estimate is based on your home\'s age and typical replacement patterns.',
        'Systems are often replaced without permits, so this may not reflect the actual install date.',
        'You can update this information to improve accuracy.',
      ];
    case 'medium':
      return [
        'This information is based on details you provided.',
        'Adding service records or system details can further improve accuracy.',
      ];
    case 'high':
      return [
        'This information is based on verified records for your home.',
      ];
    default:
      return ['Based on available data.'];
  }
}

// =============================================================================
// ACTIONS TIER
// =============================================================================

/**
 * Get the recommended actions tier based on confidence
 * 
 * low → preventive (inspect, monitor, learn)
 * medium → preparatory (budget, compare, get quotes)
 * high → decisive (schedule, replace, lock pricing)
 */
export function getActionsTier(confLevel: ConfidenceLevel): ActionsTier {
  switch (confLevel) {
    case 'low':
      return 'preventive';
    case 'medium':
      return 'preparatory';
    case 'high':
      return 'decisive';
    default:
      return 'preventive';
  }
}

/**
 * Get action verbs for the tier
 */
export function getActionsForTier(tier: ActionsTier, systemKey: SystemKey): string[] {
  switch (tier) {
    case 'preventive':
      return getPreventiveActions(systemKey);
    case 'preparatory':
      return getPreparatoryActions(systemKey);
    case 'decisive':
      return getDecisiveActions(systemKey);
    default:
      return [];
  }
}

function getPreventiveActions(systemKey: SystemKey): string[] {
  switch (systemKey) {
    case 'hvac':
      return ['Replace filters', 'Schedule tune-up', 'Monitor performance', 'Learn warning signs'];
    case 'roof':
      return ['Inspect after storms', 'Clear debris', 'Check for leaks', 'Learn warning signs'];
    case 'water_heater':
      return ['Flush annually', 'Check anode rod', 'Inspect for leaks', 'Learn warning signs'];
    case 'electrical':
      return ['Safety inspection', 'Check panel capacity', 'Identify outdated components', 'Test GFCI outlets'];
    default:
      return ['Schedule inspection', 'Monitor performance'];
  }
}

function getPreparatoryActions(systemKey: SystemKey): string[] {
  switch (systemKey) {
    case 'hvac':
      return ['Compare replacement options', 'Budget for upgrade', 'Get efficiency estimates', 'Research contractors'];
    case 'roof':
      return ['Schedule professional inspection', 'Start budgeting', 'Compare material options', 'Get preliminary quotes'];
    case 'water_heater':
      return ['Compare tank vs tankless', 'Budget for replacement', 'Research efficiency ratings', 'Get quotes'];
    case 'electrical':
      return ['Assess load capacity', 'Plan for EV/solar needs', 'Budget for upgrades', 'Consult electrician'];
    default:
      return ['Budget for replacement', 'Research options'];
  }
}

function getDecisiveActions(systemKey: SystemKey): string[] {
  switch (systemKey) {
    case 'hvac':
      return ['Schedule replacement', 'Lock pricing', 'Consider energy incentives', 'Finalize contractor'];
    case 'roof':
      return ['Get replacement quotes', 'Schedule work', 'Coordinate with insurance', 'Choose materials'];
    case 'water_heater':
      return ['Schedule replacement', 'Choose model', 'Lock pricing', 'Arrange installation'];
    case 'electrical':
      return ['Schedule panel upgrade', 'Finalize scope', 'Pull permits', 'Choose contractor'];
    default:
      return ['Schedule replacement', 'Finalize plans'];
  }
}

// =============================================================================
// LIFESPAN VISUALIZATION
// =============================================================================

/**
 * Get replacement window spread based on confidence
 * Used for timeline visualization width
 */
export function getReplacementWindowSpread(confLevel: ConfidenceLevel): { minYears: number; maxYears: number } {
  switch (confLevel) {
    case 'low':
      return { minYears: 5, maxYears: 7 };
    case 'medium':
      return { minYears: 3, maxYears: 4 };
    case 'high':
      return { minYears: 1, maxYears: 2 };
    default:
      return { minYears: 5, maxYears: 7 };
  }
}

/**
 * Should the visualization use dashed styling?
 */
export function shouldUseDashedVisualization(confLevel: ConfidenceLevel): boolean {
  return confLevel === 'low';
}

// =============================================================================
// HELPERS
// =============================================================================

function getSystemLabel(systemKey: SystemKey): string {
  switch (systemKey) {
    case 'hvac':
      return 'HVAC system';
    case 'roof':
      return 'Roof';
    case 'water_heater':
      return 'Water heater';
    case 'electrical':
      return 'Electrical system';
    default:
      return 'System';
  }
}

/**
 * Get friendly system name for UI
 */
export function getSystemDisplayName(systemKey: SystemKey): string {
  switch (systemKey) {
    case 'hvac':
      return 'HVAC';
    case 'roof':
      return 'Roof';
    case 'water_heater':
      return 'Water Heater';
    case 'electrical':
      return 'Electrical';
    default:
      return systemKey;
  }
}
