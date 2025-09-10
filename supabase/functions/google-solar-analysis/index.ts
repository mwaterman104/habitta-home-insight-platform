import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SolarApiRequest {
  latitude: number;
  longitude: number;
  addressId?: string;
}

interface SolarApiResponse {
  solarPotential: {
    maxArrayPanelsCount: number;
    maxArrayAreaMeters2: number;
    maxSunshineHoursPerYear: number;
    carbonOffsetFactorKgPerMwh: number;
  };
  solarPanelConfigs: Array<{
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    roofSegmentSummaries: Array<{
      pitchDegrees: number;
      azimuthDegrees: number;
      panelsCount: number;
      yearlyEnergyDcKwh: number;
    }>;
  }>;
  financialAnalyses: Array<{
    monthlyBill: {
      currencyCode: string;
      units: number;
    };
    panelsCount: number;
    initialAcKwhPerYear: number;
    lifetimeSolarGeneration: number;
    presentValueOfSavingsYear20: number;
    presentValueSavingsLifetime: number;
    paybackYears: number;
  }>;
  roofSegmentStats: Array<{
    pitchDegrees: number;
    azimuthDegrees: number;
    areaMeters2: number;
    sunshineQuantiles: number[];
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { latitude, longitude, addressId }: SolarApiRequest = await req.json();
    
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    const googleApiKey = Deno.env.get('GOOGLE_SOLAR_API_KEY');
    if (!googleApiKey) {
      throw new Error('Google Solar API key not configured');
    }

    console.log(`Fetching solar data for coordinates: ${latitude}, ${longitude}`);

    // Call Google Solar API
    const response = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&requiredQuality=MEDIUM&key=${googleApiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Solar API error:', response.status, errorText);
      throw new Error(`Google Solar API error: ${response.status}`);
    }

    const solarData: SolarApiResponse = await response.json();
    console.log('Solar data received:', JSON.stringify(solarData, null, 2));

    // Process and structure the data for our frontend
    const processedData = {
      roofAnalysis: {
        totalRoofArea: solarData.solarPotential?.maxArrayAreaMeters2 || 0,
        maxPanels: solarData.solarPotential?.maxArrayPanelsCount || 0,
        sunshineHoursPerYear: solarData.solarPotential?.maxSunshineHoursPerYear || 0,
        carbonOffsetFactor: solarData.solarPotential?.carbonOffsetFactorKgPerMwh || 0,
      },
      systemOptions: solarData.solarPanelConfigs?.map(config => ({
        panelCount: config.panelsCount,
        annualGenerationKwh: config.yearlyEnergyDcKwh,
        roofSegments: config.roofSegmentSummaries?.length || 0,
      })) || [],
      financialProjections: solarData.financialAnalyses?.map(analysis => ({
        panelCount: analysis.panelsCount,
        monthlyBillOffset: analysis.monthlyBill?.units || 0,
        currency: analysis.monthlyBill?.currencyCode || 'USD',
        annualGenerationKwh: analysis.initialAcKwhPerYear,
        lifetimeGenerationKwh: analysis.lifetimeSolarGeneration,
        totalSavings20Years: analysis.presentValueOfSavingsYear20,
        lifetimeSavings: analysis.presentValueSavingsLifetime,
        paybackYears: analysis.paybackYears,
      })) || [],
      roofSegments: solarData.roofSegmentStats?.map(segment => ({
        pitch: segment.pitchDegrees,
        azimuth: segment.azimuthDegrees,
        area: segment.areaMeters2,
        sunshineScore: segment.sunshineQuantiles?.[5] || 0, // median sunshine
      })) || [],
      coverage: true,
      lastUpdated: new Date().toISOString(),
    };

    // Store in database if addressId provided
    if (addressId) {
      const { error: insertError } = await supabaseClient
        .from('solar_analysis')
        .upsert({
          address_id: addressId,
          user_id: user.id,
          raw_data: solarData,
          processed_data: processedData,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error storing solar data:', insertError);
        // Don't fail the request if storage fails
      }
    }

    return new Response(JSON.stringify(processedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-solar-analysis function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        coverage: false,
        message: 'Solar data unavailable for this location'
      }),
      {
        status: error.message.includes('Unauthorized') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});