

## Implementation Plan: SystemFocusDetail.tsx - "Investment Analysis" View

### Overview

Replace the tabbed `SystemPanel` (Overview/Evidence/Timeline) with a single-scroll "Investment Analysis" detail view that transforms the `SystemTimelineEntry` data into a narrative-driven financial breakdown. This shifts the UX from technical documentation to financial advisory.

### Architecture

The component tree will be:
```
RightColumnSurface (focus.type === 'system')
  ├── HomeSystemsPanel (collapsed header)
  └── SystemFocusDetail (new component)
```

The zone (status) calculation logic already exists in `SystemsHealthTimeline.tsx` and must be extracted into a shared utility to maintain consistency across all system visualizations.

### New Files

#### 1. `src/components/dashboard-v3/panels/SystemFocusDetail.tsx`

A vertically stacked card layout with 6 sections, consuming `SystemTimelineEntry` directly:

**Section 1: Header Navigation**
- Back button (ArrowLeft icon, calls `goBack()`)
- System name (bold, `text-xl`)
- "Investment Analysis" subtitle (muted, uppercase, `tracking-widest`)
- Status badge aligned right (OK/WATCH/PLAN NOW with color/pulse logic)

**Section 2: Primary Financial Metric Card**
- Dark anchor card: `bg-stone-900 text-white rounded-xl p-6 shadow-lg`
- "Estimated Capital Outlay" label (uppercase, muted)
- Large cost range: `$Xk – $Yk` in `text-3xl font-bold`
- Attribution line: uses `system.costAttributionLine` (optional)
- Cost disclaimer: uses `system.costDisclaimer` with Info icon (optional)
- Subtle background decoration: low-opacity TrendingDown icon (`-right-4 -bottom-4 opacity-10`)

**Section 3: Cost Context Grid** (2 columns, white cards)
- Left card: "Labor & Parts"
  - Uses `system.capitalCost.typicalLow`/`typicalHigh` if available
  - Falls back to 40% of total cost range if not provided
  - Icon: Hammer
  - Subtext: "Based on local regional labor rates"
- Right card: "Maintenance ROI"
  - Uses `system.maintenanceEffect.expectedDelayYears` (e.g., `+2 Years`)
  - Icon: Clock
  - Subtext: `system.maintenanceEffect.explanation`

**Section 4: Replacement Rationale Card** (white card)
- "Why This Window" header
- Key metrics:
  - Unit Age: `currentYear - installYear` (e.g., "12 Years (Installed 2014)")
  - Lifecycle progress bar (h-2 rounded-full) using the same color logic as SystemsHealthTimeline:
    - Red for PLAN NOW (<=3 years to likely)
    - Amber for WATCH (<=6 years)
    - Emerald for OK
  - Width: `(currentYear - installYear) / (lateYear - installYear) * 100` clamped to [5, 100]
- Rationale text: italicized quote from `system.replacementWindow.rationale`
- Lifespan drivers table:
  - Rows for each `system.lifespanDrivers[]` entry
  - Display: `factor` | direction (`↑`/`↓`) + `impact` (low/medium/high)
  - Text color: red text for negative, emerald for positive
  - Example: "Climate stress | ↓ high"

**Section 5: Evidence Summary** (compact white card)
- Confidence indicator:
  - ShieldCheck icon (emerald for high, amber otherwise)
  - Label: `system.dataQuality` (High/Medium/Low)
- Inline badges for:
  - `system.installSource` (with Calendar icon if present)
  - `system.materialType`
  - `system.climateZone` (with MapPin icon if present)
- All badges: `bg-stone-100 rounded text-[9px] font-bold text-stone-500 uppercase`

**Section 6: Call to Action**
- Full-width dark button: "Get Local Replacement Quotes"
- Styling: `bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-4 rounded-xl`
- Behavior: Triggers `setFocus({ type: 'contractor_list', systemId: focus.systemId, query: 'Replacement' }, { push: true })`

**Global Styling:**
- Container: `animate-in slide-in-from-right duration-300 pb-12`
- Spacing: `gap-6` between sections
- Card base: `bg-white p-4/6 rounded-xl border border-stone-100 shadow-sm`
- Typography consistency with dashboard (stone-900, stone-400, text-[10px] labels)

**Data Mapping from `SystemTimelineEntry`:**
| UI Element | Source |
|---|---|
| System name | `systemLabel` |
| Cost range | `capitalCost.low` / `capitalCost.high` |
| Attribution | `costAttributionLine` (optional) |
| Disclaimer | `costDisclaimer` (optional) |
| Labor estimate | `capitalCost.typicalLow/typicalHigh` or fallback |
| Maintenance impact | `maintenanceEffect.expectedDelayYears` + `.explanation` |
| Unit age | `currentYear - installYear` |
| Lifecycle bar width | `(currentYear - installYear) / (lateYear - installYear) * 100` clamped [5,100] |
| Rationale | `replacementWindow.rationale` |
| Drivers | `lifespanDrivers[]` array with `factor`, `impact`, `severity` |
| Install verification | `installSource` (permit/inferred/unknown) |
| Material | `materialType` (optional) |
| Climate zone | `climateZone` (optional) |
| Data quality | `dataQuality` (high/medium/low) |

### Modified Files

#### 2. `src/components/dashboard-v3/RightColumnSurface.tsx`

In the `case 'system'` switch branch:
- Replace `SystemPanel` import with `SystemFocusDetail`
- Update the system case to render:
  ```tsx
  <SystemFocusDetail
    system={system}
    onBack={() => goBack()}
    currentYear={new Date().getFullYear()}
  />
  ```
- Remove `initialTab` prop passing (no tabs in the new design)
- Remove the `space-y-6` wrapper since `SystemFocusDetail` is the only content rendered

#### 3. `src/lib/dashboardUtils.ts` (New utility file)

Extract the zone derivation logic into a shared utility so it's consistent across `SystemsHealthTimeline`, `SystemFocusDetail`, and any other components that need it:

```typescript
export type Zone = 'OK' | 'WATCH' | 'PLAN NOW';

export function deriveZone(yearsToLikely: number | null): Zone {
  if (yearsToLikely === null) return 'OK';
  if (yearsToLikely <= 3) return 'PLAN NOW';
  if (yearsToLikely <= 6) return 'WATCH';
  return 'OK';
}

export function getBarColor(zone: Zone): string {
  switch (zone) {
    case 'PLAN NOW': return 'bg-red-500';
    case 'WATCH': return 'bg-amber-500';
    case 'OK': return 'bg-emerald-500';
  }
}

export function getBadgeClasses(zone: Zone): string {
  switch (zone) {
    case 'PLAN NOW': return 'bg-red-500 text-white animate-subtle-pulse shadow-sm shadow-red-200';
    case 'WATCH': return 'bg-amber-500 text-white';
    case 'OK': return 'bg-emerald-500 text-white';
  }
}
```

Then update `SystemsHealthTimeline.tsx` to import these utilities instead of defining them locally.

#### 4. `tailwind.config.ts`

The `subtle-pulse` animation is **already defined** (lines 122-130), but we need to enhance it with the scale transform as suggested in the user's reference code:

Change line 122-125 from:
```typescript
"subtle-pulse": {
  "0%, 100%": { opacity: "1" },
  "50%": { opacity: "0.85" },
},
```

To:
```typescript
"subtle-pulse": {
  "0%, 100%": { 
    opacity: "1",
    transform: "scale(1)"
  },
  "50%": { 
    opacity: "0.85",
    transform: "scale(0.98)"
  },
},
```

This adds the 3D "breathing" depth effect mentioned in the refinement notes.

### Integration Flow

**Clicking a system in SystemsHealthTimeline:**
1. User clicks a system row → `onSystemClick(systemId)` called
2. `HomeSystemsPanel` → `setFocus({ type: 'system', systemId }, { push: true })`
3. `RightColumnSurface` detects `focus.type === 'system'`
4. `SystemFocusDetail` renders with the found system data
5. Back button calls `goBack()` from FocusState context (inherited via `useFocusState`)

**Clicking a pin on CapExBudgetRoadmap:**
- Already wired via `onSystemClick` in the roadmap component
- Same flow as above

**Contractor flow (future):**
- "Get Local Replacement Quotes" button calls `setFocus({ type: 'contractor_list', ... }, { push: true })`
- Pushes a new focus state onto the stack
- Back button navigates back to system detail (not home)

### Visual Consistency Checkpoints

✓ All cards use `bg-white rounded-xl border border-stone-100 shadow-sm`
✓ All labels use `text-[10px] font-bold text-stone-400 uppercase tracking-widest`
✓ Dark card (hero) uses `bg-stone-900 text-white shadow-lg shadow-stone-200`
✓ Status badge color logic matches `SystemsHealthTimeline` (via shared utility)
✓ PLAN NOW badge only element using `animate-subtle-pulse`
✓ Lifecycle bar colors match health timeline (emerald/amber/red)
✓ Icons from lucide-react for consistency
✓ Typography follows existing pattern (IBM Plex Sans, no serif)

### Data Safety & Defensive Coding

- All optional fields (like `costAttributionLine`, `materialType`, etc.) have null checks and render conditionally
- Fallback for `typicalLow/typicalHigh`: uses 40% of total cost range if not provided
- Fallback for `maintenanceEffect`: renders "+0 Years" if missing
- Fallback for `lifespanDrivers`: skips the drivers section if array is empty
- Lifecycle bar percent clamped to [5, 100] to ensure always visible
- `currentYear` passed as a prop for testability (can mock in tests)

### TypeScript Contracts

The component expects:
```typescript
interface SystemFocusDetailProps {
  system: SystemTimelineEntry;
  onBack: () => void;
  currentYear: number;
}
```

All `SystemTimelineEntry` fields are already typed in `src/types/capitalTimeline.ts`, so no new types are needed.

### Animation & Interaction

- Outer container: `animate-in slide-in-from-right duration-300` (smooth entry from right)
- Lifecycle bar: `transition-all duration-700` (slow bar fill animation)
- Back button & Info icon: `hover:text-stone-600 transition-colors` (subtle hover feedback)
- CTA button: `active:scale-[0.98]` (tactile press feedback)

### Testing Notes

Once implemented, should verify:
- System with PLAN NOW status shows pulsing red badge
- System with WATCH shows amber badge (no pulse)
- System with OK shows emerald badge
- Labor & Parts falls back to 40% calculation when typicalLow/High missing
- Lifespan drivers render with correct directional arrows
- Beyond-horizon systems can still open detail view
- Back button properly pops focus stack

