

# Dashboard-to-Detail Intelligence Bridge (Sharpened)

## Overview

Four implementable items, incorporating all reviewer feedback on filter UX, subtitle placement, empty states, photo upload funneling, forecast tip rendering, icon consistency, and analytics.

## Changes

### 1. System Narrative Copy -- `src/lib/systemNarratives.ts` (new file)

A pure data module mapping each `CapitalSystemType` to its narrative identity, pro-tip, forecast tip, and confidence nudge.

```text
hvac:
  subtitle: "The Lungs of Your Home"
  proTip: "Replacing a clogged air filter can reduce energy costs by up to 15% and prevent a blower motor failure down the road."
  forecastTip: "HVAC replacements in Florida are best scheduled in spring or fall to avoid peak-season pricing."
  confidenceTip: "Upload a photo of the manufacturer label so I can pinpoint the exact maintenance schedule for this unit."

roof:
  subtitle: "The Shield"
  proTip: "Checking your flashings -- the metal seals around chimneys and vents -- once a year can prevent 90% of attic leaks before they stain your ceiling."
  forecastTip: "Keep an eye out for granule loss in your gutters after heavy rain. It's the first sign your roof's UV protection is thinning."
  confidenceTip: "Upload a photo of the shingles from the ground so I can assess the wear pattern."

water_heater:
  subtitle: "Your Hot Water Lifeline"
  proTip: "A 20-minute sediment flush can add up to 3 years of life by clearing mineral buildup from the tank bottom."
  forecastTip: "Inconsistent water temperature or rumbling sounds may indicate sediment is reducing heating efficiency."
  confidenceTip: "Upload a photo of the unit label so I can identify the exact model and maintenance needs."
```

Exports: `getSystemNarrative(systemId: string)` returning `{ subtitle, proTip, forecastTip, confidenceTip } | null`.

### 2. Habitta Intel Card -- `src/components/system/HabittaIntelCard.tsx` (new file)

A quiet annotation card for detail pages.

- Props: `systemId: string`, `isLateLife?: boolean`
- Imports `getSystemNarrative` from `systemNarratives.ts`
- Renders `Lightbulb` icon (16px, habitta-slate) + "Habitta Intel" uppercase meta header
- Body: always shows `proTip`
- Conditionally appends `forecastTip` when `isLateLife` is true (addresses reviewer Q5 -- forecast tips render only for late-life systems, not buried unused)
- Background: `bg-habitta-slate/6 border border-habitta-slate/15 rounded-sm`
- Does not render if `getSystemNarrative` returns null

### 3. SystemPlanView Enhancements -- `src/components/system/SystemPlanView.tsx` (modify)

**A. Narrative subtitle in header (reviewer Q2 addressed):**
- Subtitle renders INSIDE the Intel card header, not under the system name
- This avoids competing with the confidence badge/status text in Section A
- The Intel card header becomes: "Your HVAC: The Lungs of Your Home" in muted italic

**B. Habitta Intel card placement:**
- New Section D between Timing Outlook and Confidence & Evidence
- Import `HabittaIntelCard` and render with `systemId` and `isLateLife` derived from `remainingYears <= 0`

**C. Contextual Chat Prompt (inline, conditional):**
- New sub-component `ContextualChatPrompt` rendered as Section F (after Confidence & Evidence, before Action Footer)
- Uses `MessageCircle` icon (16px -- unified with Intel card per reviewer note)
- Logic:
  - If `confidenceLevel !== 'high'`: show `confidenceTip` from narratives (explicitly mentions "upload a photo" -- addresses reviewer Q4)
  - Else if system is late-life (`remainingYears <= 0`): show replacement planning prompt
  - Else: nothing renders (silence is the feature)
- Tappable: calls `onChatExpand`
- Styled as inline text: `text-meta text-habitta-stone leading-relaxed` with subtle left border accent
- Fires `chat_prompt_tapped` analytics event on tap (reviewer suggestion)

**D. Analytics events:**
- Add `INTEL_CARD_VIEWED` and `CHAT_PROMPT_TAPPED` to `mobileEvents.ts`
- `HabittaIntelCard` fires `INTEL_CARD_VIEWED` on mount (via useEffect)
- `ContextualChatPrompt` fires `CHAT_PROMPT_TAPPED` on tap

**Updated section order:**
A. System Header (unchanged)
B. Cost Reality (unchanged)
C. Timing Outlook (unchanged)
D. Habitta Intel card (new -- includes narrative subtitle as card header)
E. Confidence & Evidence (unchanged)
F. Contextual Chat Prompt (new -- inline, conditional)
G. Action Footer (unchanged)

### 4. Chat Context Copy -- `src/lib/chatContextCopy.ts` (modify)

Add two new triggers to `getContextualAssistantMessage`:
- `system/confidence_boost`: "I see we're at {confidenceLabel} confidence for your {systemName}. A photo of the manufacturer label would help me pinpoint the exact maintenance schedule."
- `system/replacement_planning`: "Your {systemName} is in its replacement window. Would you like to walk through what a planned replacement looks like?"

Add corresponding entries to `buildSystemAutoMessage`:
- `confidence_boost`: "How can I improve the accuracy of my {systemName} record?"
- `replacement_planning`: "What does a planned replacement look like for my {systemName}?"

Note: `systemName` uses the friendly `systemLabel` from the timeline entry (e.g., "HVAC System"), not the raw key -- addresses reviewer's graceful naming concern.

### 5. Critical Badge as Filter

**`src/components/dashboard-v3/TopHeader.tsx` (modify):**
- New props: `onHealthBadgeClick?: () => void`, `filterActive?: boolean`
- Wrap the status badge in a `button` element
- When `filterActive` is true, add `ring-2 ring-habitta-slate/40` to the badge (specific visual indicator per reviewer)
- Badge only becomes tappable when `onHealthBadgeClick` is provided (desktop remains unchanged)

**`src/pages/DashboardV3.tsx` (modify):**
- New state: `const [systemFilter, setSystemFilter] = useState<'all' | 'attention'>('all')`
- Reset filter on navigation: add `useEffect` that resets to `'all'` when `location.pathname` changes (addresses reviewer Q1 -- filter resets on return from detail page)
- `onHealthBadgeClick` toggles filter: `setSystemFilter(prev => prev === 'all' ? 'attention' : 'all')`
- When filter is `'attention'`, pass only systems where `getLateLifeState(system) !== 'not-late'` to `MobileDashboardView`
- Pass `filterActive={systemFilter === 'attention'}` to `TopHeader`

**`src/components/dashboard-v3/mobile/MobileDashboardView.tsx` (modify):**
- New prop: `filterActive?: boolean`
- When `filterActive` is true and no systems match, show calm empty state:
  - "All systems are operating within expected ranges."
  - Below: a `button` styled as `text-habitta-slate text-meta font-semibold` reading "Show all systems" that calls a new `onClearFilter?: () => void` prop
  - This addresses reviewer Q3 -- explicit exit from filtered view

### 6. Analytics Events -- `src/lib/analytics/mobileEvents.ts` (modify)

Add three new events:
- `INTEL_CARD_VIEWED: 'mobile_intel_card_viewed'`
- `CHAT_PROMPT_TAPPED: 'mobile_chat_prompt_tapped'`
- `BADGE_FILTER_TOGGLED: 'mobile_badge_filter_toggled'`

These enable measurement of adoption before investing in backend sync (items 5-6 deferred).

## Reviewer Feedback Resolution Summary

| Concern | Resolution |
|---------|-----------|
| Q1: Filter persistence on nav | Reset to 'all' on pathname change via useEffect |
| Q2: Subtitle visual competition | Moved inside Intel card header, not system header |
| Q3: Filtered empty state exit | "Show all systems" button below empty message |
| Q4: Photo upload funnel clarity | confidenceTip copy explicitly says "upload a photo" |
| Q5: forecastTip not rendered | Rendered in Intel card conditionally for late-life systems |
| Icon sizing | Unified to 16px for both Intel card and chat prompt |
| Filter indicator | Specified: `ring-2 ring-habitta-slate/40` on active badge |
| System name handling | Uses `systemLabel` (friendly) not raw `systemId` |
| Analytics checkpoint | Three new events to measure feature adoption |

## Files Summary

| File | Action |
|------|--------|
| `src/lib/systemNarratives.ts` | Create -- narrative copy per system |
| `src/components/system/HabittaIntelCard.tsx` | Create -- pro-tip card with conditional forecast |
| `src/components/system/SystemPlanView.tsx` | Modify -- add Intel card, contextual chat prompt |
| `src/lib/chatContextCopy.ts` | Modify -- add confidence_boost + replacement_planning triggers |
| `src/components/dashboard-v3/TopHeader.tsx` | Modify -- make badge tappable with ring indicator |
| `src/pages/DashboardV3.tsx` | Modify -- add filter state with nav-reset |
| `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` | Modify -- accept filter props, show empty state with exit |
| `src/lib/analytics/mobileEvents.ts` | Modify -- add 3 new tracking events |

