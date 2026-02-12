

## Home Profile Record: Final Implementation Plan

Three corrections applied from feedback: clean quartile thresholds, softened "limited" messaging, and snapshot architected as durable component.

---

### Part 1: HomeProfileRecordBar (Shared Component)

**New: `src/components/home-profile/HomeProfileRecordBar.tsx`**

Exports:
- `getStrengthLevel(score)` -- pure function, clean quartile bands:
  - 0-24: `limited`
  - 25-49: `moderate`
  - 50-79: `established`
  - 80+: `strong`
- `HomeProfileRecordBar` component

Visual spec:
- Label: "Home Profile Record"
- Badge: `{strengthLevel} ({strengthScore}%)`
- Track background: `bg-habitta-stone/15`
- Track fill: `bg-habitta-slate` (#5A7684)
- Height: `h-2.5`, `rounded-sm`
- No danger colors ever

---

### Part 2: State Labels in homeConfidence.ts

**Update: `src/services/homeConfidence.ts`**

Replace `ConfidenceState` type and `STATE_MAP`:

Old: `solid | developing | unclear | at-risk`
New: `strong | established | moderate | limited`

Clean quartile thresholds (matching Part 1):
- score >= 80: `strong` -- "Most systems are understood and tracked"
- score >= 50: `established` -- "Key gaps exist, but nothing critical is hidden"
- score >= 25: `moderate` -- "Several systems lack documentation"
- score >= 0: `limited` -- "Core system documentation is still being established"

Note the softened "limited" message. No alarm. No "major systems lack basic information."

**Update: `src/components/mobile/DataConfidenceBar.tsx`**
- Rename header from "Data Confidence" to "Home Profile Record"
- Update `STATE_BADGE_COLORS` and `STATE_LABELS` to new state names
- Colors: strong -> olive, established -> slate, moderate -> stone, limited -> clay

**Update: `src/components/mobile/HomeConfidenceHero.tsx`**
- Update `STATE_COLORS` and `STATE_DOT_CLASSES` to new state names

**Update: `src/lib/mobileCopy.ts`**
- Update `HOME_CONFIDENCE_COPY.states` keys to new state names

---

### Part 3: HomeSnapshotPage (Durable Component)

**New: `src/pages/HomeSnapshotPage.tsx`**

Route: `/home-snapshot`

Architected as a **durable, re-viewable component** -- not a throwaway onboarding artifact. The page renders the same way whether accessed post-onboarding or revisited later from settings.

Layout: Centered, max-w-2xl, generous whitespace

Sections:
1. **Header**: "Your Home Profile Record has been created." / "We established an initial baseline using public records and regional lifecycle data."
2. **Summary**: `HomeProfileRecordBar` with current strength score + "Strength increases as documentation is confirmed."
3. **Breakdown** (provenance-based):
   - **"What's Confirmed"**: Only truly confirmed facts -- address, year built (if from public record), climate zone, number of identified systems
   - **"What We're Estimating"**: System service windows, lifecycle model type, inferred install years -- clearly framed as estimates
   - **"What Strengthens the Record"**: Missing install dates count, missing photos count, missing permits. CTA: "Improve Record Strength"
4. **CTA**: "Go to Home Pulse" button

On CTA click: `localStorage.setItem('habitta_has_seen_snapshot', 'true')` then `navigate('/dashboard', { replace: true })`

When revisited from settings, the CTA text changes to "Back to Home Pulse" (checks localStorage flag).

Data: Uses `useHomeConfidence` + `useCapitalTimeline` + `useUserHome`

**Update: `src/pages/AppRoutes.tsx`**
- Add protected route `/home-snapshot` -> `HomeSnapshotPage`

**Update: `src/pages/SettingsPage.tsx`**
- Add a "View Home Snapshot" link in the home/profile section that navigates to `/home-snapshot`

---

### Part 4: Redirect Logic (Single Gate)

**Update: `src/pages/DashboardV3.tsx`**

After `userHome` loads, single redirect check:

```text
if (userHome.id && !localStorage.getItem('habitta_has_seen_snapshot')) {
  navigate('/home-snapshot', { replace: true });
  return loading spinner;
}
```

Dashboard is the ONE gate. `OnboardingFlow.tsx` continues navigating to `/dashboard` as-is. No double routing.

---

### Part 5: Remove Duplicate BaselineSurface from Chat

**Update: `src/components/dashboard-v3/ChatConsole.tsx`**

Remove:
- Lines 501-549: The pinned BaselineSurface block (AI avatar + artifact header + collapsible surface)
- Lines 722-737: The expanded Dialog/modal for BaselineSurface
- Dead state: `isBaselineCollapsed`, `isBaselineExpanded`

Keep: `baselineSystems` prop still received and passed to AI context for tool calls. Only visual rendering removed.

---

### Part 6: HomeProfileRecordBar in ContextualChatPanel Only

**Update: `src/components/chat/ContextualChatPanel.tsx`**

Add props: `strengthScore?: number`, `strengthLevel?: string`

Render `HomeProfileRecordBar` between the header (line 44-49) and the chat content (line 52), with compact padding (`px-4 py-2 border-b border-border/20`).

Only renders when `strengthScore` is provided.

RecordBar does NOT appear in the middle column ChatConsole. Only in the triggered ContextualChatPanel.

**Update: `src/layouts/DashboardV3Layout.tsx`**

Pass confidence data to `ContextualChatPanel`. Add `useCapitalTimeline` and `useHomeConfidence` hooks to the layout (it already has `userHome` with `homeId`).

---

### Part 7: Terminology Updates (User-Facing Only)

| Location | Old Copy | New Copy |
|----------|----------|----------|
| `DataConfidenceBar.tsx` header | "Data Confidence" | "Home Profile Record" |
| `HomeHealthCard.tsx` | "Data confidence" | "Record strength" |
| `recommendationEngine.ts` | "data confidence" | "record strength" |
| `OnboardingSnapshot.tsx` | "Data Confidence" | "Home Profile Record Strength" |
| `OnboardingPersonalization.tsx` | "Data Confidence" | "Home Profile Record Strength" |
| System-level labels | "Low confidence" | "Install year unverified" or "Partially verified" |

Rules:
- Record-level: "Record Strength"
- Provenance: "Verified" / "Unverified"
- Model outputs: "Estimate" and "Range"
- Internal code variable names unchanged

---

### Files Summary

| File | Action |
|------|--------|
| `src/components/home-profile/HomeProfileRecordBar.tsx` | Create |
| `src/pages/HomeSnapshotPage.tsx` | Create |
| `src/services/homeConfidence.ts` | Update states + thresholds |
| `src/components/mobile/DataConfidenceBar.tsx` | Rename + update states |
| `src/components/mobile/HomeConfidenceHero.tsx` | Update state keys |
| `src/lib/mobileCopy.ts` | Update state copy keys |
| `src/components/dashboard-v3/ChatConsole.tsx` | Remove pinned BaselineSurface |
| `src/components/chat/ContextualChatPanel.tsx` | Add RecordBar |
| `src/layouts/DashboardV3Layout.tsx` | Pass confidence data |
| `src/pages/DashboardV3.tsx` | Add snapshot redirect gate |
| `src/pages/AppRoutes.tsx` | Add /home-snapshot route |
| `src/pages/SettingsPage.tsx` | Add "View Home Snapshot" link |
| `src/components/HomeHealthCard.tsx` | Rename label |
| `src/services/recommendationEngine.ts` | Rename copy |
| `src/pages/OnboardingSnapshot.tsx` | Rename labels |
| `src/pages/OnboardingPersonalization.tsx` | Rename labels |

### What Does NOT Change

- Internal type/variable names
- Scoring computation logic (only state labels and thresholds)
- Right column HomeSystemsPanel
- Mobile layout structure (only copy changes)
- Database schema
- OnboardingFlow navigation target
- BaselineSystems data feed to AI context

