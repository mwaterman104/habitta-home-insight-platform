
# Habitta Typography System V1 Implementation

## Current State Assessment

| Aspect | Current | Target |
|--------|---------|--------|
| Primary Typeface | Inter → IBM Plex Sans fallback | IBM Plex Sans (exclusive) |
| Secondary Typeface | Not configured | IBM Plex Serif (headers, system names) |
| Font Weights | 300-700 loaded | 400, 500, 600 only |
| Base Body Size | `clamp(0.875rem, ...)` (~14px) | 15px/22px (Desktop) |
| Letter-spacing | Not applied | +0.2px on labels/controls |

**Key Finding:** IBM Plex Serif is not currently loaded or configured—this is the biggest gap.

---

## Implementation Plan

### Phase 1: Foundation Setup

**File: `src/index.css`**

Replace font imports and set base typography variables:

| Change | Details |
|--------|---------|
| Remove Inter import | Inter is not in the typography spec |
| Add IBM Plex Serif | Load weights 500, 600 (no italics) |
| Adjust IBM Plex Sans weights | Remove 300, 700 (only 400, 500, 600) |
| Set base body | 15px with 1.47 line-height |

New import line:
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@500;600&display=swap');
```

New base layer:
```css
body {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.9375rem; /* 15px */
  line-height: 1.47; /* ~22px */
}
```

---

### Phase 2: Tailwind Configuration

**File: `tailwind.config.ts`**

Update `fontFamily` to include serif and lock the sans stack:

```typescript
fontFamily: {
  sans: ['IBM Plex Sans', 'sans-serif'],
  serif: ['IBM Plex Serif', 'serif'],
},
```

Add custom font-size utilities matching the type scale:

```typescript
fontSize: {
  // Headers (Serif)
  'h1': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '600' }],  // 28px/36px
  'h2': ['1.375rem', { lineHeight: '1.875rem', fontWeight: '500' }], // 22px/30px
  'h3': ['1.125rem', { lineHeight: '1.625rem', fontWeight: '500' }], // 18px/26px
  // Body (Sans)
  'body': ['0.9375rem', { lineHeight: '1.375rem' }],    // 15px/22px
  'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px/20px
  'meta': ['0.75rem', { lineHeight: '1rem' }],          // 12px/16px
  // Labels & Controls
  'label': ['0.8125rem', { lineHeight: '1rem', letterSpacing: '0.2px' }], // 13px
  // KPI
  'kpi': ['1.25rem', { lineHeight: '1.5rem', fontWeight: '600' }],  // 20px
  'kpi-lg': ['1.5rem', { lineHeight: '1.75rem', fontWeight: '600' }], // 24px
},
```

---

### Phase 3: Utility Classes

**File: `src/index.css`** (utilities layer)

Add semantic typography classes for consistent usage:

```css
@layer utilities {
  /* Serif headers - use sparingly */
  .heading-h1 {
    font-family: 'IBM Plex Serif', serif;
    font-size: 1.75rem;
    line-height: 2.25rem;
    font-weight: 600;
  }
  
  .heading-h2 {
    font-family: 'IBM Plex Serif', serif;
    font-size: 1.375rem;
    line-height: 1.875rem;
    font-weight: 500;
  }
  
  .heading-h3 {
    font-family: 'IBM Plex Serif', serif;
    font-size: 1.125rem;
    line-height: 1.625rem;
    font-weight: 500;
  }
  
  /* System names - serif emphasis */
  .system-name {
    font-family: 'IBM Plex Serif', serif;
    font-weight: 500;
  }
  
  /* Label/control text - with letter-spacing */
  .text-label {
    font-size: 0.8125rem;
    line-height: 1rem;
    font-weight: 500;
    letter-spacing: 0.2px;
  }
  
  /* KPI numbers - tabular if available */
  .text-kpi {
    font-size: 1.25rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
}
```

---

### Phase 4: Component Refactoring

Update key components to use the new typography system:

#### A. Section Headers → Serif

**Files to update:**
- `src/components/CapitalTimeline.tsx` — "Home Systems Timeline"
- `src/components/HomeHealthCard.tsx` — "Home Health Forecast"
- `src/components/SystemOptimizationSection.tsx` — Section headers
- `src/components/dashboard-v3/TopHeader.tsx` — "Habitta" brand (consider serif)
- `src/pages/SystemsHub.tsx` — Page title, section headers

Example change:
```tsx
// Before
<CardTitle className="text-lg font-semibold">Home Systems Timeline</CardTitle>

// After
<CardTitle className="heading-h3">Home Systems Timeline</CardTitle>
```

#### B. System Names → Serif

**Files to update:**
- `src/components/SystemStatusCard.tsx` — `{systemName}`
- `src/components/SystemTimelineLane.tsx` — System labels
- `src/pages/SystemsHub.tsx` — System card titles

Example change:
```tsx
// Before
<h3 className="font-semibold text-gray-900">{systemName}</h3>

// After
<h3 className="system-name text-gray-900">{systemName}</h3>
```

#### C. Labels & Controls → Letter-spacing

**Files to update:**
- `src/components/ui/button.tsx` — Add `tracking-[0.2px]`
- Badge/tab components — Use `text-label` class

Example change:
```tsx
// Before (button.tsx)
"text-sm font-medium"

// After
"text-[0.8125rem] font-medium tracking-[0.2px]"
```

#### D. KPI Numbers → Tabular

**Files to update:**
- `src/components/HomeHealthCard.tsx` — Score display (85 → 72)
- Any numeric displays using large numbers

Example change:
```tsx
// Before
<span className="text-5xl font-bold">{currentScore}</span>

// After
<span className="text-[3rem] font-semibold tabular-nums">{currentScore}</span>
```

---

### Phase 5: Mobile Scale Adjustment

Add responsive overrides in `src/index.css`:

```css
@media (max-width: 768px) {
  body {
    font-size: 0.875rem; /* 14px min body */
    line-height: 1.5;
  }
  
  .heading-h1 { font-size: 1.5rem; line-height: 2rem; }
  .heading-h2 { font-size: 1.25rem; line-height: 1.75rem; }
  .heading-h3 { font-size: 1rem; line-height: 1.5rem; }
}
```

---

## Files Summary

| File | Action | Scope |
|------|--------|-------|
| `src/index.css` | Modify | Font imports, base styles, utility classes, mobile scale |
| `tailwind.config.ts` | Modify | Font families, font-size scale |
| `src/components/ui/button.tsx` | Modify | Letter-spacing for controls |
| `src/components/CapitalTimeline.tsx` | Modify | Serif header |
| `src/components/HomeHealthCard.tsx` | Modify | Serif header, KPI tabular nums |
| `src/components/SystemStatusCard.tsx` | Modify | Serif system name |
| `src/components/SystemOptimizationSection.tsx` | Modify | Serif section header |
| `src/components/dashboard-v3/TopHeader.tsx` | Modify | Brand treatment |
| `src/pages/SystemsHub.tsx` | Modify | Page title, section headers, system names |

---

## Technical Notes

### What Gets Removed
- Inter font family (entire stack)
- Font weights 300 and 700
- `font-inter` Tailwind class
- Existing `clamp()` responsive sizing (replaced with explicit mobile media query)

### Case Rules Applied
- Sentence case everywhere
- Title case only for: System names (HVAC, Roof), Forecast section headers, Major summaries

### Principles Enforced
- No playful typography
- No trendy type treatments
- Calm > clever
- Trust > excitement

---

## Visual Before/After

| Element | Before | After |
|---------|--------|-------|
| Section Headers | `text-lg font-semibold` (Sans) | `heading-h3` (Serif 500) |
| System Names | `font-semibold` (Sans) | `system-name` (Serif 500) |
| KPI Score | `text-5xl font-bold` | `text-kpi-lg tabular-nums` |
| Buttons | `text-sm font-medium` | `text-label tracking-[0.2px]` |
| Body Copy | Inter 14-15px | IBM Plex Sans 400, 15px |
