

## Launch Blockers: Fixes Required

Three items need fixing before ship. Everything else is iteration.

---

### Fix 1: Conversation Starters Must Auto-Send

**Problem:** Clicking a starter only fills the input box (`setInput(prompt)`) but does not send the message. The user must manually press Enter. This breaks the "illusion of intelligence" and makes starters feel inert.

**File:** `src/components/dashboard-v3/ChatConsole.tsx`

**Change:** Replace the `onStarterClick` handler so it calls `handleSend()` (or equivalent) immediately after setting input, instead of just focusing the input field.

```text
Current (broken):
  onStarterClick={(prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  }}

Fixed:
  onStarterClick={(prompt) => {
    handleSend(prompt);  // or: sendMessage(prompt) directly
  }}
```

The starter UI should also clear itself after sending (it already does -- starters only render when `messages.length === 1`).

---

### Fix 2: Score Celebration Loop (update_system_info response)

**Problem:** After `update_system_info` succeeds, the tool response does NOT include `newStrengthScore`, `previousStrengthScore`, or `nextGain`. The AI behavioral contract says "celebrate progress" but has no data to do it with. This kills the dopamine loop.

**File:** `supabase/functions/ai-home-assistant/index.ts`

**Change:** After the `update-system-install` call succeeds (and is not `alreadyRecorded`), re-run a lightweight confidence computation and include the result in the tool response envelope.

Steps:
1. After successful update, query the `systems` table for all systems belonging to this home
2. Compute a simple strength score (count of systems with non-heuristic `install_source` / total systems, scaled to 100)
3. Determine `nextGain` (which remaining heuristic system would gain the most points)
4. Add to the response:
   ```text
   {
     ...existing fields,
     strengthScore: 47,
     previousStrengthScore: 32,
     strengthDelta: 15,
     nextGain: { action: "Upload HVAC label photo", delta: 12, systemKey: "hvac" }
   }
   ```

This is a lightweight query (one SELECT) plus simple math -- no external API calls. The AI can then say "Your record just jumped from 32% to 47%!" with real data.

---

### Fix 3: Tighten Onboarding Contract Gate

**Problem:** The onboarding behavioral contract injects when `strengthScore < 50` but does NOT check `lastTouchAt`. A returning user at 48% who has been active recently would still get the "new user orientation" tone.

**File:** `supabase/functions/ai-home-assistant/index.ts`

**Change:** The contract injection condition should be:

```text
Current:
  if (strengthScore !== undefined && strengthScore < 50) {
    // inject onboarding contract
  }

Fixed:
  const isOnboarding = strengthScore !== undefined && strengthScore < 50 
    && !lastTouchAt;  // lastTouchAt must be passed from frontend
  if (isOnboarding) {
    // inject onboarding contract
  }
```

This requires:
1. The frontend already passes `lastTouchAt` to `ChatConsole` (done in prior work)
2. `ChatConsole` / `useAIHomeAssistant` must forward `lastTouchAt` in the edge function request body
3. The edge function must extract `lastTouchAt` from the request and use it in the gate

**Files affected:**
- `src/hooks/useAIHomeAssistant.ts` -- add `lastTouchAt` to options and request body
- `supabase/functions/ai-home-assistant/index.ts` -- extract and use in gate

---

### Summary Table

| Fix | File(s) | Risk if Skipped |
|-----|---------|-----------------|
| Starters auto-send | `ChatConsole.tsx` | Starters feel dead; users don't know to press Enter |
| Score celebration | `ai-home-assistant/index.ts` | AI can't celebrate progress; onboarding loses its reward loop |
| Contract gate tightening | `useAIHomeAssistant.ts`, `ai-home-assistant/index.ts` | Returning users at 48% get treated like brand-new accounts |

### What This Does NOT Change
- No database changes
- No new tables or columns
- Greeting engine templates unchanged
- Desktop flow unaffected
- installSource pipeline verified and working as-is
