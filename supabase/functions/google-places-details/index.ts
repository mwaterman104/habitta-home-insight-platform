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

    const url = new URL(req.url);
    
    // Check if this is a static map request (GET with lat/lng params)
    if (req.method === 'GET' && url.searchParams.has('lat') && url.searchParams.has('lng')) {
      return handleStaticMap(url, GOOGLE_PLACES_API_KEY);
    }

    // Otherwise, handle place details (POST)
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

    const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
    console.log('[google-places-details] Fetching details for place_id:', place_id);

    const response = await fetch(apiUrl);
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

/**
 * Handle static map image requests
 * GET /google-places-details?lat=...&lng=...&zoom=15&size=640x360
 */
async function handleStaticMap(url: URL, apiKey: string): Promise<Response> {
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const zoom = url.searchParams.get('zoom') || '15';
  const size = url.searchParams.get('size') || '400x200';
  const maptype = url.searchParams.get('maptype') || 'roadmap';
  const scale = url.searchParams.get('scale') || '2';

  console.log(`[google-places-details/staticMap] Params: lat=${lat}, lng=${lng}, zoom=${zoom}, size=${size}`);

  if (!lat || !lng) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: lat, lng' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Build Google Static Maps URL
  const staticMapUrl = new URL('https://maps.googleapis.com/maps/api/staticmap');
  staticMapUrl.searchParams.set('center', `${lat},${lng}`);
  staticMapUrl.searchParams.set('zoom', zoom);
  staticMapUrl.searchParams.set('size', size);
  staticMapUrl.searchParams.set('scale', scale);
  staticMapUrl.searchParams.set('maptype', maptype);
  staticMapUrl.searchParams.set('markers', `color:red|${lat},${lng}`);
  staticMapUrl.searchParams.set('key', apiKey);

  console.log(`[google-places-details/staticMap] Fetching map for: ${lat}, ${lng}`);

  const mapResponse = await fetch(staticMapUrl.toString());

  if (!mapResponse.ok) {
    const errorText = await mapResponse.text();
    console.error('[google-places-details/staticMap] Google API error:', errorText);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch map image' }),
      { status: mapResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const imageBuffer = await mapResponse.arrayBuffer();
  console.log(`[google-places-details/staticMap] Success, returning ${imageBuffer.byteLength} bytes`);
  
  return new Response(imageBuffer, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
