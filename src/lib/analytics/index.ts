/**
 * Habitta Analytics - Core Dispatcher
 * 
 * Single entry point for all analytics events.
 * 
 * Guardrails:
 * - No track() calls from outside this module
 * - No conditional logic inside dispatcher
 * - No awaiting network calls
 * - Fire-and-forget only
 */

import { getSessionId } from './session';
import type { HabittaEvent, EventContext, AnalyticsSurface } from './types';

// Re-export types
export type { HabittaEvent, EventContext, AnalyticsSurface } from './types';
export { getSessionId, clearSession } from './session';

/**
 * Track an analytics event
 * 
 * @param event_name - Event name following schema (verbs only)
 * @param properties - Event-specific properties
 * @param contextOverrides - Optional context overrides
 */
export function track(
  event_name: string,
  properties: Record<string, unknown> = {},
  contextOverrides: Partial<Omit<EventContext, 'session_id'>> = {}
): void {
  const event: HabittaEvent = {
    event_name,
    timestamp: new Date().toISOString(),
    context: {
      surface: contextOverrides.surface ?? 'dashboard',
      system_slug: contextOverrides.system_slug,
      session_id: getSessionId()
    },
    properties
  };

  // Phase 1: Console only (dev visibility)
  if (import.meta.env.DEV) {
    console.debug('[Habitta Event]', event);
  }

  // Phase 2+: Supabase persistence (disabled)
  // persistEvent(event);
}

/**
 * Track with user/home context
 * 
 * Use this when you have access to user and home IDs
 */
export function trackWithContext(
  event_name: string,
  userId: string | undefined,
  homeId: string | undefined,
  properties: Record<string, unknown> = {},
  contextOverrides: Partial<Omit<EventContext, 'session_id'>> = {}
): void {
  const event: HabittaEvent = {
    event_name,
    user_id: userId,
    home_id: homeId,
    timestamp: new Date().toISOString(),
    context: {
      surface: contextOverrides.surface ?? 'dashboard',
      system_slug: contextOverrides.system_slug,
      session_id: getSessionId()
    },
    properties
  };

  // Phase 1: Console only (dev visibility)
  if (import.meta.env.DEV) {
    console.debug('[Habitta Event]', event);
  }

  // Phase 2+: Supabase persistence (disabled)
  // persistEvent(event);
}
