

# Fix Contractor Cards + Mobile Chat Full-Page Route

## Overview

Three changes: (1) inject structured tool JSON into message content so ContractorCard renders stars/reviews, (2) add sprinkler/irrigation search mappings to the edge function, (3) replace MobileChatSheet drawer with a dedicated `/chat` route page.

## Part 1: Contractor Card Data Injection

### File: `src/hooks/useAIHomeAssistant.ts`

In `sendMessage()`, between lines 222 and 224, add injection logic before building the assistant message:

```typescript
// After line 222 (after assistantError check)
let messageContent = data.message;

if (data.functionResult && typeof data.functionResult === 'string') {
  try {
    const parsed = JSON.parse(data.functionResult);
    if (
      (parsed.type === 'contractor_recommendations' && Array.isArray(parsed.contractors)) ||
      parsed.type === 'home_event_recorded'
    ) {
      messageContent = data.functionResult + '\n\n' + data.message;
    }
  } catch { /* not JSON, skip */ }
}
```

Then change line 228 from `content: data.message` to `content: messageContent`.

No other files need changes -- `extractContractorData()` in `chatFormatting.ts` already parses this JSON and `ContractorCard` already renders stars/reviews.

## Part 2: Sprinkler/Irrigation Search Mappings

### File: `supabase/functions/ai-home-assistant/index.ts` (lines 1429-1446)

Add these entries to the `searchQueries` map:

```typescript
'sprinkler': 'sprinkler system repair service',
'sprinkler_system': 'sprinkler system repair',
'irrigation': 'irrigation system repair contractor',
'irrigation_system': 'irrigation system repair service',
'landscaping': 'landscape contractor',
'landscaping_irrigation': 'irrigation and drainage contractor',
```

## Part 3: Mobile Chat as Full-Page Route

### New file: `src/pages/MobileChatPage.tsx`

Full-screen chat page that:
- Reads intent from `location.state` (systemKey, systemLabel, initialAssistantMessage, autoSendMessage, focusContext props)
- Renders a minimal header with "Ask Habitta" title and a back button (`navigate(-1)` with `/dashboard` fallback)
- Renders `ChatConsole` full-screen below the header
- Fetches `userHome` and `capitalTimeline` for baseline systems (same pattern as SystemPlanPage)
- Derives `chatMode` via `useChatMode`

### File: `src/pages/AppRoutes.tsx`

Add protected route:
```
<Route path="/chat" element={<ProtectedRoute><MobileChatPage /></ProtectedRoute>} />
```

### File: `src/pages/DashboardV3.tsx`

Changes to the mobile section (lines 520-616):

- Remove `MobileChatSheet` import and rendering (lines 575-614)
- Remove `mobileChatOpen` state (line 93) -- keep `mobileChatIntent` for navigation
- Replace `handleMobileChatOpen` to navigate instead of setting state:
  ```typescript
  const handleMobileChatOpen = useCallback((intent?: MobileChatIntent) => {
    navigate('/chat', { state: { intent: intent || null } });
  }, [navigate]);
  ```
- Remove `handleMobileChatClose` (line 416-421)
- Remove `MobileChatSheet` rendering block (lines 575-614)
- Update `BottomNavigation` chat handler: `onChatOpen={() => navigate('/chat')}`

### File: `src/pages/SystemPlanPage.tsx`

Changes:
- Remove `MobileChatSheet` import and rendering (lines 291-309)
- Remove `chatOpen`, `chatIntent`, `chatInitialMessage` state (lines 45-47)
- Replace `handleStartPlanning` and `handleChatExpand` to navigate:
  ```typescript
  const handleStartPlanning = () => {
    navigate('/chat', { state: { intent: {
      systemKey,
      systemLabel: system?.systemLabel || getSystemDisplayName(systemKey || ''),
      initialAssistantMessage: CHAT_FIRST_TURN.systemPlanning(displayName),
    }}});
  };
  ```
- Similarly for `handleChatExpand` -- navigate with appropriate intent

### File: `src/components/BottomNavigation.tsx`

Update the Chat nav item to navigate directly:
- Change `onChatOpen` prop to optional
- When chat is tapped: if `onChatOpen` provided, call it; otherwise `navigate('/chat')`
- No visual changes

### What does NOT change

- `ChatConsole` component -- used as-is in MobileChatPage
- `MobileChatSheet.tsx` -- kept for now (unused on mobile dashboard/plan, but no deletion in this pass)
- `MobileDashboardView.tsx` -- no changes needed, CTAs still call `onChatOpen(intent)` which parent handles
- Desktop layout -- completely unaffected
- Chat persistence, extraction logic, ContractorCard rendering

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useAIHomeAssistant.ts` | Modify -- inject domain artifact JSON |
| `supabase/functions/ai-home-assistant/index.ts` | Modify -- add search mappings |
| `src/pages/MobileChatPage.tsx` | Create -- full-page mobile chat |
| `src/pages/AppRoutes.tsx` | Modify -- add /chat route |
| `src/pages/DashboardV3.tsx` | Modify -- replace drawer with navigation |
| `src/pages/SystemPlanPage.tsx` | Modify -- replace drawer with navigation |
| `src/components/BottomNavigation.tsx` | Modify -- navigate to /chat |

