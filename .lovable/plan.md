

# Floating ChatDock with Dynamic Positioning (Revised)

## Overview

Transform the ChatDock from a full-width footer bar into a floating control surface that is:
- Visually contained within the middle column bounds
- Dynamically anchored to account for resizable right panel
- Visually connected to the content above (drawer relationship)
- Height-constrained in expanded state to never become a full modal

---

## What We're Keeping (Validated)

| Decision | Rationale |
|----------|-----------|
| `bottom-4` spacing | 16px gap from viewport edge - feels lifted but grounded |
| `pointer-events-none` / `pointer-events-auto` pattern | Clean click-through behavior |
| Full `rounded-xl` corners | Self-contained floating element |
| `fixed` positioning | Ensures viewport-level anchoring |

---

## Changes to Address Risks

### 1. Dynamic Right Boundary (Risk #1)

**Problem**: Hardcoded `xl:right-[25%]` will drift when the right panel is resized.

**Solution**: Track panel size in component state and compute `right` offset dynamically.

```tsx
// In DashboardV3.tsx
const [rightPanelSize, setRightPanelSize] = useState(() => {
  return parseFloat(localStorage.getItem('dashboard_right_panel_size') || '25');
});

// Update on resize
<ResizablePanelGroup
  onLayout={(sizes) => {
    localStorage.setItem('dashboard_right_panel_size', sizes[1].toString());
    setRightPanelSize(sizes[1]); // Live update
  }}
>

// ChatDock wrapper with dynamic right offset
<div 
  className="fixed bottom-4 z-50 pointer-events-none lg:left-60 right-0"
  style={{ 
    // On xl screens, offset by right panel percentage
    right: isXlScreen ? `${rightPanelSize}%` : 0 
  }}
>
```

For simplicity, we'll use a CSS custom property approach:
```tsx
// Set CSS variable on resize
document.documentElement.style.setProperty('--right-panel-width', `${sizes[1]}%`);

// Use in className
"xl:right-[var(--right-panel-width)]"
```

This keeps the styling declarative while being dynamic.

### 2. Anchor to Middle Column Container (Risk #2)

**Problem**: `max-w-3xl mx-auto` centers to the viewport region, not the middle column.

**Solution**: Match the MiddleColumn's content constraints:
- MiddleColumn content uses `max-w-3xl mx-auto`
- ChatDock should use the same constraints
- Horizontal padding matches the column's `p-6`

```tsx
// ChatDock wrapper - matches middle column layout
<div className="fixed bottom-4 left-0 lg:left-60 z-50 pointer-events-none px-6"
     style={{ right: rightOffset }}>
  <div className="max-w-3xl mx-auto pointer-events-auto">
    <ChatDock ... />
  </div>
</div>
```

This ensures the chat aligns with the content above it, not floating independently.

### 3. Drawer Relationship Cue (Missing Element)

**Problem**: The dock floats without visual connection to content above.

**Solution**: Add a soft gradient fade at the top of the fixed wrapper to imply "rising from content."

```tsx
// Wrapper with subtle top gradient
<div className="fixed bottom-0 left-0 lg:left-60 z-50 pointer-events-none px-6 pb-4"
     style={{ right: rightOffset }}>
  {/* Subtle gradient fade - "drawer rising" effect */}
  <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
  
  <div className="max-w-3xl mx-auto pointer-events-auto">
    <ChatDock ... />
  </div>
</div>
```

Alternative visual cues (can be combined):
- A subtle "handle" bar on top edge of ChatDock (2px rounded line)
- Slightly increased shadow (`shadow-xl` instead of `shadow-lg`)

### 4. Expanded State Height Limit (Missing Rule)

**Problem**: Expanded chat could cover the entire dashboard.

**Solution**: Lock max-height to 75vh, ensuring content remains visible above.

```tsx
// In ChatDock.tsx expanded state
<div className={cn(
  "bg-card rounded-xl shadow-lg border flex flex-col",
  "max-h-[75vh]" // Never covers more than 75% of viewport
)}>
```

Current: `max-h-[60vh]` - This is already reasonable, but we'll confirm it's enforced.

---

## Implementation Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DashboardV3.tsx` | Track rightPanelSize state, compute dynamic offset, update ChatDock wrapper styling |
| `src/components/dashboard-v3/ChatDock.tsx` | Update to full `rounded-xl`, add border, adjust shadow, confirm max-height |

### DashboardV3.tsx Changes

```tsx
// 1. Add state for panel size tracking
const [rightPanelSize, setRightPanelSize] = useState(() => {
  return parseFloat(localStorage.getItem('dashboard_right_panel_size') || '25');
});

// 2. Check for xl breakpoint
const isXlScreen = typeof window !== 'undefined' && window.innerWidth >= 1280;

// 3. Update onLayout handler
<ResizablePanelGroup
  onLayout={(sizes) => {
    localStorage.setItem('dashboard_right_panel_size', sizes[1].toString());
    setRightPanelSize(sizes[1]);
  }}
>

// 4. ChatDock wrapper with dynamic positioning
<div 
  className={cn(
    "fixed bottom-0 z-50 pointer-events-none",
    "left-0 lg:left-60", // After sidebar on lg+
    "px-6 pb-4" // Match column padding
  )}
  style={{ 
    // Dynamic right offset on xl screens
    right: isXlScreen ? `${rightPanelSize}%` : 0 
  }}
>
  {/* Gradient fade for drawer effect */}
  <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
  
  <div className="max-w-3xl mx-auto pointer-events-auto">
    <ChatDock ... />
  </div>
</div>
```

### ChatDock.tsx Changes

**Collapsed state:**
```tsx
<div className="bg-card rounded-xl border shadow-lg">
  <button
    onClick={() => onExpandChange(true)}
    className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors rounded-xl"
  >
    {/* ... existing content ... */}
  </button>
</div>
```

**Expanded state:**
```tsx
<div className="bg-card rounded-xl border shadow-lg flex flex-col max-h-[75vh]">
  {/* ... existing content ... */}
</div>
```

Key styling changes:
- `rounded-t-xl` → `rounded-xl` (full corners)
- `border-t` → `border` (full border)
- `shadow-[0_-8px_...]` → `shadow-lg` (standard shadow, not just upward)
- Confirm `max-h-[75vh]` is applied

---

## Visual Comparison

### Before (Current)
```text
┌─────────────┬────────────────────────────────────────────────────────────────┐
│  Sidebar    │                          Content Area                          │
│             │                                                                │
│             │                                                                │
├─────────────┴────────────────────────────────────────────────────────────────┤
│  [━━━━━━━━━━━━━━━ Full-width chat bar with border-t ━━━━━━━━━━━━━━━━━]       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### After (Floating)
```text
┌─────────────┬──────────────────────────────────┬──────────────────┐
│  Sidebar    │        Content Area              │   Right Panel    │
│             │                                  │                  │
│             │    (content scrolls here)        │                  │
│             │                                  │                  │
│             │   ┌────────────────────────────┐ │                  │
│             │   │ Ask about your home...  ↑ │ │                  │
│             │   └────────────────────────────┘ │                  │
│             │         ↑ 16px gap               │                  │
└─────────────┴──────────────────────────────────┴──────────────────┘
```

The chat dock:
- Floats above the viewport bottom (16px gap)
- Has horizontal margins from column edges (24px via `px-6`)
- Is contained within the middle column width
- Has full rounded corners
- Has a subtle gradient fade connecting it to content above
- Stops at the right panel boundary (dynamically calculated)

---

## Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Mobile (`< lg`) | `left-0 right-0` - full width with `px-6` padding |
| Desktop (`lg`) | `left-60 right-0` - after sidebar, full remaining width |
| Large Desktop (`xl`) | `left-60 right-[dynamic%]` - between sidebar and right panel |

---

## Technical Considerations

### Window Resize Handling

For the `isXlScreen` check to be reactive, we'll either:
1. Use a custom hook that listens to window resize
2. Or use Tailwind's responsive classes with CSS custom properties

The cleanest approach is CSS custom properties set via JS:

```tsx
// Set on mount and resize
useEffect(() => {
  const updateCSSVar = () => {
    const rightSize = parseFloat(localStorage.getItem('dashboard_right_panel_size') || '25');
    document.documentElement.style.setProperty('--right-panel-width', `${rightSize}%`);
  };
  updateCSSVar();
  window.addEventListener('resize', updateCSSVar);
  return () => window.removeEventListener('resize', updateCSSVar);
}, []);

// Then in className
"xl:right-[var(--right-panel-width)]"
```

### Scroll Context

The fixed positioning means the ChatDock ignores:
- Middle column scroll position
- Section boundaries
- Future sticky elements within the column

This is an acceptable tradeoff for now. If we need scroll-aware behavior later (e.g., hide when scrolling fast), we can add that as a separate enhancement.

---

## Summary Checklist

| Concern | Solution |
|---------|----------|
| Hardcoded right boundary | Dynamic calculation from state/CSS variable |
| Width centered to viewport | Anchored to middle column via matching padding/max-width |
| No drawer relationship | Gradient fade at top of fixed wrapper |
| Expanded height undefined | Max-height of 75vh (already 60vh, will confirm) |
| Full-width border look | Full rounded corners + border + shadow (floating) |

