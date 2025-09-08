import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const AUTH_ID = Deno.env.get("SMARTY_AUTH_ID")!;
const AUTH_TOKEN = Deno.env.get("SMARTY_AUTH_TOKEN")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const endpoints = {
  autocomplete: "https://us-autocomplete-pro.api.smarty.com/lookup",
  autocompleteFallback: "https://us-autocomplete.api.smarty.com/lookup",
};

serve(async (req) => {
  const stepId = crypto.randomUUID().slice(0, 8);
  console.log(`[${stepId}] Autocomplete request start:`, req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { search, limit = 8, cityFilter, stateFilter } = body;

    if (!search || search.length < 3) {
      return new Response(JSON.stringify({ 
        suggestions: [],
        message: "Query too short" 
      }), { 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    console.log(`[${stepId}] Query:`, { search, limit });

    const qs = (o: Record<string, string | number | boolean | undefined>) =>
      new URLSearchParams(
        Object.entries(o).reduce((acc, [k,v]) => {
          if (v !== undefined && v !== null) acc[k] = String(v);
          return acc;
        }, {} as Record<string,string>)
      ).toString();

    // Try Pro autocomplete first
    const proUrl = `${endpoints.autocomplete}?${qs({
      "auth-id": AUTH_ID,
      "auth-token": AUTH_TOKEN,
      search: search,
      include_only_cities: cityFilter,
      include_only_state: stateFilter,
      max_results: limit,
    })}`;
    
    console.log(`[${stepId}] Calling Pro autocomplete`);
    const proRes = await fetch(proUrl);
    const proJson = await proRes.json();

    // If Pro requires subscription, fall back to basic autocomplete
    if (proJson?.errors?.length) {
      console.log(`[${stepId}] Pro unavailable, falling back to basic`);
      const basicUrl = `${endpoints.autocompleteFallback}?${qs({
        "auth-id": AUTH_ID,
        "auth-token": AUTH_TOKEN,
        prefix: search,
        max_results: limit,
      })}`;
      
      const basicRes = await fetch(basicUrl);
      const basicJson = await basicRes.json();
      
      console.log(`[${stepId}] Basic autocomplete success`, basicJson?.suggestions?.length || 0, 'suggestions');
      return new Response(JSON.stringify(basicJson), { 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }
    
    console.log(`[${stepId}] Pro autocomplete success`, proJson?.suggestions?.length || 0, 'suggestions');
    return new Response(JSON.stringify(proJson), { 
      headers: { ...corsHeaders, "content-type": "application/json" } 
    });
    
  } catch (error) {
    console.error(`[${stepId}] Autocomplete error:`, error);
    return new Response(JSON.stringify({ 
      error: "Autocomplete service unavailable",
      suggestions: []
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "content-type": "application/json" } 
    });
  }
});