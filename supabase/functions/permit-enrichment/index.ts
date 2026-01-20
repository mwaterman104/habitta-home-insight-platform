import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * permit-enrichment: Shovels permit data enrichment wrapper
 * 
 * Internal function called by property-enrichment via chain.
 * Invokes shovels-permits, reads HVAC signal, updates confidence.
 * Chains to intelligence-engine when complete.
 * 
 * Security: Internal secret header required
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate internal secret
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = Deno.env.get('INTERNAL_ENRICH_SECRET');
    
    if (!expectedSecret || internalSecret !== expectedSecret) {
      console.error('[permit-enrichment] Unauthorized: invalid or missing internal secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { home_id } = await req.json();

    if (!home_id) {
      throw new Error('home_id is required');
    }

    console.log('[permit-enrichment] Starting permit enrichment for home:', home_id);

    // 1. Fetch home record
    const { data: home, error: homeError } = await supabase
      .from('homes')
      .select('id, address, city, state, zip_code, year_built, user_id')
      .eq('id', home_id)
      .single();

    if (homeError || !home) {
      throw new Error(`Home not found: ${home_id}`);
    }

    // 2. Call shovels-permits
    const fullAddress = `${home.address}, ${home.city}, ${home.state} ${home.zip_code}`;
    console.log('[permit-enrichment] Calling shovels-permits for:', fullAddress);

    let shovelsResult = null;
    try {
      const { data, error } = await supabase.functions.invoke('shovels-permits', {
        body: {
          address: fullAddress,
          homeId: home_id,
        },
        headers: { 'x-internal-secret': expectedSecret },
      });

      if (error) {
        console.log('[permit-enrichment] shovels-permits error:', error);
      } else {
        shovelsResult = data;
        console.log('[permit-enrichment] shovels-permits result:', {
          success: shovelsResult?.success,
          permitsInserted: shovelsResult?.permitsInserted,
          hvac_permit_found: shovelsResult?.hvac_permit_found,
        });
      }
    } catch (err) {
      console.error('[permit-enrichment] shovels-permits call failed:', err);
    }

    // 3. Read HVAC enrichment signal from shovels response
    const hvacPermitFound = shovelsResult?.hvac_permit_found || false;
    const hvacInstallYear = shovelsResult?.hvac_install_year || null;
    const permitsInserted = shovelsResult?.permitsInserted || 0;

    console.log('[permit-enrichment] HVAC signal:', { hvacPermitFound, hvacInstallYear });

    // 4. Recalculate confidence using centralized logic
    const { data: systemData } = await supabase
      .from('systems')
      .select('install_source, install_year')
      .eq('home_id', home_id)
      .eq('kind', 'hvac')
      .single();

    const { count: permitsCount } = await supabase
      .from('permits')
      .select('*', { count: 'exact', head: true })
      .eq('home_id', home_id);

    // Calculate confidence
    let confidence = 30; // Base: address only
    if (home.year_built) confidence += 10;
    if (systemData?.install_source === 'permit') confidence += 25;
    else if (systemData?.install_source === 'user') confidence += 20;
    if (permitsCount && permitsCount > 0) confidence += 5;
    confidence = Math.min(confidence, 85);

    // 5. Update home with confidence and pulse_status
    const { error: updateError } = await supabase
      .from('homes')
      .update({
        confidence,
        pulse_status: 'live',
      })
      .eq('id', home_id);

    if (updateError) {
      console.error('[permit-enrichment] Error updating home:', updateError);
    } else {
      console.log('[permit-enrichment] Updated home confidence to:', confidence);
    }

    // 6. Chain to intelligence-engine (only if we have meaningful data)
    const shouldTriggerIntelligence = hvacPermitFound || permitsInserted > 0 || home.year_built;
    
    if (shouldTriggerIntelligence) {
      await chainToIntelligenceEngine(supabase, home_id, 'permit_enriched');
    } else {
      console.log('[permit-enrichment] Skipping intelligence-engine (no significant data)');
    }

    console.log('[permit-enrichment] Complete for home:', home_id);

    return new Response(
      JSON.stringify({
        success: true,
        home_id,
        confidence,
        hvac_permit_found: hvacPermitFound,
        hvac_install_year: hvacInstallYear,
        permits_inserted: permitsInserted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[permit-enrichment] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Chain to intelligence-engine function
 */
async function chainToIntelligenceEngine(supabase: any, home_id: string, reason: string) {
  const internalSecret = Deno.env.get('INTERNAL_ENRICH_SECRET');
  
  try {
    console.log('[permit-enrichment] Chaining to intelligence-engine with reason:', reason);
    const { error } = await supabase.functions.invoke('intelligence-engine', {
      body: {
        action: 'predictions',
        property_id: home_id,
        home_id,
        reason,
      },
      headers: { 'x-internal-secret': internalSecret },
    });

    if (error) {
      console.error('[permit-enrichment] intelligence-engine chain error:', error);
    } else {
      console.log('[permit-enrichment] intelligence-engine chain successful');
    }
  } catch (err) {
    console.error('[permit-enrichment] intelligence-engine chain failed:', err);
  }
}
