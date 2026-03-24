import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { homeId } = await req.json();

    if (!homeId) {
      throw new Error('Home ID is required');
    }

    console.log(`Generating predictions for home: ${homeId}`);

    // Fetch home systems
    const { data: systems, error: systemsError } = await supabaseClient
      .from('home_systems')
      .select(`
        *,
        system_catalog (
          key,
          display_name,
          typical_lifespan_years,
          cost_low,
          cost_high,
          risk_weights,
          maintenance_checks
        )
      `)
      .eq('home_id', homeId);

    if (systemsError) {
      throw systemsError;
    }

    if (!systems || systems.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No systems found for this home',
          predictions: []
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${systems.length} systems to predict`);

    // Generate predictions for each system
    const predictions = [];
    
    for (const system of systems) {
      const prediction = generateSystemPrediction(system);
      predictions.push(prediction);
      
      // Store prediction in database
      const { error: insertError } = await supabaseClient
        .from('system_predictions')
        .upsert({
          home_system_id: system.id,
          forecast_run_at: new Date().toISOString(),
          predicted_replace_date: prediction.predicted_replace_date,
          predicted_cost_mean: prediction.predicted_cost_mean,
          predicted_cost_low: prediction.predicted_cost_low,
          predicted_cost_high: prediction.predicted_cost_high,
          confidence: prediction.confidence,
          risk_factors: prediction.risk_factors,
          maintenance_actions: prediction.maintenance_actions,
          notes: prediction.notes
        }, {
          onConflict: 'home_system_id',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error('Error storing prediction:', insertError);
      }
    }

    return new Response(
      JSON.stringify({ predictions }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error generating predictions:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        predictions: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateSystemPrediction(system: any) {
  const catalog = system.system_catalog;
  const currentDate = new Date();
  
  // Calculate age
  let ageYears = 0;
  let installDate: Date | null = null;
  
  if (system.install_date) {
    installDate = new Date(system.install_date);
    ageYears = (currentDate.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  } else {
    // Use heuristic for missing install date
    ageYears = getDefaultAge(system.system_key);
    installDate = new Date();
    installDate.setFullYear(installDate.getFullYear() - ageYears);
  }
  
  // Base lifespan calculation
  const baseLifespan = system.expected_lifespan_years || catalog.typical_lifespan_years;
  const remainingYears = Math.max(0, baseLifespan - ageYears);
  
  // Predicted replacement date
  const predictedDate = new Date(installDate);
  predictedDate.setFullYear(predictedDate.getFullYear() + baseLifespan);
  
  // Cost calculation with inflation (3% annual)
  const yearsToReplacement = Math.max(0, remainingYears);
  const inflationRate = 0.03;
  const inflationMultiplier = Math.pow(1 + inflationRate, yearsToReplacement);
  
  const baseCostMean = (catalog.cost_low + catalog.cost_high) / 2;
  const costMean = Math.round(baseCostMean * inflationMultiplier);
  const costLow = Math.round(catalog.cost_low * inflationMultiplier);
  const costHigh = Math.round(catalog.cost_high * inflationMultiplier);
  
  // Risk factors calculation
  const ageNorm = Math.min(ageYears / baseLifespan, 1);
  const riskWeights = catalog.risk_weights || { age: 0.7, maintenance: 0.3 };
  
  const maintenanceBonus = system.last_service_date ? 0.1 : 0;
  const riskScore = (riskWeights.age || 0.7) * ageNorm - maintenanceBonus;
  
  // Confidence calculation
  const hasInstallDate = !!system.install_date;
  const hasMaintenance = !!system.last_service_date;
  const hasDetails = !!(system.brand && system.model);
  
  let confidence = 0.5; // base confidence
  if (hasInstallDate) confidence += 0.3;
  if (hasMaintenance) confidence += 0.1;
  if (hasDetails) confidence += 0.1;
  confidence = Math.min(confidence, 1.0);
  
  // Generate maintenance actions
  const maintenanceActions = generateMaintenanceActions(system, catalog, remainingYears);
  
  // Risk factors breakdown
  const riskFactors = {
    age: ageNorm,
    maintenance_history: hasMaintenance ? 0.1 : 0.3,
    data_completeness: hasInstallDate && hasDetails ? 0.1 : 0.2
  };
  
  let notes = `System is ${Math.round(ageYears)} years old. `;
  if (remainingYears < 2) {
    notes += "Consider planning replacement soon.";
  } else if (remainingYears < 5) {
    notes += "Monitor closely and plan for replacement.";
  } else {
    notes += "System in good lifecycle position.";
  }
  
  return {
    system_id: system.id,
    system_key: system.system_key,
    system_name: catalog.display_name,
    age_years: Math.round(ageYears * 10) / 10,
    predicted_replace_date: predictedDate.toISOString().split('T')[0],
    predicted_cost_mean: costMean,
    predicted_cost_low: costLow,
    predicted_cost_high: costHigh,
    remaining_years: Math.round(remainingYears * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    risk_factors: riskFactors,
    maintenance_actions: maintenanceActions,
    notes
  };
}

function getDefaultAge(systemKey: string): number {
  // Conservative estimates for missing install dates
  switch (systemKey) {
    case 'hvac': return 10;
    case 'water_heater': return 8;
    case 'roof': return 15;
    case 'windows': return 12;
    case 'flooring': return 8;
    case 'electrical': return 20;
    case 'plumbing': return 25;
    default: return 10;
  }
}

function generateMaintenanceActions(system: any, catalog: any, remainingYears: number) {
  const actions = [];
  const checks = catalog.maintenance_checks || [];
  
  // Add system-specific maintenance recommendations
  if (system.system_key === 'hvac') {
    actions.push({
      action: "Change HVAC filter",
      frequency: "quarterly",
      impact: "Extends life by 1-2 years",
      cost_estimate: 25,
      urgency: remainingYears < 3 ? "high" : "medium"
    });
    
    if (!system.last_service_date || isServiceOverdue(system.last_service_date, 12)) {
      actions.push({
        action: "Professional HVAC tune-up",
        frequency: "annually", 
        impact: "Extends life by 2-3 years",
        cost_estimate: 150,
        urgency: "high"
      });
    }
  }
  
  if (system.system_key === 'water_heater') {
    actions.push({
      action: "Flush water heater tank",
      frequency: "annually",
      impact: "Prevents sediment buildup",
      cost_estimate: 100,
      urgency: remainingYears < 2 ? "high" : "medium"
    });
  }
  
  if (system.system_key === 'roof') {
    actions.push({
      action: "Annual roof inspection", 
      frequency: "annually",
      impact: "Catch issues early",
      cost_estimate: 200,
      urgency: remainingYears < 5 ? "high" : "medium"
    });
  }
  
  return actions;
}

function isServiceOverdue(lastServiceDate: string, monthsThreshold: number): boolean {
  const lastService = new Date(lastServiceDate);
  const monthsAgo = new Date();
  monthsAgo.setMonth(monthsAgo.getMonth() - monthsThreshold);
  return lastService < monthsAgo;
}