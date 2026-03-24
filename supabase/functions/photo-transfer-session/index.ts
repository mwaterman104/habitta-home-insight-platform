import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Photo Transfer Session Edge Function
 * 
 * Handles the QR code photo transfer bridge between desktop and mobile:
 * - POST ?action=create - Create new session (requires auth)
 * - GET ?action=status&token=... - Check session status (public)
 * - POST ?action=upload&token=... - Mark as uploaded + set URL (public, single-use)
 * 
 * Guardrails:
 * 1. Sessions are single-use (first upload wins)
 * 2. Sessions expire after 10 minutes
 * 3. Token validation prevents unauthorized access
 */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const token = url.searchParams.get('token');

    console.log(`Photo transfer session: action=${action}, token=${token?.substring(0, 8)}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Service client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // =========================================================================
    // ACTION: CREATE - Create new session (requires auth)
    // =========================================================================
    if (action === 'create' && req.method === 'POST') {
      // Get auth header for user verification
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user with getClaims (recommended approach)
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: authError } = await supabaseUser.auth.getClaims(token);
      
      if (authError || !claimsData?.claims?.sub) {
        console.error('Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Invalid authorization' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const userId = claimsData.claims.sub;

      // Parse body for home_id
      let homeId: string | null = null;
      try {
        const body = await req.json();
        homeId = body.home_id || null;
      } catch {
        // Body is optional
      }

      // Create session
      const { data: session, error: createError } = await supabaseAdmin
        .from('photo_transfer_sessions')
        .insert({
          user_id: userId,
          home_id: homeId,
          status: 'pending',
        })
        .select('session_token, expires_at')
        .single();

      if (createError) {
        console.error('Create session error:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Created session: ${session.session_token.substring(0, 8)}... expires at ${session.expires_at}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          session_token: session.session_token,
          expires_at: session.expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION: STATUS - Check session status (public, requires token)
    // =========================================================================
    if (action === 'status' && req.method === 'GET') {
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // First, mark any expired sessions
      await supabaseAdmin.rpc('cleanup_expired_photo_sessions');

      // Get session by token
      const { data: session, error: fetchError } = await supabaseAdmin
        .from('photo_transfer_sessions')
        .select('status, photo_url, expires_at')
        .eq('session_token', token)
        .single();

      if (fetchError || !session) {
        console.log('Session not found or error:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Session not found or expired', status: 'expired' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if expired by time
      if (new Date(session.expires_at) < new Date() && session.status === 'pending') {
        return new Response(
          JSON.stringify({ status: 'expired', photo_url: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          status: session.status, 
          photo_url: session.photo_url,
          expires_at: session.expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION: UPLOAD - Handle file upload via FormData (public, requires token)
    // Guardrail: Single-use - only accepts if status is 'pending'
    // Uses service role to bypass storage RLS (mobile page is unauthenticated)
    // =========================================================================
    if (action === 'upload' && req.method === 'POST') {
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse multipart form data
      let file: File | null = null;
      try {
        const formData = await req.formData();
        file = formData.get('image') as File | null;
      } catch (e) {
        console.error('Failed to parse form data:', e);
        return new Response(
          JSON.stringify({ error: 'Invalid form data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!file) {
        return new Response(
          JSON.stringify({ error: 'Image file required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: 'File too large (max 10MB)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Upload request: token=${token.substring(0, 8)}..., file=${file.name}, size=${file.size}`);

      // Verify session is pending (single-use check)
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('photo_transfer_sessions')
        .select('id, status, expires_at')
        .eq('session_token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (sessionError || !session) {
        console.log('Session not valid:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Session expired or already used' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upload to storage using service role (bypasses RLS)
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `transfers/${token}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('home-photos')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload image' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('home-photos')
        .getPublicUrl(storagePath);

      console.log(`Uploaded to: ${storagePath}, URL: ${publicUrl}`);

      // Update session atomically
      const { error: updateError } = await supabaseAdmin
        .from('photo_transfer_sessions')
        .update({ status: 'uploaded', photo_url: publicUrl })
        .eq('id', session.id);

      if (updateError) {
        console.error('Session update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Session ${token.substring(0, 8)}... marked as uploaded`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: create, status, or upload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Photo transfer session error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
