import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * backfill-home-coordinates
 * 
 * Dedicated edge function for geocoding homes with missing coordinates.
 * Called from dashboard when lat/lng are null.
 * 
 * Uses Smarty US Street API (more reliable DNS than rooftop endpoint).
 */
serve(async (req) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { home_id } = await req.json();

    if (!home_id) {
      console.error("[backfill-home-coordinates] Missing home_id");
      return new Response(
        JSON.stringify({ status: "failed", reason: "Missing home_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[backfill-home-coordinates] Starting for home: ${home_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch home record
    const { data: home, error: fetchError } = await supabase
      .from("homes")
      .select("id, address, city, state, zip_code, latitude, longitude")
      .eq("id", home_id)
      .single();

    if (fetchError || !home) {
      console.error(`[backfill-home-coordinates] Home not found: ${home_id}`, fetchError);
      return new Response(
        JSON.stringify({ status: "failed", reason: "Home not found", home_id }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Guard: skip if coordinates already exist
    if (home.latitude != null && home.longitude != null) {
      console.log(`[backfill-home-coordinates] Skipping - coords exist: ${home_id}`);
      return new Response(
        JSON.stringify({ 
          status: "noop", 
          reason: "Coordinates already exist",
          home_id,
          geo: { latitude: home.latitude, longitude: home.longitude }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!home.address || !home.city || !home.state) {
      console.error(`[backfill-home-coordinates] Incomplete address for home: ${home_id}`);
      return new Response(
        JSON.stringify({ status: "failed", reason: "Incomplete address data", home_id }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const AUTH_ID = Deno.env.get("SMARTY_AUTH_ID");
    const AUTH_TOKEN = Deno.env.get("SMARTY_AUTH_TOKEN");

    if (!AUTH_ID || !AUTH_TOKEN) {
      console.error("[backfill-home-coordinates] Smarty credentials not configured");
      return new Response(
        JSON.stringify({ status: "failed", reason: "Geocoding service not configured", home_id }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use US Street API - returns coordinates in metadata and has reliable DNS
    const streetParams = new URLSearchParams({
      "auth-id": AUTH_ID,
      "auth-token": AUTH_TOKEN,
      street: home.address,
      city: home.city,
      state: home.state,
      zipcode: home.zip_code || "",
      candidates: "1",
    });

    const streetUrl = `https://us-street.api.smarty.com/street-address?${streetParams.toString()}`;
    
    console.log(`[backfill-home-coordinates] Calling Smarty US Street for: ${home.address}, ${home.city}, ${home.state}`);

    const streetResponse = await fetch(streetUrl);
    const streetData = await streetResponse.json();

    const latency = Date.now() - startTime;
    console.log(`[backfill-home-coordinates] Smarty response: ${streetResponse.status}, ${latency}ms`);

    // US Street API returns metadata.latitude/longitude
    const latitude = streetData?.[0]?.metadata?.latitude;
    const longitude = streetData?.[0]?.metadata?.longitude;

    if (!latitude || !longitude) {
      console.error(`[backfill-home-coordinates] No coordinates in response for home: ${home_id}`, streetData);
      return new Response(
        JSON.stringify({ status: "failed", reason: "Geocoding returned no coordinates", home_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update home record
    const { error: updateError } = await supabase
      .from("homes")
      .update({
        latitude,
        longitude,
        geo_source: "smarty_backfill",
        geo_updated_at: new Date().toISOString(),
      })
      .eq("id", home_id);

    if (updateError) {
      console.error(`[backfill-home-coordinates] Failed to update home: ${home_id}`, updateError);
      return new Response(
        JSON.stringify({ status: "failed", reason: "Database update failed", home_id }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalLatency = Date.now() - startTime;
    console.log(`[backfill-home-coordinates] Updated home: ${home_id} with lat=${latitude}, lng=${longitude} (${totalLatency}ms)`);

    return new Response(
      JSON.stringify({
        status: "success",
        home_id,
        geo: { latitude, longitude },
        latency_ms: totalLatency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[backfill-home-coordinates] Unexpected error:", error);
    return new Response(
      JSON.stringify({ status: "failed", reason: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
