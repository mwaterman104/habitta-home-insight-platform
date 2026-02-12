import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeAttom } from '../_shared/normalizeAttom.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Normalize parcel ID to digits only for reliable matching across systems
 * Returns null if the result is too short to be valid (< 6 digits)
 */
function normalizeFolio(folio: string | null | undefined): string | null {
  if (!folio) return null;
  const normalized = folio.replace(/[^0-9]/g, '');
  return normalized.length >= 6 ? normalized : null;
}

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

  // Extract home_id early so finally block can use it
  let home_id: string | null = null;
  let supabase: any = null;

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
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    home_id = body.home_id;

    if (!home_id) {
      throw new Error('home_id is required');
    }

    console.log('[property-enrichment] Starting enrichment for home:', home_id);

    // 1. Fetch home record
    const { data: home, error: homeError } = await supabase
      .from('homes')
      .select('id, address, city, state, zip_code, year_built, square_feet, year_built_effective, build_quality, arch_style, data_match_confidence, fips_code, gross_sqft, rooms_total, ground_floor_sqft, bedrooms, bathrooms, property_type')
      .eq('id', home_id)
      .single();

    if (homeError || !home) {
      throw new Error(`Home not found: ${home_id}`);
    }

    // 2. Check if already enriched (skip if we have year_built AND square_feet AND year_built_effective)
    if (home.year_built && home.square_feet && home.year_built_effective !== null) {
      console.log('[property-enrichment] Home already enriched, skipping ATTOM call');
      // Still chain to permit-enrichment (with timeout)
      await chainToPermitEnrichmentWithTimeout(supabase, home_id, expectedSecret);
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
      // Enhanced extraction with logging to trace data flow issues
      const yearBuilt = attomData.propertyDetails?.yearBuilt || 
                        attomData._attomData?.summary?.yearbuilt ||
                        attomData._attomData?.building?.summary?.yearBuilt;
      
      const squareFeet = attomData.propertyDetails?.sqft ||
                         attomData._attomData?.building?.size?.livingsize ||
                         attomData._attomData?.building?.size?.bldgsize;

      // DEFENSIVE FOLIO EXTRACTION
      const identifiers = attomData._attomData?.identifier || {};
      console.log('[property-enrichment] Raw ATTOM identifiers:', JSON.stringify(identifiers));
      
      const rawFolio = identifiers.apn || identifiers.parcelId || identifiers.alternateParcelId || null;
      const folio = normalizeFolio(rawFolio);
      
      if (rawFolio && !folio) {
        console.warn(`[property-enrichment] Folio normalized to null (raw: ${rawFolio})`);
      } else if (!rawFolio) {
        console.warn('[property-enrichment] No parcel identifier found in ATTOM response');
      } else {
        console.log(`[property-enrichment] Folio extracted: raw=${rawFolio}, normalized=${folio}`);
      }

      console.log('[property-enrichment] ATTOM extracted values:', {
        yearBuilt, squareFeet, folio,
        existingYearBuilt: home.year_built,
        existingSquareFeet: home.square_feet,
      });

      const updates: any = {};
      if (yearBuilt && !home.year_built) updates.year_built = yearBuilt;
      if (squareFeet && !home.square_feet) updates.square_feet = squareFeet;
      if (folio) {
        updates.folio = folio;
        updates.folio_source = 'attom';
      }

      // Extract bedrooms, bathrooms, property_type
      const rawProperty = attomData._attomData;
      const bedrooms = attomData.propertyDetails?.bedrooms ||
                       rawProperty?.building?.rooms?.beds || null;
      const bathsFull = rawProperty?.building?.rooms?.bathsfull || 0;
      const bathsHalf = rawProperty?.building?.rooms?.bathshalf || 0;
      const bathrooms = attomData.propertyDetails?.bathrooms ||
                        (bathsFull || bathsHalf ? bathsFull + bathsHalf * 0.5 : null);
      const propertyType = attomData.propertyDetails?.propertyType ||
                           rawProperty?.summary?.proptype || null;

      if (bedrooms && !home.bedrooms) updates.bedrooms = bedrooms;
      if (bathrooms && !home.bathrooms) updates.bathrooms = bathrooms;
      if (propertyType && !home.property_type) updates.property_type = propertyType;

      // Sprint 1: Extract and write-through new ATTOM fields via canonical normalizer
      if (rawProperty) {
        const normalized = normalizeAttom(rawProperty);
        if (normalized.effectiveYearBuilt && !home.year_built_effective) updates.year_built_effective = normalized.effectiveYearBuilt;
        if (normalized.buildQuality && !home.build_quality) updates.build_quality = normalized.buildQuality;
        if (normalized.archStyle && !home.arch_style) updates.arch_style = normalized.archStyle;
        if (normalized.dataMatchConfidence && !home.data_match_confidence) updates.data_match_confidence = normalized.dataMatchConfidence;
        if (normalized.fipsCode && !home.fips_code) updates.fips_code = normalized.fipsCode;
        if (normalized.grossSqft && !home.gross_sqft) updates.gross_sqft = normalized.grossSqft;
        if (normalized.roomsTotal && !home.rooms_total) updates.rooms_total = normalized.roomsTotal;
        if (normalized.groundFloorSqft && !home.ground_floor_sqft) updates.ground_floor_sqft = normalized.groundFloorSqft;
      }

      if (Object.keys(updates).length > 0) {
        console.log(`[property-enrichment] Updating home ${home_id} with:`, updates);
        const { error: updateError } = await supabase
          .from('homes')
          .update(updates)
          .eq('id', home_id);

        if (!updateError) {
          updated = true;
          console.log('[property-enrichment] Successfully updated home with:', updates);
        } else {
          console.error('[property-enrichment] FAILED to update home:', updateError);
        }
      }
    }

    // 5. Chain to permit-enrichment (with timeout)
    await chainToPermitEnrichmentWithTimeout(supabase, home_id, expectedSecret);

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
  } finally {
    // ALWAYS set pulse_status to 'live' — even if permit chain or ATTOM failed
    if (home_id && supabase) {
      try {
        console.log(`[property-enrichment] Setting pulse_status='live' for home: ${home_id}`);
        await supabase
          .from('homes')
          .update({ pulse_status: 'live' })
          .eq('id', home_id);
      } catch (finalErr) {
        console.error('[property-enrichment] Failed to set pulse_status in finally:', finalErr);
      }
    }
  }
});

/**
 * Chain to permit-enrichment with a 30-second timeout so it never hangs indefinitely
 */
async function chainToPermitEnrichmentWithTimeout(supabase: any, home_id: string, internalSecret: string | undefined) {
  try {
    console.log('[property-enrichment] Chaining to permit-enrichment (30s timeout)');
    const permitPromise = supabase.functions.invoke('permit-enrichment', {
      body: { home_id },
      headers: { 'x-internal-secret': internalSecret },
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('permit-enrichment timeout after 30s')), 30000)
    );

    const result = await Promise.race([permitPromise, timeoutPromise]) as any;
    if (result?.error) {
      console.error('[property-enrichment] permit-enrichment chain error:', result.error);
    } else {
      console.log('[property-enrichment] permit-enrichment chain successful');
    }
  } catch (err) {
    console.error('[property-enrichment] permit-enrichment chain failed/timed out:', err);
  }
}
