import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemLifecycle {
  id: string;
  system_type: string;
  brand?: string;
  model?: string;
  installation_date?: string;
  estimated_lifespan_years?: number;
  predicted_replacement_date?: string;
  replacement_probability: any; // Will be parsed as JSON
  confidence_level: number;
}

interface CostPrediction {
  id: string;
  system_lifecycle_id: string;
  prediction_type: string; // Will validate at runtime
  estimated_cost_min: number;
  estimated_cost_max: number;
  confidence_level: number;
  urgency_score: number;
  roi_score?: number;
  valid_until: string;
  cost_breakdown: any; // Will be parsed as JSON
}

interface PredictiveCostData {
  systems: SystemLifecycle[];
  predictions: CostPrediction[];
  totalUpcomingCosts: {
    '1_year': number;
    '2_year': number;
    '5_year': number;
  };
  highPriorityItems: Array<{
    system: string;
    action: string;
    cost: number;
    urgency: number;
    timeline: string;
  }>;
}

export const usePredictiveCosts = (propertyId?: string) => {
  const [data, setData] = useState<PredictiveCostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    fetchPredictiveCosts();
  }, [propertyId]);

  const fetchPredictiveCosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch system lifecycles
      const { data: systemsRaw, error: systemsError } = await supabase
        .from('system_lifecycles')
        .select('*')
        .eq('property_id', propertyId);

      if (systemsError) throw systemsError;

      // Fetch cost predictions
      const { data: predictionsRaw, error: predictionsError } = await supabase
        .from('cost_predictions')
        .select('*')
        .eq('property_id', propertyId)
        .gte('valid_until', new Date().toISOString().split('T')[0]);

      if (predictionsError) throw predictionsError;

      // Type cast and parse JSON fields
      const systems = (systemsRaw || []).map(system => ({
        ...system,
        replacement_probability: typeof system.replacement_probability === 'string' 
          ? JSON.parse(system.replacement_probability) 
          : system.replacement_probability || {}
      })) as SystemLifecycle[];

      const predictions = (predictionsRaw || []).map(prediction => ({
        ...prediction,
        cost_breakdown: typeof prediction.cost_breakdown === 'string'
          ? JSON.parse(prediction.cost_breakdown)
          : prediction.cost_breakdown || {}
      })) as CostPrediction[];

      // Calculate total upcoming costs
      const totalUpcomingCosts = {
        '1_year': 0,
        '2_year': 0,
        '5_year': 0
      };

      // Calculate high priority items
      const highPriorityItems: Array<{
        system: string;
        action: string;
        cost: number;
        urgency: number;
        timeline: string;
      }> = [];

        systems.forEach(system => {
        const systemPredictions = predictions.filter(p => p.system_lifecycle_id === system.id) || [];
        
        systemPredictions.forEach(prediction => {
          const avgCost = (prediction.estimated_cost_min + prediction.estimated_cost_max) / 2;
          
          // Add to total costs based on urgency and timeline
          if (prediction.urgency_score >= 8) {
            totalUpcomingCosts['1_year'] += avgCost;
          } else if (prediction.urgency_score >= 5) {
            totalUpcomingCosts['2_year'] += avgCost;
          } else {
            totalUpcomingCosts['5_year'] += avgCost;
          }

          // Add high priority items
          if (prediction.urgency_score >= 7) {
            highPriorityItems.push({
              system: system.system_type,
              action: prediction.prediction_type.replace('_', ' '),
              cost: avgCost,
              urgency: prediction.urgency_score,
              timeline: prediction.urgency_score >= 8 ? 'Within 1 year' : 'Within 2 years'
            });
          }
        });

        // Add replacement costs based on probability
        if (system.replacement_probability) {
          const replacementCosts = predictions.filter(p => 
            p.system_lifecycle_id === system.id && p.prediction_type === 'replacement'
          ) || [];

          replacementCosts.forEach(cost => {
            const avgCost = (cost.estimated_cost_min + cost.estimated_cost_max) / 2;
            totalUpcomingCosts['1_year'] += avgCost * (system.replacement_probability?.['1_year'] || 0);
            totalUpcomingCosts['2_year'] += avgCost * (system.replacement_probability?.['2_year'] || 0);
            totalUpcomingCosts['5_year'] += avgCost * (system.replacement_probability?.['5_year'] || 0);
          });
        }
      });

      // Sort high priority items by urgency
      highPriorityItems.sort((a, b) => b.urgency - a.urgency);

      setData({
        systems: systems,
        predictions: predictions,
        totalUpcomingCosts,
        highPriorityItems: highPriorityItems.slice(0, 5) // Top 5 priority items
      });

    } catch (err) {
      console.error('Error fetching predictive costs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load predictive costs');
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchPredictiveCosts
  };
};