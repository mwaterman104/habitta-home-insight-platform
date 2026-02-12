

# Wire Up SystemFocusDetail Buttons: Snap Photo, I Know the Year, Get Local Replacement Quotes

## Overview

Three buttons in the Investment Analysis view are rendered but not wired to any handlers. This plan connects each to existing infrastructure using the chat context and existing modals/components.

## Changes

### 1. RightColumnSurface.tsx -- Orchestrator for modals and handlers

- Import `useState`, `useChatContext`, `SystemUpdateModal`, and a new `SystemPhotoCapture` component
- Add `homeId` prop (sourced from `capitalTimeline.propertyId` or passed explicitly from `DashboardV3`)
- Add `yearBuilt` optional prop for the update modal
- Track two boolean states: `showPhotoCapture` and `showUpdateModal`
- In the `case 'system'` branch, pass three handlers to `SystemFocusDetail`:
  - `onVerifyPhoto` -- sets `showPhotoCapture = true`
  - `onReportYear` -- sets `showUpdateModal = true`
- Render `SystemPhotoCapture` dialog when `showPhotoCapture` is true, scoped to the focused system
- Render `SystemUpdateModal` when `showUpdateModal` is true, with an `onUpdateComplete` callback that also fires `openChat()` with an auto-send message noting the update
- Add `homeId` and `yearBuilt` to the `RightColumnSurfaceProps` interface

### 2. SystemFocusDetail.tsx -- Wire "Get Local Replacement Quotes" to chat

- Import `useChatContext` 
- Replace `handleGetQuotes` implementation: instead of `setFocus({ type: 'contractor_list', ... })`, call `openChat()` with:
  ```
  {
    type: 'system',
    systemKey: system.systemId,
    trigger: 'find_pro',
    autoSendMessage: `Find local contractors for ${system.systemLabel} replacement near my home.`
  }
  ```
- This leverages the AI's existing `get_contractor_recommendations` tool to fetch real Google Places data

### 3. New: SystemPhotoCapture.tsx -- Cross-platform photo capture dialog

A lightweight component that reuses the patterns from `ChatPhotoUpload`:

- Uses `useIsMobile()` to branch behavior
- **Desktop**: Renders a `Dialog` containing `QRPhotoSession` (QR code for phone capture) plus a fallback "Upload from computer" button
- **Mobile**: Renders a `Dialog` with two buttons: "Take Photo" (camera input with `capture="environment"`) and "Choose from Gallery" (file input)
- On successful upload (to `home-photos` bucket under `chat-uploads/`):
  1. Calls `openChat()` with `autoSendMessage`: "I just uploaded a photo of my [systemLabel]. Please analyze it to verify the installation details."
  2. The existing AI flow handles photo analysis and calls `update_system_info` if it extracts useful data
- Reuses the same validation (10MB max, image types only) and storage upload pattern from `ChatPhotoUpload`

### 4. DashboardV3.tsx -- Pass homeId to RightColumnSurface

- Add `homeId={userHome.id}` and `yearBuilt={userHome.year_built}` props to the `RightColumnSurface` component where it's rendered (around line 763)

## Data Flow

```text
[Snap Photo] -> SystemPhotoCapture dialog -> upload to home-photos storage
             -> openChat(autoSendMessage with photo context)
             -> AI analyzes photo -> update_system_info tool -> system record updated

[I Know Year] -> SystemUpdateModal (existing binary-first flow)
              -> update-system-install edge function -> system record updated
              -> openChat(autoSendMessage noting the update)

[Get Quotes]  -> openChat(autoSendMessage: "Find local contractors for X replacement")
              -> AI calls get_contractor_recommendations -> results in chat
```

## Files Summary

| File | Action |
|------|--------|
| `src/components/dashboard-v3/panels/SystemFocusDetail.tsx` | Import `useChatContext`, change Get Quotes handler to use `openChat` |
| `src/components/dashboard-v3/RightColumnSurface.tsx` | Add modal state, handlers, render `SystemUpdateModal` and `SystemPhotoCapture` |
| `src/components/dashboard-v3/SystemPhotoCapture.tsx` | **New** -- cross-platform photo capture dialog |
| `src/pages/DashboardV3.tsx` | Pass `homeId` and `yearBuilt` props to `RightColumnSurface` |

