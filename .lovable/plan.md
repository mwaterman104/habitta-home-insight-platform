

# Habitta Dashboard — QA-Refined Implementation Plan

## Executive Summary

This refined plan addresses all 7 QA issues identified in the executive review, ensuring the dashboard is production-ready without UX debt accumulation.

---

## QA Issues Addressed

| # | Issue | Resolution |
|---|-------|------------|
| 1 | Status vs Position overlap | Outlook copy shifts from reassurance → explanation |
| 2 | Timeline expandable rows creep | Hard constraint: show WHY position is accurate, not WHAT to do |
| 3 | Copy governance gaps | Add 8 missing banned phrases |
| 4 | Missing installYear edge cases | Clamp to mid-range, lower confidence, change note |
| 5 | RightColumn FocusContextCard | Remove entirely — context lives in ContextDrawer only |
| 6 | "Monitoring" status ambiguity | Replace with "Observed" |
| 7 | Timeline "planning" language | Replace with "Later-stage lifecycle" |

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/dashboardRecoveryCopy.ts` | **Create** | Copy governance with QA fixes applied |
| `src/components/dashboard-v3/HomeStatusHeader.tsx` | **Create** | Section header wrapper for Today's Focus |
| `src/components/dashboard-v3/HomePositionOutlook.tsx` | **Create** | Position + Outlook (non-redundant) |
| `src/components/dashboard-v3/SystemsOverview.tsx` | **Create** | Coverage list with "Observed" status |
| `src/components/dashboard-v3/SystemTimelineLifecycle.tsx` | **Create** | Progress bars, no dates/costs, constrained expansion |
| `src/components/dashboard-v3/LocalConditions.tsx` | **Create** | Climate + comparable homes context |
| `src/lib/todaysFocusCopy.ts` | **Modify** | Add missing banned phrases |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Modify** | Integrate new hierarchy |
| `src/components/dashboard-v3/RightColumn.tsx` | **Modify** | Remove FocusContextCard, add LocalConditions |
| `src/components/dashboard-v3/index.ts` | **Modify** | Export new components |

---

## Part 1: Copy Governance Module (QA Fix #3, #6, #7)

**File:** `src/lib/dashboardRecoveryCopy.ts`

### Complete Banned Phrases List (Expanded)

```typescript
/**
 * Dashboard Recovery Copy Governance
 * 
 * Enforces calm, neutral language across all dashboard surfaces.
 * QA-approved list of banned phrases that trigger urgency or action-framing.
 */

export const BANNED_DASHBOARD_PHRASES = [
  // Original list
  '!',
  'You should',
  'We recommend',
  "Don't worry",
  'Based on our AI',
  'Good news',
  "You're all set",
  'Nice work',
  '%',
  'in the next',
  'within',
  'urgent',
  'critical',
  'immediately',
  
  // QA additions (must add now)
  'planning window',    // Too directive on main dashboard
  'attention required',
  'monitor closely',
  'action',
  'consider',
  'recommended',
  'expected to fail',
  'forecast',
  'due soon',
  'plan now',
  'replace',
  'years remaining',
  'end of life',
] as const;
```

### Status Labels (QA Fix #6)

```typescript
/**
 * System status labels - strictly neutral
 * 
 * "Monitoring" was flagged as ambiguous (implies concern).
 * Replaced with "Observed" which is neutral.
 */
export type SystemStatusLabel = 'Normal' | 'Typical' | 'Stable' | 'Observed';

export function getSystemStatusLabel(
  risk: 'LOW' | 'MODERATE' | 'HIGH'
): SystemStatusLabel {
  switch (risk) {
    case 'HIGH':
      return 'Observed';  // Neutral, not alarming
    case 'MODERATE':
      return 'Stable';
    case 'LOW':
    default:
      return 'Normal';
  }
}
```

### Lifecycle Note Logic (QA Fix #7)

```typescript
/**
 * Generate lifecycle note for timeline rows
 * 
 * CRITICAL: "Approaching planning considerations" was flagged.
 * Replaced with non-directive language.
 */
export function getLifecycleNote(
  positionScore: number,
  confidence: number,
  hasInstallYear: boolean  // QA Fix #4
): string {
  // QA Fix #4: Handle missing install year
  if (!hasInstallYear) {
    return 'Based on regional patterns';
  }
  
  if (positionScore < 0.4) return 'Typical for age';
  if (positionScore < 0.6) return 'Within expected range';
  if (positionScore < 0.75) return 'Mid-to-late lifecycle';
  
  // QA Fix #7: No "planning" language
  // OLD: 'Approaching planning considerations'
  // NEW: Non-directive
  if (confidence < 0.5) {
    return 'Later-stage lifecycle';
  }
  return 'Later in expected range';
}
```

### Outlook Summary Logic (QA Fix #1)

```typescript
/**
 * Generate outlook summary for HomePositionOutlook
 * 
 * QA Fix #1: When stable, outlook must NOT repeat reassurance.
 * Shift from reassurance → explanation.
 */
export function getOutlookSummary(
  systemsApproachingWindow: number,
  isStable: boolean
): string {
  if (systemsApproachingWindow > 0) {
    return `${systemsApproachingWindow} system${systemsApproachingWindow > 1 ? 's' : ''} in later lifecycle stages`;
  }
  
  // QA Fix #1: Not "No systems approaching planning windows" (redundant)
  // Instead: explain, don't reassure
  if (isStable) {
    return 'Systems aging within expected ranges';
  }
  
  return 'Lifecycle positions typical for home age';
}
```

---

## Part 2: HomeStatusHeader

**File:** `src/components/dashboard-v3/HomeStatusHeader.tsx`

### Purpose
Wraps Today's Focus with section header for visual hierarchy.

### Component Structure

```tsx
interface HomeStatusHeaderProps {
  message: string;
  changedSinceLastVisit?: boolean;
}

export function HomeStatusHeader({ 
  message, 
  changedSinceLastVisit 
}: HomeStatusHeaderProps) {
  return (
    <div className="space-y-2">
      {/* Section header */}
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Today's Status
      </h2>
      
      {/* Primary statement */}
      <p className="text-lg font-medium text-foreground leading-relaxed">
        {message}
      </p>
      
      {/* Changed indicator */}
      {changedSinceLastVisit && (
        <span className="text-xs text-muted-foreground/70 block">
          Updated since your last visit
        </span>
      )}
    </div>
  );
}
```

---

## Part 3: HomePositionOutlook (QA Fix #1)

**File:** `src/components/dashboard-v3/HomePositionOutlook.tsx`

### Purpose
Lifecycle position + outlook summary. When stable, outlook explains rather than reassures.

### Props

```typescript
interface HomePositionOutlookProps {
  label: 'Early' | 'Mid-Life' | 'Late';
  relativePosition: number;  // 0.0 → 1.0
  confidence: 'high' | 'moderate' | 'early';
  outlookSummary: string;  // QA Fix #1: Explanation, not reassurance
  onDetailsClick?: () => void;
}
```

### Visual Structure

```text
HOME POSITION
Mid-Life

▮▮▮▮▮▯▯▯▯
     ▲
Current position

Outlook: Systems aging within expected ranges
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
         (QA Fix #1: Explanation, not reassurance)
```

---

## Part 4: SystemsOverview (QA Fix #6)

**File:** `src/components/dashboard-v3/SystemsOverview.tsx`

### Purpose
Coverage proof with neutral status labels.

### Status Label Rules (QA Fix #6)

- **Normal** — Low risk, typical state
- **Typical** — Environmental systems (weather, etc.)
- **Stable** — Moderate risk, nothing alarming
- **Observed** — Higher attention, but NOT "Monitoring" (ambiguous)

### Visual Structure

```text
SYSTEMS BEING MONITORED

HVAC            Normal
Roof            Normal
Plumbing        Normal
Electrical      Stable
Water Heater    Normal
Environment     Typical
```

### Component Structure

```tsx
interface SystemsOverviewProps {
  systems: Array<{
    key: string;
    label: string;
    status: SystemStatusLabel;  // 'Normal' | 'Typical' | 'Stable' | 'Observed'
  }>;
}

export function SystemsOverview({ systems }: SystemsOverviewProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Systems Being Monitored
      </h2>
      <div className="space-y-2">
        {systems.map((system) => (
          <div 
            key={system.key}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-foreground">{system.label}</span>
            <span className="text-muted-foreground">{system.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Part 5: SystemTimelineLifecycle (QA Fix #2, #4, #7)

**File:** `src/components/dashboard-v3/SystemTimelineLifecycle.tsx`

### Purpose
Progress bars showing lifecycle position. No dates, costs, or action language.

### Hard Guardrails (QA Fix #2)

**CRITICAL CONSTRAINT (must add in code comments):**

```typescript
/**
 * SystemTimelineLifecycle - Lifecycle Progress Table
 * 
 * HARD GUARDRAILS (QA-approved, non-negotiable):
 * 
 * Expanded rows may ONLY show:
 * - Install source (Permit / Inferred / Unknown)
 * - Confidence level
 * - Environmental stress factors
 * - Permit history (if available)
 * 
 * Expanded rows MUST NOT show:
 * - Cost estimates
 * - Timing/year projections
 * - Recommendations
 * - Actions/CTAs
 * 
 * Purpose: Explain WHY we believe this position is accurate,
 * NOT what to do about it.
 */
```

### Missing Install Year Handling (QA Fix #4)

```typescript
interface LifecycleSystem {
  key: string;
  label: string;
  positionScore: number;       // 0.0 → 1.0
  positionLabel: 'Early' | 'Mid-Life' | 'Late';
  note: string;
  hasInstallYear: boolean;     // QA Fix #4: Track if install year exists
  confidence: 'high' | 'moderate' | 'early';
}

// In data derivation:
function deriveLifecycleSystem(system: SystemTimelineEntry): LifecycleSystem {
  const hasInstallYear = system.installYear !== null;
  
  // QA Fix #4: When installYear is missing
  if (!hasInstallYear) {
    return {
      key: system.systemId,
      label: system.systemLabel,
      positionScore: 0.5,         // Clamp to mid-range
      positionLabel: 'Mid-Life',
      note: 'Based on regional patterns',  // Clear about uncertainty
      hasInstallYear: false,
      confidence: 'early',        // Lower confidence
    };
  }
  
  // Normal calculation when install year exists
  const positionScore = calculatePositionScore(system);
  return {
    key: system.systemId,
    label: system.systemLabel,
    positionScore,
    positionLabel: getPositionLabel(positionScore),
    note: getLifecycleNote(positionScore, system.dataQuality === 'high' ? 0.8 : 0.5, true),
    hasInstallYear: true,
    confidence: system.dataQuality === 'high' ? 'high' : 'moderate',
  };
}
```

### Timeline Note Logic (QA Fix #7)

Uses `getLifecycleNote()` from copy governance which avoids "planning" language.

### Expansion Content (QA Fix #2 Enforcement)

```tsx
// Expanded row content - strictly constrained
{isExpanded && (
  <div className="pl-4 pt-2 space-y-1 text-xs text-muted-foreground">
    {/* ALLOWED: Why we believe this position */}
    <div>Install source: {formatInstallSource(system.installSource)}</div>
    <div>Confidence: {system.confidence}</div>
    {system.environmentalStress && (
      <div>Climate factor: {system.environmentalStress}</div>
    )}
    
    {/* 
     * FORBIDDEN (enforced by code review):
     * - Cost estimates
     * - Year projections  
     * - "Consider..." language
     * - Action buttons
     */}
  </div>
)}
```

---

## Part 6: LocalConditions

**File:** `src/components/dashboard-v3/LocalConditions.tsx`

### Purpose
Climate zone + comparable homes context for right column.

### Component Structure

```tsx
interface LocalConditionsProps {
  climateZone: string;           // "High heat & humidity"
  environmentalStress: 'Typical' | 'Elevated' | 'Low';
  comparableHomesPattern: string; // "No unusual patterns detected"
}

export function LocalConditions({
  climateZone,
  environmentalStress,
  comparableHomesPattern,
}: LocalConditionsProps) {
  return (
    <Card className="rounded-xl border bg-muted/20">
      <CardContent className="py-4 px-5 space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Local Conditions
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Climate zone</span>
            <span className="text-foreground">{climateZone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Environmental stress</span>
            <span className="text-foreground">{environmentalStress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Comparable homes</span>
            <span className="text-foreground">{comparableHomesPattern}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Part 7: RightColumn Modification (QA Fix #5)

**File:** `src/components/dashboard-v3/RightColumn.tsx`

### Critical Change: Remove FocusContextCard

**QA Fix #5:** FocusContextCard creates duplicate explanation surfaces. Context must live in ONE place only (ContextDrawer).

### Updated Structure

```tsx
export function RightColumn({
  loading,
  latitude,
  longitude,
  address,
  city,
  state,
  // REMOVED: focusContext, hvacPrediction, capitalTimeline, homeAge, risk, confidence
}: RightColumnProps) {
  const climate = deriveClimateZone(state, city, latitude);
  
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Property Map - unchanged */}
      <PropertyMap 
        lat={latitude} 
        lng={longitude}
        address={address}
        city={city}
        state={state}
        className="rounded-xl"
      />

      {/* Local Conditions - NEW (replaces FocusContextCard) */}
      <LocalConditions
        climateZone={climate.label}
        environmentalStress="Typical"
        comparableHomesPattern="No unusual patterns detected"
      />
      
      {/* 
       * REMOVED: FocusContextCard
       * QA Fix #5: Context lives in ContextDrawer only.
       * Right column = external/environmental awareness only.
       */}
    </div>
  );
}
```

### Updated Props Interface

```typescript
interface RightColumnProps {
  loading: boolean;
  // Location
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  city?: string;
  state?: string;
  // REMOVED: focusContext, hvacPrediction, capitalTimeline, homeAge, risk, confidence
}
```

---

## Part 8: MiddleColumn Integration

**File:** `src/components/dashboard-v3/MiddleColumn.tsx`

### New Layout Order

```text
1. Enriching indicator (unchanged)
2. Annual State of Home (conditional interrupt)
3. TODAY'S STATUS (HomeStatusHeader)
4. HOME POSITION & OUTLOOK (HomePositionOutlook)
5. SYSTEMS BEING MONITORED (SystemsOverview)
6. SYSTEM LIFECYCLE TIMELINE (SystemTimelineLifecycle)
7. WHY THIS ASSESSMENT (ContextDrawer - collapsed)
8. CHAT (ChatDock - sticky)
```

### Data Derivation Updates

```typescript
// Derive monitored systems for coverage list (QA Fix #6)
const monitoredSystems = useMemo(() => {
  return [
    { key: 'hvac', label: 'HVAC', status: getSystemStatusLabel(getHvacRisk()) },
    { key: 'roof', label: 'Roof', status: getSystemStatusLabel('LOW') },
    { key: 'water_heater', label: 'Water Heater', status: getSystemStatusLabel('LOW') },
    { key: 'electrical', label: 'Electrical', status: 'Normal' as const },
    { key: 'plumbing', label: 'Plumbing', status: 'Normal' as const },
    { key: 'environment', label: 'Environment', status: 'Typical' as const },
  ];
}, [hvacPrediction]);

// Derive lifecycle systems with QA Fix #4 handling
const lifecycleSystems = useMemo(() => {
  return capitalTimeline?.systems.map(sys => deriveLifecycleSystem(sys)) ?? [];
}, [capitalTimeline]);

// Derive outlook summary (QA Fix #1)
const outlookSummary = useMemo(() => {
  const approaching = systemSignals.filter(s => 
    s.monthsToPlanning && s.monthsToPlanning < 36
  ).length;
  return getOutlookSummary(approaching, todaysFocus.state === 'stable');
}, [systemSignals, todaysFocus.state]);
```

---

## Part 9: Update todaysFocusCopy.ts (QA Fix #3)

**File:** `src/lib/todaysFocusCopy.ts`

### Add Missing Banned Phrases

```typescript
// Line 51-66: Expand BANNED_PHRASES array
export const BANNED_PHRASES = [
  // Existing
  '!',
  'You should',
  'We recommend',
  "Don't worry",
  'Based on our AI',
  'Good news',
  "You're all set",
  'Nice work',
  '%',
  'in the next',
  'within',
  'urgent',
  'critical',
  'immediately',
  
  // QA additions
  'planning window',
  'attention required',
  'monitor closely',
  'action',
  'consider',
  'recommended',
  'expected to fail',
  'forecast',
] as const;
```

### Update getTodaysFocusCopy (Line 110-125)

The "planning" state copy uses "planning window" which is now banned on the main dashboard. Need to update:

```typescript
export function getTodaysFocusCopy(
  state: FocusState,
  sourceSystem: SourceSystem
): string {
  const systemName = formatSystemName(sourceSystem);
  const systemNameCapitalized = formatSystemNameCapitalized(sourceSystem);
  
  const copyMap: Record<FocusState, string> = {
    stable: 'Nothing requires attention right now.',
    // OLD: `Your ${systemName} is entering its planning window.`
    // NEW: Avoid "planning window" on main dashboard
    planning: `Your ${systemName} is in a later stage of its lifecycle.`,
    advisory: 'Market conditions make this a strong refinance period.',
    risk: `${systemNameCapitalized} wear has crossed our attention threshold.`,
  };
  
  return copyMap[state];
}
```

---

## Acceptance Criteria (QA-Approved)

### Fix #1: Status vs Position Non-Redundancy
- [ ] When Today's Status = "Nothing requires attention", Outlook does NOT say "No systems approaching..."
- [ ] Outlook copy is explanatory: "Systems aging within expected ranges"

### Fix #2: Timeline Expansion Constraints
- [ ] Expanded rows show: install source, confidence, environmental factors
- [ ] Expanded rows do NOT show: costs, timing, recommendations, actions
- [ ] Code comments document this constraint

### Fix #3: Banned Phrases Complete
- [ ] 8 additional phrases added to BANNED_PHRASES
- [ ] "planning window" banned on main dashboard
- [ ] Today's Focus "planning" state copy updated

### Fix #4: Missing Install Year Handling
- [ ] When installYear is null: positionScore = 0.5 (mid-range)
- [ ] Confidence lowered to "early"
- [ ] Note shows "Based on regional patterns"

### Fix #5: FocusContextCard Removed
- [ ] RightColumn contains: PropertyMap + LocalConditions only
- [ ] No duplicate context surfaces
- [ ] Context lives in ContextDrawer only

### Fix #6: "Monitoring" Replaced
- [ ] SystemsOverview uses "Observed" not "Monitoring"
- [ ] All status labels are neutral: Normal, Typical, Stable, Observed

### Fix #7: No "Planning" in Timeline Notes
- [ ] getLifecycleNote never returns "planning" language
- [ ] Uses: "Later-stage lifecycle" or "Later in expected range"

---

## Component Export Updates

**File:** `src/components/dashboard-v3/index.ts`

```typescript
// Add new exports
export { HomeStatusHeader } from './HomeStatusHeader';
export { HomePositionOutlook } from './HomePositionOutlook';
export { SystemsOverview } from './SystemsOverview';
export { SystemTimelineLifecycle } from './SystemTimelineLifecycle';
export { LocalConditions } from './LocalConditions';
```

---

## Final Guardrails (Non-Negotiable)

| Rule | Enforcement |
|------|-------------|
| No "due" language | Banned in copy governance |
| No task framing | Status words: Normal, Typical, Stable, Observed |
| No urgency color coding | Single neutral color for bars |
| No "planning window" on dashboard | Banned phrase, copy updated |
| Timeline expansion = WHY, not WHAT | Code comments, PR checklist |
| Context in ONE place | ContextDrawer only, not RightColumn |
| Missing data = honest uncertainty | Mid-range position, lowered confidence |

