// Google Static Map Proxy - Fetches map images from Google Maps Static API
// This edge function proxies requests to keep the API key secure

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('[google-static-map] Request received');
  
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
    const scale = url.searchParams.get('scale') || '2';

    console.log(`[google-static-map] Params: lat=${lat}, lng=${lng}, zoom=${zoom}, size=${size}`);

    if (!lat || !lng) {
      console.log('[google-static-map] Missing lat/lng');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('[google-static-map] GOOGLE_PLACES_API_KEY not configured');
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

    console.log(`[google-static-map] Fetching map for: ${lat}, ${lng}`);

    // Fetch the image from Google
    const mapResponse = await fetch(staticMapUrl.toString());

    if (!mapResponse.ok) {
      const errorText = await mapResponse.text();
      console.error('[google-static-map] Google API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch map image' }),
        { status: mapResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate content-type to catch error pages returned as 200
    const contentType = mapResponse.headers.get('content-type');
    if (!contentType?.includes('image/')) {
      console.error('[google-static-map] Invalid content-type:', contentType);
      return new Response(
        JSON.stringify({ error: 'Invalid map response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the image with appropriate headers
    const imageBuffer = await mapResponse.arrayBuffer();

    // Sanity check: Google error images are very small (< 1KB)
    if (imageBuffer.byteLength < 1024) {
      console.error('[google-static-map] Suspiciously small image:', imageBuffer.byteLength, 'bytes');
      return new Response(
        JSON.stringify({ error: 'Map service returned invalid image' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[google-static-map] Success, returning ${imageBuffer.byteLength} bytes`);
    
    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (error) {
    console.error('[google-static-map] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
