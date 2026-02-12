

## Redesign: Systems Health Timeline + CapEx Budget Roadmap

Two new components replacing the existing `HomeSystemsPanel`/`BaselineSurface` and `CapitalTimeline` with a clean, Rivian-inspired design.

---

### New Files

**1. `src/components/dashboard-v3/SystemsHealthTimeline.tsx`**

A vertical system list showing remaining lifespan and status:
- Header: "Home Systems Health & Timeline" with Info icon
- Year-marker scale across the top (Now, '28, '30, '32, '34, '36)
- Each system row: bold name (left), thin color-coded progress bar (center), pill status badge (right)
  - Emerald for OK systems, red for PLAN NOW
  - "Beyond horizon" systems show a dashed line with "~2052 (beyond horizon)" text instead of a bar, badge still right-aligned
- PLAN NOW badge gets a custom subtle pulse animation (3s cycle, not the aggressive default `animate-pulse`)
- Data sourced from `HomeCapitalTimeline.systems` via lifecycle position calculation
- Clicking a system row triggers `onSystemClick` for focus state navigation
- Card styling: `bg-white rounded-xl shadow-sm border border-slate-100 p-6`

**2. `src/components/dashboard-v3/CapExBudgetRoadmap.tsx`**

A single-line financial horizon with lollipop pins:
- Header: "Capital Expenditure Budget Roadmap" with Info icon
- Single solid horizontal timeline line (`h-0.5 bg-stone-800`) spanning 10 years
- Year markers below: Now, '28, '30, '32, '34, '36
- Lollipop pins at each system's `likelyYear`:
  - Red pin for high-priority (systems within 3 years), with cost label above
  - Teal shaded block for mid-range replacement windows (`earlyYear` to `lateYear`)
  - Muted gray pin for far-future systems
  - Pin height scales logarithmically: `minHeight + (log(cost/minCost) / log(maxCost/minCost)) * (maxHeight - minHeight)` with range 40px-100px
- All position calculations clamped with `Math.min(100, Math.max(0, ...))` to prevent overflow
- Hover/active state on pins triggers `onSystemClick`
- Legend: red dot = "High-Priority Expense", teal block = "Replacement Window"
- Card styling: same `bg-white rounded-xl shadow-sm border border-slate-100 p-6`

---

### Modified Files

**3. `src/components/dashboard-v3/HomeSystemsPanel.tsx`**

- Full mode: replace `BaselineSurface` rendering with `SystemsHealthTimeline`
- Pass `capitalTimeline` as a new prop (needed by the health timeline for system data)
- Collapsed mode: keep the existing header-only view (unchanged)
- `onSystemClick` wiring stays the same

**4. `src/components/dashboard-v3/RightColumnSurface.tsx`**

- Replace `CapitalTimeline` import with `CapExBudgetRoadmap`
- Pass `capitalTimeline` to `HomeSystemsPanel` (new prop)
- In the default (null focus) rendering:
  1. `HomeSystemsPanel` (now renders `SystemsHealthTimeline` internally)
  2. `CapExBudgetRoadmap` (replaces old `CapitalTimeline`)
  3. `HomeOverviewPanel` (local conditions + calendar)
- Spacing between cards: `space-y-8` for ample whitespace

**5. `tailwind.config.ts`**

- Add custom animation `subtle-pulse`: `pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite` so the PLAN NOW badge pulses gently rather than using Tailwind's aggressive default

---

### Data Flow

Both new components consume `HomeCapitalTimeline` (the existing type). The data mapping from `SystemTimelineEntry`:

| Visual Element | Source Field |
|---|---|
| System name | `systemLabel` |
| Health bar progress | `(currentYear - installYear) / (lateYear - installYear) * 100` |
| Bar color | `yearsToLikely`: <=3 red, <=6 amber, else emerald |
| Status badge | Derived: OK / WATCH / PLAN NOW from lifecycle zone |
| Beyond horizon | `earlyYear > currentYear + horizonYears` |
| Roadmap pin position | `(likelyYear - currentYear) / horizonYears * 100` (clamped 0-100) |
| Pin cost label | `capitalCost.low` / `capitalCost.high` formatted as $Xk |
| Window block | `earlyYear` to `lateYear` mapped to timeline % |
| Pin height | `log(capitalCost.high)` scaled to 40-100px range |

---

### Design Separation Philosophy

- **Health Timeline** answers: "What condition are my systems in right now?"
- **CapEx Roadmap** answers: "When will I need money, and how much?"

A homeowner sees a red PLAN NOW on their water heater, then looks down at the roadmap and sees a short pin -- manageable $2k-$4k. Context without panic.

