import { useState, useEffect, useCallback } from "react";
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
 * Retry helper with exponential backoff
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      // Only retry on network/timeout errors, not on auth or validation errors
      const isRetryable = 
        err.message?.includes('Network') ||
        err.message?.includes('timeout') ||
        err.message?.includes('non-2xx') ||
        err.name === 'FunctionsHttpError';
      
      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

/**
 * useCapitalTimeline - Fetches the capital timeline for a home
 * 
 * Calls the capital-timeline edge function and returns the full
 * HomeCapitalTimeline with all systems and capital outlook.
 * 
 * Includes retry logic for transient network failures.
 */
export function useCapitalTimeline({ homeId, enabled = true }: UseCapitalTimelineOptions): UseCapitalTimelineResult {
  const [timeline, setTimeline] = useState<HomeCapitalTimeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!homeId || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchWithRetry(async () => {
        const { data, error: fnError } = await supabase.functions.invoke('capital-timeline', {
          body: { action: 'timeline', homeId }
        });

        if (fnError) throw fnError;
        return data;
      });

      if (data) {
        setTimeline(data as HomeCapitalTimeline);
      }
    } catch (err: any) {
      console.error('[useCapitalTimeline] Error:', err);
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [homeId, enabled]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return {
    timeline,
    loading,
    error,
    refetch: fetchTimeline,
  };
}
