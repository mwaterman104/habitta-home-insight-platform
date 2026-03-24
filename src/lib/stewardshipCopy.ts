/**
 * Stewardship Cadence Copy Governance
 * 
 * All engagement cadence copy flows through this module.
 * Ensures validation language, not surveillance.
 * 
 * Core principle: Users return to confirm their position remains valid,
 * not to complete tasks.
 */

export type MonthlyResponse = 'nothing_changed' | 'system_replaced' | 'renovation' | 'insurance_update';

export interface StewardshipCopy {
  systemWatchHealthy: {
    headline: string;
    subtext: string;
    nextReviewText: (month: string) => string;
  };
  monthlyValidation: {
    headline: string;
    prompt: string;
    responses: Record<MonthlyResponse, string>;
    dismissText: string;
  };
  quarterlyPosition: {
    header: string;
    positionUnchanged: string;
    positionImproved: string;
    agingRateLabels: Record<'better' | 'average' | 'faster', string>;
  };
  healthCardHealthyMode: {
    ctaLabel: string;
    expandedHeader: string;
    passiveValidationLabel: string;
    notWorthThinkingLabel: string;
  };
  annualBrief: {
    header: string;
    filteredOutHeader: string;
    filteredOutFooter: string;
    accumulatedContextNote: string;
    sectionsLabels: {
      heldSteady: string;
      agedSlightly: string;
      filteredOut: string;
      confidenceTrajectory: string;
    };
  };
  optionalAdvantage: {
    dismissText: string;
    learnMoreText: string;
  };
}

/**
 * Get stewardship cadence copy
 * 
 * Terminology: "validated" replaces "watching/monitoring"
 * Bond mechanism: Accumulated context shown explicitly
 */
export function getStewardshipCopy(): StewardshipCopy {
  return {
    systemWatchHealthy: {
      headline: 'Baseline confirmed.',
      subtext: 'Your home\'s assumptions are validated against current conditions.',
      nextReviewText: (month) => `Next scheduled review: ${month}`,
    },
    monthlyValidation: {
      headline: 'This month\'s validation',
      prompt: 'Habitta\'s assumptions remain consistent. Has anything changed that we wouldn\'t see?',
      responses: {
        nothing_changed: 'Nothing changed',
        system_replaced: 'System replaced',
        renovation: 'Renovation',
        insurance_update: 'Insurance update',
      },
      dismissText: 'Skip this month',
    },
    quarterlyPosition: {
      header: 'Quarterly Home Position',
      positionUnchanged: 'Position unchanged this quarter.',
      positionImproved: 'Position improved this quarter.',
      agingRateLabels: {
        better: 'Aging slower than similar homes',
        average: 'Aging at typical rate',
        faster: 'Aging faster than similar homes',
      },
    },
    healthCardHealthyMode: {
      ctaLabel: 'What\'s Habitta validating right now?',
      expandedHeader: 'Active Validation',
      passiveValidationLabel: 'Systems under continuous validation',
      notWorthThinkingLabel: 'What is explicitly not worth thinking about',
    },
    annualBrief: {
      header: 'State of the Home',
      filteredOutHeader: 'What Habitta filtered out this year',
      filteredOutFooter: 'This accumulated context makes your baseline increasingly precise.',
      accumulatedContextNote: 'This history is unique to your home and would be expensive to recreate.',
      sectionsLabels: {
        heldSteady: 'What held steady',
        agedSlightly: 'What aged slightly',
        filteredOut: 'What Habitta filtered out',
        confidenceTrajectory: 'Confidence trajectory',
      },
    },
    optionalAdvantage: {
      dismissText: 'Dismiss',
      learnMoreText: 'Learn more',
    },
  };
}

/**
 * Get next scheduled review month name
 */
export function getNextReviewMonth(currentDate: Date = new Date()): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  // Next month
  const nextMonth = (currentDate.getMonth() + 1) % 12;
  return months[nextMonth];
}

/**
 * Get quarterly review month name
 */
export function getNextQuarterMonth(currentDate: Date = new Date()): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = currentDate.getMonth();
  // Next quarter start: Jan, Apr, Jul, Oct
  const quarterStarts = [0, 3, 6, 9];
  const nextQuarter = quarterStarts.find(q => q > currentMonth) ?? quarterStarts[0];
  return months[nextQuarter];
}
