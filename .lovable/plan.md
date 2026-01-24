

# Handshake Onboarding Flow — Refined Implementation Plan

## Summary of Refinements (QA Approved)

This plan incorporates 6 specific risk mitigations identified during QA review:

| Risk | Mitigation |
|------|------------|
| Rigid 6s timing | Soft exit: 4s minimum, 6s typical |
| Snapshot too fast after handshake | Add 300-500ms transition delay |
| Confidence/source taxonomy gap | Separate `confidence` and `source` internally |
| Hardcoded South Florida system order | Add explicit `getSystemPriorityByClimate()` helper |
| Silent enrichment failure | Defensive UI line when snapshot is thin |
| Repeat onboarding copy | Branch headline by home count |

Plus one missing acceptance test: **User skips all systems and proceeds**.

---

## Files to Create/Modify

| File | Action | Scope |
|------|--------|-------|
| `src/components/onboarding/HomeHandshake.tsx` | **Create** | New handshake screen with refined timing |
| `src/components/onboarding/OnboardingComplete.tsx` | **Create** | New closure screen |
| `src/pages/OnboardingFlow.tsx` | Modify | New step flow, home count check, transition delay |
| `src/components/onboarding/InstantSnapshot.tsx` | Modify | Confidence labels, baseline strength reframe, thin data warning |
| `src/components/onboarding/CriticalSystemsStep.tsx` | Modify | Climate-based system order, inline feedback |
| `src/lib/onboardingHelpers.ts` | **Create** | System priority helper, confidence display helpers |

---

## 1. NEW: HomeHandshake Component

**File:** `src/components/onboarding/HomeHandshake.tsx`

### Props Interface

```typescript
interface HomeHandshakeProps {
  city: string;
  state: string;
  isFirstHome: boolean; // For headline branching
  onComplete: () => void;
}
```

### Refined Timing Logic (Risk 1 Fix)

```typescript
// Timing constants
const STEP_INTERVAL = 1500; // 1.5s per step
const MINIMUM_DISPLAY = 4000; // 4s minimum (was 6s)
const TYPICAL_DISPLAY = 6000; // 6s typical

// Auto-advance when:
// - All 4 scan items complete AND
// - Minimum 4 seconds elapsed
```

Implementation:
```typescript
const [completedSteps, setCompletedSteps] = useState(0);
const [startTime] = useState(Date.now());
const [canAdvance, setCanAdvance] = useState(false);

// Sequential step completion
useEffect(() => {
  if (completedSteps < 4) {
    const timer = setTimeout(() => {
      setCompletedSteps(prev => prev + 1);
    }, STEP_INTERVAL);
    return () => clearTimeout(timer);
  }
}, [completedSteps]);

// Check if can advance (all steps done + minimum time)
useEffect(() => {
  if (completedSteps === 4) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= MINIMUM_DISPLAY) {
      setCanAdvance(true);
    } else {
      const remaining = MINIMUM_DISPLAY - elapsed;
      const timer = setTimeout(() => setCanAdvance(true), remaining);
      return () => clearTimeout(timer);
    }
  }
}, [completedSteps, startTime]);

// Auto-advance when ready
useEffect(() => {
  if (canAdvance) {
    onComplete();
  }
}, [canAdvance, onComplete]);
```

### Headline Branching (Risk 6 Fix)

```tsx
<h1 className="text-2xl font-semibold">
  {isFirstHome 
    ? "Nice to meet your home."
    : "Let's get this home under watch."}
</h1>
```

### UI Structure

```tsx
<div className="min-h-screen flex flex-col items-center justify-center p-4">
  <div className="w-full max-w-md text-center space-y-8">
    {/* Logo - using existing component */}
    <div className="flex justify-center">
      <Logo className="h-12 w-12 text-primary animate-pulse" />
    </div>
    
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">
        {isFirstHome ? "Nice to meet your home." : "Let's get this home under watch."}
      </h1>
      <p className="text-muted-foreground">
        We're building its baseline using everything we can find.
      </p>
    </div>

    {/* Scan items with sequential completion */}
    <div className="space-y-3 text-left max-w-xs mx-auto">
      <ScanItem label="Pulling public property records" completed={completedSteps >= 1} />
      <ScanItem label="Analyzing climate stress" completed={completedSteps >= 2} />
      <ScanItem label="Matching similar homes nearby" completed={completedSteps >= 3} />
      <ScanItem label="Estimating system lifecycles" completed={completedSteps >= 4} />
    </div>

    <p className="text-xs text-muted-foreground">
      You can refine this later. We'll start with our best estimate.
    </p>
  </div>
</div>
```

### ScanItem Sub-Component

```tsx
function ScanItem({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "h-5 w-5 rounded-full flex items-center justify-center transition-all duration-300",
        completed ? "bg-primary" : "bg-muted"
      )}>
        {completed ? (
          <Check className="h-3 w-3 text-primary-foreground" />
        ) : (
          <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
        )}
      </div>
      <span className={cn(
        "text-sm transition-colors duration-300",
        completed ? "text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}
```

---

## 2. OnboardingFlow.tsx — Flow Orchestration

### Step Type Update

```typescript
type Step = 'address' | 'handshake' | 'snapshot' | 'systems' | 'complete';
```

### Home Count Detection (Risk 6 Fix)

Add state and check:

```typescript
const [isFirstHome, setIsFirstHome] = useState(true);

useEffect(() => {
  const checkHomeCount = async () => {
    if (!user) return;
    
    const { count } = await supabase
      .from('homes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // If user already has homes, this is not their first
    setIsFirstHome((count || 0) === 0);
    
    // Existing redirect logic for existing home
    if (count && count > 0) {
      navigate('/dashboard', { replace: true });
    }
  };

  checkHomeCount();
}, [user, navigate]);
```

### Transition Delay (Risk 2 Fix)

Modify handshake → snapshot transition:

```typescript
// After handshake completes, add 400ms delay before showing snapshot
const handleHandshakeComplete = () => {
  // Add perceptual causality delay
  setTimeout(() => {
    setStep('snapshot');
  }, 400); // 300-500ms delay preserves perceived causality
};
```

### Address Step Copy Update

```tsx
{step === 'address' && (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome to Habitta
      </h1>
      <p className="text-muted-foreground">
        We quietly monitor the systems that keep your home running.
      </p>
    </div>

    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <GooglePlacesAutocomplete
          onSelect={handleAddressSelect}
          placeholder="Enter your address..."
          disabled={isLoading}
        />
        {isLoading && (
          <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Setting up your home...</span>
          </div>
        )}
      </CardContent>
    </Card>

    <p className="text-xs text-center text-muted-foreground max-w-sm mx-auto">
      We'll use public records, climate data, and regional patterns to build your home's baseline.
    </p>
  </div>
)}
```

### Handshake Step Render

```tsx
{step === 'handshake' && state.snapshot && (
  <HomeHandshake
    city={state.snapshot.city}
    state={state.snapshot.state}
    isFirstHome={isFirstHome}
    onComplete={handleHandshakeComplete}
  />
)}
```

### Complete Step Navigation

```typescript
// In CriticalSystemsStep onComplete callback:
onComplete={async (systems) => {
  // ... existing update logic ...
  setStep('complete'); // Navigate to complete step, not dashboard
}}
onSkip={() => setStep('complete')} // Also go to complete
```

### Complete Step Render

```tsx
{step === 'complete' && (
  <div className="space-y-6 animate-in fade-in duration-300">
    <OnboardingComplete
      onContinue={() => navigate('/dashboard', { replace: true })}
    />
  </div>
)}
```

---

## 3. NEW: OnboardingComplete Component

**File:** `src/components/onboarding/OnboardingComplete.tsx`

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Check, ArrowRight } from "lucide-react";

interface OnboardingCompleteProps {
  onContinue: () => void;
}

export function OnboardingComplete({ onContinue }: OnboardingCompleteProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="pt-8 pb-6 space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Your home is now under watch.</h1>
        </div>
        
        <ul className="text-left space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>System wear is tracked quietly in the background</span>
          </li>
          <li className="flex items-start gap-3">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>Climate stress is factored automatically</span>
          </li>
          <li className="flex items-start gap-3">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>You'll see issues early — not when they become urgent</span>
          </li>
        </ul>
        
        {/* Thesis statement - immutable */}
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-4 text-left">
          Most home issues don't happen suddenly. They build quietly.<br />
          Habitta exists to notice them early.
        </blockquote>
        
        <Button onClick={onContinue} className="w-full h-12 text-base" size="lg">
          Go to Home Pulse
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 4. NEW: Onboarding Helpers Module

**File:** `src/lib/onboardingHelpers.ts`

### Climate-Based System Priority (Risk 4 Fix)

```typescript
import { ClimateZoneType } from './climateZone';

interface SystemConfig {
  key: string;
  label: string;
}

/**
 * Get system priority order based on climate zone
 * 
 * Rationale:
 * - High heat: HVAC first (highest stress)
 * - Coastal: HVAC first (salt air exposure)
 * - Freeze-thaw: Roof/plumbing first (ice damage)
 * - Moderate: Standard order
 * 
 * This makes future expansion explicit.
 */
export function getSystemPriorityByClimate(zone: ClimateZoneType): SystemConfig[] {
  switch (zone) {
    case 'high_heat':
    case 'coastal':
      return [
        { key: 'hvac', label: 'HVAC' },
        { key: 'roof', label: 'Roof' },
        { key: 'water_heater', label: 'Water Heater' },
      ];
    case 'freeze_thaw':
      return [
        { key: 'roof', label: 'Roof' },
        { key: 'hvac', label: 'HVAC' },
        { key: 'water_heater', label: 'Water Heater' },
      ];
    case 'moderate':
    default:
      return [
        { key: 'hvac', label: 'HVAC' },
        { key: 'roof', label: 'Roof' },
        { key: 'water_heater', label: 'Water Heater' },
      ];
  }
}
```

### Confidence Display Helpers (Risk 3 Fix)

```typescript
/**
 * Confidence level (how sure we are)
 * Separate from source (where the data came from)
 */
export type ConfidenceDisplay = 'High confidence' | 'Moderate confidence' | 'Estimated' | 'Confirmed';

/**
 * Data source (where the data came from)
 */
export type SourceDisplay = 'Permit' | 'Owner-reported' | 'Inferred' | 'Deterministic';

export interface SystemConfidenceInfo {
  confidence: ConfidenceDisplay;
  source: SourceDisplay;
}

/**
 * Derive display confidence and source from install source
 * 
 * Keeps confidence (how sure) and source (where from) as separate concepts.
 */
export function getSystemConfidenceInfo(
  installSource: string | null,
  hasPermit: boolean = false
): SystemConfidenceInfo {
  if (hasPermit || installSource === 'permit' || installSource === 'permit_verified') {
    return { confidence: 'High confidence', source: 'Permit' };
  }
  
  if (installSource === 'user' || installSource === 'owner_reported') {
    return { confidence: 'Moderate confidence', source: 'Owner-reported' };
  }
  
  // Inferred/heuristic
  return { confidence: 'Estimated', source: 'Inferred' };
}

/**
 * Get climate confidence (always deterministic)
 */
export function getClimateConfidenceInfo(): SystemConfidenceInfo {
  return { confidence: 'Confirmed', source: 'Deterministic' };
}

/**
 * Get baseline strength label from confidence score
 */
export function getBaselineStrengthLabel(confidence: number): string {
  if (confidence >= 70) return 'Strong baseline';
  if (confidence >= 50) return 'Moderate baseline';
  return 'Early baseline established';
}

/**
 * Check if snapshot is "thin" (enrichment may have failed)
 */
export function isSnapshotThin(confidence: number, hasYearBuilt: boolean): boolean {
  return confidence < 35 && !hasYearBuilt;
}
```

---

## 5. InstantSnapshot.tsx — Discovery Reveal Reframe

### Updated Props Interface

```typescript
interface InstantSnapshotProps {
  snapshot: SnapshotData;
  confidence: number;
  isEnriching?: boolean;
}
```

### Key Changes

#### A. Add Confidence Labels to Cards

```tsx
// Derive confidence info for each card
const roofConfidence = snapshot.hvac_permit_year 
  ? { confidence: 'High confidence', source: 'Permit' }
  : { confidence: 'Estimated', source: 'Inferred' };

const coolingConfidence = snapshot.hvac_permit_year
  ? { confidence: 'High confidence', source: 'Permit' }
  : { confidence: 'Likely', source: 'Inferred' };

// Climate is always deterministic
const climateConfidence = 'Confirmed';
```

Updated card rendering:
```tsx
{/* Roof Card */}
<Card className="border-muted">
  <CardContent className="p-4 flex items-center gap-3">
    <div className="p-2 rounded-lg bg-muted">
      <Home className="h-5 w-5 text-muted-foreground" />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Roof</p>
        <Badge variant="outline" className="text-xs py-0 px-1.5 font-normal">
          {roofConfidence.confidence}
        </Badge>
      </div>
      <p className="font-medium">{getRoofLabel(snapshot.roof_type)}</p>
    </div>
  </CardContent>
</Card>
```

#### B. Replace "Home Confidence" with "Baseline Strength" (Risk 1 Psychological Fix)

```tsx
{/* Baseline Strength Section */}
<Card className="bg-muted/50 border-0">
  <CardContent className="p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium">Home Baseline Strength</span>
      <span className="text-base font-semibold text-foreground">
        {getBaselineStrengthLabel(confidence)}
      </span>
    </div>
    <Progress 
      value={confidence} 
      className={cn(
        "h-2 transition-all duration-500",
        isEnriching && "[&>div]:animate-pulse"
      )} 
    />
    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
      {isEnriching && <Loader2 className="h-3 w-3 animate-spin" />}
      {isEnriching 
        ? 'Finding more data...' 
        : 'We refine this over time — with or without input.'}
    </p>
    
    {/* Thin data warning (Risk 5 Fix) */}
    {!isEnriching && isSnapshotThin(confidence, !!snapshot.year_built) && (
      <p className="text-xs text-muted-foreground mt-2 italic">
        Some records were unavailable. We'll keep checking.
      </p>
    )}
  </CardContent>
</Card>
```

---

## 6. CriticalSystemsStep.tsx — Systems Lock-In Reframe

### Climate-Based System Order (Risk 4 Fix)

```typescript
import { getSystemPriorityByClimate } from '@/lib/onboardingHelpers';
import { deriveClimateZone } from '@/lib/climateZone';

interface CriticalSystemsStepProps {
  yearBuilt?: number;
  city?: string;  // NEW: for climate derivation
  state?: string; // NEW: for climate derivation
  onComplete: (systems: {...}) => void;
  onSkip?: () => void;
  isSubmitting?: boolean;
}

// Inside component:
const climateZone = deriveClimateZone(state, city);
const SYSTEMS = getSystemPriorityByClimate(climateZone.zone);

// Use SYSTEMS in render...
```

### Updated Copy

```tsx
<CardTitle>Let's lock in the essentials</CardTitle>
<CardDescription>
  Start with what you know. Skip anything you're unsure about.
</CardDescription>
```

### Inline Feedback After First Answer

```tsx
const completedCount = Object.values(answers).filter(a => a.choice !== null).length;

{/* Show micro-affirmation after first answer */}
{completedCount === 1 && (
  <p className="text-sm text-center text-primary animate-in fade-in duration-300">
    That helps. We'll take it from here.
  </p>
)}
```

---

## Acceptance Tests

### Handshake Screen
- [ ] Displays after address selection
- [ ] Shows 4 scan items completing sequentially (1.5s each)
- [ ] Auto-advances after minimum 4 seconds (not rigid 6s)
- [ ] No user action buttons visible
- [ ] Displays correct city/state
- [ ] Shows "Nice to meet your home" for first home
- [ ] Shows "Let's get this home under watch" for additional homes

### Transition
- [ ] 300-500ms delay between handshake completion and snapshot render
- [ ] Snapshot doesn't appear instantly after handshake (perceptual causality)

### Discovery Reveal (Snapshot)
- [ ] Shows "Here's what we found so far" headline
- [ ] Each card has confidence label ("High confidence", "Likely", "Estimated", "Confirmed")
- [ ] "Home Confidence" replaced with "Home Baseline Strength"
- [ ] Shows human-readable baseline label, not percentage
- [ ] Shows "Some records were unavailable" when snapshot is thin (Risk 5)
- [ ] Progress bar still visible but de-emphasized

### Systems Lock-In
- [ ] Shows "Let's lock in the essentials" headline
- [ ] System order matches climate zone (HVAC first in high_heat)
- [ ] Shows "That helps" feedback after first answer
- [ ] Skip navigates to complete step (not dashboard)
- [ ] **CRITICAL: User skips all systems and proceeds successfully** (missing test)

### Closure Screen
- [ ] Shows "Your home is now under watch"
- [ ] Three bullet points with check icons
- [ ] Thesis statement blockquote visible
- [ ] "Go to Home Pulse" navigates to /dashboard

### Edge Cases
- [ ] User skips all systems → baseline still established, closure shown, dashboard populated
- [ ] User returns to onboarding after session loss → appropriate headline shown
- [ ] Enrichment fails silently → thin data warning displayed, flow continues

---

## Product Philosophy (Immutable)

> **Habitta onboarding is not about collecting data.**
> **It's about demonstrating care, competence, and continuity.**
>
> The system should always feel like it is doing more work than the homeowner.

