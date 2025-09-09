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

    const { homeId, systems: userSystems, goals } = await req.json()

    console.log('Processing unknowns for home:', homeId, userSystems)

    // Get home record
    const { data: home } = await supabase
      .from('homes')
      .select('*')
      .eq('id', homeId)
      .single()

    if (!home) {
      return new Response(JSON.stringify({ error: 'Home not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const currentYear = new Date().getFullYear()
    let confidenceBoost = 0
    const newPlanCards = []

    // Process each system the user provided info about
    for (const [systemKind, systemData] of Object.entries(userSystems)) {
      const { installYear, type, dontKnow } = systemData as any

      if (dontKnow) {
        // User doesn't know, use fallback estimates
        const fallbackYear = home.year_built || currentYear - 10
        await supabase
          .from('systems')
          .upsert({
            home_id: homeId,
            user_id: user.id,
            kind: systemKind,
            install_year: fallbackYear,
            install_source: 'inferred',
            status: 'UNKNOWN',
            confidence: 0.2,
            material: type || 'unknown'
          })
      } else {
        // User provided info
        const age = installYear ? currentYear - installYear : null
        let status = 'OK'
        let confidence = 0.8

        // Apply lifespan heuristics
        if (systemKind === 'HVAC' && age) {
          status = age > 15 ? 'EOL' : age > 12 ? 'WATCH' : 'OK'
        } else if (systemKind === 'WATER_HEATER' && age) {
          status = age > 12 ? 'EOL' : age > 10 ? 'WATCH' : 'OK'
        }

        await supabase
          .from('systems')
          .upsert({
            home_id: homeId,
            user_id: user.id,
            kind: systemKind,
            install_year: installYear,
            install_source: 'user',
            status,
            confidence,
            material: type
          })

        confidenceBoost += 0.1

        // Create plan cards for aging systems
        if (status === 'EOL') {
          newPlanCards.push({
            home_id: homeId,
            user_id: user.id,
            title: `Replace ${systemKind.toLowerCase().replace('_', ' ')}`,
            description: `Your ${systemKind.toLowerCase().replace('_', ' ')} is nearing end-of-life and should be replaced soon.`,
            priority: 'NOW',
            category: 'upgrade',
            system_kind: systemKind,
            estimated_cost_min: systemKind === 'HVAC' ? 3000 : 800,
            estimated_cost_max: systemKind === 'HVAC' ? 8000 : 1500,
            rationale: `Installed in ${installYear}, typical lifespan exceeded`
          })
        } else if (status === 'WATCH') {
          newPlanCards.push({
            home_id: homeId,
            user_id: user.id,
            title: `Service ${systemKind.toLowerCase().replace('_', ' ')}`,
            description: `Schedule maintenance to extend the life of your ${systemKind.toLowerCase().replace('_', ' ')}.`,
            priority: 'SOON',
            category: 'maintenance',
            system_kind: systemKind,
            estimated_cost_min: 150,
            estimated_cost_max: 300,
            rationale: `Installed in ${installYear}, proactive maintenance recommended`
          })
        }
      }
    }

    // Insert new plan cards
    if (newPlanCards.length > 0) {
      await supabase
        .from('plan_cards')
        .insert(newPlanCards)
    }

    // Update home confidence
    const newConfidence = Math.min(1.0, home.confidence + confidenceBoost)
    await supabase
      .from('homes')
      .update({ 
        confidence: newConfidence,
        status: newConfidence > 0.7 ? 'ready' : 'enriching'
      })
      .eq('id', homeId)

    // Store user goals for personalization
    if (goals) {
      await supabase
        .from('homes')
        .update({ 
          // Store goals in a JSON field (we'll need to add this column)
          // For now, just update status
          status: 'ready'
        })
        .eq('id', homeId)
    }

    // Get updated systems and plan cards
    const { data: systems } = await supabase
      .from('systems')
      .select('*')
      .eq('home_id', homeId)

    const { data: planCards } = await supabase
      .from('plan_cards')
      .select('*')
      .eq('home_id', homeId)
      .order('priority', { ascending: true })

    return new Response(JSON.stringify({
      success: true,
      confidence: newConfidence,
      systems,
      planCards,
      readyForDashboard: newConfidence > 0.7
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Onboarding unknowns error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})