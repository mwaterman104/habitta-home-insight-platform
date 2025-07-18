import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttomPropertyResponse {
  status: {
    version: string;
    code: number;
    msg: string;
    total: number;
  };
  property: Array<{
    identifier: {
      Id: string;
      fips: string;
    };
    address: {
      country: string;
      countrySubd: string;
      line1: string;
      line2: string;
      locality: string;
      matchCode: string;
      oneLine: string;
      postal1: string;
      postal2: string;
      postal3: string;
    };
    lot: {
      lotNum: string;
      lotSize1: number;
      lotSize2: number;
    };
    area: {
      countrysecsubd: string;
      locl: string;
      muncode: string;
      munnm: string;
      saleTransDate: string;
    };
    building: {
      construction: {
        constructionType: string;
      };
      parking: {
        prkgSize: number;
        prkgSpaces: string;
        prkgType: string;
      };
      rooms: {
        bathsFull: number;
        bathsHalf: number;
        bathsPartial: number;
        bathsTotal: number;
        beds: number;
        roomsTotal: number;
      };
      size: {
        bldgSize: number;
        grossSize: number;
        grossSizeAdjusted: number;
        groundFloorSize: number;
        livingSize: number;
        sizeInd: string;
        universalSize: number;
      };
      summary: {
        archStyle: string;
        bldgType: string;
        bldgQuality: string;
        levels: string;
        yearBuilt: number;
        yearBuiltEffective: number;
      };
    };
    vintage: {
      lastModified: string;
      pubDate: string;
    };
    sale: {
      amount: {
        saleAmt: number;
        saleAmtDescription: string;
        saleDisclosureType: string;
        saleTransType: string;
      };
      calculation: {
        pricePerSizeUnit: number;
      };
      salesSearchDate: string;
      transDate: string;
    };
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, endpoint = 'property/detail' } = await req.json();
    
    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const attomApiKey = Deno.env.get('ATTOM_API_KEY');
    if (!attomApiKey) {
      console.error('ATTOM_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Making Attom API request for address: ${address}`);
    
    // Construct URL with query parameters
    const searchParams = new URLSearchParams({
      address1: address,
    });
    
    const attomResponse = await fetch(`https://search.onboard-apis.com/propertyapi/v1.0.0/${endpoint}?${searchParams}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'apikey': attomApiKey,
      },
    });

    if (!attomResponse.ok) {
      console.error(`Attom API error: ${attomResponse.status} - ${attomResponse.statusText}`);
      const errorText = await attomResponse.text();
      console.error('Error response:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Attom API Error: ${attomResponse.status} - ${attomResponse.statusText}`,
          details: errorText 
        }),
        { 
          status: attomResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const attomData: AttomPropertyResponse = await attomResponse.json();
    
    console.log('Attom API response received:', {
      total: attomData.status?.total || 0,
      code: attomData.status?.code || 'unknown'
    });

    // Transform Attom data to match our PropertyHistory interface
    if (attomData.property && attomData.property.length > 0) {
      const property = attomData.property[0];
      
      const transformedData = {
        address: property.address?.oneLine || address,
        saleHistory: property.sale ? [{
          date: property.sale.transDate || new Date().toISOString(),
          price: property.sale.amount?.saleAmt || 0,
          type: property.sale.amount?.saleTransType || 'Unknown'
        }] : [],
        propertyDetails: {
          yearBuilt: property.building?.summary?.yearBuilt || 0,
          sqft: property.building?.size?.livingSize || property.building?.size?.bldgSize || 0,
          bedrooms: property.building?.rooms?.beds || 0,
          bathrooms: property.building?.rooms?.bathsTotal || 0,
          propertyType: property.building?.summary?.bldgType || 'Unknown'
        },
        lastUpdated: property.vintage?.lastModified || new Date().toISOString(),
        // Include raw Attom data for additional details
        _attomData: property
      };

      return new Response(
        JSON.stringify(transformedData),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'No property data found for the provided address',
          searchedAddress: address 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in attom-property function:', error);
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