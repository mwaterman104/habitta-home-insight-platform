import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * create-home: Canonical home lifecycle start function
 * 
 * Creates property record immediately on address selection.
 * Generates instant snapshot for immediate Home Pulse display.
 * Triggers background enrichment without blocking.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const {
      address_line1,
      city,
      state,
      postal_code,
      place_id,
      lat,
      lng,
      formatted_address,
      components,
      geometry,
    } = body;

    console.log('[create-home] Creating home for user:', user.id);
    console.log('[create-home] Address:', address_line1, city, state);

    // Validate required fields
    if (!address_line1 || !city || !state) {
      throw new Error('Missing required address fields');
    }

    // 1. Create homes record immediately
    const { data: home, error: homeError } = await supabase
      .from('homes')
      .insert({
        user_id: user.id,
        address: address_line1,
        city,
        state,
        zip_code: postal_code || '',
        latitude: lat,
        longitude: lng,
        place_id,
        pulse_status: 'initializing',
        confidence: 35, // Start low by design
      })
      .select()
      .single();

    if (homeError) {
      console.error('[create-home] Error creating home:', homeError);
      throw homeError;
    }

    console.log('[create-home] Created home:', home.id);

    // 2. Store address provenance
    await supabase
      .from('property_address_source')
      .insert({
        home_id: home.id,
        source: 'google_places',
        raw_address: formatted_address || `${address_line1}, ${city}, ${state} ${postal_code}`,
        place_id,
        components,
        geometry,
      });

    // 3. Generate instant snapshot (heuristics for Miami-Dade)
    const isMiamiDade = state === 'FL' && (
      city.toLowerCase().includes('miami') ||
      (lat && lng && lat > 25.0 && lat < 26.5 && lng > -81.0 && lng < -80.0)
    );

    const snapshot = {
      home_id: home.id,
      cooling_type: isMiamiDade ? 'central_ac' : 'central_ac',
      climate_stress: isMiamiDade ? 'high' : 'moderate',
      roof_type: isMiamiDade ? 'tile' : 'asphalt_shingle', // Miami typical
      roof_age_band: 'unknown', // Will be enriched
      confidence_score: 35,
    };

    const { error: snapshotError } = await supabase
      .from('property_snapshot')
      .insert(snapshot);

    if (snapshotError) {
      console.error('[create-home] Error creating snapshot:', snapshotError);
    }

    // 4. Create inferred HVAC system (Miami = central AC likely)
    const { data: hvacSystem, error: systemError } = await supabase
      .from('systems')
      .insert({
        user_id: user.id,
        home_id: home.id,
        kind: 'hvac',
        status: 'UNKNOWN',
        confidence: 0.3,
        install_source: 'inferred',
        material: isMiamiDade ? 'central_ac' : 'central_ac',
      })
      .select()
      .single();

    if (systemError) {
      console.error('[create-home] Error creating HVAC system:', systemError);
    }

    // 5. Update pulse_status to 'enriching' and trigger background jobs
    await supabase
      .from('homes')
      .update({ pulse_status: 'enriching' })
      .eq('id', home.id);

    // 6. Trigger background enrichment (non-blocking)
    // Fire and forget - don't await
    supabase.functions.invoke('shovels-permits', {
      body: {
        address: address_line1,
        city,
        state,
        zip: postal_code,
        homeId: home.id,
      },
    }).then(res => {
      console.log('[create-home] Shovels permits triggered:', res.data ? 'success' : 'no data');
    }).catch(err => {
      console.error('[create-home] Shovels permits error:', err);
    });

    console.log('[create-home] Complete, returning response');

    // 7. Return immediate response for frontend
    return new Response(
      JSON.stringify({
        success: true,
        home_id: home.id,
        hvac_system_id: hvacSystem?.id,
        snapshot: {
          city,
          state,
          roof_type: snapshot.roof_type,
          roof_age_band: snapshot.roof_age_band,
          cooling_type: snapshot.cooling_type,
          climate_stress: snapshot.climate_stress,
        },
        confidence: 35,
        confidence_summary: 'Based on available public data',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-home] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
