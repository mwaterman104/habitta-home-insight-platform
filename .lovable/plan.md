

# ChatDock: Fixed → Sticky In-Flow (Final Production Plan)

## Overview

Transform the ChatDock from a viewport-fixed floating overlay into an in-flow, sticky dockable panel that lives inside the MiddleColumn and pushes content up when expanded.

---

## Architectural Shift

### Before (Current - Wrong)
```text
┌─ DashboardV3 ─────────────────────────────────────────────────────┐
│  ┌─ MiddleColumn (scrollable) ───────────────────────────────┐   │
│  │  SystemWatch, HomeHealthCard, etc.                        │   │
│  │  [ChatDock is NOT here - content ends]                    │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ ChatDock (FIXED to viewport, gradient fade) ─────────────┐   │
│  │  [Floats over content, uses viewport math, pointer-events]│   │
│  └───────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### After (Target - Correct)
```text
┌─ DashboardV3 ─────────────────────────────────────────────────────┐
│  ┌─ MiddleColumn ────────────────────────────────────────────┐   │
│  │  ┌─ ScrollArea ──────────────────────────────────────────┐│   │
│  │  │  <div className="space-y-6 max-w-3xl mx-auto pb-6">  ││   │
│  │  │    SystemWatch                                        ││   │
│  │  │    HomeHealthCard                                     ││   │
│  │  │    HabittaThinking                                    ││   │
│  │  │    CapitalTimeline                                    ││   │
│  │  │    MaintenanceRoadmap                                 ││   │
│  │  │                                                       ││   │
│  │  │    <div className="sticky bottom-4">                  ││   │
│  │  │      <ChatDock />  ← IN FLOW, same width as cards     ││   │
│  │  │    </div>                                             ││   │
│  │  │  </div>                                               ││   │
│  │  └───────────────────────────────────────────────────────┘│   │
│  └───────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Locked Rules (Non-Negotiable)

These 4 rules prevent future regressions:

### 1. Sticky Attachment Rule
> **ChatDock's sticky wrapper must be inside the scrollable content container, not the ScrollArea root.**

The sticky `<div>` must be a direct descendant of the `<div className="space-y-6 max-w-3xl mx-auto">` inside ScrollArea — not on the ScrollArea itself. This ensures sticky attaches to the correct scroll ancestor.

### 2. Scroll Ownership Rule
> **Only the messages area scrolls; the ChatDock container does not.**

Correct structure:
```tsx
<div className="flex flex-col max-h-[min(60vh,420px)]">
  <Header />                              {/* fixed, shrink-0 */}
  <div className="flex-1 overflow-y-auto min-h-0">
    {/* messages scroll here */}
  </div>
  <Input />                               {/* fixed, shrink-0 */}
</div>
```

This keeps header and input always visible; only messages scroll.

### 3. Expansion Trigger Rules
> **Input focus → Peek, first exchange → Expanded, manual collapse → Collapsed**

| Trigger | State Change |
|---------|--------------|
| Click collapsed input | Collapsed → Expanded |
| First user message or agent reply | Stays Expanded |
| Click collapse button | Expanded → Collapsed |
| Navigate away | Expanded → Collapsed |

### 4. Natural Layout Reflow
> **ChatDock expansion increases its height within the flow, causing natural layout reflow of content above.**

This is NOT forced scroll behavior. The chat grows, content above naturally reflews upward. No scroll hacks needed.

---

## Height States

| State | Height | Max Height | Behavior |
|-------|--------|------------|----------|
| **Collapsed** | ~72-80px | Fixed | Input affordance only |
| **Expanded** | Variable | `min(60vh, 420px)` | Full conversation, bounded |

The `min(60vh, 420px)` cap ensures:
- On tall screens (700px+): 420px max
- On shorter screens: 60% of viewport
- Always leaves ~40% for content above

---

## Implementation Details

### File 1: `src/pages/DashboardV3.tsx`

**Remove:**
- The entire fixed ChatDock wrapper (lines 503-528)
- The `rightPanelSize` state (no longer needed for ChatDock positioning)
- The gradient fade element

ChatDock will now be rendered inside MiddleColumn, not at the DashboardV3 level.

### File 2: `src/components/dashboard-v3/MiddleColumn.tsx`

**Add ChatDock as last child inside the scrollable content:**

```tsx
<ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
  <div className="space-y-6 max-w-3xl mx-auto pb-6">
    {/* ... existing sections 1-5 ... */}
    
    {/* 6. ChatDock - Sticky dockable panel (IN FLOW) */}
    <div className="sticky bottom-4">
      <ChatDock
        propertyId={propertyId}
        isExpanded={chatExpanded}
        onExpandChange={onChatExpandChange}
        advisorState={advisorState}
        focusContext={focusContext}
        hasAgentMessage={hasAgentMessage}
        openingMessage={openingMessage}
        confidence={confidence}
        risk={risk}
        onUserReply={onUserReply}
      />
    </div>
  </div>
</ScrollArea>
```

**Key changes:**
- `pb-28` → `pb-6` (no extra padding for fixed element)
- ChatDock is now the last child in content flow
- `sticky bottom-4` wrapper keeps it anchored while scrolling
- Inherits `max-w-3xl` width automatically

### File 3: `src/components/dashboard-v3/ChatDock.tsx`

**Styling updates to match other cards:**

| Current | Change To |
|---------|-----------|
| `shadow-lg` | `shadow-sm` (match card hierarchy) |
| `max-h-[75vh]` | `max-h-[min(60vh,420px)]` (bounded) |
| `p-3` on collapsed | `p-4` (taller touch target, ~80px) |

**Collapsed state:**
```tsx
<div className="bg-card rounded-xl border shadow-sm">
  <button className="w-full p-4 flex items-center gap-3 ...">
```

**Expanded state:**
```tsx
<div className={cn(
  "bg-card rounded-xl border shadow-sm flex flex-col",
  "max-h-[min(60vh,420px)]",
  "transition-all duration-200"
)}>
  {/* Header - shrink-0 */}
  <div className="flex items-center justify-between p-3 border-b shrink-0">
  
  {/* Messages - scrollable */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
  
  {/* Input - shrink-0, always visible */}
  <div className="p-3 border-t shrink-0">
```

---

## Visual Hierarchy After Changes

| Property | ChatDock | Other Cards |
|----------|----------|-------------|
| Border | `border` | `border` |
| Radius | `rounded-xl` | `rounded-xl` |
| Shadow | `shadow-sm` | `shadow-sm` |
| Width | Inherits `max-w-3xl` | Uses `max-w-3xl` |

ChatDock will now feel like another card in the system, not a bolted-on assistant.

---

## Responsive Behavior

Because ChatDock is now in-flow, it automatically respects all column constraints:

| Breakpoint | Behavior |
|------------|----------|
| Mobile (`< lg`) | Full width within MiddleColumn padding |
| Desktop (`lg`) | Same width as other middle column cards |
| Large Desktop (`xl`) | Same width, right panel unaffected |

No viewport math, no breakpoint-specific positioning.

---

## What Gets Removed

| Element | Why |
|---------|-----|
| `fixed bottom-0 left-0 lg:left-60` positioning | No longer needed — sticky in flow |
| `rightPanelSize` state | No longer needed for ChatDock |
| `pointer-events-none/auto` pattern | No overlay, no click-through needed |
| Gradient fade (`bg-gradient-to-t`) | No separation needed — chat is in flow |
| `pb-28` extra padding | No fixed element to compensate for |

---

## Summary Checklist

| Rule | Implementation |
|------|----------------|
| ChatDock lives inside MiddleColumn flow | Last child of `<div className="space-y-6">` inside ScrollArea |
| Same width as other modules | Inherits `max-w-3xl mx-auto` from parent |
| Uses `sticky`, not `fixed` | `<div className="sticky bottom-4">` wrapper |
| Expands by pushing content up | Natural layout reflow, not forced scroll |
| Has a hard max height | `max-h-[min(60vh,420px)]` |
| Only messages scroll | `overflow-y-auto` on messages div only |
| No gradients | Removed entirely |
| No viewport math | No left/right offset calculations |
| No overlay behavior | Never covers content, always pushes |

