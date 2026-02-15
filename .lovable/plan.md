
## Proactive Onboarding Message: Pass Profile Vitals to Edge Function

### What This Does
The greeting engine already generates local onboarding messages based on `strengthScore` and `nextGain`. However, these vitals are **not** sent to the `ai-home-assistant` edge function, so the AI cannot personalize its responses based on record strength. This change closes that gap.

### Changes

#### 1. `src/hooks/useAIHomeAssistant.ts` — Extend options + request body

- Add `strengthScore` (number) and `nextGain` (object) to the `UseAIHomeAssistantOptions` interface
- Destructure them in the hook
- Include both fields in the `supabase.functions.invoke` body inside `sendMessage()`

#### 2. `src/components/dashboard-v3/ChatConsole.tsx` — Pass vitals to the hook

- Update the `useAIHomeAssistant()` call (currently at line 206) to include `strengthScore` and `nextGain` in the options object, so every message sent carries the current profile state

### Technical Details

**useAIHomeAssistant.ts changes:**
```
// Interface additions:
strengthScore?: number;
nextGain?: { action: string; delta: number; systemKey?: string } | null;

// Destructure in hook:
const { ..., strengthScore, nextGain } = options;

// Add to sendMessage body:
body: {
  ...existing fields,
  strengthScore,
  nextGain,
}
```

**ChatConsole.tsx change (line ~206):**
```
const { messages, ... } = useAIHomeAssistant(propertyId, {
  ...existing options,
  strengthScore,
  nextGain,
});
```

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAIHomeAssistant.ts` | Add `strengthScore` + `nextGain` to interface, destructuring, and request body |
| `src/components/dashboard-v3/ChatConsole.tsx` | Pass `strengthScore` and `nextGain` to `useAIHomeAssistant()` options |
