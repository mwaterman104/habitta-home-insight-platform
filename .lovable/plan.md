

# Desktop Command Center: Right Column Surface Architecture

## Overview

Transform the desktop right column from a static environmental rail into a polymorphic evidence surface driven by a global `FocusState` store. Current right column content (map, conditions, calendar) becomes the default `HomeOverviewPanel`. When chat references a system or returns contractor results, the right column replaces its content with the appropriate panel -- never stacking.

This is a 4-phase build affecting ~15 files across new context, types, panel components, and wiring changes.

## Architecture

### FocusState drives the right column

```text
FocusState = null                  -->  HomeOverviewPanel (current map/conditions/calendar)
           | { type: 'system' }    -->  SystemPanel (3-tab: Overview, Evidence, Timeline)
           | { type: 'contractor_list' }  -->  ContractorListPanel
           | { type: 'contractor_detail' } --> ContractorDetailPanel
           | { type: 'maintenance' }  -->  (future)
           | { type: 'capital_plan' } -->  (future)
```

### Control flow

- User clicks system row in BaselineSurface --> `setFocus({ type: 'system', systemId }, { push: true })`
- Chat returns contractors --> `setFocus({ type: 'contractor_list', ... })`
- User clicks contractor card --> `setFocus({ type: 'contractor_detail', ... }, { push: true })`
- Close / Back --> `goBack()` or `clearFocus()` --> returns to HomeOverview

### User intent lock

When user clicks a system or contractor, a 10-second lock prevents AI-generated focus changes from overriding their selection. AI can still push focus for a *different* entity type after the lock expires.

---

## Phase 1: Core Infrastructure

### New files

| File | Purpose |
|------|---------|
| `src/types/focusState.ts` | FocusState discriminated union type + SystemTab type |
| `src/contexts/FocusStateContext.tsx` | Stack-based focus store with `setFocus`, `goBack`, `clearFocus`, `isUserLocked` |
| `src/components/dashboard-v3/RightColumnSurface.tsx` | Switch component that renders the active panel based on focus type |
| `src/components/dashboard-v3/panels/HomeOverviewPanel.tsx` | Wraps current RightColumn content (map, conditions, calendar) as default state |
| `src/components/dashboard-v3/panels/SystemPanel.tsx` | 3-tab system detail container (header + Radix Tabs) |
| `src/components/dashboard-v3/panels/SystemPanelOverview.tsx` | Lifecycle bar, environmental factors, system verdict |
| `src/components/dashboard-v3/panels/SystemPanelEvidence.tsx` | Evidence cards list (permits, records, uploads, assumptions) |
| `src/components/dashboard-v3/panels/SystemPanelTimeline.tsx` | Vertical timeline (installed -> events -> projected replacement) |

### Modified files

| File | Change |
|------|--------|
| `src/pages/DashboardV3.tsx` | Wrap desktop layout in `FocusStateProvider`. Replace `<RightColumn>` with `<RightColumnSurface>`. Pass all current RightColumn props through to HomeOverviewPanel. Wire `onSystemClick` in BaselineSurface/MiddleColumn to call `setFocus({ type: 'system' })` instead of (or in addition to) `selectSystem()`. |

### FocusStateContext design

```typescript
// Stack-based navigation
interface FocusStateValue {
  focus: FocusState;           // Current (top of stack)
  focusStack: FocusState[];    // Full stack
  setFocus: (next: FocusState, opts?: { push?: boolean }) => void;
  goBack: () => void;          // Pop stack
  clearFocus: () => void;      // Reset to [null]
  isUserLocked: boolean;       // True for 10s after user-initiated focus
}
```

- `setFocus(next, { push: true })` pushes onto stack (user click, new entity)
- `setFocus(next)` or `setFocus(next, { push: false })` replaces top (AI referencing same entity)
- `goBack()` pops to previous focus
- `clearFocus()` resets stack to `[null]`
- User lock: set on push, expires after 10 seconds via `setTimeout`

### SystemPanel template

Uses existing `capitalTimeline.systems` data (already fetched in DashboardV3). The panel receives `systemId` and looks up the `SystemTimelineEntry` from capital timeline context.

**Header**: System name, status badge (OK/Watch/Plan), confidence badge, install year, age, close (X) button.

**Overview tab**: Horizontal lifecycle bar (Install -> Today -> Replace Window) with OK/Watch/Plan segments. Environmental factor cards. System verdict block with summary sentence and supporting bullets.

**Evidence tab**: List of evidence cards showing permits, service records, user uploads, assumptions. Each card has icon, title, date, confidence impact. Summary line: "Confidence derived from N supporting records."

**Timeline tab**: Vertical timeline from install through service events to projected replacement. Future events use dashed styling.

### RightColumnSurface transitions

- 200ms fade + slight slide from right on panel mount
- Previous panel unmounts completely (no stacking)
- Uses Tailwind `animate-in fade-in slide-in-from-right-4 duration-200`

---

## Phase 2: Chat-Controlled Focus

### Modified files

| File | Change |
|------|--------|
| `src/hooks/useAIHomeAssistant.ts` | Extract `focus` field from edge function response envelope. Add `lastFocus` to the hook return value. |
| `src/components/dashboard-v3/ChatConsole.tsx` | Import `useFocusState`. After receiving a message with `focus` metadata, call `setFocus(focus)`. Respect user lock. |
| `supabase/functions/ai-home-assistant/index.ts` | Add optional `focus` field to the response JSON envelope. When the AI references a specific system, include `{ type: 'system', systemId }`. When contractor tool returns results, include `{ type: 'contractor_list', query, systemId }`. |

### Chat-to-panel contract

The edge function response envelope gains an optional `focus` field:

```json
{
  "message": "Your HVAC is performing normally.",
  "focus": { "type": "system", "systemId": "hvac" }
}
```

For contractor results:

```json
{
  "message": "Here are local irrigation repair contractors.",
  "functionResult": "{...}",
  "focus": { "type": "contractor_list", "query": "irrigation repair", "systemId": "sprinkler_system" }
}
```

Focus routing happens at message ingestion time in `useAIHomeAssistant`, not at render time. ChatConsole calls `setFocus()` after receiving a response -- no string parsing, no render-time logic.

### Desktop vs Mobile

- **Desktop**: `useFocusState()` is available (provider wraps desktop layout). Focus drives right column.
- **Mobile**: No `FocusStateProvider` wraps mobile. `useFocusState()` returns a no-op fallback (same pattern as existing `useChatContext`). Contractor data continues rendering inline in chat. No changes to MobileChatPage.

---

## Phase 3: Contractor Panels

### New files

| File | Purpose |
|------|---------|
| `src/components/dashboard-v3/panels/ContractorListPanel.tsx` | Scrollable list of contractor cards with header, disclaimer, back button. Receives query + optional systemId. |
| `src/components/dashboard-v3/panels/ContractorDetailPanel.tsx` | Full contractor detail with Overview/Reviews/Contact tabs. Receives contractorId, looks up from cached list. |

### Modified files

| File | Change |
|------|--------|
| `src/components/dashboard-v3/RightColumnSurface.tsx` | Add `contractor_list` and `contractor_detail` cases to the switch |
| `src/components/dashboard-v3/ChatConsole.tsx` | On desktop, when contractor data is present in a message, the right column shows it via focus state instead of inline rendering. Chat shows prose only. |
| `src/lib/chatFormatting.ts` | Add a desktop-awareness flag: when rendering on desktop with focus state available, skip inline contractor card rendering (the right column handles it). |

### Contractor data flow

1. Edge function returns contractor JSON in `functionResult` + `focus: { type: 'contractor_list' }`
2. `useAIHomeAssistant` stores the contractor data and calls `setFocus`
3. `ContractorListPanel` receives contractor data from a shared store (added to FocusStateContext as `focusData`)
4. Clicking a contractor card calls `setFocus({ type: 'contractor_detail', contractorId }, { push: true })`
5. Back button calls `goBack()` to return to the list

### ContractorListPanel layout

- Header: "Irrigation Repair Contractors" (from query)
- Liability disclaimer
- Scrollable list of cards: name, rating (stars), review count, category, distance, phone CTA, website CTA
- Each card clickable to detail view

### ContractorDetailPanel layout

- Header: name, rating, reviews, category, location
- Tabs: Overview (services, area, phone, website), Reviews (if available), Contact
- Back button returns to list

---

## Phase 4: Polish

### Modified files

| File | Change |
|------|--------|
| `src/components/dashboard-v3/RightColumnSurface.tsx` | Refine transitions (150-200ms fade + slide). Add `AnimatePresence`-style exit if needed. |
| `src/contexts/FocusStateContext.tsx` | Add `focusData` field for passing contractor/system data alongside focus state. Ensure lock timer cleanup on unmount. |
| `src/components/dashboard-v3/panels/SystemPanel.tsx` | Tab persistence: remember last-viewed tab per systemId using a `Map<string, SystemTab>` ref. |

---

## What Does NOT Change

- Mobile layout (no right column, no FocusStateProvider)
- MobileChatPage (`/chat` route) -- contractor data renders inline
- MiddleColumn doctrine ("chat IS the middle column")
- Left column navigation
- Chat persistence model
- Edge function tool-calling logic (only the response envelope gains a `focus` field)
- BaselineSurface component (still renders inside ChatConsole)
- Existing `ChatContext` (separate concern from FocusState)

## Files Summary

| File | Action | Phase |
|------|--------|-------|
| `src/types/focusState.ts` | Create | 1 |
| `src/contexts/FocusStateContext.tsx` | Create | 1 |
| `src/components/dashboard-v3/RightColumnSurface.tsx` | Create | 1 |
| `src/components/dashboard-v3/panels/HomeOverviewPanel.tsx` | Create | 1 |
| `src/components/dashboard-v3/panels/SystemPanel.tsx` | Create | 1 |
| `src/components/dashboard-v3/panels/SystemPanelOverview.tsx` | Create | 1 |
| `src/components/dashboard-v3/panels/SystemPanelEvidence.tsx` | Create | 1 |
| `src/components/dashboard-v3/panels/SystemPanelTimeline.tsx` | Create | 1 |
| `src/pages/DashboardV3.tsx` | Modify | 1 |
| `src/hooks/useAIHomeAssistant.ts` | Modify | 2 |
| `src/components/dashboard-v3/ChatConsole.tsx` | Modify | 2 |
| `supabase/functions/ai-home-assistant/index.ts` | Modify | 2 |
| `src/components/dashboard-v3/panels/ContractorListPanel.tsx` | Create | 3 |
| `src/components/dashboard-v3/panels/ContractorDetailPanel.tsx` | Create | 3 |
| `src/lib/chatFormatting.ts` | Modify | 3 |

