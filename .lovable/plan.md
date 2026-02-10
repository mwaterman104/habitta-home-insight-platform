

# Unified Contextual Chat Surface + Dead CTA Elimination

## Overview

This plan introduces one architectural primitive -- a `ChatContext` React context -- that allows any page or component to invoke a scoped chat panel without navigating away. Every dead CTA, ChatDIY link, and "nothing happens" button is rewired to this surface. The Maintenance page is wrapped in `DashboardV3Layout` for consistent navigation.

## Execution Order

The work is sequenced to establish the primitive first, then systematically rewire all surfaces.

### Phase 1: Create the Chat Primitive

**Create `src/contexts/ChatContext.tsx`**

A React context providing `openChat(context)` and `closeChat()` to any descendant component.

```text
ChatContextType = {
  type: 'system' | 'maintenance' | 'activity_log' | 'supporting_record' | 'system_edit' | 'general',
  systemKey?: string,
  taskId?: string,
  taskTitle?: string,
  trigger?: string,
  metadata?: Record<string, any>
}
```

Default fallback when called with no context: `{ type: 'general', trigger: 'ask_habitta' }`.

**Create `src/lib/chatContextCopy.ts`**

Maps chat context types to assistant opening messages (same template function pattern as `RECOMMENDATION_CHAT_OPENERS`):

| Context Type + Trigger | Opening Message |
|---|---|
| system / maintenance_guidance | "What do you want to know about your {systemName}? I can walk you through maintenance, explain timing, or help you decide next steps." |
| system / view_guide | "Here's what you can do for your {systemName} right now. Are you handling this yourself or looking for a pro?" |
| maintenance / start_task | "Ready to tackle '{taskTitle}'? Are you doing this yourself or looking for a pro?" |
| maintenance / generate_plan | "I'll help build your seasonal plan. Any systems you want to prioritize?" |
| activity_log / log_activity | "What maintenance or work was done? I'll add it to your home's permanent record." |
| supporting_record / upload | "What kind of record do you have? A receipt, inspection report, warranty, or photo?" |
| system_edit / edit_confidence | "What would you like to update about your {systemName}? I can adjust the install year, source, or notes." |
| general / ask_habitta | "What can I help you with today?" |

**Create `src/components/chat/ContextualChatPanel.tsx`**

Desktop right-side slide-out panel wrapping `ChatConsole`. Renders as a fixed-position overlay on the right edge (~400px wide) with a semi-transparent backdrop. Shares the same props pattern as `MobileChatSheet` but rendered inline rather than in a bottom drawer.

### Phase 2: Integrate into Layout

**Modify `src/layouts/DashboardV3Layout.tsx`**

- Wrap children in `ChatContextProvider`
- On desktop: render `ContextualChatPanel` (slide-out from right)
- On mobile: render `MobileChatSheet` (existing bottom drawer)
- The provider manages `chatContext` state, builds `initialAssistantMessage` from `chatContextCopy`, and handles open/close lifecycle

This means any page using `DashboardV3Layout` (Home Profile, Systems Hub, Maintenance, etc.) automatically gets chat capability via `useChatContext()`.

### Phase 3: Fix Maintenance Layout (Issue 8)

**Modify `src/pages/MaintenancePage.tsx`**

- Wrap in `DashboardV3Layout` instead of rendering its own header, back button, and `BottomNavigation`
- Remove manual `<header>`, `<ChevronLeft>` back button, and `<BottomNavigation />` from both mobile and desktop renders
- Content becomes a simple scrollable area inside the layout
- Wire "Generate Seasonal Plan" timeout fallback: if `generating` is true for more than 10 seconds, show a "Taking longer than expected -- talk to Habitta" link that opens chat with `{ type: 'maintenance', trigger: 'generate_plan' }`
- Wire "Start" button on tasks: after status flip to `in_progress`, optionally open chat with `{ type: 'maintenance', taskId, taskTitle, trigger: 'start_task' }`

### Phase 4: Wire Home Profile Dead CTAs (Issues 3, 4, 5)

**Modify `src/components/HomeProfile/HomeActivityLog.tsx`**

- Add `onLogActivity?: () => void` prop
- Wire both "Log activity" and "Log your first activity" buttons to call `onLogActivity`

**Modify `src/components/HomeProfile/SupportingRecords.tsx`**

- Add `onUploadRecord?: () => void` prop  
- Wire "Upload document" and "Add your first record" buttons to call `onUploadRecord`

**Modify `src/components/HomeProfile/SystemProvenance.tsx`**

- Already has `onEditSystem` prop -- no structural change needed
- The parent (`HomeProfilePage`) will pass a real handler

**Modify `src/pages/HomeProfilePage.tsx`**

- Import and use `useChatContext()` 
- Pass handlers to child components:
  - `HomeActivityLog`: `onLogActivity={() => openChat({ type: 'activity_log', trigger: 'log_activity' })}`
  - `SupportingRecords`: `onUploadRecord={() => openChat({ type: 'supporting_record', trigger: 'upload' })}`
  - `SystemProvenance`: `onEditSystem={(systemId) => openChat({ type: 'system_edit', systemKey: systemId, trigger: 'edit_confidence' })}`

### Phase 5: Kill ChatDIY (Issue 1)

**Modify `src/components/SystemDetailView.tsx`**

- Remove `ChatDIYBanner` import and render (lines 8, 386-390)
- Remove `getChatdiyTopic()` helper (lines 96-102)
- Add `onOpenChat?: (context: ChatContextType) => void` prop
- Replace `onMaintenanceCta` handler: instead of `navigate('/chatdiy?...')`, call `onOpenChat({ type: 'system', systemKey, trigger: 'maintenance_guidance' })`
- Replace action button `onClick` to call `onOpenChat({ type: 'system', systemKey, trigger: 'view_guide' })` instead of `onActionComplete?.(action.chatdiySlug)`
- Add an inline "Ask Habitta about this system" button where `ChatDIYBanner` was

**Modify `src/components/AppTopbar.tsx`**

- Change the HelpCircle button from `navigate("/chatdiy")` to `openChat({ type: 'general', trigger: 'ask_habitta' })`

**Modify `src/components/AppSidebar.tsx`**

- Change the Help button from `navigate("/chatdiy")` to `openChat({ type: 'general', trigger: 'ask_habitta' })`

**Modify `src/components/HomeHealthCard.tsx`**

- Replace fallback `navigate('/chatdiy?...')` in `handleProtectClick` with `openChat({ type: 'system', trigger: 'maintenance_guidance', metadata: { score, projected, topRisk, region } })`

**Modify `src/pages/AppRoutes.tsx`**

- Replace `/chatdiy` route with a redirect to `/dashboard`

### Phase 6: Cleanup

**Delete `src/components/ChatDIYBanner.tsx`**

Fully replaced by the contextual chat primitive.

**Note on `systemMeta.ts`**

The `chatdiyTopicPrefix` field in `SYSTEM_META` is no longer used for routing. It can remain for now as a semantic identifier but is no longer wired to navigation. A future cleanup pass can remove it.

## What Is NOT Changed

- ChatConsole internals (the AI conversation engine)
- MobileChatSheet component structure (reused as-is for mobile via DashboardV3Layout)
- Confidence scoring formulas
- Recommendation engine
- Capital timeline computation
- Desktop three-column DashboardV3 layout (DashboardV3 has its own chat, this is for other pages)
- home_events ledger structure
- DashboardV3.tsx itself (it has its own chat orchestration already)

## Files to Create (3)

- `src/contexts/ChatContext.tsx`
- `src/lib/chatContextCopy.ts`
- `src/components/chat/ContextualChatPanel.tsx`

## Files to Modify (10)

- `src/layouts/DashboardV3Layout.tsx` -- integrate ChatContextProvider + panel
- `src/pages/MaintenancePage.tsx` -- wrap in DashboardV3Layout, wire chat CTAs
- `src/pages/HomeProfilePage.tsx` -- wire dead CTAs via useChatContext
- `src/components/HomeProfile/HomeActivityLog.tsx` -- add onLogActivity prop
- `src/components/HomeProfile/SupportingRecords.tsx` -- add onUploadRecord prop
- `src/components/SystemDetailView.tsx` -- remove ChatDIYBanner, wire to chat
- `src/components/AppTopbar.tsx` -- replace chatdiy navigate
- `src/components/AppSidebar.tsx` -- replace chatdiy navigate  
- `src/components/HomeHealthCard.tsx` -- replace chatdiy navigate
- `src/pages/AppRoutes.tsx` -- redirect /chatdiy to /dashboard

## Files to Delete (1)

- `src/components/ChatDIYBanner.tsx`

