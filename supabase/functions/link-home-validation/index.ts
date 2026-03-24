// Link user's home to property data and promote validation data to dashboard
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing request for user:', userData.user.id);

    // Get user's home
    const { data: homeData, error: homeError } = await supabase
      .from('homes')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (homeError) {
      console.error('Error fetching home:', homeError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch home data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!homeData) {
      return new Response(
        JSON.stringify({ error: 'No home found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found home:', homeData.address);

    // If home already has property_id, check if we need to promote data
    if (homeData.property_id) {
      console.log('Home already linked to property:', homeData.property_id);
      
      // Check if systems exist for this home
      const { data: existingSystems } = await supabase
        .from('systems')
        .select('id')
        .eq('home_id', homeData.id)
        .limit(1);

      if (existingSystems && existingSystems.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Home already linked and data exists',
            property_id: homeData.property_id,
            home_id: homeData.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Try to find matching property
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .or(`address.ilike.%${homeData.address}%,address.ilike.%${homeData.city}%,zipcode.eq.${homeData.zip_code}`)
      .limit(5);

    let propertyId = homeData.property_id;

    // If no property found, create one
    if (!properties || properties.length === 0) {
      console.log('Creating new property record');
      const fullAddress = `${homeData.address}, ${homeData.city}, ${homeData.state} ${homeData.zip_code}`;
      
      const { data: newProperty, error: createError } = await supabase
        .from('properties')
        .insert({
          address: fullAddress,
          zipcode: homeData.zip_code,
          address_std: fullAddress.toUpperCase()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating property:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create property' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      propertyId = newProperty.id;
    } else {
      // Use the first matching property
      propertyId = properties[0].id;
      console.log('Found matching property:', propertyId);
    }

    // Link home to property if not already linked
    if (!homeData.property_id) {
      const { error: linkError } = await supabase
        .from('homes')
        .update({ property_id: propertyId })
        .eq('id', homeData.id);

      if (linkError) {
        console.error('Error linking home to property:', linkError);
        return new Response(
          JSON.stringify({ error: 'Failed to link home to property' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create some basic systems for the home based on typical home systems
    const basicSystems = [
      { kind: 'hvac', install_year: 2015, status: 'ACTIVE' },
      { kind: 'roof', install_year: 2010, status: 'ACTIVE' },
      { kind: 'water_heater', install_year: 2018, status: 'ACTIVE' },
      { kind: 'electrical', install_year: 2005, status: 'ACTIVE' }
    ];

    // Check which systems don't exist yet
    const { data: existingSystems } = await supabase
      .from('systems')
      .select('kind')
      .eq('home_id', homeData.id);

    const existingSystemKinds = existingSystems?.map(s => s.kind) || [];
    const systemsToCreate = basicSystems.filter(s => !existingSystemKinds.includes(s.kind));

    if (systemsToCreate.length > 0) {
      const systemInserts = systemsToCreate.map(system => ({
        user_id: userData.user.id,
        home_id: homeData.id,
        kind: system.kind,
        install_year: system.install_year,
        status: system.status,
        confidence: 0.7
      }));

      const { error: systemsError } = await supabase
        .from('systems')
        .insert(systemInserts);

      if (systemsError) {
        console.error('Error creating systems:', systemsError);
      } else {
        console.log(`Created ${systemsToCreate.length} new systems`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Home linked to validation data successfully',
        property_id: propertyId,
        home_id: homeData.id,
        systems_created: systemsToCreate.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});