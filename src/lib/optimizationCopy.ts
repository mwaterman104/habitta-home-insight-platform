/**
 * Optimization Copy Utilities
 * 
 * UI-layer derivation helpers for presenting optimization guidance.
 * All copy logic lives HERE, not in the prediction contract.
 * 
 * Pattern: Backend provides signals → this file derives copy
 */

import type { SystemOptimizationSignals } from '@/types/systemPrediction';

// ============== Confidence Helper Text ==============

export const CONFIDENCE_HELPER_TEXT = {
  high: 'Confidence is high based on verified install records, maintenance history, and system details.',
  medium: 'Confidence reflects available data. Adding service history or system details will improve accuracy.',
  low: 'This estimate is early and will improve as service history and usage data are added.'
} as const;

// ============== Maintenance Copy ==============

export interface MaintenanceCopy {
  headline: string;
  body: string;
  contextLine: string;
  ctaText: string;
  ctaRoute: string;
}

export function getMaintenanceCopy(
  confidenceState: 'low' | 'medium' | 'high',
  maintenanceState: 'good' | 'unknown' | 'needs_attention'
): MaintenanceCopy {
  const copy: Record<'low' | 'medium' | 'high', Omit<MaintenanceCopy, 'headline'>> = {
    high: {
      body: 'Regular maintenance is helping keep this system on track for the later end of its expected lifespan.',
      contextLine: 'Continue current maintenance habits to preserve efficiency and reliability.',
      ctaText: 'View maintenance history',
      ctaRoute: '/maintenance-history'
    },
    medium: {
      body: "Routine maintenance can extend this system's life by 1–3 years and reduce failure risk by 15–25%.",
      contextLine: maintenanceState === 'unknown'
        ? "We don't see recent service records. In South Florida's climate, regular tune-ups make the biggest difference."
        : 'Recent maintenance is helping, but additional records would improve long-term guidance.',
      ctaText: 'View recommended maintenance',
      ctaRoute: '/chatdiy?topic=hvac-maintenance-checklist'
    },
    low: {
      body: 'Maintenance and usage habits have an outsized impact when system history is limited.',
      contextLine: 'Adding service records or system details will help refine lifespan estimates and recommendations.',
      ctaText: 'Add system details or maintenance',
      ctaRoute: '/add-system-details'
    }
  };

  return { headline: 'Maintenance matters', ...copy[confidenceState] };
}

// ============== Ownership Factors ==============

export interface OwnershipFactor {
  label: string;
  status: 'good' | 'neutral' | 'warning';
  value?: string;
}

export function getOwnershipFactors(signals: SystemOptimizationSignals['signals']): OwnershipFactor[] {
  return [
    {
      label: 'Install verified by permit',
      status: signals.permitVerified ? 'good' : 'neutral',
      value: signals.permitVerified ? undefined : 'Not found'
    },
    {
      label: 'Climate stress',
      status: 'warning',
      value: signals.climateRegion === 'south_florida' ? 'High (South Florida)' : 'Moderate'
    },
    {
      label: 'Maintenance consistency',
      status: signals.maintenanceState === 'good' ? 'good' :
              signals.maintenanceState === 'unknown' ? 'neutral' : 'warning',
      value: signals.maintenanceState === 'good' ? 'Good' :
             signals.maintenanceState === 'unknown' ? 'Unknown' : 'Needs attention'
    },
    {
      label: 'Usage intensity',
      status: 'neutral',
      value: 'Typical (estimated)'
    }
  ];
}

export function getOwnershipFooter(confidenceState: 'low' | 'medium' | 'high'): string {
  switch (confidenceState) {
    case 'high': return 'Most key ownership factors are documented for this system.';
    case 'medium': return 'Some factors are estimated due to limited data.';
    case 'low': return 'Several factors are currently estimated due to limited available data.';
  }
}

// ============== Smart Tips ==============

export interface SmartTips {
  header: string;
  items: string[];
  microcopy: string;
}

const TIPS_BY_CONTEXT: Record<string, Record<string, string[]>> = {
  south_florida: {
    summer: [
      'Change filters every 30–60 days during peak cooling season',
      'Keep vegetation at least 24" from the outdoor condenser',
      'Annual coil cleaning is especially important in humid climates'
    ],
    winter: [
      'Clear debris from outdoor unit before heating season',
      'Check thermostat battery before peak usage',
      'Schedule pre-season inspection if not done in fall'
    ],
    spring: [
      'Schedule annual tune-up before summer heat arrives',
      'Clean or replace filters after pollen season',
      'Check refrigerant levels before peak cooling demand'
    ],
    fall: [
      'Clear drain lines before humidity drops',
      'Test heating mode before cold fronts arrive',
      'This is the best time for annual inspections'
    ]
  },
  other: {
    summer: ['Change filters monthly during cooling season', 'Clear outdoor unit of debris', 'Monitor energy usage for anomalies'],
    winter: ['Test heating before cold weather', 'Check for unusual noises', 'Replace filters before heating season'],
    spring: ['Schedule annual tune-up', 'Replace filters after pollen season', 'Check condensate drain line'],
    fall: ['Prepare for heating season', 'Clear outdoor unit', 'Test heating system before cold']
  }
};

export function getSmartTips(context: SystemOptimizationSignals['tipsContext']): SmartTips {
  const tips = TIPS_BY_CONTEXT[context.climateRegion]?.[context.season] ||
               TIPS_BY_CONTEXT.other.summer;

  return {
    header: context.climateRegion === 'south_florida'
      ? 'Tips for South Florida homes'
      : 'Smart maintenance tips',
    items: tips,
    microcopy: 'Tips update based on season, climate, and system age.'
  };
}

// ============== Planning Copy ==============

export interface PlanningCopy {
  annualMaintenance: string;
  replacementCost: string;
  subtext: string;
}

export function getPlanningCopy(): PlanningCopy {
  return {
    annualMaintenance: '$150–$300',
    replacementCost: '$8k–$14k',
    subtext: 'Planning early helps avoid emergency replacements and peak-season pricing.'
  };
}
