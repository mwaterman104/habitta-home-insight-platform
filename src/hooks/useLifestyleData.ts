import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LifestyleMetrics {
  energyWellness: {
    score: number;
    neighborhoodAverage: number;
    monthlySavings: number;
    trend: string;
  };
  comfortIndex: {
    rating: string;
    temperatureStability: string;
    airQuality: string;
    summary: string;
  };
  outdoorReadiness: {
    status: string;
    systems: string[];
    seasonalNote: string;
  };
  safetyConfidence: {
    score: number;
    status: string;
    summary: string;
  };
}

export interface EnergyComparison {
  month: string;
  yours: number;
  neighborhood_avg: number;
}

export function useLifestyleMetrics() {
  const [metrics, setMetrics] = useState<LifestyleMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('lifestyle_metrics')
          .select('*')
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setMetrics({
            energyWellness: {
              score: data.energy_wellness_score,
              neighborhoodAverage: data.energy_neighborhood_avg,
              monthlySavings: data.monthly_savings,
              trend: data.energy_trend
            },
            comfortIndex: {
              rating: data.comfort_rating,
              temperatureStability: data.temperature_stability,
              airQuality: data.air_quality,
              summary: data.comfort_summary
            },
            outdoorReadiness: {
              status: data.outdoor_readiness_status,
              systems: data.outdoor_systems || [],
              seasonalNote: data.seasonal_note
            },
            safetyConfidence: {
              score: data.safety_score,
              status: data.safety_status,
              summary: data.safety_summary
            }
          });
        } else {
          // Return default values if no data found
          setMetrics({
            energyWellness: {
              score: 87,
              neighborhoodAverage: 73,
              monthlySavings: 195,
              trend: 'improving'
            },
            comfortIndex: {
              rating: 'Excellent',
              temperatureStability: '±2°F',
              airQuality: 'Good',
              summary: 'Perfect for home office'
            },
            outdoorReadiness: {
              status: 'Ready',
              systems: ['roof', 'gutters', 'irrigation'],
              seasonalNote: 'All systems optimized'
            },
            safetyConfidence: {
              score: 95,
              status: 'High',
              summary: 'Full confidence'
            }
          });
        }
      } catch (err: any) {
        console.error('Error fetching lifestyle metrics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
}

export function useEnergyComparison() {
  const [data, setData] = useState<EnergyComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComparison() {
      try {
        setLoading(true);
        const { data: energyData, error } = await supabase
          .from('energy_comparison')
          .select('*')
          .order('month_year', { ascending: true });

        if (error) throw error;

        if (energyData && energyData.length > 0) {
          const formatted = energyData.map(row => ({
            month: row.month_year,
            yours: row.user_usage,
            neighborhood_avg: row.neighborhood_avg
          }));
          setData(formatted);
        } else {
          // Return mock data if no real data exists
          setData([
            { month: "2024-01", yours: 1200, neighborhood_avg: 1450 },
            { month: "2024-02", yours: 1100, neighborhood_avg: 1380 },
            { month: "2024-03", yours: 950, neighborhood_avg: 1200 },
            { month: "2024-04", yours: 800, neighborhood_avg: 980 },
            { month: "2024-05", yours: 650, neighborhood_avg: 750 },
            { month: "2024-06", yours: 550, neighborhood_avg: 680 },
            { month: "2024-07", yours: 480, neighborhood_avg: 620 },
            { month: "2024-08", yours: 520, neighborhood_avg: 650 },
            { month: "2024-09", yours: 680, neighborhood_avg: 820 },
            { month: "2024-10", yours: 850, neighborhood_avg: 1050 },
            { month: "2024-11", yours: 1050, neighborhood_avg: 1280 },
            { month: "2024-12", yours: 1180, neighborhood_avg: 1420 }
          ]);
        }
      } catch (err: any) {
        console.error('Error fetching energy comparison:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();
  }, []);

  return { data, loading, error };
}