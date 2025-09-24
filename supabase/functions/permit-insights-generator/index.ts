import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Permit {
  id: string;
  permit_type?: string;
  description?: string;
  date_issued?: string;
  date_finaled?: string;
  valuation?: number;
  contractor_name?: string;
  system_tags: string[];
  is_energy_related: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { homeId, propertyId } = await req.json();
    
    if (!homeId) {
      throw new Error('Home ID is required');
    }

    console.log('Generating permit-based insights for home:', homeId);

    // Fetch permits for this home
    const { data: permits, error: permitsError } = await supabaseClient
      .from('permits')
      .select('*')
      .eq('home_id', homeId);

    if (permitsError) throw permitsError;

    if (!permits || permits.length === 0) {
      console.log('No permits found for home:', homeId);
      return new Response(JSON.stringify({ 
        recommendations: [], 
        message: 'No permits found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${permits.length} permits, generating insights...`);

    const recommendations = await generatePermitBasedRecommendations(permits, propertyId);
    
    // Store recommendations in database if propertyId is available
    if (propertyId && recommendations.length > 0) {
      await storeRecommendations(supabaseClient, propertyId, recommendations);
    }

    return new Response(JSON.stringify({ 
      recommendations,
      count: recommendations.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating permit insights:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generatePermitBasedRecommendations(permits: Permit[], propertyId?: string) {
  const recommendations = [];
  const currentDate = new Date();
  const currentSeason = getCurrentSeason();

  for (const permit of permits) {
    const systemType = identifySystemType(permit);
    if (!systemType) continue;

    const installationDate = new Date(permit.date_finaled || permit.date_issued || currentDate);
    const systemAge = currentDate.getFullYear() - installationDate.getFullYear();

    // Generate seasonal recommendations
    const seasonalRecs = generateSeasonalRecommendations(systemType, currentSeason, installationDate);
    recommendations.push(...seasonalRecs);

    // Generate maintenance recommendations
    const maintenanceRecs = generateMaintenanceRecommendations(systemType, systemAge, permit.valuation);
    recommendations.push(...maintenanceRecs);

    // Generate warranty/insurance recommendations for newer systems
    if (systemAge <= 2) {
      const warrantyRecs = generateWarrantyRecommendations(systemType, systemAge, permit.valuation);
      recommendations.push(...warrantyRecs);
    }
  }

  return recommendations.map(rec => ({
    ...rec,
    property_id: propertyId,
    created_at: new Date().toISOString()
  }));
}

function identifySystemType(permit: Permit): string | null {
  const searchText = `${permit.permit_type || ''} ${permit.description || ''}`.toLowerCase();
  
  const systemKeywords = {
    pool: ['pool', 'swimming', 'spa'],
    hvac: ['hvac', 'air condition', 'heating', 'cooling', 'heat pump'],
    hurricane_shutters: ['hurricane', 'shutter', 'storm'],
    roofing: ['roof', 'shingle', 'tile'],
    electrical: ['electrical', 'panel', 'wiring'],
    solar: ['solar', 'photovoltaic', 'pv']
  };

  for (const [system, keywords] of Object.entries(systemKeywords)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return system;
    }
  }

  return null;
}

function generateSeasonalRecommendations(systemType: string, season: string, installationDate: Date) {
  const recommendations = [];
  const seasonalTips = {
    pool: {
      spring: 'Start up pool equipment and check for winter damage',
      summer: 'Monitor chemical levels more frequently due to heat and usage',
      fall: 'Prepare for potential storm season in Florida',
      winter: 'Maintain basic filtration, consider equipment protection'
    },
    hurricane_shutters: {
      spring: 'Test all shutters before hurricane season begins',
      summer: 'Keep shutters accessible and monitor weather forecasts',
      fall: 'Peak hurricane season - ensure quick deployment capability',
      winter: 'Post-season maintenance and inspection for next year'
    },
    hvac: {
      spring: 'Schedule pre-cooling season tune-up and filter replacement',
      summer: 'Monitor performance during peak usage period',
      fall: 'Prepare heating system for cooler months',
      winter: 'Monitor heating efficiency and replace filters'
    }
  };

  const tip = seasonalTips[systemType as keyof typeof seasonalTips]?.[season as keyof typeof seasonalTips[keyof typeof seasonalTips]];
  
  if (tip) {
    recommendations.push({
      recommendation_type: 'seasonal_permit_based',
      title: `${season.charAt(0).toUpperCase() + season.slice(1)} ${systemType.replace('_', ' ').toUpperCase()} Care`,
      description: tip,
      urgency_score: systemType === 'hurricane_shutters' && (season === 'spring' || season === 'summer') ? 8 : 5,
      seasonal_timing: season,
      weather_dependent: systemType === 'hurricane_shutters',
      estimated_time_hours: 1,
      diy_difficulty: systemType === 'hurricane_shutters' ? 'easy' : 'medium'
    });
  }

  return recommendations;
}

function generateMaintenanceRecommendations(systemType: string, systemAge: number, valuation?: number) {
  const recommendations = [];
  
  const maintenanceSchedules = {
    pool: [
      {
        task: 'Chemical balance testing and adjustment',
        frequency: 'weekly',
        cost: 50,
        urgency: 6
      },
      {
        task: 'Professional equipment inspection',
        frequency: 'annually',
        cost: 150,
        urgency: 5
      }
    ],
    hvac: [
      {
        task: 'Air filter replacement',
        frequency: 'quarterly',
        cost: 25,
        urgency: 8
      },
      {
        task: 'Professional system tune-up',
        frequency: 'biannually',
        cost: 150,
        urgency: 7
      }
    ],
    hurricane_shutters: [
      {
        task: 'Operation test and lubrication',
        frequency: 'before season',
        cost: 0,
        urgency: 9
      }
    ]
  };

  const schedule = maintenanceSchedules[systemType as keyof typeof maintenanceSchedules];
  
  if (schedule) {
    schedule.forEach(item => {
      recommendations.push({
        recommendation_type: 'permit_maintenance',
        title: `${systemType.replace('_', ' ').toUpperCase()}: ${item.task}`,
        description: `${item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)} maintenance for your ${systemAge}-year-old ${systemType.replace('_', ' ')}`,
        urgency_score: item.urgency,
        estimated_cost_min: item.cost,
        estimated_cost_max: item.cost * 1.5,
        estimated_time_hours: 1,
        diy_difficulty: item.cost === 0 ? 'easy' : 'medium'
      });
    });
  }

  return recommendations;
}

function generateWarrantyRecommendations(systemType: string, systemAge: number, valuation?: number) {
  const recommendations = [];

  if (systemType === 'hvac' && systemAge <= 1) {
    recommendations.push({
      recommendation_type: 'warranty_protection',
      title: 'HVAC Warranty Maintenance Required',
      description: `Your ${systemAge}-year-old HVAC system requires professional maintenance to maintain warranty coverage. Schedule service now.`,
      urgency_score: 8,
      estimated_cost_min: 120,
      estimated_cost_max: 200,
      estimated_time_hours: 2,
      diy_difficulty: 'professional',
      roi_potential: valuation ? valuation * 0.1 : 500
    });
  }

  if (systemType === 'hurricane_shutters' && valuation) {
    recommendations.push({
      recommendation_type: 'insurance_optimization',
      title: 'Hurricane Shutter Insurance Discount',
      description: 'Contact your insurance provider to apply for discounts on hurricane shutters. Potential savings of 5-15% on premiums.',
      urgency_score: 4,
      estimated_time_hours: 0.5,
      diy_difficulty: 'easy',
      roi_potential: 200
    });
  }

  return recommendations;
}

async function storeRecommendations(supabaseClient: any, propertyId: string, recommendations: any[]) {
  // First, mark existing permit-based recommendations as completed
  await supabaseClient
    .from('smart_recommendations')
    .update({ is_completed: true })
    .eq('property_id', propertyId)
    .in('recommendation_type', ['seasonal_permit_based', 'permit_maintenance', 'warranty_protection', 'insurance_optimization']);

  // Insert new recommendations
  const { error } = await supabaseClient
    .from('smart_recommendations')
    .insert(recommendations.slice(0, 10)); // Limit to top 10

  if (error) {
    console.error('Error storing recommendations:', error);
    throw error;
  }

  console.log(`Stored ${Math.min(recommendations.length, 10)} permit-based recommendations`);
}

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}