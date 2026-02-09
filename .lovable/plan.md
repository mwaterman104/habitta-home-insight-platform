

# Mobile Dashboard Tightening + Dead Code Unification

## Overview

Two goals: (1) remove the redundant dashboard implementations that create confusion and maintenance burden, and (2) tighten the canonical `MobileDashboardView` to feel polished and native.

All user feedback has been incorporated. No scope changes — just sharper execution.

---

## Part 1: Dead Code Removal

Three files serve the same purpose as `DashboardV3` but are never reached by users:

| File | Status | Action |
|------|--------|--------|
| `src/pages/Dashboard.tsx` | Imported in AppRoutes line 9 but mounted on zero routes | Delete, remove import |
| `src/pages/HomePulsePage.tsx` | Only imported by the dead `Dashboard.tsx` | Delete |
| `client/pages/Dashboard.tsx` | Legacy `client/` directory, not part of `src/` app | Delete |

**Verification completed**:
- Global search confirms no other file imports `HomePulsePage` or the dead `Dashboard`
- No test directories exist (no Playwright/snapshot risk)
- No string-based route references to these files
- `DashboardV3` at `/dashboard` is the sole canonical dashboard

**In `src/pages/AppRoutes.tsx`**: Remove the `Dashboard` import (line 9). No route references it.

---

## Part 2: MobileDashboardView Visual Polish

All changes stay within existing component files. No new files, no new dependencies.

### 2a. Staggered Fade-In Entrance

**File**: `src/components/dashboard-v3/mobile/MobileDashboardView.tsx`

Wrap each section in a `div` with Tailwind `animate-fade-in` plus staggered inline `animationDelay` styles:

- Summary: no delay (immediate)
- Primary card: 75ms delay
- Secondary list: 150ms delay
- Chat launcher: 225ms delay

**Reduced-motion guardrail**: Wrap animations in a `prefers-reduced-motion` check. The project already has precedent for this pattern in `VideoBackground.tsx` (line 15). Use the same `window.matchMedia` approach — when reduced motion is preferred, skip the animation classes entirely (no delays, no fades, just instant render).

### 2b. PrimarySystemFocusCard Status-Aware Border Accent

**File**: `src/components/dashboard-v3/mobile/PrimarySystemFocusCard.tsx`

Add a `border-l-[3px]` to the Card based on planning status:

- `stable`: `border-l-slate-300`
- `watch`: `border-l-amber-400`
- `plan`: `border-l-orange-500`
- `aging`: `border-l-orange-500` (softened from orange-600 per feedback — keeps urgency without panic)

For `aging` only: add a subtle warm background tint via `bg-orange-50/40` (dark mode: `dark:bg-orange-950/20`) to pair with the border. This differentiates aging from plan without aggressive color.

### 2c. SecondarySystemsList Status Dot

**File**: `src/components/dashboard-v3/mobile/SecondarySystemsList.tsx`

Add a 6px colored dot (`rounded-full`) before each system name:

- `stable`: `bg-slate-300`
- `watch`: `bg-amber-400`
- `plan`: `bg-orange-500`
- `aging`: `bg-orange-500`

The dots are purely decorative indicators. They have no click handlers, no hover states, no aria roles beyond presentation. If that ever changes, redesign.

### 2d. Data Freshness Indicator

**File**: `src/components/dashboard-v3/mobile/HomeStatusSummary.tsx`

Add a line below the "Home Status" header:

```
Updated today
```

Display as `text-xs text-muted-foreground/60`. Use relative phrasing only — never exact timestamps on mobile:

- Same day: "Updated today"
- Yesterday: "Updated yesterday"
- Older: "Updated N days ago"

For now, use current render time as baseline. Add a code comment: `// TODO: Wire to actual data refresh timestamp when available`.

### 2e. Empty/Sparse State Improvement

**File**: `src/components/dashboard-v3/mobile/MobileDashboardView.tsx`

When `systems` is empty, replace the current minimal state with a first-use framing card:

- Icon: `Home` from lucide-react (already imported in project)
- Headline: "Your home systems are being analyzed"
- Subtext: "We're building your capital outlook. This usually takes a few moments."
- No CTA button, no fake progress bar, no "Set a reminder"

This matches the credibility stewardship doctrine: silence beats speculation.

---

## Technical Details

### Files Changed

| File | Changes | Risk |
|------|---------|------|
| `src/pages/Dashboard.tsx` | Delete | Zero |
| `src/pages/HomePulsePage.tsx` | Delete | Zero |
| `client/pages/Dashboard.tsx` | Delete | Zero |
| `src/pages/AppRoutes.tsx` | Remove unused `Dashboard` import (line 9) | Zero |
| `MobileDashboardView.tsx` | Staggered fade-in with reduced-motion check, improved empty state | Low |
| `PrimarySystemFocusCard.tsx` | Status-aware left border accent with aging background tint | Zero |
| `SecondarySystemsList.tsx` | Status dot before system name | Zero |
| `HomeStatusSummary.tsx` | Relative freshness timestamp | Zero |

No new files. No new dependencies. No data layer changes.

### Testing Checklist

1. Navigate to `/dashboard` on mobile — sections fade in with staggered timing
2. Enable "Reduce motion" in OS settings — all animations are skipped, content renders instantly
3. Primary card shows colored left border matching system status
4. Aging-status card shows subtle warm background tint
5. Secondary list items show colored dots before system names
6. "Updated today" appears below "Home Status" header
7. Empty state (no systems) shows the first-use framing card, not blank space
8. Desktop layout at `/dashboard` is completely unaffected
9. No console errors from removed files (no remaining imports reference them)
10. All legacy routes (`/home`, `/home/v2`, etc.) still redirect to `/dashboard`

