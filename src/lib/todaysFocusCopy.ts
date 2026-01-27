/**
 * Today's Focus Copy Governance
 * 
 * Single source of truth for dashboard primary narrative copy.
 * Enforces copy contract:
 * - One sentence only
 * - Statement, not suggestion
 * - No percentages, dates, or "You should" language
 * 
 * Voice: Steward, not coach. Advisor, not dashboard.
 */

// ============================================
// Types
// ============================================

export type FocusState = 'stable' | 'planning' | 'advisory' | 'risk';
export type SourceSystem = 'hvac' | 'roof' | 'water_heater' | 'market' | null;
export type PositionLabel = 'Early' | 'Mid-Life' | 'Late';
export type ConfidenceLanguage = 'high' | 'moderate' | 'early';

export interface TodaysFocus {
  state: FocusState;
  message: string;
  sourceSystem: SourceSystem;
  changedSinceLastVisit: boolean;
}

export interface PositionStripData {
  label: PositionLabel;
  relativePosition: number;  // 0.0 → 1.0
  confidence: ConfidenceLanguage;
  sourceSystem?: SourceSystem;
}

export interface ContextDrawerData {
  rationale: string;
  signals: string[];  // max 3
  confidenceLanguage: ConfidenceLanguage;
}

export interface CapitalAdvisory {
  insight: string;
  category: 'equity' | 'refi' | 'exit' | 'renovation';
}

// ============================================
// Banned Phrases (Enforced)
// ============================================

export const BANNED_PHRASES = [
  '!',                    // No exclamation points
  'You should',
  'We recommend',
  'Don\'t worry',
  'Based on our AI',
  'Good news',
  'You\'re all set',
  'Nice work',
  '%',                    // No percentages
  'in the next',
  'within',
  'urgent',
  'critical',
  'immediately',
] as const;

/**
 * Validate copy against banned phrases
 */
export function validateCopy(text: string): boolean {
  return !BANNED_PHRASES.some(phrase => 
    text.toLowerCase().includes(phrase.toLowerCase())
  );
}

// ============================================
// System Name Formatting
// ============================================

const SYSTEM_NAMES: Record<string, string> = {
  hvac: 'HVAC',
  roof: 'roof',
  water_heater: 'water heater',
  electrical: 'electrical system',
  plumbing: 'plumbing',
  foundation: 'foundation',
  windows: 'windows',
  siding: 'siding',
  market: 'market',
};

export function formatSystemName(sourceSystem: SourceSystem): string {
  if (!sourceSystem) return '';
  return SYSTEM_NAMES[sourceSystem] || sourceSystem.replace(/_/g, ' ');
}

export function formatSystemNameCapitalized(sourceSystem: SourceSystem): string {
  const name = formatSystemName(sourceSystem);
  if (!name) return '';
  // Keep HVAC uppercase, capitalize others
  if (sourceSystem === 'hvac') return 'HVAC';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ============================================
// Today's Focus Copy Generation
// ============================================

export function getTodaysFocusCopy(
  state: FocusState,
  sourceSystem: SourceSystem
): string {
  const systemName = formatSystemName(sourceSystem);
  const systemNameCapitalized = formatSystemNameCapitalized(sourceSystem);
  
  const copyMap: Record<FocusState, string> = {
    stable: 'Nothing requires attention right now.',
    planning: `Your ${systemName} is entering its planning window.`,
    advisory: 'Market conditions make this a strong refinance period.',
    risk: `${systemNameCapitalized} wear has crossed our attention threshold.`,
  };
  
  return copyMap[state];
}

// ============================================
// Position Copy Generation
// ============================================

export function getPositionCopy(label: PositionLabel): string {
  return `Position: ${label}`;
}

// ============================================
// Confidence Description
// ============================================

export function getConfidenceDescription(level: ConfidenceLanguage): string {
  const descriptions: Record<ConfidenceLanguage, string> = {
    high: 'This assessment is based on verified records and strong regional data.',
    moderate: 'This assessment is based on permit history and regional comparables.',
    early: 'This is an early assessment based on limited data. Confidence will improve over time.',
  };
  return descriptions[level];
}

// ============================================
// Context Drawer Rationale Generation
// ============================================

export function getRationale(
  focusState: FocusState,
  sourceSystem: SourceSystem
): string {
  const systemName = formatSystemName(sourceSystem);
  
  const rationales: Record<FocusState, string> = {
    stable: 'All monitored systems are performing within expected parameters for homes of this age and type.',
    planning: `This surfaced because similar homes in your region begin experiencing ${systemName} issues at this stage.`,
    advisory: 'Regional market data indicates favorable conditions for equity-based decisions.',
    risk: `This surfaced because ${systemName} indicators have crossed the threshold where proactive planning typically saves costs.`,
  };
  
  return rationales[focusState];
}

// ============================================
// Default Signals by State
// ============================================

export function getDefaultSignals(
  focusState: FocusState,
  sourceSystem: SourceSystem
): string[] {
  const systemName = formatSystemName(sourceSystem);
  
  const signalMap: Record<FocusState, string[]> = {
    stable: [
      'No systems approaching planning windows',
      'Maintenance schedule is current',
      'Regional stress levels are normal',
    ],
    planning: [
      'Age relative to expected lifespan',
      'Regional replacement activity patterns',
      'Climate exposure factors for your area',
    ],
    advisory: [
      'Comparable property transaction data',
      'Current interest rate environment',
      'Your equity position',
    ],
    risk: [
      `${formatSystemNameCapitalized(sourceSystem)} age exceeds regional median`,
      'Elevated failure patterns in similar homes',
      'Climate stress accumulation',
    ],
  };
  
  return signalMap[focusState];
}

// ============================================
// Chat Placeholder by State
// ============================================

export function getChatPlaceholder(focus: TodaysFocus | null): string {
  if (!focus) {
    return 'What would you like to understand better?';
  }
  
  if (focus.state === 'stable') {
    return "You're reviewing your home while everything is stable. What would you like to explore?";
  }
  
  if (focus.sourceSystem) {
    return `Ask about your ${formatSystemName(focus.sourceSystem)}...`;
  }
  
  return 'What would you like to understand better?';
}

export function getChatEmptyStateMessage(focus: TodaysFocus | null): string {
  if (!focus || focus.state === 'stable') {
    return 'Your home is stable. What would you like to explore?';
  }
  return 'What are you thinking about regarding your home?';
}
