

# Habitta Production-Hardened Specifications — Implementation Plan

## Executive Summary

The current codebase has a **foundational advisor state machine** and chat infrastructure, but lacks the **intervention/planning session architecture** described in the specification. This plan bridges the gap by implementing the institution-grade Planning Session system with full auditability.

---

## Current State vs. Target Architecture

| Capability | Current State | Target (Specification) |
|------------|--------------|----------------------|
| Advisor State Machine | ✅ 5 states implemented | ✅ Keep as-is |
| Chat Modes | ✅ Epistemic modes exist | ✅ Keep as-is |
| Cadence Rules | ✅ 24hr cooldown, 2 per session | ✅ Keep as-is |
| Intervention Score Formula | ❌ Not implemented | `(FailureProbability × EmergencyCost) + UrgencyPremium` |
| baseline_strength vs risk_outlook | ❌ Conflated | Two independent dimensions |
| Intervention Threshold | ❌ Global | Per-home (homes.intervention_threshold) |
| Planning Sessions | ❌ Not implemented | Full persistence with session state |
| Decision Events | ❌ Not tracked | decision_events table with types |
| Session Persistence | ❌ Messages regenerated | Messages stored per intervention |
| Urgency Premium | ❌ Not implemented | Derived from risk_contexts |
| System State Reset | ❌ Not implemented | Explicit mutation on replacement |

---

## Phase 1: Database Schema (Foundation)

### 1.1 Modify `homes` Table
```sql
ALTER TABLE homes ADD COLUMN 
  intervention_threshold INTEGER DEFAULT 1000 NOT NULL;
```

### 1.2 Modify `home_systems` Table
```sql
-- Add the two independent dimensions
ALTER TABLE home_systems ADD COLUMN 
  baseline_strength INTEGER CHECK(baseline_strength >= 0 AND baseline_strength <= 100),
  risk_outlook_12mo INTEGER CHECK(risk_outlook_12mo >= 0 AND risk_outlook_12mo <= 100),
  estimated_impact_cost JSONB,  -- {proactive, emergency, potential_damage}
  intervention_score DECIMAL(10,2),
  intervention_score_calculated_at TIMESTAMP,
  last_state_change VARCHAR(50),
  last_state_change_at TIMESTAMP,
  last_decision_at TIMESTAMP,
  last_decision_type VARCHAR(50),
  installation_verified BOOLEAN DEFAULT false;
```

### 1.3 Create `interventions` Table (Planning Sessions)
```sql
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
  system_id UUID REFERENCES home_systems(id) ON DELETE CASCADE,
  
  -- Trigger information
  trigger_reason VARCHAR(50) NOT NULL CHECK(trigger_reason IN (
    'risk_threshold_crossed',
    'seasonal_risk_event',
    'financial_planning_window',
    'user_initiated',
    'new_evidence_arrived'
  )),
  
  -- Scores at time of trigger
  intervention_score DECIMAL(10,2) NOT NULL,
  intervention_threshold_used INTEGER NOT NULL,
  
  -- Evidence snapshots
  risk_outlook_snapshot INTEGER NOT NULL,
  baseline_strength_snapshot INTEGER NOT NULL,
  comparable_homes_count INTEGER,
  data_sources JSONB,
  
  -- Urgency premium calculation
  urgency_premium_snapshot INTEGER DEFAULT 0,
  urgency_factors_snapshot JSONB,
  
  -- Session state
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_viewed_at TIMESTAMP,
  closed_at TIMESTAMP,
  closed_reason VARCHAR(50) CHECK(closed_reason IN (
    'decision_made',
    'user_deferred',
    'closed_without_decision',
    'timed_out'
  )),
  
  -- Rate limiting
  cooldown_until TIMESTAMP,
  
  -- Persisted conversation (CRITICAL: not regenerated)
  messages JSONB NOT NULL DEFAULT '[]',
  message_order TEXT[] NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interventions_active ON interventions(home_id) 
  WHERE closed_at IS NULL;
CREATE INDEX idx_interventions_cooldown ON interventions(system_id, cooldown_until);
CREATE INDEX idx_interventions_stale ON interventions(last_viewed_at) 
  WHERE closed_at IS NULL;
```

### 1.4 Create `decision_events` Table
```sql
CREATE TABLE decision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
  system_id UUID REFERENCES home_systems(id) ON DELETE CASCADE,
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,
  
  -- Decision made
  decision_type VARCHAR(50) NOT NULL CHECK(decision_type IN (
    'replace_now',
    'defer_with_date',
    'schedule_inspection',
    'schedule_maintenance',
    'no_action',
    'get_quotes'
  )),
  
  -- Timeline
  defer_until TIMESTAMP,
  next_review_at TIMESTAMP,
  
  -- Financial snapshot (all assumptions at decision time)
  assumptions_json JSONB NOT NULL,
  
  -- Additional context
  user_notes TEXT,
  contractor_selected_id UUID,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_decision_events_system ON decision_events(system_id);
CREATE INDEX idx_decision_events_review ON decision_events(next_review_at)
  WHERE next_review_at IS NOT NULL;
```

### 1.5 Create `risk_contexts` Table
```sql
CREATE TABLE risk_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Location
  state TEXT NOT NULL,
  climate_zone TEXT NOT NULL,
  
  -- Active conditions
  hurricane_season BOOLEAN DEFAULT false,
  freeze_warning BOOLEAN DEFAULT false,
  heat_wave BOOLEAN DEFAULT false,
  
  -- Contractor market
  peak_season_hvac BOOLEAN DEFAULT false,
  peak_season_roofing BOOLEAN DEFAULT false,
  
  -- Temporal
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_risk_contexts_location ON risk_contexts(state, climate_zone);
```

---

## Phase 2: Core Type Definitions

### 2.1 New Types (`src/types/intervention.ts`)

```typescript
/**
 * INTERVENTION BEHAVIORAL CONTRACT
 * 
 * InterventionScore = (FailureProbability × EmergencyCost) + UrgencyPremium
 * 
 * Rules:
 * ❌ NO engagement multipliers
 * ❌ NO "user anxiety" signals
 * ❌ NO normalization away from dollars
 * ✅ Dollar-denominated logic only
 * ✅ Must remain explainable and auditable
 */

export type TriggerReason = 
  | 'risk_threshold_crossed'
  | 'seasonal_risk_event'
  | 'financial_planning_window'
  | 'user_initiated'
  | 'new_evidence_arrived';

export type DecisionType = 
  | 'replace_now'
  | 'defer_with_date'
  | 'schedule_inspection'
  | 'schedule_maintenance'
  | 'no_action'
  | 'get_quotes';

export type ClosedReason = 
  | 'decision_made'
  | 'user_deferred'
  | 'closed_without_decision'
  | 'timed_out';

export interface InterventionMessage {
  id: string;
  role: 'system' | 'assistant' | 'user';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Intervention {
  id: string;
  homeId: string;
  systemId: string;
  triggerReason: TriggerReason;
  interventionScore: number;
  interventionThresholdUsed: number;
  riskOutlookSnapshot: number;
  baselineStrengthSnapshot: number;
  urgencyPremiumSnapshot: number;
  urgencyFactorsSnapshot: Record<string, boolean>;
  openedAt: string;
  lastViewedAt?: string;
  closedAt?: string;
  closedReason?: ClosedReason;
  cooldownUntil?: string;
  messages: InterventionMessage[];
  messageOrder: string[];
}

export interface DecisionEvent {
  id: string;
  homeId: string;
  systemId: string;
  interventionId?: string;
  decisionType: DecisionType;
  deferUntil?: string;
  nextReviewAt?: string;
  assumptionsJson: Record<string, any>;
  userNotes?: string;
  createdAt: string;
}
```

### 2.2 Risk Context Types (`src/types/riskContext.ts`)

```typescript
export interface RiskContext {
  hurricaneSeason: boolean;
  freezeWarning: boolean;
  heatWave: boolean;
  currentDate: Date;
  location: {
    state: string;
    climateZone: string;
  };
  peakSeasonHvac: boolean;
  peakSeasonRoofing: boolean;
}
```

---

## Phase 3: Intervention Score Calculator

### 3.1 Service (`src/services/interventionScoring.ts`)

```typescript
/**
 * FROZEN FORMULA (Do Not Modify)
 * 
 * InterventionScore = (FailureProbability × EmergencyCost) + UrgencyPremium
 */

export interface InterventionScoreInputs {
  failureProbability12mo: number;  // 0.0 - 1.0
  proactiveCost: number;           // Dollars
  emergencyCost: number;           // Dollars
  potentialDamage: number;         // Dollars
  urgencyPremium: number;          // Calculated from context
}

export function calculateInterventionScore(inputs: InterventionScoreInputs): number {
  const { failureProbability12mo, emergencyCost, urgencyPremium } = inputs;
  
  // FROZEN: InterventionScore = (FailureProbability × EmergencyCost) + UrgencyPremium
  return (failureProbability12mo * emergencyCost) + urgencyPremium;
}

export function calculateUrgencyPremium(
  systemType: string,
  context: RiskContext
): number {
  let premium = 0;

  // Hurricane season risk
  if (context.hurricaneSeason && systemType === 'roof') {
    premium += 2000;
  }

  // Freeze warning risk
  if (context.freezeWarning && 
      (systemType === 'water_heater' || systemType === 'hvac')) {
    premium += 1500;
  }

  // Heat wave risk
  if (context.heatWave && systemType === 'hvac') {
    premium += 1200;
  }

  // Peak season contractor availability
  if (isContractorPeakSeason(context, systemType)) {
    premium += 500;
  }

  return premium;
}
```

---

## Phase 4: Hooks and State Management

### 4.1 Planning Session Hook (`src/hooks/usePlanningSession.ts`)

```typescript
/**
 * SESSION PERSISTENCE CONTRACT
 * 
 * User must be able to leave Planning Session, return later, 
 * and see the same briefing intact.
 * 
 * Messages are persisted per intervention, not regenerated.
 */

export function usePlanningSession(interventionId?: string) {
  // Load persisted messages from interventions table
  // Return exact same messages in same order
  // Handle session pause/resume
  // Implement 24hr timeout logic
}
```

### 4.2 Intervention Eligibility Hook (`src/hooks/useInterventionEligibility.ts`)

```typescript
export async function isEligibleForIntervention(
  system: HomeSystem,
  score: number,
  home: Home
): Promise<boolean> {
  // Use home-specific threshold, not global constant
  if (score < home.interventionThreshold) return false;
  
  // Check cooldown period
  const hasActiveCooldown = await checkCooldown(system.id);
  if (hasActiveCooldown) return false;
  
  // Check for active intervention
  const hasActiveIntervention = await checkActiveIntervention(system.id);
  if (hasActiveIntervention) return false;
  
  return true;
}
```

---

## Phase 5: System State Reset Logic

### 5.1 Replacement Handler (`src/services/systemStateReset.ts`)

```typescript
/**
 * SYSTEM STATE RESET AFTER REPLACEMENT
 * 
 * Old risk data must not bleed forward after replacement.
 */

export async function handleReplacementDecision(
  systemId: string,
  decisionEvent: DecisionEvent
): Promise<void> {
  // 1. Record the decision
  await createDecisionEvent(decisionEvent);

  // 2. Reset system state
  await updateSystem(systemId, {
    risk_outlook_12mo: 5,           // New systems have minimal risk
    baseline_strength: 20,          // Only know it was replaced
    age: 0,
    installation_date: new Date(),
    installation_verified: false,
    data_sources: ['user_decision'],
    intervention_score: null,
    last_state_change: 'replaced',
    last_state_change_at: new Date()
  });

  // 3. Request verification evidence
  await createTask({
    type: 'request_evidence',
    systemId,
    message: 'Upload receipt or permit to verify installation details',
    priority: 'medium'
  });
}
```

---

## Phase 6: UI Updates

### 6.1 Planning Session Opening Line

**Current:**
> "Good morning! I've been monitoring your home systems..."

**Updated (per specification):**
> "I've completed a review of your water heater and need to brief you."

### 6.2 Quiet Dashboard Badge

**Do NOT say:**
- "Attention needed"
- "Action required"
- "Alert"

**DO say:**
- "Review available"
- "Briefing ready"
- "Planning session prepared"

### 6.3 Session Copy Templates (`src/lib/sessionCopy.ts`)

```typescript
const sessionOpenings = {
  risk_threshold_crossed: (systemName: string) => 
    `I've completed a review of your ${systemName} and need to brief you.`,
  
  seasonal_risk_event: (eventName: string, systemName: string) => 
    `Given the ${eventName}, I need to discuss your ${systemName} with you.`,
  
  financial_planning_window: (systemName: string) => 
    `It's time to plan for your ${systemName} replacement.`,
  
  user_initiated: (systemName: string) => 
    `Let's review your ${systemName} together.`
};
```

---

## Phase 7: Edge Function Updates

### 7.1 Modify `ai-home-assistant` Prompt

Add to system prompt:
```
PLANNING SESSION BEHAVIORAL CONTRACT:

1. Opening lines use briefing language:
   - "I've completed a review of your [system] and need to brief you."
   - NOT "Good morning! I've been monitoring..."

2. Session persistence:
   - Messages are stored, not regenerated
   - User can leave and return to same briefing

3. Decision tracking:
   - Explicitly record user decisions
   - Distinguish "closed without decision" from "chose no action"

4. Defer path:
   - Present deferral as a valid, respected choice
   - Set explicit next_review_at when deferred
```

---

## Implementation Sequence

| Order | Phase | Effort | Dependency |
|-------|-------|--------|------------|
| 1 | Database Schema (Phase 1) | Medium | None |
| 2 | Type Definitions (Phase 2) | Low | Phase 1 |
| 3 | Intervention Scoring (Phase 3) | Medium | Phase 2 |
| 4 | Hooks (Phase 4) | Medium | Phase 3 |
| 5 | System State Reset (Phase 5) | Medium | Phase 4 |
| 6 | UI Updates (Phase 6) | Low | Phase 5 |
| 7 | Edge Function (Phase 7) | Low | Phase 6 |

---

## Success Metrics (From Specification)

**Measure:**
- Average interventions per home per year (target: 2-4)
- Decision completion rate (target: >80%)
- Defer path usage (healthy if 20-30%)
- Time between intervention and decision (days OK)

**Do NOT optimize for:**
- Daily active users
- Session length
- Message volume
- "Engagement"

---

## Verification Checklist

- [x] Intervention threshold stored per home
- [x] Urgency premium derived, not stored
- [x] Closed vs no-action semantics enforced
- [x] System state resets after replacement
- [ ] Session persistence tested (leave/return)
- [ ] 24hr timeout job configured
- [ ] Rate limiting prevents spam
- [ ] All formulas tested with edge cases
- [ ] Transaction rollback prevents lying
- [ ] Defer path respects user choice
- [ ] Quiet dashboard shows "Review available" not "Alert"
- [ ] Opening line says "briefing" not "monitoring"

---

## Semantic Lock Statement

```typescript
/**
 * INSTITUTIONAL BEHAVIOR CONTRACT
 * 
 * ✅ Behaves deterministically
 * ✅ Speaks rarely
 * ✅ Shows its math
 * ✅ Records its decisions
 * ✅ Respects deferral
 * ✅ Treats silence as value
 * ✅ Never lies about saves
 * ✅ Derives premiums transparently
 * ✅ Separates data confidence from risk
 * ✅ Uses per-home thresholds
 * ✅ Persists sessions for later
 * ✅ Resets state after replacement
 * 
 * That is not how apps behave.
 * That is how institutions behave.
 */
```

