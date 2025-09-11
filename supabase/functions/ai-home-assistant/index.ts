import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { message, propertyId, conversationHistory } = await req.json();
    
    console.log('AI Assistant request:', { message, propertyId });

    // Get property context
    const propertyContext = await getPropertyContext(supabase, propertyId);
    
    // Generate AI response using OpenAI
    const response = await generateAIResponse(openAIApiKey, message, propertyContext, conversationHistory);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in AI home assistant:', error);
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

async function generateAIResponse(apiKey: string, message: string, context: any, history: any[] = []) {
  const systemPrompt = createSystemPrompt(context);
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6), // Last 6 messages for context
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
      functions: [
        {
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
            required: ['system', 'task', 'urgency']
          }
        },
        {
          name: 'get_contractor_recommendations',
          description: 'Get local contractor recommendations for a specific service',
          parameters: {
            type: 'object',
            properties: {
              service_type: { type: 'string', description: 'Type of service needed' },
              urgency: { type: 'string', enum: ['low', 'medium', 'high'] }
            },
            required: ['service_type']
          }
        },
        {
          name: 'calculate_cost_impact',
          description: 'Calculate the cost impact of a repair or maintenance decision',
          parameters: {
            type: 'object',
            properties: {
              repair_type: { type: 'string', description: 'Type of repair or maintenance' },
              delay_months: { type: 'number', description: 'Months to delay the work' }
            },
            required: ['repair_type']
          }
        }
      ],
      function_call: 'auto'
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }

  const aiMessage = data.choices[0].message;
  
  // Handle function calls
  if (aiMessage.function_call) {
    const functionResult = await handleFunctionCall(aiMessage.function_call, context);
    return {
      message: `${aiMessage.content || ''}\n\n${functionResult}`,
      functionCall: aiMessage.function_call,
      functionResult
    };
  }

  return {
    message: aiMessage.content,
    suggestions: generateFollowUpSuggestions(message, context)
  };
}

function createSystemPrompt(context: any): string {
  const systemInfo = context.systems.map((s: any) => 
    `- ${s.system_name}: ${s.current_condition || 'Good'} (installed ${s.installed_year || 'unknown'})`
  ).join('\n');

  const recommendations = context.activeRecommendations.map((r: any) => 
    `- ${r.title}: ${r.description} (urgency: ${r.urgency_score}/100)`
  ).join('\n');

  return `You are Habitta AI, an expert home maintenance assistant. You help homeowners with maintenance planning, cost optimization, and system care.

PROPERTY CONTEXT:
Current Systems:
${systemInfo}

Active Recommendations:
${recommendations}

PERSONALITY & APPROACH:
- Be conversational, helpful, and knowledgeable
- Provide specific, actionable advice
- Consider Florida climate impacts (humidity, hurricanes, heat)
- Emphasize preventive maintenance and cost savings
- Use function calls when users need specific actions
- Always prioritize safety and professional help for complex electrical/gas work

RESPONSE GUIDELINES:
- Keep responses concise but informative (under 400 words)
- Include specific cost estimates when relevant
- Suggest timing based on seasons and urgency
- Mention DIY vs professional recommendations
- Reference the user's existing systems and recommendations when relevant`;
}

async function handleFunctionCall(functionCall: any, context: any): string {
  const { name, arguments: args } = functionCall;
  const parsedArgs = JSON.parse(args);

  switch (name) {
    case 'schedule_maintenance':
      return `I'll help you schedule ${parsedArgs.task} for your ${parsedArgs.system}. This is ${parsedArgs.urgency} priority${parsedArgs.estimated_cost ? ` with an estimated cost of $${parsedArgs.estimated_cost}` : ''}. I recommend scheduling this within ${parsedArgs.urgency === 'high' ? '1-2 weeks' : parsedArgs.urgency === 'medium' ? '1-2 months' : '3-6 months'}.`;
      
    case 'get_contractor_recommendations':
      return `For ${parsedArgs.service_type} services, I recommend getting quotes from 3 licensed contractors. Look for ones with good Better Business Bureau ratings and specific experience with Florida homes. Would you like me to help you prepare questions to ask potential contractors?`;
      
    case 'calculate_cost_impact':
      const delayMonths = parsedArgs.delay_months || 0;
      const impactMultiplier = 1 + (delayMonths * 0.05); // 5% cost increase per month of delay
      return `Delaying ${parsedArgs.repair_type}${delayMonths > 0 ? ` by ${delayMonths} months` : ''} could increase costs by approximately ${Math.round((impactMultiplier - 1) * 100)}% due to further deterioration and potential emergency repair premiums. Acting sooner typically saves money and prevents more extensive damage.`;
      
    default:
      return 'I can help you with that. What specific information would you like?';
  }
}

function generateFollowUpSuggestions(message: string, context: any): string[] {
  const suggestions = [];
  
  if (message.toLowerCase().includes('cost') || message.toLowerCase().includes('budget')) {
    suggestions.push('Show me my predicted maintenance costs for this year');
    suggestions.push('What are the most cost-effective improvements I can make?');
  }
  
  if (message.toLowerCase().includes('hvac') || message.toLowerCase().includes('air')) {
    suggestions.push('When should I change my HVAC filters?');
    suggestions.push('How can I improve my HVAC efficiency?');
  }
  
  if (context.activeRecommendations.length > 0) {
    suggestions.push('What should I prioritize from my active recommendations?');
  }
  
  // Default suggestions
  if (suggestions.length === 0) {
    suggestions.push('What maintenance should I focus on this season?');
    suggestions.push('Show me my system health overview');
    suggestions.push('Help me find local contractors');
  }
  
  return suggestions.slice(0, 3);
}