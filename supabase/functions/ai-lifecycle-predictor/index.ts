import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { propertyId, systemType, features } = await req.json();
    
    console.log('Predicting lifecycle for:', { propertyId, systemType, features });

    // Enhanced ML prediction logic using multiple data sources
    const predictions = await generateLifecyclePredictions(supabase, propertyId, systemType, features);
    
    // Store prediction for accuracy tracking
    await storePredictionForTracking(supabase, propertyId, systemType, predictions);

    return new Response(JSON.stringify(predictions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in AI lifecycle predictor:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateLifecyclePredictions(supabase: any, propertyId: string, systemType: string, features: any) {
  // Get historical data for similar systems
  const { data: historicalData } = await supabase
    .from('system_lifecycles')
    .select('*')
    .eq('system_type', systemType)
    .limit(100);

  // Get weather data impact
  const { data: weatherData } = await supabase
    .from('smart_recommendations')
    .select('*')
    .eq('property_id', propertyId)
    .eq('recommendation_type', 'weather_triggered')
    .limit(10);

  // Enhanced prediction algorithm considering multiple factors
  const basePrediction = calculateBasePrediction(systemType, features);
  const weatherAdjustment = calculateWeatherImpact(weatherData || []);
  const maintenanceBonus = calculateMaintenanceBonus(features.maintenanceHistory || []);
  const qualityFactor = calculateQualityFactor(features.installationQuality || 'standard');

  const predictedYearsRemaining = Math.max(1, Math.round(
    basePrediction * weatherAdjustment * maintenanceBonus * qualityFactor
  ));

  const confidenceScore = calculateConfidenceScore(historicalData?.length || 0, features);
  
  // Cost prediction with market factors
  const baseCost = getBaseCostForSystem(systemType);
  const inflationRate = 1.03; // 3% annual inflation
  const marketMultiplier = await getMarketPriceMultiplier(features.location);
  
  const predictedCost = Math.round(baseCost * Math.pow(inflationRate, predictedYearsRemaining) * marketMultiplier);

  // Generate risk factors and recommendations
  const riskFactors = generateRiskFactors(systemType, features, weatherData || []);
  const recommendations = generateMaintenanceRecommendations(systemType, predictedYearsRemaining, riskFactors);

  return {
    systemType,
    predictedYearsRemaining,
    predictedReplacementDate: new Date(Date.now() + predictedYearsRemaining * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    predictedCost,
    confidenceScore,
    riskFactors,
    recommendations,
    modelVersion: '1.0.0',
    features: {
      weatherImpact: weatherAdjustment,
      maintenanceBonus: maintenanceBonus,
      qualityFactor: qualityFactor
    }
  };
}

function calculateBasePrediction(systemType: string, features: any): number {
  const baseLifespans: Record<string, number> = {
    'hvac': 15,
    'water_heater': 10,
    'roof': 25,
    'windows': 20,
    'flooring': 30,
    'appliances': 12,
    'electrical': 40,
    'plumbing': 50
  };

  const baseYears = baseLifespans[systemType] || 15;
  const ageAdjustment = Math.max(0.1, 1 - (features.currentAge || 0) / baseYears);
  
  return baseYears * ageAdjustment;
}

function calculateWeatherImpact(weatherData: any[]): number {
  if (!weatherData.length) return 1.0;
  
  const severityScore = weatherData.reduce((sum, item) => {
    const urgency = item.urgency_score || 50;
    return sum + (urgency / 100);
  }, 0) / weatherData.length;

  // Higher weather impact reduces lifespan
  return Math.max(0.7, 1 - (severityScore * 0.3));
}

function calculateMaintenanceBonus(maintenanceHistory: any[]): number {
  if (!maintenanceHistory.length) return 0.9; // Poor maintenance assumption
  
  const recentMaintenance = maintenanceHistory.filter(m => 
    new Date(m.date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * 2) // Last 2 years
  );
  
  const maintenanceScore = Math.min(1.5, 1 + (recentMaintenance.length * 0.1));
  return maintenanceScore;
}

function calculateQualityFactor(quality: string): number {
  const qualityMultipliers: Record<string, number> = {
    'premium': 1.3,
    'high': 1.2,
    'standard': 1.0,
    'budget': 0.8,
    'poor': 0.6
  };
  
  return qualityMultipliers[quality] || 1.0;
}

function calculateConfidenceScore(historicalDataPoints: number, features: any): number {
  let confidence = 0.5; // Base confidence
  
  // More historical data increases confidence
  confidence += Math.min(0.3, historicalDataPoints * 0.01);
  
  // Complete feature set increases confidence
  const featureCompleteness = Object.keys(features).length / 10; // Assuming 10 ideal features
  confidence += Math.min(0.2, featureCompleteness);
  
  return Math.min(1.0, confidence);
}

function getBaseCostForSystem(systemType: string): number {
  const baseCosts: Record<string, number> = {
    'hvac': 8500,
    'water_heater': 1800,
    'roof': 15000,
    'windows': 12000,
    'flooring': 8000,
    'appliances': 5500,
    'electrical': 3500,
    'plumbing': 2500
  };
  
  return baseCosts[systemType] || 5000;
}

async function getMarketPriceMultiplier(location: any): Promise<number> {
  // Simple market adjustment based on location
  // In a real implementation, this would call external APIs
  const locationMultipliers: Record<string, number> = {
    'FL': 1.15, // Florida premium
    'CA': 1.35,
    'NY': 1.25,
    'TX': 0.95
  };
  
  return locationMultipliers[location?.state] || 1.0;
}

function generateRiskFactors(systemType: string, features: any, weatherData: any[]): string[] {
  const risks: string[] = [];
  
  if (features.currentAge > 10) {
    risks.push('Advanced age increases failure risk');
  }
  
  if (weatherData.some(w => w.urgency_score > 70)) {
    risks.push('High weather exposure in your area');
  }
  
  if (!features.maintenanceHistory?.length) {
    risks.push('Lack of maintenance records');
  }
  
  if (systemType === 'hvac' && features.location?.climate === 'humid') {
    risks.push('High humidity stress on HVAC components');
  }
  
  return risks;
}

function generateMaintenanceRecommendations(systemType: string, yearsRemaining: number, riskFactors: string[]): string[] {
  const recommendations: string[] = [];
  
  if (yearsRemaining < 3) {
    recommendations.push('Schedule professional inspection within 6 months');
    recommendations.push('Begin budget planning for replacement');
  } else if (yearsRemaining < 5) {
    recommendations.push('Increase inspection frequency to annually');
    recommendations.push('Consider preventive maintenance upgrades');
  }
  
  if (riskFactors.includes('High weather exposure in your area')) {
    recommendations.push('Install weather protection measures');
  }
  
  if (riskFactors.includes('Lack of maintenance records')) {
    recommendations.push('Establish regular maintenance schedule');
  }
  
  return recommendations;
}

async function storePredictionForTracking(supabase: any, propertyId: string, systemType: string, prediction: any) {
  try {
    await supabase
      .from('prediction_accuracy')
      .insert({
        model_id: '00000000-0000-0000-0000-000000000001', // Default model ID
        property_id: propertyId,
        prediction_type: `${systemType}_replacement`,
        predicted_date: prediction.predictedReplacementDate,
        predicted_cost: prediction.predictedCost
      });
  } catch (error) {
    console.error('Error storing prediction for tracking:', error);
  }
}