import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  url: string;
  options?: {
    formats?: string[];
    includeTags?: string[];
    excludeTags?: string[];
    onlyMainContent?: boolean;
    timeout?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, options = {} } = await req.json() as ScrapeRequest;
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Firecrawl API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Starting Firecrawl scrape for URL: ${url}`);
    
    // Prepare Firecrawl request payload
    const firecrawlPayload = {
      url: url,
      formats: options.formats || ['markdown', 'html'],
      includeTags: options.includeTags || [],
      excludeTags: options.excludeTags || ['nav', 'footer', 'header', 'script', 'style'],
      onlyMainContent: options.onlyMainContent || true,
      timeout: options.timeout || 30000
    };

    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firecrawlPayload),
    });

    if (!firecrawlResponse.ok) {
      console.error(`Firecrawl API error: ${firecrawlResponse.status} - ${firecrawlResponse.statusText}`);
      const errorText = await firecrawlResponse.text();
      console.error('Error response:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Firecrawl API Error: ${firecrawlResponse.status} - ${firecrawlResponse.statusText}`,
          details: errorText 
        }),
        { 
          status: firecrawlResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const firecrawlData = await firecrawlResponse.json();
    
    console.log('Firecrawl scrape completed successfully:', {
      url: url,
      dataLength: firecrawlData.data?.content?.length || 0,
      success: firecrawlData.success
    });

    // Transform the response to a consistent format
    const transformedData = {
      success: firecrawlData.success || false,
      url: url,
      title: firecrawlData.data?.metadata?.title || '',
      description: firecrawlData.data?.metadata?.description || '',
      content: {
        markdown: firecrawlData.data?.markdown || '',
        html: firecrawlData.data?.html || '',
        text: firecrawlData.data?.content || ''
      },
      metadata: {
        ...firecrawlData.data?.metadata,
        scrapedAt: new Date().toISOString(),
        sourceUrl: url
      },
      links: firecrawlData.data?.links || [],
      images: firecrawlData.data?.metadata?.ogImage ? [firecrawlData.data.metadata.ogImage] : []
    };

    return new Response(
      JSON.stringify(transformedData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in firecrawl-scrape function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});