

# Fix: Every CTA Must Open Chat With Intent

## Problem

Every CTA that opens the chat (ChatInsightBanner, PrimarySystemCard action, MissingDocumentation uploads, ContextualChatPrompt) calls a bare `onChatOpen()` which just does `setMobileChatOpen(true)`. The chat opens blank -- no message, no system context, no dialog started.

Habitta's moat is that it *already knows* what the user wants. A blank chat after tapping "Explore replacement planning" breaks that contract.

## Root Cause

`MobileDashboardView` receives `onChatOpen: () => void` -- a function with no parameters. Every CTA calls it identically. No context reaches the `MobileChatSheet`.

## Solution

Replace the bare `onChatOpen()` with a context-carrying function that sets both the chat open state AND the initial message/system context.

### Architecture Change

Introduce a `MobileChatIntent` type that carries the CTA's intent to the chat sheet:

```text
type MobileChatIntent = {
  systemKey?: string;
  systemLabel?: string;
  initialAssistantMessage?: string;
  autoSendMessage?: string;
}
```

---

## File Changes

### 1. `src/lib/mobileCopy.ts` -- Add first-turn messages for each CTA

Extend `CHAT_FIRST_TURN` with new entries:

- `replacementPlanning(systemName)`: "Your {systemName} is entering its replacement window. Would you like to focus on timing, budget, or finding a contractor?"
- `logService(systemName)`: "What maintenance or service was done on your {systemName}? I'll add it to your home's permanent record."
- `uploadPhoto()`: "Upload a photo of the system label or the area of concern, and I'll analyze what I see."
- `uploadDoc()`: "What kind of document do you have? A receipt, inspection report, warranty, or permit?"
- `confidenceBoost(systemName)`: "I see we're working with limited data on your {systemName}. A photo of the manufacturer label would help me pinpoint the exact maintenance schedule."

### 2. `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` -- Pass context with each CTA

Change prop signature:
- `onChatOpen: () => void` becomes `onChatOpen: (intent?: MobileChatIntent) => void`

Update each CTA call site:

- **ChatInsightBanner**: `onTap={() => onChatOpen({ systemKey: primary.system.systemId, systemLabel: primary.system.systemLabel, initialAssistantMessage: CHAT_FIRST_TURN.replacementPlanning(primary.system.systemLabel) })}`
- **PrimarySystemCard**: `onAction={() => onChatOpen({ systemKey: primary.system.systemId, systemLabel: primary.system.systemLabel, initialAssistantMessage: isAtRisk ? CHAT_FIRST_TURN.replacementPlanning(...) : CHAT_FIRST_TURN.logService(...) })}`
- **MissingDocumentation upload photo**: `onChatOpen({ initialAssistantMessage: CHAT_FIRST_TURN.uploadPhoto() })`
- **MissingDocumentation upload doc**: `onChatOpen({ initialAssistantMessage: CHAT_FIRST_TURN.uploadDoc() })`

### 3. `src/pages/DashboardV3.tsx` -- Store intent and pass to MobileChatSheet

- Add state: `const [mobileChatIntent, setMobileChatIntent] = useState<MobileChatIntent | null>(null)`
- Update chat open handler: `const handleMobileChatOpen = (intent?) => { setMobileChatIntent(intent || null); setMobileChatOpen(true); }`
- Pass to `MobileDashboardView`: `onChatOpen={handleMobileChatOpen}`
- Pass to `BottomNavigation`: `onChatOpen={() => handleMobileChatOpen()}` (no intent = general chat)
- Wire intent into `MobileChatSheet` props:
  - `initialAssistantMessage`: from `mobileChatIntent?.initialAssistantMessage` (falls back to existing recommendation logic)
  - `focusContext`: from `mobileChatIntent?.systemKey` when present
  - `autoSendMessage`: from `mobileChatIntent?.autoSendMessage` when present
- Clear intent on chat close: add `setMobileChatIntent(null)` to `handleMobileChatClose`

### 4. `src/pages/SystemPlanPage.tsx` -- Fix ContextualChatPrompt intent

Currently `onChatExpand` always sets `chatIntent='general'`. Instead:

- Add a new handler: `handleContextualPromptTap(reason: 'confidence_boost' | 'replacement_planning')`
- When `reason === 'confidence_boost'`: set initialAssistantMessage to `CHAT_FIRST_TURN.confidenceBoost(displayName)`
- When `reason === 'replacement_planning'`: set initialAssistantMessage to `CHAT_FIRST_TURN.replacementPlanning(displayName)`
- Update `SystemPlanView` to pass the prompt reason through `onChatExpand`

### 5. `src/components/system/SystemPlanView.tsx` -- Pass prompt reason to parent

Change `onChatExpand?: () => void` to `onChatExpand?: (reason?: string) => void`

In `ContextualChatPrompt`, call `onTap` with the reason:
- `onTap(confidenceLevel !== 'high' ? 'confidence_boost' : 'replacement_planning')`

---

## CTA-to-Chat Intent Map

| CTA | Location | Initial Message |
|-----|----------|----------------|
| ChatInsightBanner tap | Dashboard | "Your {system} is entering its replacement window..." |
| PrimarySystemCard action (at-risk) | Dashboard | "Your {system} is entering its replacement window..." |
| PrimarySystemCard action (healthy) | Dashboard | "What maintenance or service was done on your {system}?..." |
| Upload Photo button | Dashboard | "Upload a photo of the system label..." |
| Upload Doc button | Dashboard | "What kind of document do you have?..." |
| ContextualChatPrompt (low confidence) | System Plan | "I see we're working with limited data on your {system}..." |
| ContextualChatPrompt (late-life) | System Plan | "Your {system} is entering its replacement window..." |
| "Start planning" button | System Plan | Already works (existing `CHAT_FIRST_TURN.systemPlanning`) |
| Docked chat input | System Plan | Passive inquiry -- no change needed |
| Bottom nav chat button | Dashboard | General chat -- no change needed |

## What Does NOT Change

- MobileChatSheet component (already accepts `initialAssistantMessage`, `focusContext`, `autoSendMessage`)
- ChatConsole internals
- Desktop ContextualChatPanel (uses ChatContext provider, separate flow)
- Chat persistence or AI edge function
- Scoring engine

## Files Summary

| File | Action |
|------|--------|
| `src/lib/mobileCopy.ts` | Modify -- add first-turn messages for each CTA intent |
| `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` | Modify -- pass intent context with each CTA |
| `src/pages/DashboardV3.tsx` | Modify -- store intent state, wire to MobileChatSheet |
| `src/pages/SystemPlanPage.tsx` | Modify -- handle contextual prompt intent |
| `src/components/system/SystemPlanView.tsx` | Modify -- pass prompt reason through onChatExpand |

