

## Add Habitta Greeting Module to Mobile Home Pulse Dashboard

### What This Does
Adds the Habitta-generated greeting message as a tappable card module on the mobile Home Pulse dashboard, positioned between the Home Profile Record bar and the Systems Health Timeline (matching the mockup). Tapping the card navigates to the `/chat` page to continue the conversation.

### Visual Design (from mockup)
- A rounded card with a subtle background (stone/warm tone)
- Small home icon on the left
- The greeting text from the Habitta greeting engine displayed as body copy
- Tapping the entire card opens `/chat` with the greeting as the initial assistant message

### Implementation

#### 1. New Component: `HabittaGreetingCard`
**File:** `src/components/dashboard-v3/mobile/HabittaGreetingCard.tsx`

A simple card that:
- Receives the greeting text as a prop
- Renders a home icon + the greeting message in a tappable card
- Calls an `onTap` callback when pressed

#### 2. Update `MobileDashboardView`
**File:** `src/components/dashboard-v3/mobile/MobileDashboardView.tsx`

- Add new props: `greetingText` (string) and `onGreetingTap` (callback)
- Insert the `HabittaGreetingCard` between the Data Confidence Bar and Systems Health Timeline sections

#### 3. Wire Up in `DashboardV3`
**File:** `src/pages/DashboardV3.tsx`

- Generate the greeting using `generateHabittaBlurb` + `buildGreetingContext` (already imported by ChatConsole, same engine)
- Pass the greeting text and a tap handler to `MobileDashboardView`
- The tap handler navigates to `/chat` with the greeting as `initialAssistantMessage` in the intent

### Technical Details

```text
MobileDashboardView props (new):
  greetingText?: string
  onGreetingTap?: () => void

DashboardV3 mobile section:
  - Compute greeting via buildGreetingContext + generateHabittaBlurb
  - Pass result.text to MobileDashboardView
  - onGreetingTap -> navigate('/chat', { state: { intent: { initialAssistantMessage: greetingText } } })

HabittaGreetingCard layout:
  <div onClick={onTap} className="bg-stone-50 rounded-2xl p-4 flex gap-3 cursor-pointer active:bg-stone-100">
    <Home icon (teal circle)>
    <p className="text-sm text-foreground leading-relaxed">{text}</p>
  </div>
```

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/dashboard-v3/mobile/HabittaGreetingCard.tsx` | **New** - Tappable greeting card component |
| `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` | Add `greetingText` and `onGreetingTap` props; render card between confidence bar and systems timeline |
| `src/pages/DashboardV3.tsx` | Generate greeting using existing engine; pass to MobileDashboardView; wire tap to `/chat` navigation |

