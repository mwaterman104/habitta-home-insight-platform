

# Manual Appliance Entry Implementation Plan

## Overview

This plan adds a **secondary manual entry affordance** to TeachHabittaModal. Following the QA principle: "Photo-first, manual-second" — manual entry exists for agency, not as the primary path.

---

## Architecture Decision: Reuse Correction UI

Manual entry will **NOT** create a new form. It will:
1. Route directly to the existing `correction` step
2. Set `install_source: 'owner_reported'` 
3. Apply appropriate confidence initialization

This preserves:
- Narrative flow
- AI-led posture
- Approximate, forgiving UX
- Existing confidence-aware logic

---

## Changes to TeachHabittaModal.tsx

### 1. Add Manual Entry Link to Capture Step

**Location:** `renderCaptureStep()` (lines 436-520)

Add a muted, text-only secondary affordance below the photo buttons:

```text
┌─────────────────────────────────────────────┐
│    Teach Habitta something new              │
│                                             │
│    Take a photo or upload an image...       │
│                                             │
│    [ Take photo ]    [ Upload ]             │
│                                             │
│             [Cancel]                        │
│                                             │
│    ─────────────────────                    │
│              or                             │
│                                             │
│       Enter details manually →              │
│                                             │
└─────────────────────────────────────────────┘
```

**Design Rules:**
- "Enter details manually →" is text-only (no button styling)
- Smaller font (`text-sm`)
- Muted color (`text-muted-foreground`)
- No icon
- Clearly secondary

### 2. Add State for Manual Entry Mode

Add a new state variable to track whether user entered via manual path:

```typescript
const [isManualEntry, setIsManualEntry] = useState(false);
```

Reset it in the `useEffect` that clears state on modal close.

### 3. Create handleManualEntry Function

```typescript
const handleManualEntry = () => {
  setIsManualEntry(true);
  setStep('correction');
};
```

This routes directly to the correction step without photo/analysis.

### 4. Update renderCorrectionStep Header for Manual Entry

When `isManualEntry` is true, show a gentler intro:

```text
That's totally fine.
Rough answers are more than enough.
```

When `isManualEntry` is false (came from photo), show existing:

```text
Just help me get closer.
Rough answers are totally fine.
```

### 5. Create handleSaveManualEntry Function

New handler for manual entry saves with appropriate confidence initialization:

```typescript
const handleSaveManualEntry = async () => {
  if (!selectedSystemType) {
    setError('Please select what kind of system this is');
    return;
  }
  
  setIsProcessing(true);
  try {
    // Calculate manufacture year from age range (midpoint)
    const manufactureYear = selectedAgeRange !== null && selectedAgeRange !== undefined
      ? new Date().getFullYear() - selectedAgeRange
      : undefined;
    
    // Manual entry confidence (higher baseline than vision-only)
    let confidence = 0.65; // owner-reported baseline
    if (brandInput) confidence += 0.10;
    if (selectedAgeRange !== null && selectedAgeRange !== undefined) confidence += 0.10;
    confidence = Math.min(confidence, 0.9);
    
    const systemData: Partial<HomeSystem> = {
      system_key: selectedSystemType,
      brand: brandInput || undefined,
      model: modelInput || undefined,
      manufacture_year: manufactureYear,
      confidence_scores: {
        overall: confidence,
      },
      data_sources: ['owner_manual'],
      source: {
        method: 'manual',
        entered_at: new Date().toISOString(),
        install_source: 'owner_reported', // Critical: user authority
      },
    };
    
    const result = await addSystem(systemData);
    if (result) {
      onSystemAdded?.(result as HomeSystem);
      setStep('success');
    }
  } catch (err) {
    console.error('Error saving system:', err);
    setError('Failed to save. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};
```

### 6. Update Save Button in Correction Step

The Save button should call `handleSaveManualEntry` when `isManualEntry` is true, otherwise `handleSaveCorrection`:

```typescript
<Button
  className="flex-1"
  onClick={isManualEntry ? handleSaveManualEntry : handleSaveCorrection}
  disabled={isProcessing || !selectedSystemType}
>
  ...
</Button>
```

### 7. Desktop Support: Add Manual Entry to QRPhotoSession View

For desktop users who see the QR code flow, add the same secondary affordance:

```tsx
{/* In desktop renderCaptureStep, after QRPhotoSession */}
<div className="text-center pt-4 border-t border-border">
  <span className="text-xs text-muted-foreground">or</span>
  <button
    onClick={handleManualEntry}
    className="block w-full text-sm text-muted-foreground hover:text-foreground mt-2"
  >
    Enter details manually →
  </button>
</div>
```

---

## Confidence Initialization Logic

| Entry Method | Base Confidence | Boosts |
|--------------|----------------|--------|
| Vision + Correction | 0.30 | +0.25 type, +0.15 brand, +0.15 age |
| Manual Entry | **0.65** | +0.10 brand, +0.10 age |

**Why higher baseline for manual?**
- User is stating what they know directly
- This is "owner_reported" authority
- Should not look "worse" than vision guesses

**Cap remains 0.9** — we never claim certainty without permit/inspection verification.

---

## UI After Manual Save

The appliance appears as:

```
LG Refrigerator
Model not identified
~10–15 years old
```

With:
- No "Needs confirmation" label (baseline is 0.65+)
- Possibly "Estimated" if only category provided
- "Help Habitta learn more" CTA still available for later photo enhancement

---

## Edge Case Handling

### User enters only category (no brand, no age)

**Result:**
- Appliance is tracked
- Tier applied correctly
- No nagging
- Confidence: 0.65 (baseline owner_reported)

### User later uploads a photo

**Behavior:**
- Photo enhances the same appliance (not a duplicate)
- Can increase confidence
- Never replaces user-reported data without confirmation

---

## Copy Rules (Locked)

**Use:**
- "Enter details manually"
- "That's totally fine"
- "Rough answers are more than enough"
- "You can update this anytime"

**Avoid:**
- "Add appliance"
- "Complete setup"
- "Required fields"
- "Accuracy"

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/TeachHabittaModal.tsx` | Add manual entry affordance, `isManualEntry` state, `handleManualEntry`, `handleSaveManualEntry`, update correction step header, update desktop QR view |

**No new files needed** — we're reusing what's already built.

---

## Summary of Changes

1. **New state:** `isManualEntry` boolean
2. **New handler:** `handleManualEntry()` — routes to correction step
3. **New handler:** `handleSaveManualEntry()` — saves with 0.65 baseline confidence
4. **Updated UI:** Secondary "Enter details manually →" link in capture step (mobile + desktop)
5. **Updated copy:** Context-aware header in correction step based on entry method

This preserves:
- Photo-first narrative
- AI-led posture
- Forgiving, approximate UX
- Coherent confidence system
- No form fatigue

