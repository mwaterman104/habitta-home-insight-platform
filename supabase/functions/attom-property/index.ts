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
    // Check for internal secret (for chained calls from enrichment pipeline)
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = Deno.env.get('INTERNAL_ENRICH_SECRET');
    const isInternalCall = expectedSecret && internalSecret === expectedSecret;
    
    if (isInternalCall) {
      console.log('[attom-property] Internal call validated via secret');
    }
    
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
    
    // Parse address into components
    // For Attom API: address1 = street, address2 = city state zip
    const addressParts = address.split(',').map(part => part.trim());
    
    let address1, address2;
    
    if (addressParts.length >= 2) {
      // Full address with commas: "123 Main St, City, State Zip"
      address1 = addressParts[0];
      address2 = addressParts.slice(1).join(', ');
    } else {
      // Single string - try to parse by common patterns
      const addressStr = address.trim();
      const stateZipMatch = addressStr.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
      const cityStateMatch = addressStr.match(/^(.+?)\s+(.+?)\s+([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/i);
      
      if (stateZipMatch) {
        // Pattern: "123 Main St City State Zip"
        const parts = stateZipMatch[1].split(' ');
        const cityStartIndex = parts.findIndex(part => 
          part.toLowerCase() !== 'st' && 
          part.toLowerCase() !== 'ave' && 
          part.toLowerCase() !== 'rd' && 
          part.toLowerCase() !== 'dr' &&
          part.toLowerCase() !== 'ln' &&
          part.toLowerCase() !== 'blvd' &&
          /^[A-Z]/i.test(part)
        );
        
        if (cityStartIndex > 0) {
          address1 = parts.slice(0, cityStartIndex).join(' ');
          address2 = `${parts.slice(cityStartIndex).join(' ')} ${stateZipMatch[2]} ${stateZipMatch[3]}`;
        } else {
          address1 = addressStr;
          address2 = '';
        }
      } else {
        // Fallback: treat entire string as address1
        address1 = addressStr;
        address2 = '';
      }
    }
    
    console.log(`Parsed address - Address1: "${address1}", Address2: "${address2}"`);
    
    // Validate that we have meaningful address components
    if (!address1 || address1.length < 3) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid address format. Please provide a complete address with street, city, state, and zip code.',
          example: 'Example: 123 Main St, Springfield, IL 62704'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Construct URL with query parameters
    const searchParams = new URLSearchParams({
      address1: address1,
      address2: address2,
    });
    
    // Use ATTOM's current API gateway endpoint
    const attomUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/${endpoint}?${searchParams}`;
    console.log('[attom-property] Calling ATTOM API:', attomUrl.replace(attomApiKey, '***'));
    
    const attomResponse = await fetch(attomUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
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
      code: attomData.status?.code || 'unknown',
      msg: attomData.status?.msg || 'unknown'
    });

    // Handle "SuccessWithoutResult" - this is Attom's way of saying no data found
    if (attomData.status?.msg === 'SuccessWithoutResult' || attomData.status?.total === 0) {
      console.log(`No Attom data found for address: ${address}`);
      return new Response(
        JSON.stringify({ 
          error: 'No property data found in Attom database',
          searchedAddress: address,
          attomStatus: attomData.status
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Raw property data sample:', JSON.stringify(attomData.property?.[0], null, 2));

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
          yearBuilt: property.summary?.yearbuilt || property.building?.summary?.yearBuilt || 0,
          sqft: property.building?.size?.livingsize || property.building?.size?.bldgsize || property.building?.size?.bldgSize || 0,
          bedrooms: property.building?.rooms?.beds || 0,
          bathrooms: property.building?.rooms?.bathstotal || property.building?.rooms?.bathsTotal || 0,
          propertyType: property.summary?.propertyType || property.building?.summary?.bldgType || 'Unknown'
        },
        // Enhanced property details
        extendedDetails: {
          lot: {
            sizeAcres: property.lot?.lotsize1 || 0,
            sizeSqFt: property.lot?.lotsize2 || 0,
            hasPool: property.lot?.poolind === 'YES'
          },
          building: {
            condition: property.building?.construction?.condition || 'Unknown',
            quality: property.building?.summary?.quality || 'Unknown',
            constructionType: property.building?.construction?.constructiontype || 'Unknown',
            roofMaterial: property.building?.construction?.roofcover || 'Unknown',
            wallType: property.building?.construction?.wallType || 'Unknown',
            levels: property.building?.summary?.levels || 0,
            garageSize: property.building?.parking?.prkgSize || 0
          },
          utilities: {
            cooling: property.utilities?.coolingtype || 'Unknown',
            heatingFuel: property.utilities?.heatingfuel || 'Unknown',
            heatingType: property.utilities?.heatingtype || 'Unknown'
          },
          location: {
            latitude: parseFloat(property.location?.latitude) || 0,
            longitude: parseFloat(property.location?.longitude) || 0,
            subdivision: property.area?.subdname || '',
            municipality: property.area?.munname || ''
          },
          ownership: {
            ownerOccupied: property.summary?.absenteeInd === 'OWNER OCCUPIED',
            propertyClass: property.summary?.propclass || 'Unknown',
            landUse: property.summary?.propLandUse || 'Unknown'
          },
          assessment: {
            apn: property.identifier?.apn || '',
            taxCode: property.area?.taxcodearea || ''
          }
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