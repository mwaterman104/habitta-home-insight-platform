import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WeatherInsight {
  severity: 'low' | 'medium' | 'high';
  stormScore: number;
  recommendations: string[];
  checkList: string[];
  title: string;
  description: string;
  locationName?: string;
}

export const useWeatherInsights = (latitude?: number, longitude?: number) => {
  const [insights, setInsights] = useState<WeatherInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeatherInsights = async () => {
    if (!latitude || !longitude) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'google-weather-insights',
        {
          body: { latitude, longitude }
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      setInsights(data);
    } catch (err) {
      console.error('Error fetching weather insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherInsights();
  }, [latitude, longitude]);

  return {
    insights,
    loading,
    error,
    refetch: fetchWeatherInsights
  };
};