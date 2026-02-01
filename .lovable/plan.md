

# Fix System Outlook Trust Gaps — Verified Data Visibility

## Problem Summary

The user identified critical trust gaps where **permit-verified data exists in the database** but the **UI ignores it**:

1. **System Outlook shows "Age unknown"** for HVAC with a 2025 permit
2. **Chat says "Everything is within expected ranges"** — unearned authority when baseline is incomplete
3. **CTAs say "Add installation date"** even when permit data already exists
4. **Confidence badge shows "Low"** without explaining what's verified vs. missing
5. **System Sources table shows permit** but System Outlook acts like it doesn't exist

**Root Cause**: `MiddleColumn` prioritizes `home_systems` table (user-submitted photos) over `capitalTimeline`, which already contains permit-derived, authority-resolved data with pre-formatted labels.

---

## Key Insight from capital-timeline Edge Function

The `capital-timeline` edge function **already returns everything needed**:

| Field | Example Value | Purpose |
|-------|---------------|---------|
| `installSource` | `'permit' \| 'inferred' \| 'unknown'` | Authority source for UI badge |
| `installYear` | `2025` | Verified install year |
| `installedLine` | `'Installed 2025 (permit-verified)'` | Pre-formatted label (UI renders blindly) |
| `confidenceScore` | `0.85` | Numeric confidence for threshold checks |
| `confidenceLevel` | `'high'` | Display-ready confidence label |

The fix is to **pass these fields through to `BaselineSystem`** and use them in the UI.

---

## Architecture Decision (User-Approved)

**Capital Timeline = Authority Source**:
- `capitalTimeline.systems` is the primary derivation path (not `home_systems`)
- `home_systems` becomes evidence-only (photos, labels)
- This removes UI epistemic drift and prevents future trust leaks

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/systemState.ts` | Rename `data_gap` → `baseline_incomplete` (phase, not failure) |
| `src/components/dashboard-v3/BaselineSurface.tsx` | Add permit-verified display, update interface, fix UnknownAgeCard |
| `src/components/dashboard-v3/MiddleColumn.tsx` | Make `capitalTimeline` primary source, pass through authority fields |
| `src/lib/chatModeCopy.ts` | Fix `generatePersonalBlurb` to check verification status |

---

## Technical Section

### 1. Rename `data_gap` → `baseline_incomplete` (Phase, Not Failure)

**File**: `src/types/systemState.ts`

The current name reads like a system failure. This is a phase — "Establishing baseline" — not a gap.

**Change**:
```typescript
// Before
export type SystemState = 
  | 'stable'
  | 'planning_window'
  | 'elevated'
  | 'data_gap';

// After
export type SystemState = 
  | 'stable'
  | 'planning_window'
  | 'elevated'
  | 'baseline_incomplete';
```

Update all references:
- `DATA_GAP_CONFIDENCE` → `BASELINE_INCOMPLETE_CONFIDENCE`
- `deriveSystemState` switch cases
- `getStateLabel` function
- Helper functions

### 2. Update BaselineSystem Interface

**File**: `src/components/dashboard-v3/BaselineSurface.tsx`

Add authority-resolved fields from capitalTimeline:

```typescript
export interface BaselineSystem {
  key: string;
  displayName: string;
  state: SystemState;
  confidence: number;
  monthsRemaining?: number;
  baselineStrength?: number;
  ageYears?: number;
  expectedLifespan?: number;
  // NEW: Authority-resolved fields from capital-timeline
  installSource?: 'permit' | 'inferred' | 'unknown';
  installYear?: number | null;
  /** Pre-formatted label from edge function - UI renders blindly */
  installedLine?: string;
}
```

### 3. Fix Baseline Systems Derivation (MiddleColumn.tsx)

**File**: `src/components/dashboard-v3/MiddleColumn.tsx`

**Current Problem** (lines 125-220):
```typescript
// PRIMARY: Use home_systems from database if available
if (homeSystems && homeSystems.length > 0) {
  // ... maps home_systems, which lacks permit data
}

// FALLBACK: Use capitalTimeline if no home_systems
if (capitalTimeline?.systems && capitalTimeline.systems.length > 0) {
  // ... maps capitalTimeline, which HAS permit data
}
```

**Fix**: Make `capitalTimeline` the primary source. It has already run authority resolution.

```typescript
const baselineSystems = useMemo<BaselineSystem[]>(() => {
  const currentYear = new Date().getFullYear();
  
  // CAPITAL TIMELINE IS SOURCE OF TRUTH for lifecycle data
  // It has already run authority resolution (permit > user > heuristic)
  if (capitalTimeline?.systems && capitalTimeline.systems.length > 0) {
    return capitalTimeline.systems.map(sys => {
      const expectedEnd = sys.replacementWindow.likelyYear;
      const yearsRemaining = expectedEnd - currentYear;
      const monthsRemaining = yearsRemaining * 12;
      
      // Age calculation from authoritative install year
      const ageYears = sys.installYear 
        ? currentYear - sys.installYear 
        : undefined;
      
      // User's tightening: Only compute expectedLifespan if permit-verified
      const isPermitVerified = sys.installSource === 'permit';
      const expectedLifespan = isPermitVerified && sys.installYear
        ? sys.replacementWindow.lateYear - sys.installYear
        : undefined; // Let inferred systems stay fuzzy
      
      // Determine state
      let state: SystemState = 'stable';
      
      if (sys.confidenceLevel === 'low' && !sys.installYear) {
        state = 'baseline_incomplete';
      } else if (monthsRemaining < 12) {
        state = 'elevated';
      } else if (monthsRemaining < PLANNING_MONTHS) {
        state = 'planning_window';
      }
      
      return {
        key: sys.systemId,
        displayName: sys.systemLabel,
        state,
        confidence: sys.confidenceScore,
        monthsRemaining: monthsRemaining > 0 ? monthsRemaining : undefined,
        // Pass through authority-resolved fields
        installSource: sys.installSource,
        installYear: sys.installYear,
        installedLine: sys.installedLine,
        ageYears,
        expectedLifespan,
        baselineStrength: sys.confidenceScore * 100,
      };
    });
  }
  
  // Fallback only if capitalTimeline unavailable
  // (should be rare once data is populated)
  return [];
}, [capitalTimeline]);
```

### 4. Add Permit-Verified Display State in BaselineSurface

**File**: `src/components/dashboard-v3/BaselineSurface.tsx`

Update `SystemCard` to show verified source:

```typescript
function SystemCard({ system, isExpanded }: SystemCardProps) {
  const position = getTimelinePosition(system);
  const zone = getZoneFromPosition(position);
  const stateLabel = getStateLabel(system.state);
  const treatment = getCardTreatment(system.baselineStrength);
  
  // NEW: Permit-verified detection
  const isPermitVerified = system.installSource === 'permit';
  
  return (
    <div className={cn(
      "rounded-lg border p-2.5 space-y-1.5 bg-white/50 transition-all duration-300",
      treatment.cardClass,
      // Verified systems get subtle emerald accent
      isPermitVerified && "border-emerald-200/60",
      isExpanded && "p-3 space-y-2"
    )}>
      <div className="flex items-center justify-between">
        <p className="font-medium text-stone-800">
          {system.displayName}
        </p>
        <div className="flex items-center gap-2">
          {/* NEW: Show permit-verified badge with year */}
          {isPermitVerified && system.installYear && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-100 text-emerald-700">
              {system.installYear} · Permit-verified
            </span>
          )}
          {/* Only show Early data badge if NOT verified */}
          {!isPermitVerified && treatment.badgeText && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", treatment.badgeClass)}>
              {treatment.badgeText}
            </span>
          )}
          <p className="text-[11px] text-stone-500">
            {stateLabel}
          </p>
        </div>
      </div>
      
      <SegmentedScale ... />
    </div>
  );
}
```

### 5. Fix UnknownAgeCard Logic and Copy

**File**: `src/components/dashboard-v3/BaselineSurface.tsx`

Update rendering decision to prevent overriding verified systems:

```typescript
// In the main component render
{systems.map(system => {
  // Show UnknownAgeCard ONLY if no install year AND no permit source
  const hasVerifiedSource = system.installSource === 'permit';
  const hasInstallYear = system.installYear != null;
  
  if (system.state === 'baseline_incomplete' && !hasInstallYear && !hasVerifiedSource) {
    return (
      <UnknownAgeCard 
        key={system.key} 
        system={system}
        isExpanded={isExpanded}
      />
    );
  }
  
  return (
    <SystemCard 
      key={system.key} 
      system={system}
      isExpanded={isExpanded}
    />
  );
})}
```

Update `UnknownAgeCard` copy to be evidence-focused:

```typescript
function UnknownAgeCard({ system, isExpanded }: UnknownAgeCardProps) {
  return (
    <div className="p-2.5 bg-stone-50 rounded-lg border-2 border-dashed border-stone-300">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-stone-800">
          {system.displayName}
        </p>
        {/* Changed from "Age unknown" to phase language */}
        <span className="text-[11px] text-stone-500">Establishing baseline</span>
      </div>
      {/* Changed from clerical "Add installation date" to evidence-first */}
      <p className="text-[11px] text-stone-600 mb-1">
        A photo of the system label helps me confirm the details
      </p>
      <button className="text-[11px] text-teal-700 underline hover:text-teal-800">
        Upload system label
      </button>
    </div>
  );
}
```

### 6. Update State Label for baseline_incomplete

**File**: `src/components/dashboard-v3/BaselineSurface.tsx` and `src/types/systemState.ts`

```typescript
function getStateLabel(state: SystemState): string {
  switch (state) {
    case 'stable':
      return 'Within expected range';
    case 'planning_window':
      return 'Approaching typical limit';
    case 'elevated':
      return 'Beyond typical lifespan';
    case 'baseline_incomplete':
      return 'Establishing baseline';
  }
}
```

### 7. Fix Opening Message to Be Honest (chatModeCopy.ts)

**File**: `src/lib/chatModeCopy.ts`

Update `generatePersonalBlurb` to check verification status:

```typescript
export function generatePersonalBlurb(context: {
  yearBuilt?: number;
  systemCount: number;
  planningCount: number;
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  isFirstVisit?: boolean;
  // NEW: Verification context
  verifiedSystemCount?: number;
  totalSystemCount?: number;
}): string {
  const greeting = getTimeOfDayGreeting();
  
  // First visit handling (unchanged)
  if (context.isFirstVisit) {
    const systemWord = context.systemCount === 1 ? 'system' : 'systems';
    return `${greeting}. I've reviewed the information you provided and set up monitoring for ${context.systemCount} key ${systemWord}. I'll keep an eye on their expected lifespans and let you know when planning windows approach.`;
  }
  
  const homeRef = 'Your home';
  const systemWord = context.systemCount === 1 ? 'system' : 'systems';
  
  let statusLine = '';
  
  // NEW: Check if we have verified systems
  const verified = context.verifiedSystemCount ?? 0;
  const total = context.totalSystemCount ?? context.systemCount;
  const remaining = total - verified;
  
  if (verified > 0 && remaining > 0) {
    // Honest: acknowledge verified work AND remaining uncertainty
    const verifiedWord = verified === 1 ? 'system' : 'systems';
    statusLine = `I've verified ${verified} ${verifiedWord} from permit records. I'm still establishing the baseline for the remaining ${remaining}.`;
  } else if (verified === total && verified > 0) {
    // All verified: can claim stability
    statusLine = 'All systems are verified. Everything is currently within expected ranges.';
  } else if (context.planningCount > 0) {
    statusLine = context.planningCount === 1
      ? `I'm keeping an eye on one system that may need attention in the coming years.`
      : `I'm keeping an eye on ${context.planningCount} systems that may need attention in the coming years.`;
  } else if (context.confidenceLevel === 'Unknown' || context.confidenceLevel === 'Early') {
    // HONEST: Don't claim "everything is fine" when we don't know
    statusLine = `I'm still establishing a complete picture of your systems.`;
  } else {
    statusLine = 'Everything is currently within expected ranges.';
  }
  
  let nextStep = '';
  if (context.confidenceLevel === 'Early' || context.confidenceLevel === 'Unknown') {
    nextStep = ` If you'd like to sharpen the picture, adding a photo of any system label helps me dial in the details.`;
  }
  
  return `${greeting}. ${homeRef} has ${context.systemCount} key ${systemWord} I'm tracking. ${statusLine}${nextStep}`;
}
```

### 8. Pass Verification Context to ChatConsole

**File**: `src/components/dashboard-v3/MiddleColumn.tsx`

Update the ChatConsole props to include verification context:

```typescript
// Compute verification counts
const verifiedSystemCount = useMemo(() => 
  baselineSystems.filter(s => s.installSource === 'permit').length,
  [baselineSystems]
);

// Pass to ChatConsole
<ChatConsole
  ...
  verifiedSystemCount={verifiedSystemCount}
  totalSystemCount={baselineSystems.length}
/>
```

---

## UI Copy Changes Summary

| Current | Replacement |
|---------|-------------|
| `data_gap` | `baseline_incomplete` |
| "Age unknown" | "Establishing baseline" |
| "Add installation date" | "Upload system label" |
| "Everything is currently within expected ranges." (when unverified) | "I've verified X system(s) from permit records. I'm still establishing the baseline for the remaining Y." |
| "Early data" badge (when permit exists) | "2025 · Permit-verified" badge |

---

## User's Tightening Applied

1. **Rename `data_gap` → `baseline_incomplete`**: Implemented in SystemState type
2. **Only compute `expectedLifespan` when permit-verified**: Added conditional check
3. **Type-level enforcement**: `installSource`, `installYear`, `installedLine` fields are typed as coming from capitalTimeline only

---

## Data Flow After Fix

```
capital-timeline edge function
  ↓ reads systems table (has permit data)
  ↓ reads permits table
  ↓ runs resolveInstallAuthority()
  ↓ returns SystemTimelineEntry with installYear, installSource, installedLine
  
MiddleColumn
  ↓ receives capitalTimeline.systems as PRIMARY source
  ↓ maps to BaselineSystem WITH authority fields
  ↓ computes verifiedSystemCount
  
BaselineSurface
  ↓ receives systems with verified fields
  ↓ renders "2025 · Permit-verified" badge when installSource === 'permit'
  ↓ shows "Establishing baseline" only when truly unknown
  
ChatConsole / generatePersonalBlurb
  ↓ receives verifiedSystemCount, totalSystemCount
  ↓ opening message is honest: "I've verified X systems..."
```

---

## Verification Checklist

After implementation:
- [ ] HVAC with 2025 permit shows "2025 · Permit-verified" badge
- [ ] Roof/Water Heater without data shows "Establishing baseline"
- [ ] Chat opening message acknowledges verified vs. unverified systems
- [ ] UnknownAgeCard never appears for permit-verified systems
- [ ] CTAs are evidence-focused ("Upload system label")
- [ ] System Outlook and System Sources table are in sync
- [ ] `data_gap` renamed to `baseline_incomplete` everywhere

