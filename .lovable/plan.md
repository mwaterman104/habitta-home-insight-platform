

# Fix System Outlook Lifecycle Position Calculation

## Problem Summary

The System Outlook timeline shows a 2-year-old HVAC in the "WATCH" zone, while the System Detail page correctly shows it in the "OK" zone. This is a significant trust failure — the same system appears in different lifecycle states depending on which view the user looks at.

**Root cause identified in `BaselineSurface.tsx` (lines 173-193):**

```typescript
function getTimelinePosition(system: BaselineSystem): number {
  const months = system.monthsRemaining;
  
  // Map months remaining to position
  const maxMonths = 300; // 25 years  <-- PROBLEM: Fixed scale doesn't respect system-specific lifespans
  const normalized = Math.min(100, Math.max(0, (months / maxMonths) * 100));
  return 100 - normalized;
}
```

**Result for a 2-year-old HVAC:**
- **LifespanProgressBar (System Detail):** 2/15 = **13%** → "OK" ✓
- **BaselineSurface (System Outlook):** 100 - (84/300) = **72%** → "WATCH" ✗

The fixed 300-month (25-year) scale treats all systems identically and causes young HVAC systems (which have ~15-year lifespans) to appear artificially advanced.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard-v3/BaselineSurface.tsx` | Replace `getTimelinePosition()` logic, update `getZoneFromPosition()` thresholds |
| `src/components/dashboard-v3/MiddleColumn.tsx` | Compute `expectedLifespan` for ALL systems with install year (not just permit-verified) |

---

## Technical Changes

### 1. Fix `getTimelinePosition()` in BaselineSurface.tsx (lines 173-193)

**Current (broken):**
```typescript
function getTimelinePosition(system: BaselineSystem): number {
  const months = system.monthsRemaining;
  if (months === undefined) {
    switch (system.state) { ... }
  }
  const maxMonths = 300; // Fixed 25-year scale
  const normalized = Math.min(100, Math.max(0, (months / maxMonths) * 100));
  return 100 - normalized;
}
```

**New (unified algorithm):**
```typescript
/**
 * CANONICAL LIFECYCLE POSITION ALGORITHM
 * 
 * Position = (ageYears / expectedLifespan) * 100
 * 
 * This must match LifespanProgressBar (System Detail view).
 * Authority affects confidence, not positioning.
 */
function getTimelinePosition(system: BaselineSystem): number {
  // PRIMARY: Use age-based positioning (% of lifespan consumed)
  if (
    system.ageYears !== undefined &&
    system.expectedLifespan !== undefined &&
    system.expectedLifespan > 0
  ) {
    const consumedPercent = (system.ageYears / system.expectedLifespan) * 100;
    return Math.min(100, Math.max(0, consumedPercent));
  }
  
  // FALLBACK: Use months remaining with system-specific typical lifespans
  if (system.monthsRemaining !== undefined) {
    const TYPICAL_LIFESPANS: Record<string, number> = {
      hvac: 180,           // 15 years
      roof: 300,           // 25 years
      water_heater: 144,   // 12 years
    };
    
    // Extract base system type from key (e.g., 'hvac_unit_1' → 'hvac')
    const baseKey = system.key.split('_')[0];
    const typicalLifespanMonths = TYPICAL_LIFESPANS[baseKey] ?? 180;
    
    const monthsConsumed = typicalLifespanMonths - system.monthsRemaining;
    const consumedPercent = (monthsConsumed / typicalLifespanMonths) * 100;
    return Math.min(100, Math.max(0, consumedPercent));
  }
  
  // FINAL FALLBACK: State-based positioning
  switch (system.state) {
    case 'stable': return 30;
    case 'baseline_incomplete': return 50;
    case 'planning_window': return 75;
    case 'elevated': return 90;
  }
}
```

### 2. Update Zone Thresholds in BaselineSurface.tsx (lines 198-202)

**Current:**
```typescript
function getZoneFromPosition(position: number): Zone {
  if (position < 33.33) return 'ok';
  if (position < 66.66) return 'watch';
  return 'plan';
}
```

**New (60/80 thresholds per doctrine):**
```typescript
/**
 * CANONICAL ZONE THRESHOLDS
 * 
 * OK:    0–60%  (Early life)
 * WATCH: 60–80% (Mid-life awareness)
 * PLAN:  80–100%+ (Late-life planning)
 */
const ZONE_THRESHOLDS = {
  OK_MAX: 60,
  WATCH_MAX: 80,
} as const;

function getZoneFromPosition(position: number): Zone {
  if (position < ZONE_THRESHOLDS.OK_MAX) return 'ok';
  if (position < ZONE_THRESHOLDS.WATCH_MAX) return 'watch';
  return 'plan';
}
```

### 3. Compute `expectedLifespan` for ALL Systems in MiddleColumn.tsx (lines 157-161)

**Current (only permit-verified):**
```typescript
const isPermitVerified = sys.installSource === 'permit';
const expectedLifespan = isPermitVerified && sys.installYear
  ? sys.replacementWindow.lateYear - sys.installYear
  : undefined;
```

**New (all systems with install year):**
```typescript
// Calculate expected lifespan from replacement window
// For permit-verified: use late year (conservative upper bound)
// For all others: use likely year (typical midpoint)
const isPermitVerified = sys.installSource === 'permit';
let expectedLifespan: number | undefined;

if (sys.installYear) {
  if (isPermitVerified) {
    // Permit-verified: conservative upper bound
    expectedLifespan = sys.replacementWindow.lateYear - sys.installYear;
  } else {
    // All other sources: typical midpoint
    expectedLifespan = sys.replacementWindow.likelyYear - sys.installYear;
  }
}
```

---

## Expected Results

| System | Age | Expected Lifespan | Position | Zone |
|--------|-----|-------------------|----------|------|
| HVAC (2 years old) | 2 | ~15 years | 13% | **OK** ✓ |
| HVAC (10 years old) | 10 | ~15 years | 67% | **WATCH** |
| HVAC (13 years old) | 13 | ~15 years | 87% | **PLAN** |
| Roof (5 years old) | 5 | ~25 years | 20% | **OK** |
| Water Heater (8 years old) | 8 | ~12 years | 67% | **WATCH** |

The 2-year-old HVAC will now correctly appear in the "OK" zone on both the System Outlook and System Detail pages.

---

## Verification Checklist

After implementation:
- [ ] 2-year-old HVAC shows in "OK" zone on System Outlook
- [ ] System Outlook and System Detail page positions are visually consistent
- [ ] Zone tooltips still correctly describe thresholds (will need update to "0–60%", "60–80%", "80–100%+")
- [ ] Systems approaching end-of-life still show in "PLAN" zone correctly
- [ ] Systems with no age data fall back gracefully to state-based positioning
- [ ] The `CalculationDisclosure` component already describes the correct formula ("Position = Current Age ÷ Expected Lifespan × 100")

---

## Doctrinal Lock

This establishes a single lifecycle truth. Any future feature that visualizes system age must consume this same model:

```
Position = (ageYears / expectedLifespanYears) * 100
```

If two views ever disagree again, it's a bug — not a debate.

