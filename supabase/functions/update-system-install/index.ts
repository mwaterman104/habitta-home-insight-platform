/**
 * update-system-install Edge Function
 * 
 * Handles user corrections to system install data.
 * Strategy A: Returns updated prediction payload directly to prevent UI jitter.
 * 
 * Auth: JWT required, verifies user owns home
 * Idempotent: Uses client_request_id in metadata
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// TYPES
// =============================================================================

type InstallSource = 'heuristic' | 'owner_reported' | 'inspection' | 'permit_verified';
type ReplacementStatus = 'original' | 'replaced' | 'unknown';
type ConfidenceLevel = 'low' | 'medium' | 'high';

interface UpdateRequest {
  homeId: string;
  systemKey: string;
  replacementStatus: ReplacementStatus;
  installYear?: number;
  installMonth?: number;
  installSource?: InstallSource;
  installMetadata?: {
    installer?: 'diy' | 'licensed_pro' | 'builder';
    knowledge_source?: 'permit' | 'receipt' | 'inspection' | 'memory';
    client_request_id?: string;
    user_acknowledged_unknown?: boolean;
  };
}

// =============================================================================
// CONFIDENCE SCORING (Inline - same as client module)
// =============================================================================

const BASE_SCORES: Record<InstallSource, number> = {
  heuristic: 0.30,
  owner_reported: 0.60,
  inspection: 0.75,
  permit_verified: 0.85,
};

function scoreInstallConfidence(source: InstallSource, hasMonth: boolean): { score: number; level: ConfidenceLevel } {
  let score = BASE_SCORES[source];
  if (hasMonth) score += 0.05;
  score = Math.min(1.0, score);
  
  const level: ConfidenceLevel = score >= 0.80 ? 'high' : score >= 0.50 ? 'medium' : 'low';
  return { score, level };
}

function formatInstalledLine(
  installYear: number | null,
  installSource: InstallSource,
  replacementStatus: ReplacementStatus
): string {
  if (!installYear) return 'Install date unknown';
  if (replacementStatus === 'original') return `Installed ${installYear} (original system)`;
  
  switch (installSource) {
    case 'heuristic': return `Installed ~${installYear} (estimated)`;
    case 'owner_reported': return `Installed ${installYear} (owner-reported)`;
    case 'inspection': return `Installed ${installYear} (verified)`;
    case 'permit_verified': return `Installed ${installYear} (permit-verified)`;
    default: return `Installed ${installYear}`;
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const body: UpdateRequest = await req.json();
    const { homeId, systemKey, replacementStatus, installYear, installMonth, installSource, installMetadata } = body;

    // Validate required fields
    if (!homeId || !systemKey || !replacementStatus) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: homeId, systemKey, replacementStatus' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate replacementStatus
    if (!['original', 'replaced', 'unknown'].includes(replacementStatus)) {
      return new Response(
        JSON.stringify({ error: 'Invalid replacementStatus. Must be: original, replaced, or unknown' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns the home
    const { data: home, error: homeError } = await supabase
      .from('homes')
      .select('id, user_id, year_built')
      .eq('id', homeId)
      .single();

    if (homeError || !home) {
      return new Response(
        JSON.stringify({ error: 'Home not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (home.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this home' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing system record
    const { data: existingSystem, error: systemError } = await supabase
      .from('systems')
      .select('*')
      .eq('home_id', homeId)
      .eq('kind', systemKey)
      .maybeSingle();

    if (systemError) {
      console.error('Error fetching system:', systemError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch system record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store previous values for audit
    const prevInstallYear = existingSystem?.install_year ?? null;
    const prevInstallSource = existingSystem?.install_source ?? null;
    const prevReplacementStatus = existingSystem?.replacement_status ?? 'unknown';

    // Build update payload based on rules
    let newInstallYear = existingSystem?.install_year;
    let newInstallSource: InstallSource = (existingSystem?.install_source as InstallSource) || 'heuristic';
    let newInstallMonth = existingSystem?.install_month;
    let newMetadata = existingSystem?.install_metadata || {};

    // Apply rules based on replacement status
    if (replacementStatus === 'unknown') {
      // Rule: Do NOT overwrite existing data, just acknowledge uncertainty
      newMetadata = {
        ...newMetadata,
        ...installMetadata,
        user_acknowledged_unknown: true,
      };
    } else if (replacementStatus === 'replaced') {
      // Rule: User provides year, set source to owner_reported (unless they specify)
      if (installYear) {
        newInstallYear = installYear;
        newInstallSource = installSource || 'owner_reported';
        newInstallMonth = installMonth ?? null;
        newMetadata = {
          ...newMetadata,
          ...installMetadata,
        };
      }
    } else if (replacementStatus === 'original') {
      // Rule: Set year to year_built, source to owner_reported (user confirmed)
      newInstallYear = home.year_built ?? installYear;
      newInstallSource = 'owner_reported';
      newMetadata = {
        ...newMetadata,
        ...installMetadata,
        is_original_system: true,
      };
    }

    // Calculate new confidence
    const { score: confidenceScore, level: confidenceLevel } = scoreInstallConfidence(
      newInstallSource,
      !!newInstallMonth
    );

    // Format installed line
    const installedLine = formatInstalledLine(newInstallYear, newInstallSource, replacementStatus);

    // Upsert system record
    const systemPayload = {
      home_id: homeId,
      user_id: user.id,
      kind: systemKey,
      install_year: newInstallYear,
      install_month: newInstallMonth,
      install_source: newInstallSource,
      replacement_status: replacementStatus,
      install_metadata: newMetadata,
      confidence: confidenceScore,
      updated_at: new Date().toISOString(),
    };

    let updatedSystem;
    if (existingSystem) {
      // Update existing
      const { data, error: updateError } = await supabase
        .from('systems')
        .update(systemPayload)
        .eq('id', existingSystem.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating system:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update system' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updatedSystem = data;
    } else {
      // Insert new
      const { data, error: insertError } = await supabase
        .from('systems')
        .insert(systemPayload)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting system:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create system' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updatedSystem = data;
    }

    // Write audit event
    const auditPayload = {
      system_id: updatedSystem.id,
      home_id: homeId,
      user_id: user.id,
      prev_install_year: prevInstallYear,
      new_install_year: newInstallYear,
      prev_install_source: prevInstallSource,
      new_install_source: newInstallSource,
      prev_replacement_status: prevReplacementStatus,
      new_replacement_status: replacementStatus,
      metadata: {
        client_request_id: installMetadata?.client_request_id,
        action: existingSystem ? 'update' : 'create',
      },
    };

    const { error: auditError } = await supabase
      .from('system_install_events')
      .insert(auditPayload);

    if (auditError) {
      // Log but don't fail the request
      console.error('Error writing audit event:', auditError);
    }

    // Return Strategy A response: full payload for immediate UI update
    const response = {
      system: updatedSystem,
      confidenceLevel,
      confidenceScore,
      installedLine,
      replacementStatus,
      message: getSuccessMessage(replacementStatus, newInstallYear),
    };

    console.log(`[update-system-install] Updated ${systemKey} for home ${homeId}:`, {
      prevYear: prevInstallYear,
      newYear: newInstallYear,
      prevSource: prevInstallSource,
      newSource: newInstallSource,
      confidenceLevel,
    });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-system-install:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getSuccessMessage(status: ReplacementStatus, year: number | null): string {
  switch (status) {
    case 'original':
      return 'Marked as original system. Your forecasts have been updated.';
    case 'replaced':
      return year 
        ? `Install date updated to ${year}. Your forecasts have been updated.`
        : 'System updated. Your forecasts have been updated.';
    case 'unknown':
      return 'Thanks for letting us know. We\'ll continue using our estimate.';
    default:
      return 'System updated.';
  }
}
