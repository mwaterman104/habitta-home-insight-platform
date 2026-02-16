import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const { name, email } = await req.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Habitta <onboarding@resend.dev>',
        to: [email],
        subject: 'Welcome to the Habitta Waitlist!',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Welcome to Habitta, ${name}!</h1>
            <p style="color: #4a4a5a; font-size: 16px; line-height: 1.6;">
              You're on the list. We're building something thoughtful for homeowners who'd rather plan ahead than react to surprises.
            </p>
            <p style="color: #4a4a5a; font-size: 16px; line-height: 1.6;">
              Habitta will continuously evaluate your home's condition, risk, and future costs — so you can make smart decisions before things break.
            </p>
            <p style="color: #4a4a5a; font-size: 16px; line-height: 1.6;">
              We'll reach out as soon as early access is ready. In the meantime, sit tight — your home's future self will thank you.
            </p>
            <p style="color: #888; font-size: 14px; margin-top: 32px;">— The Habitta Team</p>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', JSON.stringify(data));
      throw new Error(`Resend API failed [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
