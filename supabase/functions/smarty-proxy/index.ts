import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AUTH_ID = Deno.env.get("SMARTY_AUTH_ID")!;
const AUTH_TOKEN = Deno.env.get("SMARTY_AUTH_TOKEN")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const endpoints = {
  street: "https://us-street.api.smarty.com/street-address",
  rooftop: "https://us-rooftop-geo.api.smarty.com/lookup",
  enrich: "https://us-enrichment.api.smarty.com/lookup",
};

serve(async (req) => {
  const stepId = crypto.randomUUID().slice(0, 8);
  console.log(`[${stepId}] Smarty-proxy request:`, req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log(`[${stepId}] Missing auth header`);
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error(`[${stepId}] Auth error:`, userError);
      throw new Error('Unauthorized');
    }

    const { action, payload } = await req.json();
    console.log(`[${stepId}] Action:`, action, 'User:', user.id);

    const qs = (o: Record<string, string | number | boolean | undefined>) =>
      new URLSearchParams(
        Object.entries(o).reduce((acc, [k,v]) => {
          if (v !== undefined && v !== null) acc[k] = String(v);
          return acc;
        }, {} as Record<string,string>)
      ).toString();

    if (action === "standardize_geocode") {
      console.log(`[${stepId}] Calling standardize + geocode`);
      
      // Validate required fields
      if (!payload.street || !payload.city || !payload.state) {
        throw new Error('Missing required address fields');
      }
      
      // 1) Standardize address (US Street)
      const stdUrl = `${endpoints.street}?${qs({
        "auth-id": AUTH_ID,
        "auth-token": AUTH_TOKEN,
        street: payload.street,
        city: payload.city,
        state: payload.state,
        zipcode: payload.postal_code,
        candidates: 1
      })}`;
      
      const stdRes = await fetch(stdUrl);
      if (!stdRes.ok) {
        throw new Error(`Standardization failed: ${stdRes.status}`);
      }
      const standardized = await stdRes.json();

      // 2) Rooftop geocode
      const geoUrl = `${endpoints.rooftop}?${qs({
        "auth-id": AUTH_ID,
        "auth-token": AUTH_TOKEN,
        street: payload.street,
        city: payload.city,
        state: payload.state,
        zipcode: payload.postal_code
      })}`;
      
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) {
        console.warn(`[${stepId}] Geocoding failed: ${geoRes.status}`);
      }
      const geocode = geoRes.ok ? await geoRes.json() : [];

      const latency = Date.now() - startTime;
      console.log(`[${stepId}] Standardize+geocode complete:`, latency + 'ms');
      
      return new Response(JSON.stringify({ standardized, geocode }), { 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    if (action === "enrich") {
      console.log(`[${stepId}] Calling enrichment`);
      
      // Validate required fields
      if (!payload.street || !payload.city || !payload.state) {
        throw new Error('Missing required address fields for enrichment');
      }
      
      const enrUrl = `${endpoints.enrich}?${qs({
        "auth-id": AUTH_ID,
        "auth-token": AUTH_TOKEN,
        street: payload.street,
        city: payload.city,
        state: payload.state,
        zipcode: payload.postal_code
      })}`;
      
      const enrRes = await fetch(enrUrl);
      if (!enrRes.ok) {
        throw new Error(`Enrichment failed: ${enrRes.status}`);
      }
      const enrichment = await enrRes.json();
      
      const latency = Date.now() - startTime;
      console.log(`[${stepId}] Enrichment complete:`, latency + 'ms', 'records:', enrichment?.length || 0);
      
      return new Response(JSON.stringify(enrichment), { 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    console.log(`[${stepId}] Unknown action:`, action);
    return new Response(JSON.stringify({ 
      error: "Unknown action. Supported: standardize_geocode, enrich" 
    }), { 
      status: 400, 
      headers: { ...corsHeaders, "content-type": "application/json" } 
    });
    
  } catch (error) {
    console.error(`[${stepId}] Smarty proxy error:`, error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      stepId 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "content-type": "application/json" } 
    });
  }
});