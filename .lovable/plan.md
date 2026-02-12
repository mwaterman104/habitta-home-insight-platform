

## Add Capital Timeline to Right Column, Remove Map

### What Changes

1. **Remove PropertyMap** from `HomeOverviewPanel` -- the map is removed from the default right column view
2. **Add CapitalTimeline** between `HomeSystemsPanel` and `HomeOverviewPanel` in `RightColumnSurface`
3. **Pass capital timeline data** through to `RightColumnSurface` (it already receives `capitalSystems` but needs the full `HomeCapitalTimeline` object for the `CapitalTimeline` component)

### Technical Details

**Update: `src/components/dashboard-v3/panels/HomeOverviewPanel.tsx`**
- Remove `PropertyMap` import and rendering (lines 7, 70-79)
- Remove map-related props: `latitude`, `longitude`, `address`, `city`, `state`, `intelligenceOverlay`, `onMapClick`
- Keep `LocalConditions` and `MaintenanceCalendarWidget` only
- Simplify loading skeleton (remove the tall map skeleton)

**Update: `src/components/dashboard-v3/RightColumnSurface.tsx`**
- Add `capitalTimeline?: HomeCapitalTimeline` prop (the full timeline object, not just the systems array)
- Import `CapitalTimeline` component
- In the default (null focus) state, render order becomes:
  1. `HomeSystemsPanel` (System Outlook -- permanent anchor)
  2. `CapitalTimeline` (replacement windows visualization)
  3. `HomeOverviewPanel` (local conditions + maintenance calendar)
- In system focus state, the timeline stays visible below the collapsed Outlook

**Update: `src/pages/DashboardV3.tsx`**
- Pass the full `capitalTimeline` object (from `useCapitalTimeline`) to `RightColumnSurface` as a new prop
- Wire `onSystemClick` from `CapitalTimeline` to the focus state system navigation

### Visual Result (Default Right Column)

```text
+----------------------------+
| System Outlook (Anchor)    |
+----------------------------+
| Home Systems Timeline      |
| [HVAC ====|========  $8-12k|
| [Roof   ====|=====  $15-25k|
| [Water  ==|===      $3-5k  |
+----------------------------+
| Local Conditions           |
+----------------------------+
| Maintenance Calendar       |
+----------------------------+
```

The map is fully removed from the right column. The timeline visualization reinforces the System Outlook with temporal context -- when things need attention, not just what their current state is.

### Props Cleanup

The `HomeOverviewPanelProps` interface will shrink significantly since map-related props are removed. This simplifies the prop chain through `RightColumnSurface` as well -- fewer props to spread.

