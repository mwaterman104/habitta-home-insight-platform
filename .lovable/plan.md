
# Engagement Cadence System — Refined Implementation Plan (QA-Approved)

## Summary

This plan transforms Habitta from a task-focused repair planner into a **living stewardship system** that maintains engagement through **validation, not surveillance**. The refinements ensure the system is operationally bulletproof, not just philosophically sound.

---

## QA Refinements Integrated

| Issue | Clarification | Implementation |
|-------|---------------|----------------|
| "Creates bond" is emotional, not mechanical | **Bond = accumulated historical context** — non-events filtered, continuity of observation, history expensive to walk away from | Explicit in StateOfHomeReport ("What Habitta filtered out"), copy governance, and annual brief structure |
| "Watched over" risks creepy framing | **Reframe as validation** — "Your assumptions about your home are continuously validated" | Copy changes throughout: "validated" replaces "watching", "confirmation" replaces "monitoring" |

---

## Core Principle (Lock This In)

> Habitta is a **continuously validating second brain** for the home.
> 
> Users return not because something is wrong, but because they want to **confirm their position remains valid**.
> 
> The bond is structural: **accumulated context, including what didn't matter, is expensive to walk away from.**

---

## Part 1: Database Schema Additions

### New Table: `home_review_state`

```sql
CREATE TABLE home_review_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  home_state TEXT NOT NULL DEFAULT 'healthy', -- 'healthy' | 'monitoring' | 'planning'
  last_monthly_check TIMESTAMPTZ,
  last_quarterly_review TIMESTAMPTZ,
  last_annual_report TIMESTAMPTZ,
  last_optional_advantage TIMESTAMPTZ,
  next_scheduled_review TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(home_id)
);
```

### New Table: `home_interactions`

```sql
CREATE TABLE home_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'monthly_confirm' | 'quarterly_dismissed' | 'advantage_dismissed'
  response_value TEXT, -- 'nothing_changed' | 'system_replaced' | 'renovation' | 'insurance_update'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Part 2: SystemWatch Copy Transformation

**File:** `src/components/dashboard-v3/SystemWatch.tsx`

### Current (Lines 124-129) — Problematic

```tsx
<p className="text-sm text-foreground font-medium">
  All systems healthy.
</p>
<p className="text-sm text-muted-foreground">
  No planning windows for the next 7 years.
</p>
```

**Problem:** This says "come back in 7 years" — dismisses the user.

### Target — Validation Language (QA Refinement #2)

```tsx
<p className="text-sm text-foreground font-medium">
  Baseline confirmed.
</p>
<p className="text-sm text-muted-foreground">
  Your home's assumptions are validated against current conditions.
</p>
{/* Next review indicator */}
<p className="text-xs text-muted-foreground/70 mt-2">
  Next scheduled review: {nextReviewMonth}
</p>
```

**New prop added:**
```typescript
interface SystemWatchProps {
  // ... existing props
  nextReviewMonth?: string; // "March" | "June" etc.
}
```

**Why this works:**
- "Validated" = active confirmation, not passive monitoring
- "Baseline confirmed" = acknowledgment, not dismissal
- Next review = time is moving under supervision

---

## Part 3: New Components

### 1. `MonthlyConfirmationCard.tsx`

**Purpose:** 30-second monthly check-in. Non-anxious, dismissible.

```typescript
interface MonthlyConfirmationCardProps {
  homeId: string;
  onResponse: (response: MonthlyResponse) => void;
  onDismiss: () => void;
}

type MonthlyResponse = 'nothing_changed' | 'system_replaced' | 'renovation' | 'insurance_update';
```

**UI Copy (Validation Language):**
```tsx
<p className="text-sm text-foreground font-medium">
  This month's validation
</p>
<p className="text-sm text-muted-foreground">
  Habitta's assumptions remain consistent with conditions.
  Has anything changed that we wouldn't see?
</p>
```

**Display Rules:**
- Only for `home_state === 'healthy'`
- Once per calendar month
- Suppressed if quarterly card active
- Suppressed if planning state exists
- Response quietly increments `confidence += 0.01`

### 2. `QuarterlyPositionCard.tsx`

**Purpose:** Comparative intelligence that creates pull (curiosity, not duty).

```typescript
interface QuarterlyPositionCardProps {
  position: QuarterlyPosition;
  homeId: string;
  onDismiss: () => void;
}

interface QuarterlyPosition {
  agingRate: 'better' | 'average' | 'faster';
  percentile: number;
  environmentalStress: 'normal' | 'elevated' | 'low';
  maintenanceSignalStrength: 'high' | 'medium' | 'low';
  positionChanged: boolean;
}
```

**UI:**
- Header: "Quarterly Home Position"
- Three metric rows with subtle indicators
- Footer: "Position unchanged this quarter" or "Position improved"
- **No action required** — just awareness

**Display Rules:**
- Once per quarter (background job trigger)
- Suppressed if planning state active
- If nothing changed, card still appears (that's the point)

### 3. `StateOfHomeReport.tsx` (QA Refinement #1 — Bond Mechanism)

**Purpose:** Annual stewardship briefing that **creates structural bond**.

**The bond is explicit:** This report shows what Habitta filtered out — accumulated context that is expensive to recreate.

**Sections:**
1. **What held steady** — systems that performed as expected
2. **What aged slightly** — normal wear, no concern
3. **What Habitta filtered out** — noise you didn't need to see (THIS IS THE BOND)
4. **Confidence trajectory** — year-over-year improvement

**Section 3 ("What Habitta filtered out") makes the bond mechanical:**
```tsx
<div className="space-y-2">
  <h4 className="text-sm font-medium text-muted-foreground">
    What Habitta filtered out this year
  </h4>
  <ul className="text-sm text-muted-foreground space-y-1">
    {filteredItems.map(item => (
      <li key={item.id} className="flex items-start gap-2">
        <span className="text-muted-foreground/50">—</span>
        <span>{item.description}</span>
      </li>
    ))}
  </ul>
  <p className="text-xs text-muted-foreground/70 italic">
    This accumulated context makes your baseline increasingly precise.
  </p>
</div>
```

**Display Rules:**
- Once per year (onboarding anniversary)
- Always runs, never suppressed
- Feels printable, official

### 4. `OptionalAdvantageCard.tsx`

**Purpose:** Surface timing-advantaged opportunities without sales pressure.

**Display Rules:**
- Only when `home_state === 'healthy'`
- Only when `confidence >= 0.8`
- Only when external signal favors homeowner
- Max 1 shown at a time
- Not repeated for 90 days after dismissal

**Examples:**
- "Insurance conditions this quarter are favorable for homes like yours."
- "You're in a low-stress HVAC pricing window."
- "Comparable homes are over-maintaining. You are not."

### 5. `MapEnvironmentOverlay.tsx`

**Purpose:** Ambient environmental confirmation on PropertyMap.

**Overlay badges:**
- "Seasonal heat stress: normal"
- "No abnormal permit activity"
- "No storm-related signals"

**Placement:** Bottom-right corner, small muted badges, stacked vertically.

---

## Part 4: HomeHealthCard Modification

**File:** `src/components/HomeHealthCard.tsx`

### Current CTA (Line 175):
```tsx
<Button onClick={handleProtectClick}>
  What should I do next?
</Button>
```

### Target — Conditional CTA Based on Home State:

```tsx
<Button onClick={handleProtectClick}>
  {isHealthyState 
    ? "What's Habitta validating right now?"
    : "What should I do next?"}
</Button>
```

**New prop:**
```typescript
interface HomeHealthCardProps {
  // ... existing props
  isHealthyState?: boolean; // From home_review_state.home_state
}
```

**Expanded section for healthy homes shows:**
- Systems under passive validation
- Environmental factors in scope
- What is explicitly not worth thinking about

---

## Part 5: Copy Governance Extensions

**File:** `src/lib/dashboardCopy.ts`

### Add Stewardship Cadence Copy

```typescript
// ============ STEWARDSHIP CADENCE COPY ============

export interface StewardshipCopy {
  systemWatchHealthy: {
    headline: string;
    subtext: string;
    nextReviewText: (month: string) => string;
  };
  monthlyValidation: {
    headline: string;
    prompt: string;
    responses: Record<MonthlyResponse, string>;
    dismissText: string;
  };
  quarterlyPosition: {
    header: string;
    positionUnchanged: string;
    positionImproved: string;
    agingRateLabels: Record<'better' | 'average' | 'faster', string>;
  };
  healthCardHealthyMode: {
    ctaLabel: string;
    expandedHeader: string;
    passiveValidationLabel: string;
    notWorthThinkingLabel: string;
  };
  annualBrief: {
    header: string;
    filteredOutHeader: string;
    filteredOutFooter: string;
    accumulatedContextNote: string;
  };
}

export function getStewardshipCopy(): StewardshipCopy {
  return {
    systemWatchHealthy: {
      headline: 'Baseline confirmed.',
      subtext: 'Your home\'s assumptions are validated against current conditions.',
      nextReviewText: (month) => `Next scheduled review: ${month}`,
    },
    monthlyValidation: {
      headline: 'This month\'s validation',
      prompt: 'Habitta\'s assumptions remain consistent. Has anything changed that we wouldn\'t see?',
      responses: {
        nothing_changed: 'Nothing changed',
        system_replaced: 'System replaced',
        renovation: 'Renovation',
        insurance_update: 'Insurance update',
      },
      dismissText: 'Skip this month',
    },
    quarterlyPosition: {
      header: 'Quarterly Home Position',
      positionUnchanged: 'Position unchanged this quarter.',
      positionImproved: 'Position improved this quarter.',
      agingRateLabels: {
        better: 'Aging slower than similar homes',
        average: 'Aging at typical rate',
        faster: 'Aging faster than similar homes',
      },
    },
    healthCardHealthyMode: {
      ctaLabel: 'What\'s Habitta validating right now?',
      expandedHeader: 'Active Validation',
      passiveValidationLabel: 'Systems under continuous validation',
      notWorthThinkingLabel: 'What is explicitly not worth thinking about',
    },
    annualBrief: {
      header: 'State of the Home',
      filteredOutHeader: 'What Habitta filtered out this year',
      filteredOutFooter: 'This accumulated context makes your baseline increasingly precise.',
      accumulatedContextNote: 'This history is unique to your home and would be expensive to recreate.',
    },
  };
}
```

---

## Part 6: MiddleColumn Integration

**File:** `src/components/dashboard-v3/MiddleColumn.tsx`

### Add Cadence Card Rendering

Between SystemWatch and HomeHealthCard, add conditional cadence cards:

```tsx
{/* Cadence Cards - Priority ordering */}
{annualCard && (
  <section>
    <StateOfHomeReport data={annualCard} onDismiss={handleAnnualDismiss} />
  </section>
)}

{!annualCard && quarterlyCard && (
  <section>
    <QuarterlyPositionCard position={quarterlyCard} homeId={propertyId} onDismiss={handleQuarterlyDismiss} />
  </section>
)}

{!annualCard && !quarterlyCard && monthlyCard && (
  <section>
    <MonthlyConfirmationCard homeId={propertyId} onResponse={handleMonthlyResponse} onDismiss={handleMonthlyDismiss} />
  </section>
)}

{advantageCard && (
  <section>
    <OptionalAdvantageCard advantage={advantageCard} homeId={propertyId} onDismiss={handleAdvantageDismiss} />
  </section>
)}
```

**Priority ordering enforced:**
- Annual suppresses all others
- Quarterly suppresses monthly
- Planning state suppresses all cadence cards

---

## Part 7: New Hook

**File:** `src/hooks/useEngagementCadence.ts`

```typescript
interface UseEngagementCadenceReturn {
  // Cards to display
  monthlyCard: MonthlyCardData | null;
  quarterlyCard: QuarterlyCardData | null;
  annualCard: AnnualBriefData | null;
  advantageCard: AdvantageData | null;
  
  // Home state
  homeState: 'healthy' | 'monitoring' | 'planning';
  nextScheduledReview: string;
  
  // Actions
  respondToMonthly: (response: MonthlyResponse) => Promise<void>;
  dismissQuarterly: () => Promise<void>;
  dismissAdvantage: () => Promise<void>;
  
  loading: boolean;
}

export function useEngagementCadence(homeId: string): UseEngagementCadenceReturn {
  // Fetch from edge function
  // Cache in React Query
  // Handle mutations
}
```

---

## Part 8: Edge Function

**File:** `supabase/functions/engagement-cadence/index.ts`

**Endpoints:**
- `GET /engagement-cadence?home_id={id}` — Returns applicable cadence cards
- `POST /engagement-cadence` — Log interaction response

**Core Logic:**
```typescript
async function getApplicableCadence(homeId: string): Promise<CadenceResult> {
  const reviewState = await getReviewState(homeId);
  const homeState = await deriveHomeState(homeId);
  
  // Planning overrides everything
  if (homeState === 'planning') {
    return { cards: [], suppressReason: 'planning_active' };
  }
  
  const cards: CadenceCard[] = [];
  
  // Annual (highest priority)
  if (isAnnualDue(reviewState)) {
    cards.push({ type: 'annual', data: await buildAnnualBrief(homeId) });
    return { cards }; // Suppresses others
  }
  
  // Quarterly
  if (isQuarterlyDue(reviewState)) {
    cards.push({ type: 'quarterly', data: await buildQuarterlyPosition(homeId) });
    return { cards }; // Suppresses monthly
  }
  
  // Monthly
  if (isMonthlyDue(reviewState)) {
    cards.push({ type: 'monthly', data: null });
  }
  
  // Optional advantage
  if (homeState === 'healthy' && reviewState.confidence >= 0.8) {
    const advantage = await checkForAdvantage(homeId);
    if (advantage) cards.push({ type: 'advantage', data: advantage });
  }
  
  return { cards };
}
```

---

## Files Summary

| File | Action | Scope |
|------|--------|-------|
| `supabase/migrations/YYYYMMDD_engagement_cadence.sql` | **Create** | New tables |
| `supabase/functions/engagement-cadence/index.ts` | **Create** | Cadence evaluation logic |
| `src/components/dashboard-v3/MonthlyConfirmationCard.tsx` | **Create** | Monthly check-in UI |
| `src/components/dashboard-v3/QuarterlyPositionCard.tsx` | **Create** | Quarterly intelligence UI |
| `src/components/dashboard-v3/StateOfHomeReport.tsx` | **Create** | Annual briefing UI |
| `src/components/dashboard-v3/OptionalAdvantageCard.tsx` | **Create** | Timing-advantaged opportunities |
| `src/components/dashboard-v3/MapEnvironmentOverlay.tsx` | **Create** | Environmental signals overlay |
| `src/hooks/useEngagementCadence.ts` | **Create** | Cadence data hook |
| `src/lib/dashboardCopy.ts` | **Modify** | Add stewardship copy functions |
| `src/components/dashboard-v3/SystemWatch.tsx` | **Modify** | Replace "all clear" copy with validation language |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Modify** | Integrate cadence cards |
| `src/components/dashboard-v3/PropertyMap.tsx` | **Modify** | Add environmental overlays |
| `src/components/HomeHealthCard.tsx` | **Modify** | Conditional CTA for healthy homes |
| `supabase/functions/intelligence-engine/index.ts` | **Modify** | Add home state derivation |
| `src/components/dashboard-v3/index.ts` | **Modify** | Export new components |

---

## Acceptance Tests

### QA Refinement Validation
- [ ] No copy uses "watching" or "monitored" — all replaced with "validated" / "confirmation"
- [ ] Annual brief explicitly shows "What Habitta filtered out" section
- [ ] Annual brief includes note about accumulated context being expensive to recreate
- [ ] StateOfHomeReport renders filteredItems list with accumulated context footer

### SystemWatch Healthy State
- [ ] Shows "Baseline confirmed" (not "All systems healthy")
- [ ] Shows "validated against current conditions" (not "nothing for 7 years")
- [ ] Shows next scheduled review month
- [ ] Retains emerald styling

### Monthly Validation
- [ ] Uses "validation" language, not "confirmation" or "check-in"
- [ ] Appears only for healthy homes
- [ ] Suppressed when quarterly/annual active
- [ ] Response increments confidence by 0.01

### Quarterly Position
- [ ] Shows aging rate vs similar homes
- [ ] Shows environmental stress level
- [ ] "Position unchanged" appears when nothing changed
- [ ] Suppressed when planning state active

### Annual Briefing
- [ ] Shows "What held steady"
- [ ] Shows "What Habitta filtered out" (the bond mechanism)
- [ ] Shows confidence trajectory
- [ ] Includes "accumulated context" note
- [ ] Never suppressed

### Home State Derivation
- [ ] `planning` when any system <= 7 years remaining
- [ ] `monitoring` when elevated signals present
- [ ] `healthy` otherwise

---

## Product Philosophy (Immutable — Now Anchored)

> **Habitta is not a to-do app.**
> 
> It is a **continuously validating second brain** for the home.
> 
> Users return to **confirm their position remains valid**, not to complete tasks.
> 
> **The bond is structural:** Accumulated context — including what didn't matter — is expensive to walk away from. This history is unique to each home and cannot be recreated elsewhere.
> 
> **Validation, not surveillance:** Habitta doesn't "watch" the home. It continuously **validates the homeowner's assumptions** about their property.

This philosophy is now **operationally enforced** through:
1. Copy governance (validation language)
2. Annual brief structure (filtered-out section)
3. Accumulated context disclosure (bond mechanism)
4. Cadence rhythm (monthly/quarterly/annual)
