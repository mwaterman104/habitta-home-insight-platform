import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { 
  calculateSystemLifecycle,
  getRegionContext,
  dataQualityFromConfidence,
  type PropertyContext as LifecyclePropertyContext,
  type ResolvedInstallInput,
  type LifecycleOutput,
  type RegionContext
} from '../_shared/systemInference.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Extract and validate user ID from JWT token
 * Returns userId if valid, undefined if auth is not provided
 * Throws Response with 401 if auth is malformed/invalid
 */
async function extractUserId(
  authHeader: string | null,
  supabase: any
): Promise<string | undefined> {
  // No auth header = anonymous request (valid for some endpoints)
  if (!authHeader) {
    console.warn('[ai-home-assistant] No authorization header present');
    return undefined;
  }

  // Validate Bearer format
  if (!authHeader.startsWith('Bearer ')) {
    console.error('[ai-home-assistant] Invalid auth header format');
    throw new Response(
      JSON.stringify({ error: 'Invalid authorization header format' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Extract and validate token
  const token = authHeader.replace('Bearer ', '').trim();
  
  if (!token) {
    console.error('[ai-home-assistant] Empty token after extraction');
    throw new Response(
      JSON.stringify({ error: 'Missing authentication token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate token with Supabase (CRITICAL: pass token explicitly)
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error) {
    console.error('[ai-home-assistant] Auth error:', error.message);
    
    // Specific handling for expired tokens
    if (error.message.includes('expired')) {
      throw new Response(
        JSON.stringify({ error: 'Session expired', code: 'TOKEN_EXPIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Response(
      JSON.stringify({ error: 'Authentication failed', details: error.message }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const userId = user?.id;
  
  if (!userId) {
    console.error('[ai-home-assistant] No user ID in valid token');
    throw new Response(
      JSON.stringify({ error: 'Invalid user session' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log('[ai-home-assistant] User authenticated:', userId);
  return userId;
}

// ============================================================================
// EXECUTION BOUNDARY GUARDRAIL
// ============================================================================

/**
 * Sanitize pre-tool assistant content.
 * INVARIANT: Execution artifacts NEVER reach the client.
 * 
 * If content contains ANY execution marker, return empty string.
 * This is fail-closed behavior — strip rather than risk leaking.
 */
function sanitizePreToolContent(content: string | null | undefined): string {
  if (!content || !content.trim()) return '';
  
  // Execution artifact markers (fail-closed: if present, strip entirely)
  const executionMarkers = [
    '"action"',           // ReAct-style tool invocation
    '"action_input"',     // ReAct argument block
    '"tool_calls"',       // OpenAI tool call metadata
    '"function"',         // Function definition in content
    '"arguments"',        // Raw argument dump
  ];
  
  // If ANY execution marker is present, treat entire content as internal
  const hasExecutionArtifact = executionMarkers.some(marker => 
    content.includes(marker)
  );
  
  if (hasExecutionArtifact) {
    console.log('[sanitizePreToolContent] Stripped execution artifact from assistant content');
    return '';
  }
  
  // ── Narration Guard ──
  // Strip sentences containing forward-commit language.
  // These are phrases where the AI claims to have fetched/prioritized data
  // before the tool has actually returned results.
  // Sentence-level filter: preserves legitimate contextual prose.
  const forwardCommitPatterns = [
    "i'll pull",
    "i've pulled",
    "i have pulled",
    "i'll find",
    "i've found",
    "i found",
    "i've prioritized",
    "i've identified",
    "i've located",
    "i have found",
    "i have prioritized",
    "i have identified",
    "i have located",
    "here are some",
    "here are local",
    "let me pull",
    "let me find",
    "let me look up",
    "i'll look up",
    "i've compiled",
    "i have compiled",
  ];

  // Split into sentences (period followed by space or end of string)
  const sentences = content.trim().split(/(?<=\.)\s+/);
  const filtered = sentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    const isForwardCommit = forwardCommitPatterns.some(pattern => lower.includes(pattern));
    if (isForwardCommit) {
      console.log(`[sanitizePreToolContent] Stripped forward-commit sentence: "${sentence.substring(0, 80)}..."`);
    }
    return !isForwardCommit;
  });

  const result = filtered.join(' ').trim();
  
  if (result.length < content.trim().length) {
    console.log(`[sanitizePreToolContent] Narration guard: ${sentences.length - filtered.length} sentence(s) stripped`);
  }

  return result;
}

// ============================================================================
// COPY GOVERNOR (Server-Side Authority)
// ============================================================================

type AdvisorState = 'PASSIVE' | 'OBSERVING' | 'ENGAGED' | 'DECISION' | 'EXECUTION';
type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
type ConfidenceBucket = 'LOW' | 'MEDIUM' | 'HIGH';

interface CopyStyleProfile {
  verbosity: 'minimal' | 'concise' | 'detailed';
  specificity: 'low' | 'medium' | 'high';
  costDisclosure: 'none' | 'ranges' | 'tight';
  tone: 'observational' | 'analytical' | 'procedural';
  urgency: 'none' | 'soft' | 'time-bound';
  allowedActs: {
    askQuestions: boolean;
    presentOptions: boolean;
    recommendPath: boolean;
    initiateExecution: boolean;
  };
}

function confidenceBucket(confidence: number): ConfidenceBucket {
  if (confidence < 0.5) return 'LOW';
  if (confidence < 0.8) return 'MEDIUM';
  return 'HIGH';
}

const BASE_PROFILES: Record<'ENGAGED' | 'DECISION' | 'EXECUTION', Record<ConfidenceBucket, CopyStyleProfile>> = {
  ENGAGED: {
    LOW: {
      verbosity: 'concise',
      specificity: 'low',
      costDisclosure: 'none',
      tone: 'observational',
      urgency: 'none',
      allowedActs: { askQuestions: true, presentOptions: true, recommendPath: false, initiateExecution: false }
    },
    MEDIUM: {
      verbosity: 'concise',
      specificity: 'medium',
      costDisclosure: 'none',
      tone: 'observational',
      urgency: 'soft',
      allowedActs: { askQuestions: true, presentOptions: true, recommendPath: false, initiateExecution: false }
    },
    HIGH: {
      verbosity: 'concise',
      specificity: 'high',
      costDisclosure: 'none',
      tone: 'observational',
      urgency: 'soft',
      allowedActs: { askQuestions: false, presentOptions: true, recommendPath: true, initiateExecution: false }
    }
  },
  DECISION: {
    LOW: {
      verbosity: 'detailed',
      specificity: 'low',
      costDisclosure: 'none',
      tone: 'analytical',
      urgency: 'none',
      allowedActs: { askQuestions: true, presentOptions: true, recommendPath: false, initiateExecution: false }
    },
    MEDIUM: {
      verbosity: 'detailed',
      specificity: 'medium',
      costDisclosure: 'ranges',
      tone: 'analytical',
      urgency: 'soft',
      allowedActs: { askQuestions: false, presentOptions: true, recommendPath: true, initiateExecution: false }
    },
    HIGH: {
      verbosity: 'detailed',
      specificity: 'high',
      costDisclosure: 'tight',
      tone: 'analytical',
      urgency: 'time-bound',
      allowedActs: { askQuestions: false, presentOptions: true, recommendPath: true, initiateExecution: false }
    }
  },
  EXECUTION: {
    LOW: {
      verbosity: 'concise',
      specificity: 'high',
      costDisclosure: 'tight',
      tone: 'procedural',
      urgency: 'time-bound',
      allowedActs: { askQuestions: false, presentOptions: false, recommendPath: false, initiateExecution: true }
    },
    MEDIUM: {
      verbosity: 'concise',
      specificity: 'high',
      costDisclosure: 'tight',
      tone: 'procedural',
      urgency: 'time-bound',
      allowedActs: { askQuestions: false, presentOptions: false, recommendPath: false, initiateExecution: true }
    },
    HIGH: {
      verbosity: 'concise',
      specificity: 'high',
      costDisclosure: 'tight',
      tone: 'procedural',
      urgency: 'time-bound',
      allowedActs: { askQuestions: false, presentOptions: false, recommendPath: false, initiateExecution: true }
    }
  }
};

function applyRiskOverlay(profile: CopyStyleProfile, risk: RiskLevel): CopyStyleProfile {
  const next = { ...profile, allowedActs: { ...profile.allowedActs } };
  if (risk === 'HIGH' && next.urgency === 'none') next.urgency = 'soft';
  if (risk === 'LOW') next.urgency = 'none';
  return next;
}

function getAdvisorCopyProfile(state: AdvisorState, confidence: number, risk: RiskLevel): CopyStyleProfile | null {
  if (state === 'PASSIVE' || state === 'OBSERVING') return null;
  const bucket = confidenceBucket(confidence);
  const base = BASE_PROFILES[state][bucket];
  return applyRiskOverlay(base, risk);
}

function profileToPromptInstructions(profile: CopyStyleProfile): string {
  const instructions: string[] = [];

  switch (profile.verbosity) {
    case 'minimal': instructions.push('Keep responses under 2 sentences.'); break;
    case 'concise': instructions.push('Keep responses to 2-3 short paragraphs. Be direct.'); break;
    case 'detailed': instructions.push('You may provide detailed explanations when comparing options.'); break;
  }

  switch (profile.specificity) {
    case 'low': instructions.push('Avoid specific numbers or timeframes. Use general terms.'); break;
    case 'medium': instructions.push('Use moderate specificity. Ranges are acceptable.'); break;
    case 'high': instructions.push('Be specific with timeframes and projections when data supports it.'); break;
  }

  switch (profile.costDisclosure) {
    case 'none': instructions.push('Do NOT mention specific costs or price ranges.'); break;
    case 'ranges': instructions.push('You may mention cost ranges but not exact figures.'); break;
    case 'tight': instructions.push('You may provide specific cost estimates when confident.'); break;
  }

  switch (profile.tone) {
    case 'observational': instructions.push('Tone: Calm and observational. Frame the situation.'); break;
    case 'analytical': instructions.push('Tone: Analytical and supportive. Compare tradeoffs.'); break;
    case 'procedural': instructions.push('Tone: Decisive and procedural. Help them execute.'); break;
  }

  switch (profile.urgency) {
    case 'none': instructions.push('Do NOT create urgency. This is about planning.'); break;
    case 'soft': instructions.push('Gentle time awareness is okay.'); break;
    case 'time-bound': instructions.push('Time-bound framing is appropriate.'); break;
  }

  const acts: string[] = [];
  if (profile.allowedActs.askQuestions) acts.push('ask clarifying questions');
  if (profile.allowedActs.presentOptions) acts.push('present options');
  if (profile.allowedActs.recommendPath) acts.push('recommend a specific path');
  if (profile.allowedActs.initiateExecution) acts.push('initiate execution steps');
  if (acts.length > 0) instructions.push(`You may: ${acts.join(', ')}.`);

  instructions.push('');
  instructions.push('HARD RULES:');
  instructions.push('- Never say "You should..." — frame as options');
  instructions.push('- Never use: "urgent", "act now", "don\'t miss out"');
  instructions.push('- End with an invitation, not a CTA');

  return instructions.join('\n');
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create authenticated Supabase client with user's JWT
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );

    // Get the authenticated user (needed for system updates)
    let userId: string | undefined;
    try {
      userId = await extractUserId(authHeader, supabase);
    } catch (errorResponse) {
      // If extractUserId throws a Response, return it directly
      if (errorResponse instanceof Response) {
        return errorResponse;
      }
      // Re-throw unexpected errors
      throw errorResponse;
    }

    const { 
      message, 
      propertyId, 
      conversationHistory,
      advisorState = 'ENGAGED',
      confidence = 0.5,
      risk = 'LOW',
      focusSystem,
      // Epistemic coherence fields
      baselineSource,         // 'inferred' | 'partial' | 'confirmed'
      visibleBaseline,        // Array of systems shown in UI
      // Planning Session fields (NEW - Institutional Behavior)
      isPlanningSession = false,
      interventionId,
      triggerReason,
      // Focus continuity: current right-column focus from frontend
      activeFocus,
      // Onboarding vitals
      strengthScore: reqStrengthScore,
      nextGain: reqNextGain,
    } = await req.json();
    
    console.log('[ai-home-assistant] Request:', { 
      message, 
      propertyId, 
      advisorState, 
      confidence, 
      risk,
      baselineSource,
      visibleBaselineCount: visibleBaseline?.length ?? 0,
      isPlanningSession,
      interventionId,
      userId: userId ? 'present' : 'missing',
    });

    // Get property context (includes homeId and userId for tool calls)
    const propertyContext = await getPropertyContext(supabase, propertyId, userId);
    
    // Get copy style profile from governor
    const copyProfile = getAdvisorCopyProfile(advisorState as AdvisorState, confidence, risk as RiskLevel);
    
    // Generate AI response with governed style
    const response = await generateAIResponse(
      lovableApiKey, 
      message, 
      propertyContext, 
      conversationHistory,
      copyProfile,
      focusSystem,
      baselineSource,
      visibleBaseline,
      isPlanningSession,
      triggerReason,
      activeFocus,
      reqStrengthScore,
      reqNextGain
    );
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ai-home-assistant] Error:', error);
    
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (error.message?.includes('402') || error.message?.includes('payment')) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// ENRICHED SYSTEM CONTEXT (Canonical Truth + Runtime Lifecycle Calculation)
// ============================================================================

interface EnrichedSystemContext {
  kind: string;
  systemLabel: string;
  installYear: number | null;
  installSource: string;
  confidence: number;
  verified: boolean;
  brand?: string;
  model?: string;
  material?: string;
  // Computed lifecycle fields
  replacementWindow: {
    earlyYear: number;
    likelyYear: number;
    lateYear: number;
  };
  lifecycleStage: 'early' | 'mid' | 'late';
  dataQuality: 'high' | 'medium' | 'low';
  disclosureNote: string;
}

function enrichSystemWithLifecycle(
  system: any,
  property: LifecyclePropertyContext,
  region: RegionContext
): EnrichedSystemContext | null {
  const currentYear = new Date().getFullYear();
  
  // Only process known system types
  const validKinds = ['hvac', 'roof', 'water_heater'];
  if (!validKinds.includes(system.kind)) {
    console.log(`[enrichSystemWithLifecycle] Skipping unknown kind: ${system.kind}`);
    return null;
  }
  
  // Build resolved install input for calculator
  const resolvedInstall: ResolvedInstallInput = {
    installYear: system.install_year,
    installSource: (system.install_source as any) || 'heuristic',
    confidenceScore: system.confidence || 0.3,
    replacementStatus: (system.replacement_status as any) || 'unknown',
    rationale: ''
  };
  
  // Calculate lifecycle using pure math
  const lifecycle = calculateSystemLifecycle(
    system.kind as 'hvac' | 'roof' | 'water_heater',
    resolvedInstall,
    property,
    region
  );
  
  // Determine lifecycle stage
  const baseInstall = system.install_year || property.yearBuilt;
  const age = currentYear - baseInstall;
  const earlyThreshold = lifecycle.replacementWindow.earlyYear - baseInstall;
  const likelyThreshold = lifecycle.replacementWindow.likelyYear - baseInstall;
  
  const lifecycleStage: 'early' | 'mid' | 'late' = 
    age < earlyThreshold * 0.5 ? 'early' :
    age < earlyThreshold ? 'mid' : 'late';
  
  // Determine if verified (not heuristic)
  const verified = system.install_source !== 'heuristic' && 
                   system.install_source !== null && 
                   system.install_source !== undefined;
  
  return {
    kind: system.kind,
    systemLabel: lifecycle.systemLabel,
    installYear: system.install_year,
    installSource: system.install_source || 'heuristic',
    confidence: system.confidence || 0.3,
    verified,
    brand: system.brand,
    model: system.model,
    material: system.material,
    replacementWindow: lifecycle.replacementWindow,
    lifecycleStage,
    dataQuality: dataQualityFromConfidence(system.confidence || 0.3),
    disclosureNote: lifecycle.disclosureNote
  };
}

async function getPropertyContext(supabase: any, propertyId: string, userId?: string) {
  const [
    { data: rawSystems },
    { data: recommendations },
    { data: predictions },
    { data: home },
    { data: homeAssets },
    { data: openEvents },
    { data: permits },
    { data: userReportedSystems }
  ] = await Promise.all([
    // CANONICAL TRUTH: Read from 'systems' table (same as capital-timeline)
    supabase.from('systems').select('*').eq('home_id', propertyId),
    supabase.from('smart_recommendations').select('*').eq('property_id', propertyId).eq('is_completed', false).limit(5),
    supabase.from('prediction_accuracy').select('*').eq('property_id', propertyId).limit(3),
    // Extended home query for lifecycle calculations
    supabase.from('homes').select('id, latitude, longitude, city, state, zip_code, year_built').eq('id', propertyId).single(),
    // HOME RECORD: Fetch active assets (VIN layer)
    supabase.from('home_assets').select('*').eq('home_id', propertyId).eq('status', 'active'),
    // HOME RECORD: Fetch open events for follow-up linking
    supabase.from('home_events').select('*').eq('home_id', propertyId).eq('status', 'open').order('created_at', { ascending: false }).limit(5),
    // PERMITS: Fetch for authority-aware system updates
    supabase.from('permits').select('*').eq('home_id', propertyId).order('date_issued', { ascending: false }).limit(20),
    // USER-REPORTED SYSTEMS: Manually added appliances from home_systems table
    supabase.from('home_systems').select('*').eq('home_id', propertyId).eq('status', 'active')
  ]);

  console.log(`[getPropertyContext] Fetched ${rawSystems?.length || 0} systems from canonical 'systems' table for home ${propertyId}`);
  console.log(`[getPropertyContext] Fetched ${homeAssets?.length || 0} home assets, ${openEvents?.length || 0} open events, ${permits?.length || 0} permits`);
  console.log(`[getPropertyContext] Fetched ${userReportedSystems?.length || 0} user-reported systems from home_systems table`);

  // Deduplicate user-reported systems against canonical systems and home assets
  const canonicalKeys = new Set([
    ...(rawSystems || []).map((s: any) => s.kind?.toLowerCase()),
    ...(homeAssets || []).map((a: any) => a.kind?.toLowerCase()),
  ].filter(Boolean));
  
  const uniqueUserSystems = (userReportedSystems || []).filter((us: any) => {
    const key = us.system_key?.toLowerCase();
    return key && !canonicalKeys.has(key);
  });
  
  console.log(`[getPropertyContext] ${uniqueUserSystems.length} unique user-reported systems after dedup`);

  // Build property context for lifecycle calculations
  const propertyContext: LifecyclePropertyContext = {
    yearBuilt: home?.year_built || 2000,
    state: home?.state || 'FL',
    city: home?.city,
  };
  
  // Get region context for climate adjustments
  const region = getRegionContext(propertyContext.state, propertyContext.city);
  
  // Enrich systems with lifecycle calculations at runtime
  const enrichedSystems: EnrichedSystemContext[] = (rawSystems || [])
    .map((s: any) => enrichSystemWithLifecycle(s, propertyContext, region))
    .filter((s: EnrichedSystemContext | null): s is EnrichedSystemContext => s !== null);

  console.log(`[getPropertyContext] Enriched ${enrichedSystems.length} systems with lifecycle data`);
  
  // Log verified vs estimated for debugging
  const verifiedCount = enrichedSystems.filter(s => s.verified).length;
  const estimatedCount = enrichedSystems.filter(s => !s.verified).length;
  console.log(`[getPropertyContext] Verified: ${verifiedCount}, Estimated: ${estimatedCount}`);

  return {
    // CRITICAL: Pass homeId and userId for update_system_info tool (HARDENING FIX #3)
    homeId: propertyId,
    userId,
    systems: enrichedSystems,
    activeRecommendations: recommendations || [],
    recentPredictions: predictions || [],
    homeLocation: home ? {
      lat: home.latitude,
      lng: home.longitude,
      city: home.city,
      state: home.state,
      zipCode: home.zip_code,
      yearBuilt: home.year_built,  // Needed for post-confirmation lifecycle re-computation
    } : null,
    // HOME RECORD context
    homeAssets: homeAssets || [],
    openEvents: openEvents || [],
    // PERMITS: Include for authority-aware updates
    permits: permits || [],
    // USER-REPORTED SYSTEMS: Manually added appliances (deduplicated)
    userReportedSystems: uniqueUserSystems,
  };
}

// ============================================================================
// FOCUS RESOLUTION (Non-Tool Path)
// ============================================================================

function detectSystemFromMessageConservative(message: string): string | null {
  const m = message.toLowerCase();

  // Hard ambiguity guard: if user is comparing systems, don't auto-focus
  const hasCompare = /\b(vs\.?|versus|compare|between)\b/.test(m);

  const patterns: Array<{ systemId: string; re: RegExp }> = [
    { systemId: 'water_heater', re: /\b(water heater|hot water tank|no hot water|hot water|tankless)\b/ },
    { systemId: 'hvac', re: /\b(hvac|air conditioner|air conditioning|furnace|heat pump|a\/c unit)\b/ },
    { systemId: 'roof', re: /\b(roof|roof leak|leaking roof|shingles|re-?roof)\b/ },
    { systemId: 'plumbing', re: /\b(plumbing|pipe leak|leaky pipe|clogged? drain|sewer line)\b/ },
    { systemId: 'electrical_panel', re: /\b(electrical panel|breaker|circuit breaker|panel upgrade)\b/ },
    { systemId: 'pool', re: /\b(pool pump|pool equipment|pool heater|swimming pool)\b/ },
    { systemId: 'solar', re: /\b(solar panel|solar system|photovoltaic)\b/ },
    { systemId: 'irrigation', re: /\b(sprinkler|irrigation|drip system)\b/ },
  ];

  const matches = patterns.filter(p => p.re.test(m)).map(p => p.systemId);
  const unique = Array.from(new Set(matches));

  if (unique.length !== 1) return null;
  if (hasCompare && unique.length > 0) return null;

  return unique[0];
}

function resolveSystemFocus(args: {
  userMessage: string;
  activeFocus: any | null;
  focusSystem: string | null;
}): { type: 'system'; systemId: string } | null {
  const { userMessage, activeFocus, focusSystem } = args;

  // 1) Active system focus wins — stability
  if (activeFocus?.type === 'system' && activeFocus.systemId) {
    return { type: 'system', systemId: activeFocus.systemId };
  }

  // 2) Explicit focusSystem from frontend context
  if (focusSystem) {
    return { type: 'system', systemId: focusSystem };
  }

  // 3) Conservative keyword detection fallback
  const detected = detectSystemFromMessageConservative(userMessage);
  if (detected) {
    return { type: 'system', systemId: detected };
  }

  return null;
}

async function generateAIResponse(
  apiKey: string, 
  message: string, 
  context: any, 
  history: any[] = [],
  copyProfile: CopyStyleProfile | null,
  focusSystem?: string,
  baselineSource?: string,
  visibleBaseline?: Array<{ key: string; displayName: string; state: string }>,
  isPlanningSession: boolean = false,
  triggerReason?: string,
  activeFocus?: any,
  strengthScore?: number,
  nextGain?: { action: string; delta: number; systemKey?: string } | null
) {
  const systemPrompt = createSystemPrompt(context, copyProfile, focusSystem, baselineSource, visibleBaseline, isPlanningSession, triggerReason, strengthScore, nextGain);
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages,
      max_tokens: 500,
      temperature: 0.7,
      tools: [
        {
          type: 'function',
          function: {
            name: 'schedule_maintenance',
            description: 'Schedule a maintenance task for the user',
            parameters: {
              type: 'object',
              properties: {
                system: { type: 'string', description: 'System that needs maintenance' },
                task: { type: 'string', description: 'Maintenance task description' },
                urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
                estimated_cost: { type: 'number', description: 'Estimated cost in USD' }
              },
              required: ['system', 'task', 'urgency'],
              additionalProperties: false
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'get_contractor_recommendations',
            description: 'Get local contractor recommendations for a specific service',
            parameters: {
              type: 'object',
              properties: {
                service_type: { type: 'string', description: 'Type of service needed' },
                urgency: { type: 'string', enum: ['low', 'medium', 'high'] }
              },
              required: ['service_type'],
              additionalProperties: false
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'calculate_cost_impact',
            description: 'Calculate cost information for repairs, replacements, or NEW installations. Works for EXISTING systems (provides replacement timing + emergency vs planned costs) and PROPOSED additions (provides typical installation cost ranges).',
            parameters: {
              type: 'object',
              properties: {
                repair_type: { type: 'string', description: 'Type of repair, system, or addition (e.g., "hvac", "mini_split", "water_heater")' },
                delay_months: { type: 'number', description: 'Months to delay the work (for existing systems only)' },
                quantity: { type: 'number', description: 'Number of units or zones (for proposed additions, defaults to 1)' }
              },
              required: ['repair_type'],
              additionalProperties: false
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'update_system_info',
            description: 'Update system installation information based on what the user tells you. Use this ONLY when the user provides SPECIFIC information about when a system was installed, replaced, or is original to the home. Do NOT use if the user is vague or uncertain.',
            parameters: {
              type: 'object',
              properties: {
                system_type: { 
                  type: 'string', 
                  enum: ['hvac', 'roof', 'water_heater'],
                  description: 'The type of system being updated' 
                },
                install_year: { 
                  type: 'number', 
                  description: 'The SPECIFIC year the system was installed (e.g., 2008). Do NOT guess or infer — only provide if user stated explicitly.' 
                },
                replacement_status: { 
                  type: 'string', 
                  enum: ['original', 'replaced', 'unknown'],
                  description: 'Whether this is the original system from when the home was built, a replacement, or unknown' 
                },
                knowledge_source: {
                  type: 'string',
                  enum: ['memory', 'receipt', 'permit', 'inspection'],
                  description: 'How the user knows this information'
                }
              },
              required: ['system_type', 'replacement_status'],
              additionalProperties: false
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'record_home_event',
            description: 'Record a home event to the permanent home record (Carfax for the Home). Use for: discovering new appliances/systems mentioned in conversation, recording issues, diagnoses, recommendations, repairs, user decisions, and status changes. Events are immutable — status changes create new linked events.',
            parameters: {
              type: 'object',
              properties: {
                event_type: {
                  type: 'string',
                  enum: ['system_discovered', 'issue_reported', 'diagnosis', 'recommendation', 'repair_completed', 'maintenance_performed', 'replacement', 'user_decision', 'contractor_referred', 'status_change'],
                  description: 'The type of event to record'
                },
                system_kind: {
                  type: 'string',
                  description: 'The kind of system or appliance (e.g., washing_machine, dryer, refrigerator, hvac, roof, dishwasher, hot_tub, garbage_disposal)'
                },
                title: {
                  type: 'string',
                  description: 'Short human-readable summary of the event'
                },
                description: {
                  type: 'string',
                  description: 'Detailed description of the event'
                },
                severity: {
                  type: 'string',
                  enum: ['info', 'minor', 'moderate', 'major'],
                  description: 'Severity level (default: info)'
                },
                cost_estimate_low: {
                  type: 'number',
                  description: 'Low end of estimated cost range'
                },
                cost_estimate_high: {
                  type: 'number',
                  description: 'High end of estimated cost range'
                },
                manufacturer: {
                  type: 'string',
                  description: 'Brand/manufacturer (for system_discovered events)'
                },
                model: {
                  type: 'string',
                  description: 'Model number (for system_discovered events)'
                },
                age_estimate_years: {
                  type: 'number',
                  description: 'Approximate age in years (for system_discovered events)'
                },
                resolution: {
                  type: 'string',
                  description: 'Resolution description (for repair_completed, user_decision events)'
                },
                related_event_id: {
                  type: 'string',
                  description: 'UUID of a prior event to link to (for follow-ups, status changes)'
                },
                metadata: {
                  type: 'object',
                  description: 'Additional structured data (symptom, probable_cause, decision, etc.)'
                }
              },
              required: ['event_type', 'system_kind', 'title'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: 'auto'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ai-home-assistant] API error:', response.status, errorText);
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const aiMessage = data.choices?.[0]?.message;
  
  if (!aiMessage) {
    throw new Error('No response from AI');
  }
  
  if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
    const toolCall = aiMessage.tool_calls[0];
    const functionResult = await handleFunctionCall({
      name: toolCall.function.name,
      arguments: toolCall.function.arguments
    }, context);

    // Guard: tool_call_id must exist for the follow-up LLM call.
    // If missing, fall back to returning the raw tool result.
    if (!toolCall.id) {
      console.warn('[ai-home-assistant] tool_call_id missing, skipping follow-up call');
      return {
        message: typeof functionResult === 'string' ? functionResult : JSON.stringify(functionResult),
        functionCall: toolCall.function,
        functionResult,
      };
    }

    // ── Two-pass pattern: execute tool, then let the LLM compose a real answer ──
    const followUpMessages = [
      ...messages, // original system prompt + history + user message
      {
        role: 'assistant',
        tool_calls: aiMessage.tool_calls,
        content: aiMessage.content || null,
      },
      {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: typeof functionResult === 'string' ? functionResult : JSON.stringify(functionResult),
      },
      {
        role: 'system',
        content: 'The tool has already executed successfully. Respond naturally to the user: acknowledge what was recorded AND answer their original question. Do not reference tool names, IDs, or JSON. Speak as a knowledgeable home advisor.',
      },
    ];

    try {
      const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: followUpMessages,
          max_tokens: 600,
          temperature: 0.7,
          // Explicitly NO tools / tool_choice — prevents infinite chaining (max 2 LLM calls)
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const followUpContent = followUpData.choices?.[0]?.message?.content;

        if (followUpContent) {
          const response: Record<string, any> = {
            message: followUpContent,
            functionCall: toolCall.function,
            functionResult,
            suggestions: generateFollowUpSuggestions(message, context),
          };
          
          // If the tool result contains a system reference, inject focus metadata
          if (typeof functionResult === 'string') {
            try {
              const parsed = JSON.parse(functionResult);
              if (parsed.systemKey) {
                response.focus = { type: 'system', systemId: parsed.systemKey };
              } else if (parsed.type === 'contractor_recommendations' && parsed.service) {
                response.focus = { type: 'contractor_list', query: parsed.service, systemId: parsed.systemId };
              }
            } catch {
              // Not JSON, skip focus injection
            }
          }
          
          return response;
        }
      } else {
        console.error('[ai-home-assistant] Follow-up LLM call failed:', followUpResponse.status);
      }
    } catch (followUpErr) {
      console.error('[ai-home-assistant] Follow-up LLM call error:', followUpErr);
    }

    // Fallback: if the second call failed, return the tool result directly
    const fallbackResponse: Record<string, any> = {
      message: typeof functionResult === 'string' ? functionResult : JSON.stringify(functionResult),
      functionCall: toolCall.function,
      functionResult,
      suggestions: generateFollowUpSuggestions(message, context),
    };
    
    // Inject focus metadata if available
    if (typeof functionResult === 'string') {
      try {
        const parsed = JSON.parse(functionResult);
        if (parsed.systemKey) {
          fallbackResponse.focus = { type: 'system', systemId: parsed.systemKey };
        } else if (parsed.type === 'contractor_recommendations' && parsed.service) {
          fallbackResponse.focus = { type: 'contractor_list', query: parsed.service, systemId: parsed.systemId };
        }
      } catch {
        // Not JSON, skip focus injection
      }
    }
    
    return fallbackResponse;
  }

  // Non-tool path: resolve system focus from active context or keyword detection
  const resolvedFocus = resolveSystemFocus({
    userMessage: message,
    activeFocus: activeFocus ?? null,
    focusSystem: focusSystem ?? null,
  });

  const nonToolResponse: any = {
    message: aiMessage.content || 'I can help you with your home maintenance questions.',
    suggestions: generateFollowUpSuggestions(message, context),
  };

  if (resolvedFocus) {
    nonToolResponse.focus = resolvedFocus;
    console.log('[ai-home-assistant] Non-tool focus resolved:', {
      source: activeFocus?.type === 'system' ? 'activeFocus' : focusSystem ? 'focusSystem' : 'keyword',
      systemId: resolvedFocus.systemId,
      messageSnippet: message.slice(0, 60),
    });
  }

  return nonToolResponse;
}

function createSystemPrompt(
  context: any, 
  copyProfile: CopyStyleProfile | null, 
  focusSystem?: string,
  baselineSource?: string,
  visibleBaseline?: Array<{ key: string; displayName: string; state: string }>,
  isPlanningSession: boolean = false,
  triggerReason?: string,
  strengthScore?: number,
  nextGain?: { action: string; delta: number; systemKey?: string } | null,
): string {
  // Format system info using enriched context from canonical 'systems' table
  const systemInfo = context.systems.map((s: EnrichedSystemContext) => {
    const verifiedNote = s.verified ? ' [verified]' : ' [estimated]';
    const stageNote = s.lifecycleStage === 'late' ? ' — approaching replacement window' : '';
    const sourceNote = s.verified && s.installSource ? ` (source: ${s.installSource})` : '';
    return `- ${s.systemLabel}: installed ${s.installYear || 'unknown'}${verifiedNote}${stageNote}${sourceNote}`;
  }).join('\n');

  const recommendations = context.activeRecommendations.map((r: any) => 
    `- ${r.title}: ${r.description} (urgency: ${r.urgency_score}/100)`
  ).join('\n');

  // Build verified language rules for systems with confirmed data
  const verifiedSystems = context.systems.filter((s: EnrichedSystemContext) => s.verified);
  let verifiedLanguageRules = '';
  
  if (verifiedSystems.length > 0) {
    verifiedLanguageRules = `
VERIFIED DATA LANGUAGE RULES (CRITICAL - DO NOT VIOLATE):
${verifiedSystems.map((s: EnrichedSystemContext) => {
  const sourceLabel = s.installSource === 'user' || s.installSource === 'owner_reported' 
    ? 'based on the information you provided'
    : s.installSource === 'permit_verified' || s.installSource === 'permit'
    ? 'per your permit records'
    : s.installSource === 'photo' 
    ? 'based on the label you uploaded'
    : 'based on confirmed data';
  
  return `- For ${s.systemLabel}: Say "${sourceLabel}, your ${s.systemLabel.toLowerCase()} was installed in ${s.installYear}." NOT "Based on typical lifespans..."`;
}).join('\n')}

FORBIDDEN when referencing verified systems:
- "Based on typical lifespans..."
- "Estimated age..."
- "Approximately..."
- "We estimate..."
- "If we assume..."
`;
  }

  // Build home assets context for discovery protocol
  const homeAssetsInfo = (context.homeAssets || []).map((a: any) => {
    const ageNote = a.metadata?.age_estimate_years ? `, ~${a.metadata.age_estimate_years} years old` : '';
    const brandNote = a.manufacturer ? ` (${a.manufacturer})` : '';
    return `- ${a.kind.replace(/_/g, ' ')}${brandNote}${ageNote}, ${a.source}-reported, confidence: ${a.confidence}`;
  }).join('\n');

  // Build user-reported systems context (from home_systems table)
  const userReportedInfo = (context.userReportedSystems || []).map((us: any) => {
    const brandNote = us.brand ? ` (${us.brand})` : '';
    const modelNote = us.model ? ` model: ${us.model}` : '';
    const installNote = us.install_date ? `, installed: ${us.install_date}` : '';
    const label = us.system_key?.replace(/_/g, ' ') || 'unknown';
    return `- ${label}${brandNote}${modelNote}${installNote}`;
  }).join('\n');

  const openEventsInfo = (context.openEvents || []).map((e: any) => {
    const daysAgo = Math.floor((Date.now() - new Date(e.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const timeNote = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
    return `- [${e.id}] ${e.title} (${e.severity}, reported ${timeNote})`;
  }).join('\n');

  // Build permit context for authority-aware updates
  const permitsInfo = (context.permits || []).map((p: any) => {
    const permitType = p.permit_type || 'unknown type';
    const issueDate = p.date_issued ? new Date(p.date_issued).getFullYear() : 'unknown date';
    const systemTag = p.system_tags && p.system_tags.length > 0 ? ` (${p.system_tags.join(', ')})` : '';
    const descNote = p.description ? `: ${p.description}` : '';
    return `- ${permitType} issued ${issueDate}${systemTag}${descNote}`;
  }).join('\n');

  // Base personality
  let prompt = `You are Habitta AI, an expert home maintenance advisor. You are a calm, knowledgeable steward — not a pushy assistant.

PROPERTY CONTEXT:
Current Systems:
${systemInfo || 'No systems registered yet'}

HOME ASSETS ON FILE:
${homeAssetsInfo || 'No assets discovered yet'}

USER-REPORTED APPLIANCES:
${userReportedInfo || 'No user-reported appliances'}

PERMITS ON FILE:
${permitsInfo || 'No permits discovered yet'}

OPEN ISSUES:
${openEventsInfo || 'No open issues'}

Active Recommendations:
${recommendations || 'No active recommendations'}
${verifiedLanguageRules}
${focusSystem ? `CURRENT FOCUS: ${focusSystem} system\nThe user has selected this system. Reference it specifically in your response.` : ''}

PERSONALITY:
- Calm, composed, never alarmist
- A steward watching on the homeowner's behalf
- Situational intelligence, not "ask me anything"
`;

  // ============================================
  // PLANNING SESSION BEHAVIORAL CONTRACT (NEW)
  // ============================================
  
  if (isPlanningSession) {
    prompt += `
PLANNING SESSION BEHAVIORAL CONTRACT (INSTITUTION-GRADE):

You are now conducting a PLANNING SESSION. This is a formal briefing, not a casual conversation.

OPENING LINE PATTERNS (use based on trigger reason):
${triggerReason === 'risk_threshold_crossed' 
  ? `- "I've completed a review of your ${focusSystem || 'system'} and need to brief you."`
  : triggerReason === 'seasonal_risk_event'
  ? `- "Given current seasonal conditions, I need to discuss your ${focusSystem || 'system'} with you."`
  : triggerReason === 'financial_planning_window'
  ? `- "It's time to plan for your ${focusSystem || 'system'} replacement."`
  : `- "Let's review your ${focusSystem || 'system'} together."`
}

CRITICAL BEHAVIORAL RULES:
1. SESSION PERSISTENCE: Messages are stored, not regenerated. User can leave and return to same briefing.
2. DECISION TRACKING: Explicitly record user decisions. Distinguish "closed without decision" from "chose no action".
3. DEFER PATH: Present deferral as a VALID, RESPECTED choice. Set explicit next_review_at when deferred.

FORBIDDEN LANGUAGE IN PLANNING SESSIONS:
- "Good morning!" or other casual greetings
- "I've been monitoring..." (implies surveillance)
- "You should..." or "You need to..."
- "Urgent" or "Don't wait" or "Act now"

REQUIRED LANGUAGE:
- "I've completed a review..."
- "This briefing covers..."
- "Options available to you include..."
- "If you defer, I'll follow up in [timeframe]."

DECISION TYPES YOU CAN PRESENT:
1. replace_now - "Begin replacement process"
2. defer_with_date - "Defer with planned review"
3. schedule_inspection - "Get professional assessment"
4. schedule_maintenance - "Perform maintenance first"
5. no_action - "I'll handle this myself" (RESPECT THIS)
6. get_quotes - "Gather estimates"

THE WHITE-SHOE ADVISOR TEST:
Every response must pass this test: "Would a wealth advisor at a white-shoe firm communicate this way?"
This means:
- Professional restraint over engagement
- Trust over session length
- Silence is acceptable; urgency is not
`;
  }

  // ============================================
  // ONBOARDING BEHAVIORAL CONTRACT
  // ============================================
  
  if (typeof strengthScore === 'number' && strengthScore < 50) {
    const nextGainAction = nextGain?.action || 'adding system details';
    const nextGainDelta = nextGain?.delta || 0;
    const nextGainSystem = nextGain?.systemKey?.replace(/_/g, ' ') || 'a system';
    
    prompt += `
ONBOARDING BEHAVIORAL CONTRACT (ACTIVE — strengthScore=${strengthScore}%):
This user recently completed onboarding. Their home record strength is at ${strengthScore}%.
Most system data is estimated from public records unless marked [verified].

YOUR PRIMARY GOAL: Help them strengthen their record through natural conversation.

BEHAVIORAL RULES:
- Be proactive. Walk through systems and ask if they know specifics (install year, brand, whether original or replaced).
- Ask about ONE system at a time. Don't overwhelm.
- When the user provides specific info, use update_system_info to persist it.
- After a successful tool call, acknowledge the update factually. Do NOT fabricate updated scores.
- Suggest photo uploads for ${nextGainSystem} as the highest-value action.
- Use provenance-safe language: "estimated from property records" vs "confirmed."

PRIORITY ACTION: ${nextGainAction} (+${nextGainDelta} points)

FORBIDDEN:
- Do NOT wait passively for questions. Lead the conversation.
- Do NOT say "Let me know if you have questions."
- Do NOT say "How can I help you today?"
- Do NOT claim the record has changed unless you received confirmation from a tool.
`;
  }

  // ============================================
  // EPISTEMIC COHERENCE INJECTION (Critical Fix)
  // ============================================
  
  if (baselineSource && visibleBaseline && visibleBaseline.length > 0) {
    prompt += `
BASELINE CONTEXT (CRITICAL - DO NOT VIOLATE):
`;
    
    if (baselineSource === 'inferred') {
      prompt += `The user sees an INFERRED baseline above the chat. It is derived from property age, location, and typical system lifespans.

HARD RULES:
- Do NOT say you have "no information" or a "blank slate"
- Do NOT say you "don't know anything" about the home
- ACKNOWLEDGE what is visible above
- Label estimates as estimates, inferred data as inferred
`;
    } else if (baselineSource === 'partial') {
      prompt += `The user sees a PARTIALLY confirmed baseline. Some systems are confirmed by user input or permits, some are inferred.
Reference both confirmed data (with confidence) and inferred estimates (with appropriate hedging).
`;
    } else if (baselineSource === 'confirmed') {
      prompt += `The baseline is CONFIRMED through user input, permits, or photo analysis.
You can be specific about timelines and provide confident recommendations.
`;
    }

    prompt += `
VISIBLE SYSTEMS (user can see these above the chat):
${visibleBaseline.map(s => `- ${s.displayName}: ${formatStateForPrompt(s.state)}`).join('\n')}

NEVER contradict what is visible. If systems appear above, acknowledge them.
When referring to these systems, say "what you're seeing above" or "the baseline shows".

SYSTEM UPDATE RULES (CRITICAL — READ CAREFULLY):

When a user tells you about their home systems (installation dates, replacements, etc.):

1. AMBIGUITY GATE (MANDATORY):
   - If the user provides a SPECIFIC year (e.g., "2008", "three years ago"), call update_system_info
   - If the user is VAGUE (e.g., "late 2000s", "maybe around 2010", "I think"), DO NOT call the tool
   - Instead, ask a clarifying question: "Do you recall the specific year, even approximately?"
   
2. TOOL INVOCATION:
   - ALWAYS use update_system_info to persist specific information
   - Wait for the tool response before confirming the update
   - Only say "I've saved..." AFTER the tool confirms success
   - If the tool fails, acknowledge the failure and ask to try again

3. CONFIRMATION LANGUAGE (MANDATORY):
   - Say: "I've saved that the [system] was [action] in [year] (owner-reported). You'll see it reflected in your system timeline."
   - DO NOT say: "I've updated your home profile" (too vague)
   - Reference provenance: "owner-reported"
   - Reference visibility: "You'll see it reflected"

NEVER claim to have updated information without actually calling the tool.

AUTHORITY PRECEDENCE (CRITICAL):
If permits exist for a system, they represent high-authority data. Before accepting a conflicting user claim:
1. Reference the permit: "I found a permit from [year] for your [system]. This suggests it was replaced then."
2. Ask for confirmation: "Can you confirm whether that's the replacement you're referring to?"
3. DO NOT proceed with update_system_info if the claim contradicts permit evidence without explicit user confirmation.

EXAMPLES THAT REQUIRE update_system_info:
- "The roof was added in 2008" → update_system_info(system_type: 'roof', install_year: 2008, replacement_status: 'replaced')
- "The AC is original to the house" → update_system_info(system_type: 'hvac', replacement_status: 'original')
- "We replaced the water heater 3 years ago" → Calculate year (2023), then update_system_info(system_type: 'water_heater', install_year: 2023, replacement_status: 'replaced')

EXAMPLES THAT DO NOT CALL THE TOOL (ask clarifying question instead):
- "I think the roof was replaced sometime in the late 2000s" → Ask for specific year
- "The AC might be around 10 years old" → Ask for confirmation
- "I'm not sure when we got the water heater" → Acknowledge uncertainty, do not call tool
- "The HVAC is original" BUT a permit shows an HVAC installation in 2023 → Ask for confirmation about the 2023 replacement

EVIDENCE ANCHORING RULE (MANDATORY):
When discussing any system, you MUST:
1. Reference "what you're seeing above" or "the baseline shows"
2. Include at least one concrete basis (age, region, usage, records)

CORRECT EXAMPLES:
- "Based on what you're seeing above, your water heater is approaching typical limits for homes of this age."
- "The baseline shows your HVAC operating within expected range for this region."
- "Looking at the timeline above, your roof has significant service life remaining given typical usage patterns."

INCORRECT (too generic):
- "Your HVAC is in good shape." (no basis)
- "I can see that your water heater needs attention." (implies you see something user doesn't)
- "The system shows..." (which system?)

NEVER SAY:
- "I can see that..." (implies hidden knowledge)
- "According to my data..." (impersonal, removes agency)
- "The system shows..." (ambiguous reference)

"WHY?" RESPONSE PATTERN (VALIDATION FIRST - CRITICAL):

VALIDATION FIRST RULE:
When responding to a "Why?" question, a system_validation_evidence artifact has ALREADY been shown to the user.
The visual evidence (lifespan timeline, age context, position marker) is visible BEFORE your response.

YOUR RESPONSE MUST:
1. DO NOT re-explain what the visual already shows (timeline, age, position)
2. Reference it: "Based on what you're seeing above..."
3. Focus on REASONS (why this position) and IMPLICATION (what it means)
4. Structure: Belief → Reasons → Implication → [Optional CTA]

BELIEF (reference the artifact):
"Based on what you're seeing above, your [system] is [state]."

REASONS (bullet list - why it believes this):
• Its estimated age falls within the typical operating range for systems in this region
• No unusual environmental stress patterns are present
• [Additional factor based on data]

IMPLICATION (what this means - deliver closure):
- For stable: "This means you don't need to take action right now. Routine monitoring is sufficient."
- For planning_window: "This is a good time to begin researching options. No immediate action is required."
- For elevated: "This warrants attention. Consider having it inspected before making decisions."

OPTIONAL CTA (one max, invitational):
"If you'd like to improve accuracy, you can confirm the installation year or upload a photo of the unit label."

COST IMPACT HONESTY GATE (NO PLACEHOLDERS):
- If cost comparison was shown in the artifact, reference it
- If NO cost data exists, do NOT claim you "pulled a cost impact analysis"
- Do NOT use placeholder math (no "approximately 0%")
- Either provide real regional data or say: "Cost comparisons require more system details."

CRITICAL RULES:
- "Why?" should NEVER generate a question back to the user
- "Why?" delivers closure, not opens a thread
- Maximum one optional CTA, always invitational
- The structure is: Belief → Reasons → Implication → [Optional CTA]
- The artifact is already visible - DO NOT describe what it looks like

ARTIFACT SUMMONING CONTRACT (HARD RULES):

1. CAUSALITY: Nothing visual appears unless the chat earns it first
   - Justify THEN show, never the reverse
   - Use past tense: "I pulled" not "I'm showing"
   - The artifact proves work happened; the chat explains what it means

2. SESSION GUARD: Artifacts appear once per system per session
   - Unless user explicitly asks again
   - No re-triggering on mode change or rerender

3. NO IMPLICIT AFFORDANCES: Artifacts do not invite exploration
   - No info icons, question marks, hover hints
   - The artifact is evidence, not a dashboard widget
   
4. SUMMONING PATTERN (exact):
   a) JUSTIFY: "Given the age of your home..."
   b) ANNOUNCE: "I pulled a typical system aging profile..."
   c) [ARTIFACT RENDERS - system handles this]
   d) REFERENCE: "Based on what you're seeing above..."

5. FORBIDDEN PHRASES:
   - "Here is a chart"
   - "See below"
   - "I'm showing you" (use past tense instead)
   - Any present-tense announcement of visual evidence
`;
  }

  // Apply copy governance if profile exists
  if (copyProfile) {
    prompt += `
COPY GOVERNANCE (STRICT - DO NOT VIOLATE):
${profileToPromptInstructions(copyProfile)}
`;
  }

  prompt += `
DIAGNOSTIC GATING RULES (MANDATORY — READ BEFORE EVERY TOOL CALL):

Before calling calculate_cost_impact, you MUST have identified at least ONE of:
- A specific appliance or system (e.g., "garbage disposal", "HVAC", "washing machine")
- A specific component (e.g., "drain pump", "compressor", "control board")
- An error code or specific symptom

If the user describes a CATEGORY (e.g., "washing machine") without specifying what's wrong:
1. Acknowledge the issue calmly
2. Provide general cost ranges from your knowledge (e.g., "Washing machine repairs typically run $150-$500")
3. Ask ONE narrowing question about symptoms or error codes
4. ONLY THEN call the cost tool on subsequent messages

FORBIDDEN PATTERNS (ALL TOOLS — NO FORWARD-COMMIT LANGUAGE):
- "I've pulled a breakdown of costs..." before calculate_cost_impact returns — you may NOT announce results before the tool has returned successfully
- "I'll pull some local recommendations..." before get_contractor_recommendations returns
- "I've prioritized technicians..." without tool results backing the claim
- "Here are some contractors..." without an actual get_contractor_recommendations tool call
- Any present-tense claim of data retrieval (costs OR contractors) before the tool has executed and returned
- Calling calculate_cost_impact with only a category and no symptom/component/error code
- Defaulting to HVAC or any capital system costs when the issue is an appliance

APPLIANCE-AWARE RESPONSES:
For common household appliances (washing machine, dryer, refrigerator, oven/range, microwave, dishwasher, garbage disposal):
- Use calm, practical tone — these are NOT capital system failures
- Provide DIY vs Pro guidance as equal, valid paths
- Never use "system failure", "baseline degradation", or "capital investment" language
- Focus on symptoms → diagnosis → options
`;

  prompt += `
COST CALCULATION RULES:
ISSUE CLASSIFICATION RULES (MANDATORY - READ BEFORE EVERY RESPONSE):

Before discussing costs, repairs, or recommendations, you MUST classify the issue:

TIER 1 - SMALL APPLIANCE ($50-$500):
Examples: Garbage disposal, faucet, toilet, dishwasher drain, GFCI outlet, smoke detector
Response rules:
- State clearly this is a small, contained issue
- Provide realistic cost range (never more than $500)
- Offer DIY vs Pro as equal, valid paths
- NO lifecycle language, NO "system failure", NO "baseline" references
- Tone: Calm, practical, encouraging

TIER 2 - MEDIUM SYSTEM ($300-$3,000):
Examples: Sump pump, garage door opener, water softener
Response rules:
- Balanced, informative tone
- Safety considerations are appropriate
- DIY possible for some users
- May mention typical lifespan for context

TIER 3 - CAPITAL SYSTEM ($5,000+):
Examples: HVAC replacement, roof, sewer line, foundation, electrical panel
Response rules:
- Strategic, planning-oriented
- Lifecycle and timing tradeoffs appropriate
- Recommend professional assessment

CRITICAL GUARDRAIL:
HVAC, Roof, and other capital systems may NEVER be used as defaults.
If you cannot classify the issue, ask a clarifying question instead.

FORBIDDEN LANGUAGE FOR TIER 1:
- "System failure"
- "Disrupts your home"  
- "Baseline degradation"
- "Long-term risk"
- "Capital investment"
- "Emergency replacement"

MODE SWITCHING RULES:

DIY MODE TRIGGER - User says:
- "I'll do it myself"
- "Can I fix this?"
- "Is this a DIY job?"

DIY MODE BEHAVIOR:
- Acknowledge their capability
- Provide step-by-step guidance
- Emphasize safety
- Focus on execution, not cost modeling
- Example: "Great — this is a very manageable DIY project. I'll walk you through it."

PRO MODE TRIGGER - User says anything matching these patterns:
- "I want a plumber"
- "I'd rather hire someone"
- "Can you recommend a pro?"
- "hire a pro"
- "find a contractor"
- "find someone"
- "get quotes"
- "know any good [trade]?"
- "who can fix this?"
- "find a [trade] repair guy/person/tech/company"
- "help me find a [trade]"
- "can you help me find a [anything] repair"
- "I need a [trade]"
- Any message containing "find" + a trade/service keyword (plumber, electrician, HVAC, roofer, sprinkler, irrigation, etc.)

PRO MODE BEHAVIOR (MANDATORY — TOOL CALL REQUIRED):
1. You MUST call get_contractor_recommendations IMMEDIATELY when PRO MODE is triggered.
2. Infer the service_type from conversation context:
   - Washing machine / dryer / refrigerator / oven / dishwasher discussion → "appliance_repair"
   - Pipe / drain / water heater / toilet discussion → "plumbing"
   - Wiring / outlet / panel discussion → "electrical"
   - Shingle / leak from above discussion → "roofing"
   - AC / furnace / heat pump discussion → "hvac"
   - Sprinkler / irrigation / lawn watering discussion → "sprinkler_repair"
   - Landscaping / lawn / tree discussion → "landscaping"
   - If unclear, ask ONE clarifying question: "Before I pull local options — are you looking for an appliance repair tech or a plumber?"
3. Do NOT generate prose about finding contractors — CALL THE TOOL FIRST.
4. After the tool returns results, add 1-2 lines of orientation (e.g., "When you call, ask about diagnostic fees and parts availability.").
5. If the tool returns no results, relay the structured message — do NOT fabricate contractor names.

FORBIDDEN in PRO MODE:
- "I'll pull some local recommendations..." without calling get_contractor_recommendations
- "I've prioritized technicians..." without tool results
- Any present-tense claim of contractor data retrieval before the tool has executed
- Generating contractor names, phone numbers, or ratings from memory — ALL contractor data must come from the tool

- For EXISTING systems: calculate_cost_impact returns replacement timing + emergency vs planned costs
- For PROPOSED additions (mini-split, new system): calculate_cost_impact returns typical installation cost ranges
- For SMALL APPLIANCES: calculate_cost_impact returns simple cost ranges with DIY guidance
- Never claim "no information" if a valid cost range exists — present what you know
- Use "rush install" language for new additions, not "emergency" language
- Always recommend getting 2–3 quotes from licensed contractors

CORE BEHAVIOR:
- Reference what's visible on screen (the forecast, timeline, system cards)
- Present choices, not commands
- If confidence is low, acknowledge uncertainty gracefully
- Consider Florida climate impacts (humidity, hurricanes, heat)
- Prioritize safety and professional help for complex work

When the user asks "what if" questions, shift to analytical mode and compare tradeoffs clearly.
When the user commits to a path, shift to procedural mode and help them execute.

HOME RECORD PROTOCOLS (CARFAX FOR THE HOME — MANDATORY):

SYSTEM DISCOVERY PROTOCOL:
When the user mentions an appliance or system by name (e.g., "washing machine", "dishwasher", "hot tub", "dryer", "refrigerator") that does NOT appear in HOME ASSETS ON FILE:
1. Acknowledge: "I don't have a [system] on record for your home yet."
2. Call record_home_event with event_type: 'system_discovered' IMMEDIATELY
3. Ask ONE contextual question (brand OR approximate age — not both)
4. Continue with the conversation naturally
No user permission required. This is bookkeeping, not publishing.
Do NOT ask "Would you like me to add this to your record?" — just do it.

ISSUE RECORDING PROTOCOL:
After completing a diagnosis or providing repair/replacement guidance, call record_home_event to persist the finding:
1. Log event_type: 'diagnosis' with severity, probable cause, and confidence in metadata
2. If you provided a recommendation, log a second event_type: 'recommendation' with path (repair/replace/defer), urgency, and rationale in metadata
3. Link both to the original issue_reported event via related_event_id if one exists
The user should see a subtle confirmation that this is part of their home record.

FOLLOW-UP LINKING PROTOCOL:
When the user returns to discuss a previously-reported issue (e.g., "I got the washer fixed", "How's the washing machine?", "The repair cost $200"):
1. Find the original open event in OPEN ISSUES context (use the event ID shown in brackets)
2. Create a linked event (user_decision, repair_completed, or status_change)
3. Use related_event_id to chain to the original event ID
4. Acknowledge: "I've updated the record. The [issue] is now [status]."

IMMUTABILITY RULE (CRITICAL):
NEVER update an existing home_events record. Status changes are NEW events:
Wrong: Update issue #123 status from 'open' to 'resolved'
Right: Create new event type='status_change', status='resolved', related_event_id='issue-123-uuid'
This preserves the full audit trail.

CONTRACTOR REFERRAL GUARD:
When recording event_type='contractor_referred':
- Status is ALWAYS 'info' — NEVER 'resolved'
- It NEVER closes or resolves a linked issue
- It is advisory-only, recorded for history

CONFIDENCE CEILING (ENFORCED BY TOOL):
- Chat-discovered assets cap at confidence 60
- Photo-verified assets cap at 80
- Pro invoice / permit assets cap at 95
- Never exceed 95 without external verification
`;

  return prompt;
}

function formatStateForPrompt(state: string): string {
  switch (state) {
    case 'stable':
      return 'Stable (within expected range)';
    case 'planning_window':
      return 'Planning Window (approaching replacement timeframe)';
    case 'elevated':
      return 'Elevated (warrants attention)';
    case 'data_gap':
      return 'Data Gap (low confidence)';
    default:
      return state;
  }
}

// ============================================================================
// GOOGLE PLACES CONTRACTOR SEARCH
// ============================================================================

// Contractor recommendations are discovery aids only.
// No ranking, endorsement, or quality judgment is implied.

interface GooglePlaceResult {
  name: string;
  rating: number;
  userRatingCount: number;
  formattedAddress: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  types?: string[];
}

async function searchLocalContractors(
  serviceType: string,
  location: { lat: number; lng: number; city: string; state: string }
): Promise<GooglePlaceResult[]> {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) {
    console.error('[searchLocalContractors] GOOGLE_PLACES_API_KEY not configured');
    return [];
  }

  // Map service types to search queries
  const searchQueries: Record<string, string> = {
    'hvac': 'HVAC contractor',
    'water_heater': 'plumber water heater',
    'plumbing': 'licensed plumber',
    'electrical': 'licensed electrician',
    'roof': 'roofing contractor',
    'roofing': 'roofing contractor',
    'general': 'home repair contractor',
    // Appliance repair mappings (critical for PRO MODE)
    'appliance_repair': 'appliance repair technician',
    'appliance': 'appliance repair technician',
    'washing_machine': 'washing machine repair',
    'dryer': 'dryer repair technician',
    'refrigerator': 'refrigerator repair technician',
    'oven': 'oven range repair technician',
    'dishwasher': 'dishwasher repair technician',
    'garbage_disposal': 'plumber garbage disposal',
    // Irrigation / landscaping mappings
    'sprinkler': 'sprinkler system repair service',
    'sprinkler_system': 'sprinkler system repair',
    'irrigation': 'irrigation system repair contractor',
    'irrigation_system': 'irrigation system repair service',
    'landscaping': 'landscape contractor',
    'landscaping_irrigation': 'irrigation and drainage contractor',
  };

  const query = searchQueries[serviceType.toLowerCase()] || `${serviceType} contractor`;
  const fullQuery = `${query} near ${location.city}, ${location.state}`;

  console.log('[searchLocalContractors] Searching:', fullQuery);

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.types'
      },
      body: JSON.stringify({
        textQuery: fullQuery,
        locationBias: {
          circle: {
            center: { latitude: location.lat, longitude: location.lng },
            radius: 40000.0  // 40km radius
          }
        },
        pageSize: 5,
        rankPreference: 'RELEVANCE',
        regionCode: 'US',
        languageCode: 'en'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[searchLocalContractors] API error:', response.status, error);
      return [];
    }

    const data = await response.json();
    console.log('[searchLocalContractors] Found', data.places?.length || 0, 'results');
    
    // Filter for 4+ ratings in code (more reliable than API param)
    return (data.places || [])
      .filter((place: any) => (place.rating || 0) >= 4.0)
      .map((place: any) => ({
        name: place.displayName?.text || 'Unknown',
        rating: place.rating || 0,
        userRatingCount: place.userRatingCount || 0,
        formattedAddress: place.formattedAddress || '',
        websiteUri: place.websiteUri,
        nationalPhoneNumber: place.nationalPhoneNumber,
        types: place.types
      }));
  } catch (error) {
    console.error('[searchLocalContractors] Error:', error);
    return [];
  }
}

function mapToCategory(types: string[] | undefined, fallbackService: string): string {
  if (!types || types.length === 0) {
    return fallbackService.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // Map Google place types to readable categories (descriptive, not authoritative)
  const categoryMap: Record<string, string> = {
    'plumber': 'Plumber',
    'electrician': 'Electrician',
    'roofing_contractor': 'Roofing Contractor',
    'hvac_contractor': 'HVAC Contractor',
    'general_contractor': 'General Contractor',
    'home_improvement_store': 'Home Improvement',
    'air_conditioning_contractor': 'HVAC Contractor',
    'heating_equipment_supplier': 'Heating Supplier'
  };

  for (const type of types) {
    if (categoryMap[type]) return categoryMap[type];
  }
  
  return fallbackService.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================================
// FUNCTION CALL HANDLER
// ============================================================================

async function handleFunctionCall(functionCall: any, context: any): Promise<string> {
  const { name, arguments: args } = functionCall;
  
  let parsedArgs: any;
  try {
    parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  } catch {
    parsedArgs = {};
  }

  switch (name) {
    case 'schedule_maintenance': {
      const homeId = context?.homeId;
      const userId = context?.userId;
      const task = parsedArgs.task || 'maintenance';
      const system = parsedArgs.system || 'system';
      const urgency = parsedArgs.urgency || 'medium';
      const costNote = parsedArgs.estimated_cost
        ? ` (estimated cost: $${parsedArgs.estimated_cost})`
        : '';
      const timeframe = urgency === 'high' ? '1-2 weeks'
        : urgency === 'medium' ? '1-2 months' : '3-6 months';

      // If no home context, return helpful text without claiming a write
      if (!homeId || !userId) {
        return `I recommend scheduling "${task}" for your ${system} within ${timeframe}${costNote}. Once your home is set up, I can record this to your home history.`;
      }

      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing config');

        const { createClient: createServiceClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const serviceSupabase = createServiceClient(supabaseUrl, supabaseServiceKey);

        const systemKind = system.toLowerCase().replace(/\s+/g, '_');
        const severityMap: Record<string, string> = {
          low: 'minor', medium: 'moderate', high: 'major'
        };
        const severity = severityMap[urgency] || 'minor';

        // IDEMPOTENCY: Check for existing pending event with same title + system
        const { data: existing } = await serviceSupabase
          .from('home_events')
          .select('id')
          .eq('home_id', homeId)
          .eq('event_type', 'recommendation')
          .eq('title', task)
          .eq('status', 'open')
          .limit(1);

        if (existing && existing.length > 0) {
          return `"${task}" is already on your home record as a pending maintenance item. I recommend scheduling it within ${timeframe}${costNote}. Would you like help finding a contractor?`;
        }

        // INSERT to home_events (append-only ledger)
        const { data: newEvent, error: eventError } = await serviceSupabase
          .from('home_events')
          .insert({
            home_id: homeId,
            user_id: userId,
            event_type: 'recommendation',
            title: task,
            description: `Scheduled maintenance: ${task}${costNote}`,
            severity,
            status: 'open',
            source: 'ai_assistant',
            metadata: {
              system_kind: systemKind,
              urgency,
              estimated_cost: parsedArgs.estimated_cost || null,
              recommended_timeframe: timeframe,
            },
          })
          .select('id')
          .single();

        if (eventError) {
          console.error('[schedule_maintenance] Insert failed:', eventError);
          return `I recommend scheduling "${task}" for your ${system} within ${timeframe}${costNote}. I wasn't able to save this to your home record right now, but you can ask me again later.`;
        }

        console.log(`[schedule_maintenance] Event recorded: ${newEvent.id}`);
        return `I've added "${task}" to your home record as a pending maintenance item${costNote}. I recommend scheduling this within ${timeframe}. Would you like help finding a contractor?`;
      } catch (e) {
        console.error('[schedule_maintenance] Error:', e);
        return `I recommend scheduling "${task}" for your ${system} within ${timeframe}${costNote}. I wasn't able to save this right now, but the recommendation stands.`;
      }
    }
      
    case 'get_contractor_recommendations': {
      const location = context?.homeLocation;
      
      // Always return structured JSON, even on failure
      const baseResponse = {
        type: 'contractor_recommendations',
        service: parsedArgs.service_type,
        disclaimer: 'Sourced from Google Places. Habitta does not vet or endorse contractors.',
        confidence: 'discovery_only'
      };
      
      if (!location?.lat || !location?.lng) {
        console.log('[get_contractor_recommendations] No home coordinates available');
        return JSON.stringify({
          ...baseResponse,
          contractors: [],
          message: 'Unable to find contractors — home location not available. Please update your home address.'
        });
      }

      const results = await searchLocalContractors(parsedArgs.service_type, location);
      
      if (results.length === 0) {
        return JSON.stringify({
          ...baseResponse,
          contractors: [],
          message: 'No highly-rated local results were found in this area.',
          suggestion: 'You can try a related service category or broaden your search.'
        });
      }

      // Return structured JSON — formatting layer handles presentation
      return JSON.stringify({
        ...baseResponse,
        contractors: results.slice(0, 3).map(r => ({
          name: r.name,
          rating: r.rating,
          reviewCount: r.userRatingCount,
          category: mapToCategory(r.types, parsedArgs.service_type),
          location: r.formattedAddress.split(',')[0], // First part only (street)
          websiteUri: r.websiteUri,
          phone: r.nationalPhoneNumber
        }))
      });
    }
      
    case 'calculate_cost_impact': {
      // Import system configs for cost data
      const { getSystemConfig, getEmergencyPremium, classifyIssueType } = await import('../_shared/systemConfigs.ts');
      
      // Normalize repair_type to system key
      const rawType = parsedArgs.repair_type || 'water_heater';
      const systemType = rawType.toLowerCase().replace(/\s+/g, '_');
      const quantity = parsedArgs.quantity ?? 1;
      
      // STEP 1: Classify the issue using tier-aware system
      const classification = classifyIssueType(rawType);
      
      // STEP 2: Handle unknown issues (fail-closed - no HVAC fallback!)
      if (!classification) {
        console.log(`[calculate_cost_impact] Unknown issue type: ${rawType} - requesting clarification`);
        return JSON.stringify({
          type: 'unknown_issue',
          success: false,
          issueType: rawType,
          message: 'I need more details to provide accurate cost information.',
          suggestion: 'Can you describe the specific component or system that needs attention?'
        });
      }
      
      // STEP 3: Route to tier-appropriate handler
      // ===== TIER 1: SMALL APPLIANCE PATH =====
      if (classification.tier === 'small_appliance') {
        const applianceConfig = classification.config as any;
        console.log(`[calculate_cost_impact] Small appliance: ${classification.systemKey}`);
        
        return JSON.stringify({
          type: 'small_appliance_repair',
          success: true,
          tier: 'small_appliance',
          systemKey: classification.systemKey,
          displayName: applianceConfig.displayName,
          costRange: {
            low: applianceConfig.costRange.min,
            high: applianceConfig.costRange.max,
            label: 'Typical replacement cost (installed)'
          },
          diyEligible: applianceConfig.diyEligible,
          typicalLifespan: applianceConfig.typicalLifespan,
          tradeType: applianceConfig.tradeType,
          recommendation: applianceConfig.diyEligible 
            ? 'This is often a manageable DIY project, but a professional can also handle it quickly.'
            : 'Most homeowners hire a professional for this type of repair.',
        });
      }
      
      // ===== TIER 2: MEDIUM SYSTEM PATH =====
      if (classification.tier === 'medium_system') {
        const mediumConfig = classification.config as any;
        console.log(`[calculate_cost_impact] Medium system: ${classification.systemKey}`);
        
        return JSON.stringify({
          type: 'medium_system_repair',
          success: true,
          tier: 'medium_system',
          systemKey: classification.systemKey,
          displayName: mediumConfig.displayName,
          costRange: {
            low: mediumConfig.costRange.min,
            high: mediumConfig.costRange.max,
            label: 'Typical replacement/repair cost'
          },
          diyEligible: mediumConfig.diyEligible,
          typicalLifespan: mediumConfig.typicalLifespan,
          tradeType: mediumConfig.tradeType,
          recommendation: mediumConfig.diyEligible 
            ? 'Some homeowners tackle this themselves, but safety considerations apply.'
            : 'We recommend getting quotes from licensed professionals.',
          safetyNote: 'Consider safety factors before attempting DIY on this type of system.',
        });
      }
      
      // ===== TIER 3: CAPITAL SYSTEM PATH (existing logic) =====
      const config = getSystemConfig(systemType);
      
      // Guard against null config (shouldn't happen after classification, but defensive)
      if (!config) {
        console.error(`[calculate_cost_impact] No config found for classified capital system: ${systemType}`);
        return JSON.stringify({
          type: 'unknown_issue',
          success: false,
          issueType: rawType,
          message: 'I encountered an error processing this system type.',
          suggestion: 'Please try describing the system differently.'
        });
      }
      
      // Find the system in context
      const systemContext = context.systems?.find((s: EnrichedSystemContext) => 
        s.kind.toLowerCase() === systemType
      );
      
      // Determine system mode: existing (in DB) or proposed (new addition)
      const systemMode = systemContext ? 'existing' : 'proposed';
      
      // ===== PROPOSED CAPITAL SYSTEM PATH =====
      // Provide cost ranges for capital systems not yet in the home
      if (systemMode === 'proposed') {
        const baseLow = config.replacementCostRange.min * quantity;
        const baseHigh = config.replacementCostRange.max * quantity;
        
        // Use rush premium if defined, otherwise fall back to emergency premium
        const rushPremium = config.rushInstallPremium ?? getEmergencyPremium(systemType);
        const rushPremiumPercent = Math.round(rushPremium * 100);
        
        return JSON.stringify({
          type: 'proposed_addition',
          success: true,
          systemMode: 'proposed',
          systemType,
          displayName: config.displayName,
          quantity,
          estimatedCost: {
            low: baseLow,
            high: baseHigh,
            label: quantity > 1 
              ? `Typical installation range (${quantity} zones)` 
              : 'Typical installation range'
          },
          rushPremium: {
            percent: rushPremiumPercent,
            low: Math.round(baseLow * (1 + rushPremium)),
            high: Math.round(baseHigh * (1 + rushPremium)),
            label: 'Expedited scheduling'
          },
          expectedLifespan: config.baselineLifespan,
          recommendation: 'Get 2–3 quotes from licensed contractors for pricing specific to your home.'
        });
      }
      
      // ===== EXISTING SYSTEM PATH =====
      // Step 1: Establish cost baselines
      const plannedLow = config.replacementCostRange.min;
      const plannedHigh = config.replacementCostRange.max;
      
      // Step 2: Apply emergency premium
      const emergencyPremium = getEmergencyPremium(systemType);
      const emergencyPremiumPercent = Math.round(emergencyPremium * 100);
      const emergencyLow = Math.round(plannedLow * (1 + emergencyPremium));
      const emergencyHigh = Math.round(plannedHigh * (1 + emergencyPremium));
      
      // Step 3: Calculate timeline context
      const currentYear = new Date().getFullYear();
      const yearsUntilLikely = systemContext.replacementWindow?.likelyYear 
        ? systemContext.replacementWindow.likelyYear - currentYear 
        : null;
      
      // Step 4: Determine risk band (from lifecycle stage + years remaining)
      let riskBand: 'low' | 'moderate' | 'elevated';
      if (systemContext.lifecycleStage === 'late' || (yearsUntilLikely !== null && yearsUntilLikely <= 2)) {
        riskBand = 'elevated';
      } else if (systemContext.lifecycleStage === 'mid' || (yearsUntilLikely !== null && yearsUntilLikely <= 5)) {
        riskBand = 'moderate';
      } else {
        riskBand = 'low';
      }
      
      // Step 5: Compute tradeoff delta (cost of being forced vs choosing)
      const tradeoffLow = emergencyLow - plannedLow;
      const tradeoffHigh = emergencyHigh - plannedHigh;
      
      // Step 6: Neutral recommendations based on risk band
      const recommendations: Record<'low' | 'moderate' | 'elevated', string> = {
        elevated: 'Planning ahead reduces the risk of higher emergency costs.',
        moderate: 'This is a reasonable window to research options and budget.',
        low: 'No action needed now; periodic review is sufficient.',
      };
      
      return JSON.stringify({
        type: 'replacement_tradeoff',
        success: true,
        systemType,
        displayName: config.displayName,
        plannedReplacement: {
          low: plannedLow,
          high: plannedHigh,
          label: 'Planned replacement'
        },
        emergencyReplacement: {
          low: emergencyLow,
          high: emergencyHigh,
          label: 'Emergency replacement',
          premiumPercent: emergencyPremiumPercent
        },
        tradeoffDelta: {
          low: tradeoffLow,
          high: tradeoffHigh,
          description: 'By replacing proactively vs. emergency'
        },
        yearsUntilLikely,
        riskBand,
        recommendation: recommendations[riskBand],
        dataQuality: systemContext.dataQuality,
        disclosureNote: systemContext.disclosureNote
      });
    }
      
    case 'update_system_info': {
      // HARDENING FIX #3: Intelligible failure state when homeId or userId missing
      const homeId = context?.homeId;
      const userId = context?.userId;
      const existingPermits = context?.permits || [];
      
      if (!homeId) {
        console.error('[update_system_info] No homeId in context');
        return JSON.stringify({
          type: 'system_update',
          success: false,
          reason: 'no_home_context',
          message: 'I can\'t save that update because I don\'t have a home selected. Please make sure you\'re viewing a specific property.'
        });
      }
      
      if (!userId) {
        console.error('[update_system_info] No userId in context');
        return JSON.stringify({
          type: 'system_update',
          success: false,
          reason: 'no_auth',
          message: 'I can\'t save that update because you\'re not signed in. Please sign in and try again.'
        });
      }

      // AUTHORITY GUARD: Check for permit-verified data before allowing overwrite
      const systemKey = parsedArgs.system_type?.toLowerCase() || '';
      const permitForSystem = existingPermits.find((p: any) => 
        p.system_tags && p.system_tags.some((tag: string) => 
          tag.toLowerCase().includes(systemKey)
        ) && p.date_issued
      );

      if (permitForSystem && parsedArgs.replacement_status !== 'replaced') {
        // User is trying to claim system is "original" or "unknown", but permit shows replacement
        const permitYear = new Date(permitForSystem.date_issued).getFullYear();
        console.warn('[update_system_info] Authority conflict: permit shows replacement in', permitYear, 'but user claims', parsedArgs.replacement_status);
        
        return JSON.stringify({
          type: 'system_update',
          success: false,
          reason: 'authority_conflict',
          permitYear,
          permitDescription: permitForSystem.description,
          message: `I found a permit from ${permitYear} for this system. This suggests the system was replaced then. Before I save conflicting information, can you confirm whether this replaced system is what you're referring to?`
        });
      }
      
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('[update_system_info] Missing Supabase config');
          return JSON.stringify({
            type: 'system_update',
            success: false,
            reason: 'config_error',
            message: 'I encountered a configuration error. Please try again.'
          });
        }
        
        console.log('[update_system_info] Calling update-system-install for:', {
          homeId,
          systemKey: parsedArgs.system_type,
          replacementStatus: parsedArgs.replacement_status,
          installYear: parsedArgs.install_year,
          userId: 'present',
        });
        
        const response = await fetch(
          `${supabaseUrl}/functions/v1/update-system-install`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              // Use service role for internal call (edge-to-edge)
              'Authorization': `Bearer ${supabaseServiceKey || supabaseAnonKey}`,
            },
            body: JSON.stringify({
              homeId,
              systemKey: parsedArgs.system_type,
              replacementStatus: parsedArgs.replacement_status,
              installYear: parsedArgs.install_year,
              installSource: 'owner_reported',
              // Pass userId for internal authentication (service-to-service)
              userId,
              installMetadata: {
                knowledge_source: parsedArgs.knowledge_source || 'memory',
                source: 'chat_conversation',
              }
            })
          }
        );
        
        if (!response.ok) {
          const error = await response.text();
          console.error('[update_system_info] Failed:', response.status, error);
          return JSON.stringify({
            type: 'system_update',
            success: false,
            reason: 'api_error',
            message: 'I wasn\'t able to save that update. Please try again.'
          });
        }
        
        const result = await response.json();
        console.log('[update_system_info] Success:', result);
        
        // ============================================================
        // POST-CONFIRMATION ADVISORY GATE
        // Rule: When a system install year is confirmed and crosses a
        // planning threshold, immediately re-evaluate and emit advisory.
        // The handler emits structured facts; chatFormatting.ts owns prose.
        // ============================================================
        
        const CAPITAL_SYSTEMS = ['hvac', 'roof', 'water_heater'];
        const shouldEmitAdvisory = 
          !result.alreadyRecorded &&
          parsedArgs.install_year != null &&
          CAPITAL_SYSTEMS.includes(parsedArgs.system_type);
        
        let postConfirmationAdvisory: any = undefined;
        
        if (shouldEmitAdvisory) {
          try {
            const currentYear = new Date().getFullYear();
            const installYear = parsedArgs.install_year;
            const systemType = parsedArgs.system_type as 'hvac' | 'roof' | 'water_heater';
            
            // Build inputs for the pure calculator (same path as enrichSystemWithLifecycle)
            const propertyCtx: LifecyclePropertyContext = {
              yearBuilt: context.homeLocation?.yearBuilt || 2000,
              state: context.homeLocation?.state || 'FL',
              city: context.homeLocation?.city,
            };
            const region = getRegionContext(propertyCtx.state, propertyCtx.city);
            const resolvedInstall: ResolvedInstallInput = {
              installYear: installYear,
              installSource: 'owner_reported',
              confidenceScore: 0.7,
              replacementStatus: parsedArgs.replacement_status || 'unknown',
              rationale: 'User confirmed via chat',
            };
            
            const lifecycle: LifecycleOutput = calculateSystemLifecycle(systemType, resolvedInstall, propertyCtx, region);
            
            // Derive advisory tier from calculator output (Refinement #1: no re-derivation)
            const age = installYear ? currentYear - installYear : null;
            const likelyYear = lifecycle.replacementWindow.likelyYear;
            const earlyYear = lifecycle.replacementWindow.earlyYear;
            const remainingYears = likelyYear - currentYear;
            const baseInstall = installYear || propertyCtx.yearBuilt;
            const expectedLifespan = likelyYear - baseInstall;
            const earlyThreshold = earlyYear - baseInstall;
            const lifespanRatio = age !== null && expectedLifespan > 0 ? age / expectedLifespan : 0;
            
            // Deterministic tiers aligned with enrichSystemWithLifecycle() stage logic
            type AdvisoryTier = 'late_life' | 'planning_window' | 'mid_life' | 'early_life';
            let advisoryTier: AdvisoryTier;
            if (age !== null && age >= expectedLifespan) {
              advisoryTier = 'late_life';
            } else if (age !== null && age >= earlyThreshold) {
              advisoryTier = 'planning_window';
            } else if (age !== null && age >= earlyThreshold * 0.5) {
              advisoryTier = 'mid_life';
            } else {
              advisoryTier = 'early_life';
            }
            
            // Confidence gating (Refinement #3)
            // Use the resolved climate context when available for climate confidence check
            const resolvedClimate = lifecycle.climateConfidence;
            const advisoryConfident =
              resolvedInstall.confidenceScore >= 0.7 &&
              (resolvedClimate ? resolvedClimate !== 'low' : region.isHotHumid);
            
            // Climate label (calm, matter-of-fact)
            const climateLabels: Record<string, string> = {
              coastal: 'coastal salt air and humidity',
              high_heat: 'high heat and humidity',
              freeze_thaw: 'freeze-thaw cycling',
              moderate: 'typical conditions',
            };
            const climateZone = lifecycle.climateZone || (region.isHotHumid ? 'high_heat' : 'moderate');
            const climateLabel = climateLabels[climateZone] || 'typical conditions';
            
            // System-specific action content (deterministic, per plan)
            const ADVISORY_ACTIONS: Record<string, Record<string, any>> = {
              water_heater: {
                late_life: {
                  nowActions: [
                    'Visually inspect the base and fittings for moisture or corrosion',
                    'Consider a preventive flush if it hasn\'t been done in the last year',
                  ],
                  planActions: [
                    'Begin replacement planning within the next 6–12 months',
                    'Decide whether to stay with a standard tank or consider a heat-pump unit',
                  ],
                  precisionCTA: 'Upload a photo of the manufacturer label so I can confirm capacity, efficiency, and exact model type',
                },
                planning_window: {
                  nowActions: [
                    'Visually inspect the base and fittings for moisture or corrosion',
                  ],
                  planActions: [
                    'This is a reasonable window to start researching replacement options',
                    'Consider whether a standard tank or heat-pump unit fits your needs',
                  ],
                  precisionCTA: 'Upload a photo of the manufacturer label so I can confirm capacity, efficiency, and exact model type',
                },
              },
              hvac: {
                late_life: {
                  nowActions: [
                    'Schedule a professional efficiency check',
                    'Replace air filter if overdue',
                  ],
                  planActions: [
                    'Begin replacement planning within the next 12 months',
                    'Research SEER ratings appropriate for your climate',
                  ],
                  precisionCTA: 'Upload a photo of the unit\'s data plate for exact model and efficiency details',
                },
                planning_window: {
                  nowActions: [
                    'Schedule a professional efficiency check',
                  ],
                  planActions: [
                    'This is a reasonable window to start researching replacement options',
                    'Research SEER ratings appropriate for your climate',
                  ],
                  precisionCTA: 'Upload a photo of the unit\'s data plate for exact model and efficiency details',
                },
              },
              roof: {
                late_life: {
                  nowActions: [
                    'Inspect for missing or curling shingles from ground level',
                    'Check attic for signs of moisture or daylight',
                  ],
                  planActions: [
                    'Get a professional roof assessment within the next year',
                    'Begin budgeting for replacement',
                  ],
                  precisionCTA: null,
                },
                planning_window: {
                  nowActions: [
                    'Inspect for missing or curling shingles from ground level',
                  ],
                  planActions: [
                    'This is a reasonable window to start researching replacement options',
                    'Consider getting a professional roof assessment',
                  ],
                  precisionCTA: null,
                },
              },
            };
            
            if (advisoryTier === 'late_life' || advisoryTier === 'planning_window') {
              const actions = ADVISORY_ACTIONS[systemType]?.[advisoryTier] || {};
              postConfirmationAdvisory = {
                tier: advisoryTier,
                systemKey: systemType,
                systemLabel: lifecycle.systemLabel,
                age,
                expectedLifespan,
                remainingYears,
                climateLabel,
                advisoryConfident,
                nowActions: actions.nowActions || [],
                planActions: actions.planActions || [],
                precisionCTA: actions.precisionCTA || null,
                closingIntent: 'explore_costs',
              };
            } else {
              // mid_life / early_life: minimal status note only
              postConfirmationAdvisory = {
                tier: advisoryTier,
                systemKey: systemType,
                systemLabel: lifecycle.systemLabel,
                age,
                expectedLifespan,
                remainingYears,
                climateLabel,
                advisoryConfident,
                statusNote: `At ~${age} years old, your ${lifecycle.systemLabel.toLowerCase()} is well within its expected service life. Routine monitoring is sufficient.`,
              };
            }
            
            console.log('[update_system_info] Post-confirmation advisory:', {
              tier: advisoryTier,
              system: systemType,
              age,
              expectedLifespan,
              remainingYears,
              lifespanRatio: lifespanRatio.toFixed(2),
              advisoryConfident,
            });
          } catch (advisoryError) {
            // Advisory is non-blocking: if it fails, the update still succeeds
            console.error('[update_system_info] Advisory computation failed (non-blocking):', advisoryError);
          }
        }
        
        // HARDENING FIX #4: Structured response envelope (extended with advisory)
        return JSON.stringify({
          type: 'system_update',
          success: true,
          systemKey: parsedArgs.system_type,
          alreadyRecorded: result.alreadyRecorded || false,
          installedLine: result.installedLine,
          confidenceLevel: result.confidenceLevel,
          message: result.alreadyRecorded 
            ? `That's already recorded. Your ${parsedArgs.system_type} shows as ${result.installedLine}.`
            : result.message,
          // Structured advisory for post-confirmation formatting (chatFormatting.ts owns the prose)
          postConfirmationAdvisory,
        });
      } catch (error) {
        console.error('[update_system_info] Error:', error);
        return JSON.stringify({
          type: 'system_update',
          success: false,
          reason: 'exception',
          message: 'I encountered an error saving your update. Please try again.'
        });
      }
    }
      
    case 'record_home_event': {
      // HOME RECORD: Record event to the immutable ledger
      const homeId = context?.homeId;
      const userId = context?.userId;
      
      if (!homeId || !userId) {
        console.error('[record_home_event] Missing homeId or userId');
        return JSON.stringify({
          type: 'home_event_recorded',
          success: false,
          message: !homeId 
            ? 'I can\'t record this because no home is selected.'
            : 'I can\'t record this because you\'re not signed in.'
        });
      }
      
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        
        if (!supabaseUrl || !supabaseServiceKey) {
          return JSON.stringify({
            type: 'home_event_recorded',
            success: false,
            message: 'Configuration error. Please try again.'
          });
        }
        
        // Create service-role client for writes
        const { createClient: createServiceClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const serviceSupabase = createServiceClient(supabaseUrl, supabaseServiceKey);
        
        const eventType = parsedArgs.event_type;
        const systemKind = parsedArgs.system_kind?.toLowerCase().replace(/\s+/g, '_');
        
        // CONFIDENCE CEILING enforcement
        const confidenceCeilings: Record<string, number> = {
          chat: 60, photo: 80, pro: 95, permit: 95, manual: 60
        };
        const source = 'chat';
        const maxConfidence = confidenceCeilings[source] || 60;
        const baseConfidence = Math.min(50, maxConfidence);
        
        let assetId: string | null = null;
        let isNewAsset = false;
        let clarificationNeeded = false;
        
        // HARDENED ASSET MATCHING
        if (systemKind) {
          const { data: existingAssets } = await serviceSupabase
            .from('home_assets')
            .select('id, kind, manufacturer, model')
            .eq('home_id', homeId)
            .eq('kind', systemKind)
            .eq('status', 'active');
          
          if (existingAssets && existingAssets.length === 1) {
            // Exactly one match — attach
            assetId = existingAssets[0].id;
            console.log(`[record_home_event] Matched asset: ${assetId}`);
          } else if (existingAssets && existingAssets.length > 1) {
            // MULTIPLE matches — do NOT auto-attach (hardening rule)
            console.log(`[record_home_event] Multiple active ${systemKind} found (${existingAssets.length}). Not auto-attaching.`);
            clarificationNeeded = true;
          } else if (eventType === 'system_discovered') {
            // ZERO matches + discovery event — create new asset
            const installDate = parsedArgs.age_estimate_years 
              ? new Date(new Date().getFullYear() - parsedArgs.age_estimate_years, 0, 1).toISOString().split('T')[0]
              : null;
            
            const assetMetadata: Record<string, any> = {};
            if (parsedArgs.age_estimate_years) assetMetadata.age_estimate_years = parsedArgs.age_estimate_years;
            
            const { data: newAsset, error: assetError } = await serviceSupabase
              .from('home_assets')
              .insert({
                home_id: homeId,
                user_id: userId,
                category: categorizeKind(systemKind),
                kind: systemKind,
                manufacturer: parsedArgs.manufacturer || null,
                model: parsedArgs.model || null,
                install_date: installDate,
                status: 'active',
                source,
                confidence: baseConfidence,
                metadata: assetMetadata,
              })
              .select('id')
              .single();
            
            if (assetError) {
              console.error('[record_home_event] Asset creation failed:', assetError);
            } else {
              assetId = newAsset.id;
              isNewAsset = true;
              console.log(`[record_home_event] Created new asset: ${assetId}`);
            }
          }
        }
        
        // CONTRACTOR REFERRAL GUARD: never set resolved status
        const eventStatus = eventType === 'contractor_referred' ? 'info'
          : eventType === 'status_change' ? (parsedArgs.metadata?.new_status || 'resolved')
          : eventType === 'system_discovered' ? 'info'
          : eventType === 'diagnosis' ? 'open'
          : eventType === 'recommendation' ? 'open'
          : 'open';
        
        // Build cost estimate
        const costEstimated = (parsedArgs.cost_estimate_low || parsedArgs.cost_estimate_high)
          ? { low: parsedArgs.cost_estimate_low, high: parsedArgs.cost_estimate_high }
          : null;
        
        // Build metadata with semantic sub-records
        const eventMetadata = parsedArgs.metadata || {};
        if (parsedArgs.resolution) eventMetadata.resolution = parsedArgs.resolution;
        
        // INSERT event (append-only — no updates ever)
        const { data: newEvent, error: eventError } = await serviceSupabase
          .from('home_events')
          .insert({
            home_id: homeId,
            user_id: userId,
            asset_id: assetId,
            event_type: eventType,
            title: parsedArgs.title,
            description: parsedArgs.description || null,
            severity: parsedArgs.severity || 'info',
            status: eventStatus,
            cost_estimated: costEstimated,
            source,
            related_event_id: parsedArgs.related_event_id || null,
            metadata: eventMetadata,
          })
          .select('id')
          .single();
        
        if (eventError) {
          console.error('[record_home_event] Event creation failed:', eventError);
          return JSON.stringify({
            type: 'home_event_recorded',
            success: false,
            message: 'I wasn\'t able to record this to your home history. Please try again.'
          });
        }
        
        console.log(`[record_home_event] Event recorded: ${newEvent.id}, type=${eventType}, asset=${assetId || 'none'}`);
        
        // Build response message
        const kindLabel = systemKind?.replace(/_/g, ' ') || 'system';
        let responseMessage: string;
        
        if (isNewAsset) {
          const brandNote = parsedArgs.manufacturer ? ` ${parsedArgs.manufacturer}` : '';
          const ageNote = parsedArgs.age_estimate_years ? ` (~${parsedArgs.age_estimate_years} years old)` : '';
          responseMessage = `Added to your home record:${brandNote} ${kindLabel}${ageNote} (chat-reported)`;
        } else if (eventType === 'diagnosis') {
          responseMessage = `Recorded diagnosis: ${parsedArgs.title}`;
        } else if (eventType === 'recommendation') {
          responseMessage = `Recorded recommendation: ${parsedArgs.title}`;
        } else if (eventType === 'status_change') {
          responseMessage = `Updated: ${kindLabel} — ${parsedArgs.title}`;
        } else if (eventType === 'repair_completed') {
          responseMessage = `Recorded: ${kindLabel} repair completed`;
        } else {
          responseMessage = `Recorded: ${parsedArgs.title}`;
        }
        
        const result: Record<string, any> = {
          type: 'home_event_recorded',
          success: true,
          eventId: newEvent.id,
          assetId,
          isNewAsset,
          eventType,
          systemKind,
          title: parsedArgs.title,
          message: responseMessage,
        };
        
        if (clarificationNeeded) {
          result.clarificationNeeded = true;
          result.message += ` (Note: I see multiple ${kindLabel}s on file — please clarify which one you're referring to.)`;
        }
        
        return JSON.stringify(result);
      } catch (error) {
        console.error('[record_home_event] Error:', error);
        return JSON.stringify({
          type: 'home_event_recorded',
          success: false,
          message: 'I encountered an error recording this event. Please try again.'
        });
      }
    }

    default:
      return 'I can help you with that. What specific information would you like?';
  }
}

function generateFollowUpSuggestions(message: string, context: any): string[] {
  const suggestions: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
    suggestions.push('Show me my predicted maintenance costs for this year');
    suggestions.push('What are the most cost-effective improvements I can make?');
  }
  
  if (lowerMessage.includes('hvac') || lowerMessage.includes('air')) {
    suggestions.push('When should I change my HVAC filters?');
    suggestions.push('How can I improve my HVAC efficiency?');
  }
  
  if (context.activeRecommendations.length > 0) {
    suggestions.push('What should I prioritize from my active recommendations?');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('What maintenance should I focus on this season?');
    suggestions.push('Show me my system health overview');
    suggestions.push('Find a pro near me');
  }
  
  return suggestions.slice(0, 3);
}

// ============================================================================
// HOME RECORD HELPERS
// ============================================================================

function categorizeKind(kind: string): string {
  const appliances = [
    'washing_machine', 'dryer', 'refrigerator', 'dishwasher', 'oven', 'range',
    'microwave', 'garbage_disposal', 'freezer', 'ice_maker', 'wine_cooler',
    'washer_dryer_combo', 'trash_compactor'
  ];
  const structures = [
    'roof', 'foundation', 'siding', 'windows', 'doors', 'deck', 'fence',
    'driveway', 'patio', 'garage_door', 'gutters'
  ];
  
  if (appliances.includes(kind)) return 'appliance';
  if (structures.includes(kind)) return 'structure';
  return 'system'; // hvac, water_heater, electrical_panel, pool, solar, etc.
}
