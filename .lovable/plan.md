

# Habitta Doctrine Compliance — Implementation Plan with QA Refinements

## Executive Summary

This plan implements the approved doctrine compliance fixes with all 4 QA refinements integrated:
1. **"Elevated" guardrail** — Only valid when `changedSinceLastVisit === true`
2. **Layer-varied copy** — Reduce "later-stage lifecycle" repetition
3. **MonthlyPriorityCTA gating** — Suppress when stable
4. **Centralized status normalization** — Single utility for status mapping

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/statusNormalization.ts` | **Create** | Centralized status mapping utility (QA #4) |
| `src/components/HomeProfile/HomeProfileContextHeader.tsx` | **Modify** | Remove "Home Pulse", use neutral labels + "Elevated" guardrail |
| `src/components/HomeValueImpact.tsx` | **Modify** | Remove "earn" gamification |
| `src/components/AppSidebar.tsx` | **Modify** | Replace "Home Pulse" → "Home" |
| `src/components/dashboard-v3/LeftColumn.tsx` | **Modify** | Replace "Home Pulse" → "Home" |
| `src/pages/DashboardV3.tsx` | **Modify** | Replace "Home Pulse" → "Habitta" |
| `src/lib/todaysFocusCopy.ts` | **Modify** | Soften "attention threshold", vary layer copy |
| `src/lib/resolveApplianceIdentity.ts` | **Modify** | Replace "Planning window" |
| `src/components/dashboard-v3/HabittaThinking.tsx` | **Modify** | Remove "end of life" + "planning window" |
| `src/lib/dashboardCopy.ts` | **Modify** | Replace "planning window" phrases |
| `src/types/advisorState.ts` | **Modify** | Update planning window message, rename function |
| `src/components/dashboard-v3/MonthlyPriorityCTA.tsx` | **Modify** | Gate behind non-stable + soften copy |

---

## Part 1: Centralized Status Normalization (QA #4)

**File:** `src/lib/statusNormalization.ts` (Create)

### Purpose
Single source of truth for home health status normalization. Prevents future drift.

### Implementation

```typescript
/**
 * Centralized Home Health Status Normalization
 * 
 * DOCTRINE COMPLIANCE:
 * - No gamification labels ("Healthy", "Score")
 * - Neutral, observational language only
 * - Color palette: slate (muted) not urgency-coded
 * 
 * QA GUARDRAIL: "Elevated" is only valid when changedSinceLastVisit === true
 */

export type InternalHealthStatus = 'healthy' | 'attention' | 'critical';
export type NormalizedStatusLabel = 'Stable' | 'Observed' | 'Elevated';

export interface NormalizedStatus {
  label: NormalizedStatusLabel;
  color: string;  // Tailwind class
}

/**
 * Normalize internal health status to doctrine-compliant display values
 * 
 * @param status - Internal status key
 * @param changedSinceLastVisit - If true, allows "Elevated" for critical states
 */
export function normalizeHealthStatus(
  status: InternalHealthStatus,
  changedSinceLastVisit: boolean = false
): NormalizedStatus {
  switch (status) {
    case 'healthy':
      return { label: 'Stable', color: 'bg-slate-400' };
    case 'attention':
      return { label: 'Observed', color: 'bg-slate-500' };
    case 'critical':
      // QA Guardrail: "Elevated" only when something changed
      return changedSinceLastVisit
        ? { label: 'Elevated', color: 'bg-slate-600' }
        : { label: 'Observed', color: 'bg-slate-500' };
    default:
      return { label: 'Stable', color: 'bg-slate-400' };
  }
}

/**
 * Get status label only (when you don't need color)
 */
export function getHealthStatusLabel(
  status: InternalHealthStatus,
  changedSinceLastVisit: boolean = false
): NormalizedStatusLabel {
  return normalizeHealthStatus(status, changedSinceLastVisit).label;
}
```

---

## Part 2: HomeProfileContextHeader — Doctrine Fix

**File:** `src/components/HomeProfile/HomeProfileContextHeader.tsx`

### Changes
1. Remove "Home Pulse" branding → "Status"
2. Import and use centralized status normalization
3. Use muted slate colors instead of urgency colors
4. Update comment to remove "Home Pulse" reference

### Key Changes

```typescript
// Before
<span>Home Pulse: {label}</span>
// Colors: bg-emerald-500, bg-amber-500, bg-red-500

// After
<span>Status: {label}</span>
// Colors: bg-slate-400, bg-slate-500, bg-slate-600
```

---

## Part 3: HomeValueImpact — Remove Gamification

**File:** `src/components/HomeValueImpact.tsx`

### Changes

```typescript
// Before (Line 16)
Complete maintenance tasks to earn Habitta Verified status.

// After
Maintenance documentation supports verified status.
```

This removes:
- "Complete" (task framing)
- "earn" (gamification)

---

## Part 4: Navigation — Remove "Home Pulse" Branding

### AppSidebar.tsx (Line 23-24)

```typescript
// Before
{ title: "Home Pulse", url: "/dashboard", icon: Home },

// After
{ title: "Home", url: "/dashboard", icon: Home },
```

### LeftColumn.tsx (Line 31)

```typescript
// Before
{ title: "Home Pulse", path: "/dashboard", icon: Home },

// After
{ title: "Home", path: "/dashboard", icon: Home },
```

### DashboardV3.tsx (Line 355)

```typescript
// Before
<CardTitle className="text-2xl">Welcome to Home Pulse</CardTitle>

// After
<CardTitle className="text-2xl">Welcome to Habitta</CardTitle>
```

---

## Part 5: todaysFocusCopy.ts — Soften + Vary Copy (QA #2)

**File:** `src/lib/todaysFocusCopy.ts`

### Change 1: Soften "attention threshold" (Line 135)

```typescript
// Before
risk: `${systemNameCapitalized} wear has crossed our attention threshold.`,

// After
risk: `${systemNameCapitalized} is showing elevated wear patterns.`,
```

### Change 2: Soften risk rationale (Line 176)

```typescript
// Before
risk: `This surfaced because ${systemName} indicators have crossed the threshold where proactive planning typically saves costs.`,

// After  
risk: `This surfaced because ${systemName} indicators suggest elevated wear relative to comparable homes.`,
```

### Change 3: Vary stable signals copy (Line 194)

```typescript
// Before
'No systems approaching planning windows',

// After
'No systems in later lifecycle stages',
```

---

## Part 6: resolveApplianceIdentity.ts — Replace "Planning window"

**File:** `src/lib/resolveApplianceIdentity.ts`

### derivePlanningLabel (Lines 212-213)

```typescript
// Before
if (remainingYears <= 2) {
  return 'Planning window';
}

// After
if (remainingYears <= 2) {
  return 'Later-stage lifecycle';
}
```

### getStatusCopy (Lines 240-241)

```typescript
// Before
case 'attention':
  return 'Planning window';

// After
case 'attention':
  return 'Later-stage lifecycle';
```

---

## Part 7: HabittaThinking.tsx — Remove Urgent Language

**File:** `src/components/dashboard-v3/HabittaThinking.tsx`

### getMessage function (Lines 137-143)

```typescript
// Before
const getMessage = () => {
  const years = primarySystem.remainingYears;
  if (years <= 2) {
    return `Your ${systemName} is approaching end of life.`;
  }
  return `Your ${systemName} is entering a planning window.`;
};

// After (QA #2: vary by context - "Context" layer uses different phrasing)
const getMessage = () => {
  const years = primarySystem.remainingYears;
  if (years <= 2) {
    return `Your ${systemName} has reached a later lifecycle stage.`;
  }
  return `Your ${systemName} is worth understanding better.`;
};
```

---

## Part 8: dashboardCopy.ts — Replace Planning Language

**File:** `src/lib/dashboardCopy.ts`

### planning_opportunity (Lines 45-48)

```typescript
// Before
planning_opportunity: {
  primary: `One system is entering its planning window. This isn't urgent, but early awareness improves cost and timing flexibility.`,

// After (QA #2: "Timeline" layer variation)
planning_opportunity: {
  primary: `One system is in a later lifecycle stage. Early awareness helps with timing flexibility.`,
```

### getSystemStatusLabel (Lines 200-203)

```typescript
// Before
if (monthsToPlanning > 36) {
  return 'Future planning window';
}
return 'Approaching planning range';

// After
if (monthsToPlanning > 36) {
  return 'Mid-lifecycle horizon';
}
return 'Later lifecycle range';
```

---

## Part 9: advisorState.ts — Update Messages

**File:** `src/types/advisorState.ts`

### Function rename + update (Line 228)

```typescript
// Before
function getPlanningWindowMessage(...): AdvisorOpeningMessage {
  return {
    observation: `You're entering a good planning window for your ${systemName}.`,

// After
function getLifecycleStageMessage(...): AdvisorOpeningMessage {
  return {
    observation: `Your ${systemName} is in a later lifecycle stage.`,
```

### optionsPreview (Line 240)

```typescript
// Before
optionsPreview: 'Acting now gives you more options and avoids last-minute decisions.'

// After
optionsPreview: 'Understanding this early provides more flexibility.'
```

### Update call site (Line 155)

```typescript
// Before
return getPlanningWindowMessage(systemName, trigger.monthsRemaining, confidence);

// After
return getLifecycleStageMessage(systemName, trigger.monthsRemaining, confidence);
```

---

## Part 10: MonthlyPriorityCTA — Gate + Soften (QA #3)

**File:** `src/components/dashboard-v3/MonthlyPriorityCTA.tsx`

### Add stable state prop + suppression

```typescript
interface MonthlyPriorityCTAProps {
  suggestedSystemSlug?: string;
  chatEngagedThisSession: boolean;
  hasSystemsInWindow: boolean;
  isStable?: boolean;  // NEW: Gate behind non-stable states
  onAskClick: () => void;
}

// Add suppression rule (QA #3)
if (isStable) return null;  // Never show in stable state
```

### Soften copy (Lines 60-65)

```typescript
// Before
const headline = systemName
  ? `Your ${systemName} needs attention.`
  : "What should I focus on this month?";

const subtext = systemName
  ? "Get personalized guidance for your planning window."
  : "Let Habitta help you prioritize.";

// After (QA #2: "CTA" layer variation)
const headline = systemName
  ? `Your ${systemName} is worth understanding better.`
  : "What would you like to explore?";

const subtext = systemName
  ? "Get context on its current lifecycle stage."
  : "Let Habitta provide context.";
```

### Update comment (Lines 22-29)

```typescript
/**
 * MonthlyPriorityCTA - Contextual Prompt (renamed from MonthlyPriorityCTA)
 * 
 * Display Rules:
 * - NEVER shown when isStable === true (QA #3)
 * - Shown at most once per session
 * - Suppressed if user already engaged chat this session
 * - Suppressed if no systems are in later lifecycle stages
 */
```

---

## Layer-Specific Copy Variation (QA #2)

To avoid repetition, "later-stage lifecycle" is varied by layer:

| Layer | Copy Variation |
|-------|----------------|
| **Status** (TodaysFocus) | "in a later stage of its lifecycle" |
| **Context** (HabittaThinking) | "worth understanding better" |
| **Timeline** (dashboardCopy) | "in a later lifecycle stage" |
| **CTA** (MonthlyPriorityCTA) | "worth understanding better" |
| **Appliance** (resolveApplianceIdentity) | "Later-stage lifecycle" |
| **Advisor** (advisorState) | "in a later lifecycle stage" |

Same meaning, reduced repetition.

---

## Acceptance Criteria

### Doctrine Compliance
- [ ] No "Home Pulse" branding anywhere
- [ ] No "earn" or gamification verbs
- [ ] No "attention threshold" or urgency language
- [ ] No "planning window" phrases
- [ ] No "end of life" language
- [ ] No "needs attention" action-framing

### QA Refinements
- [ ] "Elevated" only shown when `changedSinceLastVisit === true` (QA #1)
- [ ] Layer-varied copy prevents repetition (QA #2)
- [ ] MonthlyPriorityCTA suppressed when stable (QA #3)
- [ ] Status normalization centralized in utility (QA #4)

### Color Palette
- [ ] All status colors use slate palette (slate-400, slate-500, slate-600)
- [ ] No urgency colors (emerald, amber, red) for status indicators

---

## Litmus Test

For every changed line, ask:
> "Does this make the homeowner feel calmer or busier?"

If the answer is "busier", it fails.

