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
    const url = new URL(req.url);
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const zoom = url.searchParams.get('zoom') || '15';
    const size = url.searchParams.get('size') || '400x200';
    const maptype = url.searchParams.get('maptype') || 'roadmap';
    const scale = url.searchParams.get('scale') || '2'; // Retina support

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Map service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log(`Fetching static map for coordinates: ${lat}, ${lng}`);

    // Fetch the image from Google
    const mapResponse = await fetch(staticMapUrl.toString());

    if (!mapResponse.ok) {
      const errorText = await mapResponse.text();
      console.error('Google Maps API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch map image' }),
        { status: mapResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the image with appropriate headers
    const imageBuffer = await mapResponse.arrayBuffer();
    
    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });

  } catch (error) {
    console.error('Error in google-static-map function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
