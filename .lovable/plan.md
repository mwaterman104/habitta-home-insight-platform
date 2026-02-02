

# Implementation Plan: Revised Greeting System for Habitta

## Overview

Replace the current process-focused greeting logic with a state-aware, user-centric greeting system that leads with outcomes (stability, peace of mind) and frames uncertainty as learning progress.

---

## Critical Field Mappings (Verified)

### BaselineSystem Interface (from `BaselineSurface.tsx`)

```typescript
export interface BaselineSystem {
  key: string;
  displayName: string;                          // ✅ Already formatted: "HVAC", "Water Heater"
  state: SystemState;
  confidence: number;
  monthsRemaining?: number;
  baselineStrength?: number;
  ageYears?: number;
  expectedLifespan?: number;
  installSource?: 'permit' | 'inferred' | 'unknown';  // ✅ Use this for verification
  installYear?: number | null;
  installedLine?: string;
}
```

### Mapping Logic

| Greeting System Needs | Actual Field | Mapping Logic |
|----------------------|--------------|---------------|
| Is system verified? | `installSource === 'permit'` | Permit = verified |
| System display name | `displayName` | Use directly (already formatted) |
| System key/ID | `key` | Use directly |
| System status | `state` | Use directly |

### Helper Functions (Corrected)

```typescript
/**
 * Check if system has verified (permit-based) install data
 */
function isSystemVerified(system: BaselineSystem): boolean {
  return system.installSource === 'permit';
}

/**
 * Get system display name (already formatted)
 */
function getSystemDisplayName(system: BaselineSystem): string {
  return system.displayName;
}
```

---

## Key Changes Summary

| Current Behavior | New Behavior |
|------------------|--------------|
| "Your home has 3 systems I'm tracking" | "Your home is stable—I'm monitoring 3 systems" |
| Generic system counts | Specific system names (HVAC, water heater, roof) |
| "Establishing baseline" (jargon) | "Gathering baseline data" (accessible) |
| No engagement hooks | Soft engagement prompts ("Want to see what I know?") |
| Single template for all states | State-aware templates (first visit, stable, partial) |

---

## Technical Architecture

### New File: `src/lib/chatGreetings.ts`

Creates a new greeting module with:

1. **State determination logic** - Determines which greeting state applies
2. **Greeting templates by state** - Different templates for first visit, returning stable, returning partial
3. **Helper functions** - System name formatting, list building, time-of-day detection
4. **A/B testing support** - Multiple variations per state for future testing
5. **Drop-in replacement** - Exports `generatePersonalBlurb()` that accepts `BaselineSystem[]`

---

## File Changes

### File 1: `src/lib/chatGreetings.ts` (NEW)

Complete implementation with corrected field mappings:

```typescript
/**
 * Revised Greeting System for Habitta
 * 
 * Philosophy:
 * - Lead with outcome (stability, peace of mind), not process
 * - Frame uncertainty as learning, not incompleteness
 * - Use specific system names when available
 * - Provide soft engagement hooks
 * - Differentiate by user state (first visit, returning, etc.)
 */

import type { BaselineSystem } from '@/components/dashboard-v3/BaselineSurface';

// ============================================
// Types
// ============================================

export type GreetingState = 
  | 'first_visit'       // User has never seen Habitta before
  | 'returning_stable'  // All systems verified, nothing needs attention
  | 'returning_partial' // Some systems verified, still learning others
  | 'returning_attention' // Handled by advisor opening (not here)
  ;

export interface GreetingContext {
  state: GreetingState;
  systems: BaselineSystem[];
  verifiedCount: number;
  establishingCount: number;
  hasActiveRisks: boolean;
  propertyName?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

// ============================================
// Verification Helper (Corrected Mapping)
// ============================================

/**
 * Check if system has verified (permit-based) install data
 * Uses installSource field from BaselineSystem
 */
function isSystemVerified(system: BaselineSystem): boolean {
  return system.installSource === 'permit';
}

// ============================================
// Main Greeting Generator
// ============================================

export function generateGreeting(context: GreetingContext): string {
  const { state } = context;
  
  switch (state) {
    case 'first_visit':
      return generateFirstVisitGreeting(context);
    
    case 'returning_stable':
      return generateStableGreeting(context);
    
    case 'returning_partial':
      return generatePartialGreeting(context);
    
    default:
      return generateStableGreeting(context);
  }
}

// ============================================
// Greeting Templates by State
// ============================================

function generateFirstVisitGreeting(context: GreetingContext): string {
  const { timeOfDay, systems, propertyName } = context;
  const systemCount = systems.length;
  
  let greeting = `Good ${timeOfDay}${propertyName ? ` and welcome to ${propertyName}` : ''}. I'm Habitta—I monitor your home's key systems and give you advance notice when something needs attention.`;
  
  if (systemCount > 0) {
    const systemNames = getSystemNamesSummary(systems, 3);
    greeting += ` I'm tracking ${systemCount} systems for you: ${systemNames}.`;
  }
  
  greeting += ` I'm gathering baseline data on your systems right now, which helps me spot when things change.`;
  greeting += ` This means you'll get proactive alerts instead of emergency surprises.`;
  greeting += ` Want to see what I've learned about your home so far?`;
  
  return greeting;
}

function generateStableGreeting(context: GreetingContext): string {
  const { timeOfDay, systems, verifiedCount } = context;
  const systemCount = systems.length;
  
  let greeting = `Good ${timeOfDay}. Your home is stable—I'm monitoring ${systemCount} ${systemCount === 1 ? 'system' : 'systems'} and nothing needs immediate attention.`;
  
  if (verifiedCount === systemCount) {
    greeting += ` I've verified all your systems from permit records and historical data.`;
  } else if (verifiedCount > 0) {
    const verifiedNames = getVerifiedSystemNames(systems, 2);
    greeting += ` I've verified ${verifiedNames} from permit records.`;
  }
  
  greeting += ` I'll let you know if I spot anything that needs your attention. Want to see details on any of your systems?`;
  
  return greeting;
}

function generatePartialGreeting(context: GreetingContext): string {
  const { timeOfDay, systems, verifiedCount, establishingCount } = context;
  const systemCount = systems.length;
  
  let greeting = `Good ${timeOfDay}. Your home is stable—I'm monitoring ${systemCount} ${systemCount === 1 ? 'system' : 'systems'} and nothing needs immediate attention.`;
  
  if (verifiedCount > 0) {
    const verifiedNames = getVerifiedSystemNames(systems, 3);
    greeting += ` I've verified ${verifiedNames} from permit records.`;
  }
  
  if (establishingCount > 0) {
    const establishingNames = getEstablishingSystemNames(systems, 2);
    if (establishingNames) {
      greeting += ` I'm still gathering baseline data on ${establishingNames}—this helps me give you accurate timelines when things need attention.`;
    } else {
      greeting += ` I'm still gathering baseline data on ${establishingCount} ${establishingCount === 1 ? 'system' : 'systems'}.`;
    }
  }
  
  greeting += ` Want to see what I know so far?`;
  
  return greeting;
}

// ============================================
// Helper Functions (Using Correct Fields)
// ============================================

/**
 * Get summary of system names using displayName field
 */
function getSystemNamesSummary(systems: BaselineSystem[], maxCount: number = 3): string {
  const names = systems
    .filter(s => s.displayName)
    .map(s => s.displayName)  // Use displayName directly - already formatted
    .slice(0, maxCount);
  
  const remaining = systems.length - names.length;
  
  if (remaining > 0) {
    return `${names.join(', ')}, and ${remaining} more`;
  }
  
  return formatList(names);
}

/**
 * Get names of verified systems (installSource === 'permit')
 */
function getVerifiedSystemNames(systems: BaselineSystem[], maxCount: number = 3): string {
  const verified = systems
    .filter(s => isSystemVerified(s) && s.displayName)
    .map(s => s.displayName)
    .slice(0, maxCount);
  
  if (verified.length === 0) return '';
  
  const totalVerified = systems.filter(isSystemVerified).length;
  const remaining = totalVerified - verified.length;
  
  if (remaining > 0) {
    return `${formatList(verified)} and ${remaining} more`;
  }
  
  return formatList(verified);
}

/**
 * Get names of systems still being established (not permit-verified)
 */
function getEstablishingSystemNames(systems: BaselineSystem[], maxCount: number = 2): string {
  const establishing = systems
    .filter(s => !isSystemVerified(s) && s.displayName)
    .map(s => s.displayName)
    .slice(0, maxCount);
  
  if (establishing.length === 0) return '';
  
  const totalEstablishing = systems.filter(s => !isSystemVerified(s)).length;
  const remaining = totalEstablishing - establishing.length;
  
  if (remaining > 0) {
    return `${formatList(establishing)} and ${remaining} more`;
  }
  
  return formatList(establishing);
}

/**
 * Format array into natural language list
 */
function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return `your ${items[0]}`;
  if (items.length === 2) return `your ${items[0]} and ${items[1]}`;
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  return `your ${otherItems.join(', ')}, and ${lastItem}`;
}

/**
 * Get time of day for greeting
 */
export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Determine greeting state based on context
 */
export function determineGreetingState(context: {
  isFirstVisit: boolean;
  systems: BaselineSystem[];
  hasActiveRisks: boolean;
}): GreetingState {
  const { isFirstVisit, systems, hasActiveRisks } = context;
  
  if (isFirstVisit) {
    return 'first_visit';
  }
  
  if (hasActiveRisks) {
    return 'returning_attention';
  }
  
  const verifiedCount = systems.filter(isSystemVerified).length;
  const totalCount = systems.length;
  
  if (verifiedCount === totalCount && totalCount > 0) {
    return 'returning_stable';
  }
  
  return 'returning_partial';
}

// ============================================
// Drop-in Replacement for ChatConsole
// ============================================

/**
 * Drop-in replacement for generatePersonalBlurb from chatModeCopy.ts
 * 
 * @param systems - BaselineSystem array from ChatConsole props
 * @param isFirstVisit - Whether this is the user's first visit
 */
export function generatePersonalBlurb(
  systems: BaselineSystem[], 
  isFirstVisit: boolean = false
): string {
  const verifiedCount = systems.filter(isSystemVerified).length;
  const establishingCount = systems.length - verifiedCount;
  
  // Check for active risks (planning window or elevated state)
  const hasActiveRisks = systems.some(
    s => s.state === 'planning_window' || s.state === 'elevated'
  );
  
  const state = determineGreetingState({
    isFirstVisit,
    systems,
    hasActiveRisks,
  });
  
  // If there are active risks, let the advisor opening handle it
  if (state === 'returning_attention') {
    // Fall back to stable greeting - advisor will add the alert
    const context: GreetingContext = {
      state: 'returning_stable',
      systems,
      verifiedCount,
      establishingCount,
      hasActiveRisks: false,
      timeOfDay: getTimeOfDay(),
    };
    return generateGreeting(context);
  }
  
  const context: GreetingContext = {
    state,
    systems,
    verifiedCount,
    establishingCount,
    hasActiveRisks: false,
    timeOfDay: getTimeOfDay(),
  };
  
  return generateGreeting(context);
}
```

---

### File 2: `src/components/dashboard-v3/ChatConsole.tsx`

Update import and simplify the greeting call:

**Import change (around line 31):**

```typescript
// OLD
import { 
  generatePersonalBlurb,
  getPromptsForMode, 
  getEmptyStateForMode,
  // ... other imports
} from '@/lib/chatModeCopy';

// NEW
import { 
  getPromptsForMode, 
  getEmptyStateForMode,
  // ... other imports (keep all except generatePersonalBlurb)
} from '@/lib/chatModeCopy';
import { generatePersonalBlurb } from '@/lib/chatGreetings';
```

**Simplify greeting generation (around lines 255-264):**

```typescript
// OLD
const message = generatePersonalBlurb({
  yearBuilt,
  systemCount: baselineSystems.length,
  planningCount,
  confidenceLevel,
  isFirstVisit: isFirstUserVisit,
  verifiedSystemCount,
  totalSystemCount: totalSystemCount ?? baselineSystems.length,
});

// NEW (much simpler - systems have all the data)
const message = generatePersonalBlurb(
  baselineSystems, 
  isFirstUserVisit
);
```

---

## Greeting Examples by State

### First Visit
```
Good morning and welcome. I'm Habitta—I monitor your home's key systems 
and give you advance notice when something needs attention. I'm tracking 
3 systems for you: your HVAC, Water Heater, and Roof. I'm gathering 
baseline data on your systems right now, which helps me spot when things 
change. This means you'll get proactive alerts instead of emergency 
surprises. Want to see what I've learned about your home so far?
```

### Returning - All Verified (Stable)
```
Good afternoon. Your home is stable—I'm monitoring 3 systems and nothing 
needs immediate attention. I've verified all your systems from permit 
records and historical data. I'll let you know if I spot anything that 
needs your attention. Want to see details on any of your systems?
```

### Returning - Partial Data
```
Good evening. Your home is stable—I'm monitoring 3 systems and nothing 
needs immediate attention. I've verified your HVAC and Water Heater from 
permit records. I'm still gathering baseline data on your Roof—this helps 
me give you accurate timelines when things need attention. Want to see 
what I know so far?
```

---

## Files to Modify Summary

| File | Action | Changes |
|------|--------|---------|
| `src/lib/chatGreetings.ts` | CREATE | Full greeting system with correct `BaselineSystem` field mappings |
| `src/components/dashboard-v3/ChatConsole.tsx` | MODIFY | Update import, simplify greeting call to pass `baselineSystems` directly |

---

## Backward Compatibility

- The old `generatePersonalBlurb` in `chatModeCopy.ts` remains untouched
- New function has simpler signature: `(systems: BaselineSystem[], isFirstVisit?: boolean)`
- All other imports from `chatModeCopy.ts` continue to work unchanged

---

## Test Checklist

- [ ] First visit greeting shows value prop and engagement hook
- [ ] Returning user (all verified) shows stable message with system names
- [ ] Returning user (partial) shows verified + learning message
- [ ] Time-of-day greetings work correctly (morning/afternoon/evening)
- [ ] Singular/plural grammar is correct ("1 system" vs "3 systems")
- [ ] System names use `displayName` correctly (HVAC, Water Heater, Roof)
- [ ] Verification check uses `installSource === 'permit'` correctly
- [ ] Greeting doesn't duplicate if user has existing messages
- [ ] Session storage flags work correctly per property

