import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get('Authorization') || '';
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

    console.log(`Starting enrichment for address_id: ${address_id}`);

    // Get property details
    const { data: property, error: propertyError } = await supabase
      .from('properties_sample')
      .select('*')
      .eq('address_id', address_id)
      .single();

    if (propertyError) {
      throw new Error(`Failed to fetch property: ${propertyError.message}`);
    }

    const snapshotIds: string[] = [];

    // 1. Address standardization using existing Smarty integration
    try {
      console.log('Calling Smarty for address standardization...');
      const smartyResponse = await supabase.functions.invoke('smarty-proxy', {
        body: {
          action: 'standardize_geocode',
          payload: {
            street: property.street_address,
            city: property.city,
            state: property.state,
            postal_code: property.zip
          }
        },
        headers: {
          Authorization: authHeader
        }
      });

      if (smartyResponse.data) {
        const { data: snapshot } = await supabase
          .from('enrichment_snapshots')
          .insert({
            address_id,
            provider: 'smarty',
            payload: smartyResponse.data
          })
          .select()
          .single();
        
        if (snapshot) {
          snapshotIds.push(snapshot.snapshot_id);
          console.log('Smarty snapshot saved');
        }
      }
    } catch (error) {
      console.log('Smarty enrichment failed:', error);
    }

    // 2. Property record using existing ATTOM integration
    try {
      console.log('Calling ATTOM for property data...');
      const attomResponse = await supabase.functions.invoke('attom-property', {
        body: {
          address: `${property.street_address}, ${property.city}, ${property.state} ${property.zip}`
        },
        headers: {
          Authorization: authHeader
        }
      });

      if (attomResponse.data) {
        const { data: snapshot } = await supabase
          .from('enrichment_snapshots')
          .insert({
            address_id,
            provider: 'attom',
            payload: attomResponse.data
          })
          .select()
          .single();
        
        if (snapshot) {
          snapshotIds.push(snapshot.snapshot_id);
          console.log('ATTOM snapshot saved');
        }
      }
    } catch (error) {
      console.log('ATTOM enrichment failed:', error);
    }

    // 3. Permits using existing Shovels integration
    try {
      console.log('Calling Shovels for permits data...');
      
      // Get or create a validation home record for permits
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if there's already a home for this address
      let homeId = null;
      const addressStr = `${property.street_address}, ${property.city}, ${property.state} ${property.zip}`;
      
      const { data: existingHome } = await supabase
        .from('homes')
        .select('id')
        .eq('user_id', user.id)
        .ilike('address', `%${property.street_address}%`)
        .maybeSingle();

      if (existingHome) {
        homeId = existingHome.id;
        console.log(`Using existing home: ${homeId}`);
      } else {
        // Create a validation home record
        const { data: newHome, error: homeError } = await supabase
          .from('homes')
          .insert({
            user_id: user.id,
            address: addressStr,
            name: `Validation Property - ${property.street_address}`,
            is_primary: false
          })
          .select('id')
          .single();

        if (homeError) {
          console.error('Failed to create validation home:', homeError);
          throw new Error('Failed to create validation home record');
        }

        homeId = newHome.id;
        console.log(`Created validation home: ${homeId}`);
      }

      const shovelsResponse = await supabase.functions.invoke('shovels-permits', {
        body: {
          address: addressStr,
          homeId: homeId
        },
        headers: {
          Authorization: authHeader
        }
      });

      // Always create a snapshot, even if no data or error occurred
      let shovelsPayload;
      if (shovelsResponse.data) {
        shovelsPayload = shovelsResponse.data;
        console.log('Shovels data retrieved successfully');
      } else if (shovelsResponse.error) {
        shovelsPayload = {
          error: shovelsResponse.error.message,
          status: 'error',
          permits: [],
          violations: [],
          message: 'Failed to retrieve permits data'
        };
        console.log('Shovels returned error:', shovelsResponse.error.message);
      } else {
        shovelsPayload = {
          status: 'no_data',
          permits: [],
          violations: [],
          message: 'No permits or violations found for this address'
        };
        console.log('Shovels returned no data');
      }

      const { data: snapshot } = await supabase
        .from('enrichment_snapshots')
        .insert({
          address_id,
          provider: 'shovels',
          payload: shovelsPayload
        })
        .select()
        .single();
      
      if (snapshot) {
        snapshotIds.push(snapshot.snapshot_id);
        console.log('Shovels snapshot saved');
      }
    } catch (error) {
      console.log('Shovels enrichment failed:', error);
      
      // Create error snapshot even when the function call fails
      try {
        const { data: errorSnapshot } = await supabase
          .from('enrichment_snapshots')
          .insert({
            address_id,
            provider: 'shovels',
            payload: {
              error: error.message,
              status: 'error',
              permits: [],
              violations: [],
              message: 'Failed to call Shovels API'
            }
          })
          .select()
          .single();
        
        if (errorSnapshot) {
          snapshotIds.push(errorSnapshot.snapshot_id);
          console.log('Shovels error snapshot saved');
        }
      } catch (snapshotError) {
        console.log('Failed to save Shovels error snapshot:', snapshotError);
      }
    }

    // 4. Imagery metadata (stub for now)
    try {
      console.log('Creating imagery metadata stub...');
      const { data: snapshot } = await supabase
        .from('enrichment_snapshots')
        .insert({
          address_id,
          provider: 'imagery',
          payload: {
            status: 'pending',
            capture_dates: [],
            image_count: 0,
            note: 'Imagery enrichment placeholder - to be implemented'
          }
        })
        .select()
        .single();
      
      if (snapshot) {
        snapshotIds.push(snapshot.snapshot_id);
        console.log('Imagery stub saved');
      }
    } catch (error) {
      console.log('Imagery stub creation failed:', error);
    }

    console.log(`Enrichment completed. Created ${snapshotIds.length} snapshots.`);

    return new Response(
      JSON.stringify({
        status: 'success',
        snapshot_ids: snapshotIds,
        message: `Enrichment completed for address ${property.street_address}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Enrichment error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Enrichment failed',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});