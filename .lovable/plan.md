
# Credibility Sprint: Implementation Plan

## Objective

Fix every place where Habitta implies permanence, memory, or proactivity without delivering it. Five fixes, ordered by risk. No new features.

---

## Fix 1: Delete Dead `HomeDocuments.tsx` (Zero Risk)

Delete `src/components/HomeProfile/HomeDocuments.tsx`. It contains hardcoded mock records (`Property_Deed.pdf`, `Deck_Permit_2022.pdf`) as default props, violating the project's guardrail against fake data on evidentiary surfaces. It is not imported anywhere -- `HomeProfilePage.tsx` uses `SupportingRecords.tsx` instead, which correctly defaults to an empty array.

One file deleted. Zero runtime impact.

---

## Fix 2: Kill Fake Notification Content (Zero Risk)

### `src/components/AppTopbar.tsx`

Remove the `<Badge>3</Badge>` overlay on the bell icon (line 89). Replace the three hardcoded `DropdownMenuItem` blocks (lines 97-114: "HVAC Filter Due", "Kitchen Renovation Update", "Property Value Alert") with an honest empty state:

```text
Notifications
---
No notifications yet.
Habitta will notify you when something needs attention.
```

### `src/components/dashboard-v3/TopHeader.tsx`

Replace the two hardcoded notification items (lines 130-141: "HVAC Filter Due", "Property Value Alert") with the same honest empty state. Remove the `hasNotifications` red dot logic -- always render the bell without a badge until a real notification system exists.

---

## Fix 3: Defuse the "Set a Reminder" Promise (Zero Risk)

### `supabase/functions/ai-home-assistant/index.ts` (line 1986)

Change `closingIntent` from `'explore_costs_or_remind'` to `'explore_costs'`.

### `src/lib/chatFormatting.ts` (lines 320-322)

Update the `closingQuestions` map:
- Remove `explore_costs_or_remind`
- Add `explore_costs` with text: `'Would you like to explore replacement costs or plan next steps?'`

"Plan" instead of "discuss" -- reinforces Habitta's role as an active advisor, not a passive conversation partner.

---

## Fix 4: Wire Home Activity Log to Real Data (Low Risk)

### `src/pages/HomeProfilePage.tsx`

Add a query to fetch activity-relevant events from `home_events` for the current `home.id`:

```text
const { data: homeEvents } = await supabase
  .from('home_events')
  .select('id, event_type, title, description, metadata, created_at')
  .eq('home_id', home.id)
  .in('event_type', [
    'system_discovered', 'issue_reported', 'repair_completed',
    'maintenance_performed', 'replacement', 'status_change'
  ])
  .order('created_at', { ascending: false })
  .limit(20);
```

Map results to the `ActivityItem` interface:
- `id` from event `id`
- `date` from `created_at`
- `title` from event `title`
- `category` derived from `metadata.system_type` or `metadata.kind` (HVAC maps to Thermometer icon, Roof to Home, Water Heater to Wrench, etc.)
- `notes` from `description`
- `contractor` from `metadata.contractor` if present

Pass mapped activities to `<HomeActivityLog activities={mappedActivities} />` instead of the hardcoded empty array.

### `src/components/HomeProfile/HomeActivityLog.tsx`

Add category mappings for system kinds from `home_events` (`water_heater` maps to Plumbing icon, `hvac` to Thermometer, `roof` to Home/Exterior). The empty state remains for genuinely empty histories.

This is read-only. The "Log activity" button remains non-functional (new feature, not trust repair).

---

## Fix 5: Persist Chat History to Database (Medium Risk)

### Database Migration

The existing `chat_sessions` table is coupled to `projects` via a NOT NULL FK and RLS policies that check `projects.user_id`. This is a different domain (workspace renovation projects vs home advisor chat).

Create a new `home_chat_sessions` table purpose-built for the home advisor:

```sql
CREATE TABLE public.home_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, home_id)
);

-- RLS
ALTER TABLE public.home_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own home chat sessions"
  ON public.home_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own home chat sessions"
  ON public.home_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own home chat sessions"
  ON public.home_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own home chat sessions"
  ON public.home_chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER home_chat_sessions_updated_at
  BEFORE UPDATE ON public.home_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

The `message_count` column enables the "only write if changed" guardrail without needing a hash.

### `src/hooks/useAIHomeAssistant.ts` (Full Persistence Rewrite)

Replace all `sessionStorage` logic with Supabase reads/writes:

1. **On mount** (when `propertyId` is available and user is authenticated):
   - Query `home_chat_sessions` for `user_id + home_id = propertyId`
   - If found, hydrate `messages` state from the JSONB column
   - Set `isRestoring = false` when complete (whether found or not)

2. **On new message** (after appending to local state):
   - Debounced upsert (500ms) of the full messages array to the row
   - Only write if `messages.length !== lastPersistedCount` (the guardrail against unnecessary writes during streaming)
   - Fire-and-forget with error logging -- local state is always authoritative

3. **On `clearConversation`**:
   - Delete the `home_chat_sessions` row for this `home_id`
   - Reset `lastPersistedCount` to 0

4. **Property switch**:
   - Clear local state
   - `isRestoring = true` triggers re-hydration for the new home

5. **Cap**: Truncate to 200 messages on write (oldest removed) to prevent unbounded JSONB growth

### `src/components/dashboard-v3/ChatConsole.tsx` (lines 192-204)

Remove the `sessionStorage` check for `hasStoredMessages`. Replace with a check against `messages.length` after `isRestoring` completes. This prevents the greeting from firing before database hydration finishes.

The key guardrail: the baseline opening message must NOT fire until `isRestoring === false` AND `messages.length === 0`. The existing code at line 244-245 already checks `isRestoring` -- we just need to remove the parallel `sessionStorage` check that now creates a stale-data race.

---

## Implementation Order

| Step | Fix | Files | Risk |
|------|-----|-------|------|
| 1 | Delete `HomeDocuments.tsx` | 1 deleted | Zero |
| 2 | Kill fake notifications | 2 edited | Zero |
| 3 | Defuse reminder promise | 2 edited | Zero |
| 4 | Wire activity log | 2 edited | Low |
| 5 | Persist chat history | 1 migration + 2 edited | Medium |

---

## What This Sprint Does NOT Include

- No new features (reminders, notifications, document upload)
- No prompt changes
- No engagement cadence wiring
- No contractor loop changes
- No Home Report changes

## Governing Principle

> Nothing Habitta presents should imply permanence, memory, or proactivity unless it is fully real end-to-end.
