import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LifecyclePrediction {
  systemType: string;
  predictedYearsRemaining: number;
  predictedReplacementDate: string;
  predictedCost: number;
  confidenceScore: number;
  riskFactors: string[];
  recommendations: string[];
  modelVersion: string;
  features: {
    weatherImpact: number;
    maintenanceBonus: number;
    qualityFactor: number;
  };
}

interface PredictionData {
  predictions: LifecyclePrediction[];
  totalPredictedCosts: {
    oneYear: number;
    twoYear: number;
    fiveYear: number;
  };
  highRiskSystems: LifecyclePrediction[];
  lastUpdated: string;
}

export const useAILifecyclePredictions = (propertyId?: string) => {
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    fetchPredictions();
  }, [propertyId]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get property systems data
      const { data: systemsData, error: systemsError } = await supabase
        .from('system_lifecycles')
        .select('*')
        .eq('property_id', propertyId);

      if (systemsError) throw systemsError;

      if (!systemsData?.length) {
        setData({
          predictions: [],
          totalPredictedCosts: { oneYear: 0, twoYear: 0, fiveYear: 0 },
          highRiskSystems: [],
          lastUpdated: new Date().toISOString()
        });
        return;
      }

      // Generate predictions for each system using AI
      const predictions: LifecyclePrediction[] = [];
      
      for (const system of systemsData) {
        try {
          const { data: prediction, error: predictionError } = await supabase.functions.invoke(
            'ai-lifecycle-predictor',
            {
              body: {
                propertyId,
                systemType: system.system_type,
                features: {
                  currentAge: new Date().getFullYear() - new Date(system.installation_date).getFullYear(),
                  maintenanceHistory: [],
                  installationQuality: 'standard',
                  location: { state: 'FL' }
                }
              }
            }
          );

          if (!predictionError && prediction) {
            predictions.push(prediction);
          }
        } catch (err) {
          console.error(`Error predicting lifecycle for ${system.system_type}:`, err);
        }
      }

      // Calculate total predicted costs
      const totalPredictedCosts = {
        oneYear: predictions
          .filter(p => p.predictedYearsRemaining <= 1)
          .reduce((sum, p) => sum + p.predictedCost, 0),
        twoYear: predictions
          .filter(p => p.predictedYearsRemaining <= 2)
          .reduce((sum, p) => sum + p.predictedCost, 0),
        fiveYear: predictions
          .filter(p => p.predictedYearsRemaining <= 5)
          .reduce((sum, p) => sum + p.predictedCost, 0)
      };

      // Identify high-risk systems (replacement needed within 3 years or low confidence)
      const highRiskSystems = predictions.filter(p => 
        p.predictedYearsRemaining <= 3 || p.confidenceScore < 0.7
      );

      setData({
        predictions,
        totalPredictedCosts,
        highRiskSystems,
        lastUpdated: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error fetching AI lifecycle predictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (systemType: string, rating: number, feedbackText?: string) => {
    try {
      const prediction = data?.predictions.find(p => p.systemType === systemType);
      if (!prediction) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          property_id: propertyId!,
          feedback_type: 'prediction_accuracy',
          predicted_value: {
            yearsRemaining: prediction.predictedYearsRemaining,
            cost: prediction.predictedCost,
            confidence: prediction.confidenceScore
          },
          rating,
          feedback_text: feedbackText
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error submitting feedback:', err);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchPredictions,
    submitFeedback
  };
};