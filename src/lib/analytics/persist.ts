import type { HabittaEvent } from './types';

/**
 * Event Persistence Stub
 * 
 * Intentionally disabled in Phase 1.
 * This prevents "just wiring it in early."
 * 
 * V2: Fire-and-forget to Supabase
 */
export async function persistEvent(_event: HabittaEvent): Promise<void> {
  // Disabled in Phase 1
  // 
  // V2 Implementation:
  // import { supabase } from '@/integrations/supabase/client';
  // 
  // supabase.from('analytics_events').insert({
  //   event_name: event.event_name,
  //   user_id: event.user_id,
  //   home_id: event.home_id,
  //   context: event.context,
  //   properties: event.properties,
  //   created_at: event.timestamp
  // }).then(() => {}).catch(() => {});
}
