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

    const { propertyId, context, userPreferences } = await req.json();
    
    console.log('Generating smart recommendations for:', { propertyId, context });

    // Generate contextual recommendations using NLP-like analysis
    const recommendations = await generateSmartRecommendations(supabase, propertyId, context, userPreferences);
    
    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in smart recommendations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateSmartRecommendations(supabase: any, propertyId: string, context: any, preferences: any) {
  // Get property systems data
  const { data: systemsData } = await supabase
    .from('system_lifecycles')
    .select('*')
    .eq('property_id', propertyId);

  // Get existing recommendations
  const { data: existingRecs } = await supabase
    .from('smart_recommendations')
    .select('*')
    .eq('property_id', propertyId)
    .eq('is_completed', false);

  // Get weather insights
  const { data: weatherData } = await supabase.functions.invoke('google-weather-insights', {
    body: { latitude: context.latitude, longitude: context.longitude }
  });

  // Generate seasonal recommendations
  const seasonalRecs = generateSeasonalRecommendations(context.currentSeason, systemsData || []);
  
  // Generate predictive maintenance recommendations
  const predictiveRecs = await generatePredictiveRecommendations(supabase, systemsData || [], weatherData);
  
  // Generate cost optimization recommendations
  const costOptRecs = generateCostOptimizationRecommendations(systemsData || [], context.marketData);
  
  // Generate personalized recommendations based on user behavior
  const personalizedRecs = generatePersonalizedRecommendations(preferences, existingRecs || []);

  // Combine and prioritize all recommendations
  const allRecommendations = [
    ...seasonalRecs,
    ...predictiveRecs,
    ...costOptRecs,
    ...personalizedRecs
  ];

  // Apply smart filtering and prioritization
  const prioritizedRecommendations = prioritizeRecommendations(allRecommendations, preferences);
  
  // Store new recommendations in database
  await storeRecommendations(supabase, propertyId, prioritizedRecommendations);

  return {
    recommendations: prioritizedRecommendations,
    totalCount: prioritizedRecommendations.length,
    categories: {
      seasonal: seasonalRecs.length,
      predictive: predictiveRecs.length,
      costOptimization: costOptRecs.length,
      personalized: personalizedRecs.length
    },
    generatedAt: new Date().toISOString()
  };
}

function generateSeasonalRecommendations(currentSeason: string, systemsData: any[]): any[] {
  const recommendations: any[] = [];
  const season = currentSeason || getCurrentSeason();

  const seasonalTasks: Record<string, any[]> = {
    'winter': [
      {
        type: 'seasonal',
        title: 'HVAC Winter Preparation',
        description: 'Replace filters and inspect heating system before peak winter usage',
        urgency_score: 75,
        estimated_cost_min: 50,
        estimated_cost_max: 200,
        seasonal_timing: 'winter',
        diy_difficulty: 'easy'
      },
      {
        type: 'seasonal',
        title: 'Pipe Freeze Prevention',
        description: 'Insulate exposed pipes and check for potential freeze points',
        urgency_score: 80,
        estimated_cost_min: 25,
        estimated_cost_max: 100,
        seasonal_timing: 'winter',
        diy_difficulty: 'medium'
      }
    ],
    'spring': [
      {
        type: 'seasonal',
        title: 'AC System Spring Checkup',
        description: 'Clean AC units and replace filters before summer heat',
        urgency_score: 70,
        estimated_cost_min: 75,
        estimated_cost_max: 300,
        seasonal_timing: 'spring',
        diy_difficulty: 'medium'
      },
      {
        type: 'seasonal',
        title: 'Gutter Cleaning',
        description: 'Clear winter debris and inspect for damage',
        urgency_score: 65,
        estimated_cost_min: 100,
        estimated_cost_max: 250,
        seasonal_timing: 'spring',
        diy_difficulty: 'medium'
      }
    ],
    'summer': [
      {
        type: 'seasonal',
        title: 'AC Efficiency Optimization',
        description: 'Monitor AC performance and optimize settings for peak summer',
        urgency_score: 85,
        estimated_cost_min: 0,
        estimated_cost_max: 150,
        seasonal_timing: 'summer',
        diy_difficulty: 'easy'
      }
    ],
    'fall': [
      {
        type: 'seasonal',
        title: 'Heating System Preparation',
        description: 'Service heating system before winter season',
        urgency_score: 75,
        estimated_cost_min: 100,
        estimated_cost_max: 400,
        seasonal_timing: 'fall',
        diy_difficulty: 'professional'
      }
    ]
  };

  return seasonalTasks[season] || [];
}

async function generatePredictiveRecommendations(supabase: any, systemsData: any[], weatherData: any): Promise<any[]> {
  const recommendations: any[] = [];

  for (const system of systemsData) {
    // Call AI lifecycle predictor for each system
    const { data: prediction } = await supabase.functions.invoke('ai-lifecycle-predictor', {
      body: {
        propertyId: system.property_id,
        systemType: system.system_type,
        features: {
          currentAge: new Date().getFullYear() - (system.installed_year || 2020),
          maintenanceHistory: system.maintenance_history || [],
          installationQuality: system.quality_rating || 'standard',
          location: { state: 'FL' } // Default to Florida
        }
      }
    });

    if (prediction && prediction.predictedYearsRemaining < 5) {
      recommendations.push({
        type: 'predictive',
        title: `${system.system_name} Replacement Planning`,
        description: `AI predicts replacement needed in ${prediction.predictedYearsRemaining} years. Estimated cost: $${prediction.predictedCost}`,
        urgency_score: Math.max(60, 100 - (prediction.predictedYearsRemaining * 15)),
        estimated_cost_min: prediction.predictedCost * 0.8,
        estimated_cost_max: prediction.predictedCost * 1.2,
        system_lifecycle_id: system.id,
        ai_confidence: prediction.confidenceScore,
        predicted_date: prediction.predictedReplacementDate
      });
    }
  }

  return recommendations;
}

function generateCostOptimizationRecommendations(systemsData: any[], marketData: any): any[] {
  const recommendations: any[] = [];
  const currentMonth = new Date().getMonth();

  // Off-season recommendations for better pricing
  if (currentMonth >= 2 && currentMonth <= 5) { // March-June
    recommendations.push({
      type: 'cost_optimization',
      title: 'Off-Season HVAC Service',
      description: 'Schedule HVAC maintenance now for 15-25% savings vs peak season',
      urgency_score: 50,
      estimated_cost_min: 200,
      estimated_cost_max: 400,
      cost_savings_potential: 75,
      optimal_timing: 'next_30_days'
    });
  }

  // Energy efficiency recommendations
  recommendations.push({
    type: 'cost_optimization',
    title: 'Smart Thermostat Installation',
    description: 'Reduce energy costs by 10-23% with intelligent temperature control',
    urgency_score: 40,
    estimated_cost_min: 200,
    estimated_cost_max: 500,
    roi_potential: 0.25,
    energy_savings_potential: 0.15
  });

  return recommendations;
}

function generatePersonalizedRecommendations(preferences: any, existingRecs: any[]): any[] {
  const recommendations: any[] = [];

  // Analyze user preferences and behavior patterns
  const prefersDIY = preferences?.diy_preference === 'high';
  const budgetConstraints = preferences?.budget_range === 'low';
  const hasCompletedRecs = existingRecs.filter(r => r.is_completed).length;

  if (prefersDIY) {
    recommendations.push({
      type: 'personalized',
      title: 'DIY Air Filter Replacement Reminder',
      description: 'Based on your DIY preferences, here\'s an easy maintenance task',
      urgency_score: 45,
      estimated_cost_min: 20,
      estimated_cost_max: 60,
      diy_difficulty: 'easy',
      estimated_time_hours: 0.5
    });
  }

  if (budgetConstraints) {
    recommendations.push({
      type: 'personalized',
      title: 'Low-Cost Weatherproofing',
      description: 'Affordable improvements that provide high impact on energy efficiency',
      urgency_score: 55,
      estimated_cost_min: 50,
      estimated_cost_max: 150,
      roi_potential: 0.3
    });
  }

  return recommendations;
}

function prioritizeRecommendations(recommendations: any[], preferences: any): any[] {
  return recommendations
    .map(rec => ({
      ...rec,
      priority_score: calculatePriorityScore(rec, preferences)
    }))
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 10); // Return top 10 recommendations
}

function calculatePriorityScore(recommendation: any, preferences: any): number {
  let score = recommendation.urgency_score || 50;

  // Boost score for user preferences
  if (preferences?.diy_preference === 'high' && recommendation.diy_difficulty === 'easy') {
    score += 15;
  }

  if (preferences?.budget_range === 'low' && (recommendation.estimated_cost_max || 1000) < 200) {
    score += 10;
  }

  // Boost for high ROI
  if (recommendation.roi_potential > 0.2) {
    score += 20;
  }

  // Boost for seasonal relevance
  const currentSeason = getCurrentSeason();
  if (recommendation.seasonal_timing === currentSeason) {
    score += 25;
  }

  return Math.min(100, score);
}

function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

async function storeRecommendations(supabase: any, propertyId: string, recommendations: any[]) {
  for (const rec of recommendations.slice(0, 5)) { // Store top 5
    try {
      await supabase
        .from('smart_recommendations')
        .insert({
          property_id: propertyId,
          recommendation_type: rec.type,
          title: rec.title,
          description: rec.description,
          urgency_score: rec.urgency_score,
          estimated_cost_min: rec.estimated_cost_min,
          estimated_cost_max: rec.estimated_cost_max,
          estimated_time_hours: rec.estimated_time_hours,
          seasonal_timing: rec.seasonal_timing,
          weather_dependent: rec.weather_dependent || false,
          diy_difficulty: rec.diy_difficulty || 'medium',
          roi_potential: rec.roi_potential,
          energy_savings_potential: rec.energy_savings_potential,
          triggers: JSON.stringify(rec.triggers || {}),
          is_completed: false
        });
    } catch (error) {
      console.error('Error storing recommendation:', error);
    }
  }
}