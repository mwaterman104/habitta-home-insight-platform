

# Fix: System Plan Page Data Source Alignment (Tightened)

## Problem Summary

The System Plan page at `/systems/water_heater/plan` shows "No data available yet" on mobile, even though the desktop dashboard correctly displays the Water Heater system.

**Root Cause:** Data source mismatch — the page queries `home_systems` table directly instead of using `useCapitalTimeline` (the canonical authority).

---

## Implementation (3 Changes + 3 Guardrails)

### Change 1: Replace Data Source with `useCapitalTimeline`

**File:** `src/pages/SystemPlanPage.tsx`

Remove the direct `home_systems` query and use the canonical timeline hook:

```typescript
// IMPORTANT:
// SystemPlanPage MUST source systems from capitalTimeline.
// Do NOT query home_systems directly.
// This ensures permit-derived and inferred systems are visible.

import { useCapitalTimeline } from "@/hooks/useCapitalTimeline";

// Replace lines 44-60 (home_systems query) with:
const { timeline, loading: timelineLoading, error: timelineError } = useCapitalTimeline({
  homeId: home?.id,
  enabled: !!home?.id,
});

// Find matching system in timeline (lines 62-92 become):
const system: SystemTimelineEntry | null = (() => {
  // Guardrail: Timeline must be fully loaded before rendering
  if (!timeline || !timeline.systems) return null;
  
  // Find by systemId match
  return timeline.systems.find(s => s.systemId === systemKey) ?? null;
})();
```

### Change 2: Add Explicit Timeline Absence Handling

Before branching into found/not-found states, handle partial load:

```typescript
// Handle loading state (timeline still fetching)
if (timelineLoading || !timeline) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Handle timeline error
if (timelineError) {
  return (
    <div className="min-h-screen bg-background p-4">
      <p className="text-muted-foreground">Unable to load system data.</p>
      <button onClick={handleBack} className="text-primary mt-4">Go back</button>
    </div>
  );
}
```

### Change 3: Refine "Not Detected" Copy (Trust Fix)

Replace "No data available yet" with honest, authoritative language:

```typescript
// Valid system type but not in timeline - show "not detected" state
if (!system && isValidSystem && systemKey && timeline?.systems) {
  const systemLabel = getSystemMetaLabel(systemKey);
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <button onClick={handleBack} className="...">← Back</button>
      </header>
      
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{systemLabel}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            This system isn't detected for this home
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  We haven't detected a {systemLabel.toLowerCase()} for your home.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  If you believe this is incorrect, you can add it manually.
                </p>
              </div>
            </div>
            
            <div className="pt-2 space-y-2">
              <Button onClick={() => navigate(`/systems/${systemKey}`)} className="w-full">
                Add {systemLabel} Details
              </Button>
              <Button variant="outline" onClick={handleBack} className="w-full">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## Guardrail 1: Architecture Comment

Add at the top of the component (after imports):

```typescript
/**
 * SystemPlanPage - Route handler for /systems/:systemKey/plan
 * 
 * IMPORTANT ARCHITECTURE GUARDRAIL:
 * This page MUST source systems from useCapitalTimeline (capital-timeline edge function).
 * 
 * DO NOT query home_systems directly.
 * 
 * Rationale:
 * - capitalTimeline is the definitive authority for lifecycle logic
 * - It resolves systems from multiple sources (permits, home age, user input)
 * - Direct home_systems queries miss permit-derived and inferred systems
 * - This caused the "No data available" bug for systems visible on desktop
 */
```

---

## Guardrail 2: SYSTEM_CONFIGS Validation

Before rendering `SystemPlanView`, validate that cost config exists:

```typescript
import { SYSTEM_CONFIGS, SystemType } from '@/types/system';
// OR if importing from shared:
// Check if systemKey has valid config

// Before final render:
const hasValidConfig = systemKey && SYSTEM_CONFIGS[systemKey as SystemType];

if (system && !hasValidConfig) {
  return (
    <div className="min-h-screen bg-background p-4">
      <p className="text-muted-foreground">
        Planning data for this system is coming soon.
      </p>
      <button onClick={handleBack} className="text-primary mt-4">
        Go back
      </button>
    </div>
  );
}
```

---

## Guardrail 3: Remove Dead Helper Functions

After switching to `useCapitalTimeline`, these helpers are no longer needed and should be removed to prevent future confusion:

- `createDefaultSystemEntry()` (lines 221-252)
- `getSystemLabel()` (lines 254-261) — use `getSystemMetaLabel` from systemMeta.ts
- `getSystemCategory()` (lines 263-267)
- `getDataQuality()` (lines 269-274)
- `calculateEarlyYear()` (lines 276-290)
- `calculateLikelyYear()` (lines 292-306)
- `calculateLateYear()` (lines 308-322)

These were band-aids for direct DB access. The timeline provides `SystemTimelineEntry` directly.

---

## Final Component Structure

```text
SystemPlanPage
  ├── useParams() → systemKey
  ├── useAuth() → user
  ├── useQuery (homes table) → home.id
  ├── useCapitalTimeline({ homeId }) → timeline ✓ CANONICAL SOURCE
  │
  ├── Render branches:
  │   ├── timelineLoading or !timeline → Loading spinner
  │   ├── timelineError → Error state
  │   ├── !isValidSystemKey → "System not found"
  │   ├── !hasValidConfig → "Coming soon"
  │   ├── !system (valid key, not in timeline) → "Not detected" (with add option)
  │   └── system found → SystemPlanView
```

---

## Files Changed

| File | Changes |
|------|---------|
| `src/pages/SystemPlanPage.tsx` | Replace `home_systems` query with `useCapitalTimeline`, add guardrail comments, update copy, remove dead helpers |

---

## Validation

After this fix:
- `/systems/water_heater/plan` will show the plan if the water heater is visible on the desktop dashboard
- Both views consume the same authority: `capital-timeline`
- Copy is honest: "not detected" vs. "no data available"
- Future devs cannot accidentally regress due to guardrail comments

