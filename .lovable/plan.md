
# Harden System Plan Action Footer

## Problem

Two broken engagement paths on the System Plan screen:

1. **"Start planning"** navigates to the dashboard, breaking context and delivering nothing planning-specific
2. **"Ask about this system..."** opens chat but can appear blank due to the priming guard having already fired

Root cause: both CTAs rely on priming logic, when "Start planning" should inject the first assistant turn directly.

---

## Changes

### 1. `src/lib/mobileCopy.ts` -- Add first-turn planning copy

Add a new `CHAT_FIRST_TURN` constant alongside the existing `CHAT_PRIMING`:

```
CHAT_FIRST_TURN = {
  systemPlanning: (systemName: string) =>
    `Let's start planning for your ${systemName}. Based on the cost and timing outlook above, what would you like to focus on first -- timing, budget, or contractor options?`
}
```

Update `PLAN_COPY.actions.primary` from `'Start planning'` to `'Start planning this replacement'`.

### 2. `src/pages/SystemPlanPage.tsx` -- Rewire Start Planning

Add a `chatIntent` state: `'general' | 'planning'` (default `'general'`).

**`handleStartPlanning`**: Instead of navigating away, set `chatIntent = 'planning'` and open the chat sheet. No navigation.

**`onChatExpand`** (from docked input): Set `chatIntent = 'general'` and open the chat sheet.

Pass different props to `MobileChatSheet` based on `chatIntent`:
- **Planning intent**: Pass an `initialAssistantMessage` using `CHAT_FIRST_TURN.systemPlanning(displayName)`. No `primingMessage`. Focus trigger set to `'start_planning'`.
- **General intent**: Keep existing `primingMessage` behavior unchanged.

### 3. `src/components/dashboard-v3/mobile/MobileChatSheet.tsx` -- Support `initialAssistantMessage`

Add an `initialAssistantMessage?: string` prop.

When `initialAssistantMessage` is provided:
- Skip all priming guard logic entirely
- Convert it directly to an `AdvisorOpeningMessage` with `hasAgentMessage = true`
- The existing `useEffect` in `ChatConsole` (line 223-229) handles injection via `injectMessage` -- no new injection logic needed

When `initialAssistantMessage` is NOT provided:
- Existing priming logic runs unchanged

Also update the priming guard key from just `systemKey` to `systemKey + ':' + (primingMessage ?? '')` so that different priming messages for the same system don't collide.

### 4. `src/components/mobile/DockedChatInput.tsx` -- Minor copy tweak

Update placeholder from `"Ask about this {systemLabel}..."` to `"Ask a question about this {systemLabel}..."`.

---

## Files Summary

| File | Changes | Risk |
|------|---------|------|
| `src/lib/mobileCopy.ts` | Add `CHAT_FIRST_TURN`, update `PLAN_COPY.actions.primary` | Zero |
| `src/pages/SystemPlanPage.tsx` | Add `chatIntent` state, rewire `handleStartPlanning` to open chat, pass intent-aware props | Low |
| `src/components/dashboard-v3/mobile/MobileChatSheet.tsx` | Add `initialAssistantMessage` prop, bypass priming when present, fix guard key | Low |
| `src/components/mobile/DockedChatInput.tsx` | Minor placeholder copy update | Zero |

No backend changes. No math changes. Desktop unaffected.

---

## How It Works

```text
User taps "Start planning this replacement"
  --> chatIntent = 'planning'
  --> chatOpen = true
  --> MobileChatSheet receives initialAssistantMessage
  --> Priming logic bypassed
  --> ChatConsole receives openingMessage + hasAgentMessage=true
  --> useEffect injects assistant message immediately
  --> User sees: "Let's start planning for your HVAC System..."
  --> User responds directly (no blank state possible)

User taps "Ask a question about this HVAC System..."
  --> chatIntent = 'general'
  --> chatOpen = true
  --> MobileChatSheet uses existing primingMessage path
  --> Chat opens, user speaks first (or priming shows if first time)
```

---

## QA Checklist

- Tapping "Start planning this replacement" opens chat with assistant question already visible
- The question references the system name and on-screen data
- No blank chat possible from "Start planning"
- No navigation away from System Plan screen
- "Ask a question about this system..." still opens chat for user-initiated inquiry
- Closing and reopening chat behaves consistently (no duplicate messages)
- Desktop behavior unchanged
