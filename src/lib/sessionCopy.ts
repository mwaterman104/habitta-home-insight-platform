/**
 * SESSION COPY TEMPLATES
 * 
 * Institutional language for Planning Sessions.
 * Uses "briefing" language, NOT "monitoring" language.
 * 
 * ❌ "Good morning! I've been monitoring your home systems..."
 * ✅ "I've completed a review of your water heater and need to brief you."
 */

import type { TriggerReason } from '@/types/intervention';

/**
 * Opening lines for Planning Sessions based on trigger reason
 */
export const sessionOpenings: Record<TriggerReason, (systemName: string, eventName?: string) => string> = {
  risk_threshold_crossed: (systemName: string) => 
    `I've completed a review of your ${systemName} and need to brief you.`,
  
  seasonal_risk_event: (systemName: string, eventName?: string) => 
    `Given the ${eventName ?? 'current conditions'}, I need to discuss your ${systemName} with you.`,
  
  financial_planning_window: (systemName: string) => 
    `It's time to plan for your ${systemName} replacement.`,
  
  user_initiated: (systemName: string) => 
    `Let's review your ${systemName} together.`,
  
  new_evidence_arrived: (systemName: string) => 
    `New information about your ${systemName} warrants a conversation.`,
};

/**
 * Get the opening line for a Planning Session
 */
export function getSessionOpening(
  triggerReason: TriggerReason,
  systemName: string,
  eventName?: string
): string {
  const generator = sessionOpenings[triggerReason];
  return generator(systemName, eventName);
}

/**
 * Dashboard badge language
 * 
 * ❌ "Attention needed", "Action required", "Alert"
 * ✅ "Review available", "Briefing ready", "Planning session prepared"
 */
export const dashboardBadges = {
  interventionAvailable: 'Review available',
  briefingReady: 'Briefing ready',
  planningPrepared: 'Planning session prepared',
} as const;

/**
 * Decision confirmation messages
 */
export const decisionConfirmations = {
  replace_now: (systemName: string) => 
    `Understood. I've recorded your decision to replace the ${systemName}. I'll request verification once the work is complete.`,
  
  defer_with_date: (systemName: string, deferDate: string) => 
    `Noted. I'll bring this back to your attention around ${deferDate}.`,
  
  schedule_inspection: (systemName: string) => 
    `I'll note that you're scheduling an inspection for the ${systemName}.`,
  
  schedule_maintenance: (systemName: string) => 
    `Maintenance scheduled for the ${systemName}. I'll track completion.`,
  
  no_action: (systemName: string) => 
    `Understood. I'll continue observing the ${systemName} and will return if conditions change.`,
  
  get_quotes: (systemName: string) => 
    `Getting quotes for ${systemName} replacement. Let me know what you learn.`,
} as const;

/**
 * Session close messages
 */
export const sessionCloseMessages = {
  decision_made: 'This planning session is now complete.',
  user_deferred: "This session has been deferred. I'll follow up as scheduled.",
  closed_without_decision: 'Session closed. This topic will remain available if you want to revisit it.',
  timed_out: 'This session has expired. If conditions warrant, I may bring this back to your attention.',
} as const;

/**
 * Error messages (institution-grade: honest, not comforting)
 */
export const errorMessages = {
  saveFailed: 'Unable to record your decision. Please try again.',
  sessionLoadFailed: 'Unable to load the planning session. Please refresh.',
  networkError: 'Connection issue. Your decision was not saved.',
} as const;
