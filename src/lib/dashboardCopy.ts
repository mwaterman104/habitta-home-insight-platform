/**
 * Dashboard Copy Governance - Centralized State-Based Copy Generation
 * 
 * All dashboard narrative copy flows through this module.
 * Ensures tone consistency, enables A/B testing, and decouples copy from components.
 * 
 * Tone principles:
 * - Calm, declarative, experienced
 * - No fear, no urgency unless mathematically justified
 * - Never say "failure," "break," or "about to"
 * - Assume homeowner intelligence
 */

import type { BriefKey, NarrativeResult } from './narrativePriority';

export interface HomeBrief {
  primary: string;
  secondary?: string;
}

export interface ScoreStateCopy {
  label: string;
  description: string;
  tooltip: string;
}

export interface ConfidenceDisplay {
  label: string;
  tooltip: string;
  level: 'high' | 'medium' | 'low';
}

/**
 * Generate brief copy based on narrative arbitration result
 */
export function getBriefCopy(result: NarrativeResult): HomeBrief {
  const { briefKey, dominantSystemName } = result;
  const systemName = dominantSystemName?.toLowerCase() || 'system';
  
  const copyMap: Record<BriefKey, HomeBrief> = {
    elevated_risk: {
      primary: `We're seeing early indicators worth noting on your ${systemName}. Performance remains stable, but planning ahead is recommended.`,
      secondary: 'No immediate action required today.'
    },
    planning_opportunity: {
      primary: `One system is entering its planning window. This isn't urgent, but early awareness improves cost and timing flexibility.`,
      secondary: 'Confirming details now helps keep future decisions predictable.'
    },
    confidence_improved: {
      primary: `Your forecast just got more accurate. New information improved confidence in your ${systemName} timeline.`,
      secondary: 'This helps us give you better planning guidance.'
    },
    new_user_stable: {
      primary: `We're building an initial picture of your home. Early forecasts are conservative and will improve as details are confirmed.`,
      secondary: 'No action is required right now.'
    },
    returning_stable: {
      primary: `Your home is operating within expected ranges. No immediate issues detected across core systems.`,
      secondary: 'Long-term stability is driven by small, periodic upkeep—not major interventions.'
    },
    maintenance_pending: {
      primary: `Your home is stable overall. A few routine maintenance tasks are pending.`,
      secondary: 'Regular maintenance reduces wear and extends system life.'
    }
  };
  
  return copyMap[briefKey] || copyMap.returning_stable;
}

/**
 * Get score state copy based on health score
 */
export function getScoreStateCopy(score: number): ScoreStateCopy {
  if (score >= 80) {
    return {
      label: 'Strong',
      description: 'Systems are stable and well-aligned with expected lifespans.',
      tooltip: 'This score reflects system age, condition signals, and maintenance history.'
    };
  }
  
  if (score >= 60) {
    return {
      label: 'Stable',
      description: 'Normal wear is present. Planning—not urgency—is the priority.',
      tooltip: 'Most homes spend the majority of their lifecycle in this range.'
    };
  }
  
  return {
    label: 'Needs Attention',
    description: 'One or more systems are operating outside ideal planning ranges.',
    tooltip: 'This does not indicate failure—only increased planning importance.'
  };
}

/**
 * Get confidence display based on confidence level
 */
export function getConfidenceDisplay(confidence: number): ConfidenceDisplay {
  if (confidence >= 0.8) {
    return {
      label: 'High confidence',
      tooltip: 'Based on verified installation records and maintenance history.',
      level: 'high'
    };
  }
  
  if (confidence >= 0.5) {
    return {
      label: 'Moderate confidence',
      tooltip: 'Based on estimated install timing and typical usage patterns.',
      level: 'medium'
    };
  }
  
  return {
    label: 'Preliminary',
    tooltip: 'Estimates will improve as system details are added.',
    level: 'low'
  };
}

/**
 * Get timeline section intro copy
 */
export function getTimelineIntroCopy(): string {
  return 'This timeline shows when major systems typically need attention based on age, usage, and local conditions. Timing adjusts as new data is added.';
}

/**
 * Get maintenance section intro copy
 */
export function getMaintenanceIntroCopy(): string {
  return 'Regular maintenance reduces wear, extends system life, and lowers long-term costs.';
}

/**
 * Get maintenance bucket subtext
 */
export function getMaintenanceBucketSubtext(bucket: 'now' | 'thisYear' | 'future'): string {
  const subtexts: Record<string, string> = {
    now: 'Short, preventive tasks that protect larger systems',
    thisYear: 'Seasonal maintenance aligned to your home and climate',
    future: 'No major maintenance expected beyond routine care'
  };
  return subtexts[bucket];
}

/**
 * Get capital outlook intro copy
 */
export function getCapitalIntroCopy(): string {
  return 'These estimates reflect typical long-term costs when systems are planned for instead of replaced reactively.';
}

/**
 * Get capital outlook framing sentence
 */
export function getCapitalFramingCopy(): string {
  return 'Most homeowners experience these costs as surprises. Habitta spreads them into predictable planning.';
}

/**
 * Get performance glance intro copy
 */
export function getPerformanceGlanceIntroCopy(): string {
  return "Here's what we're seeing across your home right now:";
}

/**
 * Get local factors copy
 */
export function getLocalFactorsCopy(): { main: string; subtext: string } {
  return {
    main: 'Local weather and climate conditions are actively monitored and factored into system forecasts.',
    subtext: 'Environmental stress can affect system lifespan over time. No elevated risk detected.'
  };
}

/**
 * Get chat prompt copy
 */
export function getChatPromptCopy(): { placeholder: string; emptyState: string } {
  return {
    placeholder: 'Have a question about your home or a specific system?',
    emptyState: "I'll let you know when something important changes."
  };
}

/**
 * Get system status label based on months to planning
 */
export function getSystemStatusLabel(monthsToPlanning?: number): string {
  if (!monthsToPlanning) return '';
  
  if (monthsToPlanning > 84) { // > 7 years
    return 'Long-term planning horizon';
  }
  if (monthsToPlanning > 36) { // 3-7 years
    return 'Future planning window';
  }
  return 'Approaching planning range';
}

/**
 * Get score change copy
 */
export function getScoreChangeCopy(isImproved: boolean): string {
  if (isImproved) {
    return 'Your score increased as system data and maintenance records were added.';
  }
  return 'Minor score movement reflects natural system aging—not a new issue.';
}
