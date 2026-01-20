import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

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

    const { place_id, sessionToken } = await req.json();
    
    if (!place_id) {
      return new Response(
        JSON.stringify({ error: 'place_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const params = new URLSearchParams({
      place_id,
      fields: 'address_components,geometry,formatted_address,name',
      key: GOOGLE_PLACES_API_KEY,
    });

    if (sessionToken) {
      params.append('sessiontoken', sessionToken);
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
    console.log('[google-places-details] Fetching details for place_id:', place_id);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('[google-places-details] API error:', data.status, data.error_message);
      throw new Error(data.error_message || `Google Places API error: ${data.status}`);
    }

    const result = data.result;
    const components: AddressComponent[] = result.address_components || [];

    // Extract structured address components
    const getComponent = (types: string[]): string => {
      const comp = components.find((c: AddressComponent) => 
        types.some(t => c.types.includes(t))
      );
      return comp?.long_name || '';
    };

    const getComponentShort = (types: string[]): string => {
      const comp = components.find((c: AddressComponent) => 
        types.some(t => c.types.includes(t))
      );
      return comp?.short_name || '';
    };

    const structured = {
      street_number: getComponent(['street_number']),
      street_name: getComponent(['route']),
      city: getComponent(['locality', 'sublocality', 'sublocality_level_1']),
      county: getComponent(['administrative_area_level_2']),
      state: getComponentShort(['administrative_area_level_1']),
      state_full: getComponent(['administrative_area_level_1']),
      postal_code: getComponent(['postal_code']),
      country: getComponentShort(['country']),
    };

    const address_line1 = structured.street_number 
      ? `${structured.street_number} ${structured.street_name}`
      : structured.street_name;

    const placeDetails = {
      place_id,
      formatted_address: result.formatted_address,
      address_line1,
      city: structured.city,
      state: structured.state,
      postal_code: structured.postal_code,
      county: structured.county,
      country: structured.country || 'US',
      lat: result.geometry?.location?.lat,
      lng: result.geometry?.location?.lng,
      components: result.address_components,
      geometry: result.geometry,
    };

    console.log('[google-places-details] Extracted:', {
      address: address_line1,
      city: structured.city,
      state: structured.state,
      lat: placeDetails.lat,
      lng: placeDetails.lng,
    });

    return new Response(
      JSON.stringify(placeDetails),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[google-places-details] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
