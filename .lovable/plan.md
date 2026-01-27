
# Habitta Dashboard Evolution — "Selective Intelligence" Upgrade
## Final Implementation Plan with QC Refinements

---

## Executive Summary

This plan evolves the dashboard into a visually compelling "Home Intelligence" experience with all 5 QC refinements integrated:

1. **Visual Hierarchy Tiering** — Explicit weight levels for hero stack
2. **Equity Volatility Controls** — Slow refresh cadence, "Current position" label
3. **Language Layer Variation** — Reduce "later-stage lifecycle" repetition
4. **Card Cap Enforcement** — Hard limit: 2 hero + 1 analytical + 1 context + chat
5. **Specificity Cascade Rule** — Lower surfaces cannot exceed upper surface detail

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/dashboardGovernance.ts` | **Create** | Centralized layout caps + specificity rules (QC #4, #5) |
| `src/components/dashboard-v3/HomePositionAnchor.tsx` | **Create** | Primary hero - lifecycle position |
| `src/components/dashboard-v3/EquityContextCard.tsx` | **Create** | Secondary hero - value context (QC #2 controls) |
| `src/components/dashboard-v3/LifecycleHorizon.tsx` | **Create** | Analytical surface - replaces SystemTimelineLifecycle |
| `src/components/dashboard-v3/PropertyMap.tsx` | **Modify** | Add intelligence overlays, click-to-context |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Modify** | Card grid layout with visual tiering (QC #1) |
| `src/components/dashboard-v3/RightColumn.tsx` | **Modify** | Enhanced map + intelligence integration |
| `src/components/dashboard-v3/index.ts` | **Modify** | Export new components |
| `src/lib/dashboardRecoveryCopy.ts` | **Modify** | Layer-varied copy (QC #3) |

---

## Part 1: Dashboard Governance Module (QC #4, #5)

**File:** `src/lib/dashboardGovernance.ts` (Create)

### Purpose
Centralized enforcement of layout caps and specificity cascade rules.

```text
DASHBOARD COMPONENT CAP (QC #4)
================================
Maximum components per dashboard:
- Hero cards: 2
- Analytical surfaces: 1  
- Expandable context: 1
- Chat: 1

SPECIFICITY CASCADE RULE (QC #5)
=================================
No lower surface may introduce more specificity than the layer above.

Layer Order (top to bottom):
1. Status Header (least specific: one sentence)
2. Hero Cards (position + value context)  
3. Analytical Surface (system-level detail)
4. Context Drawer (expanded rationale)
5. Chat (exploratory)

Prohibited:
- Analytical surface showing costs (Context Drawer level)
- Hero cards showing system breakdowns (Analytical level)
```

---

## Part 2: Visual Hierarchy Tiering (QC #1)

### Weight Assignments

| Component | Visual Weight | Tailwind Treatment |
|-----------|---------------|-------------------|
| Status Header | **Quiet** | `text-lg font-medium` (no card, no border) |
| HomePositionAnchor | **Primary Hero** | `py-6 px-6` padding, larger bar, prominent label |
| EquityContextCard | **Secondary Hero** | `py-4 px-5` padding, smaller text, muted treatment |
| LifecycleHorizon | **Analytical** | `bg-muted/10` subtle background, compact rows |
| ContextDrawer | **Expandable** | Collapsed by default, no visual weight until opened |
| ChatDock | **Ambient** | Sticky, minimal presence until engaged |

### Implementation in MiddleColumn

```text
Layout Structure:
================================

┌─────────────────────────────────────────────────────────────┐
│  TODAY'S STATUS (quiet header - no card)                    │
│  Nothing requires attention right now.                      │
└─────────────────────────────────────────────────────────────┘
                              ↓ space-y-6

┌───────────────────────────────┐  ┌───────────────────────────┐
│  HOME POSITION                │  │  EQUITY CONTEXT           │
│  ════════●════════════        │  │  $650,000                 │
│  Mid-Life                     │  │  Context: +3.8% area YoY  │
│                               │  │                           │
│  (PRIMARY HERO - larger)      │  │  (SECONDARY HERO - muted) │
└───────────────────────────────┘  └───────────────────────────┘
                              ↓ space-y-4 (tighter)

┌─────────────────────────────────────────────────────────────┐
│  LIFECYCLE HORIZON (analytical - subtle bg)                 │
│  HVAC          ═══════●═══════         Mid-Life             │
│  Water Heater  ═══════════●═══         Later range          │
│  Roof          ═══●═══════════         Typical for age      │
└─────────────────────────────────────────────────────────────┘
                              ↓ space-y-4

┌─────────────────────────────────────────────────────────────┐
│  WHY THIS ASSESSMENT  [Expand]  (collapsed - no weight)     │
└─────────────────────────────────────────────────────────────┘
                              ↓ sticky

┌─────────────────────────────────────────────────────────────┐
│  💬 What would you like to understand better?  (ambient)    │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 3: HomePositionAnchor Component

**File:** `src/components/dashboard-v3/HomePositionAnchor.tsx` (Create)

### Key Design Choices

- **Visual:** Larger bar (h-3), prominent label (text-xl), generous padding
- **No numbers:** Position marker only, no percentages
- **One outlook line:** Observational, no action verbs
- **Climate badge:** Inline with outlook
- **Confidence:** Text only, muted

### Structure

```text
┌──────────────────────────────────────────────────────────────┐
│  HOME POSITION                                               │
│                                                              │
│  Mid-Life                               (text-xl font-medium)│
│                                                              │
│  ════════════════●════════════════════                       │
│   Early        Mid-Life           Late                       │
│                                                              │
│  Systems aging within expected ranges                        │
│                                                              │
│  Climate: High heat    Confidence: High                      │
└──────────────────────────────────────────────────────────────┘
```

---

## Part 4: EquityContextCard Component (QC #2)

**File:** `src/components/dashboard-v3/EquityContextCard.tsx` (Create)

### Volatility Controls (QC #2)

1. **Slow refresh:** Value only updates monthly (cached timestamp check)
2. **"Current position" label:** Anchors as observation, not ticker
3. **No delta highlighting:** Area context in plain text, no +/- badges
4. **Muted visual weight:** Secondary to position anchor

### Structure

```text
┌──────────────────────────────────────────────────────────────┐
│  EQUITY CONTEXT                                              │
│                                                              │
│  Current Position                         (muted subheader)  │
│  $650,000                                 (text-2xl)         │
│                                                              │
│  Similar homes in your area have appreciated                 │
│  moderately over the past 12 months.      (no specific %)    │
│                                                              │
│  [View market context]                    (optional link)    │
└──────────────────────────────────────────────────────────────┘
```

### What's Explicitly Removed (Doctrine)
- "What If" toggle
- "If you complete X, value increases by Y"
- Percentage badges
- Refresh-on-every-visit

---

## Part 5: LifecycleHorizon Component

**File:** `src/components/dashboard-v3/LifecycleHorizon.tsx` (Create)

### Differences from SystemTimelineLifecycle

| SystemTimelineLifecycle | LifecycleHorizon |
|-------------------------|------------------|
| Individual expandable cards | Compact single table |
| Card border per system | Subtle row separators |
| "View full details →" link | Click row for context |
| White background | `bg-muted/10` analytical tone |

### Layer-Varied Copy (QC #3)

| Position | Copy |
|----------|------|
| Early | "Typical for age" |
| Mid-Life | "Within expected range" |
| Late | "Later range" ← NOT "Later-stage lifecycle" |

### Structure

```text
┌─────────────────────────────────────────────────────────────┐
│  LIFECYCLE HORIZON                         (section header) │
│  Relative position within expected ranges  (subtext)        │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ HVAC           ═══════●═══════           Mid-Life       ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ Water Heater   ═══════════●═══           Later range    ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ Roof           ═══●═══════════           Typical for age││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Part 6: Layer-Varied Copy Updates (QC #3)

**File:** `src/lib/dashboardRecoveryCopy.ts` (Modify)

### New Copy Variations by Layer

| Layer | Copy Variation | Replaces |
|-------|----------------|----------|
| Status Header | "in a later stage" | - |
| Position Anchor | "Later in expected range" | "Later-stage lifecycle" |
| Lifecycle Horizon | "Later range" | "Later-stage lifecycle" |
| Context Drawer | "later lifecycle stage" | - |
| Advisor Messages | "worth understanding better" | - |

### Function Update: `getLifecycleNoteForHorizon()`

```typescript
export function getLifecycleNoteForHorizon(positionScore: number): string {
  if (positionScore < 0.4) return 'Typical for age';
  if (positionScore < 0.6) return 'Within expected range';
  if (positionScore < 0.75) return 'Mid-to-late range';
  return 'Later range';  // NOT "Later-stage lifecycle"
}
```

---

## Part 7: PropertyMap Intelligence Overlays

**File:** `src/components/dashboard-v3/PropertyMap.tsx` (Modify)

### New Features

1. **Comparable Homes Count:** Badge showing nearby similar homes
2. **Permit Activity Indicator:** "Normal" or "Elevated" text badge
3. **Click-to-Context:** Clicking map opens ContextDrawer (not pre-filled prompts)

### Overlay Structure

```text
┌─────────────────────────────────────────────────┐
│                                                 │
│              [GOOGLE STATIC MAP]                │
│                                                 │
│  ┌─────────────────┐                            │
│  │ 12 comparable   │                            │
│  │ homes nearby    │                            │
│  └─────────────────┘                            │
│                                                 │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ 🌡️ High heat  │  │ Permit activity: Normal  │ │
│  └──────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Click Behavior Change

```typescript
// Before: No click handler
// After: Click opens context drawer
interface PropertyMapProps {
  // ...existing
  onMapClick?: () => void;  // Opens ContextDrawer
}
```

---

## Part 8: MiddleColumn Grid Refactor

**File:** `src/components/dashboard-v3/MiddleColumn.tsx` (Modify)

### Key Changes

1. **Hero Grid:** Two-column layout for Position + Equity
2. **Visual Weight Classes:** Applied per QC #1
3. **Tighter Spacing:** `space-y-4` between analytical surfaces
4. **Removed:** SystemsOverview (merged into LifecycleHorizon)

### Layout Code Structure

```typescript
{/* Status Header - QUIET */}
<section className="space-y-2">
  <HomeStatusHeader ... />
</section>

{/* Hero Grid - PRIMARY + SECONDARY */}
<section className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <HomePositionAnchor className="py-6 px-6" ... />  {/* PRIMARY */}
  <EquityContextCard className="py-4 px-5" ... />   {/* SECONDARY */}
</section>

{/* Analytical Surface - SUBDUED */}
<section className="bg-muted/10 rounded-xl p-4">
  <LifecycleHorizon ... />
</section>

{/* Context Drawer - COLLAPSED */}
<section>
  <ContextDrawer ... />
</section>

{/* Chat - AMBIENT */}
<div className="sticky bottom-4">
  <ChatDock ... />
</div>
```

---

## Part 9: RightColumn Enhancement

**File:** `src/components/dashboard-v3/RightColumn.tsx` (Modify)

### Changes

1. **Map Click Handler:** Pass `onMapClick` prop for context drawer integration
2. **Enhanced Intelligence Props:** Pass overlay data to PropertyMap
3. **LocalConditions:** Remains unchanged (already doctrine-compliant)

---

## Specificity Cascade Enforcement (QC #5)

### Layer Permissions Matrix

| Layer | Allowed Content | Prohibited |
|-------|-----------------|------------|
| Status Header | One sentence, overall state | System names, costs, dates |
| Hero Cards | Position label, value number | System breakdowns, percentages |
| Lifecycle Horizon | System names, position bars | Costs, dates, action buttons |
| Context Drawer | Rationale, confidence, sources | Recommendations, CTAs |
| Chat | Exploration | Auto-generated actions |

### Enforcement Mechanism

Add comment blocks in each component:

```typescript
/**
 * SPECIFICITY LEVEL: Hero (2)
 * 
 * ALLOWED: Position label, outlook statement, confidence text
 * PROHIBITED: System-level detail, costs, dates, action buttons
 * 
 * Cascade Rule: May not exceed Status Header specificity.
 * Must not show system breakdowns (that's Analytical level).
 */
```

---

## Implementation Order

1. **dashboardGovernance.ts** — Governance rules
2. **dashboardRecoveryCopy.ts** — Layer-varied copy functions
3. **HomePositionAnchor.tsx** — Primary hero
4. **EquityContextCard.tsx** — Secondary hero with volatility controls
5. **LifecycleHorizon.tsx** — Analytical surface
6. **PropertyMap.tsx** — Intelligence overlays
7. **MiddleColumn.tsx** — Grid layout integration
8. **RightColumn.tsx** — Map click integration
9. **index.ts** — Export updates

---

## Acceptance Criteria

### Doctrine Compliance
- [ ] No circular gauges, health meters, or percentage bars
- [ ] No "If you do X, Y improves" language
- [ ] No specific dates in timeline
- [ ] No task framing
- [ ] No urgency language
- [ ] All copy passes BANNED_DASHBOARD_PHRASES validation

### QC Refinements
- [ ] Visual weight explicitly tiered (quiet → primary → secondary → analytical)
- [ ] Equity context on slow refresh cadence (monthly)
- [ ] No "later-stage lifecycle" repetition (layer-varied copy)
- [ ] Dashboard capped at 2 hero + 1 analytical + 1 context + chat
- [ ] Specificity cascade rule enforced via component comments

### Visual Impact
- [ ] Card grid layout for hero section
- [ ] Position indicator prominently displayed
- [ ] Equity context visible without scrolling
- [ ] Lifecycle horizon shows all systems at a glance
- [ ] Map includes intelligence overlays

---

## Litmus Test

For every element, ask:
> "Does this make the homeowner feel calmer or busier?"

If the answer is "busier", it doesn't ship.
