

## Onboarding-Aware Chat: Revised Plan (QA-Hardened)

### Problem Summary
New users see "Good to see you again. I've been monitoring your 3 systems..." because:
1. `isFirstVisit()` localStorage flag is consumed before chat opens
2. MobileChatPage passes no `strengthScore`, `nextGain`, or `lastTouchAt` to ChatConsole
3. `daysSinceLastTouch` defaults to 999, incorrectly triggering "historian"
4. The edge function receives `strengthScore`/`nextGain` from the frontend but ignores them entirely in the system prompt

---

### Changes Overview

#### 1. New `onboarding` greeting strategy with robust gating
**File:** `src/lib/chatGreetings.ts`

**Gate logic (no time math):**
```text
isOnboarding = !lastTouchAt && strengthScore < 50
```
- Uses `!lastTouchAt` (null/undefined) as the "new account" signal -- deterministic, no timezone issues
- Combined with low strength to distinguish from a well-documented account that just hasn't interacted

**Kill the 999 hack:**
- `daysSinceLastTouch` becomes `number | null` in `HabittaGreetingContext`
- `calculateDaysSince()` returns `null` instead of 999 when input is null/undefined
- `historian` only triggers when `daysSinceLastTouch !== null && daysSinceLastTouch >= 30`

**Updated priority order:**
```text
1. first_visit     -- keep but make extremely narrow (localStorage flag, one-time)
2. follow_up       -- recent referral/upload action
3. onboarding      -- !lastTouchAt && strengthScore < 50
4. guardian         -- elevated/planning_window systems
5. historian        -- daysSinceLastTouch != null && >= 30
6. builder          -- strengthScore < 70 && nextGain exists (ongoing nudges)
7. neighbor         -- stable fallback
```

**Semantic clarity between strategies:**
- `onboarding`: First meaningful chat after account creation. Orientation + inventory walkthrough + first action prompt
- `builder`: Returning user with gaps. Nudges toward specific improvements
- `historian`: True re-engagement after real dormancy (has a real lastTouchAt that's old)

**Onboarding templates use provenance-safe language:**
```text
"Good afternoon. I've started building your home's record.
From public records, I'm tracking 3 systems: Roof, HVAC,
and Water Heater. Most of what I have is estimated from
property data -- your record is at 22%. The fastest way to
sharpen this is to snap a photo of the Water Heater label.
Want to start there, or tell me about any systems you've
already replaced?"
```

**Add system display names to context:**
- Add `systemNames: string[]` to `HabittaGreetingContext` so templates can list discovered systems by name

**Conversation starters for onboarding:**
- "What have you replaced?"
- "Take a photo"
- "What did you find?"

**Persistence guard:**
- Add `hasSeenOnboardingChatGreeting` to localStorage, set once the onboarding greeting fires
- `buildGreetingContext` accepts a new `hasSeenOnboardingGreeting` param; if true, skip onboarding strategy

#### 2. Wire `useHomeConfidence` into MobileChatPage
**File:** `src/pages/MobileChatPage.tsx`

- Import and call `useHomeConfidence(userHome?.id, timeline?.systems || [], userHome?.year_built)`
- Pass `strengthScore={homeConfidence?.score}`, `nextGain={homeConfidence?.nextGain}`, `lastTouchAt={lastTouchAt}` to ChatConsole
- Add a loading guard: don't render ChatConsole until confidence has loaded (show spinner alongside existing `homeLoading || timelineLoading` check)

#### 3. Ensure ChatConsole delays greeting until context arrives
**File:** `src/components/dashboard-v3/ChatConsole.tsx`

Current greeting injection (line ~266) runs when `messages.length === 0 && !hasShownBaselineOpening`. Problem: it can fire before `strengthScore`/`lastTouchAt` arrive, picking a wrong strategy.

Fix: Add a `greetingReady` guard:
```text
const greetingReady = strengthScore !== undefined || lastTouchAt !== undefined || baselineSystems.length > 0;
```
Only run greeting selection when `greetingReady` is true. This ensures we either have confidence data OR have explicitly decided "new account with no data."

Also: if `strengthScore` or `lastTouchAt` change and user hasn't sent a message yet (messages.length <= 1, the injected greeting), recompute greeting. This handles the race where confidence loads after the initial render.

#### 4. Inject onboarding behavioral contract into AI system prompt
**File:** `supabase/functions/ai-home-assistant/index.ts`

The edge function currently receives `strengthScore` and `nextGain` from the request body but ignores them.

- Extract `strengthScore` and `nextGain` from the request body
- Pass them to `createSystemPrompt`
- When `strengthScore < 50`, append an onboarding behavioral contract:

```text
ONBOARDING BEHAVIORAL CONTRACT:
This user recently completed onboarding. Their home record strength is at {strengthScore}%.
Most system data is estimated from public records unless marked [verified].

YOUR PRIMARY GOAL: Help them strengthen their record through natural conversation.

BEHAVIORAL RULES:
- Be proactive. Walk through systems and ask if they know specifics.
- Ask about one system at a time. Don't overwhelm.
- When the user provides info, use update_system_info to persist it.
- After a successful tool call, the second-pass response should
  acknowledge the update factually. Do NOT fabricate updated scores
  unless the actual new score is returned by the tool.
- Suggest photo uploads for {nextGain.systemKey} as the highest-value action.
- Use provenance-safe language: "estimated from property records" vs "confirmed."

PRIORITY ACTION: {nextGain.action} (+{nextGain.delta} points)

FORBIDDEN:
- Do NOT wait passively for questions. Lead the conversation.
- Do NOT say "Let me know if you have questions."
- Do NOT claim the record has changed unless you received confirmation from a tool.
```

#### 5. Fix DashboardV3 greeting context for mobile module
**File:** `src/pages/DashboardV3.tsx`

The dashboard greeting context (line ~550) currently passes `isFirstVisit: isFirstVisit()` but not `daysSinceLastTouch` or `lastTouchAt`. This means the dashboard greeting card can also pick wrong strategies.

- Pass `daysSinceLastTouch: lastTouchAt ? calculateDaysSince(lastTouchAt) : null` to `buildGreetingContext`
- Pass `hasSeenOnboardingGreeting` from localStorage

---

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/lib/chatGreetings.ts` | Add `onboarding` strategy; change `daysSinceLastTouch` to `number \| null`; add `systemNames` and `hasSeenOnboardingGreeting` to context; fix historian guard; add onboarding templates and starters; add localStorage flag helper |
| `src/pages/MobileChatPage.tsx` | Wire `useHomeConfidence`; pass `strengthScore`, `nextGain`, `lastTouchAt` to ChatConsole; extend loading guard |
| `src/components/dashboard-v3/ChatConsole.tsx` | Add `greetingReady` guard; handle recomputation if context arrives late |
| `supabase/functions/ai-home-assistant/index.ts` | Extract `strengthScore`/`nextGain` from request body; inject onboarding behavioral contract when `strengthScore < 50` |
| `src/pages/DashboardV3.tsx` | Pass `lastTouchAt`-derived dormancy and `hasSeenOnboardingGreeting` to greeting context |

### What This Does NOT Change
- No new database tables or columns
- No changes to the confidence scoring model
- No changes to the greeting card UI component
- Desktop chat flow is unaffected (it already has the props wired from DashboardV3)
