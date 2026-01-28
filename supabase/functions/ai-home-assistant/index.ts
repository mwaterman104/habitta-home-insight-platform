import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
      // Epistemic coherence fields (NEW)
      baselineSource,         // 'inferred' | 'partial' | 'confirmed'
      visibleBaseline,        // Array of systems shown in UI
    } = await req.json();
    
    console.log('[ai-home-assistant] Request:', { 
      message, 
      propertyId, 
      advisorState, 
      confidence, 
      risk,
      baselineSource,
      visibleBaselineCount: visibleBaseline?.length ?? 0,
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
      visibleBaseline
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

async function getPropertyContext(supabase: any, propertyId: string) {
  const [
    { data: systems },
    { data: recommendations },
    { data: predictions }
  ] = await Promise.all([
    supabase.from('system_lifecycles').select('*').eq('property_id', propertyId),
    supabase.from('smart_recommendations').select('*').eq('property_id', propertyId).eq('is_completed', false).limit(5),
    supabase.from('prediction_accuracy').select('*').eq('property_id', propertyId).limit(3)
  ]);

  return {
    systems: systems || [],
    activeRecommendations: recommendations || [],
    recentPredictions: predictions || []
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
  visibleBaseline?: Array<{ key: string; displayName: string; state: string }>
) {
  const systemPrompt = createSystemPrompt(context, copyProfile, focusSystem, baselineSource, visibleBaseline);
  
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
  visibleBaseline?: Array<{ key: string; displayName: string; state: string }>
): string {
  const systemInfo = context.systems.map((s: any) => 
    `- ${s.system_name}: ${s.current_condition || 'Good'} (installed ${s.installed_year || 'unknown'})`
  ).join('\n');

  const recommendations = context.activeRecommendations.map((r: any) => 
    `- ${r.title}: ${r.description} (urgency: ${r.urgency_score}/100)`
  ).join('\n');

  // Base personality
  let prompt = `You are Habitta AI, an expert home maintenance advisor. You are a calm, knowledgeable steward — not a pushy assistant.

PROPERTY CONTEXT:
Current Systems:
${systemInfo || 'No systems registered yet'}

Active Recommendations:
${recommendations || 'No active recommendations'}

${focusSystem ? `CURRENT FOCUS: ${focusSystem} system\nThe user has selected this system. Reference it specifically in your response.` : ''}

PERSONALITY:
- Calm, composed, never alarmist
- A steward watching on the homeowner's behalf
- Situational intelligence, not "ask me anything"
`;

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

"WHY?" RESPONSE PATTERN (COMPLETE UNDERSTANDING):
When the user asks "Why?" about a system state, deliver a complete unit of understanding:

1. BELIEF: What Habitta believes about this system
   "Based on what you're seeing above, your [system] is [state]."

2. REASONS: Why it believes this (bullet list)
   • Its estimated age falls within the typical operating range for systems in this region
   • No unusual environmental stress patterns are present
   • [Additional factor based on data]

3. IMPLICATION: What this means for the homeowner (closure statement)
   - For stable: "This means you don't need to take action right now. Routine monitoring is sufficient."
   - For planning_window: "This is a good time to begin researching options. No immediate action is required."
   - For elevated: "This warrants attention. Consider having it inspected before making decisions."

4. OPTIONAL CTA (one max, invitational):
   "If you'd like to improve accuracy, you can confirm the installation year or upload a photo of the unit label."

CRITICAL RULES:
- "Why?" should NEVER generate a question back to the user
- "Why?" delivers closure, not opens a thread
- Maximum one optional CTA, always invitational
- The structure is: Belief → Reasons → Implication → [Optional CTA]
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
      
    case 'get_contractor_recommendations':
      return `For ${parsedArgs.service_type} services, I recommend getting quotes from 3 licensed contractors. Look for ones with good Better Business Bureau ratings and specific experience with Florida homes. Would you like me to help you prepare questions to ask potential contractors?`;
      
    case 'calculate_cost_impact':
      const delayMonths = parsedArgs.delay_months || 0;
      const impactMultiplier = 1 + (delayMonths * 0.05);
      return `Delaying ${parsedArgs.repair_type}${delayMonths > 0 ? ` by ${delayMonths} months` : ''} could increase costs by approximately ${Math.round((impactMultiplier - 1) * 100)}% due to further deterioration and potential emergency repair premiums. Acting sooner typically saves money and prevents more extensive damage.`;
      
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
