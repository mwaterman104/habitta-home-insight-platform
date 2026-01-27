
# Equity Position Card — Implementation Plan

## Overview

Upgrade the existing `EquityContextCard` to the doctrine-compliant `EquityPositionCard` with 3-layer structure (Market Context, Financing Posture, What This Enables) and wire up the data pipeline from `DashboardV3.tsx`.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/equityPosition.ts` | **Create** | Pure derivation logic (LTV → Posture) |
| `src/lib/equityCopy.ts` | **Create** | Centralized copy governance |
| `src/components/dashboard-v3/EquityPositionCard.tsx` | **Create** | 3-layer card component (replaces EquityContextCard) |
| `src/components/dashboard-v3/EquityContextCard.tsx` | **Delete** | Superseded by EquityPositionCard |
| `src/components/dashboard-v3/index.ts` | **Modify** | Update exports |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Modify** | Update props + component usage |
| `src/pages/DashboardV3.tsx` | **Modify** | Wire up property + financial data |
| `src/lib/dashboardGovernance.ts` | **Modify** | Update HERO_COMPONENTS registry |

---

## Part 1: Derivation Logic

**File:** `src/lib/equityPosition.ts`

### Types

```text
FinancingPosture = 'Majority financed' | 'Balanced ownership' | 'Largely owned'

EquityConfidence = 'High' | 'Moderate' | 'Early'
```

### Functions

```text
deriveFinancingPosture(marketValue, mortgageBalance)
  - Returns null if either input is null
  - LTV > 0.7 → 'Majority financed'
  - LTV > 0.4 → 'Balanced ownership'
  - LTV ≤ 0.4 → 'Largely owned'

deriveEquityConfidence(hasMarketValue, hasMortgageData, mortgageSource)
  - Returns 'High' if both values from public records
  - Returns 'Moderate' if market value exists but mortgage inferred
  - Returns 'Early' if missing data
```

**Key Rule:** No UI logic here. No copy. No rendering.

---

## Part 2: Copy Governance

**File:** `src/lib/equityCopy.ts`

### Functions

```text
getEquityEnablementLine(posture)
  - 'Majority financed' → 'This position typically supports limited financing flexibility.'
  - 'Balanced ownership' → 'This position typically supports optional financing flexibility.'
  - 'Largely owned' → 'This position provides strong financial flexibility.'
  - null → 'This ownership profile is still being established.'

getPostureInferenceNote()
  - Returns: 'Financing posture inferred from public records'

getMarketContextLabel()
  - Returns: 'Market Context'
```

**Key Rule:** No conditionals in JSX. All copy comes from here.

---

## Part 3: EquityPositionCard Component

**File:** `src/components/dashboard-v3/EquityPositionCard.tsx`

### Props (Locked)

```text
marketValue: number | null
financingPosture: FinancingPosture | null
confidence: EquityConfidence
city?: string | null
state?: string | null
onViewMarketContext?: () => void
```

### Visual Structure

```text
┌──────────────────────────────────────────────┐
│  EQUITY POSITION                             │
│                                              │
│  Market Context                   (subhead)  │
│  ~$650,000                     (softened $)  │
│                                              │
│  Financing Posture                (subhead)  │
│  Balanced ownership          (qualitative)   │
│                                              │
│  What this enables                (subhead)  │
│  This position typically supports optional   │
│  financing beyond routine maintenance.       │
│                                              │
│  Confidence: Moderate        (quiet footer)  │
│  [View market context]        (link, no CTA) │
└──────────────────────────────────────────────┘
```

### Rendering Rules (Hard)

- Market value formatted with `~` prefix (softened precision)
- No raw mortgage balance shown
- No equity subtraction math visible
- Posture shown as qualitative label only
- "What this enables" from copy module
- Confidence always present, never emphasized
- "View market context" link only (no action CTAs)

### Empty States

- `marketValue === null` → "Value context unavailable"
- `financingPosture === null` → "Financing posture unavailable"

### Specificity Level

```text
SPECIFICITY LEVEL: Hero (2)

ALLOWED: Value number (softened), posture label, enablement statement, confidence text
PROHIBITED: Raw debt numbers, equity math, percentages, action CTAs, "What If" toggles
```

---

## Part 4: MiddleColumn Update

**File:** `src/components/dashboard-v3/MiddleColumn.tsx`

### Props Update

```typescript
// Remove
homeValue?: number | null;

// Add
marketValue?: number | null;
mortgageBalance?: number | null;
mortgageConfidence?: 'inferred' | 'public_records' | null;
```

### Component Swap

```text
// Before
<EquityContextCard
  currentValue={homeValue}
  areaContext="..."
/>

// After
<EquityPositionCard
  marketValue={marketValue}
  financingPosture={deriveFinancingPosture(marketValue, mortgageBalance)}
  confidence={deriveEquityConfidence(!!marketValue, !!mortgageBalance, mortgageConfidence)}
  city={city}
  state={state}
/>
```

---

## Part 5: DashboardV3 Data Wiring

**File:** `src/pages/DashboardV3.tsx`

### Add Imports

```typescript
import { useSmartyPropertyData } from '@/hooks/useSmartyPropertyData';
```

### Add Hook Call

```typescript
// Property valuation is fetched once here and passed down.
// Do not call useSmartyPropertyData in child components.
const { data: propertyData, loading: propertyLoading } = useSmartyPropertyData();
```

### Update All 3 MiddleColumn Instances

**Mobile (~line 388):**
```typescript
<MiddleColumn
  ...existing props...
  marketValue={propertyData?.currentValue ?? null}
  mortgageBalance={propertyData?.estimatedMortgageBalance ?? null}
  mortgageConfidence={propertyData?.estimatedMortgageBalance ? 'inferred' : null}
  city={userHome?.city ?? null}
  state={userHome?.state ?? null}
/>
```

**Desktop XL (~line 449):**
Same prop additions.

**Desktop LG (~line 498):**
Same prop additions.

---

## Part 6: Governance Update

**File:** `src/lib/dashboardGovernance.ts`

### Update HERO_COMPONENTS

```typescript
export const HERO_COMPONENTS = [
  'HomePositionAnchor',   // Primary hero
  'EquityPositionCard',   // Secondary hero (renamed from EquityContextCard)
] as const;
```

---

## Data Flow Diagram

```text
DashboardV3
    │
    ├─► useSmartyPropertyData()
    │       ├─► currentValue: 650000
    │       └─► estimatedMortgageBalance: 320000
    │
    └─► MiddleColumn
            ├─► marketValue={650000}
            ├─► mortgageBalance={320000}
            │
            └─► EquityPositionCard
                    │
                    ├─► deriveFinancingPosture(650000, 320000)
                    │       └─► LTV = 0.49 → 'Balanced ownership'
                    │
                    ├─► deriveEquityConfidence(true, true, 'inferred')
                    │       └─► 'Moderate'
                    │
                    └─► Display:
                            ~$650,000
                            Balanced ownership
                            "This position typically supports optional financing flexibility."
                            Confidence: Moderate
```

---

## QA Gates (Blockers)

Before merging, verify:

- [ ] No percentages shown on card
- [ ] No dollar subtraction logic visible (no "Equity: $X")
- [ ] No raw mortgage balance displayed
- [ ] No "what if" language
- [ ] No urgency verbs (do, act, start, now)
- [ ] No refresh animations
- [ ] Market value uses `~` prefix
- [ ] Posture is qualitative only
- [ ] "What this enables" copy from centralized module
- [ ] Confidence always present
- [ ] EquityPositionCard never renders without HomePositionAnchor
- [ ] Works on mobile, desktop xl, and desktop lg layouts

---

## Doctrine Compliance Checklist

- [ ] Equity information increases understanding, never motivation
- [ ] No user should feel tempted to "act" after seeing the card
- [ ] Dollar math belongs only in Chat or explicit planning modes
- [ ] Value feels secondary to Home Position
- [ ] 30-day refresh cadence preserved

---

## Acceptance Criteria

- [ ] Market value displayed with softened precision (~$650,000)
- [ ] Financing posture shown qualitatively (Balanced ownership)
- [ ] "What this enables" line appears below posture
- [ ] Confidence surfaced quietly at bottom
- [ ] "View market context" link functional
- [ ] Graceful fallback when data unavailable
- [ ] Respects 30-day refresh cadence
- [ ] Equity never appears without Home Position Anchor
