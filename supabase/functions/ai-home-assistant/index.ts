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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

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
    });

    // Get property context
    const propertyContext = await getPropertyContext(supabase, propertyId);
    
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
      triggerReason
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

async function getPropertyContext(supabase: any, propertyId: string) {
  const [
    { data: rawSystems },
    { data: recommendations },
    { data: predictions },
    { data: home }
  ] = await Promise.all([
    // CANONICAL TRUTH: Read from 'systems' table (same as capital-timeline)
    supabase.from('systems').select('*').eq('home_id', propertyId),
    supabase.from('smart_recommendations').select('*').eq('property_id', propertyId).eq('is_completed', false).limit(5),
    supabase.from('prediction_accuracy').select('*').eq('property_id', propertyId).limit(3),
    // Extended home query for lifecycle calculations
    supabase.from('homes').select('id, latitude, longitude, city, state, zip_code, year_built').eq('id', propertyId).single()
  ]);

  console.log(`[getPropertyContext] Fetched ${rawSystems?.length || 0} systems from canonical 'systems' table for home ${propertyId}`);

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
    // CRITICAL: Pass homeId for update_system_info tool (HARDENING FIX #3)
    homeId: propertyId,
    systems: enrichedSystems,
    activeRecommendations: recommendations || [],
    recentPredictions: predictions || [],
    homeLocation: home ? {
      lat: home.latitude,
      lng: home.longitude,
      city: home.city,
      state: home.state,
      zipCode: home.zip_code
    } : null
  };
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
  triggerReason?: string
) {
  const systemPrompt = createSystemPrompt(context, copyProfile, focusSystem, baselineSource, visibleBaseline, isPlanningSession, triggerReason);
  
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
            description: 'Calculate the cost impact of a repair or maintenance decision',
            parameters: {
              type: 'object',
              properties: {
                repair_type: { type: 'string', description: 'Type of repair or maintenance' },
                delay_months: { type: 'number', description: 'Months to delay the work' }
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
    
    return {
      message: `${aiMessage.content || ''}\n\n${functionResult}`.trim(),
      functionCall: toolCall.function,
      functionResult
    };
  }

  return {
    message: aiMessage.content || 'I can help you with your home maintenance questions.',
    suggestions: generateFollowUpSuggestions(message, context)
  };
}

function createSystemPrompt(
  context: any, 
  copyProfile: CopyStyleProfile | null, 
  focusSystem?: string,
  baselineSource?: string,
  visibleBaseline?: Array<{ key: string; displayName: string; state: string }>,
  isPlanningSession: boolean = false,
  triggerReason?: string
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

  // Base personality
  let prompt = `You are Habitta AI, an expert home maintenance advisor. You are a calm, knowledgeable steward — not a pushy assistant.

PROPERTY CONTEXT:
Current Systems:
${systemInfo || 'No systems registered yet'}

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

EXAMPLES THAT REQUIRE update_system_info:
- "The roof was added in 2008" → update_system_info(system_type: 'roof', install_year: 2008, replacement_status: 'replaced')
- "The AC is original to the house" → update_system_info(system_type: 'hvac', replacement_status: 'original')
- "We replaced the water heater 3 years ago" → Calculate year (2023), then update_system_info(system_type: 'water_heater', install_year: 2023, replacement_status: 'replaced')

EXAMPLES THAT DO NOT CALL THE TOOL (ask clarifying question instead):
- "I think the roof was replaced sometime in the late 2000s" → Ask for specific year
- "The AC might be around 10 years old" → Ask for confirmation
- "I'm not sure when we got the water heater" → Acknowledge uncertainty, do not call tool

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
CORE BEHAVIOR:
- Reference what's visible on screen (the forecast, timeline, system cards)
- Present choices, not commands
- If confidence is low, acknowledge uncertainty gracefully
- Consider Florida climate impacts (humidity, hurricanes, heat)
- Prioritize safety and professional help for complex work

When the user asks "what if" questions, shift to analytical mode and compare tradeoffs clearly.
When the user commits to a path, shift to procedural mode and help them execute.`;

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
    'general': 'home repair contractor'
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
    case 'schedule_maintenance':
      return `I'll help you schedule ${parsedArgs.task} for your ${parsedArgs.system}. This is ${parsedArgs.urgency} priority${parsedArgs.estimated_cost ? ` with an estimated cost of $${parsedArgs.estimated_cost}` : ''}. I recommend scheduling this within ${parsedArgs.urgency === 'high' ? '1-2 weeks' : parsedArgs.urgency === 'medium' ? '1-2 months' : '3-6 months'}.`;
      
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
      
    case 'calculate_cost_impact':
      // HONESTY GATE: No placeholder cost math - never use "approximately 0%" or fake calculations
      return `Cost comparisons for ${parsedArgs.repair_type} require specific system and regional data. If you'd like, I can help you research typical costs for your area or connect you with local professionals for estimates.`;
      
    case 'update_system_info': {
      // HARDENING FIX #3: Intelligible failure state when homeId missing
      const homeId = context?.homeId;
      
      if (!homeId) {
        console.error('[update_system_info] No homeId in context');
        return JSON.stringify({
          type: 'system_update',
          success: false,
          reason: 'no_home_context',
          message: 'I can\'t save that update because I don\'t have a home selected. Please make sure you\'re viewing a specific property.'
        });
      }
      
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
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
        });
        
        const response = await fetch(
          `${supabaseUrl}/functions/v1/update-system-install`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              // Use service role for internal call (edge-to-edge)
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey}`,
            },
            body: JSON.stringify({
              homeId,
              systemKey: parsedArgs.system_type,
              replacementStatus: parsedArgs.replacement_status,
              installYear: parsedArgs.install_year,
              installSource: 'owner_reported',
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
        
        // HARDENING FIX #4: Structured response envelope
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
    suggestions.push('Help me find local contractors');
  }
  
  return suggestions.slice(0, 3);
}
