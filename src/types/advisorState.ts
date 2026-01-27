/**
 * Habitta Advisor State Model
 * 
 * State machine for intelligent chat behavior.
 * The advisor inhabits the dashboard rather than dominating it.
 */

// Primary advisor states (5 total, nothing more)
export type AdvisorState = 
  | 'PASSIVE'     // Idle, chat closed, monitoring
  | 'OBSERVING'   // Browsing, no intent yet
  | 'ENGAGED'     // System in focus OR agent has something to say
  | 'DECISION'    // Active reasoning, comparing tradeoffs
  | 'EXECUTION';  // Commitment made, action handoff

// Focus context - what Habitta is thinking about
export type FocusContext = 
  | { type: 'NONE' }
  | { type: 'SYSTEM'; systemKey: string }
  | { type: 'EVENT'; eventId: string }
  | { type: 'DECISION'; decisionId: string };

// Risk level for copy adaptation
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

// Confidence bucket (non-gradient, for stability)
export type ConfidenceBucket = 'LOW' | 'MEDIUM' | 'HIGH';

// Copy style profile - governs LLM output
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

// Trigger types that can cause state transitions
export type AdvisorTrigger =
  | { type: 'SYSTEM_SELECTED'; systemKey: string }
  | { type: 'RISK_THRESHOLD_CROSSED'; systemKey: string; newLevel: RiskLevel }
  | { type: 'CONFIDENCE_IMPROVED'; systemKey: string; oldConfidence: number; newConfidence: number }
  | { type: 'PLANNING_WINDOW_ENTERED'; systemKey: string; monthsRemaining: number }
  | { type: 'USER_REPLIED' }
  | { type: 'USER_COMMITTED'; decisionId: string }
  | { type: 'USER_DISMISSED_CHAT' }
  | { type: 'USER_SWITCHED_SYSTEM'; newSystemKey: string };

// Auto-open message structure (mandatory format)
export interface AdvisorOpeningMessage {
  observation: string;      // What changed or what's being focused
  implication: string;      // Why it matters now
  optionsPreview: string;   // What decisions exist (no detail yet)
}

// Complete advisor state context
export interface AdvisorContext {
  state: AdvisorState;
  focus: FocusContext;
  confidence: number;         // 0.0 - 1.0
  risk: RiskLevel;
  lastTrigger?: AdvisorTrigger;
  expandedTriggers: Set<string>;  // Triggers that already caused expansion (once per unique)
}

/**
 * Get confidence bucket from raw confidence score
 * No gradients, no vibes - buckets create stability
 */
export function getConfidenceBucket(confidence: number): ConfidenceBucket {
  if (confidence < 0.5) return 'LOW';
  if (confidence < 0.8) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Check if a trigger should cause state transition to ENGAGED
 */
export function shouldAutoExpand(
  trigger: AdvisorTrigger,
  currentState: AdvisorState,
  expandedTriggers: Set<string>
): boolean {
  // Already engaged or beyond - no need to re-expand
  if (currentState === 'ENGAGED' || currentState === 'DECISION' || currentState === 'EXECUTION') {
    return false;
  }

  // Create unique trigger key
  const triggerKey = getTriggerKey(trigger);
  
  // Check if this exact trigger already fired (once per trigger rule)
  if (expandedTriggers.has(triggerKey)) {
    return false;
  }

  // These triggers cause auto-expansion
  switch (trigger.type) {
    case 'SYSTEM_SELECTED':
    case 'RISK_THRESHOLD_CROSSED':
    case 'PLANNING_WINDOW_ENTERED':
      return true;
    case 'CONFIDENCE_IMPROVED':
      // Only if material improvement (>0.15 jump)
      return (trigger.newConfidence - trigger.oldConfidence) > 0.15;
    default:
      return false;
  }
}

/**
 * Get unique key for a trigger (for tracking expansion history)
 */
export function getTriggerKey(trigger: AdvisorTrigger): string {
  switch (trigger.type) {
    case 'SYSTEM_SELECTED':
      return `system-selected-${trigger.systemKey}`;
    case 'RISK_THRESHOLD_CROSSED':
      return `risk-crossed-${trigger.systemKey}-${trigger.newLevel}`;
    case 'CONFIDENCE_IMPROVED':
      return `confidence-improved-${trigger.systemKey}`;
    case 'PLANNING_WINDOW_ENTERED':
      return `planning-window-${trigger.systemKey}`;
    case 'USER_SWITCHED_SYSTEM':
      return `switched-to-${trigger.newSystemKey}`;
    default:
      return trigger.type;
  }
}

/**
 * Generate the opening message for ENGAGED state
 * Follows strict: Observation → Implication → Options structure
 */
export function generateOpeningMessage(
  trigger: AdvisorTrigger,
  confidence: ConfidenceBucket,
  risk: RiskLevel,
  systemName: string = 'system'
): AdvisorOpeningMessage {
  switch (trigger.type) {
    case 'SYSTEM_SELECTED':
      return getSystemFocusMessage(systemName, confidence, risk);
    case 'RISK_THRESHOLD_CROSSED':
      return getRiskThresholdMessage(systemName, trigger.newLevel, confidence);
    case 'CONFIDENCE_IMPROVED':
      return getConfidenceImprovedMessage(systemName, confidence);
    case 'PLANNING_WINDOW_ENTERED':
      return getLifecycleStageMessage(systemName, trigger.monthsRemaining, confidence);
    default:
      return {
        observation: `I'm focusing on your ${systemName}.`,
        implication: 'Based on current data, there may be some considerations worth reviewing.',
        optionsPreview: 'There are a few reasonable paths depending on your priorities.'
      };
  }
}

function getSystemFocusMessage(
  systemName: string,
  confidence: ConfidenceBucket,
  risk: RiskLevel
): AdvisorOpeningMessage {
  const observation = `I'm focusing on your ${systemName}.`;
  
  let implication: string;
  let optionsPreview: string;

  if (confidence === 'LOW') {
    implication = 'Based on limited records, it may be approaching a higher-risk window.';
    optionsPreview = 'There are a few reasonable paths once we clarify a bit more.';
  } else if (confidence === 'MEDIUM') {
    if (risk === 'HIGH') {
      implication = "It's entering a higher-risk window over the next couple of years.";
    } else {
      implication = 'Current indicators suggest moderate attention may be warranted.';
    }
    optionsPreview = "You've got a few smart options depending on how proactive you want to be.";
  } else {
    if (risk === 'HIGH') {
      implication = "It's likely to need attention within the next 12–24 months based on verified records.";
    } else {
      implication = 'Verified records show this system is tracking well within expected parameters.';
    }
    optionsPreview = 'There are clear paths you can take to stay ahead of this.';
  }

  return { observation, implication, optionsPreview };
}

function getRiskThresholdMessage(
  systemName: string,
  newLevel: RiskLevel,
  confidence: ConfidenceBucket
): AdvisorOpeningMessage {
  const observation = `Quick heads-up — your ${systemName} just entered a ${newLevel.toLowerCase()}-risk window.`;
  
  const implication = newLevel === 'HIGH'
    ? "This doesn't mean immediate action is required, but planning now could save you money later."
    : 'This is worth monitoring more closely going forward.';
  
  const optionsPreview = confidence === 'LOW'
    ? "We can firm up the picture with more data, or I can outline general options."
    : "I can walk you through your options whenever you're ready.";

  return { observation, implication, optionsPreview };
}

function getConfidenceImprovedMessage(
  systemName: string,
  confidence: ConfidenceBucket
): AdvisorOpeningMessage {
  return {
    observation: `I've got higher confidence in your ${systemName} forecast now after reviewing new records.`,
    implication: confidence === 'HIGH' 
      ? 'This means predictions are now based on verified data rather than estimates.'
      : 'The picture is clearer, though some uncertainty remains.',
    optionsPreview: 'Want to see what changed?'
  };
}

// Renamed from getPlanningWindowMessage per doctrine compliance
function getLifecycleStageMessage(
  systemName: string,
  monthsRemaining: number,
  confidence: ConfidenceBucket
): AdvisorOpeningMessage {
  const yearsRemaining = Math.round(monthsRemaining / 12);
  
  return {
    // Doctrine compliance: Replace "planning window" with lifecycle language
    observation: `Your ${systemName} is in a later lifecycle stage.`,
    implication: confidence === 'HIGH'
      ? `Based on verified records, this may warrant consideration in roughly ${yearsRemaining} year${yearsRemaining !== 1 ? 's' : ''}.`
      : `Current estimates suggest this may be worth reviewing within ${yearsRemaining}–${yearsRemaining + 2} years.`,
    optionsPreview: 'Understanding this early provides more flexibility.'
  };
}
