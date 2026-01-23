

# Teach Habitta Something New — Hardened Implementation Plan

This plan implements the collaborative, AI-led modal flow with all 5 guardrails explicitly locked in.

---

## Summary

| Component | Description | Files |
|-----------|-------------|-------|
| TeachHabittaModal | 5-step collaborative flow with AI-led interpretation | New component |
| Confidence State System | 3-state model with visual certainty minimum | systemConfidence.ts enhancements |
| Entry Points | Right column affordance + Systems Hub FAB | RightColumn.tsx, SystemsHub.tsx |
| Edge Function Enhancement | Richer analysis with Habitta messaging | analyze-device-photo/index.ts |

---

## 5 Guardrails (Locked)

### Guardrail 1: High Confidence Requires Either User Confirmation OR Strong Visual Certainty

**Rule**: The `high` confidence state is protected. Vision-only analysis cannot reach `high` without additional validation.

**Implementation** (in edge function + client):

```typescript
function computeConfidenceState(
  visualCertainty: number,
  userConfirmed: boolean
): ConfidenceState {
  // User confirmation always grants high
  if (userConfirmed) return 'high';
  
  // Vision-only requires strong certainty for high
  if (visualCertainty >= 0.75) return 'high';
  if (visualCertainty >= 0.40) return 'estimated';
  return 'needs_confirmation';
}
```

**Visual certainty calculation** (in edge function):
```typescript
const visualCertainty = (
  (confidence_scores.brand ?? 0) * 0.25 +
  (confidence_scores.model ?? 0) * 0.25 +
  (confidence_scores.system_type ?? 0) * 0.35 +
  (confidence_scores.serial ? 0.15 : 0)
);
```

**Effect**: A system with only a serial number but weak visual detection cannot accidentally reach `high`.

---

### Guardrail 2: Explicit "AI Unsure" Branch in Interpretation Step

**Rule**: When the AI cannot confidently interpret the image, the modal gracefully falls back to collaboration, not error.

**Trigger conditions**:
- `visualCertainty < 0.30`
- No `system_type` detected
- OCR returns minimal text

**UI behavior**:

```text
┌──────────────────────────────────────────┐
│ ✨ Teach Habitta something new           │
│                                          │
│ I'm not totally sure what this is yet —  │
│ can you help me out?                     │
│                                          │
│ [ System type pills: HVAC, Roof, ... ]   │
│ [ Optional: Brand, Model, Install Year ] │
│                                          │
│ ──────────────────────────────────────   │
│ Skip details             Save            │
└──────────────────────────────────────────┘
```

**Copy (locked)**:
- Uncertain interpretation: "I'm not totally sure what this is yet — can you help me out?"
- Skip option always available: "Skip details" (quiet secondary)
- No error styling, no red states

**Implementation**:
- Add `isUncertain` boolean to analysis response
- If `isUncertain === true`, skip interpretation step and go directly to correction step (framed as collaboration)

---

### Guardrail 3: User Confirmation Raises Confidence But Does Not Make It Immutable

**Rule**: Confirmation upgrades confidence immediately, but future contradictory evidence can reduce it with explanation.

**Implementation**:

1. **On "Yes, that's right"**:
   - Set `install_source = 'owner_reported'`
   - Bump confidence to minimum 0.60 (owner_reported baseline)
   - Record `user_confirmed_at` timestamp in `systems` table

2. **Future contradiction handling** (in intelligence engine):
   ```typescript
   // If permit shows different install year
   if (permitYear && Math.abs(permitYear - userReportedYear) > 2) {
     // Do NOT silently downgrade
     // Instead, flag for user attention
     confidenceState = 'estimated';
     needsUserAttention = true;
     attentionMessage = "I noticed something that may affect how I'm tracking your roof.";
   }
   ```

3. **Never reduce confidence silently**: Any downgrade triggers a HabittaThinking card or notification

---

### Guardrail 4: Floating "+" Button Z-Index Explicitly Defined

**Rule**: The FAB sits above ChatDock content, below modals.

**Z-index hierarchy** (locked):
| Layer | Z-Index | Purpose |
|-------|---------|---------|
| Modals/Sheets | z-50 | Already defined in sheet.tsx and dialog.tsx |
| Floating Action Button | z-30 | Above ChatDock, below modals |
| ChatDock (in-flow) | None | Not fixed, no z-index needed |
| Bottom Navigation (mobile) | z-20 | Standard nav layer |

**Implementation** in `SystemsHub.tsx`:
```tsx
<Button
  onClick={() => setShowTeachModal(true)}
  className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-30"
  size="icon"
>
  <Plus className="h-6 w-6" />
</Button>
```

**Note**: ChatDock is now a sticky in-flow element (not fixed), so there's no z-index collision. The FAB at z-30 clears any future bottom nav (z-20) while remaining below modals (z-50).

---

### Guardrail 5: Modal State Is Ephemeral and Never Auto-Reopens

**Rule**: Modal state is local to the component instance. Navigation resets it.

**Implementation**:

1. **State lives in parent component** (DashboardV3 or SystemsHub):
   ```typescript
   const [showTeachModal, setShowTeachModal] = useState(false);
   ```

2. **No URL state**: Do not persist `?modal=teach` in URL
3. **No localStorage**: Do not persist modal open state
4. **On navigation**: React unmounts component, state is lost (correct behavior)
5. **On cancel/close**: State resets to `capture` step for next open

**Implementation in modal**:
```typescript
// Reset internal step state when modal closes
useEffect(() => {
  if (!open) {
    setStep('capture');
    setCapturedPhoto(null);
    setAnalysis(null);
  }
}, [open]);
```

---

## File Changes

### 1. New Component: TeachHabittaModal

**File**: `src/components/TeachHabittaModal.tsx`

**Step state machine**:
```typescript
type ModalStep = 
  | 'capture'        // Initial: take/upload photo
  | 'analyzing'      // Loading: "Looking closely..."
  | 'interpretation' // AI result: "This looks like a Roof"
  | 'correction'     // User editing: system type, brand, year
  | 'success';       // Done: "Added. I'll start tracking this."
```

**Props**:
```typescript
interface TeachHabittaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: string;
  onSystemAdded?: (system: HomeSystem) => void;
}
```

**Key behaviors**:
- Uses `ActionSheet` wrapper (Dialog on desktop, Sheet on mobile)
- If AI is uncertain, skips interpretation and goes to correction (collaborative framing)
- "Skip details" always available
- No progress indicators

---

### 2. Edge Function Enhancement

**File**: `supabase/functions/analyze-device-photo/index.ts`

**New response fields**:
```typescript
interface AnalysisResponse {
  success: boolean;
  analysis: {
    // Existing
    brand?: string;
    model?: string;
    serial?: string;
    system_type?: string;
    manufacture_year?: number;
    confidence_scores: { ... };
    raw_ocr_text: string;
    
    // New (locked)
    visual_certainty: number;         // 0-1 composite
    is_uncertain: boolean;            // true if visual_certainty < 0.30
    habitta_message: string;          // "This looks like a Roof."
    habitta_detail?: string;          // "Asphalt shingles, likely installed..."
    confidence_state: ConfidenceState; // 'estimated' | 'needs_confirmation'
  };
}
```

**Visual certainty calculation** (added to `analyzeDeviceText`):
```typescript
const visualCertainty = (
  (result.confidence_scores.brand ?? 0) * 0.25 +
  (result.confidence_scores.model ?? 0) * 0.25 +
  (result.confidence_scores.system_type ?? 0) * 0.35 +
  (result.confidence_scores.serial ? 0.15 : 0)
);

result.visual_certainty = visualCertainty;
result.is_uncertain = visualCertainty < 0.30 || !result.system_type;
result.confidence_state = visualCertainty >= 0.40 ? 'estimated' : 'needs_confirmation';
```

**Habitta message generation**:
```typescript
if (result.is_uncertain) {
  result.habitta_message = "I'm not totally sure what this is yet.";
} else {
  const systemName = SYSTEM_DISPLAY_NAMES[result.system_type] || 'system';
  result.habitta_message = `This looks like a ${systemName}.`;
  
  if (result.manufacture_year) {
    result.habitta_detail = `Likely installed around ${result.manufacture_year}.`;
  } else if (result.brand) {
    result.habitta_detail = `${result.brand} brand detected.`;
  }
}
```

---

### 3. Confidence Module Enhancement

**File**: `src/lib/systemConfidence.ts`

**New type** (coexists with existing `ConfidenceLevel`):
```typescript
export type ConfidenceState = 'high' | 'estimated' | 'needs_confirmation';
```

**New function**:
```typescript
export function confidenceStateFromScore(
  score: number,
  userConfirmed: boolean = false
): ConfidenceState {
  if (userConfirmed) return 'high';
  if (score >= 0.75) return 'high';
  if (score >= 0.40) return 'estimated';
  return 'needs_confirmation';
}
```

**State label helper**:
```typescript
export function getConfidenceStateLabel(state: ConfidenceState): string | null {
  switch (state) {
    case 'high': return null; // Silent for high (critical)
    case 'estimated': return 'Estimated';
    case 'needs_confirmation': return 'Needs confirmation';
  }
}
```

---

### 4. Entry Point: RightColumn

**File**: `src/components/dashboard-v3/RightColumn.tsx`

**Add affordance card** (after Local Factors):
```tsx
{/* Add System Affordance */}
<Card className="rounded-xl">
  <CardContent className="py-3">
    <button
      onClick={() => setShowTeachModal(true)}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
    >
      <Plus className="h-4 w-4" />
      <div className="text-left">
        <span className="block font-medium">Add a system or appliance</span>
        <span className="text-xs">Help Habitta track something new</span>
      </div>
    </button>
  </CardContent>
</Card>
```

**Props addition**:
```typescript
interface RightColumnProps {
  // Existing...
  homeId?: string;
  onSystemAdded?: () => void;
}
```

---

### 5. Entry Point: SystemsHub

**File**: `src/pages/SystemsHub.tsx`

**Add floating action button**:
```tsx
const [showTeachModal, setShowTeachModal] = useState(false);

// In render, after the grid:
<Button
  onClick={() => setShowTeachModal(true)}
  className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-30"
  size="icon"
  aria-label="Add system"
>
  <Plus className="h-6 w-6" />
</Button>

<TeachHabittaModal
  open={showTeachModal}
  onOpenChange={setShowTeachModal}
  homeId={userHome?.id || ''}
  onSystemAdded={() => refetch()}
/>
```

---

### 6. New Component: ConfidenceStateLabel

**File**: `src/components/ConfidenceStateLabel.tsx`

Minimal inline label for system names:
```tsx
interface ConfidenceStateLabelProps {
  state: ConfidenceState;
  className?: string;
}

export function ConfidenceStateLabel({ state, className }: ConfidenceStateLabelProps) {
  const label = getConfidenceStateLabel(state);
  
  // High confidence is silent
  if (!label) return null;
  
  return (
    <span className={cn("text-xs text-muted-foreground lowercase", className)}>
      · {label}
    </span>
  );
}
```

**Usage**: `Roof · Estimated` or `Water Heater · Needs confirmation`

---

## Modal Copy (Locked)

| Step | Title/Header | Body |
|------|--------------|------|
| Capture | "Teach Habitta something new" | "Take a photo or upload an image of a system or appliance you want Habitta to track." |
| Analyzing | — | "Looking closely..." |
| Interpretation (confident) | — | "{habitta_message} {habitta_detail}" + "Does this look right?" |
| Interpretation (uncertain) | — | "I'm not totally sure what this is yet — can you help me out?" |
| Correction | "Just help me get closer" | "Rough answers are fine." |
| Success | — | "Added. I'll start tracking this and include it in your home's outlook." + "You can update this anytime." |

---

## Integration Rules (Non-Negotiable)

| Rule | Enforcement |
|------|-------------|
| Never proactive warnings | No "We're missing appliances" anywhere |
| Never block core flows | "Skip details" and "Cancel" always available |
| Immediate visibility | System appears in Timeline/Hub on close (no toast) |
| High confidence is silent | `getConfidenceStateLabel('high')` returns `null` |
| Modal state is ephemeral | No URL params, no localStorage, resets on close |
| Confidence reductions explained | Any downgrade triggers HabittaThinking attention |

---

## Implementation Order

1. **Phase 1: Modal Core**
   - Create `TeachHabittaModal.tsx` with step state machine
   - Implement capture step (reuse `MobilePhotoCapture` patterns)
   - Wire to existing `analyzePhoto` in `useHomeSystems`

2. **Phase 2: Edge Function Enhancement**
   - Add `visual_certainty`, `is_uncertain`, `habitta_message` to response
   - Deploy and test with curl

3. **Phase 3: AI Interpretation**
   - Build interpretation step with "Yes, that's right" / "Not quite"
   - Handle uncertain branch → correction step

4. **Phase 4: Entry Points**
   - Add RightColumn affordance
   - Add SystemsHub floating button (z-30)

5. **Phase 5: Confidence State Integration**
   - Add `ConfidenceState` type and helpers to `systemConfidence.ts`
   - Create `ConfidenceStateLabel` component
   - Update timeline components

---

## Post-Implementation Checklist

1. **High confidence protected**: Vision-only analysis with weak certainty cannot reach `high`
2. **Uncertain branch works**: Low-confidence images go to correction, not error
3. **Confirmation upgrades**: "Yes, that's right" bumps to `owner_reported` (0.60+)
4. **FAB clears bottom nav**: z-30 above nav, below modals
5. **Modal resets on close**: Cancel, navigate away, reopen → starts at capture
6. **No proactive nags**: Search codebase for "missing" or "improve accuracy" — none found

