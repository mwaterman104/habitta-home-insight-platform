/**
 * Mobile Copy Constants
 * 
 * Centralized copy for mobile Home Pulse and System Plan views.
 * All mobile UI copy flows through this file.
 * 
 * GOVERNANCE:
 * - No hardcoded strings in components
 * - Banned phrases are enforced at review time
 * - Status copy is deterministic from system state
 */

// ============== Banned Phrases ==============

/**
 * Phrases that must NEVER appear in mobile UI
 * These create passive, unhelpful experiences
 */
export const BANNED_PHRASES = [
  "Everything is normal",
  "Let me know if",
  "What should I do?",
  "I'm not sure",
  "Unknown",
] as const;

// ============== Status Copy Patterns ==============

export type StatusLevel = 'elevated' | 'planning_window' | 'stable' | 'aging';

/**
 * Now/Next/Later copy for Home Status Summary
 * 
 * Now: Current state interpretation
 * Next: Actionable recommendation
 * Later: Reassurance for remaining systems
 */
export const STATUS_COPY = {
  now: {
    elevated: (name: string) => `Your ${name} may need attention soon.`,
    planning_window: (name: string) => `Your ${name} is approaching typical replacement age.`,
    stable: () => "Your home is operating normally.",
    aging: (name: string) => `Your ${name} is past its expected lifespan.`,
  },
  next: {
    elevated: (name: string) => `Schedule an assessment for your ${name}.`,
    planning_window: (name: string) => `Plan for ${name} review in the next 12 months.`,
    stable: () => "No immediate action required.",
    aging: (name: string) => `Consider a ${name} evaluation soon.`,
  },
  later: (count: number) =>
    count === 0
      ? ""
      : count === 1
        ? "1 other system is stable."
        : `${count} other systems are stable.`,
} as const;

// ============== Secondary System Status Labels ==============

/**
 * Single-line status labels for secondary systems list
 * 
 * Critical Guardrail: Systems past expected lifespan may NEVER be labeled "Stable"
 */
export const SECONDARY_STATUS = {
  stable: "No action recommended",
  watch: "Monitoring, no action needed yet",
  plan: "Review recommended when ready",
  aging: "Aging — monitoring",
} as const;

// ============== Status Level Derivation ==============

/**
 * Derive status level from lifecycle position
 * 
 * @param lifecyclePercent - 0-100+ (can exceed 100 if past lifespan)
 * @param age - Current system age in years
 * @param expectedLifespan - Expected lifespan in years
 */
export function deriveStatusLevel(
  lifecyclePercent: number,
  age: number | null,
  expectedLifespan: number
): StatusLevel {
  // Critical guardrail: Past lifespan = never "Stable"
  if (age !== null && age >= expectedLifespan) {
    return 'aging';
  }
  
  if (lifecyclePercent >= 100) return 'aging';
  if (lifecyclePercent >= 80) return 'elevated';
  if (lifecyclePercent >= 60) return 'planning_window';
  return 'stable';
}

// ============== Planning Status Badges ==============

export const PLANNING_STATUS = {
  stable: { text: 'Stable', colorClass: 'text-emerald-600' },
  watch: { text: 'Watch', colorClass: 'text-amber-500' },
  plan: { text: 'Plan', colorClass: 'text-amber-600' },
  aging: { text: 'Aging', colorClass: 'text-orange-600' },
} as const;

/**
 * Get planning status from remaining years
 * 
 * @param remainingYears - Years until expected replacement
 * @param age - System age
 * @param expectedLifespan - Expected lifespan
 */
export function getPlanningStatus(
  remainingYears: number | null,
  age: number | null,
  expectedLifespan: number
): keyof typeof PLANNING_STATUS {
  // Critical guardrail: Past lifespan = "aging"
  if (age !== null && age >= expectedLifespan) {
    return 'aging';
  }
  
  if (remainingYears === null || remainingYears > 5) return 'stable';
  if (remainingYears <= 0) return 'aging';
  if (remainingYears <= 2) return 'plan';
  return 'watch';
}

// ============== Install Source Labels ==============

export const INSTALL_SOURCE_LABELS = {
  permit: 'Permit verified',
  inferred: 'Estimated',
  unknown: 'Estimated',
  user_reported: 'Owner reported',
} as const;

export function getInstallSourceLabel(source: string | undefined): string {
  if (!source) return INSTALL_SOURCE_LABELS.unknown;
  return INSTALL_SOURCE_LABELS[source as keyof typeof INSTALL_SOURCE_LABELS] 
    ?? INSTALL_SOURCE_LABELS.unknown;
}

// ============== Quick Replies (Frozen Set) ==============

export const CHAT_QUICK_REPLIES = [
  "Show timing tradeoffs",
  "Show cost scenarios",
  "Why this system first?",
] as const;

// ============== Chat First-Turn Templates ==============

/**
 * First-turn assistant messages for action-initiated chat.
 * These are NOT priming — they are the first sentence of a conversation.
 * No guards, no refs, no context checks. Injected once on open.
 */
export const CHAT_FIRST_TURN = {
  /** Planning-initiated chat (from "Start planning this replacement") */
  systemPlanning: (systemName: string) =>
    `Let's start planning for your ${systemName}. Based on the cost and timing outlook above, what would you like to focus on first — timing, budget, or contractor options?`,

  /** Replacement planning CTA (from banner or at-risk card action) */
  replacementPlanning: (systemName: string) =>
    `Your ${systemName} is entering its replacement window. Would you like to focus on timing, budget, or finding a contractor?`,

  /** Log service CTA (from healthy card action) */
  logService: (systemName: string) =>
    `What maintenance or service was done on your ${systemName}? I'll add it to your home's permanent record.`,

  /** Upload photo CTA */
  uploadPhoto: () =>
    `Upload a photo of the system label or the area of concern, and I'll analyze what I see.`,

  /** Upload document CTA */
  uploadDoc: () =>
    `What kind of document do you have? A receipt, inspection report, warranty, or permit?`,

  /** Confidence boost CTA (from contextual chat prompt) */
  confidenceBoost: (systemName: string) =>
    `I see we're working with limited data on your ${systemName}. A photo of the manufacturer label would help me pinpoint the exact maintenance schedule.`,
} as const;

// ============== Chat Priming Templates ==============

/**
 * Contextual priming messages for chat
 * Invites diagnosis and observation, not generic questions
 */
export const CHAT_PRIMING = {
  /**
   * System Plan screen priming
   * Invites diagnosis, not generic questions
   */
  systemPlan: (systemLabel: string, installYear?: number) => {
    const ageContext = installYear 
      ? ` installed around ${installYear}` 
      : '';
    return `You're looking at your ${systemLabel}${ageContext}. What are you noticing?`;
  },
  
  /**
   * General priming (no system context)
   */
  general: () => "How can I help you understand your home better?",
} as const;

// ============== View Plan Copy ==============

export const PLAN_COPY = {
  costTiers: {
    planned: {
      label: 'Planned replacement',
      definition: 'Scheduled in advance with flexibility',
    },
    // "typical" tier removed — QA FIX #3: avoid "Planned" vs "Typical" UI confusion
    emergency: {
      label: 'Emergency replacement',
      definition: 'Post-failure, high urgency',
    },
  },
  timingOutlook: {
    best: 'Best window',
    caution: 'Caution window',
    highRisk: 'High risk',
  },
  confidenceLevels: {
    high: 'High',
    moderate: 'Moderate',
    low: 'Low',
  },
  actions: {
    primary: 'Start planning this replacement',
    secondary: 'Add maintenance record',
  },
} as const;

// ============== System Display Names ==============

export const SYSTEM_DISPLAY_NAMES: Record<string, string> = {
  hvac: 'HVAC System',
  roof: 'Roof',
  water_heater: 'Water Heater',
  electrical_panel: 'Electrical Panel',
  plumbing: 'Plumbing',
  pool: 'Pool Equipment',
  solar: 'Solar Panels',
  mini_split: 'Mini-Split',
};

export function getSystemDisplayName(systemKey: string): string {
  return SYSTEM_DISPLAY_NAMES[systemKey] ?? systemKey;
}

// ============== Home Pulse v1 Copy ==============

/** @deprecated Kept for SystemTileScroll; hero now uses HOME_CONFIDENCE_COPY */
export const HOME_OUTLOOK_COPY = {
  label: 'Home outlook',
  subtext: 'Until a major system replacement is likely',
} as const;

export const SINCE_LAST_MONTH_HEADER = 'Since last month';
export const SINCE_LAST_MONTH_EMPTY = 'No meaningful changes this period';

export const ASSESSMENT_QUALITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const ASSESSMENT_QUALITY_PREFIX = 'Assessment quality';

/** Locked separator for micro-summary (Adjustment 3) */
export const MICRO_SUMMARY_SEPARATOR = ' · ';

// ============== Tier-Aware Late-Life Copy ==============

export const LATE_LIFE_COPY = {
  routineReplacement: {
    primary: 'At end of expected life',
    secondary: 'Typically replaced as needed',
  },
  planningCritical: {
    primary: 'Inside planning window',
    secondary: 'Replacement likely soon',
  },
} as const;

/** @deprecated Replaced by HOME_CONFIDENCE_COPY state meanings */
export const HOME_OUTLOOK_CLARIFIER = 'Reflects planning-critical systems only';

export const REPLACEMENT_WINDOW_PREFIX = 'Replacement window';

// ============== Home Confidence Copy (v2) ==============

export const HOME_CONFIDENCE_COPY = {
  label: 'Home Confidence',
  indexPrefix: 'Confidence index',
  states: {
    solid: { label: 'Solid', meaning: 'Most systems are understood and tracked' },
    developing: { label: 'Developing', meaning: 'Key gaps exist, but nothing critical is hidden' },
    unclear: { label: 'Unclear', meaning: 'Too many unknowns to plan confidently' },
    'at-risk': { label: 'At Risk', meaning: 'Major systems lack basic information' },
  },
} as const;

export const RECOMMENDATION_COPY = {
  sectionHeader: 'Recommended',
} as const;

// ============== Recommendation Chat Openers (v2) ==============

/**
 * Contextual assistant greetings when a recommendation card opens the chat.
 * Copy guardrail: use "can improve" / "helps increase", never "will increase."
 */
export const RECOMMENDATION_CHAT_OPENERS: Record<string, (systemName: string, delta: number) => string> = {
  upload_photo: (name, delta) =>
    `Let's get a photo of your ${name}. A clear shot of the label or front helps verify the model and condition, and can improve your confidence score by +${delta}.`,
  add_year: (name) =>
    `Do you know when your ${name} was installed? Even a rough range like "5–10 years ago" helps plan more accurately.`,
  upload_doc: (name) =>
    `If you have a permit or invoice for your ${name}, a quick photo of it gives verified data to work with.`,
  add_serial: (name) =>
    `Do you have access to the serial or model number on your ${name}? It's usually on a label or sticker on the unit.`,
  confirm_material: (name) =>
    `What material is your ${name}? Knowing this helps estimate remaining life more accurately.`,
  log_maintenance: (name) =>
    `Has your ${name} been serviced recently? If you remember the last time, I'll add it to your home's record.`,
  acknowledge: (name) =>
    `Your ${name} is in its late-life window. Have you started thinking about replacement timing or budget?`,
  review_freshness: () =>
    `It's been a while since your home records were updated. Anything changed recently — maintenance, repairs, or new equipment?`,
};
