/**
 * Narrative Priority Stack - Arbitration Layer for Dashboard Intelligence
 * 
 * Resolves competing states into a single dominant narrative.
 * Priority order (highest to lowest):
 * 1. URGENCY   - Risk threshold crossed (HIGH risk on any system)
 * 2. PLANNING  - Planning window entered (< 36 months)
 * 3. PROGRESS  - Confidence improved materially (> 0.15 delta)
 * 4. STABILITY - No issues, reassurance
 * 
 * Rule: Exactly ONE dominant narrative wins.
 */

import type { 
  TodaysFocus, 
  PositionStripData, 
  ContextDrawerData,
  FocusState,
  SourceSystem,
  PositionLabel,
  ConfidenceLanguage,
} from './todaysFocusCopy';
import { 
  getTodaysFocusCopy, 
  getRationale, 
  getDefaultSignals,
} from './todaysFocusCopy';

// Re-export types for convenience
export type { TodaysFocus, PositionStripData, ContextDrawerData };

export type NarrativePriority = 'URGENCY' | 'PLANNING' | 'PROGRESS' | 'STABILITY';

export interface SystemSignal {
  key: string;
  displayName: string;
  risk: 'LOW' | 'MODERATE' | 'HIGH';
  confidence: number;
  monthsToPlanning?: number;
  confidenceDelta?: number;
}

export interface NarrativeContext {
  overallScore: number;
  isNewUser: boolean;
  systems: SystemSignal[];
  hasOverdueMaintenance: boolean;
  maintenanceCompletedThisMonth: number;
  hasChangedSinceLastVisit?: boolean;
}

export interface RecommendedAction {
  actionLabel: string;
  impactLabel: string;
  route: string;
  softFraming: string;
}

export interface NarrativeResult {
  priority: NarrativePriority;
  dominantSystem?: string;
  dominantSystemName?: string;
  secondarySignals: string[];
  briefKey: BriefKey;
  recommendedAction?: RecommendedAction;
}

export type BriefKey = 
  | 'elevated_risk'
  | 'planning_opportunity'
  | 'confidence_improved'
  | 'new_user_stable'
  | 'returning_stable'
  | 'maintenance_pending';

/**
 * Collect secondary signals for expanded view (not brief)
 */
function collectSecondary(ctx: NarrativeContext, excludeKey: string): string[] {
  const signals: string[] = [];
  
  ctx.systems.forEach(s => {
    if (s.key === excludeKey) return;
    if (s.risk === 'HIGH') signals.push(`${s.displayName} at elevated risk`);
    if (s.monthsToPlanning && s.monthsToPlanning < 36) {
      signals.push(`${s.displayName} entering planning window`);
    }
  });
  
  if (ctx.hasOverdueMaintenance) {
    signals.push('Maintenance tasks pending');
  }
  
  return signals;
}

/**
 * Generate recommended action based on priority and context
 */
function generateRecommendedAction(
  priority: NarrativePriority,
  dominantSystem?: SystemSignal
): RecommendedAction | undefined {
  switch (priority) {
    case 'URGENCY':
      return dominantSystem ? {
        actionLabel: 'Review replacement options',
        impactLabel: 'More flexibility',
        route: `/chatdiy?topic=replacement-planning&system=${dominantSystem.key}`,
        softFraming: 'If you want to get ahead of this:'
      } : undefined;
    
    case 'PLANNING':
      return dominantSystem ? {
        actionLabel: `Confirm your ${dominantSystem.displayName.toLowerCase()} install year`,
        impactLabel: '+8 pts accuracy',
        route: `/system/${dominantSystem.key}?action=confirm-install`,
        softFraming: 'If you want to do one thing this month:'
      } : undefined;
    
    case 'PROGRESS':
      return dominantSystem ? {
        actionLabel: 'See what changed',
        impactLabel: 'Updated forecast',
        route: `/chatdiy?topic=confidence-delta&system=${dominantSystem.key}`,
        softFraming: 'Your forecast just got more accurate.'
      } : undefined;
    
    case 'STABILITY':
      // No recommendation for stable state - silence is intentional
      return undefined;
  }
}

/**
 * Main arbitration function - resolves multiple signals into one narrative
 */
export function arbitrateNarrative(ctx: NarrativeContext): NarrativeResult {
  // Priority 1: URGENCY - Any system at HIGH risk
  const highRiskSystem = ctx.systems.find(s => s.risk === 'HIGH');
  if (highRiskSystem) {
    return {
      priority: 'URGENCY',
      dominantSystem: highRiskSystem.key,
      dominantSystemName: highRiskSystem.displayName,
      secondarySignals: collectSecondary(ctx, highRiskSystem.key),
      briefKey: 'elevated_risk',
      recommendedAction: generateRecommendedAction('URGENCY', highRiskSystem)
    };
  }
  
  // Priority 2: PLANNING - Any system entering planning window (< 36 months)
  const planningSystem = ctx.systems.find(s => 
    s.monthsToPlanning !== undefined && s.monthsToPlanning < 36
  );
  if (planningSystem) {
    return {
      priority: 'PLANNING',
      dominantSystem: planningSystem.key,
      dominantSystemName: planningSystem.displayName,
      secondarySignals: collectSecondary(ctx, planningSystem.key),
      briefKey: 'planning_opportunity',
      recommendedAction: generateRecommendedAction('PLANNING', planningSystem)
    };
  }
  
  // Priority 3: PROGRESS - Material confidence improvement (> 0.15 delta)
  const improvedSystem = ctx.systems.find(s => 
    s.confidenceDelta !== undefined && s.confidenceDelta > 0.15
  );
  if (improvedSystem) {
    return {
      priority: 'PROGRESS',
      dominantSystem: improvedSystem.key,
      dominantSystemName: improvedSystem.displayName,
      secondarySignals: collectSecondary(ctx, improvedSystem.key),
      briefKey: 'confidence_improved',
      recommendedAction: generateRecommendedAction('PROGRESS', improvedSystem)
    };
  }
  
  // Priority 4: Check for overdue maintenance (secondary urgency)
  if (ctx.hasOverdueMaintenance) {
    return {
      priority: 'STABILITY',
      dominantSystem: undefined,
      secondarySignals: [],
      briefKey: 'maintenance_pending',
      recommendedAction: {
        actionLabel: 'View pending tasks',
        impactLabel: 'Reduce risk',
        route: '/maintenance',
        softFraming: 'A few small tasks are pending:'
      }
    };
  }
  
  // Priority 5: STABILITY - Default reassurance
  return {
    priority: 'STABILITY',
    dominantSystem: undefined,
    secondarySignals: [],
    briefKey: ctx.isNewUser ? 'new_user_stable' : 'returning_stable',
    recommendedAction: undefined
  };
}

/**
 * Format system key to display name
 */
export function formatSystemDisplayName(key: string): string {
  const names: Record<string, string> = {
    hvac: 'HVAC',
    roof: 'Roof',
    water_heater: 'Water Heater',
    electrical: 'Electrical',
    plumbing: 'Plumbing',
    foundation: 'Foundation',
    windows: 'Windows',
    siding: 'Siding'
  };
  return names[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================
// Today's Focus Arbitration
// ============================================

/**
 * Arbitrate Today's Focus from system signals
 * Priority: RISK > PLANNING > ADVISORY > STABLE
 */
export function arbitrateTodaysFocus(ctx: NarrativeContext): TodaysFocus {
  // Priority 1: Risk threshold crossed
  const highRiskSystem = ctx.systems.find(s => s.risk === 'HIGH');
  if (highRiskSystem) {
    const sourceSystem = highRiskSystem.key as SourceSystem;
    return {
      state: 'risk',
      message: getTodaysFocusCopy('risk', sourceSystem),
      sourceSystem,
      changedSinceLastVisit: ctx.hasChangedSinceLastVisit ?? false,
    };
  }
  
  // Priority 2: Planning window (< 36 months)
  const planningSystem = ctx.systems.find(s => 
    s.monthsToPlanning !== undefined && s.monthsToPlanning < 36
  );
  if (planningSystem) {
    const sourceSystem = planningSystem.key as SourceSystem;
    return {
      state: 'planning',
      message: getTodaysFocusCopy('planning', sourceSystem),
      sourceSystem,
      changedSinceLastVisit: ctx.hasChangedSinceLastVisit ?? false,
    };
  }
  
  // Priority 3: Market advisory (future implementation)
  // if (ctx.marketConditions?.favorable) { ... }
  
  // Priority 4: Stable
  return {
    state: 'stable',
    message: getTodaysFocusCopy('stable', null),
    sourceSystem: null,
    changedSinceLastVisit: false,
  };
}

// ============================================
// Position Strip Resolution
// ============================================

/**
 * Get the dominant system by lifecycle urgency
 */
function getDominantLifecycleSystem(systems: SystemSignal[]): (SystemSignal & { positionScore: number }) | null {
  if (systems.length === 0) return null;
  
  // Sort by urgency (lowest remaining months = highest position score)
  const sorted = [...systems].sort((a, b) => {
    const aMonths = a.monthsToPlanning ?? 120;
    const bMonths = b.monthsToPlanning ?? 120;
    return aMonths - bMonths;
  });
  
  const dominant = sorted[0];
  // Calculate position score (0 = just installed, 1 = end of life)
  // Normalize: 180 months (15 years) = 0, 0 months = 1
  const months = dominant.monthsToPlanning ?? 120;
  const positionScore = Math.max(0, Math.min(1, 1 - (months / 180)));
  
  return { ...dominant, positionScore };
}

/**
 * Resolve lifecycle position from system signals
 * Position is derived from dominant system's lifecycle stage
 */
export function resolvePosition(ctx: NarrativeContext): PositionStripData {
  const dominantSystem = getDominantLifecycleSystem(ctx.systems);
  
  // Derive position label from lifecycle stage
  const positionScore = dominantSystem?.positionScore ?? 0.5;
  const label: PositionLabel = 
    positionScore < 0.33 ? 'Early' :
    positionScore < 0.66 ? 'Mid-Life' : 'Late';
  
  // Derive confidence from average system confidence
  const avgConfidence = ctx.systems.length > 0
    ? ctx.systems.reduce((sum, s) => sum + s.confidence, 0) / ctx.systems.length
    : 0.5;
  const confidence: ConfidenceLanguage = 
    avgConfidence >= 0.7 ? 'high' :
    avgConfidence >= 0.4 ? 'moderate' : 'early';
  
  return {
    label,
    relativePosition: positionScore,
    confidence,
    sourceSystem: (dominantSystem?.key as SourceSystem) ?? null,
  };
}

// ============================================
// Context Drawer Data Resolution
// ============================================

/**
 * Resolve context drawer data from focus state
 */
export function resolveContextDrawer(
  focus: TodaysFocus,
  ctx: NarrativeContext
): ContextDrawerData {
  // Find the dominant system's confidence
  const dominantSystem = ctx.systems.find(s => s.key === focus.sourceSystem);
  const systemConfidence = dominantSystem?.confidence ?? 0.5;
  
  const confidenceLanguage: ConfidenceLanguage = 
    systemConfidence >= 0.7 ? 'high' :
    systemConfidence >= 0.4 ? 'moderate' : 'early';
  
  return {
    rationale: getRationale(focus.state, focus.sourceSystem),
    signals: getDefaultSignals(focus.state, focus.sourceSystem),
    confidenceLanguage,
  };
}
