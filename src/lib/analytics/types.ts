/**
 * Habitta Analytics - Canonical Event Types
 * 
 * All events follow this shape. No optional shortcuts.
 * No component-level overrides.
 */

export interface HabittaEvent {
  event_name: string;
  user_id?: string;
  home_id?: string;
  timestamp: string;
  context: EventContext;
  properties: Record<string, unknown>;
}

export interface EventContext {
  surface:
    | 'dashboard'
    | 'systems'
    | 'system_detail'
    | 'chat'
    | 'maintenance'
    | 'financial'
    | 'context_rail';
  system_slug?: string;
  session_id: string;
}

/**
 * Surface definitions for analytics context
 */
export type AnalyticsSurface = EventContext['surface'];
