

## Fix: Roof-Specific Photo Copy + Onboarding Priority Tuning

### Problem 1: "Photo of the label" makes no sense for a Roof

The greeting engine in `src/lib/chatGreetings.ts` has system-agnostic copy across Guardian and Builder templates. Lines like:

- *"A quick photo of the label would help me narrow down a cost estimate"* (Guardian, line 140)
- *"Snapping a photo of your [system] label would add +X points"* (Builder, line 162)
- *"a photo of the manufacturer label would make this record verified"* (Builder, line 167)

These work for HVAC and Water Heater (which have manufacturer labels), but **roofs have no label**. The correct ask is a photo of the house showing the roof.

**Fix**: Add system-aware photo copy that detects when the system is `Roof` and swaps to appropriate language.

### Problem 2: Builder (onboarding/profile-building) strategy never fires

The user's profile is at 23% (Limited) with a clear `nextGain` available -- this is exactly the Builder strategy's target. However, the **Guardian strategy has higher priority** (Priority 2 vs Priority 4), and because the Roof is in its planning window, Guardian always wins. The user never sees the profile-building nudge.

**Fix**: When the profile is Limited (under 25%), the Builder strategy should be elevated to fire alongside or instead of Guardian, since building the record is the most productive action the user can take at this stage. We'll blend the two: if Guardian fires AND the profile is Limited, the greeting should include a record-strength nudge.

### Changes

#### `src/lib/chatGreetings.ts`

1. **Add a helper function** `getPhotoAsk(systemName)` that returns system-appropriate photo copy:
   - For "Roof": `"a photo of your house with as much roof showing as possible"`
   - For all others: `"a photo of the manufacturer label on your [system]"`

2. **Update Guardian templates** (lines 137-150) to use the helper instead of hardcoded "label" language.

3. **Update Builder templates** (lines 158-173) to use the helper for the same reason.

4. **Add a record-strength blended nudge**: When the Guardian strategy fires AND `strengthScore < 25`, append a one-liner about profile building to the Guardian greeting (e.g., "Your home record is at 23% -- adding details would sharpen all my estimates."). This ensures the onboarding mission isn't lost when Guardian takes priority.

5. **Update Builder starters** (line 221): Change `'Where is the label?'` to `'How do I add details?'` to be system-agnostic.

### Technical Details

```text
Helper function:
  getPhotoAsk("Roof") -> "a photo of your house with as much roof visible as possible"
  getPhotoAsk("HVAC") -> "a photo of the manufacturer label on your HVAC"
  getPhotoAsk("Water Heater") -> "a photo of the manufacturer label on your Water Heater"

Guardian template (line 140) before:
  "A quick photo of the label would help me narrow down a cost estimate for you."
After:
  "A quick ${getPhotoAsk(system)} would help me narrow down a cost estimate for you."

Guardian blended nudge (new, when strengthScore < 25):
  Append: " Your home record is at ${ctx.strengthScore}%—adding a few details would sharpen all my estimates."

Builder template (line 162) before:
  "Snapping a photo of your ${systemKey} label would add +${delta} points"
After:
  "Snapping ${getPhotoAsk(systemKey)} would add +${delta} points"
```

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/chatGreetings.ts` | Add `getPhotoAsk()` helper; update Guardian + Builder templates for system-aware copy; blend record-strength nudge into Guardian when profile is Limited; update Builder starters |
