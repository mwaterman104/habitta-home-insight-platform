import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Scheduled job for nightly intelligence updates
async function runNightlyUpdate() {
  console.log('Starting nightly intelligence update...');

  try {
    // Query the correct `homes` table, filter to live homes only
    const { data: homes, error } = await supabase
      .from('homes')
      .select('id')
      .eq('pulse_status', 'live')
      .limit(100);

    if (error) {
      console.error('Error fetching homes:', error);
      return { error: error.message };
    }

    let updateCount = 0;
    let errorCount = 0;

    for (const home of homes || []) {
      try {
        const { error: updateError } = await supabase.functions.invoke('intelligence-engine', {
          body: { action: 'predictions', home_id: home.id }
        });

        if (updateError) {
          console.error(`Error updating home ${home.id}:`, updateError);
          errorCount++;
        } else {
          updateCount++;
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.error(`Unexpected error updating home ${home.id}:`, err);
        errorCount++;
      }
    }

    console.log(`Nightly update complete: ${updateCount} updated, ${errorCount} errors`);

    return {
      success: true,
      updated: updateCount,
      errors: errorCount,
      message: `Updated ${updateCount} homes with ${errorCount} errors`,
    };

  } catch (err) {
    console.error('Nightly update failed:', err);
    return { error: 'Nightly update failed', details: err.message };
  }
}

// Weather alert monitoring — stub until NOAA integration is built
async function checkWeatherAlerts() {
  console.log('Weather alert check called (not yet implemented)');
  return { success: true, message: 'Weather alerts not yet implemented' };
}

// Permit monitoring — permit enrichment is handled by the permit-enrichment function
async function checkPermitUpdates() {
  console.log('Permit update check called');

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Check for homes with recent permit enrichment activity
    const { data: recentHomes, error } = await supabase
      .from('homes')
      .select('id')
      .gte('updated_at', yesterday.toISOString())
      .limit(50);

    if (error) {
      console.error('Error fetching recently updated homes:', error);
      return { error: error.message };
    }

    console.log(`Found ${recentHomes?.length || 0} recently updated homes`);

    return {
      success: true,
      homesChecked: recentHomes?.length || 0,
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

      case 'all': {
        const nightlyResult = await runNightlyUpdate();
        const weatherResult = await checkWeatherAlerts();
        const permitsResult = await checkPermitUpdates();

        result = {
          nightly: nightlyResult,
          weather: weatherResult,
          permits: permitsResult,
        };
        break;
      }

      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }

    return new Response(JSON.stringify({
      success: true,
      job: jobType,
      timestamp: new Date().toISOString(),
      result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Intelligence Scheduler error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        job: 'unknown',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
