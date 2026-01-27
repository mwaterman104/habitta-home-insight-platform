

# Chat Spec V1 — Amended Implementation Plan

## QA Corrections Summary

This amended plan incorporates all critical corrections from the executive QA review:

| Issue | Type | Fix Applied |
|-------|------|-------------|
| Mode priority order wrong | **Critical** | Baseline Establishment now outranks Planning Window |
| Elevated trigger too loose | **Critical** | Requires `deviation_detected` flag, not just time |
| Confidence under-specified | **Critical** | Explicit rules for what changes confidence |
| Interpretive mode needs timeout | **Subtle Risk** | Hard limit of 1 explanation, auto-return |
| Planning window needs memory | **Subtle Risk** | `planning_window_acknowledged_at` persistence |
| Baseline surface needs "Why?" affordance | **Subtle Risk** | Per-system trigger for Interpretive mode |

---

## Part 1: Corrected Chat Mode System

### Mode Priority Order (Critical Fix #1)

The mode priority is restructured to ensure **baseline gates advice**:

```text
PRIORITY ORDER (highest to lowest):
1. Elevated Attention    (safety exception - but gates behavior by confidence)
2. Baseline Establishment (incomplete confidence blocks advisory)
3. Planning Window Advisory
4. Interpretive          (user-triggered, ephemeral)
5. Silent Steward        (default)
```

**Key Rule**: Elevated Attention may override Baseline only to **confirm facts**, not recommend action. If confidence is low, Elevated mode asks questions, not gives advice.

### Files to Modify

**File:** `src/types/chatMode.ts`

Replace current 4-mode system with 5-mode spec-compliant system:

```typescript
export type ChatMode = 
  | 'silent_steward'              // Default: All stable, waits for user
  | 'baseline_establishment'      // New user or data gaps
  | 'interpretive'                // User asks "why/how" (ephemeral)
  | 'planning_window_advisory'    // System aging, preparation focus
  | 'elevated_attention';         // Deviation detected, more directive

/**
 * System State - Each system must be in exactly one state.
 * No compound states. No "Stable but..." language.
 */
export type SystemState = 
  | 'stable'           // Within expected range
  | 'planning_window'  // Aging curve intersects threshold
  | 'elevated'         // Deviation detected (NOT just time)
  | 'data_gap';        // Confidence below threshold
```

**File:** `src/lib/chatModeSelector.ts`

Corrected mode derivation with proper priority:

```typescript
export function determineChatMode(ctx: ChatModeInput): ChatMode {
  const { systemConfidence, criticalSystemsCoverage, systems } = ctx;
  
  // Baseline confidence gate (Critical Fix #1)
  const isBaselineIncomplete = 
    systemConfidence === 'Early' || 
    criticalSystemsCoverage < 0.5;

  // Check for elevated deviation (Critical Fix #2 - requires actual deviation)
  const hasElevatedDeviation = systems?.some(s => 
    s.deviation_detected === true || 
    (s.months_remaining !== undefined && 
     s.months_remaining < ELEVATED_MONTHS && 
     s.anomaly_flags?.length > 0)
  );

  // Priority 1: Elevated Attention (safety exception)
  // BUT: If baseline incomplete, Elevated mode only asks questions
  if (hasElevatedDeviation) {
    return 'elevated_attention';
    // Note: The Elevated mode BEHAVIOR is constrained by isBaselineIncomplete
  }

  // Priority 2: Baseline Establishment (gates advisory)
  if (isBaselineIncomplete) {
    return 'baseline_establishment';
  }

  // Priority 3: Planning Window (only after baseline complete)
  const hasPlanningWindow = systems?.some(s => 
    s.state === 'planning_window' || 
    (s.months_remaining !== undefined && s.months_remaining < PLANNING_MONTHS)
  );
  if (hasPlanningWindow) {
    return 'planning_window_advisory';
  }

  // Priority 4: Interpretive (triggered by user action, handled separately)
  // Priority 5: Silent Steward (default)
  return 'silent_steward';
}
```

---

## Part 2: Elevated Trigger Fix (Critical #2)

### Problem

Current code: `months < 12 → elevated`

This conflates **aging** with **deviation**. A water heater being old is planning. A water heater behaving oddly is elevated.

### Solution

Add `deviation_detected` field to system prediction data and require it for Elevated state.

**File:** `src/types/systemState.ts` (NEW)

```typescript
/**
 * System State Model
 * 
 * DOCTRINE: Elevated requires deviation, not just time.
 */

export interface SystemStateModel {
  key: string;
  displayName: string;
  state: 'stable' | 'planning_window' | 'elevated' | 'data_gap';
  confidence: number;
  monthsRemaining?: number;
  
  // Critical Fix #2: Required for Elevated state
  deviation_detected: boolean;
  anomaly_flags?: string[];  // e.g., ['unusual_runtime', 'efficiency_drop']
  
  lastStateChange?: Date;
}

// Thresholds
export const PLANNING_MONTHS = 36;    // <3 years
export const ELEVATED_MONTHS = 12;    // <1 year AND deviation
export const DATA_GAP_CONFIDENCE = 0.4;

/**
 * Derive system state from prediction data
 * Critical Fix #2: Elevated requires deviation, not just time
 */
export function deriveSystemState(prediction: SystemPrediction): SystemStateModel {
  const months = prediction.lifespan?.years_remaining_p50 
    ? prediction.lifespan.years_remaining_p50 * 12 
    : undefined;
  const confidence = prediction.lifespan?.confidence_0_1 ?? 0.5;
  
  // Extract deviation signals from prediction
  const deviation_detected = prediction.deviation_detected ?? false;
  const anomaly_flags = prediction.anomaly_flags ?? [];
  
  // Data Gap: Confidence too low
  if (confidence < DATA_GAP_CONFIDENCE) {
    return { 
      state: 'data_gap', 
      deviation_detected: false,
      anomaly_flags: [],
      ...
    };
  }
  
  // Elevated: Deviation detected OR (time < threshold AND anomaly present)
  // Critical Fix #2: NOT just time
  if (deviation_detected || 
      (months && months < ELEVATED_MONTHS && anomaly_flags.length > 0)) {
    return { 
      state: 'elevated', 
      deviation_detected: true,
      anomaly_flags,
      ...
    };
  }
  
  // Planning Window: Time-based only (no deviation)
  if (months && months < PLANNING_MONTHS) {
    return { state: 'planning_window', deviation_detected: false, ... };
  }
  
  // Stable: Default
  return { state: 'stable', deviation_detected: false, ... };
}
```

**File:** `src/types/systemPrediction.ts` (Modify)

Add deviation fields to SystemPrediction:

```typescript
export interface SystemPrediction {
  // ... existing fields
  
  /**
   * Critical Fix #2: Deviation detection for Elevated state
   * True only when actual deviation observed, not just aging
   */
  deviation_detected?: boolean;
  
  /**
   * Specific anomaly flags that triggered deviation
   * e.g., ['unusual_runtime', 'efficiency_drop', 'unexpected_noise']
   */
  anomaly_flags?: string[];
}
```

---

## Part 3: Confidence Rules (Critical #3)

### Problem

Confidence is referenced everywhere but never defined what changes it. This breaks determinism.

### Solution

Create explicit, auditable confidence rules.

**File:** `src/lib/confidenceRules.ts` (NEW)

```typescript
/**
 * Confidence Rules - Explicit, Deterministic
 * 
 * DOCTRINE: Confidence may only change through these explicit paths.
 * No background magic. No implicit derivation.
 * 
 * Critical Fix #3: Define exactly what changes confidence.
 */

export type ConfidenceChangeReason = 
  | 'user_provided_data'
  | 'system_state_confirmed'
  | 'time_decay'
  | 'external_data_corroboration'
  | 'contradictory_signal';

export interface ConfidenceChange {
  reason: ConfidenceChangeReason;
  direction: 'increase' | 'decrease' | 'unchanged';
  delta: number;
  timestamp: string;
}

/**
 * CONFIDENCE INCREASE RULES (Explicit)
 * 
 * Confidence increases only when:
 * 1. User confirms system details (photo, manual entry)
 * 2. System state remains stable over time (confirmation via no-change)
 * 3. External data corroborates prediction (permit matches estimate)
 */
export const CONFIDENCE_INCREASE_TRIGGERS: Record<string, number> = {
  'user_photo_analysis': 0.15,
  'user_manual_confirmation': 0.20,
  'permit_verification': 0.25,
  'quarterly_stable_confirmation': 0.01,
  'external_data_match': 0.10,
};

/**
 * CONFIDENCE DECREASE RULES (Explicit)
 * 
 * Confidence decays when:
 * 1. Data gaps persist beyond threshold
 * 2. Contradictory signals appear (photo ≠ permit)
 * 3. Time passes without confirmation (slow decay)
 */
export const CONFIDENCE_DECREASE_TRIGGERS: Record<string, number> = {
  'data_gap_persists_30d': -0.05,
  'contradictory_signal': -0.10,
  'no_confirmation_90d': -0.02,
};

/**
 * Apply confidence change with explicit logging
 */
export function applyConfidenceChange(
  currentConfidence: number,
  reason: ConfidenceChangeReason,
  delta: number
): { newConfidence: number; change: ConfidenceChange } {
  const newConfidence = Math.max(0, Math.min(1, currentConfidence + delta));
  
  return {
    newConfidence,
    change: {
      reason,
      direction: delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'unchanged',
      delta,
      timestamp: new Date().toISOString(),
    },
  };
}
```

---

## Part 4: Interpretive Mode Timeout (Subtle Risk #1)

### Problem

"Exit: After explanation completes" is ambiguous. Risk of "lecture mode."

### Solution

Hard limit: Interpretive mode handles exactly ONE explanation, then auto-returns.

**File:** `src/lib/chatGovernance.ts`

```typescript
/**
 * Message Frequency Rules (Hard Limits)
 */
export const GOVERNANCE_RULES = {
  /** Max auto-initiations per session */
  maxAutoInitiationsPerSession: 1,
  
  /** Max consecutive agent messages without user input */
  maxConsecutiveAgentMessages: 3,
  
  /** Cooldown between same trigger type */
  cooldownBetweenSameTrigger: 24 * 60 * 60 * 1000, // 24 hours
  
  /** Subtle Risk #1 Fix: Max interpretive messages before auto-return */
  maxInterpretiveMessages: 1,
};

/**
 * Chat Governance State
 */
export interface ChatGovernanceState {
  autoInitiationsThisSession: number;
  consecutiveAgentMessages: number;
  interpretiveMessagesCount: number;
  previousMode: ChatMode | null;
}

/**
 * Check if interpretive mode should auto-return
 * Subtle Risk #1 Fix: Hard timeout after 1 explanation
 */
export function shouldExitInterpretive(state: ChatGovernanceState): boolean {
  return state.interpretiveMessagesCount >= GOVERNANCE_RULES.maxInterpretiveMessages;
}
```

**File:** `src/hooks/useChatGovernance.ts` (NEW)

```typescript
/**
 * Chat Governance Hook
 * Tracks message limits and mode transitions
 */
export function useChatGovernance(chatMode: ChatMode) {
  const [state, setState] = useState<ChatGovernanceState>({
    autoInitiationsThisSession: 0,
    consecutiveAgentMessages: 0,
    interpretiveMessagesCount: 0,
    previousMode: null,
  });
  
  // Track mode changes
  useEffect(() => {
    if (chatMode === 'interpretive') {
      // Store previous mode for return
      setState(prev => ({ 
        ...prev, 
        previousMode: prev.previousMode ?? chatMode,
        interpretiveMessagesCount: 0,
      }));
    }
  }, [chatMode]);
  
  // Check if should exit interpretive
  const shouldExitInterpretive = state.interpretiveMessagesCount >= 1;
  const returnMode = state.previousMode ?? 'silent_steward';
  
  return { state, shouldExitInterpretive, returnMode };
}
```

---

## Part 5: Planning Window Acknowledgment (Subtle Risk #2)

### Problem

"Once per entry into window" but no persistence. Users who log in frequently hear the same message.

### Solution

Persist acknowledgment timestamp per system.

**File:** `src/lib/chatGovernance.ts`

```typescript
/**
 * Planning Window Acknowledgment Persistence
 * Subtle Risk #2 Fix: Remember when planning window was acknowledged
 */

export interface PlanningWindowAcknowledgment {
  systemKey: string;
  acknowledgedAt: string;  // ISO timestamp
  windowEnteredAt: string; // ISO timestamp
}

const PLANNING_ACK_KEY = 'habitta_planning_ack';

export function getPlanningAcknowledgments(): PlanningWindowAcknowledgment[] {
  try {
    const stored = localStorage.getItem(PLANNING_ACK_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function acknowledgePlanningWindow(systemKey: string): void {
  try {
    const acks = getPlanningAcknowledgments();
    const existing = acks.findIndex(a => a.systemKey === systemKey);
    
    const newAck: PlanningWindowAcknowledgment = {
      systemKey,
      acknowledgedAt: new Date().toISOString(),
      windowEnteredAt: new Date().toISOString(),
    };
    
    if (existing >= 0) {
      acks[existing] = newAck;
    } else {
      acks.push(newAck);
    }
    
    localStorage.setItem(PLANNING_ACK_KEY, JSON.stringify(acks));
  } catch {
    // Silent failure
  }
}

export function wasPlanningWindowAcknowledged(systemKey: string): boolean {
  const acks = getPlanningAcknowledgments();
  return acks.some(a => a.systemKey === systemKey);
}
```

---

## Part 6: Baseline Surface with "Why?" Affordance (Subtle Risk #3)

### Problem

Tooltips removed (correct), but users need explanation path.

### Solution

Per-system "Why?" affordance that triggers Interpretive mode.

**File:** `src/components/dashboard-v3/BaselineSurface.tsx` (NEW)

```typescript
/**
 * Baseline Surface - Evidence Layer
 * 
 * Always visible, non-interactive except for "Why?" triggers.
 * Visual rules:
 * - No tooltips (chat explains)
 * - No green (green = "done", homes never are)
 * - No motion except on state change
 */

interface BaselineSurfaceProps {
  lifecyclePosition: 'Early' | 'Mid-Life' | 'Late';
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  systems: SystemStateModel[];
  onWhyClick: (systemKey: string) => void;  // Triggers Interpretive mode
}

export function BaselineSurface({
  lifecyclePosition,
  confidenceLevel,
  systems,
  onWhyClick,
}: BaselineSurfaceProps) {
  return (
    <div className="space-y-4">
      {/* Home Baseline Summary */}
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Lifecycle: {lifecyclePosition}</span>
        <span>Confidence: {confidenceLevel}</span>
      </div>
      
      {/* Systems Timeline */}
      <div className="space-y-2">
        {systems.map(system => (
          <div key={system.key} className="flex items-center gap-3">
            {/* System label */}
            <span className="w-24 text-sm truncate">{system.displayName}</span>
            
            {/* Timeline bar */}
            <div className="flex-1 h-2 bg-muted rounded-full relative">
              <div 
                className={cn(
                  "absolute top-0 left-0 h-full rounded-full",
                  getStateColor(system.state)
                )}
                style={{ width: `${getTimelinePosition(system)}%` }}
              />
              {/* Position marker */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-foreground"
                style={{ left: `${getTimelinePosition(system)}%` }}
              />
            </div>
            
            {/* State label + Why? */}
            <span className={cn(
              "text-xs w-28 flex items-center gap-1",
              getStateTextColor(system.state)
            )}>
              {getStateLabel(system.state)}
              {/* Subtle Risk #3 Fix: "Why?" affordance */}
              <button 
                onClick={() => onWhyClick(system.key)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Why?
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Color mapping (no green)
function getStateColor(state: SystemState): string {
  switch (state) {
    case 'stable': return 'bg-muted-foreground/20';
    case 'planning_window': return 'bg-amber-500/30';
    case 'elevated': return 'bg-red-500/30';
    case 'data_gap': return 'bg-muted/50';
  }
}
```

---

## Part 7: Elevated Mode Behavior Constraint

### Key Doctrine

Elevated Attention may override Baseline only to **confirm facts**, not recommend action.

**File:** `src/lib/chatModeCopy.ts` (Modify)

```typescript
/**
 * Elevated Mode Behavior - Constrained by Confidence
 * 
 * If baseline incomplete:
 *   - Elevated mode ASKS questions
 *   - Does NOT give recommendations
 *   - Tone: "I'm seeing something unusual, can you confirm X?"
 * 
 * If baseline complete:
 *   - Elevated mode is DIRECTIVE
 *   - Clear next steps allowed
 *   - Tone: "This is outside normal range. I recommend X."
 */

export interface ElevatedModeBehavior {
  canRecommend: boolean;
  canGiveTimelines: boolean;
  canMentionCosts: boolean;
  toneDirective: 'questioning' | 'advisory';
}

export function getElevatedBehavior(
  isBaselineComplete: boolean
): ElevatedModeBehavior {
  if (!isBaselineComplete) {
    // Baseline incomplete: Elevated asks questions only
    return {
      canRecommend: false,
      canGiveTimelines: false,
      canMentionCosts: false,
      toneDirective: 'questioning',
    };
  }
  
  // Baseline complete: Elevated is directive
  return {
    canRecommend: true,
    canGiveTimelines: true,
    canMentionCosts: true,
    toneDirective: 'advisory',
  };
}
```

---

## Part 8: Updated File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/types/chatMode.ts` | **Modify** | 5-mode system with correct types |
| `src/types/systemState.ts` | **Create** | Explicit system state model with deviation_detected |
| `src/types/systemPrediction.ts` | **Modify** | Add deviation_detected and anomaly_flags |
| `src/lib/chatModeSelector.ts` | **Modify** | Corrected priority order |
| `src/lib/confidenceRules.ts` | **Create** | Explicit confidence change rules |
| `src/lib/chatGovernance.ts` | **Modify** | Add interpretive timeout + planning acknowledgment |
| `src/lib/chatModeCopy.ts` | **Modify** | Add elevated behavior constraints |
| `src/hooks/useChatGovernance.ts` | **Create** | Governance state hook |
| `src/hooks/useChatMode.ts` | **Modify** | Support 5-mode system |
| `src/components/dashboard-v3/BaselineSurface.tsx` | **Create** | Evidence layer with "Why?" affordance |
| `src/components/dashboard-v3/ChatDock.tsx` | **Modify** | Visual redesign + mode behaviors |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Modify** | New layout with BaselineSurface |

---

## Implementation Order

1. **Phase 1: Type System** - Update chatMode types, create systemState types with deviation_detected
2. **Phase 2: Confidence Rules** - Create explicit confidence change rules
3. **Phase 3: Mode Logic** - Implement corrected priority order with baseline gate
4. **Phase 4: Governance** - Add interpretive timeout + planning acknowledgment
5. **Phase 5: Baseline Surface** - Create evidence layer with "Why?" affordance
6. **Phase 6: ChatDock** - Update visual design + mode behaviors
7. **Phase 7: Integration** - Wire everything through MiddleColumn

---

## QA Verification Checklist

**Critical Fixes:**
- [ ] Baseline Establishment outranks Planning Window in priority
- [ ] Elevated state requires `deviation_detected === true`, not just time
- [ ] Elevated mode asks questions (not recommends) when baseline incomplete
- [ ] Confidence changes only through explicit rules (documented)

**Subtle Risk Fixes:**
- [ ] Interpretive mode exits after 1 explanation
- [ ] Planning window acknowledgment persisted per system
- [ ] "Why?" affordance triggers Interpretive mode

**Preserved Wins:**
- [ ] Evidence before interpretation (baseline always visible)
- [ ] Silence is authority (Silent Steward default)
- [ ] No fear language
- [ ] No aggressive CTAs
- [ ] Max 1 auto-initiation per session
- [ ] Max 3 consecutive agent messages

