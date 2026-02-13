
## Add Tooltip to HomeProfileRecordBar for Next Score-Building Action

### Context
The `HomeProfileRecordBar` component displays the home's record strength (0-100 score and strength level: Limited/Moderate/Established/Strong). The underlying `HomeConfidenceResult` (from `homeConfidence.ts`) already computes a `nextGain` field that contains:
- `action`: A user-friendly description of the highest-priority action to improve the score (e.g., "Upload a photo of your HVAC")
- `delta`: The potential point increase (e.g., 4 points)
- `systemKey`: The system affected (optional, e.g., "hvac")

This tooltip will expose that computed recommendation directly at the record bar, making it immediately discoverable.

### Design

**Tooltip Position & Trigger**
- Add a help icon (`HelpCircle` from `lucide-react`) next to the "Home Profile Record" title
- Hover or click the icon to reveal the tooltip (via Radix `Tooltip` + `TooltipTrigger` + `TooltipContent`)
- Place the tooltip above or to the side to avoid covering the progress bar

**Tooltip Content**
- If `nextGain` is available: Show the action and point delta (e.g., "Upload a photo of your HVAC (+4 points)")
- If `nextGain` is null (record is complete): Show "Your home profile record is complete"

**Styling**
- Reuse the existing `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip`
- Place the help icon inline with the title, styled subtly (inherit text color, opacity-60, hover:opacity-100)
- Icon size: 16-18px to match the text size

### Implementation Details

**File: `src/components/home-profile/HomeProfileRecordBar.tsx`**

1. Import the required components:
   - `HelpCircle` from `lucide-react`
   - `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip`

2. Add a new prop to `HomeProfileRecordBarProps`:
   - `nextGain?: HomeConfidenceResult['nextGain'] | null` (optional, to support existing use cases where `nextGain` is not available)

3. Update the JSX to wrap the title area in a tooltip:
   - Keep the existing "Home Profile Record" h2
   - Add an inline help icon wrapped in `TooltipTrigger`
   - Add `TooltipContent` showing the action and delta, or the completion message
   - Wrap the entire section in `TooltipProvider` (with a reasonable `delayDuration`, e.g., 300ms)

4. Style the icon:
   - Inherit text color from parent
   - Use opacity-60, hover:opacity-100 for visual feedback
   - Cursor: help

**Files that Pass `nextGain` to HomeProfileRecordBar**

The following components will need to pass the `nextGain` prop:
- `src/components/dashboard-v3/MiddleColumn.tsx` (line ~402) – has access to `confidence` from `useHomeConfidence`
- `src/components/chat/ContextualChatPanel.tsx` (line ~56) – has access to `confidence`
- `src/pages/HomeSnapshotPage.tsx` (line ~100) – has access to `confidence`

These components already have the `confidence` object from `useHomeConfidence`, so they can simply pass `nextGain={confidence?.nextGain}` to `HomeProfileRecordBar`.

### Data Flow

```
useHomeConfidence hook
  ↓
computeHomeConfidence (src/services/homeConfidence.ts)
  ↓
HomeConfidenceResult { score, state, nextGain, ... }
  ↓
Passed to HomeProfileRecordBar as prop
  ↓
Rendered in tooltip on hover/focus
```

### Edge Cases

1. **nextGain is null**: Display "Your home profile record is complete"
2. **nextGain is undefined (older consumers)**: Show nothing or a default message (optional – can be left blank)
3. **Compact mode**: The icon and tooltip will still appear, but the font size will be smaller to match the compact title (text-sm instead of text-body)
4. **Mobile**: Tooltips work on touch by triggering on focus; Radix handles this automatically

### Files to Modify

| File | Change |
|------|--------|
| `src/components/home-profile/HomeProfileRecordBar.tsx` | Add tooltip trigger icon and `nextGain` prop; render tooltip content |
| `src/components/dashboard-v3/MiddleColumn.tsx` | Pass `nextGain={confidence?.nextGain}` to `HomeProfileRecordBar` |
| `src/components/chat/ContextualChatPanel.tsx` | Pass `nextGain={confidence?.nextGain}` to `HomeProfileRecordBar` |
| `src/pages/HomeSnapshotPage.tsx` | Pass `nextGain={confidence?.nextGain}` to `HomeProfileRecordBar` |

### Implementation Sequence

1. Update `HomeProfileRecordBar` component with tooltip and new prop
2. Update all three consuming components to pass the `nextGain` prop
3. Test on desktop (hover) and mobile (tap) to ensure tooltip triggers correctly
4. Verify compact mode appearance in chat panel context

