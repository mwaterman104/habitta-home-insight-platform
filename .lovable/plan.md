

## Fix: Sync Home Profile Record Bar After Chat Updates

### The Problem
The screenshot shows the chat celebrating "your record strength just jumped from 50% to 100%!" while the Home Profile Record bar at the top still reads "Limited (17%)". The AI calculates a fresh score inside the edge function, but the frontend never re-fetches the data that drives the bar.

### Root Cause
`useHomeConfidence` fetches `home_assets` and `home_events` once on mount (keyed by `homeId`) and exposes no refetch mechanism. When the chat updates a system via `update_system_info`:

1. `onSystemUpdated()` fires in `DashboardV3`
2. It calls `refetchSystems()` (the `systems` table)
3. But `useHomeConfidence` never re-fetches its underlying data (`home_assets`, `home_events`)
4. The `capitalTimeline` query is also not invalidated
5. The bar stays frozen at its initial score

### The Fix

#### 1. Expose a `refetch` function from `useHomeConfidence`
**File:** `src/hooks/useHomeConfidence.ts`

Extract the fetch logic into a named function and return it alongside existing values:

```text
// Move the async fetchData() out of useEffect so it can be called externally
const refetchConfidence = useCallback(async () => { ... fetch home_assets + home_events ... }, [homeId]);

// Still call it on mount via useEffect
useEffect(() => { refetchConfidence(); }, [refetchConfidence]);

return { confidence, recommendations, dismissRecommendation, loading, lastTouchAt, refetchConfidence };
```

#### 2. Wire `handleSystemUpdated` to also refresh confidence data
**File:** `src/pages/DashboardV3.tsx`

Update the callback to also invalidate the capital timeline and re-fetch confidence:

```text
const handleSystemUpdated = useCallback(() => {
  refetchSystems();
  refetchConfidence();                                          // NEW
  queryClient.invalidateQueries({ queryKey: ['capital-timeline'] });  // NEW
}, [refetchSystems, refetchConfidence, queryClient]);
```

This ensures that after any system update (chat-driven or photo-driven), the bar re-computes from fresh DB data.

#### 3. Verify the same fix applies to MobileChatPage
**File:** `src/pages/MobileChatPage.tsx`

The mobile page also passes `onSystemUpdated` to `ChatConsole`. It needs the same treatment: call `refetchConfidence` + invalidate `capital-timeline` when a system update occurs.

### Why This Solves Both Directions

- **Score goes up:** User provides data via chat, bar refreshes immediately
- **Score discrepancy:** The edge function's lightweight score calculation may differ slightly from the frontend's `computeHomeConfidence`. After the fix, the bar always shows the frontend's canonical computation from fresh data -- no disagreement possible

### What Does NOT Change
- No edge function changes needed
- No greeting logic changes
- No database changes
- The AI's celebration message is fine -- the issue is purely that the bar doesn't catch up

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useHomeConfidence.ts` | Expose `refetchConfidence` callback |
| `src/pages/DashboardV3.tsx` | Call `refetchConfidence()` and invalidate `capital-timeline` in `handleSystemUpdated` |
| `src/pages/MobileChatPage.tsx` | Same wiring for mobile path |
