import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-chatdiy-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface IntentPayload {
  user_id: string;
  session_id?: string;
  intent_category: string;
  system_type?: string;
  symptom_summary?: string;
  session_summary?: string;
  diy_flag?: boolean;
  pro_flag?: boolean;
  severity?: string;
  cost_estimate_min?: number;
  cost_estimate_max?: number;
  raw_payload?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    const chatdiyKey = req.headers.get('x-chatdiy-key');
    const expectedSecret = Deno.env.get('CHATDIY_WEBHOOK_SECRET');

    if (!expectedSecret || chatdiyKey !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse payload
    const payload: IntentPayload = await req.json();

    if (!payload.user_id || !payload.intent_category) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, intent_category' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate intent_category
    const validCategories = ['repair', 'replace', 'upgrade', 'inspect', 'diy_project', 'general', 'repair_replace'];
    if (!validCategories.includes(payload.intent_category)) {
      return new Response(
        JSON.stringify({ error: `Invalid intent_category. Must be one of: ${validCategories.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Resolve home_id: first home for this user (deterministic ordering)
    let homeId: string | null = null;
    const { data: homes } = await admin
      .from('homes')
      .select('id')
      .eq('user_id', payload.user_id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (homes && homes.length > 0) {
      homeId = homes[0].id;
    }

    // Compute lead value score via RPC
    const { data: scoreResult, error: scoreError } = await admin.rpc('compute_lead_value_score', {
      p_pro_flag: payload.pro_flag ?? false,
      p_severity: payload.severity ?? null,
      p_system_type: payload.system_type ?? null,
      p_cost_max: payload.cost_estimate_max ?? 0,
      p_home_id: homeId,
    });

    const leadValueScore = scoreError ? 0 : (scoreResult as number);

    // Insert into home_intent_events
    const { data: intentEvent, error: insertError } = await admin
      .from('home_intent_events')
      .insert({
        user_id: payload.user_id,
        home_id: homeId,
        platform: 'chatdiy',
        session_id: payload.session_id ?? null,
        intent_category: payload.intent_category,
        system_type: payload.system_type ?? null,
        symptom_summary: payload.symptom_summary ?? null,
        session_summary: payload.session_summary ?? null,
        diy_flag: payload.diy_flag ?? false,
        pro_flag: payload.pro_flag ?? false,
        severity: payload.severity ?? null,
        cost_estimate_min: payload.cost_estimate_min ?? null,
        cost_estimate_max: payload.cost_estimate_max ?? null,
        lead_value_score: leadValueScore,
        raw_payload: payload.raw_payload ?? null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert intent event:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert intent event', detail: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If home resolved AND repair-related intent, also log to home_events (immutable ledger)
    if (homeId && ['repair', 'repair_replace'].includes(payload.intent_category)) {
      const { error: eventError } = await admin
        .from('home_events')
        .insert({
          home_id: homeId,
          user_id: payload.user_id,
          event_type: 'issue_reported',
          source: 'chatdiy',
          source_platform: 'chatdiy',
          title: `${payload.system_type ?? 'Home'} issue reported via ChatDIY`,
          description: payload.symptom_summary ?? payload.session_summary ?? null,
          severity: payload.severity === 'urgent' ? 'critical' : (payload.severity ?? 'info'),
          metadata: {
            intent_event_id: intentEvent.id,
            session_id: payload.session_id,
            system_type: payload.system_type,
            diy_flag: payload.diy_flag,
            pro_flag: payload.pro_flag,
            cost_estimate_min: payload.cost_estimate_min,
            cost_estimate_max: payload.cost_estimate_max,
          },
        });

      if (eventError) {
        console.error('Failed to insert home_event (non-fatal):', eventError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        intent_event_id: intentEvent.id,
        home_id: homeId,
        lead_value_score: leadValueScore,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('receive-chatdiy-intent error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
