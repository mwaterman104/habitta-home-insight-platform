

# Right Column → Context Rail with Authority Contract

## Executive Summary

Transform the Right Column into a **purposeful Context Rail** with an explicit **Authority Contract** that ensures it remains structurally subordinate to Today's Focus. The rail answers: *"What external or structural factors matter right now for this home?"* — and it does so only because Today's Focus said to.

---

## Authority Contract (NEW — Critical Addition)

### Authority Hierarchy (Hard Rule)

The dashboard speaks with **one authoritative voice at a time**:

| Priority | Surface | Role |
|----------|---------|------|
| **Primary** | Today's Focus (via `focusContext`) | Decides what matters |
| **Secondary** | Context Rail | Explains why it matters here |
| Explanatory | Habitta's Thinking | Invites conversation |
| Historical | Timeline | Records what's planned |

**This hierarchy must never be violated in UI, copy, or logic.**

### Context Rail Authority Constraints

| MAY | MAY NOT |
|-----|---------|
| Explain environmental, regional, or structural factors | Introduce a new system focus |
| Reinforce the rationale behind Today's Focus | Escalate urgency beyond Today's Focus |
| Provide background without urgency | Present recommendations or actions |
| | Contradict Today's Focus headline |
| | Speak when Today's Focus is silent (except Quiet State) |

**If any "MAY NOT" occurs, it is a bug — not a design choice.**

---

## Layout Changes

### Width Adjustment

**File: `src/pages/DashboardV3.tsx`**

| Panel | Before | After |
|-------|--------|-------|
| Middle Column | `defaultSize={75}`, `minSize={50}` | `defaultSize={60}`, `minSize={55}` |
| Right Column | `defaultSize={25}`, `minSize={15}`, `maxSize={40}` | `defaultSize={40}`, `minSize={30}`, `maxSize={45}` |

Also update:
- Background from `bg-muted/30` to `bg-muted/10` (lighter)
- Pass `focusContext`, `hvacPrediction`, `risk`, `confidence` to RightColumn

---

## New Component: FocusContextCard

**File: `src/components/dashboard-v3/FocusContextCard.tsx`**

Renamed from `DynamicContextCard` to reinforce hierarchy semantically.

### Props Interface (Authority Coupling Enforced)

```typescript
interface FocusContextCardProps {
  // Authority coupling - REQUIRED
  focusContext: FocusContext;
  authoritySource: 'todays_focus'; // Must be this value or component won't render
  
  // Context data
  climateZone: ClimateZone;
  hvacPrediction: SystemPrediction | null;
  capitalTimeline: HomeCapitalTimeline | null;
  homeAge?: number;
  risk: RiskLevel;
  confidence: number;
}
```

**Hard rule:** If `authoritySource !== 'todays_focus'`, component returns null.

### Context State Types

```typescript
type ContextCardState = 'climate_stress' | 'local_activity' | 'risk_context' | 'quiet';
```

### Focus Type → Allowed Context States (Gate Logic)

| Focus Type | Allowed States |
|------------|----------------|
| `SYSTEM` + planning window | `local_activity`, `climate_stress` |
| `SYSTEM` + monitoring | `climate_stress` |
| `SYSTEM` + action | `risk_context` |
| `NONE` | `quiet` only |

**If derived state doesn't match allowed set → fallback to `quiet`.**

### Rendering Logic

```typescript
function deriveContextState(
  focusContext: FocusContext,
  climateZone: ClimateZone,
  hvacPrediction: SystemPrediction | null,
  risk: RiskLevel
): ContextCardState {
  // No focus = quiet (Authority Rule #1)
  if (focusContext.type === 'NONE') {
    return 'quiet';
  }
  
  // System in focus - determine appropriate context
  if (focusContext.type === 'SYSTEM') {
    const systemKey = focusContext.systemKey.toLowerCase();
    
    // Risk context for roof/structural systems with high risk
    if ((systemKey === 'roof' || systemKey === 'foundation') && risk === 'HIGH') {
      return 'risk_context';
    }
    
    // Planning window = local activity context
    if (hvacPrediction?.planning) {
      return 'local_activity';
    }
    
    // Climate stress for HVAC, water heater, roof
    if (['hvac', 'water_heater', 'roof'].includes(systemKey)) {
      if (climateZone.zone === 'high_heat' || climateZone.zone === 'coastal' || climateZone.zone === 'freeze_thaw') {
        return 'climate_stress';
      }
    }
  }
  
  // Default quiet
  return 'quiet';
}
```

### Card Anatomy (Constant Structure)

```tsx
<Card className="rounded-xl bg-card/50">
  <CardContent className="py-4 space-y-3">
    {/* Authority disclosure - REQUIRED */}
    <p className="text-xs text-muted-foreground uppercase tracking-wider">
      Context for today's focus
    </p>
    
    {/* Contextual label - muted */}
    <p className="text-xs font-medium text-muted-foreground">
      {contextLabel}
    </p>
    
    {/* Headline - anchored to THIS home */}
    <p className="system-name text-sm leading-relaxed">
      {headline}
    </p>
    
    {/* Supporting bullets - 2-3 max */}
    <ul className="space-y-1.5 text-meta text-muted-foreground">
      {bullets.map((bullet, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
    
    {/* Optional learn-more link - not a CTA */}
    {learnMoreLink && (
      <Link 
        to={learnMoreLink.href} 
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        {learnMoreLink.label}
        <ChevronRight className="h-3 w-3" />
      </Link>
    )}
  </CardContent>
</Card>
```

---

## Copy Governance (Anchored Headlines)

**File: `src/lib/dashboardCopy.ts`**

Add context card copy with **anchored headlines** (tied to "this home" not generic):

```typescript
export type ContextCardState = 'climate_stress' | 'local_activity' | 'risk_context' | 'quiet';

export interface ContextCardCopy {
  label: string;
  headline: string; // MUST be anchored to this home
  bullets: string[];
  learnMoreLabel?: string;
  learnMoreHref?: string;
}
```

### Copy by State

| State | Label | Headline (Anchored) |
|-------|-------|---------------------|
| `climate_stress` (high_heat) | Climate context | "High heat and humidity increase wear for homes like yours." |
| `climate_stress` (coastal) | Climate context | "Salt air exposure affects exterior and HVAC systems in your area." |
| `climate_stress` (freeze_thaw) | Climate context | "Freeze-thaw cycles stress plumbing and foundations in your climate." |
| `local_activity` | Local context | "Replacement activity is common for homes in your area." |
| `risk_context` | Risk context | "Roof age affects insurance and inspections for your home." |
| `quiet` | Home context | "Conditions are typical for homes in your area." |

**Rule:** If headline can stand alone as a conclusion, it's too strong. Anchored headlines always reference "your home/area/climate".

---

## RightColumn Refactor

**File: `src/components/dashboard-v3/RightColumn.tsx`**

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
  // Authority coupling (from advisor state)
  focusContext: FocusContext;
  // Data for context card
  hvacPrediction: SystemPrediction | null;
  capitalTimeline: HomeCapitalTimeline | null;
  homeAge?: number;
  risk: RiskLevel;
  confidence: number;
}
```

### What Gets REMOVED

- `LocalSignals` component (replaced by FocusContextCard)
- "Add a system or appliance" Card (moves to Systems Hub)
- `TeachHabittaModal` (moves to Systems Hub)
- `homeForecast` prop (unused)
- `homeId`, `onSystemAdded` props (no longer needed)

### What Stays/Adds

- `PropertyMap` (with increased height)
- `FocusContextCard` (new, with authority coupling)

### New Structure

```tsx
export function RightColumn({
  loading,
  latitude, longitude, address, city, state,
  focusContext,
  hvacPrediction,
  capitalTimeline,
  homeAge,
  risk,
  confidence,
}: RightColumnProps) {
  const climate = deriveClimateZone(state, city, latitude);
  
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Map - taller */}
      <PropertyMap 
        lat={latitude} 
        lng={longitude}
        address={address}
        city={city}
        state={state}
        className="rounded-xl"
      />

      {/* Focus Context Card - authority-coupled */}
      <FocusContextCard
        focusContext={focusContext}
        authoritySource="todays_focus"
        climateZone={climate}
        hvacPrediction={hvacPrediction}
        capitalTimeline={capitalTimeline}
        homeAge={homeAge}
        risk={risk}
        confidence={confidence}
      />
    </div>
  );
}
```

---

## PropertyMap Enhancement

**File: `src/components/dashboard-v3/PropertyMap.tsx`**

Change height from `aspect-video` to `h-72` (288px fixed):

```tsx
// Before
<div className="aspect-video relative bg-muted">

// After  
<div className="h-72 relative bg-muted">
```

---

## DashboardV3 Integration

**File: `src/pages/DashboardV3.tsx`**

### Pass Additional Props to RightColumn

```tsx
<RightColumn
  loading={forecastLoading || hvacLoading || timelineLoading}
  latitude={userHome.latitude}
  longitude={userHome.longitude}
  address={userHome.address}
  city={userHome.city}
  state={userHome.state}
  focusContext={focusContext}
  hvacPrediction={hvacPrediction}
  capitalTimeline={capitalTimeline}
  homeAge={userHome.year_built ? new Date().getFullYear() - userHome.year_built : undefined}
  risk={risk}
  confidence={confidence}
/>
```

### Remove onSystemAdded

The `onSystemAdded` callback and query invalidation logic moves to Systems Hub.

---

## "Add System" Relocation

**File: `src/pages/SystemsHub.tsx`**

Add a subtle "Add system" button in the Systems Hub page. This is an onboarding action, not contextual intelligence.

---

## Files Summary

| File | Action | Scope |
|------|--------|-------|
| `src/pages/DashboardV3.tsx` | Modify | Width 60/40, pass focusContext/risk/confidence to RightColumn |
| `src/components/dashboard-v3/RightColumn.tsx` | Refactor | Remove LocalSignals/TeachHabitta, add FocusContextCard |
| `src/components/dashboard-v3/PropertyMap.tsx` | Modify | Height from aspect-video to h-72 |
| `src/components/dashboard-v3/FocusContextCard.tsx` | Create | Authority-coupled context card |
| `src/lib/dashboardCopy.ts` | Modify | Add context card copy generators |
| `src/pages/SystemsHub.tsx` | Modify | Add "Add system" affordance |
| `src/components/dashboard-v3/LocalSignals.tsx` | Keep | No longer used in RightColumn; may deprecate later |

---

## Acceptance Tests

### Authority Validation (NEW)

- [ ] Context card renders ONLY when focusContext exists
- [ ] Context card never introduces a new system focus
- [ ] Context card headline never contradicts Today's Focus
- [ ] Context card never escalates urgency beyond Today's Focus
- [ ] Changing Today's Focus updates Context Card state
- [ ] Clearing Today's Focus (type: 'NONE') forces Context Rail into Quiet state
- [ ] `authoritySource` must equal `'todays_focus'` or component returns null

### FocusContextCard Rendering

- [ ] Shows Climate Stress when HVAC/Roof in focus + high_heat zone
- [ ] Shows Local Activity when planning window entered
- [ ] Shows Quiet state when no focus and home is healthy
- [ ] Headlines are anchored ("homes like yours" not generic)
- [ ] "Context for today's focus" disclosure line is always visible
- [ ] No action buttons or CTAs
- [ ] Links are subtle (muted text, not button-style)

### RightColumn

- [ ] Only two children: PropertyMap + FocusContextCard
- [ ] No LocalSignals component rendered
- [ ] No "Add system" button
- [ ] Background is lighter (bg-muted/10)
- [ ] Spacing is generous (space-y-6)

### Width

- [ ] Default right column is 40%
- [ ] Minimum is 30%
- [ ] Maximum is 45%
- [ ] User resize persists to localStorage

### PropertyMap

- [ ] Height is 288px (h-72), not aspect-video
- [ ] Climate badge renders correctly

---

## Design Principles (Non-Negotiable)

| Principle | Enforcement |
|-----------|-------------|
| **Authority Is Singular** | The dashboard speaks with one voice at a time. All secondary surfaces support that voice — never replace it. |
| **Secondary Authority Only** | Context Rail may explain, reinforce, or contextualize Today's Focus, but never override, escalate, or introduce independent conclusions. |
| One job | Context rail explains external factors only |
| Depth > quantity | One deep card, not multiple shallow ones |
| Calm > clever | No urgency language |
| Stability = trust | Card only changes when focusContext changes |
| Context, not control | No action buttons |

---

## What Is Explicitly Banned

| Element | Reason |
|---------|--------|
| Action buttons | Context, not control |
| "Add system" | Onboarding action, belongs in Systems Hub |
| Forecast charts | Duplicates left column |
| Multiple stacked cards | Depth > quantity |
| Alerts or warnings | No panic on context rail |
| KPI dashboards | No metric creep |
| Unanchored headlines | Authority drift prevention |
| Context without focus | Authority violation |

