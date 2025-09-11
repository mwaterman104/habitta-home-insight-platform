import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LifecyclePrediction {
  id: string;
  systemType: string;
  systemName: string;
  predictedYearsRemaining: number;
  predictedCost: number;
  confidence: number;
  riskFactors: string[];
  recommendations: string[];
}

interface PredictionData {
  predictions: LifecyclePrediction[];
  totalCosts: {
    oneYear: number;
    twoYear: number;
    fiveYear: number;
  };
  highRiskSystems: string[];
  lastUpdated: string;
}

export function useAILifecyclePredictions(homeId?: string) {
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = async () => {
    if (!homeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if home has any systems
      const { data: systemsData, error: systemsError } = await supabase
        .from('home_systems')
        .select('*')
        .eq('home_id', homeId);

      if (systemsError) {
        throw systemsError;
      }

      if (!systemsData || systemsData.length === 0) {
        setData({
          predictions: [],
          totalCosts: { oneYear: 0, twoYear: 0, fiveYear: 0 },
          highRiskSystems: [],
          lastUpdated: new Date().toISOString()
        });
        setLoading(false);
        return;
      }

      // Generate predictions using edge function
      const { data: predictionsResponse, error: predictionsError } = await supabase.functions
        .invoke('generate-system-predictions', {
          body: { homeId }
        });

      if (predictionsError) {
        throw predictionsError;
      }

      const predictions: LifecyclePrediction[] = predictionsResponse.predictions.map((pred: any) => ({
        id: pred.system_id,
        systemType: pred.system_key,
        systemName: pred.system_name,
        predictedYearsRemaining: pred.remaining_years,
        predictedCost: pred.predicted_cost_mean,
        confidence: pred.confidence,
        riskFactors: Object.keys(pred.risk_factors || {}),
        recommendations: pred.maintenance_actions?.map((a: any) => a.action) || []
      }));

      // Calculate costs by timeframe
      let totalOneYear = 0;
      let totalTwoYear = 0;
      let totalFiveYear = 0;
      const highRiskSystems: string[] = [];

      predictions.forEach(pred => {
        if (pred.predictedYearsRemaining <= 1) {
          totalOneYear += pred.predictedCost;
        }
        if (pred.predictedYearsRemaining <= 2) {
          totalTwoYear += pred.predictedCost;
        }
        if (pred.predictedYearsRemaining <= 5) {
          totalFiveYear += pred.predictedCost;
        }

        if (pred.predictedYearsRemaining <= 2) {
          highRiskSystems.push(pred.systemName);
        }
      });

      setData({
        predictions,
        totalCosts: {
          oneYear: totalOneYear,
          twoYear: totalTwoYear,
          fiveYear: totalFiveYear
        },
        highRiskSystems,
        lastUpdated: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (predictionId: string, actualData: { 
    actualCost?: number; 
    actualDate?: string; 
    wasAccurate: boolean 
  }) => {
    try {
      // Store feedback for model improvement
      const { error } = await supabase.functions.invoke('prediction-feedback', {
        body: {
          predictionId,
          actualData
        }
      });
      
      if (error) {
        console.error('Error submitting feedback:', error);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [homeId]);

  return {
    data,
    loading,
    error,
    refetch: fetchPredictions,
    submitFeedback
  };
}