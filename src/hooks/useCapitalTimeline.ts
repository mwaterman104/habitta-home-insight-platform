import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";

interface UseCapitalTimelineOptions {
  homeId: string | undefined;
  enabled?: boolean;
}

interface UseCapitalTimelineResult {
  timeline: HomeCapitalTimeline | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * useCapitalTimeline - Fetches the capital timeline for a home
 * 
 * Calls the capital-timeline edge function and returns the full
 * HomeCapitalTimeline with all systems and capital outlook.
 */
export function useCapitalTimeline({ homeId, enabled = true }: UseCapitalTimelineOptions): UseCapitalTimelineResult {
  const [timeline, setTimeline] = useState<HomeCapitalTimeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async () => {
    if (!homeId || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('capital-timeline', {
        body: { action: 'timeline', homeId }
      });

      if (fnError) throw fnError;
      if (data) {
        setTimeline(data as HomeCapitalTimeline);
      }
    } catch (err: any) {
      console.error('[useCapitalTimeline] Error:', err);
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [homeId, enabled]);

  return {
    timeline,
    loading,
    error,
    refetch: fetchTimeline,
  };
}
