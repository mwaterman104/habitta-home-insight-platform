import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * property-enrichment: ATTOM property data enrichment
 * 
 * Internal function called by create-home via background task.
 * Fetches property details from ATTOM and updates homes table.
 * Chains to permit-enrichment when complete.
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
      console.error('[property-enrichment] Unauthorized: invalid or missing internal secret');
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

    console.log('[property-enrichment] Starting enrichment for home:', home_id);

    // 1. Fetch home record
    const { data: home, error: homeError } = await supabase
      .from('homes')
      .select('id, address, city, state, zip_code, year_built, square_feet')
      .eq('id', home_id)
      .single();

    if (homeError || !home) {
      throw new Error(`Home not found: ${home_id}`);
    }

    // 2. Check if already enriched (skip if we have both year_built AND square_feet)
    if (home.year_built && home.square_feet) {
      console.log('[property-enrichment] Home already enriched, skipping ATTOM call');
      // Still chain to permit-enrichment
      await chainToPermitEnrichment(supabase, home_id);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'already_enriched' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Call ATTOM for property details
    const fullAddress = `${home.address}, ${home.city}, ${home.state} ${home.zip_code}`;
    console.log('[property-enrichment] Calling ATTOM for:', fullAddress);

    let attomData = null;
    let attomError = null;

    try {
      const { data, error } = await supabase.functions.invoke('attom-property', {
        body: { address: fullAddress },
        headers: { 'x-internal-secret': expectedSecret },
      });

      if (error) {
        attomError = error;
        console.log('[property-enrichment] ATTOM error:', error);
      } else {
        attomData = data;
        console.log('[property-enrichment] ATTOM response received');
      }
    } catch (err) {
      console.log('[property-enrichment] ATTOM call failed:', err);
    }

    // 4. Extract and update home record
    let updated = false;
    if (attomData && !attomError) {
      const yearBuilt = attomData.propertyDetails?.yearBuilt || 
                        attomData._attomData?.summary?.yearbuilt ||
                        attomData._attomData?.building?.summary?.yearBuilt;
      
      const squareFeet = attomData.propertyDetails?.sqft ||
                         attomData._attomData?.building?.size?.livingsize ||
                         attomData._attomData?.building?.size?.bldgsize;

      const updates: any = {};
      if (yearBuilt && !home.year_built) {
        updates.year_built = yearBuilt;
      }
      if (squareFeet && !home.square_feet) {
        updates.square_feet = squareFeet;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('homes')
          .update(updates)
          .eq('id', home_id);

        if (!updateError) {
          updated = true;
          console.log('[property-enrichment] Updated home with:', updates);
        } else {
          console.error('[property-enrichment] Update error:', updateError);
        }
      }
    }

    // 5. Chain to permit-enrichment
    await chainToPermitEnrichment(supabase, home_id);

    console.log('[property-enrichment] Complete for home:', home_id);

    return new Response(
      JSON.stringify({
        success: true,
        home_id,
        updated,
        attom_data_found: !!attomData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[property-enrichment] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Chain to permit-enrichment function
 */
async function chainToPermitEnrichment(supabase: any, home_id: string) {
  const internalSecret = Deno.env.get('INTERNAL_ENRICH_SECRET');
  
  try {
    console.log('[property-enrichment] Chaining to permit-enrichment');
    const { error } = await supabase.functions.invoke('permit-enrichment', {
      body: { home_id },
      headers: { 'x-internal-secret': internalSecret },
    });

    if (error) {
      console.error('[property-enrichment] permit-enrichment chain error:', error);
    } else {
      console.log('[property-enrichment] permit-enrichment chain successful');
    }
  } catch (err) {
    console.error('[property-enrichment] permit-enrichment chain failed:', err);
  }
}
