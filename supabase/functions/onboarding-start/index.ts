import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Forward the caller's JWT to all Supabase requests (DB + nested functions)
    const authHeader = req.headers.get('Authorization') || ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          storage: {} as any,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Get user from JWT (explicitly validate)
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(jwt)

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { address, city, state, zip_code } = await req.json()

    console.log('Starting onboarding for address:', { address, city, state, zip_code })

    // Step 1: Call Smarty API to normalize address
    let normalizedAddress = { address, city, state, zip_code }
    let latitude = null
    let longitude = null
    let confidence = 0.3

    try {
      const { data: smartyData } = await supabase.functions.invoke('smarty-proxy', {
        body: { 
          action: 'standardize_geocode', 
          payload: { street: address, city, state, postal_code: zip_code }
        }
      })

      if (smartyData?.standardized) {
        normalizedAddress = {
          address: smartyData.standardized.line1,
          city: smartyData.standardized.city,
          state: smartyData.standardized.state,
          zip_code: smartyData.standardized.postal_code
        }
        confidence = 0.5 // Verified address
      }

      if (smartyData?.geocoded) {
        latitude = smartyData.geocoded.latitude
        longitude = smartyData.geocoded.longitude
        confidence = 0.6 // Verified + geocoded
      }
    } catch (error) {
      console.warn('Smarty API failed, continuing with user input:', error)
    }

    // Step 2: Create home record
    const { data: home, error: homeError } = await supabase
      .from('homes')
      .insert({
        user_id: user.id,
        address: normalizedAddress.address,
        city: normalizedAddress.city,
        state: normalizedAddress.state,
        zip_code: normalizedAddress.zip_code,
        latitude,
        longitude,
        confidence,
        status: 'enriching'
      })
      .select()
      .single()

    if (homeError) {
      console.error('Error creating home:', homeError)
      return new Response(JSON.stringify({ error: 'Failed to create home record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const homeId = home.id

    // Step 3: Trigger Shovels API for permits (background task)
    supabase.functions.invoke('shovels-permits', {
      body: { 
        address: `${normalizedAddress.address}, ${normalizedAddress.city}, ${normalizedAddress.state} ${normalizedAddress.zip_code}`,
        homeId
      }
    }).catch(error => console.warn('Shovels permits failed:', error))

    // Step 4: Run roof lifespan heuristic
    const currentYear = new Date().getFullYear()
    const homeAge = home.year_built ? currentYear - home.year_built : null
    let roofStatus = 'UNKNOWN'
    let roofConfidence = 0.3
    let roofInstallYear = null
    let roofInstallSource = 'inferred'

    if (homeAge && homeAge > 20) {
      // Check for roof permits
      const { data: roofPermits } = await supabase
        .from('permits')
        .select('*')
        .eq('home_id', homeId)
        .contains('system_tags', ['roof'])
        .order('date_issued', { ascending: false })
        .limit(1)

      if (roofPermits && roofPermits.length > 0) {
        const lastRoofPermit = roofPermits[0]
        roofInstallYear = new Date(lastRoofPermit.date_issued).getFullYear()
        roofInstallSource = 'permit'
        const roofAge = currentYear - roofInstallYear
        roofStatus = roofAge > 22 ? 'EOL' : roofAge > 18 ? 'WATCH' : 'OK'
        roofConfidence = 0.8
      } else {
        // No roof permit found, assume EOL for older homes
        roofStatus = 'EOL'
        roofInstallYear = home.year_built
        roofConfidence = 0.4
      }
    } else if (homeAge && homeAge <= 20 && home.year_built) {
      // Newer home with known year
      roofInstallYear = home.year_built
      roofStatus = 'OK'
      roofConfidence = 0.5
    } else {
      // Unknown age or very new, default to unknown status
      roofStatus = 'UNKNOWN'
      roofConfidence = 0.3
    }

    // Create roof system record
    const { error: roofError } = await supabase
      .from('systems')
      .insert({
        home_id: homeId,
        user_id: user.id,
        kind: 'ROOF',
        install_year: roofInstallYear,
        install_source: roofInstallSource,
        status: roofStatus,
        confidence: roofConfidence,
        material: 'asphalt' // Default assumption
      })

    if (roofError) {
      console.error('Error creating roof system:', roofError)
    }

    // Step 5: Create initial plan cards based on roof status
    const planCards = []
    
    if (roofStatus === 'EOL') {
      planCards.push({
        home_id: homeId,
        user_id: user.id,
        title: 'Schedule Roof Inspection',
        description: 'Your roof may be nearing end-of-life. Get a professional inspection to assess condition and plan for replacement.',
        priority: 'NOW',
        category: 'inspection',
        system_kind: 'ROOF',
        estimated_cost_min: 300,
        estimated_cost_max: 500,
        rationale: homeAge ? `Home is ${homeAge} years old with ${roofInstallSource === 'permit' ? 'last roof work' : 'original roof'} from ${roofInstallYear}` : 'Roof may need inspection due to age'
      })
    } else if (roofStatus === 'WATCH') {
      planCards.push({
        home_id: homeId,
        user_id: user.id,
        title: 'Annual Roof Maintenance',
        description: 'Schedule annual roof tune-up and gutter cleaning to extend roof life.',
        priority: 'SOON',
        category: 'maintenance',
        system_kind: 'ROOF',
        estimated_cost_min: 200,
        estimated_cost_max: 400,
        rationale: 'Roof is in good condition but benefits from regular maintenance'
      })
    }

    if (planCards.length > 0) {
      const { error: cardsError } = await supabase
        .from('plan_cards')
        .insert(planCards)

      if (cardsError) {
        console.error('Error creating plan cards:', cardsError)
      }
    }

    // Update confidence based on what we've gathered
    let finalConfidence = confidence
    if (roofStatus !== 'UNKNOWN') finalConfidence += 0.1

    await supabase
      .from('homes')
      .update({ confidence: finalConfidence })
      .eq('id', homeId)

    // Return onboarding snapshot
    return new Response(JSON.stringify({
      success: true,
      home: {
        ...home,
        confidence: finalConfidence
      },
      normalizedAddress,
      roofAnalysis: {
        status: roofStatus,
        installYear: roofInstallYear,
        installSource: roofInstallSource,
        confidence: roofConfidence
      },
      planCards,
      unknowns: ['HVAC', 'WATER_HEATER', 'SMART_DEVICES'] // What we still need to ask about
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Onboarding start error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})