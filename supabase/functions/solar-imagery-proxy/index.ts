import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl } = await req.json()
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl parameter' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    console.log(`Proxying image request: ${imageUrl}`)

    // Fetch the GeoTIFF image from Google's Solar API
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${response.statusText}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: response.status 
        }
      )
    }

    // Get the image data as ArrayBuffer
    const imageData = await response.arrayBuffer()
    
    console.log(`Successfully proxied image: ${imageData.byteLength} bytes`)

    // Return the image data with proper CORS headers
    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'image/tiff',
        'Content-Length': imageData.byteLength.toString(),
      },
    })

  } catch (error) {
    console.error('Error in solar imagery proxy:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})