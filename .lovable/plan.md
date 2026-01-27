
# Fix Equity Position Card Data Pipeline — Doctrine-Compliant Implementation

## Overview

Replace the current heuristic-based fallback with a state-based model that never fabricates dollar values. When valuation is unavailable, the card surfaces honest state information instead of invented numbers.

## Core Principle

**Habitta never fabricates dollar values on the dashboard.**

When valuation confidence is insufficient, Habitta surfaces state, not numbers.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/equityPosition.ts` | **Modify** | Add `MarketValueState` type, update confidence derivation |
| `src/lib/equityCopy.ts` | **Modify** | Add copy for unverified/unknown states |
| `src/hooks/useSmartyPropertyData.ts` | **Modify** | Remove all heuristic math, add state-based output |
| `src/components/dashboard-v3/EquityPositionCard.tsx` | **Modify** | Handle all 3 valuation states in render |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Modify** | Update prop types for new data model |
| `src/pages/DashboardV3.tsx` | **Modify** | Pass `marketValueState` to MiddleColumn |

---

## Part 1: Type System Update

**File:** `src/lib/equityPosition.ts`

### Add New Type

```typescript
export type MarketValueState =
  | 'verified'      // Authoritative API value
  | 'unverified'    // APIs unavailable, ownership context exists
  | 'unknown';      // Insufficient data
```

### Update Confidence Derivation

Add support for market value state in confidence logic:

```typescript
export function deriveEquityConfidence(
  hasMarketValue: boolean,
  hasMortgageData: boolean,
  mortgageSource: MortgageSource,
  marketValueState?: MarketValueState
): EquityConfidence {
  // Unverified or unknown always returns Early
  if (marketValueState === 'unverified' || marketValueState === 'unknown') {
    return 'Early';
  }
  // ... existing logic for verified values
}
```

---

## Part 2: Copy Governance Update

**File:** `src/lib/equityCopy.ts`

### Add State-Specific Copy Functions

```typescript
/**
 * Get market context display based on valuation state.
 */
export function getMarketContextDisplay(
  marketValueState: MarketValueState
): string {
  switch (marketValueState) {
    case 'verified':
      return ''; // Will show actual value
    case 'unverified':
      return 'Market value not yet established';
    case 'unknown':
      return 'Insufficient data to establish market context';
  }
}

/**
 * Get enablement line for unverified posture.
 */
export function getUnverifiedEnablementLine(
  posture: FinancingPosture | null
): string {
  if (!posture) {
    return 'Additional property data would improve financial insight.';
  }
  return 'This ownership profile typically supports optional financing, pending market verification.';
}
```

---

## Part 3: Hook Refactor (Critical)

**File:** `src/hooks/useSmartyPropertyData.ts`

### What Gets REMOVED (Doctrine Violation)

```typescript
// DELETE: Appreciation math
const appreciationRate = 0.04;
const currentValue = lastSale * Math.pow(1 + appreciationRate, yearsSinceSale);

// DELETE: Mortgage estimation
const estimatedMortgageBalance = lastSale * 0.8 * Math.pow(0.97, yearsSinceSale);

// DELETE: Equity calculation
estimatedEquity: Math.round((currentValue || 0) - (estimatedMortgageBalance || 0)),
```

### New Output Interface

```typescript
export interface PropertyEquityOutput {
  marketValue: number | null;
  marketValueState: MarketValueState;
  mortgageBalance: number | null;
  mortgageSource: MortgageSource;
  // Preserve non-equity property data
  yearBuilt: number | null;
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  lotSize: number | null;
  propertyType: string | null;
}
```

### New Logic Flow

```text
1. Try: smartyEnrich() or smartyFinancial() for AVM/market value
   ├─► Success: marketValue = value, marketValueState = 'verified'
   └─► Fail: continue

2. Check: Do we have ownership context? (yearBuilt, state, etc.)
   ├─► Yes: marketValue = null, marketValueState = 'unverified'
   └─► No: marketValue = null, marketValueState = 'unknown'
```

### Doctrine Guardrail Comment

```typescript
/**
 * NOTE (Doctrine Guardrail):
 * This hook must NEVER fabricate or estimate market dollar values.
 * When authoritative valuation is unavailable, return state — not numbers.
 * Heuristic estimates may only appear in chat or exploration views.
 */
```

---

## Part 4: Component Update

**File:** `src/components/dashboard-v3/EquityPositionCard.tsx`

### Updated Props

```typescript
interface EquityPositionCardProps {
  marketValue: number | null;
  marketValueState: MarketValueState;  // NEW
  financingPosture: FinancingPosture | null;
  confidence: EquityConfidence;
  city?: string | null;
  state?: string | null;
  onViewMarketContext?: () => void;
  className?: string;
}
```

### Three Rendering Paths

**Case 1: `marketValueState === 'verified'`**
```text
Market Context
~$650k

Financing Posture
Balanced ownership

What this enables
This position typically supports optional financing flexibility.

Confidence: Moderate
```

**Case 2: `marketValueState === 'unverified'`**
```text
Market Context
Market value not yet established

Financing Posture
Balanced ownership (inferred)

What this enables
This ownership profile typically supports optional financing,
pending market verification.

Confidence: Early
```

**Case 3: `marketValueState === 'unknown'`**
```text
Equity Position
Insufficient data to establish equity context.

What this enables
Additional property data would improve financial insight.

Confidence: Early
```

---

## Part 5: Data Wiring Update

**File:** `src/components/dashboard-v3/MiddleColumn.tsx`

### Update Props Interface

```typescript
interface MiddleColumnProps {
  // ... existing props
  
  // Replace old props:
  // marketValue?: number | null;
  // mortgageBalance?: number | null;
  // mortgageConfidence?: MortgageSource;
  
  // With new contract:
  marketValue?: number | null;
  marketValueState?: MarketValueState;
  mortgageBalance?: number | null;
  mortgageSource?: MortgageSource;
  city?: string | null;
  state?: string | null;
}
```

### Update EquityPositionCard Usage

```typescript
<EquityPositionCard
  marketValue={marketValue ?? null}
  marketValueState={marketValueState ?? 'unknown'}
  financingPosture={deriveFinancingPosture(marketValue ?? null, mortgageBalance ?? null)}
  confidence={deriveEquityConfidence(
    !!marketValue, 
    !!mortgageBalance, 
    mortgageSource ?? null,
    marketValueState
  )}
  city={city}
  state={state}
/>
```

**File:** `src/pages/DashboardV3.tsx`

### Update MiddleColumn Calls

All three MiddleColumn instances (mobile, xl, lg) updated to pass:

```typescript
<MiddleColumn
  ...existing props...
  marketValue={propertyData?.marketValue ?? null}
  marketValueState={propertyData?.marketValueState ?? 'unknown'}
  mortgageBalance={propertyData?.mortgageBalance ?? null}
  mortgageSource={propertyData?.mortgageSource ?? null}
  city={userHome?.city ?? null}
  state={userHome?.state ?? null}
/>
```

---

## Data Flow After Fix

```text
DashboardV3
    │
    └─► useSmartyPropertyData()
            │
            ├─► Try: smartyFinancial() → FAILS (not found)
            ├─► Try: smartyEnrich() → FAILS (subscription)
            │
            └─► Check: homeContext exists? (yearBuilt: 2012, state: "FL")
                    │
                    └─► Yes: Return {
                            marketValue: null,
                            marketValueState: 'unverified',
                            mortgageBalance: null,
                            mortgageSource: null
                        }
            
    └─► MiddleColumn
            └─► marketValueState = 'unverified'
                    └─► Display:
                            "Market value not yet established"
                            (No financing posture - requires value)
                            "Additional property data would improve financial insight."
                            Confidence: Early
```

---

## What This Fix Does NOT Do

- Does not estimate PSF
- Does not assume square footage
- Does not apply depreciation curves
- Does not invent values
- Does not guess ranges on the dashboard

Heuristics are allowed only downstream (chat, exploration views).

---

## QA Gates

- [ ] No heuristic dollar values on dashboard
- [ ] Market value shown only when `verified`
- [ ] Financing posture may appear with `(inferred)` label when unverified
- [ ] Confidence reflects verification state
- [ ] No subtraction math visible
- [ ] Works across mobile, xl, lg layouts
- [ ] Chat can still provide rough ranges when asked

---

## Doctrine Compliance Checklist

- [ ] Equity information increases understanding, never motivation
- [ ] No user should feel tempted to "act" after seeing the card
- [ ] Dollar math belongs only in Chat or explicit planning modes
- [ ] Value feels secondary to Home Position
- [ ] 30-day refresh cadence preserved for verified values

---

## Acceptance Criteria

- [ ] Verified state: Shows softened value (~$650k) + posture + enablement
- [ ] Unverified state: Shows "not yet established" + calm explanation
- [ ] Unknown state: Shows "insufficient data" + guidance
- [ ] Confidence always present and accurate
- [ ] "View market context" link functional
- [ ] Graceful transitions between states as data becomes available
