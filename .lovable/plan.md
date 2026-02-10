

# Intelligent Maintenance Hub

## What This Is

A new `/maintenance` page that replaces the archived `/maintenance-planner` as a first-class route accessible from both desktop and mobile. It is the central surface for all home maintenance -- connected to your systems, confidence scoring, climate zone, and seasonal cadence. It generates region-aware tasks (NYC fall vs. South Florida fall), integrates with the desktop calendar, and lays the groundwork for email/chat alerts.

## Key Behaviors

1. **Region-aware task generation**: The `seed-maintenance-plan` edge function is upgraded to use the home's derived `ClimateZoneType` (high_heat, coastal, freeze_thaw, moderate) to produce fundamentally different seasonal templates -- not just "cold state yes/no" as it does today.

2. **System-connected**: Tasks are linked to system types (hvac, roof, plumbing, etc.) via a new `system_type` column on `maintenance_tasks`. This connects tasks to the capital timeline, confidence scoring, and priority scoring.

3. **Confidence integration**: Completing maintenance tasks can flip the `hasMaintenanceRecord` signal in the confidence engine, improving the Home Confidence score. The existing `RiskDeltaDisplay` on completed tasks is preserved.

4. **Desktop layout**: Full page at `/maintenance` with the calendar view, timeline view, system health cards, and filters -- upgraded from the current planner but now a primary route, not archived.

5. **Mobile layout**: Responsive mobile view with a card-based timeline (no calendar grid on mobile), swipeable task cards, and a bottom-nav entry point. Tasks can also be surfaced via chat.

6. **Alert foundation (v1)**: A new `maintenance-alerts` edge function that can be invoked on a schedule to check for upcoming/overdue tasks and notify via chat message injection. Email alerting is deferred to v2 (requires Resend integration) but the data layer is built now.

## Architecture

```text
homes table (state, city, lat/lng)
       |
       v
deriveClimateZone() --> ClimateZoneType
       |
       v
seed-maintenance-plan (upgraded)
  - climate-aware seasonal templates
  - system_type tagging on every task
  - region-specific cadences
       |
       v
maintenance_tasks table (+ system_type column)
       |
       v
/maintenance page
  - Desktop: Calendar + Timeline + System Health + Filters
  - Mobile: Card timeline + Chat integration
       |
       v
Confidence Engine
  - hasMaintenanceRecord signal updated on task completion
```

## Technical Changes

### 1. Database: Add `system_type` column to `maintenance_tasks`

Add a nullable `text` column `system_type` to `maintenance_tasks` referencing the system key (hvac, roof, electrical, water_heater, plumbing, etc.). This links tasks to the capital timeline and confidence engine. Backfill existing tasks using the `category` column mapping.

Migration:
- `ALTER TABLE maintenance_tasks ADD COLUMN system_type text;`
- Backfill: `UPDATE maintenance_tasks SET system_type = CASE WHEN category = 'hvac' THEN 'hvac' WHEN category = 'plumbing' THEN 'plumbing' WHEN category = 'electrical' THEN 'electrical' WHEN category = 'exterior' THEN 'roof' ELSE NULL END;`

### 2. Edge Function: Upgrade `seed-maintenance-plan`

Replace the binary `isCold` flag with a full climate zone derivation:

- Accept optional `climateZone` parameter, or derive it from home's state/city using the same logic as `deriveClimateZone` (ported to Deno)
- Create four seasonal template sets:

| Climate Zone | Fall Examples | Spring Examples |
|---|---|---|
| freeze_thaw (NYC) | Winterize pipes, weatherstrip, furnace tune-up, gutter clean before freeze | AC tune-up, check sump pump, foundation crack inspection |
| high_heat (S. Florida) | Hurricane shutter check, AC filter (year-round), roof inspection post-storm season | Pool pump service, irrigation check, AC deep service before summer |
| coastal | Salt air HVAC rinse, exterior corrosion check, window seal inspection | Deck/exterior wash, gutter check, HVAC coil clean |
| moderate | Standard HVAC tune-up, gutter clean, smoke detector test | Standard spring inspection, filter replacement |

- Tag every generated task with `system_type` (e.g., "HVAC cooling tune-up" gets `system_type: 'hvac'`)

### 3. New Page: `/maintenance` (Desktop + Mobile)

Create `src/pages/MaintenancePage.tsx` as a responsive page:

**Desktop layout:**
- Header with "Maintenance" title + "Generate Plan" + "Add Task" buttons
- System health strip (from capital timeline -- which systems need attention)
- Tabs: Timeline | Calendar (reuses existing `MaintenanceTimelineView` and `MaintenanceCalendarView`)
- Filters: status, priority, system type (new filter)
- Upcoming task count badge

**Mobile layout (detected via `useIsMobile`):**
- Compact header
- System filter chips (horizontal scroll)
- Card-based task list (no calendar grid -- too small for mobile)
- FAB for "Add Task"
- Tap task to open detail/complete flow
- Chat integration: completing a task can trigger a chat message via the existing MobileChatSheet

### 4. Routing + Navigation

- Add `/maintenance` route to `AppRoutes.tsx` (standalone, like `/systems`)
- Add "Maintenance" to `BottomNavigation.tsx` bottom nav (replace "Report" or add as 6th item -- need to check spacing)
- Desktop: Add to the left column navigation or top header
- Redirect `/maintenance-planner` to `/maintenance`

### 5. Mobile Bottom Nav Update

Add a "Maintenance" item to bottom nav using the `Wrench` icon. The current 5 items (Home Pulse, Systems, Chat, Report, Settings) become 6. To avoid crowding, replace "Report" with "Maintenance" in the bottom nav since Report is less frequently accessed. Report remains accessible from Settings or the dashboard.

### 6. Alert Foundation: `maintenance-alerts` Edge Function

A new edge function that:
- Queries `maintenance_tasks` for tasks due within N days or overdue
- Groups by system type and priority
- Returns a structured alert payload
- Can be called from the frontend to inject an assistant message into chat (e.g., "You have 3 maintenance tasks due this week, including an HVAC filter change")

The chat integration uses the existing `MobileChatSheet` + `initialAssistantMessage` pattern established in the recommendation flow.

Email alerting (via Resend) is documented as a v2 follow-up -- the data layer and alert logic are identical, only the delivery channel differs.

### 7. Confidence Engine Connection

When a task with a valid `system_type` is marked as completed:
- The `handleTaskUpdate` function triggers a confidence recomputation
- The `hasMaintenanceRecord` signal for that system flips to true
- This naturally improves the Home Confidence score

This uses the existing `homeConfidence.ts` and `deriveSystemSignals` -- no changes needed to the scoring engine itself, only ensuring the maintenance completion event is visible to the signal derivation.

## Files to Create
- `src/pages/MaintenancePage.tsx` -- main responsive page
- `src/components/maintenance/MobileMaintenanceView.tsx` -- mobile-specific layout
- `src/components/maintenance/SystemFilterChips.tsx` -- horizontal system filter
- `supabase/functions/maintenance-alerts/index.ts` -- alert generator

## Files to Modify
- `supabase/functions/seed-maintenance-plan/index.ts` -- climate-aware templates + system_type tagging
- `src/pages/AppRoutes.tsx` -- add `/maintenance` route, redirect old route
- `src/components/BottomNavigation.tsx` -- add Maintenance nav item
- `src/components/maintenance/AddTaskDialog.tsx` -- add system_type field
- `src/components/maintenance/MaintenanceTimelineView.tsx` -- show system type badge
- `src/components/maintenance/MaintenanceCalendarView.tsx` -- show system type in task cards

## What Is NOT Changed
- Home Confidence scoring formula (locked)
- Priority scoring formula (frozen)
- ChatConsole internals
- Capital timeline computation
- Desktop three-column dashboard layout
- Recommendation engine logic

