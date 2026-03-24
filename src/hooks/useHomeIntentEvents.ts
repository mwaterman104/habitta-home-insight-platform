import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IntentEvent {
  id: string;
  home_id: string;
  intent_category: 'repair' | 'replace' | 'upgrade' | 'inspect' | 'diy_project';
  system_type: string;
  symptom_summary?: string;
  severity: 'urgent' | 'moderate' | 'low';
  pro_flag: boolean;
  lead_value_score?: number;
  created_at: string;
}

interface UseHomeIntentEventsReturn {
  events: IntentEvent[];
  loading: boolean;
  hasRecentEvents: boolean;
}

export function useHomeIntentEvents(homeId: string | undefined): UseHomeIntentEventsReturn {
  const [events, setEvents] = useState<IntentEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!homeId) return;

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from('home_intent_events')
          .select('*')
          .eq('home_id', homeId)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('[useHomeIntentEvents] Error fetching intent events:', error);
          return;
        }

        setEvents((data || []) as IntentEvent[]);
      } catch (err) {
        console.error('[useHomeIntentEvents] Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [homeId]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const hasRecentEvents = events.some(
    e => new Date(e.created_at) > sevenDaysAgo
  );

  return { events, loading, hasRecentEvents };
}
