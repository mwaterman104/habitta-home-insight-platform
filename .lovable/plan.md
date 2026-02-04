

# Habitta Mobile Home Pulse & System Plan
## Refined Implementation Specification

---

## Executive Summary

This plan transforms the mobile experience from a "passive viewer" into an "authoritative steward" by implementing:

1. **Priority Score Infrastructure** using `failureProbability12mo` (not remaining years)
2. **Home Status Summary** with Now/Next/Later structure
3. **Primary Focus Card** with insight + View Plan CTA
4. **Secondary Systems Stack** with "aging" guardrail
5. **Contextual Chat Launcher** with system-anchored opening
6. **System "View Plan" Screen** - single vertical narrative
7. **Named Cost Premiums** for consistency across layers

---

## Phase 1: Priority Score Infrastructure

### 1.1 Create Priority Scoring Service

**New File:** `src/services/priorityScoring.ts`

Implements the frozen formula:

```text
PriorityScore = FailureProbability12mo × ReplacementCostMidpoint × UrgencyMultiplier
```

**Interface (refined per feedback):**

```typescript
import { SystemType } from '@/types/system';

type Season = 'spring' | 'summer' | 'fall' | 'winter';
type ClimateRisk = 'hurricane_zone' | 'freeze_zone' | 'temperate';

interface PriorityScoreInputs {
  systemKey: SystemType;
  failureProbability12mo: number;  // Pre-computed, NOT remainingYears
  replacementCostMid: number;
  season: Season;
  climateRisk?: ClimateRisk;
}

interface PriorityScoreResult {
  score: number;
  isPrimary: boolean;
  urgencyMultiplier: number;
  explanation: string;  // Plain-language justification
}
```

**Urgency Multipliers (frozen):**

```typescript
const URGENCY_MULTIPLIERS: Record<SystemType, Partial<Record<Season | 'weather', number>>> = {
  hvac: { summer: 1.25, winter: 1.25 },  // +0.25 seasonal
  roof: { weather: 1.35 },               // +0.35 weather risk
  water_heater: {},
  // ... others default to 1.0
};
```

**Tie-Breaking Order (per feedback):**

```typescript
// Complete tie-breaking chain:
// 1. Higher replacement cost
// 2. Higher failureProbability12mo
// 3. Deterministic fallback (systemKey alphabetical sort)
```

### 1.2 Failure Probability Computation

**New File:** `src/services/failureProbability.ts`

Separates the transformation from remaining years to probability:

```typescript
/**
 * Convert remaining years to 12-month failure probability
 * Uses simple exponential decay model calibrated to system type
 */
export function computeFailureProbability12mo(
  remainingYears: number,
  systemType: SystemType
): number {
  // Base model: probability increases as remaining years decrease
  // At 0 remaining years: ~0.8 probability
  // At 5 remaining years: ~0.15 probability
  // At 10+ remaining years: ~0.05 probability
  
  if (remainingYears <= 0) return 0.8;
  if (remainingYears >= 10) return 0.05;
  
  // Exponential decay: P = 0.8 * e^(-0.3 * years)
  return Math.min(0.8, 0.8 * Math.exp(-0.3 * remainingYears));
}
```

### 1.3 Integrate with MobileDashboardView

**File:** `src/components/dashboard-v3/mobile/MobileDashboardView.tsx`

Replace current sorting logic with Priority Score:

```typescript
const selectPrimarySystem = (): { 
  system: SystemTimelineEntry | null;
  explanation: string;
} => {
  if (!systems || systems.length === 0) return { system: null, explanation: '' };
  
  const scored = systems.map(sys => {
    const remainingYears = getRemainingYears(sys);
    const failureProbability12mo = computeFailureProbability12mo(
      remainingYears,
      sys.systemId
    );
    
    return {
      system: sys,
      ...calculatePriorityScore({
        systemKey: sys.systemId,
        failureProbability12mo,
        replacementCostMid: getReplacementCostMidpoint(sys.systemId),
        season: getCurrentSeason(),
      })
    };
  });
  
  // Sort by score, then by tie-breaking chain
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    
    const aCost = getReplacementCostMidpoint(a.system.systemId);
    const bCost = getReplacementCostMidpoint(b.system.systemId);
    if (bCost !== aCost) return bCost - aCost;
    
    // Deterministic fallback
    return a.system.systemId.localeCompare(b.system.systemId);
  });
  
  return {
    system: scored[0]?.system ?? null,
    explanation: scored[0]?.explanation ?? ''
  };
};
```

---

## Phase 2: Named Cost Premium Constants

### 2.1 Add Cost Premiums to systemConfigs.ts

**File:** `supabase/functions/_shared/systemConfigs.ts`

Add named constants (per feedback):

```typescript
/**
 * COST PREMIUMS - Named constants for UI, edge functions, and AI alignment
 * 
 * Planned:    Scheduled in advance with flexibility
 * Typical:    Shorter window, limited flexibility
 * Emergency:  Post-failure, high urgency
 */
export const COST_PREMIUMS = {
  planned: 1.0,
  typical: 1.2,
  // emergency uses EMERGENCY_PREMIUMS[systemType] (already exists)
} as const;

export type CostTier = 'planned' | 'typical' | 'emergency';
```

These will be imported wherever cost tiers are rendered.

---

## Phase 3: Home Status Summary (Now/Next/Later)

### 3.1 Refactor HomeStatusSummary

**File:** `src/components/dashboard-v3/mobile/HomeStatusSummary.tsx`

**New Props:**

```typescript
interface HomeStatusSummaryProps {
  systems: SystemTimelineEntry[];
  primarySystem: SystemTimelineEntry | null;
  priorityExplanation: string;
  secondarySystemsCount: number;
}
```

**Structure:**

```text
┌────────────────────────────────────────────┐
│  Home Status                               │
│                                            │
│  Now                                       │
│  Your HVAC is approaching typical          │
│  replacement age.                          │
│                                            │
│  Next                                      │
│  Plan for HVAC assessment in the           │
│  next 12 months.                           │
│                                            │
│  Later                                     │
│  2 other systems are stable.               │
└────────────────────────────────────────────┘
```

**Content Rules:**
- **Now:** Derives from primary system lifecycle position
- **Next:** Actionable recommendation anchored to primary system
- **Later:** Reassurance for remaining systems (count-based)

---

## Phase 4: Primary System Focus Card

### 4.1 Rename and Enhance PrimarySystemCard

**File:** `src/components/dashboard-v3/mobile/PrimarySystemFocusCard.tsx`

**New Props:**

```typescript
interface PrimarySystemFocusCardProps {
  system: SystemTimelineEntry;
  priorityExplanation: string;
  onViewPlan: () => void;  // Navigates to /systems/:systemKey/plan
}
```

**Visual Structure:**

```text
┌────────────────────────────────────────────┐
│  HVAC                          Plan ●      │
│  Installed 2012 · Permit verified          │
│                                            │
│  At 12 years, this system is in its        │
│  typical replacement window.               │
│                                            │
│  [View Plan]                               │
└────────────────────────────────────────────┘
```

**Required Fields:**
- System name
- Planning status badge (Stable/Watch/Plan)
- Install year + source label (Permit verified / Owner reported / Estimated)
- One explanatory insight (from `priorityExplanation`)
- Single CTA: "View Plan" → `/systems/:systemKey/plan`

---

## Phase 5: Secondary Systems Stack

### 5.1 Enhance SecondarySystemsList

**File:** `src/components/dashboard-v3/mobile/SecondarySystemsList.tsx`

**Content Rules (refined per feedback):**

| Status | Lifecycle Position | Copy |
|--------|-------------------|------|
| Stable | < 100% lifespan | "No action recommended" |
| Watch | 60-80% lifespan | "Monitoring, no action needed yet" |
| Plan | 80%+ lifespan | "Review recommended when ready" |
| **Aging** | > 100% lifespan | "Aging — monitoring" |

**Critical Guardrail:**

```typescript
// A system older than expected lifespan may NOT be labeled "Stable"
const getStatusLabel = (system: SystemTimelineEntry): string => {
  const currentYear = new Date().getFullYear();
  const age = system.installYear ? currentYear - system.installYear : null;
  const expectedLifespan = getSystemConfig(system.systemId).baselineLifespan;
  
  // Guardrail: Past lifespan = never "Stable"
  if (age && age >= expectedLifespan) {
    return 'Aging — monitoring';
  }
  
  // Normal status logic
  // ...
};
```

**Visual Change:** Remove ChevronRight for "Stable" systems (informational only).

---

## Phase 6: Contextual Chat Launcher

### 6.1 Rename ChatCTA

**File:** `src/components/dashboard-v3/mobile/ContextualChatLauncher.tsx`

**New Props:**

```typescript
interface ContextualChatLauncherProps {
  primarySystem: SystemTimelineEntry | null;
  priorityExplanation: string;
  onTap: () => void;
}
```

**Opening Message Template:**

```text
Based on age, risk, and cost impact, the system most worth planning for right now is [PrimarySystem].
```

**Quick Replies (frozen set):**

```typescript
const QUICK_REPLIES = [
  "Show timing tradeoffs",
  "Show cost scenarios",
  "Why this system first?",
] as const;
```

### 6.2 Update MobileChatSheet

**File:** `src/components/dashboard-v3/mobile/MobileChatSheet.tsx`

Add props for system-anchored context:

```typescript
interface MobileChatSheetProps {
  // ... existing props
  primarySystemContext?: {
    systemKey: string;
    systemLabel: string;
    priorityExplanation: string;
  };
  quickReplies?: readonly string[];
}
```

---

## Phase 7: System "View Plan" Screen

### 7.1 Create SystemPlanView Component

**New File:** `src/components/system/SystemPlanView.tsx`

Single-screen vertical narrative (no tabs):

**Section A: System Header**
- System name + status badge
- Install year + source label

**Section B: Cost Reality (Three Tiers)**

```typescript
import { COST_PREMIUMS, EMERGENCY_PREMIUMS } from '@shared/systemConfigs';

interface CostTierDisplay {
  label: 'Planned replacement' | 'Typical replacement' | 'Emergency replacement';
  multiplier: number;
  range: { low: number; high: number };
  definition: string;
}

const getCostTiers = (systemType: SystemType): CostTierDisplay[] => {
  const config = getSystemConfig(systemType);
  const base = config.replacementCostRange;
  const emergencyPremium = EMERGENCY_PREMIUMS[systemType];
  
  return [
    {
      label: 'Planned replacement',
      multiplier: COST_PREMIUMS.planned,
      range: { low: base.min, high: base.max },
      definition: 'Scheduled in advance with flexibility',
    },
    {
      label: 'Typical replacement',
      multiplier: COST_PREMIUMS.typical,
      range: { 
        low: Math.round(base.min * COST_PREMIUMS.typical), 
        high: Math.round(base.max * COST_PREMIUMS.typical) 
      },
      definition: 'Shorter window, limited flexibility',
    },
    {
      label: 'Emergency replacement',
      multiplier: 1 + emergencyPremium,
      range: { 
        low: Math.round(base.min * (1 + emergencyPremium)), 
        high: Math.round(base.max * (1 + emergencyPremium)) 
      },
      definition: 'Post-failure, high urgency',
    },
  ];
};
```

**Section C: Timing Outlook**

Three visual states:
- Best window (green indicator)
- Caution window (amber indicator)
- High risk (red indicator)

Includes seasonal awareness for HVAC.

**Section D: Confidence & Evidence**

- Install source badge (Permit verified / Owner reported / Estimated)
- Confidence level (High / Moderate / Low)
- Single improvement suggestion if not High

**Section E: Action Footer (refined per feedback)**

- **Primary CTA:** "Start planning" (not "Start planning conversation")
- **Secondary CTA:** "Add maintenance record"
- No "Not now" option

### 7.2 Create SystemPlanPage Route

**New File:** `src/pages/SystemPlanPage.tsx`

```typescript
export default function SystemPlanPage() {
  const { systemKey } = useParams<{ systemKey: string }>();
  // Fetch system data from capitalTimeline
  // Render SystemPlanView
}
```

### 7.3 Add Route

**File:** `src/pages/AppRoutes.tsx`

```typescript
<Route path="/systems/:systemKey/plan" element={
  <ProtectedRoute>
    <SystemPlanPage />
  </ProtectedRoute>
} />
```

---

## Phase 8: Copy & Tone Governance

### 8.1 Create Mobile Copy Constants

**New File:** `src/lib/mobileCopy.ts`

```typescript
// BANNED PHRASES (per spec Section 6)
export const BANNED_PHRASES = [
  "Everything is normal",
  "Let me know if",
  "What should I do?",
] as const;

// STATUS COPY PATTERNS
export const STATUS_COPY = {
  now: {
    elevated: (name: string) => `Your ${name} may need attention soon.`,
    planning_window: (name: string) => `Your ${name} is approaching typical replacement age.`,
    stable: () => "Your home is operating normally.",
    aging: (name: string) => `Your ${name} is past its expected lifespan.`,
  },
  next: {
    elevated: (name: string) => `Schedule an assessment for your ${name}.`,
    planning_window: (name: string) => `Plan for ${name} review in the next 12 months.`,
    stable: () => "No immediate action required.",
    aging: (name: string) => `Consider a ${name} evaluation soon.`,
  },
  later: (count: number) => 
    count === 1 
      ? "1 other system is stable." 
      : `${count} other systems are stable.`,
} as const;

// SECONDARY SYSTEM STATUS LABELS
export const SECONDARY_STATUS = {
  stable: "No action recommended",
  watch: "Monitoring, no action needed yet",
  plan: "Review recommended when ready",
  aging: "Aging — monitoring",
} as const;
```

---

## Phase 9: Analytics Integration

### 9.1 Create Mobile Analytics Events

**New File:** `src/lib/analytics/mobileEvents.ts`

```typescript
export const MOBILE_EVENTS = {
  // Core funnel
  PRIMARY_FOCUS_IMPRESSION: 'mobile_primary_focus_impression',
  VIEW_PLAN_OPEN: 'mobile_view_plan_open',
  COST_SECTION_SCROLL: 'mobile_cost_section_scroll',
  WHAT_IF_WAIT_CLICK: 'mobile_what_if_wait_click',
  PLAN_EXIT_NO_ACTION: 'mobile_plan_exit_no_action',
  
  // Trust validation (per feedback)
  PRIMARY_FOCUS_CHANGED_SESSION: 'mobile_primary_focus_changed_same_session',
} as const;
```

**Trigger for `PRIMARY_FOCUS_CHANGED_SESSION`:**

```typescript
// Triggered if:
// - User returns within the same session (sessionStorage check)
// - Primary system changed due to data refresh
// This indicates potential confusion if happening frequently
```

---

## Phase 10: Developer Guardrails

### 10.1 Add Guardrails Documentation

**New File:** `src/lib/mobile/GUARDRAILS.md`

```markdown
# Developer Guardrails (Read Before Coding)

1. **UI components must not compute lifecycle logic**
   - All lifecycle math lives in `failureProbability.ts` and `priorityScoring.ts`
   - Components receive pre-computed values only

2. **All system prioritization flows through `priorityScoring.ts`**
   - No ad-hoc sorting in components
   - Formula is frozen: `FailureProbability12mo × ReplacementCostMid × UrgencyMultiplier`

3. **If data is missing, fall back to `SYSTEM_CONFIGS` — never silence**
   - Never say "unknown" if config data exists
   - Default values are explicit and documented

4. **Any copy change must go through `mobileCopy.ts`**
   - No hardcoded strings in components
   - Banned phrases are enforced at review time

5. **Any contradiction between dashboard and plan is a P0 bug**
   - Same data source for both views
   - Same priority logic for both views

6. **Systems past expected lifespan may never be labeled "Stable"**
   - Use "Aging — monitoring" instead
   - Enforced in `getStatusLabel()` guardrail
```

---

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `src/services/priorityScoring.ts` | Priority Score calculation |
| `src/services/failureProbability.ts` | Failure probability computation |
| `src/components/system/SystemPlanView.tsx` | View Plan screen |
| `src/pages/SystemPlanPage.tsx` | View Plan route handler |
| `src/lib/mobileCopy.ts` | Mobile copy constants |
| `src/lib/analytics/mobileEvents.ts` | Analytics events |
| `src/lib/mobile/GUARDRAILS.md` | Developer guardrails |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/_shared/systemConfigs.ts` | Add `COST_PREMIUMS` constant |
| `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` | Priority Score integration |
| `src/components/dashboard-v3/mobile/HomeStatusSummary.tsx` | Now/Next/Later structure |
| `src/components/dashboard-v3/mobile/PrimarySystemCard.tsx` → `PrimarySystemFocusCard.tsx` | Enhanced card with View Plan CTA |
| `src/components/dashboard-v3/mobile/SecondarySystemsList.tsx` | Aging guardrail + copy patterns |
| `src/components/dashboard-v3/mobile/ChatCTA.tsx` → `ContextualChatLauncher.tsx` | System-anchored context |
| `src/components/dashboard-v3/mobile/MobileChatSheet.tsx` | Quick replies support |
| `src/components/dashboard-v3/mobile/index.ts` | Export updates |
| `src/pages/AppRoutes.tsx` | New `/systems/:systemKey/plan` route |

---

## Implementation Order

| Phase | Priority | Files | Effort |
|-------|----------|-------|--------|
| 1 | P0 | `priorityScoring.ts`, `failureProbability.ts`, `MobileDashboardView.tsx` | Medium |
| 2 | P0 | `systemConfigs.ts` (COST_PREMIUMS) | Low |
| 3 | P0 | `HomeStatusSummary.tsx` | Medium |
| 4 | P0 | `PrimarySystemFocusCard.tsx` | Medium |
| 5 | P1 | `SecondarySystemsList.tsx` | Low |
| 6 | P1 | `ContextualChatLauncher.tsx`, `MobileChatSheet.tsx` | Medium |
| 7 | P0 | `SystemPlanView.tsx`, `SystemPlanPage.tsx`, route | High |
| 8 | P1 | `mobileCopy.ts` | Low |
| 9 | P2 | `mobileEvents.ts` | Low |
| 10 | P1 | `GUARDRAILS.md` | Low |

---

## Failure-Safe Rules (P0 Trust Bugs)

1. UI cannot say "unknown" if `SYSTEM_CONFIGS` has data for that system
2. UI cannot contradict lifecycle status from `capitalTimeline`
3. Chat opening message must reference the same primary system as dashboard
4. No regional claims without actual climate/location data
5. **Systems past expected lifespan may never be labeled "Stable"**
6. **Tie-breaking must be deterministic (no UI flicker)**
7. **Cost premiums must use named constants, not magic numbers**

