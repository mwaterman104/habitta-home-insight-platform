

# Dashboard Refinements: Sharpened with Feedback

## Overview

Five focused changes to the mobile Home Pulse dashboard, incorporating all review feedback on psychology, copy discipline, and visual hierarchy.

## Changes

### 1. System Ledger: Life-Remaining Mini-Bar + Tappable Rows

**File: `src/components/mobile/SystemLedger.tsx`**

**Life-Remaining Bar (not "consumed" bar):**
- Compute `percentRemaining = 100 - percentConsumed` and render as a thin bar (3px tall, ~72px wide) showing life left
- Color: habitta-olive when remaining > 40%, habitta-slate at 15-40%, habitta-clay below 15%
- This frames as "life remaining" not "life consumed" -- same math, calmer psychology

**1-year smoothing guardrail:**
- Do NOT render the bar if:
  - `system.dataQuality === 'low'` AND `getLateLifeState(system) === 'not-late'`
- This prevents visualizing uncertain math for low-confidence, non-critical systems

**Tappable rows:**
- Each row navigates to `/systems/${system.systemId}/plan` on tap
- Add a `ChevronRight` icon (14px) at the far right in `text-habitta-stone/30` -- lowest visual weight
- Add `cursor-pointer` and `active:bg-habitta-stone/5` for touch feedback

**Visual hierarchy within each row:**
1. System name (primary)
2. Replacement window text
3. Mini-bar (subtle, secondary)
4. Chevron (barely visible, tertiary)

**Imports needed:** `useNavigate` from react-router-dom, `ChevronRight` from lucide-react, `getRemainingYearsForSystem`, `getLateLifeState` from homeOutlook, `getLifecyclePercent` from homeOutlook

### 2. Missing Documentation: Calm Confidence Boost Labels

**File: `src/components/mobile/MissingDocumentation.tsx`**

- Update props to accept `nextGain` with its `delta` value (already available)
- Photo button: "Upload Photo (+{delta}% confidence)" -- parenthetical framing, not gamified
- Doc button: "Upload Doc (+2% confidence)" -- fixed estimate for permit/invoice signal
- Threshold rule: if boost is less than 2%, hide the boost label entirely -- a "+1%" looks trivial
- When `nextGain` is null, buttons show without boost labels
- No Duolingo energy. Intelligence framing only.

### 3. Proactive Chat Insight Banner

**New file: `src/components/mobile/ChatInsightBanner.tsx`**

A single, calm insight snippet that bridges dashboard to chat.

- Props: `systemLabel: string`, `onTap: () => void`
- Only one banner, only for the top-priority system, only when in late-life state
- Never stacked, never multiple

**Copy (tightened per feedback):**
- "Your {systemLabel} is entering its replacement window. See what a planned replacement looks like."
- No "emergency" language. No alarm. Steady and directional.

**Styling:**
- `bg-habitta-slate/8 border border-habitta-slate/20 rounded-sm p-4`
- Small message-circle icon (16px, habitta-slate) on the left
- "Tap to explore" in `text-meta text-habitta-stone/60` below the main copy

**File: `src/components/dashboard-v3/mobile/MobileDashboardView.tsx`**

- Import `ChatInsightBanner` and `getLateLifeState`
- Render between the Data Confidence Bar and Primary System Card
- Only render when the primary system has `getLateLifeState() !== 'not-late'`
- Tapping calls `onChatOpen` (wires to chat with system context)

### 4. Primary System Card: Contextual CTA

**File: `src/components/mobile/PrimarySystemCard.tsx`**

Add a text-style action button at the bottom of the card footer:

- For late-life systems: "Explore replacement planning" (ownership language, not AI assistant wording)
- For healthy systems: "Log recent service" (reflective, not event-scheduling)
- Styled as: `text-habitta-slate font-semibold text-meta uppercase tracking-wider` with a small arrow icon
- New prop: `onAction?: () => void` -- parent wires to chat open

**File: `src/components/dashboard-v3/mobile/MobileDashboardView.tsx`**

- Pass `onAction` to `PrimarySystemCard` that triggers `onChatOpen`

### 5. Spacing Discipline

**File: `src/components/dashboard-v3/mobile/MobileDashboardView.tsx`**

- Increase the parent container from `space-y-6` to `space-y-7` to absorb the new insight banner without cramping
- This is the only layout change -- all other spacing stays internal to components

## Visual Hierarchy Check

The additions (mini-bars, boost labels, chevrons, banner, CTA) are all designed at low visual weight:
- Mini-bars: 3px tall, muted colors, conditional rendering
- Boost labels: parenthetical, hidden below 2%
- Chevrons: 14px, 30% opacity
- Banner: single instance, slate tones, no bold
- CTA: text button, no fill, uppercase meta size

## What Does NOT Change

- Scoring engine (homeConfidence.ts)
- State thresholds
- Desktop layout
- Chat infrastructure
- System detail pages (SystemPlanView)
- TopHeader / critical badge behavior
- Capital timeline types
- LifecycleRing component

## Files Summary

| File | Action |
|------|--------|
| `src/components/mobile/SystemLedger.tsx` | Modify -- life-remaining mini-bar + tappable rows + chevron |
| `src/components/mobile/MissingDocumentation.tsx` | Modify -- calm boost labels on buttons |
| `src/components/mobile/ChatInsightBanner.tsx` | Create -- proactive insight snippet |
| `src/components/mobile/PrimarySystemCard.tsx` | Modify -- contextual CTA button |
| `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` | Modify -- wire banner + CTA + spacing |

