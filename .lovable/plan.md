

# Mobile Dashboard Redesign: Mockup Replication

## Overview

Replace the current "activity feed" mobile dashboard with a **record + confidence surface** that matches the provided mockup. This transforms four existing sections (LifecycleRing hero, SinceLastMonth, RecommendationCards, horizontal SystemTileScroll) into four new ones: Data Confidence Bar, Primary System Card, System Ledger, and Missing Documentation.

## Design Tokens

Add Habitta-specific color and typography tokens to `tailwind.config.ts`:

- **Colors**: `habitta-ivory` (#F9F7F2), `habitta-charcoal` (#2D2D2D), `habitta-stone` (#8C8A84), `habitta-slate` (#5A7684), `habitta-clay` (#A66D5B), `habitta-olive` (#747D63)
- **Typography**: `tracking-tightest` (-0.02em), `border-3` (3px)
- Keep existing `font-sans` (IBM Plex Sans) -- do not add Inter, as it conflicts with the established type system

## New Components (4 files)

### 1. `src/components/mobile/DataConfidenceBar.tsx`
- Accepts `HomeConfidenceResult` (score, state, nextGain)
- Renders: "Data Confidence" heading, state badge with percentage (e.g., "Low (34%)"), teal Radix Progress bar, helper text from `nextGain` (e.g., "Requires 2 documents for Moderate confidence")
- Uses `habitta-slate` for progress bar fill, `habitta-ivory` background
- State badge maps: solid -> olive, developing -> slate, unclear -> clay, at-risk -> stone

### 2. `src/components/mobile/PrimarySystemCard.tsx` (rewrite)
- Accepts the top-scored `SystemTimelineEntry` from `selectPrimarySystem()`
- Layout: Icon (left) + content (right) in a bordered card
- Content hierarchy:
  - System name (bold, large)
  - Status line: lifecycle status derived from `getRemainingYearsForSystem()` and `getLateLifeState()` with year range
  - Description: material/lifecycle context from system data
  - Muted footer: Source line (`installSource` + year) and Confidence level (`dataQuality`) with colored dot
- Border color: `habitta-clay/40` for aging/late-life systems, `habitta-stone/20` for stable
- Icon map: water_heater -> Droplets, hvac -> Wind, roof -> Home, electrical -> Zap, plumbing -> Wrench (all `strokeWidth={1.5}`)

### 3. `src/components/mobile/SystemLedger.tsx` (new)
- Accepts secondary `SystemTimelineEntry[]` (all scored systems except primary)
- Table-like layout with header row: "System Ledger" | "Next Service / Confidence"
- Each row: System name | "Est. {earlyYear}-{lateYear}" + Confidence level + colored dot
- Consistent `py-4` row height, `border-b border-habitta-stone/10` dividers
- Confidence dots: olive (high), slate (medium), clay (low)
- Footer note about estimates being based on available records

### 4. `src/components/mobile/MissingDocumentation.tsx` (new)
- Accepts `nextGain` from `HomeConfidenceResult` and callbacks for upload actions
- Heading: "Missing Documentation"
- Helper text: evidence-first framing tied to `nextGain.action`
- Two buttons: "Upload Doc" (slate) and "Upload Photo" (stone) -- functional, not expressive
- Buttons trigger chat context with appropriate upload intent (via `useChatContext`)

## Modified Files

### 5. `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` (rewrite)
- Remove imports: `HomeConfidenceHero`, `SinceLastMonth`, `RecommendationCards`, `SystemTileScroll`
- Add imports: `DataConfidenceBar`, `PrimarySystemCard`, `SystemLedger`, `MissingDocumentation`
- New layout order (top to bottom):
  1. `DataConfidenceBar` -- from `homeConfidence`
  2. `PrimarySystemCard` -- from `primary` (via `selectPrimarySystem`)
  3. `SystemLedger` -- from remaining `scored` systems (index 1+)
  4. `MissingDocumentation` -- from `homeConfidence.nextGain`
- Keep: priority scoring logic, reduced-motion support, empty state, analytics tracking
- Props interface simplified: remove `recommendations`, `onDismissRecommendation`, `onRecommendationAction` (no longer needed)

### 6. `src/components/dashboard-v3/TopHeader.tsx` (update condensed mode)
- When `condensed=true`: show "Habitta" (not "Home Pulse") with home icon
- Add "Last Updated" line below the address (muted, smaller text)
- Use `habitta-ivory` background tone for mobile header

### 7. `src/pages/DashboardV3.tsx` (minor prop cleanup)
- Remove `recommendations`, `onDismissRecommendation`, `onRecommendationAction` props from the `MobileDashboardView` call (lines 528-537)
- The recommendation data and handlers remain in DashboardV3 for potential future use but are no longer passed to the mobile view

### 8. `tailwind.config.ts`
- Add `habitta` color palette under `extend.colors`
- Add `tracking-tightest` under `extend.letterSpacing`
- Add `border-3` under `extend.borderWidth`

## Data Flow (unchanged)

All new components consume pre-computed data from existing services:
- `selectPrimarySystem()` determines primary vs. secondary systems
- `HomeConfidenceResult` provides score, state, nextGain
- `SystemTimelineEntry` provides replacement windows, install source, data quality
- `getRemainingYearsForSystem()` and `getLateLifeState()` derive lifecycle status
- No new hooks, no new API calls, no new edge functions

## What Does NOT Change

- Desktop layout (3-column, unaffected)
- BottomNavigation component
- Confidence computation engine (`homeConfidence.ts`)
- Priority scoring service (`priorityScoring.ts`)
- Capital timeline types and data contracts
- Chat integration (MobileChatSheet stays as-is)
- Existing mobile components remain in codebase (HomeConfidenceHero, SinceLastMonth, etc.) -- just no longer imported by the dashboard

