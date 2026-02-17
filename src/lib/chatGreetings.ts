/**
 * Habitta Greeting Engine — Priority-Based Strategy Selector
 * 
 * Priority Hierarchy:
 * 1. The First Visit — Truly first page load (localStorage flag)
 * 2. The Follow-Up — Recent action detected (referrals, uploads)
 * 3. The Onboarding — New account (!lastTouchAt && strengthScore < 50)
 * 4. The Guardian — Systems in elevated or planning_window state
 * 5. The Historian — Real dormancy (daysSinceLastTouch != null && >= 30)
 * 6. The Builder — Record strength < 70% AND nextGain exists
 * 7. The Neighbor — Fallback for stable, well-documented homes
 */

import type { BaselineSystem } from '@/components/dashboard-v3/BaselineSurface';

/**
 * Greeting engine version — increment when templates or strategy logic changes.
 */
export const GREETING_ENGINE_VERSION = 4;

// ============================================
// Types
// ============================================

export type GreetingStrategy =
  | 'first_visit'
  | 'follow_up'
  | 'onboarding'
  | 'guardian'
  | 'historian'
  | 'builder'
  | 'neighbor';

export interface RecentAction {
  type: 'REFERRAL_SENT' | 'SYSTEM_ADDED' | 'PHOTO_UPLOAD';
  systemDisplayName?: string;
  meta?: { topProName?: string };
}

export interface HabittaGreetingContext {
  // Core signals
  strengthScore: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  totalSystemCount: number;

  // System state signals
  elevatedSystems: string[];
  planningWindowSystems: string[];

  // System names for onboarding template
  systemNames: string[];

  // Provenance-aware system data for onboarding
  permitVerifiedSystems: Array<{ name: string; installYear?: number | null }>;
  estimatedSystems: string[];

  // Growth signals
  nextGain?: {
    action: string;
    delta: number;
    systemKey?: string;
  } | null;

  // Recency signals — null means "no data / new account"
  daysSinceLastTouch: number | null;

  // Recent action tracking
  recentAction?: RecentAction;

  // Session management
  isFirstVisit: boolean;

  // Onboarding guard
  hasSeenOnboardingGreeting: boolean;
}

export interface HabittaGreetingResult {
  text: string;
  strategy: GreetingStrategy;
  starters: string[];
}

// ============================================
// LocalStorage Helpers
// ============================================

const ONBOARDING_GREETING_KEY = 'habitta_has_seen_onboarding_chat_greeting';

export function hasSeenOnboardingGreeting(): boolean {
  return localStorage.getItem(ONBOARDING_GREETING_KEY) === 'true';
}

export function markOnboardingGreetingShown(): void {
  localStorage.setItem(ONBOARDING_GREETING_KEY, 'true');
}

// ============================================
// Strategy Selector
// ============================================

export function determineGreetingStrategy(context: HabittaGreetingContext): GreetingStrategy {
  if (context.isFirstVisit) {
    return 'first_visit';
  }

  // Priority 2: Follow-up on recent high-intent action
  if (context.recentAction && context.daysSinceLastTouch !== null && context.daysSinceLastTouch < 3) {
    return 'follow_up';
  }

  // Priority 3: Onboarding — new account, low strength, not yet shown
  if (!context.hasSeenOnboardingGreeting && context.daysSinceLastTouch === null && context.strengthScore < 50) {
    return 'onboarding';
  }

  // Priority 4: System urgency (Guardian)
  if (context.elevatedSystems.length > 0 || context.planningWindowSystems.length > 0) {
    return 'guardian';
  }

  // Priority 5: Long dormancy (Historian) — only with REAL lastTouchAt
  if (context.daysSinceLastTouch !== null && context.daysSinceLastTouch >= 30) {
    return 'historian';
  }

  // Priority 6: Profile gaps with clear next action (Builder)
  if (context.strengthScore < 70 && context.nextGain) {
    return 'builder';
  }

  // Priority 7: Stable fallback (Neighbor)
  return 'neighbor';
}

// ============================================
// Template Library
// ============================================

type GreetingTemplate = (ctx: HabittaGreetingContext) => string;

function getPhotoAsk(systemName: string): string {
  const lower = systemName.toLowerCase();
  if (lower === 'roof' || lower.includes('roof')) {
    return 'a photo of your house with as much roof showing as possible';
  }
  return `a photo of the manufacturer label on your ${systemName}`;
}

function withRecordNudge(text: string, ctx: HabittaGreetingContext): string {
  if (ctx.strengthScore < 25) {
    return `${text} Your home record is at ${ctx.strengthScore}% — adding a few details would sharpen all my estimates.`;
  }
  return text;
}

const FIRST_VISIT_TEMPLATES: GreetingTemplate[] = [
  (ctx) => `Good ${ctx.timeOfDay}. I'm Habitta — I monitor your home's key systems and give you advance notice when something needs attention. I'm tracking ${ctx.totalSystemCount} ${ctx.totalSystemCount === 1 ? 'system' : 'systems'} for you and gathering baseline data right now. This means you'll get proactive alerts instead of emergency surprises.`,
  (ctx) => `Good ${ctx.timeOfDay} and welcome. I'm Habitta, your home's monitoring system. I've started tracking ${ctx.totalSystemCount} ${ctx.totalSystemCount === 1 ? 'system' : 'systems'} and I'm building a baseline so I can spot when things change. I'll surface anything that needs your attention — no guesswork required.`,
];

const FOLLOW_UP_TEMPLATES: GreetingTemplate[] = [
  (ctx) => {
    const system = ctx.recentAction?.systemDisplayName || 'that system';
    const pro = ctx.recentAction?.meta?.topProName;
    return `Good ${ctx.timeOfDay}. Did you get a chance to connect with ${pro || 'a specialist'} about your ${system}? I'm ready to update your record whenever you have news.`;
  },
  (ctx) => {
    const system = ctx.recentAction?.systemDisplayName || 'that system';
    const pro = ctx.recentAction?.meta?.topProName;
    return `Good ${ctx.timeOfDay}. Just checking in on those ${system} referrals${pro ? ` — did ${pro} work out` : ''}? Let me know and I'll log it to your timeline.`;
  },
  (ctx) => {
    const system = ctx.recentAction?.systemDisplayName || 'that system';
    return `Good ${ctx.timeOfDay}. I've been thinking about your ${system}. Any updates from the pros I found? I can keep looking if you need more options.`;
  },
];

const ONBOARDING_TEMPLATES: GreetingTemplate[] = [
  (ctx) => {
    // Template A: Has permit-verified systems — lead with the hook
    if (ctx.permitVerifiedSystems.length > 0) {
      const permit = ctx.permitVerifiedSystems[0];
      const yearStr = permit.installYear ? ` (installed ${permit.installYear})` : '';
      const blindSpots = ctx.estimatedSystems.length > 0
        ? ` To get a fuller picture, I need to see the things public records don't show. Have you replaced the ${ctx.estimatedSystems.slice(0, 2).join(' or ')} recently? A quick photo of those would let me start watching them for you — tracking their health and spotting maintenance needs before they become expensive surprises.`
        : ' Want to tell me about any systems you\'ve already replaced?';
      return `Good ${ctx.timeOfDay}! I've been digging through the public records for your home and I've already got a head start. I found a permit for your ${permit.name}${yearStr}, so I'm tracking its age and maintenance window automatically. That puts your record at ${ctx.strengthScore}%.${blindSpots}`;
    }
    // Template B: All estimated — be transparent about guesses
    const systemList = ctx.systemNames.length > 0 ? ctx.systemNames.join(', ') : `${ctx.totalSystemCount} systems`;
    const photoTarget = ctx.nextGain?.systemKey?.replace(/_/g, ' ') || ctx.systemNames[0] || 'your system';
    return `Good ${ctx.timeOfDay}! I've started building your home's record. From property data, I'm estimating ages for ${systemList} — but these are rough guesses based on your home's age. Your record is at ${ctx.strengthScore}%. The fastest way to sharpen everything is a quick photo of the manufacturer label on your ${photoTarget}. That gives me a real date to work with instead of an estimate. Want to start there, or tell me about any systems you've already replaced?`;
  },
];

const GUARDIAN_TEMPLATES: GreetingTemplate[] = [
  (ctx) => {
    const system = ctx.elevatedSystems[0] || ctx.planningWindowSystems[0];
    const base = `Good ${ctx.timeOfDay}. I've been tracking your ${system} — it's hitting the age where things usually get tricky. A quick ${getPhotoAsk(system)} would help me narrow down a cost estimate for you.`;
    return withRecordNudge(base, ctx);
  },
  (ctx) => {
    const system = ctx.elevatedSystems[0] || ctx.planningWindowSystems[0];
    const base = `Good ${ctx.timeOfDay}. Your ${system} is officially in its replacement window. I'd rather you plan for this than get surprised by it — want me to help you map out the next steps?`;
    return withRecordNudge(base, ctx);
  },
  (ctx) => {
    const system = ctx.elevatedSystems[0] || ctx.planningWindowSystems[0];
    const base = `Good ${ctx.timeOfDay}. I'm keeping a close eye on your ${system}. It's reached the point where reliability starts to drop, and I want to make sure you're not caught off guard.`;
    return withRecordNudge(base, ctx);
  },
];

const HISTORIAN_TEMPLATES: GreetingTemplate[] = [
  (ctx) => `Good ${ctx.timeOfDay}. Welcome back — I've been keeping watch while you were away. Your ${ctx.totalSystemCount} ${ctx.totalSystemCount === 1 ? 'system is' : 'systems are'} holding steady${ctx.planningWindowSystems.length > 0 ? `, though your ${ctx.planningWindowSystems[0]} is worth keeping an eye on` : ''}.`,
  (ctx) => `Good ${ctx.timeOfDay}. It's been a while! I haven't slept — I've kept your logs updated. Your home is still looking healthy${ctx.strengthScore < 50 ? `, though we could strengthen your record (currently at ${ctx.strengthScore}%)` : ''}.`,
  (ctx) => `Good ${ctx.timeOfDay}. Good to see you again. I've been monitoring your ${ctx.totalSystemCount} ${ctx.totalSystemCount === 1 ? 'system' : 'systems'} in the background. Nothing urgent, but I've got some updates if you're interested.`,
];

const BUILDER_TEMPLATES: GreetingTemplate[] = [
  (ctx) => {
    const systemKey = ctx.nextGain?.systemKey || 'your system';
    const delta = ctx.nextGain?.delta || 0;
    return `Good ${ctx.timeOfDay}. Your home record is at ${ctx.strengthScore}%. Snapping ${getPhotoAsk(systemKey)} would add +${delta} points and help me track it more accurately.`;
  },
  (ctx) => {
    const systemKey = ctx.nextGain?.systemKey || 'your system';
    const delta = ctx.nextGain?.delta || 0;
    return `Good ${ctx.timeOfDay}. I'm tracking your ${systemKey} based on permits, but ${getPhotoAsk(systemKey)} would make this record verified — that's +${delta} points toward a stronger profile.`;
  },
  (ctx) => {
    const systemKey = ctx.nextGain?.systemKey || 'your system';
    const delta = ctx.nextGain?.delta || 0;
    return `Good ${ctx.timeOfDay}. I want to move your record from where it is now to something stronger. Adding details for your ${systemKey} is the fastest way — +${delta} points in one step.`;
  },
];

const NEIGHBOR_TEMPLATES: GreetingTemplate[] = [
  (ctx) => `Good ${ctx.timeOfDay}. All quiet on the home front. Your ${ctx.totalSystemCount} ${ctx.totalSystemCount === 1 ? 'system is' : 'systems are'} stable and your record is established. I'll let you know the second that changes.`,
  (ctx) => `Good ${ctx.timeOfDay}. Your home is looking healthy and verified. I'm standing by if you need to plan a project or check a timeline.`,
  (ctx) => `Good ${ctx.timeOfDay}. Everything is green — your systems are stable and maintenance is on track. Enjoy the peace of mind.`,
];

const STRATEGY_TEMPLATES: Record<GreetingStrategy, GreetingTemplate[]> = {
  first_visit: FIRST_VISIT_TEMPLATES,
  follow_up: FOLLOW_UP_TEMPLATES,
  onboarding: ONBOARDING_TEMPLATES,
  guardian: GUARDIAN_TEMPLATES,
  historian: HISTORIAN_TEMPLATES,
  builder: BUILDER_TEMPLATES,
  neighbor: NEIGHBOR_TEMPLATES,
};

// ============================================
// Conversation Starters Per Strategy
// ============================================

function getStartersForStrategy(strategy: GreetingStrategy, ctx: HabittaGreetingContext): string[] {
  switch (strategy) {
    case 'first_visit':
      return ['What are you tracking?', 'How does this work?'];

    case 'follow_up':
      return [
        ctx.recentAction?.meta?.topProName ? `I called ${ctx.recentAction.meta.topProName}` : 'I called them',
        'Not yet',
        'Find more options',
      ];

    case 'onboarding':
      return [
        'I replaced something recently',
        'Take a photo',
        'What did you find in records?',
      ];

    case 'guardian': {
      const system = ctx.elevatedSystems[0] || ctx.planningWindowSystems[0];
      return [
        'Show me options',
        system ? `Why is my ${system} flagged?` : 'Why is it flagged?',
        'I already replaced it',
      ];
    }

    case 'historian':
      return ['What changed while I was away?', 'Show me my timeline'];

    case 'builder':
      return [
        'How do I add details?',
        'What else can I add?',
      ];

    case 'neighbor':
      return [];

    default:
      return [];
  }
}

// ============================================
// Main Greeting Generator
// ============================================

export function generateHabittaBlurb(context: HabittaGreetingContext): HabittaGreetingResult {
  const strategy = determineGreetingStrategy(context);
  const templates = STRATEGY_TEMPLATES[strategy];

  const index = Math.floor(Math.random() * templates.length);
  const text = templates[index](context);

  return {
    text,
    strategy,
    starters: getStartersForStrategy(strategy, context),
  };
}

// ============================================
// Helper Functions
// ============================================

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Calculate days since a given date. Returns null if input is null/undefined.
 */
export function calculateDaysSince(lastDate?: string | Date | null): number | null {
  if (!lastDate) return null;
  const last = new Date(lastDate);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Build a HabittaGreetingContext from ChatConsole-level props.
 */
export function buildGreetingContext(params: {
  baselineSystems: BaselineSystem[];
  isFirstVisit: boolean;
  strengthScore?: number;
  nextGain?: { action: string; delta: number; systemKey?: string } | null;
  daysSinceLastTouch?: number | null;
  recentAction?: RecentAction;
  hasSeenOnboardingGreeting?: boolean;
}): HabittaGreetingContext {
  const {
    baselineSystems,
    isFirstVisit,
    strengthScore = 0,
    nextGain,
    daysSinceLastTouch = null,
    recentAction,
    hasSeenOnboardingGreeting: seenOnboarding = false,
  } = params;

  const elevatedSystems = baselineSystems
    .filter(s => s.state === 'elevated')
    .map(s => s.displayName);

  const planningWindowSystems = baselineSystems
    .filter(s => s.state === 'planning_window')
    .map(s => s.displayName);

  const systemNames = baselineSystems.map(s => s.displayName);

  const permitVerifiedSystems = baselineSystems
    .filter(s => s.installSource === 'permit')
    .map(s => ({ name: s.displayName, installYear: s.installYear }));

  const estimatedSystems = baselineSystems
    .filter(s => s.installSource !== 'permit')
    .map(s => s.displayName);

  return {
    strengthScore,
    timeOfDay: getTimeOfDay(),
    totalSystemCount: baselineSystems.length,
    elevatedSystems,
    planningWindowSystems,
    systemNames,
    permitVerifiedSystems,
    estimatedSystems,
    nextGain,
    daysSinceLastTouch: daysSinceLastTouch ?? null,
    recentAction,
    isFirstVisit,
    hasSeenOnboardingGreeting: seenOnboarding,
  };
}

// ============================================
// Legacy Drop-in
// ============================================

export function generatePersonalBlurb(
  systems: BaselineSystem[],
  isFirstVisitFlag: boolean = false,
): string {
  const context = buildGreetingContext({
    baselineSystems: systems,
    isFirstVisit: isFirstVisitFlag,
  });

  return generateHabittaBlurb(context).text;
}
