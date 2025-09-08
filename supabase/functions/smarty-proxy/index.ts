import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AUTH_ID = Deno.env.get("SMARTY_AUTH_ID")!;
const AUTH_TOKEN = Deno.env.get("SMARTY_AUTH_TOKEN")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const endpoints = {
  autocomplete: "https://us-autocomplete-pro.api.smarty.com/lookup",
  street: "https://us-street.api.smarty.com/street-address",
  rooftop: "https://us-rooftop-geo.api.smarty.com/lookup",
  enrich: "https://us-enrichment.api.smarty.com/lookup",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    const { action, payload } = await req.json();
    console.log('Smarty proxy request:', { action, userId: user.id });

    const qs = (o: Record<string, string | number | boolean | undefined>) =>
      new URLSearchParams(
        Object.entries(o).reduce((acc, [k,v]) => {
          if (v !== undefined && v !== null) acc[k] = String(v);
          return acc;
        }, {} as Record<string,string>)
      ).toString();

    if (action === "autocomplete") {
      const url = `${endpoints.autocomplete}?${qs({
        "auth-id": AUTH_ID,
        "auth-token": AUTH_TOKEN,
        search: payload.search,
        include_only_cities: payload.cityFilter,
        include_only_state: payload.stateFilter,
        max_results: payload.limit ?? 8,
      })}`;
      
      console.log('Calling Smarty autocomplete');
      const r = await fetch(url);
      const data = await r.text();
      
      return new Response(data, { 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    if (action === "standardize_geocode") {
      console.log('Calling Smarty standardize + geocode');
      
      // 1) Standardize address (US Street)
      const std = await fetch(`${endpoints.street}?${qs({
        "auth-id": AUTH_ID,
        "auth-token": AUTH_TOKEN,
        street: payload.street,
        city: payload.city,
        state: payload.state,
        zipcode: payload.postal_code,
        candidates: 1
      })}`);
      const standardized = await std.json();

      // 2) Rooftop geocode
      const geo = await fetch(`${endpoints.rooftop}?${qs({
        "auth-id": AUTH_ID,
        "auth-token": AUTH_TOKEN,
        street: payload.street,
        city: payload.city,
        state: payload.state,
        zipcode: payload.postal_code
      })}`);
      const geocode = await geo.json();

      return new Response(JSON.stringify({ standardized, geocode }), { 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    if (action === "enrich") {
      console.log('Calling Smarty enrichment');
      
      const enr = await fetch(`${endpoints.enrich}?${qs({
        "auth-id": AUTH_ID,
        "auth-token": AUTH_TOKEN,
        street: payload.street,
        city: payload.city,
        state: payload.state,
        zipcode: payload.postal_code
      })}`);
      const enrichment = await enr.json();
      
      return new Response(JSON.stringify(enrichment), { 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { 
      status: 400, 
      headers: { ...corsHeaders, "content-type": "application/json" } 
    });
    
  } catch (e) {
    console.error('Smarty proxy error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 500, 
      headers: { ...corsHeaders, "content-type": "application/json" } 
    });
  }
});