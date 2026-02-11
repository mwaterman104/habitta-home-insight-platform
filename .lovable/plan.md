

# Post-Onboarding Welcome Hero Card

## Overview

Add a first-visit-only Welcome Hero Card at the top of the mobile dashboard that bridges the emotional gap between onboarding ("You're under watch") and the operational dashboard. Appears once, dismisses permanently.

## Changes

### 1. `src/lib/mobileCopy.ts` -- Add WELCOME_HERO copy

New export:

```
WELCOME_HERO: {
  title: "Your home is under watch.",
  subtitle: (systemCount: number) => 
    `We're monitoring ${systemCount} ${systemCount === 1 ? 'system' : 'systems'} based on public records and what you've shared.`,
  reinforcement: "The more records you add, the more precise your forecasts become.",
  cta: "See what we found",
  dismiss: "Got it",
}
```

### 2. `src/components/mobile/WelcomeHeroCard.tsx` (new file)

Exact visual spec from user feedback:

- Container: `rounded-xl p-6 bg-primary/5 border border-primary/15 shadow-sm`
- Shield icon: 28px, `text-primary`, inside a 40px `bg-primary/10 rounded-full` circle
- Title: `text-lg font-semibold tracking-tight` -- "Your home is under watch."
- Subtitle: `text-sm text-muted-foreground leading-relaxed` with bold system count
- Reinforcement line: separate paragraph, same styling
- Primary CTA: `Button` variant default, rounded-lg
- Secondary: text link `text-sm text-muted-foreground hover:underline` -- "Got it"
- Spacing: 16px icon-to-subtitle, 20px subtitle-to-buttons, 12px between buttons, 24px margin-bottom
- Animation: fade-in + slide-in-from-top-2 on mount, fade-out + slide-out-to-top-2 on dismiss (300ms), then unmount
- Props: `systemCount`, `onExplore`, `onDismiss`
- No gradient. No emoji. No playful tone.

### 3. `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` -- Render welcome card

- New props: `isFirstVisit?: boolean`, `onWelcomeDismiss?: () => void`
- Import `WelcomeHeroCard`
- Track local dismissed state via `useState` (initialized from `localStorage.getItem('habitta_welcome_dismissed')`)
- Render above DataConfidenceBar when `isFirstVisit && !dismissed`
- `onExplore`: scroll to PrimarySystemCard using a ref (`primarySystemRef`)
- `onDismiss`: set localStorage flag, call `onWelcomeDismiss`, trigger fade-out animation
- Add `ref={primarySystemRef}` to the PrimarySystemCard wrapper div

### 4. `src/pages/DashboardV3.tsx` -- Pass first-visit state

- Import `isFirstVisit`, `markFirstVisitComplete` from `chatModeCopy.ts`
- Pass `isFirstVisit={isFirstVisit()}` to `MobileDashboardView`
- Pass `onWelcomeDismiss={() => markFirstVisitComplete()}` to synchronize with chat system (single state, no drift)

## State Synchronization

Uses `isFirstVisit()` as the primary gate (same as chat system). When hero dismisses, it calls `markFirstVisitComplete()` AND sets `habitta_welcome_dismissed` in localStorage. This means:

- Hero dismissed -> first visit marked complete -> chat also knows
- No divergence between hero and chat first-visit states

## No auto-open chat

Per user feedback: do NOT auto-open chat. Let the user initiate. The welcome card provides orientation without being pushy.

## Files Summary

| File | Action |
|------|--------|
| `src/lib/mobileCopy.ts` | Modify -- add WELCOME_HERO copy |
| `src/components/mobile/WelcomeHeroCard.tsx` | Create -- welcome hero card component |
| `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` | Modify -- render welcome card, add ref for scroll |
| `src/pages/DashboardV3.tsx` | Modify -- pass isFirstVisit and onWelcomeDismiss |
