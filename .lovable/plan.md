

# Fix Authority Precedence: Permit Overrides "Not Sure"

## Problem Summary

The dashboard currently has **backwards precedence logic**. When a user selected "Not sure" during onboarding AND a permit exists (e.g., HVAC 2023), the UI shows "Age unknown" instead of acknowledging the permit.

**Root cause (line 128-188 in MiddleColumn.tsx):**
```typescript
// PRIMARY: Use home_systems from database if available  <-- WRONG
if (homeSystems && homeSystems.length > 0) { ... }

// FALLBACK: Use capitalTimeline if no home_systems  <-- HAS PERMIT DATA
if (capitalTimeline?.systems && capitalTimeline.systems.length > 0) { ... }
```

The `capital-timeline` edge function **already runs authority resolution** (Permit > User > Heuristic) and returns:
- `installSource`: `'permit' | 'inferred' | 'unknown'`
- `installYear`: Verified install year
- `installedLine`: Pre-formatted label (e.g., "Installed 2023 (permit-verified)")
- `confidenceScore`: Numeric confidence
- `confidenceLevel`: `'low' | 'medium' | 'high'`

But `MiddleColumn` ignores all of this and prioritizes `home_systems` (user onboarding data).

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard-v3/BaselineSurface.tsx` | Extend `BaselineSystem` interface with authority fields, add permit-verified badge, fix UnknownAgeCard logic |
| `src/components/dashboard-v3/MiddleColumn.tsx` | Invert priority: capitalTimeline first, pass through authority fields, compute verifiedSystemCount |
| `src/lib/chatModeCopy.ts` | Update `generatePersonalBlurb` to accept verification context and be honest about incomplete baselines |
| `src/components/dashboard-v3/ChatConsole.tsx` | Pass verification context to `generatePersonalBlurb` |

---

## Technical Section

### 1. Extend BaselineSystem Interface (BaselineSurface.tsx)

Add authority-resolved fields from capital-timeline:

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

### 2. Add Permit-Verified Micro-Badge (BaselineSurface.tsx)

Update `SystemCard` to show the verified source badge:

**Visual treatment:**
- Background: `bg-emerald-100`
- Text: `text-emerald-700`
- Format: `{year} · Permit-verified`
- Card gets subtle emerald border: `border-emerald-200/60`
- Only show "Early data" badge if NOT permit-verified

```typescript
function SystemCard({ system, isExpanded }: SystemCardProps) {
  const isPermitVerified = system.installSource === 'permit';
  
  return (
    <div className={cn(
      "rounded-lg border p-2.5 space-y-1.5 bg-white/50",
      treatment.cardClass,
      isPermitVerified && "border-emerald-200/60"
    )}>
      <div className="flex items-center justify-between">
        <p className="font-medium text-stone-800">{system.displayName}</p>
        <div className="flex items-center gap-2">
          {/* Permit-verified badge */}
          {isPermitVerified && system.installYear && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-100 text-emerald-700">
              {system.installYear} · Permit-verified
            </span>
          )}
          {/* Only show "Early data" if NOT permit-verified */}
          {!isPermitVerified && treatment.badgeText && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", treatment.badgeClass)}>
              {treatment.badgeText}
            </span>
          )}
          <p className="text-[11px] text-stone-500">{stateLabel}</p>
        </div>
      </div>
      <SegmentedScale ... />
    </div>
  );
}
```

### 3. Fix UnknownAgeCard Rendering Logic (BaselineSurface.tsx)

**Current bug (line 614):**
```typescript
if (system.state === 'baseline_incomplete' && system.ageYears === undefined) {
  return <UnknownAgeCard ... />;  // Shows even when permit exists!
}
```

**Fix:** Only show UnknownAgeCard if NO install year AND NO permit source:
```typescript
{systems.map(system => {
  const hasVerifiedSource = system.installSource === 'permit';
  const hasInstallYear = system.installYear != null;
  
  // Show UnknownAgeCard ONLY if truly unknown
  if (system.state === 'baseline_incomplete' && !hasInstallYear && !hasVerifiedSource) {
    return <UnknownAgeCard key={system.key} system={system} isExpanded={isExpanded} />;
  }
  
  return <SystemCard key={system.key} system={system} isExpanded={isExpanded} />;
})}
```

Also update UnknownAgeCard copy to be evidence-focused:
- "Age unknown" → "Establishing baseline"
- "Add installation date" → "Upload system label"

### 4. Invert Priority in MiddleColumn.tsx

**New logic:** `capitalTimeline` is the authority source (it already runs `resolveInstallAuthority()`).

```typescript
/**
 * AUTHORITY PRECEDENCE (Non-Negotiable):
 * capitalTimeline is the SOURCE OF TRUTH for lifecycle data.
 * It has already run authority resolution:
 * - Permit > User Override > Heuristic
 * - "Not sure" = no data, never overrides permit
 * 
 * home_systems is EVIDENCE ONLY (photos, labels) - not authority.
 */
const baselineSystems = useMemo<BaselineSystem[]>(() => {
  const currentYear = new Date().getFullYear();
  
  // CAPITAL TIMELINE IS AUTHORITY SOURCE
  if (capitalTimeline?.systems && capitalTimeline.systems.length > 0) {
    return capitalTimeline.systems.map(sys => {
      const expectedEnd = sys.replacementWindow.likelyYear;
      const yearsRemaining = expectedEnd - currentYear;
      const monthsRemaining = yearsRemaining * 12;
      
      // Age from authoritative install year
      const ageYears = sys.installYear 
        ? currentYear - sys.installYear 
        : undefined;
      
      // Only compute expectedLifespan if permit-verified (user's tightening)
      const isPermitVerified = sys.installSource === 'permit';
      const expectedLifespan = isPermitVerified && sys.installYear
        ? sys.replacementWindow.lateYear - sys.installYear
        : undefined;
      
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
        installSource: sys.installSource as 'permit' | 'inferred' | 'unknown',
        installYear: sys.installYear,
        installedLine: sys.installedLine,
        ageYears,
        expectedLifespan,
        baselineStrength: sys.confidenceScore * 100,
      };
    });
  }
  
  // Fallback to home_systems only if capitalTimeline unavailable
  if (homeSystems && homeSystems.length > 0) {
    // ... existing logic (no changes needed, just becomes fallback)
  }
  
  return [];
}, [capitalTimeline, homeSystems]);
```

Also compute `verifiedSystemCount` for chat context:
```typescript
const verifiedSystemCount = useMemo(() => 
  baselineSystems.filter(s => s.installSource === 'permit').length,
  [baselineSystems]
);
```

### 5. Update generatePersonalBlurb (chatModeCopy.ts)

Add verification context to be honest about incomplete baselines:

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
  if (context.isFirstVisit) { ... }
  
  const homeRef = 'Your home';
  const systemWord = context.systemCount === 1 ? 'system' : 'systems';
  
  let statusLine = '';
  
  // NEW: Check verification status
  const verified = context.verifiedSystemCount ?? 0;
  const total = context.totalSystemCount ?? context.systemCount;
  const remaining = total - verified;
  
  if (verified > 0 && remaining > 0) {
    // HONEST: Acknowledge verified work AND remaining uncertainty
    const verifiedWord = verified === 1 ? 'system' : 'systems';
    statusLine = `I've verified ${verified} ${verifiedWord} from permit records. I'm still establishing the baseline for the remaining ${remaining}.`;
  } else if (verified === total && verified > 0) {
    // All verified: can claim stability
    statusLine = 'All systems are verified. Everything is currently within expected ranges.';
  } else if (context.planningCount > 0) {
    // Has planning systems
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

### 6. Pass Verification Context to ChatConsole

Update `ChatConsole` props interface and pass verification counts:

**In ChatConsole.tsx:**
```typescript
interface ChatConsoleProps {
  // ... existing props
  verifiedSystemCount?: number;
  totalSystemCount?: number;
}
```

**In MiddleColumn.tsx:**
```typescript
<ChatConsole
  ...
  verifiedSystemCount={verifiedSystemCount}
  totalSystemCount={baselineSystems.length}
/>
```

**In ChatConsole's generatePersonalBlurb call:**
```typescript
const message = generatePersonalBlurb({
  yearBuilt,
  systemCount: baselineSystems.length,
  planningCount,
  confidenceLevel,
  isFirstVisit: isFirstUserVisit,
  verifiedSystemCount, // NEW
  totalSystemCount: baselineSystems.length, // NEW
});
```

---

## UI Copy Changes Summary

| Current | Replacement |
|---------|-------------|
| "Age unknown" | "Establishing baseline" |
| "Add installation date" | "Upload system label" |
| "Everything is currently within expected ranges." (when unverified) | "I've verified 1 system from permit records. I'm still establishing the baseline for the remaining 2." |
| "Early data" badge (when permit exists) | "2023 · Permit-verified" badge |

---

## Doctrine Comment to Add (MiddleColumn.tsx)

```typescript
/**
 * AUTHORITY PRECEDENCE (Non-Negotiable):
 * 
 * 1. Permit / inspection record (HIGHEST)
 * 2. Photo-verified label
 * 3. Invoice / documentation
 * 4. Explicit user claim (e.g., "Installed 2018")
 * 5. Inference from home age
 * 6. User uncertainty ("Not sure") (LOWEST)
 * 
 * "Not sure" is NOT a claim. It's an admission of uncertainty.
 * It should NEVER override levels 1-5.
 * 
 * capitalTimeline.systems is the SOURCE OF TRUTH for lifecycle data.
 * It has already run resolveInstallAuthority() with this precedence.
 * 
 * home_systems is EVIDENCE ONLY (photos, labels) - not authority.
 */
```

---

## Visual Result After Fix

**System Outlook Card (HVAC with permit):**
```
┌─────────────────────────────────────────────────────┐
│ HVAC System          [2023 · Permit-verified] Stable│
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│   OK          WATCH          PLAN                   │
└─────────────────────────────────────────────────────┘
```

**System Outlook Card (Roof without permit):**
```
┌─────────────────────────────────────────────────────┐
│ Roof                          Establishing baseline │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│   A photo of the system label helps me confirm...   │
│                  Upload system label                │
└─────────────────────────────────────────────────────┘
```

**Chat Opening (with verification context):**
> "Good afternoon. Your home has 3 key systems I'm tracking. I've verified 1 system from permit records. I'm still establishing the baseline for the remaining 2. If you'd like to sharpen the picture, adding a photo of any system label helps me dial in the details."

---

## Verification Checklist

After implementation:
- [ ] HVAC with 2023 permit shows "2023 · Permit-verified" badge (not "Age unknown")
- [ ] Roof/Water Heater without data shows "Establishing baseline"
- [ ] Chat opening message acknowledges verified vs. unverified systems
- [ ] UnknownAgeCard never appears for permit-verified systems
- [ ] CTAs are evidence-focused ("Upload system label")
- [ ] System Outlook and System Sources table are in sync
- [ ] Console warning logged when both data sources present (for debugging)

