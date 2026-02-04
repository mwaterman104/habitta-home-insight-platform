/**
 * Mobile Analytics Events
 * 
 * Tracking events for Home Pulse and System Plan flows.
 * Success ≠ clicks. Success = reduced confusion + increased planning confidence.
 */

export const MOBILE_EVENTS = {
  // Core funnel
  PRIMARY_FOCUS_IMPRESSION: 'mobile_primary_focus_impression',
  VIEW_PLAN_OPEN: 'mobile_view_plan_open',
  COST_SECTION_SCROLL: 'mobile_cost_section_scroll',
  WHAT_IF_WAIT_CLICK: 'mobile_what_if_wait_click',
  PLAN_EXIT_NO_ACTION: 'mobile_plan_exit_no_action',
  
  // Trust validation
  PRIMARY_FOCUS_CHANGED_SESSION: 'mobile_primary_focus_changed_same_session',
  
  // Engagement
  CHAT_QUICK_REPLY_USED: 'mobile_chat_quick_reply_used',
  MAINTENANCE_RECORD_ADDED: 'mobile_maintenance_record_added',
  START_PLANNING_CLICKED: 'mobile_start_planning_clicked',
} as const;

export type MobileEventName = typeof MOBILE_EVENTS[keyof typeof MOBILE_EVENTS];

/**
 * Session storage key for tracking primary focus changes
 */
const PRIMARY_FOCUS_SESSION_KEY = 'habitta_primary_focus_system';

/**
 * Track primary focus changes within a session
 * 
 * @returns true if primary focus changed since last check
 */
export function checkPrimaryFocusChanged(currentSystemKey: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const previousSystem = sessionStorage.getItem(PRIMARY_FOCUS_SESSION_KEY);
  const changed = previousSystem !== null && previousSystem !== currentSystemKey;
  
  // Update stored value
  sessionStorage.setItem(PRIMARY_FOCUS_SESSION_KEY, currentSystemKey);
  
  return changed;
}

/**
 * Simple analytics tracking function
 * Can be replaced with actual analytics provider
 */
export function trackMobileEvent(
  event: MobileEventName,
  properties?: Record<string, unknown>
): void {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Mobile Analytics]', event, properties);
  }
  
  // TODO: Connect to analytics provider (Amplitude, Mixpanel, etc.)
  // Example:
  // analytics.track(event, properties);
}
