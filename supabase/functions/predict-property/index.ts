import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PredictionRule {
  field: string;
  predict: (snapshots: any[], property: any) => { value: string; confidence: number; provenance: any };
}

// Enhanced prediction rules with dynamic confidence scoring
const predictionRules: PredictionRule[] = [
  {
    field: 'roof_age_bucket',
    predict: (snapshots, property) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      const attomData = snapshots.find(s => s.provider === 'attom')?.payload;
      const smartyData = snapshots.find(s => s.provider === 'smarty')?.payload;
      
      let baseConfidence = 0.3;
      let sources = [];
      
      // Check for roof permits first (highest confidence)
      if (shovelsData?.permits) {
        const roofPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('roof') || 
          p.work_type?.toLowerCase().includes('roof') ||
          p.permit_type?.toLowerCase().includes('roof')
        );
        
        if (roofPermits.length > 0) {
          const latestPermit = roofPermits.sort((a: any, b: any) => 
            new Date(b.issue_date || b.date_issued).getTime() - new Date(a.issue_date || a.date_issued).getTime()
          )[0];
          
          const permitDate = new Date(latestPermit.issue_date || latestPermit.date_issued);
          const permitYear = permitDate.getFullYear();
          const age = 2024 - permitYear;
          
          // Higher confidence for recent permits
          const recencyBonus = age < 2 ? 0.15 : age < 5 ? 0.1 : 0.05;
          baseConfidence = 0.85 + recencyBonus;
          
          let bucket = '20y+';
          if (age <= 5) bucket = '0-5y';
          else if (age <= 10) bucket = '6-10y';
          else if (age <= 15) bucket = '11-15y';
          else if (age <= 20) bucket = '16-20y';
          
          sources.push(`roof permit ${permitYear}`);
          
          // Cross-validate with property age
          if (attomData?.year_built) {
            const houseAge = 2024 - attomData.year_built;
            if (age > houseAge + 5) {
              // Permit is much newer than house - likely roof replacement
              baseConfidence += 0.05;
            }
          }
          
          return {
            value: bucket,
            confidence: Math.min(baseConfidence, 0.95),
            provenance: { 
              source: 'shovels_permit', 
              permit_year: permitYear,
              sources: sources,
              cross_validated: sources.length > 1
            }
          };
        }
      }
      
      // Cross-validate with multiple sources
      if (attomData?.year_built || property.year_built) {
        const yearBuilt = attomData?.year_built || property.year_built;
        const houseAge = 2024 - yearBuilt;
        sources.push(`built ${yearBuilt}`);
        
        // Assume roof replacement at different intervals based on house age
        let estimatedRoofAge = houseAge;
        if (houseAge > 25) {
          estimatedRoofAge = houseAge - 20; // Assume replacement 20 years ago
          baseConfidence = 0.4;
        } else if (houseAge > 15) {
          estimatedRoofAge = houseAge - 10; // Assume replacement 10 years ago  
          baseConfidence = 0.45;
        } else {
          baseConfidence = 0.6; // Original roof
        }
        
        let bucket = '20y+';
        if (estimatedRoofAge <= 5) bucket = '0-5y';
        else if (estimatedRoofAge <= 10) bucket = '6-10y';
        else if (estimatedRoofAge <= 15) bucket = '11-15y';
        else if (estimatedRoofAge <= 20) bucket = '16-20y';
        
        // Regional adjustment for Florida climate
        if (smartyData?.components?.state_abbreviation === 'FL') {
          baseConfidence += 0.05; // Better data for FL properties
          sources.push('FL climate adjustment');
        }
        
        return {
          value: bucket,
          confidence: baseConfidence,
          provenance: { 
            source: 'estimated_from_house_age', 
            house_age: houseAge,
            estimated_roof_age: estimatedRoofAge,
            sources: sources
          }
        };
      }
      
      return {
        value: '11-15y',
        confidence: 0.25,
        provenance: { source: 'default_assumption', sources: ['no data available'] }
      };
    }
  },
  {
    field: 'hvac_present',
    predict: (snapshots, property) => {
      // HVAC is typically present in most homes
      return {
        value: 'true',
        confidence: 0.8,
        provenance: { source: 'statistical_default' }
      };
    }
  },
  {
    field: 'hvac_system_type',
    predict: (snapshots, property) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      
      // Check permits for HVAC type clues
      if (shovelsData?.permits) {
        const hvacPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('hvac') || 
          p.description?.toLowerCase().includes('air') ||
          p.work_type?.toLowerCase().includes('mechanical')
        );
        
        if (hvacPermits.length > 0) {
          const description = hvacPermits[0].description?.toLowerCase() || '';
          
          if (description.includes('central') || description.includes('split')) {
            return {
              value: 'central_air',
              confidence: 0.8,
              provenance: { source: 'shovels_permit_text', description }
            };
          }
          
          if (description.includes('heat pump')) {
            return {
              value: 'heat_pump',
              confidence: 0.8,
              provenance: { source: 'shovels_permit_text', description }
            };
          }
        }
      }
      
      // Default based on climate (Florida = split/central air)
      return {
        value: 'central_air',
        confidence: 0.5,
        provenance: { source: 'climate_default', climate: 'florida' }
      };
    }
  },
  {
    field: 'hvac_age_bucket',
    predict: (snapshots, property) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      const attomData = snapshots.find(s => s.provider === 'attom')?.payload;
      
      // Check for HVAC permits
      if (shovelsData?.permits) {
        const hvacPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('hvac') || 
          p.description?.toLowerCase().includes('air') ||
          p.work_type?.toLowerCase().includes('mechanical')
        );
        
        if (hvacPermits.length > 0) {
          const latestPermit = hvacPermits.sort((a: any, b: any) => 
            new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
          )[0];
          
          const permitYear = new Date(latestPermit.issue_date).getFullYear();
          const age = 2024 - permitYear;
          
          let bucket = '20y+';
          if (age <= 5) bucket = '0-5y';
          else if (age <= 10) bucket = '6-10y';
          else if (age <= 15) bucket = '11-15y';
          else if (age <= 20) bucket = '16-20y';
          
          return {
            value: bucket,
            confidence: 0.85,
            provenance: { source: 'shovels_permit', permit_id: latestPermit.id }
          };
        }
      }
      
      // Estimate based on home age (HVAC typically replaced every 15-20 years)
      if (attomData?.year_built || property.year_built) {
        const yearBuilt = attomData?.year_built || property.year_built;
        const homeAge = 2024 - yearBuilt;
        
        // Assume HVAC replaced once if home > 20 years old
        let estimatedHvacAge = homeAge;
        if (homeAge > 20) {
          estimatedHvacAge = homeAge - 15; // Assume replacement 15 years ago
        }
        
        let bucket = '20y+';
        if (estimatedHvacAge <= 5) bucket = '0-5y';
        else if (estimatedHvacAge <= 10) bucket = '6-10y';
        else if (estimatedHvacAge <= 15) bucket = '11-15y';
        else if (estimatedHvacAge <= 20) bucket = '16-20y';
        
        return {
          value: bucket,
          confidence: 0.4,
          provenance: { source: 'estimated_from_home_age', home_age: homeAge }
        };
      }
      
      return {
        value: '11-15y',
        confidence: 0.3,
        provenance: { source: 'default_assumption' }
      };
    }
  },
  {
    field: 'water_heater_type',
    predict: (snapshots, property) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      
      // Check permits for water heater type
      if (shovelsData?.permits) {
        const whPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('water heater') ||
          p.description?.toLowerCase().includes('hot water') ||
          p.work_type?.toLowerCase().includes('plumbing')
        );
        
        if (whPermits.length > 0) {
          const description = whPermits[0].description?.toLowerCase() || '';
          
          if (description.includes('tankless')) {
            return {
              value: 'tankless',
              confidence: 0.9,
              provenance: { source: 'shovels_permit_text', description }
            };
          }
          
          if (description.includes('electric')) {
            return {
              value: 'electric_tank',
              confidence: 0.8,
              provenance: { source: 'shovels_permit_text', description }
            };
          }
          
          if (description.includes('gas')) {
            return {
              value: 'gas_tank',
              confidence: 0.8,
              provenance: { source: 'shovels_permit_text', description }
            };
          }
        }
      }
      
      // Default assumption - tank style is most common
      return {
        value: 'gas_tank',
        confidence: 0.4,
        provenance: { source: 'statistical_default' }
      };
    }
  },
  {
    field: 'water_heater_age_bucket',
    predict: (snapshots, property) => {
      const shovelsData = snapshots.find(s => s.provider === 'shovels')?.payload;
      
      // Check for water heater permits
      if (shovelsData?.permits) {
        const whPermits = shovelsData.permits.filter((p: any) => 
          p.description?.toLowerCase().includes('water heater') ||
          p.description?.toLowerCase().includes('hot water')
        );
        
        if (whPermits.length > 0) {
          const latestPermit = whPermits.sort((a: any, b: any) => 
            new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
          )[0];
          
          const permitYear = new Date(latestPermit.issue_date).getFullYear();
          const age = 2024 - permitYear;
          
          let bucket = '20y+';
          if (age <= 5) bucket = '0-5y';
          else if (age <= 10) bucket = '6-10y';
          else if (age <= 15) bucket = '11-15y';
          else if (age <= 20) bucket = '16-20y';
          
          return {
            value: bucket,
            confidence: 0.9,
            provenance: { source: 'shovels_permit', permit_id: latestPermit.id }
          };
        }
      }
      
      // Default estimate (water heaters typically last 8-12 years)
      return {
        value: '6-10y',
        confidence: 0.3,
        provenance: { source: 'typical_lifespan_default' }
      };
    }
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { address_id } = await req.json();

    if (!address_id) {
      return new Response(
        JSON.stringify({ error: 'address_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Starting predictions for address_id: ${address_id}`);

    // Get property details and enrichment snapshots
    const [propertyResult, snapshotsResult] = await Promise.all([
      supabase
        .from('properties_sample')
        .select('*')
        .eq('address_id', address_id)
        .single(),
      supabase
        .from('enrichment_snapshots')
        .select('*')
        .eq('address_id', address_id)
    ]);

    if (propertyResult.error) {
      throw new Error(`Failed to fetch property: ${propertyResult.error.message}`);
    }

    if (snapshotsResult.error) {
      throw new Error(`Failed to fetch snapshots: ${snapshotsResult.error.message}`);
    }

    const property = propertyResult.data;
    const snapshots = snapshotsResult.data;
    const predictionRunId = crypto.randomUUID();

    console.log(`Found ${snapshots.length} snapshots for property`);

    // Generate predictions for each field
    const predictions = [];
    for (const rule of predictionRules) {
      try {
        const result = rule.predict(snapshots, property);
        
        const prediction = {
          address_id,
          prediction_run_id: predictionRunId,
          field: rule.field,
          predicted_value: result.value,
          confidence_0_1: result.confidence,
          data_provenance: result.provenance,
          model_version: 'rules_v0.1'
        };

        const { data: savedPrediction } = await supabase
          .from('predictions')
          .insert(prediction)
          .select()
          .single();

        if (savedPrediction) {
          predictions.push(savedPrediction);
          console.log(`Saved prediction for ${rule.field}: ${result.value}`);
        }
      } catch (error) {
        console.error(`Failed to generate prediction for ${rule.field}:`, error);
      }
    }

    console.log(`Predictions completed. Generated ${predictions.length} predictions.`);

    return new Response(
      JSON.stringify({
        status: 'success',
        prediction_run_id: predictionRunId,
        predictions: predictions.length,
        message: `Predictions generated for address ${property.street_address}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Prediction error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Prediction failed',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});