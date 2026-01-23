
# Fit-and-Finish Implementation Plan

This plan tightens vertical spacing, simplifies copy, and elevates the Systems Timeline while respecting the three guardrails you've identified.

---

## Summary

| Change | Files | Risk Level |
|--------|-------|------------|
| Compress top stack spacing | MiddleColumn, SystemWatch, HomeHealthCard, HabittaThinking | Low |
| Shorten HabittaThinking copy + punctuation | HabittaThinking | Low |
| Add empty month reassurance | MaintenanceRoadmap | Low |
| Elevate Systems Timeline visual weight | CapitalTimeline | Low |

---

## Guardrails Applied

### Guardrail 1: HomeHealthCard Score Size
- **Current**: Primary score uses `text-5xl`, projected uses `text-3xl`
- **Proposed**: `text-5xl` stays (no reduction for primary score), `text-3xl → text-2xl` for projected only
- **Why safe**: The primary score remains the largest text on the dashboard. Timeline headers are `text-lg`, nothing else exceeds `text-2xl`.

### Guardrail 2: HabittaThinking Punctuation
- **Proposed copy**: `Talk now — or keep an eye on it?` (em-dash for readability)
- **Inline vs line-break**: Move to same line (no `<br />`)
- **Will QA at**: 1280px, 1024px, iPad width to ensure no awkward wrapping

### Guardrail 3: SystemWatch Authority
- **Approach**: Reduce vertical padding (`py-4 → py-3`) but keep horizontal padding intact
- **Result**: SystemWatch retains `p-4` horizontal while HabittaThinking uses `py-3` with same horizontal, making SystemWatch feel slightly more substantial

---

## File Changes

### 1. MiddleColumn.tsx (line 261)

Reduce section spacing from `space-y-6` to `space-y-4`:

```tsx
// Before
<div className="space-y-6 max-w-3xl mx-auto px-4 py-6">

// After
<div className="space-y-4 max-w-3xl mx-auto px-4 py-6">
```

---

### 2. SystemWatch.tsx

Keep padding substantial (authority) but tighten internal gaps:

**Line 112, 145** (CardContent):
- Keep `p-4` (horizontal authority preserved)

**Line 113, 146** (flex gap):
```tsx
// Before
<div className="flex items-start gap-3">

// After
<div className="flex items-start gap-2.5">
```

**Lines 127, 168** (secondary text margin):
```tsx
// Before
<p className="text-sm text-muted-foreground mt-0.5">

// After (remove mt-0.5 for tighter coupling)
<p className="text-sm text-muted-foreground">
```

---

### 3. HomeHealthCard.tsx

Tighten card padding but **preserve primary score size**:

**Line 109** (CardContent):
```tsx
// Before
<CardContent className="p-6 space-y-4">

// After
<CardContent className="p-5 space-y-3">
```

**Line 135** (primary score — NO CHANGE, keeps anchor status):
```tsx
<span className={`text-5xl font-bold ${getCurrentScoreColor()}`}>
```

**Line 139** (projected score only):
```tsx
// Before
<span className="text-3xl font-semibold text-amber-600">

// After
<span className="text-2xl font-semibold text-amber-600">
```

**Line 151** (control subheadline):
```tsx
// Before
<p className="text-gray-700">

// After
<p className="text-sm text-gray-700">
```

---

### 4. HabittaThinking.tsx

Tighter layout, shorter copy, better punctuation:

**Line 150** (CardContent):
```tsx
// Before
<CardContent className="py-4">

// After
<CardContent className="py-3">
```

**Line 151** (flex gap):
```tsx
// Before
<div className="flex items-start gap-3">

// After
<div className="flex items-start gap-2.5">
```

**Lines 153-154** (icon sizing):
```tsx
// Before
<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
  <MessageCircle className="h-4 w-4 text-primary" />

// After
<div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
  <MessageCircle className="h-3.5 w-3.5 text-primary" />
```

**Lines 137-146** (getMessage function — simplify):
```tsx
// Before
const getMessage = () => {
  const years = primarySystem.remainingYears;
  if (years <= 2) {
    return `Your ${systemName} is approaching end of life.`;
  }
  if (years <= 5) {
    return `Your ${systemName} is entering a planning window.`;
  }
  return `Your ${systemName} may need attention in the coming years.`;
};

// After
const getMessage = () => {
  const years = primarySystem.remainingYears;
  if (years <= 2) {
    return `Your ${systemName} is approaching end of life.`;
  }
  return `Your ${systemName} is entering a planning window.`;
};
```

**Lines 162-168** (inline copy with em-dash, no line break):
```tsx
// Before
<p className="text-sm text-foreground mb-3">
  {getMessage()}
  <br />
  <span className="text-muted-foreground">
    Want to talk through options now, or keep an eye on it?
  </span>
</p>

// After
<p className="text-sm text-foreground mb-2.5">
  {getMessage()}{' '}
  <span className="text-muted-foreground">
    Talk now — or keep an eye on it?
  </span>
</p>
```

**Lines 180-187** (quieter dismiss button):
```tsx
// Before
<Button
  size="sm"
  variant="ghost"
  onClick={handleDismiss}
  className="text-xs text-muted-foreground"
>
  Not right now
</Button>

// After
<Button
  size="sm"
  variant="ghost"
  onClick={handleDismiss}
  className="text-xs text-muted-foreground/70 hover:text-muted-foreground"
>
  Later
</Button>
```

---

### 5. MaintenanceRoadmap.tsx (lines 312-315)

Add reassurance to empty months:

```tsx
// Before
<p className="text-sm text-muted-foreground italic py-2">
  No maintenance scheduled for this month
</p>

// After
<p className="text-sm text-muted-foreground italic py-2">
  No maintenance scheduled this month — you're on track.
</p>
```

---

### 6. CapitalTimeline.tsx

Elevate visual weight to feel like the "backbone":

**Line 36** (Card):
```tsx
// Before
<Card className="rounded-2xl">

// After
<Card className="rounded-2xl border-t-2 border-t-primary/20">
```

**Line 39** (CardTitle):
```tsx
// Before
<CardTitle className="text-lg">Home Systems Timeline</CardTitle>

// After
<CardTitle className="text-lg font-semibold">Home Systems Timeline</CardTitle>
```

---

## Post-Implementation QA Checklist

1. **8-10 Second Scan Test**: Can a first-time user identify the top system of concern, the health trajectory, and where to go next without scrolling?

2. **Score Hierarchy Check**: Confirm primary health score (`text-5xl`) is visually larger than any other number on the dashboard

3. **SystemWatch Authority Check**: Confirm SystemWatch feels more substantial than HabittaThinking

4. **HabittaThinking Wrapping Check**: Test at 1280px, 1024px, and iPad width — ensure em-dash prevents awkward line breaks

5. **Systems Timeline Visibility**: Confirm timeline is visible without scrolling on a standard laptop (1440×900)

---

## What This Does NOT Change

- ChatDock position or behavior
- Maintenance Roadmap horizontal model
- Map/local factors in right column
- Any architectural decisions
- Primary health score size (`text-5xl` preserved)
