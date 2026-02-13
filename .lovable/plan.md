
## Intelligent, Context-Aware Greeting Engine for Habitta

### Current State Analysis

**What works today:**
- `generatePersonalBlurb()` in `chatGreetings.ts` generates 3 greeting states (first_visit, returning_stable, returning_partial)
- `ChatConsole` accepts `baselineSystems`, `confidenceLevel`, `verifiedSystemCount`, and `totalSystemCount`
- `MiddleColumn` already has access to `strengthScore`, `strengthLevel`, and `nextGain` from the home confidence computation
- Data is available: system states (planning_window, elevated), record strength (0-100), recommended actions
- The greeting is injected via `injectMessage()` when `messages.length === 0`

**What's missing:**
- No awareness of system urgency (elevated/planning_window states are ignored)
- No awareness of profile completion % or "next gain" actions
- No awareness of user dormancy (days since last touch)
- No mechanism to detect recent actions (referrals sent, system updates)
- Generic conversation starters that don't adapt to the specific context
- No template variety to prevent repetition ("freshness")

### Proposed Solution: Priority-Based Strategy Selector

Replace the current 3-state system with a 5-priority strategy system that evaluates signals in strict order:

**Priority Hierarchy:**
1. **The Follow-Up** — Recent action detected (e.g., referrals sent in last 48 hours). Closes the loop on pending tasks.
2. **The Guardian** — Systems in elevated or planning_window state. Addresses critical "Plan Now" situations.
3. **The Historian** — User dormancy > 30 days. Validates continuity and presence.
4. **The Builder** — Record strength < 70% AND nextGain exists. Gamifies profile completion with specific actions.
5. **The Neighbor** — Fallback. Confident/stable systems, no urgency.

### Data Architecture

Expand the `GreetingContext` interface to include:

```typescript
interface EnhancedGreetingContext {
  // Core signals (already available)
  strengthScore: number;              // 0-100 (e.g., 33)
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  totalSystemCount: number;
  
  // System state signals (from baselineSystems)
  elevatedSystems: string[];          // System display names in 'elevated' state
  planningWindowSystems: string[];    // System display names in 'planning_window'
  
  // Growth signals (from homeConfidence)
  nextGain?: {
    action: string;                   // e.g., "Upload a photo of your HVAC"
    delta: number;                    // e.g., 4
    systemKey: string;
  } | null;
  
  // Recency signals (from homeConfidence.lastTouchAt)
  daysSinceLastTouch: number;         // Days since last home_systems/home_events update
  
  // Recent action tracking (new signal source)
  recentAction?: {
    type: 'REFERRAL_SENT' | 'SYSTEM_ADDED' | 'PHOTO_UPLOAD';
    systemDisplayName?: string;
    meta?: { topProName?: string };   // e.g., "New Leaf Irrigation"
  };
  
  // Session management
  isFirstVisit: boolean;
}
```

### Implementation Files

#### 1. `src/lib/chatGreetings.ts` — Core Engine Rewrite

- Replace `determineGreetingState()` with `determineGreetingStrategy()` that evaluates the priority matrix
- Create a `STRATEGY_TEMPLATES` map with multiple template variations for each strategy (prevents repetition)
- Implement `generateHabittaBlurb()` as the main function that:
  - Calls `determineGreetingStrategy()`
  - Randomly selects a template from the chosen strategy (via day-of-week seed or Math.random)
  - Injects dynamic data (systemName, score, days since touch, etc.)
  - Returns an object with `text`, `strategy`, and `starters`
- Add helper functions:
  - `calculateDaysSince(lastDate)` — Safely handle null/undefined timestamps
  - `getStartersForStrategy(strategy, context)` — Return dynamic button text based on strategy

**Template Structure (example for The Builder):**
```typescript
const builderTemplates = [
  (ctx) => `We're at ${ctx.strengthScore}%. Snapping a photo of your ${ctx.nextGain?.systemKey} would sharpen your maintenance timeline (+${ctx.nextGain?.delta} points).`,
  (ctx) => `I want to move your record from 'Moderate' to 'Strong.' A photo of the ${ctx.nextGain?.systemKey} label gets us +${ctx.nextGain?.delta} points closer.`,
  (ctx) => `I'm tracking your ${ctx.nextGain?.systemKey} based on permits, but a photo of the manufacturer label would make this record 100% verified.`
];
```

**Conversation Starters (dynamic per strategy):**
- **The Follow-Up**: ["I called them"] ["Not yet"] ["Find more options"]
- **The Guardian**: ["Show me options"] ["Why is it red?"] ["I replaced it"]
- **The Builder**: ["Where is the label?"] ["What else can I add?"]
- **The Historian**: ["What changed?"] ["Show me my timeline"]
- **The Neighbor**: [] (omit starters for stable state)

#### 2. `src/components/dashboard-v3/ChatConsole.tsx` — Props & Injection

**New Props:**
- `strengthScore?: number` (already available, from MiddleColumn)
- `strengthLevel?: StrengthLevel` (already available, from MiddleColumn)
- `nextGain?: { action; delta; systemKey } | null` (already available, from MiddleColumn)
- `daysSinceLastTouch?: number` (needs to be computed and threaded)
- `recentAction?: { type; systemDisplayName; meta }` (new: needs session detection)

**Updated Greeting Injection (line 260-275):**
- When `messages.length === 0`, construct an `EnhancedGreetingContext` from props + baselineSystems
- Extract `elevatedSystems` and `planningWindowSystems` from baselineSystems by state
- Call `generateHabittaBlurb(context)` instead of `generatePersonalBlurb()`
- Receive object with `{ text, starters }` and inject both

**Updated ConversationStarters Component:**
- Accept a `starters` array as prop instead of deriving from hardcoded logic
- Render dynamic buttons based on the selected strategy

#### 3. `src/components/dashboard-v3/MiddleColumn.tsx` — Data Threading

**Enhancements:**
- Compute `daysSinceLastTouch` from `homeConfidence.lastTouchAt` (already computed in useHomeConfidence hook but not passed down)
- Extract elevated/planning_window system names before passing to ChatConsole
- Pass `strengthScore`, `strengthLevel`, `nextGain` to ChatConsole (already done, no change needed)
- Pass `daysSinceLastTouch` to ChatConsole (new)

**Calculate days since touch:**
```typescript
const daysSinceLastTouch = useMemo(() => {
  if (!homeConfidence?.lastTouchAt) return 999;
  const now = new Date();
  const last = new Date(homeConfidence.lastTouchAt);
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}, [homeConfidence?.lastTouchAt]);
```

#### 4. `src/lib/dateUtils.ts` — Helper Utilities (Optional, for clarity)

Create utility functions to encapsulate date logic:
```typescript
export const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => { /* existing */ };
export const calculateDaysSince = (lastDate?: string | Date | null): number => { /* new */ };
```

### Data Flow Diagram

```
MiddleColumn (has homeConfidence, baselineSystems, strengthScore, nextGain)
  ↓
  Extract: elevatedSystems, planningWindowSystems, daysSinceLastTouch
  ↓
  Thread to ChatConsole:
    - strengthScore
    - nextGain
    - daysSinceLastTouch
    - elevatedSystems (derived)
    - planningWindowSystems (derived)
  ↓
ChatConsole (when messages.length === 0 && !isRestoring)
  ↓
  Build EnhancedGreetingContext from props + baselineSystems
  ↓
  Call determineGreetingStrategy(context)
  ↓
  Select random template from STRATEGY_TEMPLATES[strategy]
  ↓
  injectMessage(text) + render ConversationStarters(starters)
```

### Edge Cases Handled

1. **No system urgency + strong record** → The Neighbor (stable/confident tone)
2. **System urgent but user absent 60 days** → The Historian (validates presence) + system urgency noted
3. **Low record + clear nextGain** → The Builder (gamified path forward)
4. **First visit + urgent system** → First Visit greeting overrides (onboarding takes priority)
5. **Null lastTouchAt** → Default to high "days since touch" (999) to trigger Historian if other signals quiet

### Why This Solves the "Stability Fallacy"

- **Zero Amnesia**: The Guardian check runs first (Priority 2). If any system is elevated/planning_window, "Your home is stable" is never rendered.
- **Visual Parity**: If the user sees a red "Plan Now" bar on the dashboard, Habitta will be addressing that system in the greeting.
- **Actionable Hooks**: Starters are strategy-specific, not generic. "I Know the Year" → The Builder gets "Where is the label?" not "Show me details."
- **Freshness**: Multiple templates per strategy ensure repeated greetings don't feel like a script.

### Implementation Sequence

1. **Rewrite `src/lib/chatGreetings.ts`**: Add new types, strategy selector, templates, helpers
2. **Update `src/components/dashboard-v3/MiddleColumn.tsx`**: Compute daysSinceLastTouch, thread new props
3. **Update `src/components/dashboard-v3/ChatConsole.tsx`**: Accept new props, pass to greeting generator, update ConversationStarters
4. **Test**: Verify greeting displays correctly on fresh session, handles all 5 strategies, starters render dynamically

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/chatGreetings.ts` | Rewrite greeting engine with 5 strategies, templates, helpers |
| `src/components/dashboard-v3/MiddleColumn.tsx` | Compute/thread daysSinceLastTouch and system state arrays |
| `src/components/dashboard-v3/ChatConsole.tsx` | Accept new props, inject enriched greeting, update starters component |
| `src/lib/dateUtils.ts` (optional) | Extract date utilities for clarity |

