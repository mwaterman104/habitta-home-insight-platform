

# Chat-Driven Recommendation Fulfillment

## Overview

Recommendation cards become conversation starters instead of navigation links. Tapping a card opens MobileChatSheet with a contextual assistant greeting scoped to the task. The chat handles fulfillment (photo upload, data collection, maintenance logging) through its existing tool pipeline.

## Architecture

```text
RecommendationCards (dumb, emits onAction)
       |
       v
MobileDashboardView (passes through onRecommendationAction)
       |
       v
DashboardV3 (orchestrator)
  - sets activeRecommendation state
  - builds initialAssistantMessage from RECOMMENDATION_CHAT_OPENERS
  - sets focusContext to recommendation's system
  - opens MobileChatSheet
  - clears state on close
       |
       v
MobileChatSheet (already supports initialAssistantMessage + focusContext)
       |
       v
ChatConsole (existing photo upload, tool pipeline, AI responses)
```

## Completion Semantics

Recommendations are considered complete when their underlying confidence signal transitions to true. No separate completion state is stored in v1. When the user uploads a photo via chat and the tool persists it, the next confidence recomputation drops the recommendation automatically.

## Implementation Details

### 1. RecommendationCards.tsx

- Add `onAction: (rec: Recommendation) => void` prop
- Replace `onClick={() => navigate(rec.route)}` with `onClick={() => onAction(rec)}`
- Remove `useNavigate` import
- Keep `onDismiss` unchanged

### 2. MobileDashboardView.tsx

- Add `onRecommendationAction: (rec: Recommendation) => void` prop to interface
- Pass it to `RecommendationCards` as `onAction`

### 3. DashboardV3.tsx (mobile section)

- Add state: `activeRecommendation: Recommendation | null`
- Add state: `chatLockedForRecommendation: boolean` (prevents tapping another card while chat is open)
- Handler `handleRecommendationAction(rec)`:
  - If `chatLockedForRecommendation` is true, return early (one-at-a-time guard)
  - Set `activeRecommendation` to rec
  - Set `chatLockedForRecommendation` to true
  - Open `mobileChatOpen`
- Pass to MobileChatSheet:
  - `initialAssistantMessage` built from `RECOMMENDATION_CHAT_OPENERS[rec.actionType](systemName, rec.confidenceDelta)` when `activeRecommendation` is set
  - `focusContext` set to `{ systemKey: rec.systemId, trigger: 'recommendation' }` when `activeRecommendation` is set
- On chat close:
  - Clear `activeRecommendation` to null
  - Set `chatLockedForRecommendation` to false
  - Clear `initialAssistantMessage` (one-shot: message is built fresh per open, cleared on close, never replayed)

### 4. mobileCopy.ts

Add `RECOMMENDATION_CHAT_OPENERS` -- a map from actionType to template functions:

| Action Type | Opening Message |
|-------------|----------------|
| upload_photo | "Let's get a photo of your {systemName}. A clear shot of the label or front helps verify the model and condition, and can improve your confidence score by +{delta}." |
| add_year | "Do you know when your {systemName} was installed? Even a rough range like '5-10 years ago' helps plan more accurately." |
| upload_doc | "If you have a permit or invoice for your {systemName}, a quick photo of it gives verified data to work with." |
| add_serial | "Do you have access to the serial or model number on your {systemName}? It's usually on a label or sticker on the unit." |
| confirm_material | "What material is your {systemName}? Knowing this helps estimate remaining life more accurately." |
| log_maintenance | "Has your {systemName} been serviced recently? If you remember the last time, I'll add it to your home's record." |
| acknowledge | "Your {systemName} is in its late-life window. Have you started thinking about replacement timing or budget?" |
| review_freshness | "It's been a while since your home records were updated. Anything changed recently -- maintenance, repairs, or new equipment?" |

Copy guardrail: all templates use "can improve" or "helps increase", never "will increase."

### 5. MobileChatSheet.tsx

No structural changes. Already supports `initialAssistantMessage` and `focusContext`. The existing one-shot injection via `hasPrimedForContext` ref handles the "inject once per open" behavior correctly -- `initialAssistantMessage` bypasses the priming guard entirely (line 69), and clearing it on close in DashboardV3 prevents replay.

### 6. focusContext shape contract

When opened via recommendation, `focusContext` will use the existing shape: `{ systemKey: string, trigger: string }` with `trigger: 'recommendation'`. This is forward-compatible with future analytics and tool-routing without requiring a new type.

## What Is NOT Changed

- ChatConsole internals
- Recommendation scoring or generation logic
- Desktop layout
- Dismiss behavior (X button, localStorage)
- LifecycleRing on system tiles
- MobileChatSheet component structure

