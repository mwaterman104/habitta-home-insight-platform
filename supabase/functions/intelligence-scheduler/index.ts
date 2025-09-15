import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create Supabase client with service role for full access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Scheduled job for nightly intelligence updates
async function runNightlyUpdate() {
  console.log('Starting nightly intelligence update...');
  
  try {
    // Get all properties that need updates
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id');
    
    if (error) {
      console.error('Error fetching properties:', error);
      return { error: error.message };
    }
    
    let updateCount = 0;
    let errorCount = 0;
    
    // Update predictions for each property
    for (const property of properties || []) {
      try {
        // Invoke intelligence engine to refresh predictions
        const { error: updateError } = await supabase.functions.invoke('intelligence-engine/predictions', {
          body: { property_id: property.id }
        });
        
        if (updateError) {
          console.error(`Error updating property ${property.id}:`, updateError);
          errorCount++;
        } else {
          updateCount++;
        }
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`Unexpected error updating property ${property.id}:`, err);
        errorCount++;
      }
    }
    
    console.log(`Nightly update complete: ${updateCount} updated, ${errorCount} errors`);
    
    return {
      success: true,
      updated: updateCount,
      errors: errorCount,
      message: `Updated ${updateCount} properties with ${errorCount} errors`
    };
    
  } catch (err) {
    console.error('Nightly update failed:', err);
    return { error: 'Nightly update failed', details: err.message };
  }
}

// Weather alert monitoring
async function checkWeatherAlerts() {
  console.log('Checking weather alerts...');
  
  try {
    // In a production system, this would integrate with NOAA API
    // For now, we'll check for any existing weather alerts
    const { data: alerts, error } = await supabase
      .from('weather_alerts')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching weather alerts:', error);
      return { error: error.message };
    }
    
    console.log(`Found ${alerts?.length || 0} active weather alerts`);
    
    // Process each alert and generate relevant tasks
    for (const alert of alerts || []) {
      // Generate weather-triggered maintenance tasks
      // This would typically create entries in maintenance_tasks table
      console.log(`Processing alert: ${alert.title}`);
    }
    
    return {
      success: true,
      alertsProcessed: alerts?.length || 0
    };
    
  } catch (err) {
    console.error('Weather alert check failed:', err);
    return { error: 'Weather alert check failed', details: err.message };
  }
}

// Permit monitoring for system updates
async function checkPermitUpdates() {
  console.log('Checking for new permit data...');
  
  try {
    // Check for permits added in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentPermits, error } = await supabase
      .from('permits')
      .select('*')
      .gte('created_at', yesterday.toISOString());
    
    if (error) {
      console.error('Error fetching recent permits:', error);
      return { error: error.message };
    }
    
    console.log(`Found ${recentPermits?.length || 0} new permits`);
    
    // Update system lifecycles based on new permits
    for (const permit of recentPermits || []) {
      if (permit.is_energy_related || permit.system_tags?.length > 0) {
        // Update system lifecycle predictions based on new permit data
        console.log(`Processing permit: ${permit.permit_number} for system updates`);
      }
    }
    
    return {
      success: true,
      permitsProcessed: recentPermits?.length || 0
    };
    
  } catch (err) {
    console.error('Permit update check failed:', err);
    return { error: 'Permit update check failed', details: err.message };
  }
}

// Main scheduler handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const jobType = url.searchParams.get('job') || 'nightly';

    console.log(`Intelligence Scheduler running job: ${jobType}`);

    let result;

    switch (jobType) {
      case 'nightly':
        result = await runNightlyUpdate();
        break;

      case 'weather':
        result = await checkWeatherAlerts();
        break;

      case 'permits':
        result = await checkPermitUpdates();
        break;

      case 'all':
        // Run all jobs
        const nightlyResult = await runNightlyUpdate();
        const weatherResult = await checkWeatherAlerts();
        const permitsResult = await checkPermitUpdates();
        
        result = {
          nightly: nightlyResult,
          weather: weatherResult,
          permits: permitsResult
        };
        break;

      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }

    return new Response(JSON.stringify({
      success: true,
      job: jobType,
      timestamp: new Date().toISOString(),
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Intelligence Scheduler error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        job: 'unknown',
        timestamp: new Date().toISOString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});