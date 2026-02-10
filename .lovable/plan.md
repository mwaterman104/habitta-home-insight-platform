

# Right-Column Chat Panel + Auto-Send Questions

## Overview

Two changes to make the contextual chat feel like a peer panel (not a modal) and make it respond immediately when triggered from system CTAs.

## Change 1: Inline Chat Panel (No Overlay)

**Current**: `ContextualChatPanel` renders as a fixed overlay with a backdrop, blocking all page interaction.

**Target**: Chat panel slides in as a flex sibling inside the layout. System UI stays visible and scrollable.

### Implementation

**`src/layouts/DashboardV3Layout.tsx`** -- Desktop layout modification

Move `ContextualChatPanel` from outside the flex container to inside it, as a sibling of `<main>`. When `isOpen`, the layout becomes:

```text
[Left Nav 240px] | [Main Content flex-1 min-w-0] | [Chat Panel 400px]
```

- Add `min-w-0` to `<main>` to prevent overflow when chat opens
- The chat panel renders conditionally inside the flex row, not as a fixed overlay

**`src/components/chat/ContextualChatPanel.tsx`** -- Remove overlay behavior

- Remove the fixed-position backdrop div entirely
- Remove `fixed top-0 right-0 z-50` positioning
- Render as a normal flex column: `w-[400px] shrink-0 border-l bg-card h-full flex flex-col`
- Keep Escape key handler (closes panel, no focus trapping)
- Keep the slide-in animation via `animate-in slide-in-from-right`
- Each section (panel and main content) scrolls independently -- main uses `overflow-y-auto`, chat panel's inner div uses `overflow-hidden` with ChatConsole's own ScrollArea

## Change 2: Auto-Send User Message on CTA Click

**Current**: Clicking "Ask Habitta" or "View Guide" opens chat with a static assistant greeting. The user must type to get a real AI response.

**Target**: The chat auto-sends a contextual question as if the user typed it, triggering an immediate AI response.

### Implementation

**`src/contexts/ChatContext.tsx`** -- Add `autoSendMessage` field

- Add `autoSendMessage?: string` to `ChatContextType`

**`src/components/chat/ContextualChatPanel.tsx`** -- Pass `autoSendMessage` to ChatConsole

- Pass `chatContext.autoSendMessage` as a new prop to `ChatConsole`

**`src/components/dashboard-v3/ChatConsole.tsx`** -- Accept and fire auto-send

- Add `autoSendMessage?: string` prop
- Add a `useEffect` with a `useRef` guard (`hasSentAutoMessage`) that:
  - Fires `sendMessage(autoSendMessage)` once on mount when the prop is set
  - Resets the guard when `autoSendMessage` value changes (new CTA click replaces context)
  - Waits for restoration to complete (`!isRestoring`) before sending
- This goes through the normal `sendMessage` pipeline -- writes to the ledger, triggers tools, produces a real AI response

**`src/components/SystemDetailView.tsx`** -- Wire CTAs with auto-send messages

- Update `handleAskHabitta` to include `autoSendMessage`:
  ```
  "What maintenance does my {systemName} need, and when?"
  ```
- Update action button clicks to include `autoSendMessage`:
  - DIY (View Guide): `"What are the recommended maintenance steps for my {systemName}?"`
  - DIFM (Find Pro): `"Should I handle this myself or hire a professional for my {systemName}?"`

**`src/lib/chatContextCopy.ts`** -- Add prompt builder

- Add `buildSystemAutoMessage(systemKey: string, trigger: string): string` function
- Centralizes prompt copy so it can be tuned without touching UI components
- Used by `SystemDetailView` and any future CTA that needs auto-send

### Edge Cases Handled

- **Re-click while open**: `openChat` replaces context, ChatConsole detects new `autoSendMessage` value, fires new send. Appends to same thread.
- **Double-send prevention**: `useRef` guard keyed on `autoSendMessage` value prevents re-renders from duplicating.
- **Mobile parity**: `MobileChatSheet` also receives `autoSendMessage` and passes it to its ChatConsole instance. Same behavior.
- **No auto-send CTAs**: Existing `openChat()` calls without `autoSendMessage` continue to show the static greeting only. No regression.

## Files to Modify (5)

- `src/contexts/ChatContext.tsx` -- add `autoSendMessage` to interface
- `src/components/chat/ContextualChatPanel.tsx` -- remove overlay, render as flex column, pass autoSendMessage
- `src/layouts/DashboardV3Layout.tsx` -- move chat panel inside flex row
- `src/components/dashboard-v3/ChatConsole.tsx` -- add autoSendMessage prop + useEffect
- `src/components/SystemDetailView.tsx` -- add autoSendMessage to openChat calls

## Files to Create (0)

## What Does NOT Change

- ChatConsole internals (AI engine, message persistence, tool calling)
- MobileChatSheet structure (bottom drawer on mobile)
- DashboardV3.tsx (has its own ResizablePanelGroup chat)
- Any other page's `openChat()` calls without `autoSendMessage`
