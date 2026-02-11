

## Promote System Outlook to Permanent Right-Column Surface

### Summary

Move the System Outlook from a transient chat artifact to a permanent, always-visible position at the top of the right column. Clicking a system row opens the SystemPanel below a collapsed Outlook header, preserving user orientation.

### Layout States

**Default (no focus):**
```text
HomeSystemsPanel (full -- all system rows visible)
PropertyMap
LocalConditions
MaintenanceCalendar
```

**System focused:**
```text
HomeSystemsPanel (collapsed -- header only, teal accent retained)
SystemPanel (detail view)
```

**Other focus (contractor, etc.):**
```text
Only the relevant panel (no Outlook)
```

### Files Changed

**1. New: `src/components/dashboard-v3/HomeSystemsPanel.tsx`**

Permanent right-column surface wrapping `BaselineSurface`:
- Card with white bg, `border-slate-200`, 2-3px teal left border accent
- Accepts `systems`, `confidenceLevel`, `yearBuilt`, `dataSources`
- `isCollapsed` prop: when true, renders header-only state ("Your Home System Outlook -- [confidence]") using internal branching (same component, not two trees)
- Wires `onSystemClick` to call `setFocus({ type: 'system', systemId }, { push: true })`
- Empty state (no systems): shows "We're building your system profile. Add documentation to increase coverage." -- panel stays visible, never hidden
- Uses `useFocusState` for click handler

**2. Update: `src/components/dashboard-v3/BaselineSurface.tsx`**

Add optional `onSystemClick` prop:
- Add `onSystemClick?: (systemKey: string) => void` to `BaselineSurfaceProps` (line 51)
- In the system map loop (lines 665-692), wrap each `SystemCard` and `UnknownAgeCard` in a clickable container when `onSystemClick` is provided
- Clickable container: `cursor-pointer`, `hover:bg-slate-50`, `active:bg-slate-100`, `transition`, `rounded-md`, `role="button"`, `tabIndex={0}`
- No visual changes when `onSystemClick` is undefined (chat artifact remains identical)

**3. Update: `src/components/dashboard-v3/RightColumnSurface.tsx`**

- Add `baselineSystems`, `confidenceLevel`, `yearBuilt`, `dataSources` to props interface
- Import `HomeSystemsPanel`
- Render logic:
  - `focus === null`: `HomeSystemsPanel` (full) + `HomeOverviewPanel`
  - `focus.type === 'system'`: `HomeSystemsPanel` (collapsed) + `SystemPanel`
  - All other focus types: only the relevant panel (no Outlook)
- Animation: 150ms fade + 4px slide, CSS transitions only

**4. Update: `src/pages/DashboardV3.tsx`**

- Rename `mobileBaselineSystems` to `baselineSystems` (single source of truth)
- Pass `baselineSystems`, `confidenceLevel` (from `homeConfidence`), `yearBuilt` to `RightColumnSurface` via `DesktopLayout`
- Continue passing same data to mobile surfaces (no mobile changes)

### Data Flow

```text
DashboardV3 (computes baselineSystems once)
  |
  +-- MiddleColumn (chat -- existing BaselineSurface artifact, unchanged)
  |
  +-- RightColumnSurface
        +-- HomeSystemsPanel
        |     +-- BaselineSurface (onSystemClick wired)
        +-- HomeOverviewPanel / SystemPanel (conditional)
```

### Interaction Model

- Click system row: `setFocus({ type: 'system', systemId }, { push: true })` -- triggers user lock, Outlook collapses, SystemPanel slides in
- Close SystemPanel (X): `clearFocus()` -- Outlook expands back, HomeOverviewPanel returns
- Back button: `goBack()` pops focus stack

### Edge Cases

- **No systems**: Panel stays visible with placeholder copy
- **Low confidence**: Shown inline as badge (already handled by `ConfidenceExplainer`)
- **Page refresh while focused**: Focus state is local (not URL-synced), so returns to default -- acceptable for now
- **HomeOverviewPanel remount**: Map/conditions are lightweight; no expensive recomputation concern

### What Does NOT Change

- `BaselineSurface` in chat (remains as artifact, no clicks)
- Mobile layout (no right column)
- Focus state context / user lock mechanism
- Contractor/other panel routing
- Animation approach (existing `animate-in` pattern)

