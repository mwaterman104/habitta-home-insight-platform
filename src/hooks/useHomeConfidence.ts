/**
 * useHomeConfidence — Data fetching hook for Home Confidence
 * 
 * Fetches from existing tables (systems, home_assets, home_events, homes),
 * computes confidence score and recommendations.
 * Manages localStorage dismissal state.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { computeHomeConfidence, type HomeConfidenceResult, type HomeAssetRecord, type HomeEventRecord } from '@/services/homeConfidence';
import { generateRecommendations, type Recommendation } from '@/services/recommendationEngine';
import type { SystemTimelineEntry } from '@/types/capitalTimeline';

const DISMISSED_STORAGE_KEY = 'habitta_dismissed_recommendations';

function getDismissedIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDismissedIds(ids: string[]) {
  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Silent failure
  }
}

interface UseHomeConfidenceReturn {
  confidence: HomeConfidenceResult | null;
  recommendations: Recommendation[];
  dismissRecommendation: (id: string) => void;
  loading: boolean;
  /** Last user interaction timestamp (most recent home_assets/home_events update) */
  lastTouchAt: Date | null;
}

export function useHomeConfidence(
  homeId: string | undefined,
  systems: SystemTimelineEntry[],
  yearBuilt?: number | null
): UseHomeConfidenceReturn {
  const [homeAssets, setHomeAssets] = useState<HomeAssetRecord[]>([]);
  const [homeEvents, setHomeEvents] = useState<HomeEventRecord[]>([]);
  const [lastTouchAt, setLastTouchAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds);

  // Fetch home_assets and home_events
  useEffect(() => {
    if (!homeId) {
      setHomeAssets([]);
      setHomeEvents([]);
      setLastTouchAt(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [assetsRes, eventsRes] = await Promise.all([
          supabase
            .from('home_assets')
            .select('id, kind, serial, metadata, status, updated_at')
            .eq('home_id', homeId!)
            .eq('status', 'active'),
          supabase
            .from('home_events')
            .select('id, event_type, title, description, source, status, severity, metadata, asset_id, home_id, created_at')
            .eq('home_id', homeId!)
            .order('created_at', { ascending: false })
            .limit(100),
        ]);

        if (cancelled) return;

        const assets: HomeAssetRecord[] = (assetsRes.data || []).map(a => ({
          id: a.id,
          kind: a.kind,
          serial: a.serial,
          metadata: (a.metadata as Record<string, unknown>) || {},
          status: a.status,
          updated_at: a.updated_at,
        }));

        const events: HomeEventRecord[] = (eventsRes.data || []).map(e => ({
          id: e.id,
          event_type: e.event_type,
          title: e.title,
          description: e.description,
          source: e.source,
          status: e.status,
          severity: e.severity,
          metadata: (e.metadata as Record<string, unknown>) || {},
          asset_id: e.asset_id,
          home_id: e.home_id,
          created_at: e.created_at,
        }));

        setHomeAssets(assets);
        setHomeEvents(events);

        // Compute last_user_touch_at
        const timestamps: number[] = [];
        for (const e of events) timestamps.push(new Date(e.created_at).getTime());
        for (const a of assets) timestamps.push(new Date(a.updated_at).getTime());
        setLastTouchAt(timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null);
      } catch (err) {
        console.error('[useHomeConfidence] Fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [homeId]);

  // Compute confidence
  const confidence = useMemo(() => {
    if (!homeId || loading) return null;
    return computeHomeConfidence(systems, homeAssets, homeEvents, lastTouchAt, yearBuilt);
  }, [systems, homeAssets, homeEvents, lastTouchAt, homeId, loading, yearBuilt]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    if (!homeId || loading) return [];
    return generateRecommendations(systems, homeAssets, homeEvents, dismissedIds, lastTouchAt, yearBuilt);
  }, [systems, homeAssets, homeEvents, dismissedIds, lastTouchAt, homeId, loading, yearBuilt]);

  // Dismiss handler
  const dismissRecommendation = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = [...prev, id];
      saveDismissedIds(next);
      return next;
    });
  }, []);

  return { confidence, recommendations, dismissRecommendation, loading, lastTouchAt };
}
