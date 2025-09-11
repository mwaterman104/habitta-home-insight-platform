import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SmartRecommendation {
  id: string;
  property_id: string;
  system_lifecycle_id?: string;
  recommendation_type: string;
  title: string;
  description?: string;
  urgency_score: number;
  estimated_cost_min?: number;
  estimated_cost_max?: number;
  estimated_time_hours?: number;
  seasonal_timing?: string;
  weather_dependent: boolean;
  diy_difficulty: string;
  roi_potential?: number;
  energy_savings_potential?: number;
  triggers: any;
  valid_until?: string;
  is_completed: boolean;
  created_at: string;
}

interface RecommendationData {
  recommendations: SmartRecommendation[];
  weatherTriggered: SmartRecommendation[];
  seasonal: SmartRecommendation[];
  costOptimization: SmartRecommendation[];
  preventive: SmartRecommendation[];
}

export const useSmartRecommendations = (propertyId?: string) => {
  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    fetchRecommendations();
  }, [propertyId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: recommendations, error: recommendationsError } = await supabase
        .from('smart_recommendations')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_completed', false)
        .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString().split('T')[0]}`)
        .order('urgency_score', { ascending: false });

      if (recommendationsError) throw recommendationsError;

      // Type cast and parse JSON fields
      const typedRecommendations = (recommendations || []).map(rec => ({
        ...rec,
        triggers: typeof rec.triggers === 'string' ? JSON.parse(rec.triggers) : rec.triggers || {}
      })) as SmartRecommendation[];

      // Group recommendations by type
      const weatherTriggered = typedRecommendations.filter(r => r.recommendation_type === 'weather_triggered') || [];
      const seasonal = typedRecommendations.filter(r => r.recommendation_type === 'seasonal') || [];
      const costOptimization = typedRecommendations.filter(r => r.recommendation_type === 'cost_optimization') || [];
      const preventive = typedRecommendations.filter(r => r.recommendation_type === 'preventive') || [];

      setData({
        recommendations: typedRecommendations,
        weatherTriggered,
        seasonal,
        costOptimization,
        preventive
      });

    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const markCompleted = async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from('smart_recommendations')
        .update({ 
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', recommendationId);

      if (error) throw error;

      // Refresh data
      await fetchRecommendations();
    } catch (err) {
      console.error('Error marking recommendation as completed:', err);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchRecommendations,
    markCompleted
  };
};