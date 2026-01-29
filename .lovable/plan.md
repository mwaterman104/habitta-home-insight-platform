
# Fix: Duplicate System Outlook UI Bug

## Problem Identified

The dashboard is rendering **two MiddleColumn components simultaneously** on XL screens, causing the System Outlook artifact to appear twice:

1. Left side: MiddleColumn inside `ResizablePanelGroup` (line 479)
2. Right side: Standalone MiddleColumn fallback (line 533)

## Root Cause

The responsive visibility classes are not working as intended:

| Component | Class | Expected Behavior |
|-----------|-------|-------------------|
| ResizablePanelGroup | `hidden xl:flex` | Show on XL+ screens |
| Fallback MiddleColumn | `hidden lg:flex xl:hidden` | Show on LG only, hide on XL |

Both are showing because the parent flex container at line 455 (`flex flex-1 min-h-0 overflow-hidden`) is causing children to participate in flex layout even when they have `hidden` applied. The `hidden` class sets `display: none`, but when combined with `xl:flex`, it should override - however the parent flex container may be forcing visibility.

## Fix

Change the fallback MiddleColumn's container to ensure it's completely hidden on XL screens:

```typescript
// Line 532 - Current (broken):
<div className="flex-1 min-h-0 flex-col p-6 pb-0 hidden lg:flex xl:hidden">

// Fixed - add overflow-hidden and ensure display is properly controlled:
<div className="flex-1 min-h-0 flex-col p-6 pb-0 lg:flex xl:!hidden hidden">
```

Actually, looking more carefully, the issue is the order of classes. Let me propose a cleaner fix:

**File: `src/pages/DashboardV3.tsx`**

Line 532 change from:
```typescript
<div className="flex-1 min-h-0 flex-col p-6 pb-0 hidden lg:flex xl:hidden">
```

To:
```typescript
<div className="flex-1 min-h-0 p-6 pb-0 hidden lg:block xl:hidden">
  <div className="flex flex-col h-full">
```

Or simpler - just use `!hidden` with important modifier at xl:
```typescript
<div className="flex-1 min-h-0 flex-col p-6 pb-0 hidden lg:flex xl:!hidden">
```

The cleanest fix is to ensure that on XL screens, only the ResizablePanelGroup is visible by restructuring the visibility logic.

## Implementation

**Single file change: `src/pages/DashboardV3.tsx`**

Change line 532 to use the `!important` modifier for XL hidden state, ensuring it takes precedence:

```typescript
// Before
<div className="flex-1 min-h-0 flex-col p-6 pb-0 hidden lg:flex xl:hidden">

// After  
<div className="flex-1 min-h-0 flex-col p-6 pb-0 hidden lg:flex xl:!hidden">
```

This forces `display: none !important` on XL screens, preventing any override from the flex parent.

## Why This Works

- `hidden` = base state is `display: none`
- `lg:flex` = on LG screens, display as flex
- `xl:!hidden` = on XL screens, force `display: none !important`

The `!important` modifier ensures no parent flex context can force the element to display.

## Testing

After fix:
1. On XL screens: Only ResizablePanelGroup with MiddleColumn + RightColumn visible
2. On LG screens: Only standalone MiddleColumn visible (no RightColumn)
3. No duplicate System Outlook artifacts
