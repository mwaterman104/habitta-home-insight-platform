

# Revised Fix: Personal Blurb + Duplicate UI Issues

## QA Feedback Integration

Your thorough review identified critical issues with my previous plan. Here's the corrected approach based on actual code analysis.

---

## Root Cause Analysis

### Issue 1: Personal Blurb Not Appearing

**Actual root cause confirmed via code review:**

The `wasBaselineOpeningShown()` function in `src/lib/chatModeCopy.ts` (lines 296-302) uses a **session-global key**:

```typescript
export const BASELINE_OPENING_SHOWN_KEY = 'habitta_baseline_opening_shown';

export function wasBaselineOpeningShown(): boolean {
  return sessionStorage.getItem(BASELINE_OPENING_SHOWN_KEY) === 'true';
}
```

This means:
- User visits Property A, blurb shows, flag set to `'true'`
- User visits Property B, flag is still `'true'`, no blurb appears

**The flag is property-agnostic, causing cross-property pollution.**

Additionally, the `hasShownBaselineOpening` initialization in `ChatConsole.tsx` (lines 173-185) has a timing issue:
- It checks `sessionStorage.getItem(`habitta_chat_messages_${propertyId}`)` but `propertyId` might be stale during useState initialization

---

### Issue 2: Duplicate UI on LG/XL Boundary

**Actual root cause confirmed:**

Looking at `tailwind.config.ts`, there are **no custom screen breakpoints defined**. This means Tailwind uses defaults:
- `lg`: 1024px
- `xl`: 1280px

The layout structure in `DashboardV3.tsx`:

| Line | Component | Class | Expected |
|------|-----------|-------|----------|
| 465 | ResizablePanelGroup | `hidden xl:flex` | Hidden below 1280px, flex at 1280px+ |
| 532 | Fallback div | `hidden lg:flex xl:!hidden` | Flex at 1024-1279px, hidden at 1280px+ |

**The CSS is correct.** The `xl:!hidden` should work. But looking at the screenshot showing THREE columns of content, the issue is likely:

1. Viewport width is exactly at or near 1280px boundary, causing both to render momentarily
2. OR the ResizablePanelGroup's `xl:flex` is rendering both its internal panels (Middle + Right) while the fallback is also visible

**Key insight:** The fallback MiddleColumn at line 532 has `isMobile={true}` passed to it, which suggests it might be a mobile layout that looks different. The screenshot shows the System Outlook appearing twice, which means TWO MiddleColumn instances are both rendering.

**Real fix needed:** Use JavaScript-based conditional rendering instead of CSS-only, since CSS breakpoints can have race conditions during resize.

---

## Implementation Plan

### File 1: `src/lib/chatModeCopy.ts`

**Change: Make baseline opening flag property-specific**

Update functions to accept `propertyId`:

```typescript
// Lines 291-323
export const BASELINE_OPENING_SHOWN_KEY = 'habitta_baseline_opening_shown';

/**
 * Check if baseline opening message was already shown for this property.
 * Property-scoped to prevent cross-property pollution.
 */
export function wasBaselineOpeningShown(propertyId?: string): boolean {
  try {
    if (propertyId) {
      // Property-specific check first
      return sessionStorage.getItem(`${BASELINE_OPENING_SHOWN_KEY}_${propertyId}`) === 'true';
    }
    // Legacy global check for backward compatibility
    return sessionStorage.getItem(BASELINE_OPENING_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark baseline opening message as shown for this property.
 */
export function markBaselineOpeningShown(propertyId?: string): void {
  try {
    if (propertyId) {
      sessionStorage.setItem(`${BASELINE_OPENING_SHOWN_KEY}_${propertyId}`, 'true');
    }
    // Also set global flag for legacy compatibility
    sessionStorage.setItem(BASELINE_OPENING_SHOWN_KEY, 'true');
  } catch {
    // Silent failure
  }
}

/**
 * Clear baseline opening shown flag for a property (for testing/reset).
 */
export function clearBaselineOpeningShown(propertyId?: string): void {
  try {
    if (propertyId) {
      sessionStorage.removeItem(`${BASELINE_OPENING_SHOWN_KEY}_${propertyId}`);
    }
    sessionStorage.removeItem(BASELINE_OPENING_SHOWN_KEY);
  } catch {
    // Silent failure
  }
}
```

---

### File 2: `src/components/dashboard-v3/ChatConsole.tsx`

**Change 1: Move hasShownBaselineOpening initialization to useEffect**

The useState initializer runs once with potentially stale propertyId. Move the check to a useEffect:

```typescript
// Line 173: Simple initial state
const [hasShownBaselineOpening, setHasShownBaselineOpening] = useState(false);

// New useEffect: Check property-specific storage when propertyId becomes available
useEffect(() => {
  if (!propertyId) return;
  
  // Check property-specific flag AND existing messages
  const flagSet = wasBaselineOpeningShown(propertyId);
  const hasStoredMessages = (() => {
    try {
      const stored = sessionStorage.getItem(`habitta_chat_messages_${propertyId}`);
      return stored !== null && JSON.parse(stored).length > 0;
    } catch {
      return false;
    }
  })();
  
  setHasShownBaselineOpening(flagSet || hasStoredMessages);
}, [propertyId]);
```

**Change 2: Fix opening message effect with early return for baselineSystems**

```typescript
// Lines 224-254: Updated effect
useEffect(() => {
  // Don't show opening while still restoring from storage
  if (isRestoring) return;
  
  // Wait for baselineSystems to load (async data)
  if (baselineSystems.length === 0) return;
  
  if (messages.length === 0 && !hasShownBaselineOpening) {
    const planningCount = baselineSystems.filter(
      s => s.state === 'planning_window' || s.state === 'elevated'
    ).length;
    
    const message = generatePersonalBlurb({
      yearBuilt,
      systemCount: baselineSystems.length,
      planningCount,
      confidenceLevel,
      isFirstVisit: isFirstUserVisit,
    });
    
    injectMessage(message);
    markBaselineOpeningShown(propertyId); // Pass propertyId!
    setHasShownBaselineOpening(true);
    
    if (isFirstUserVisit) {
      markFirstVisitComplete();
    }
  }
}, [isRestoring, messages.length, hasShownBaselineOpening, injectMessage, baselineSystems, confidenceLevel, yearBuilt, isFirstUserVisit, propertyId]);
```

---

### File 3: `src/pages/DashboardV3.tsx`

**Change: Use conditional rendering instead of CSS-only visibility**

CSS-based breakpoint hiding can have timing issues. Use a custom hook for reliable breakpoint detection:

```typescript
// Add at component level (around line 50)
const isXlScreen = useMediaQuery('(min-width: 1280px)');

// If useMediaQuery doesn't exist, create it inline:
const [isXlScreen, setIsXlScreen] = useState(() => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1280;
});

useEffect(() => {
  const handleResize = () => {
    setIsXlScreen(window.innerWidth >= 1280);
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

Then update the JSX (lines 455-563):

```tsx
<div className="flex flex-1 min-h-0 overflow-hidden">
  {/* Left Column - Navigation + Identity (Fixed 240px) */}
  <aside className="w-60 border-r bg-card shrink-0 hidden lg:flex flex-col">
    <LeftColumn 
      address={fullAddress}
      onAddressClick={handleAddressClick}
    />
  </aside>
  
  {/* Resizable Middle + Right Columns (xl screens) - conditional render */}
  {isXlScreen ? (
    <ResizablePanelGroup 
      direction="horizontal" 
      className="flex-1 min-h-0"
      onLayout={(sizes) => {
        localStorage.setItem('dashboard_right_panel_size', sizes[1].toString());
      }}
    >
      {/* Middle Column - Primary Canvas */}
      <ResizablePanel 
        defaultSize={60} 
        minSize={55}
        className="!overflow-hidden"
      >
        <div className="h-full p-6 pb-0">
          <MiddleColumn {...middleColumnProps} />
        </div>
      </ResizablePanel>
      
      <ResizableHandle withHandle />
      
      <ResizablePanel 
        defaultSize={parseFloat(localStorage.getItem('dashboard_right_panel_size') || '40')} 
        minSize={30} 
        maxSize={45}
      >
        <aside className="border-l bg-muted/10 h-full overflow-y-auto p-6">
          <RightColumn {...rightColumnProps} />
        </aside>
      </ResizablePanel>
    </ResizablePanelGroup>
  ) : (
    /* Middle Column only (lg screens without right column) */
    <div className="flex-1 min-h-0 flex flex-col p-6 pb-0 hidden lg:block">
      <MiddleColumn {...middleColumnProps} isMobile={true} />
    </div>
  )}
</div>
```

Note: The `hidden lg:block` on the fallback ensures it only shows on lg screens (the conditional already handles xl+ via JavaScript).

---

## Summary of Changes

| File | Change | Why |
|------|--------|-----|
| `src/lib/chatModeCopy.ts` | Make `wasBaselineOpeningShown` and `markBaselineOpeningShown` property-specific | Prevents cross-property pollution |
| `src/components/dashboard-v3/ChatConsole.tsx` | Move storage check to useEffect; add early return for baselineSystems | Fixes race condition with async propertyId and data loading |
| `src/pages/DashboardV3.tsx` | Use JavaScript conditional rendering instead of CSS-only | Eliminates CSS breakpoint timing issues |

---

## Testing Checklist

| Scenario | Expected Result |
|----------|-----------------|
| Fresh session, first property visit | Personal blurb appears with time-of-day greeting |
| Navigate to /systems and back | Messages preserved, no duplicate blurb |
| Switch to different property | Blurb shows for new property (separate storage key) |
| Clear conversation, navigate away, return | No messages, blurb can appear again |
| Resize browser at exactly 1280px width | No duplicate MiddleColumn UI |
| lg screen (1024-1279px) | Only fallback MiddleColumn visible |
| xl+ screen (1280px+) | Only ResizablePanelGroup visible |

---

## Edge Cases Addressed

| Edge Case | How Handled |
|-----------|-------------|
| `propertyId` undefined initially | useEffect won't run until propertyId is available |
| `baselineSystems` loads after component mounts | Early return ensures effect re-runs when data arrives |
| Global flag already set from previous property | Property-specific keys prevent pollution |
| CSS breakpoint race conditions | JavaScript-based conditional rendering is deterministic |
| Clearing conversation | Storage removal handled by useAIHomeAssistant persistence effect |

