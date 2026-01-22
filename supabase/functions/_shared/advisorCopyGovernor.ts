/**
 * Server-Side Confidence-to-Copy Adapter
 * 
 * Authoritative v1 - This is the policy layer that constrains copy.
 * The LLM never sees raw confidence or risk — only the allowed style profile.
 * 
 * This adapter guarantees:
 * - No hallucinated urgency
 * - No premature selling
 * - No tone drift as models change
 */

export type AdvisorState = 'PASSIVE' | 'OBSERVING' | 'ENGAGED' | 'DECISION' | 'EXECUTION';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type ConfidenceBucket = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CopyStyleProfile {
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

/**
 * Get confidence bucket from raw score
 * No smoothing. No dynamic thresholds. Stability > cleverness.
 */
export function confidenceBucket(confidence: number): ConfidenceBucket {
  if (confidence < 0.5) return 'LOW';
  if (confidence < 0.8) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Base profiles by state and confidence (static, auditable)
 */
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

/**
 * Apply risk overlay to profile
 * Risk never alters tone, cost rules, or allowed acts — only time framing.
 */
function applyRiskOverlay(profile: CopyStyleProfile, risk: RiskLevel): CopyStyleProfile {
  const next = { ...profile, allowedActs: { ...profile.allowedActs } };

  if (risk === 'HIGH' && next.urgency === 'none') {
    next.urgency = 'soft';
  }

  if (risk === 'LOW') {
    next.urgency = 'none';
  }

  return next;
}

/**
 * Get the advisor copy profile for a given state, confidence, and risk
 * 
 * If this returns null → no chat output allowed (PASSIVE/OBSERVING states)
 */
export function getAdvisorCopyProfile(
  state: AdvisorState,
  confidence: number,
  risk: RiskLevel
): CopyStyleProfile | null {
  // PASSIVE and OBSERVING never produce copy
  if (state === 'PASSIVE' || state === 'OBSERVING') {
    return null;
  }

  const bucket = confidenceBucket(confidence);
  const base = BASE_PROFILES[state][bucket];
  return applyRiskOverlay(base, risk);
}

/**
 * Convert copy style profile to system prompt instructions
 * This is what gets injected into the LLM prompt
 */
export function profileToPromptInstructions(profile: CopyStyleProfile): string {
  const instructions: string[] = [];

  // Verbosity
  switch (profile.verbosity) {
    case 'minimal':
      instructions.push('Keep responses under 2 sentences.');
      break;
    case 'concise':
      instructions.push('Keep responses to 2-3 short paragraphs. Be direct.');
      break;
    case 'detailed':
      instructions.push('You may provide detailed explanations when comparing options.');
      break;
  }

  // Specificity
  switch (profile.specificity) {
    case 'low':
      instructions.push('Avoid specific numbers or timeframes. Use general terms like "may", "could", "sometime".');
      break;
    case 'medium':
      instructions.push('Use moderate specificity. Ranges are acceptable (e.g., "12-24 months", "a few years").');
      break;
    case 'high':
      instructions.push('Be specific with timeframes and projections when the data supports it.');
      break;
  }

  // Cost disclosure
  switch (profile.costDisclosure) {
    case 'none':
      instructions.push('Do NOT mention specific costs or price ranges.');
      break;
    case 'ranges':
      instructions.push('You may mention cost ranges (e.g., "$5,000-$8,000") but not exact figures.');
      break;
    case 'tight':
      instructions.push('You may provide specific cost estimates when confident in the data.');
      break;
  }

  // Tone
  switch (profile.tone) {
    case 'observational':
      instructions.push('Tone: Calm and observational. Frame the situation, don\'t solve it yet.');
      break;
    case 'analytical':
      instructions.push('Tone: Analytical and supportive. Compare tradeoffs clearly.');
      break;
    case 'procedural':
      instructions.push('Tone: Decisive and procedural. The user has committed — help them execute.');
      break;
  }

  // Urgency
  switch (profile.urgency) {
    case 'none':
      instructions.push('Do NOT create urgency. This is about planning, not reacting.');
      break;
    case 'soft':
      instructions.push('Gentle time awareness is okay (e.g., "over the next year or two").');
      break;
    case 'time-bound':
      instructions.push('Time-bound framing is appropriate when data supports specific windows.');
      break;
  }

  // Allowed acts
  const acts: string[] = [];
  if (profile.allowedActs.askQuestions) acts.push('ask clarifying questions');
  if (profile.allowedActs.presentOptions) acts.push('present options');
  if (profile.allowedActs.recommendPath) acts.push('recommend a specific path');
  if (profile.allowedActs.initiateExecution) acts.push('initiate execution steps');
  
  if (acts.length > 0) {
    instructions.push(`You may: ${acts.join(', ')}.`);
  }

  // Hard rules (always apply)
  instructions.push('');
  instructions.push('HARD RULES (never violate):');
  instructions.push('- Never say "You should..." — frame as options');
  instructions.push('- Never use words: "urgent", "act now", "don\'t miss out", "limited time"');
  instructions.push('- Always reference what\'s visible on screen');
  instructions.push('- End with an invitation, not a button or CTA');

  return instructions.join('\n');
}
