/**
 * Habitta Analytics - Lightweight Instrumentation
 * 
 * @deprecated Use `import { track } from '@/lib/analytics'` for new events.
 * Legacy functions below are kept for backward compatibility.
 * 
 * V1: Console logging (dev visibility)
 * V2: Pipe to PostHog/Mixpanel/Supabase when needed
 */

import type { NarrativePriority } from './narrativePriority';
import type { AdvisorState } from '@/types/advisorState';

// Re-export new analytics module
export { track, trackWithContext, getSessionId } from './analytics/index';
export type { HabittaEvent, EventContext, AnalyticsSurface } from './analytics/types';

export type AnalyticsEvent =
  | { type: 'brief_viewed'; narrativePriority: NarrativePriority; dominantSystem?: string }
  | { type: 'brief_recommendation_clicked'; actionLabel: string; system?: string }
  | { type: 'confidence_correction_started'; system: string; previousConfidence: number }
  | { type: 'confidence_correction_completed'; system: string; newConfidence: number }
  | { type: 'advisor_engaged'; trigger: string; system?: string }
  | { type: 'advisor_decision_reached'; decisionId: string }
  | { type: 'advisor_dismissed'; fromState: AdvisorState }
  | { type: 'scroll_depth'; percentage: number; reachedChatDock: boolean }
  | { type: 'session_duration'; seconds: number; statesVisited: AdvisorState[] }
  | { type: 'system_card_clicked'; systemKey: string }
  | { type: 'health_score_cta_clicked'; score: number };

/**
 * Track an analytics event
 * 
 * V1: Console logging for development visibility
 * Future: Fire-and-forget to Supabase analytics_events table
 */
export function trackEvent(event: AnalyticsEvent): void {
  // V1: Console logging (dev visibility)
  if (import.meta.env.DEV) {
    console.log('[Habitta Analytics]', event.type, event);
  }
  
  // V2: Fire-and-forget to Supabase (future implementation)
  // supabase.from('analytics_events').insert({
  //   event_type: event.type,
  //   payload: event,
  //   created_at: new Date().toISOString()
  // });
}

/**
 * Track brief view with narrative context
 */
export function trackBriefView(priority: NarrativePriority, dominantSystem?: string): void {
  trackEvent({
    type: 'brief_viewed',
    narrativePriority: priority,
    dominantSystem
  });
}

/**
 * Track recommendation click-through
 */
export function trackRecommendationClick(actionLabel: string, system?: string): void {
  trackEvent({
    type: 'brief_recommendation_clicked',
    actionLabel,
    system
  });
}

/**
 * Track advisor state engagement
 */
export function trackAdvisorEngaged(trigger: string, system?: string): void {
  trackEvent({
    type: 'advisor_engaged',
    trigger,
    system
  });
}

/**
 * Track advisor dismissal
 */
export function trackAdvisorDismissed(fromState: AdvisorState): void {
  trackEvent({
    type: 'advisor_dismissed',
    fromState
  });
}

/**
 * Track scroll depth in middle column
 */
export function trackScrollDepth(percentage: number, reachedChatDock: boolean): void {
  trackEvent({
    type: 'scroll_depth',
    percentage,
    reachedChatDock
  });
}

/**
 * Track system card interaction
 */
export function trackSystemCardClick(systemKey: string): void {
  trackEvent({
    type: 'system_card_clicked',
    systemKey
  });
}

/**
 * Track health score CTA click
 */
export function trackHealthScoreCTAClick(score: number): void {
  trackEvent({
    type: 'health_score_cta_clicked',
    score
  });
}
