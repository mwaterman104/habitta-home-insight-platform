import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('GOOGLE_PLACES_API_KEY not configured');
    }

    const { input, sessionToken } = await req.json();
    
    if (!input || input.length < 3) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Miami-Dade location bias (25.7617, -80.1918)
    const params = new URLSearchParams({
      input,
      types: 'address',
      components: 'country:us',
      location: '25.7617,-80.1918',
      radius: '80000', // 80km to cover Miami-Dade
      key: GOOGLE_PLACES_API_KEY,
    });

    if (sessionToken) {
      params.append('sessiontoken', sessionToken);
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    console.log('[google-places-autocomplete] Fetching predictions for:', input);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[google-places-autocomplete] API error:', data.status, data.error_message);
      throw new Error(data.error_message || `Google Places API error: ${data.status}`);
    }

    // Transform to simplified format
    const predictions = (data.predictions || []).map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text || '',
      secondary_text: p.structured_formatting?.secondary_text || '',
    }));

    console.log('[google-places-autocomplete] Found', predictions.length, 'predictions');

    return new Response(
      JSON.stringify({ predictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[google-places-autocomplete] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message, predictions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
