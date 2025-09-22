import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BenchmarkMetric {
  metric: string;
  yours: number;
  neighborhood_avg: number;
  unit: string;
  lower_is_better: boolean;
  description: string;
}

export function useNeighborhoodBenchmarks() {
  const [benchmarks, setBenchmarks] = useState<BenchmarkMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBenchmarks() {
      try {
        setLoading(true);
        
        // Get benchmarks with user values
        const { data, error } = await supabase
          .from('neighborhood_benchmarks')
          .select(`
            *,
            user_benchmarks!inner(user_value)
          `);

        if (error) throw error;

        if (data && data.length > 0) {
          const formatted = data.map(benchmark => ({
            metric: benchmark.metric_name,
            yours: benchmark.user_benchmarks?.[0]?.user_value || 0,
            neighborhood_avg: benchmark.neighborhood_avg,
            unit: benchmark.metric_unit,
            lower_is_better: benchmark.lower_is_better,
            description: benchmark.description || ''
          }));
          setBenchmarks(formatted);
        } else {
          // Return mock data if no real data exists
          setBenchmarks([
            {
              metric: "Roof Condition Score",
              yours: 82,
              neighborhood_avg: 76,
              unit: "score",
              lower_is_better: false,
              description: "Overall roof condition based on age, materials, and maintenance"
            },
            {
              metric: "HVAC Age",
              yours: 7,
              neighborhood_avg: 11,
              unit: "years",
              lower_is_better: true,
              description: "Age of primary heating and cooling system"
            },
            {
              metric: "Monthly Energy Cost",
              yours: 118,
              neighborhood_avg: 142,
              unit: "usd",
              lower_is_better: true,
              description: "Average monthly utility costs for similar homes"
            },
            {
              metric: "Maintenance Score",
              yours: 89,
              neighborhood_avg: 71,
              unit: "score",
              lower_is_better: false,
              description: "Proactive maintenance rating based on completed tasks"
            }
          ]);
        }
      } catch (err: any) {
        console.error('Error fetching neighborhood benchmarks:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBenchmarks();
  }, []);

  return { benchmarks, loading, error };
}

export function useCostModel() {
  const [costModel, setCostModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCostModel() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('cost_models')
          .select('*')
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setCostModel({
            baseline_monthly_cost: data.baseline_monthly_cost,
            global_multiplier: data.global_multiplier,
            by_category: data.category_multipliers || {},
            scenarios: data.delay_scenarios || []
          });
        } else {
          // Return mock data if no real data exists
          setCostModel({
            baseline_monthly_cost: 150,
            global_multiplier: 0.08,
            by_category: {
              HVAC: {
                monthly_multiplier: 0.12,
                description: "Delayed HVAC maintenance can lead to system failure and expensive emergency repairs"
              },
              Plumbing: {
                monthly_multiplier: 0.15,
                description: "Water damage from leaks can escalate quickly and affect multiple systems"
              }
            },
            scenarios: [
              { months_delayed: 0, multiplier: 1.0, description: "On-time maintenance" },
              { months_delayed: 3, multiplier: 1.25, description: "Minor delay - 25% cost increase" },
              { months_delayed: 6, multiplier: 1.6, description: "Moderate delay - 60% cost increase" },
              { months_delayed: 12, multiplier: 2.2, description: "Major delay - 120% cost increase" }
            ]
          });
        }
      } catch (err: any) {
        console.error('Error fetching cost model:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCostModel();
  }, []);

  return { costModel, loading, error };
}