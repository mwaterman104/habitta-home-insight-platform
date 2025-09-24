import { useState, useEffect } from 'react';
import { getPermits } from '@/lib/permitAPI';
import { analyzePermits, getSeasonalRecommendations, getCurrentSeason, PermitInsight } from '@/lib/permitAnalyzer';

interface PermitInsightsHook {
  insights: PermitInsight[];
  seasonalRecommendations: Array<{
    system: string;
    tip: string;
    urgency: 'low' | 'medium' | 'high';
    actionRequired: boolean;
    installationYear: number;
  }>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePermitInsights = (homeId?: string): PermitInsightsHook => {
  const [insights, setInsights] = useState<PermitInsight[]>([]);
  const [seasonalRecommendations, setSeasonalRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!homeId) {
      setInsights([]);
      setSeasonalRecommendations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const permits = await getPermits(homeId);
      const permitInsights = analyzePermits(permits);
      const currentSeason = getCurrentSeason();
      const seasonalRecs = getSeasonalRecommendations(permitInsights, currentSeason);

      setInsights(permitInsights);
      setSeasonalRecommendations(seasonalRecs);
    } catch (err: any) {
      console.error('Error fetching permit insights:', err);
      setError(err.message || 'Failed to fetch permit insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [homeId]);

  return {
    insights,
    seasonalRecommendations,
    loading,
    error,
    refetch: fetchInsights
  };
};