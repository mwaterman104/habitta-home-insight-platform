

# Habitta Dashboard Enhancements — Implementation Plan
## Position Strip Integrated, Timeline Preserved as Evidence

---

## Executive Summary

This plan transforms the dashboard from a multi-card information display into a **single-narrative authority surface** that answers:

> "What matters about my home right now — and where do I stand?"

The dashboard delivers **two immediate truths in under three seconds**:
1. **What Habitta is focused on** (Today's Focus)
2. **Where the homeowner sits in the lifecycle** (Position Strip)

Timelines and tasks are preserved only as **supporting evidence**, never as primary signals.

---

## Core Transformation

```text
BEFORE
SystemWatch → Cadence Cards → HomeHealthOutlook → HabittaThinking → MaintenanceRoadmap → ChatDock

AFTER
Today's Focus (primary authority)
→ Position Strip (instant orientation)
→ System Watch (conditional)
→ Context Drawer (collapsed)
→ ChatDock (sticky)
```

**Architectural Principle (Locked):**
> Judgment first. Position second. Evidence last.
> Chronology never leads. Orientation always does.

---

## Files Summary

| File | Action | Scope |
|------|--------|-------|
| `src/lib/todaysFocusCopy.ts` | **Create** | Copy governance for Today's Focus + Context Drawer |
| `src/components/dashboard-v3/TodaysFocusCard.tsx` | **Create** | New primary authority component |
| `src/components/dashboard-v3/PositionStrip.tsx` | **Create** | Lifecycle position visualization |
| `src/components/dashboard-v3/ContextDrawer.tsx` | **Create** | Merged intelligence drawer (collapsed by default) |
| `src/lib/narrativePriority.ts` | **Modify** | Add `arbitrateTodaysFocus()` and `resolvePosition()` |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Modify** | Replace hierarchy with new structure |
| `src/components/dashboard-v3/SystemWatch.tsx` | **Modify** | Sharpen to one-line alert, remove timelines/buttons |
| `src/components/dashboard-v3/ChatDock.tsx` | **Modify** | Add focus context injection |
| `src/components/dashboard-v3/index.ts` | **Modify** | Export new components |

**Components to Remove from Main Flow:**
- `HomeHealthOutlook` (Position + Focus supersede)
- `HabittaThinking` (Merged into Context Drawer)
- `MaintenanceRoadmap` (Replaced by Position Strip in main flow)
- Cadence Cards (Move to Context Drawer, not primary signals)

---

## Part 1: Copy Governance Module

**File:** `src/lib/todaysFocusCopy.ts`

### Purpose
Single source of truth for Today's Focus and Context Drawer copy. Enforces copy contract:
- One sentence only
- Statement, not suggestion
- No percentages, dates, or "You should" language

### Types

```typescript
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
```

### Banned Phrases (Enforced)

```typescript
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
```

### State-Based Copy Generation

```typescript
export function getTodaysFocusCopy(
  state: FocusState,
  sourceSystem: SourceSystem
): string {
  const systemName = formatSystemName(sourceSystem);
  
  const copyMap: Record<FocusState, string> = {
    stable: 'Nothing requires attention right now.',
    planning: `Your ${systemName} is entering its planning window.`,
    advisory: 'Market conditions make this a strong refinance period.',
    risk: `${systemName} wear has crossed our attention threshold.`,
  };
  
  return copyMap[state];
}

export function getPositionCopy(label: PositionLabel): string {
  return `Position: ${label}`;
}
```

---

## Part 2: Today's Focus Card (Primary Authority)

**File:** `src/components/dashboard-v3/TodaysFocusCard.tsx`

### Rendering Rules
- **Always visible** — never hidden
- **One sentence only** — hard limit enforced
- **No buttons** unless `state !== 'stable'`
- **Visual weight > all other components**
- **No charts, percentages, or dates**

### Component Structure

```tsx
interface TodaysFocusCardProps {
  focus: TodaysFocus;
  onContextExpand?: () => void;
}

export function TodaysFocusCard({ focus, onContextExpand }: TodaysFocusCardProps) {
  return (
    <Card className="rounded-xl border-0 bg-transparent">
      <CardContent className="py-6">
        {/* Primary statement - center of authority */}
        <p className="text-lg font-medium text-foreground leading-relaxed">
          {focus.message}
        </p>
        
        {/* Context trigger - only if not stable */}
        {focus.state !== 'stable' && onContextExpand && (
          <button
            onClick={onContextExpand}
            className="text-sm text-muted-foreground hover:text-foreground mt-3"
          >
            Why?
          </button>
        )}
        
        {/* Changed indicator - subtle */}
        {focus.changedSinceLastVisit && (
          <span className="text-xs text-muted-foreground/70 block mt-2">
            Updated since your last visit
          </span>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Part 3: Position Strip (New Component)

**File:** `src/components/dashboard-v3/PositionStrip.tsx`

### Purpose
Give instant positional clarity without dates, tasks, or anxiety.
Answers: "Am I early, mid-life, or late — right now?"

### Rendering Rules
- **Always visible**
- **Non-interactive by default**
- **Single horizontal bar**
- **One marker only: "Current Position"**
- **Muted, neutral color palette**
- **No numbers, dates, or milestones**

### Component Structure

```tsx
interface PositionStripProps {
  label: 'Early' | 'Mid-Life' | 'Late';
  relativePosition: number;  // 0.0 → 1.0
  confidence: 'high' | 'moderate' | 'early';
  sourceSystem?: string | null;
  onExpand?: () => void;
}

export function PositionStrip({ 
  label, 
  relativePosition, 
  confidence,
  onExpand 
}: PositionStripProps) {
  // Calculate marker position (0-100%)
  const markerPosition = Math.min(Math.max(relativePosition * 100, 5), 95);
  
  return (
    <Card className="rounded-xl border bg-muted/30">
      <CardContent className="py-4 px-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">
            Position: {label}
          </span>
          {onExpand && (
            <button
              onClick={onExpand}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Details
            </button>
          )}
        </div>
        
        {/* Bar visualization */}
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          {/* Gradient fill up to marker */}
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-200/70 via-amber-200/70 to-red-200/70 rounded-full"
            style={{ width: '100%' }}
          />
          
          {/* Current position marker */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 h-4 w-1.5 bg-foreground rounded-full shadow-sm"
            style={{ left: `${markerPosition}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        
        {/* Position indicator */}
        <div className="flex justify-center mt-2">
          <span className="text-xs text-muted-foreground">
            Current Position
          </span>
        </div>
        
        {/* Confidence (optional, text only) */}
        {confidence !== 'high' && (
          <p className="text-xs text-muted-foreground/70 mt-2 text-center">
            Position confidence: {confidence === 'moderate' ? 'Moderate' : 'Early'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### Visual Structure

```text
Position: Mid-Life

▮▮▮▮▮▯▯▯▯
        ▲
   Current Position
   
Position confidence: Moderate
```

---

## Part 4: System Watch Modifications

**File:** `src/components/dashboard-v3/SystemWatch.tsx`

### Changes (Sharpen and Demote)

1. **Remove timeline language** (lines 177-180):
   - Delete: `${primarySystem.remainingYears}–${primarySystem.remainingYears + 2} years until likely replacement`

2. **Remove action buttons** (lines 191-212):
   - Delete "View Details" and "Ask Habitta" buttons

3. **One sentence only**:
   - Keep: "Your {System} is entering its planning window."
   - Remove all other content

4. **Visibility rules**:
   - Render ONLY if system is in planning/risk AND not already the Today's Focus source
   - Max ONE instance

### Modified Component (Sharpened)

```tsx
// Render only if triggered AND not already focus
if (isAllClear || primarySystem?.key === focusSourceSystem) {
  return null;
}

return (
  <div className="text-sm text-muted-foreground py-2 px-1">
    {primarySystem.name} is approaching a decision window.
  </div>
);
```

---

## Part 5: Context Drawer (Collapsed by Default)

**File:** `src/components/dashboard-v3/ContextDrawer.tsx`

### Purpose
Replaces: HomeHealthOutlook causality, HabittaThinking, cadence cards

### Trigger Conditions (Collapsed by Default)
Opens only when:
- User clicks "Why?"
- OR System Watch is visible
- OR `changedSinceLastVisit === true`

### Content Structure (Fixed Order)

```tsx
interface ContextDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  context: ContextDrawerData;
  capitalAdvisory?: CapitalAdvisory;
  focusState: FocusState;
}

export function ContextDrawer({
  isOpen,
  onOpenChange,
  context,
  capitalAdvisory,
}: ContextDrawerProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleContent>
        <Card className="rounded-xl border-0 bg-muted/20">
          <CardContent className="py-4 space-y-4">
            {/* Section A: Why This Surfaced */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Why this surfaced
              </h4>
              <p className="text-sm text-foreground">
                {context.rationale}
              </p>
            </div>
            
            {/* Section B: What We're Seeing (Signals) */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                What we're seeing
              </h4>
              <ul className="space-y-1.5">
                {context.signals.slice(0, 3).map((signal, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40" />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Section C: Confidence */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Confidence
              </h4>
              <p className="text-sm text-muted-foreground">
                {getConfidenceDescription(context.confidenceLanguage)}
              </p>
            </div>
            
            {/* Section D: Capital Advisory (quiet tier) */}
            {capitalAdvisory && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground italic">
                  {capitalAdvisory.insight}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

---

## Part 6: Narrative Arbitration Enhancement

**File:** `src/lib/narrativePriority.ts`

### New Functions

```typescript
/**
 * Arbitrate Today's Focus from system signals
 * Priority: RISK > PLANNING > ADVISORY > STABLE
 */
export function arbitrateTodaysFocus(ctx: NarrativeContext): TodaysFocus {
  // Priority 1: Risk threshold crossed
  const highRiskSystem = ctx.systems.find(s => s.risk === 'HIGH');
  if (highRiskSystem) {
    return {
      state: 'risk',
      message: `${formatSystemDisplayName(highRiskSystem.key)} wear has crossed our attention threshold.`,
      sourceSystem: highRiskSystem.key as SourceSystem,
      changedSinceLastVisit: ctx.hasChangedSinceLastVisit ?? false,
    };
  }
  
  // Priority 2: Planning window
  const planningSystem = ctx.systems.find(s => 
    s.monthsToPlanning && s.monthsToPlanning < 36
  );
  if (planningSystem) {
    return {
      state: 'planning',
      message: `Your ${formatSystemDisplayName(planningSystem.key).toLowerCase()} is entering its planning window.`,
      sourceSystem: planningSystem.key as SourceSystem,
      changedSinceLastVisit: ctx.hasChangedSinceLastVisit ?? false,
    };
  }
  
  // Priority 3: Market advisory (future)
  // Priority 4: Stable
  return {
    state: 'stable',
    message: 'Nothing requires attention right now.',
    sourceSystem: null,
    changedSinceLastVisit: false,
  };
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
  
  // Derive confidence
  const avgConfidence = ctx.systems.reduce((sum, s) => sum + s.confidence, 0) / 
    Math.max(ctx.systems.length, 1);
  const confidence: ConfidenceLanguage = 
    avgConfidence >= 0.7 ? 'high' :
    avgConfidence >= 0.4 ? 'moderate' : 'early';
  
  return {
    label,
    relativePosition: positionScore,
    confidence,
    sourceSystem: dominantSystem?.key as SourceSystem,
  };
}

function getDominantLifecycleSystem(systems: SystemSignal[]): SystemSignal & { positionScore: number } | null {
  if (systems.length === 0) return null;
  
  // Sort by urgency (lowest remaining years = highest position score)
  const sorted = [...systems].sort((a, b) => {
    const aMonths = a.monthsToPlanning ?? 120;
    const bMonths = b.monthsToPlanning ?? 120;
    return aMonths - bMonths;
  });
  
  const dominant = sorted[0];
  // Calculate position score (0 = just installed, 1 = end of life)
  const months = dominant.monthsToPlanning ?? 120;
  const positionScore = Math.max(0, Math.min(1, 1 - (months / 180)));
  
  return { ...dominant, positionScore };
}
```

---

## Part 7: Middle Column Layout (Restructured)

**File:** `src/components/dashboard-v3/MiddleColumn.tsx`

### New Layout Order

```text
1. Enriching indicator (unchanged)
2. Annual State of Home (conditional interrupt)
3. Today's Focus (PRIMARY - always visible)
4. Position Strip (ALWAYS VISIBLE)
5. System Watch (conditional, sharpened)
6. Context Drawer (collapsed by default)
7. ChatDock (sticky)
```

### Implementation Changes

Replace lines 280-408 with:

```tsx
return (
  <div className="flex flex-col h-full min-h-0 overflow-hidden">
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className="space-y-4 max-w-3xl mx-auto px-4 py-6">
        {/* 0. Enriching indicator (transient) */}
        {isEnriching && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Still analyzing your home...
          </div>
        )}

        {/* 1. Annual State of Home - interrupt only */}
        {annualCard && (
          <section>
            <StateOfHomeReport data={annualCard} onDismiss={dismissAnnual} />
          </section>
        )}

        {/* 2. Today's Focus - PRIMARY AUTHORITY */}
        <section>
          <TodaysFocusCard
            focus={todaysFocus}
            onContextExpand={() => setContextOpen(true)}
          />
        </section>

        {/* 3. Position Strip - ALWAYS VISIBLE */}
        <section>
          <PositionStrip
            label={position.label}
            relativePosition={position.relativePosition}
            confidence={position.confidence}
            sourceSystem={position.sourceSystem}
            onExpand={() => setContextOpen(true)}
          />
        </section>

        {/* 4. System Watch - conditional, sharpened */}
        {shouldShowSystemWatch && (
          <section>
            <SystemWatchInline
              system={primaryPlanningSystem}
            />
          </section>
        )}

        {/* 5. Context Drawer - collapsed by default */}
        <section>
          <ContextDrawer
            isOpen={contextOpen}
            onOpenChange={setContextOpen}
            context={contextDrawerData}
            capitalAdvisory={capitalAdvisory}
            focusState={todaysFocus.state}
          />
        </section>

        {/* 6. ChatDock - sticky, pre-contextualized */}
        <div className="sticky bottom-4">
          <ChatDock
            propertyId={propertyId}
            isExpanded={chatExpanded}
            onExpandChange={onChatExpandChange}
            todaysFocus={todaysFocus}
            // ... other props
          />
        </div>
      </div>
    </ScrollArea>
  </div>
);
```

---

## Part 8: ChatDock Context Injection

**File:** `src/components/dashboard-v3/ChatDock.tsx`

### New Prop

```typescript
interface ChatDockProps {
  // ... existing props
  todaysFocus?: TodaysFocus;  // NEW: For prompt injection
}
```

### Prompt Injection Logic

```typescript
const getPlaceholder = () => {
  if (todaysFocus?.state === 'stable') {
    return "You're reviewing your home while everything is stable. What would you like to explore?";
  }
  if (todaysFocus?.sourceSystem) {
    return `Ask about your ${formatSystemName(todaysFocus.sourceSystem)}...`;
  }
  return "What would you like to understand better?";
};
```

### Updated Empty State Copy

```tsx
{messages.length === 0 && (
  <div className="text-center py-8 text-muted-foreground">
    <p className="text-sm">
      {todaysFocus?.state === 'stable'
        ? "Your home is stable. What would you like to explore?"
        : "What are you thinking about regarding your home?"
      }
    </p>
  </div>
)}
```

---

## Component Elimination Summary

| Component | Action | Reason |
|-----------|--------|--------|
| `HomeHealthOutlook` | **Remove from main flow** | Position + Focus supersede; keep for detail pages |
| `HabittaThinking` | **Remove** | Merged into Context Drawer |
| `MaintenanceRoadmap` | **Remove from main flow** | Replaced by Position Strip |
| `MonthlyConfirmationCard` | **Move to Context Drawer** | Not primary signal |
| `QuarterlyPositionCard` | **Move to Context Drawer** | Not primary signal |
| `OptionalAdvantageCard` | **Move to Context Drawer** | Capital advisory belongs in quiet tier |

---

## Copy Contract Enforcement

### Litmus Test
> "Would I trust this sentence if I were making a six-figure decision about my home?"

### Voice Identity
- Steward, not coach
- Advisor, not dashboard
- Professional observer, not narrator

### Position Strip Copy Rules
- **Allowed:** "Position: Mid-Life", "Position: Late Stage"
- **Forbidden:** "Years remaining", "Replacement soon", "End of life"

### Today's Focus Copy Rules
- **Allowed:** Declarative, calm, judgment-based
- **Forbidden:** Dates, percentages, "You should" language

---

## Acceptance Tests

### Today's Focus
- [ ] Always visible, never hidden
- [ ] Exactly one sentence
- [ ] No buttons when state === 'stable'
- [ ] No charts, percentages, or dates

### Position Strip
- [ ] Always visible
- [ ] Single horizontal bar with one marker
- [ ] No numbers, dates, or milestones
- [ ] Confidence shown as text only (not numeric)
- [ ] No "Years remaining" language

### System Watch
- [ ] Max one system at a time
- [ ] Max one sentence
- [ ] Hidden when nothing triggered
- [ ] No timelines, buttons, or recommendations

### Context Drawer
- [ ] Collapsed by default
- [ ] Opens on "Why?" click
- [ ] Fixed section order: Rationale → Signals → Confidence → Capital

### Copy Contract
- [ ] No exclamation points anywhere
- [ ] No "You should", "We recommend", "Don't worry"
- [ ] No percentages shown to users

---

## Strategic Outcome

This architecture delivers:
- **Psychological switching cost** — users feel watched over
- **Authority posture** — less talking, more judgment
- **Annual pricing leverage** — stewardship > utility
- **Position clarity** — instant orientation without anxiety

