

# Chat State Machine — Refined Implementation with QC Adjustments

## Overview

Implement a 4-mode Chat State Machine that controls chat behavior based on **epistemic confidence**. When data is insufficient, chat enters "Baseline Establishment Mode" and invites photo-based calibration as an optional capability, not a task.

**Core Doctrine**: Habitta does not advise until it can explain why it believes something.

---

## QC Adjustments Incorporated

| Issue | Problem | Fix |
|-------|---------|-----|
| QC #1 | Strategic mode can bypass confidence gating | Strategic requires advisory eligibility first |
| QC #2 | Confidence derivation overloaded (equity vs system) | Separate `systemConfidence` from `equityConfidence` |
| QC #3 | InstallYearsKnown too permissive | Require 50%+ of critical systems |
| QC #4 | Mode transition on photo ignores result | Transition requires confidence delta, not just action |
| QC #5 | Empty state copy too invitational | Soften to observational posture |

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/types/chatMode.ts` | **Create** | Chat mode types and context interface |
| `src/lib/chatModeCopy.ts` | **Create** | Mode-specific copy governance |
| `src/lib/chatModeSelector.ts` | **Create** | Deterministic mode selection logic |
| `src/hooks/useChatMode.ts` | **Create** | Hook to derive chat mode from system data |
| `src/lib/systemConfidenceDerivation.ts` | **Create** | System-level confidence aggregation (separate from equity) |
| `src/lib/todaysFocusCopy.ts` | **Modify** | Add banned task phrases |
| `src/components/dashboard-v3/ChatDock.tsx` | **Modify** | Render mode-specific prompts and opening messages |
| `src/hooks/useAIHomeAssistant.ts` | **Modify** | Accept chat mode context for API calls |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Modify** | Pass chat mode context to ChatDock |
| `src/pages/DashboardV3.tsx` | **Modify** | Fetch permit/system data, derive chat mode, pass to MiddleColumn |

---

## Part 1: Type System

**File:** `src/types/chatMode.ts`

```text
ChatMode = 
  | 'baseline_establishment'  // systemConfidence = Early, insufficient install data
  | 'observational'           // Moderate confidence, partial data
  | 'advisory'                // High confidence OR user confirmed systems
  | 'strategic'               // User-initiated AND already in advisory mode

ChatModeContext = {
  mode: ChatMode
  systemConfidence: 'Early' | 'Moderate' | 'High'
  permitsFound: boolean
  criticalSystemsCoverage: number  // 0.0 → 1.0 (QC #3 fix)
  userConfirmedSystems: boolean
  systemsWithLowConfidence: string[]
  previousMode?: ChatMode  // For strategic transition validation (QC #1)
}

CRITICAL_SYSTEMS = ['hvac', 'roof', 'water_heater', 'electrical']
```

---

## Part 2: System Confidence Derivation (QC #2 Fix)

**File:** `src/lib/systemConfidenceDerivation.ts`

This separates **system-level confidence** (for chat mode) from **equity confidence** (for financial cards).

```text
function deriveSystemConfidence(systems: HomeSystem[]): 'Early' | 'Moderate' | 'High'
  
  1. Filter to critical systems only (HVAC, roof, water_heater, electrical)
  2. For each, compute individual confidence from:
     - install_date presence
     - manufacture_year presence
     - data_sources array
     - confidence_scores object
  3. Average the scores across critical systems
  4. Map to bucket:
     - < 0.40 → 'Early'
     - 0.40 - 0.70 → 'Moderate'
     - >= 0.70 → 'High'

function computeCriticalSystemsCoverage(systems: HomeSystem[]): number
  
  1. Count critical systems with install_date OR manufacture_year
  2. Divide by total critical systems (4)
  3. Return ratio (0.0 → 1.0)
```

**Key Rule**: This is NOT equity confidence. Chat mode uses system confidence.

---

## Part 3: Mode Selector (QC #1 Fix - Strategic Nested)

**File:** `src/lib/chatModeSelector.ts`

```text
function determineChatMode(ctx: ChatModeContext): ChatMode

  // QC #3: Require 50%+ critical systems coverage
  const hasAdequateCoverage = ctx.criticalSystemsCoverage >= 0.5

  // Baseline: Early confidence AND insufficient coverage
  if (ctx.systemConfidence === 'Early' && !hasAdequateCoverage) {
    return 'baseline_establishment'
  }

  // Observational: Moderate confidence
  if (ctx.systemConfidence === 'Moderate') {
    return 'observational'
  }

  // Advisory: High confidence OR user confirmed
  if (ctx.systemConfidence === 'High' || ctx.userConfirmedSystems) {
    return 'advisory'
  }

  // Fallback
  return 'observational'

// QC #1 Fix: Strategic is a SUB-STATE of advisory, not parallel
function canEnterStrategic(currentMode: ChatMode, userIntent: string): boolean
  
  // Strategic requires advisory eligibility first
  if (currentMode !== 'advisory') {
    return false
  }
  
  const strategicIntents = ['renovation', 'equity', 'refinancing', 'second property']
  return strategicIntents.some(i => userIntent.toLowerCase().includes(i))
```

**Doctrine Guardrail**: Strategic mode can never skip baseline/observational.

---

## Part 4: Copy Governance

**File:** `src/lib/chatModeCopy.ts`

### Baseline Establishment Mode Copy

**Opening Message (system-initiated, once):**
```text
"I'm currently working with limited system history for this home.
I can still monitor patterns, but accuracy improves when installations can be confirmed."
```

**Secondary Line (capability framing):**
```text
"If you'd like, we can establish a clearer baseline by identifying what's installed."
```

**Optional Clarifier:**
```text
"Photos of equipment labels or installations are usually enough."
```

### Mode-Specific Suggested Prompts

```text
Baseline Establishment:
  - "Help establish a clearer baseline"
  - "What information would improve accuracy?"
  - "What can you tell from what you see now?"

Observational:
  - "What are you seeing?"
  - "How confident is this assessment?"
  - "What factors influence this?"

Advisory:
  - "Walk me through my options"
  - "What happens if I wait?"
  - "Help me understand the timeline"

Strategic (only after advisory consent):
  - "Could I afford a renovation?"
  - "What does my equity position enable?"
  - "Help me think through financing options"
```

### Empty State Messages (QC #5 Fix)

```text
Baseline:
  "I'm monitoring with limited system history. I can share what I'm able to observe so far."
  
  (Changed from "Ask what I can see so far" - reduces invitation pressure)

Observational:
  "What would you like to understand about your home?"

Advisory:
  "I can help you think through your options."

Strategic:
  "We can explore financial possibilities together."
```

---

## Part 5: Banned Task Phrases Update

**File:** `src/lib/todaysFocusCopy.ts`

Add to existing `BANNED_PHRASES`:

```text
// Task language (Baseline Mode violations)
'Please upload',
'To continue',
'Required',
'Missing data',
'You need to',
'Next step',
'Complete your',
'Finish setup',
'Help us by',
'Let\'s get',
```

---

## Part 6: Chat Mode Hook

**File:** `src/hooks/useChatMode.ts`

```text
function useChatMode(options: {
  homeId?: string
  systems: HomeSystem[]
  permitsFound: boolean
}): ChatModeContext

  1. Derive systemConfidence via deriveSystemConfidence(systems)
  
  2. Compute criticalSystemsCoverage via computeCriticalSystemsCoverage(systems)
  
  3. Check userConfirmedSystems:
     - Any system has data_sources containing 'user', 'manual', or 'owner_reported'
  
  4. Find systemsWithLowConfidence:
     - Systems where overall confidence score < 0.4
  
  5. Call determineChatMode() with full context
  
  6. Return ChatModeContext
```

---

## Part 7: ChatDock Updates

**File:** `src/components/dashboard-v3/ChatDock.tsx`

### New Props

```text
interface ChatDockProps {
  // ... existing props
  chatMode: ChatMode
  systemsWithLowConfidence?: string[]
}
```

### Mode-Specific Rendering

```text
Suggested Prompts Section:
  - Replace hardcoded prompts (lines 256-274)
  - Use getPromptsForMode(chatMode) from chatModeCopy

Opening Message Injection:
  - When chatMode === 'baseline_establishment' AND messages.length === 0:
    → Inject baseline opening message once
    → Track via sessionStorage key: 'habitta_baseline_opening_shown'

Empty State:
  - Use getEmptyStateForMode(chatMode) from chatModeCopy

Upload Affordance (Baseline Only):
  - When chatMode === 'baseline_establishment':
    → Show subtle "Improve accuracy" link below prompts
    → Equal visual weight to dismiss option
```

### State Indicator Updates

```text
Current (line 175-178):
  {advisorState === 'DECISION' && '• Comparing options'}
  {advisorState === 'EXECUTION' && '• Ready to act'}

Add:
  {chatMode === 'baseline_establishment' && '• Establishing baseline'}
  {chatMode === 'observational' && '• Observing patterns'}
```

---

## Part 8: Hook Updates

**File:** `src/hooks/useAIHomeAssistant.ts`

### Add Chat Mode to API Context

```text
interface UseAIHomeAssistantOptions {
  // ... existing
  chatMode?: ChatMode
}
```

Pass `chatMode` in edge function body so AI backend adjusts response style.

---

## Part 9: Data Wiring

**File:** `src/pages/DashboardV3.tsx`

### Add Data Fetches

```text
// Existing: useHomeSystems hook not currently used at dashboard level
// Add:
const { systems: homeSystems, loading: systemsLoading } = useHomeSystems(userHome?.id)

// Existing: usePermitInsights
const { insights: permitInsights, loading: permitsLoading } = usePermitInsights(userHome?.id)

// New: Derive chat mode
const chatModeContext = useChatMode({
  homeId: userHome?.id,
  systems: homeSystems,
  permitsFound: permitInsights.length > 0,
})
```

### Update MiddleColumn Props (all 3 instances)

```text
<MiddleColumn
  // ... existing props
  chatMode={chatModeContext.mode}
  systemsWithLowConfidence={chatModeContext.systemsWithLowConfidence}
/>
```

**File:** `src/components/dashboard-v3/MiddleColumn.tsx`

### Update Props Interface

```text
interface MiddleColumnProps {
  // ... existing
  chatMode?: ChatMode
  systemsWithLowConfidence?: string[]
}
```

### Pass to ChatDock

```text
<ChatDock
  // ... existing props
  chatMode={chatMode ?? 'observational'}
  systemsWithLowConfidence={systemsWithLowConfidence}
/>
```

---

## Part 10: Photo Upload Confidence Gate (QC #4 Fix)

**Location:** Where photo analysis results are processed (likely `useHomeSystems` or component handling photo capture)

```text
After photo upload and analysis:

  1. Store pre-upload system confidence
  2. Process photo → update system record
  3. Compute post-upload system confidence
  4. Calculate delta = postConfidence - preConfidence

  if (delta > 0.1) {
    // Confidence meaningfully improved
    // Allow mode transition: baseline → observational
    chatModeContext.triggerRecompute()
  } else {
    // Photo didn't help (blurry, wrong subject, etc.)
    // Stay in baseline mode
    // Optionally show gentle feedback: "I couldn't extract details from that image."
  }
```

**Doctrine**: Mode transition is earned by confidence improvement, not by user action alone.

---

## Mode Transition Rules (Updated with QC Fixes)

```text
baseline_establishment → observational
  Trigger: criticalSystemsCoverage >= 0.5 OR systemConfidence improves to Moderate
  AND confidence delta > 0.1 (if triggered by photo)

observational → advisory
  Trigger: systemConfidence reaches High OR userConfirmedSystems = true

advisory → strategic
  Trigger: User asks about renovation, equity, refinancing
  AND current mode is already 'advisory' (QC #1)

strategic → advisory
  Trigger: Conversation ends or user changes topic
```

---

## UI Behavior by Mode (Final Matrix)

| Behavior | Baseline | Observational | Advisory | Strategic |
|----------|----------|---------------|----------|-----------|
| Opening message | Auto-inject once | None | Context-aware | None |
| Prompts | Calibration | Understanding | Options | Planning |
| Upload affordance | Visible, subtle | Hidden | Hidden | Hidden |
| Cost discussion | Blocked | Blocked | Allowed | Allowed |
| Timeline specifics | Blocked | Ranges only | Specific | Detailed |
| Action language | Blocked | Blocked | Soft | Allowed |
| State indicator | "Establishing baseline" | "Observing" | Hidden | Hidden |

---

## What Happens If User Ignores Baseline Calibration

**Nothing.**

- Habitta continues monitoring with lower confidence
- Uses softer language in all surfaces
- Never nags or re-prompts
- No email nudges
- No progress bars
- This preserves trust

---

## Doctrine Comments to Add in Code

```text
// src/types/chatMode.ts
/**
 * DOCTRINE: Chat modes represent epistemic readiness, not user intent.
 * User intent can never elevate chat mode on its own.
 */

// src/lib/chatModeSelector.ts  
/**
 * DOCTRINE: Habitta does not advise until it can explain why it believes something.
 * If chatMode = 'baseline_establishment', all advisory language is blocked.
 */

// src/lib/chatModeSelector.ts (strategic function)
/**
 * QC #1 FIX: Strategic mode is nested inside advisory, not parallel.
 * A user cannot skip from baseline → strategic by asking about renovation.
 */
```

---

## QA Gates

- [ ] No task language in baseline mode ("Please upload", "Required", etc.)
- [ ] Opening message appears once per session only
- [ ] Suggested prompts change based on mode
- [ ] Upload affordance is subtle and optional
- [ ] Mode transitions correctly require confidence improvement (QC #4)
- [ ] Strategic mode blocked unless already in advisory (QC #1)
- [ ] systemConfidence is separate from equityConfidence (QC #2)
- [ ] criticalSystemsCoverage requires 50%+ (QC #3)
- [ ] Works across mobile, tablet, desktop layouts
- [ ] Chat API receives mode context

---

## Doctrine Compliance Checklist

- [ ] Photos framed as capability, not obligation
- [ ] No gamification (progress bars, completion %)
- [ ] Skip option has equal visual weight
- [ ] Confidence improvement is quiet, not celebrated
- [ ] Chat mode is deterministic, not guessed
- [ ] Baseline mode avoids all advisory language
- [ ] Upload feedback says "Received" not "Great job"
- [ ] Strategic requires advisory eligibility (no skipping)

---

## Acceptance Criteria

- [ ] Chat mode derives correctly from system confidence + coverage + permits
- [ ] Baseline mode shows calibration-focused prompts only
- [ ] Opening message appears once per session in baseline mode
- [ ] "Improve accuracy" link appears subtly in baseline mode
- [ ] Advisory prompts only appear in advisory/strategic modes
- [ ] Strategic mode requires advisory as prerequisite
- [ ] Photo uploads trigger mode transition only if confidence improves
- [ ] No regressions in existing chat functionality
- [ ] Mode-specific empty states render correctly

