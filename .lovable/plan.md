

## ChatDIY × Habitta Integration — Habitta Side Implementation (Revised)

### Corrections from Review

1. **Route discrepancy fixed:** `/chatdiy` redirects to `/dashboard` (not `/`). The previous plan stated `/` — corrected.
2. **Trigger multi-home edge case:** The `trg_link_intent_events_on_home_create` trigger will link unlinked intent events to the newly created home. If a user creates a second home, the trigger must only link events that are still `home_id IS NULL` — and it should pick the **first** home (oldest) for deterministic behavior. Adding `LIMIT 1` + `ORDER BY created_at ASC` on the home lookup, plus a comment documenting the single-home assumption.

### Step 1: Database Migration

Create table + supporting objects in a single migration:

**`home_intent_events` table:**
- `id uuid PK DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `home_id uuid REFERENCES homes(id) ON DELETE SET NULL` (nullable — user may not have a home yet)
- `platform text NOT NULL DEFAULT 'chatdiy'`
- `session_id text`
- `intent_category text NOT NULL` (repair, replace, upgrade, inspect, diy_project, general)
- `system_type text` (hvac, roof, water_heater, pool, electrical, plumbing, etc.)
- `symptom_summary text`
- `session_summary text`
- `diy_flag boolean DEFAULT false`
- `pro_flag boolean DEFAULT false`
- `severity text` (low, medium, high, urgent)
- `cost_estimate_min numeric`
- `cost_estimate_max numeric`
- `lead_value_score integer DEFAULT 0`
- `raw_payload jsonb`
- `created_at timestamptz DEFAULT now()`
- `updated_at timestamptz DEFAULT now()`

**Indexes:** `user_id`, `home_id` (partial WHERE NOT NULL), `system_type` (partial), `pro_flag + lead_value_score` (partial WHERE pro_flag = true), `created_at DESC`

**RLS policies:**
- Users SELECT own rows (`auth.uid() = user_id`)
- No user INSERT/UPDATE/DELETE (service role only via edge function)

**Add column to `home_events`:**
- `source_platform text DEFAULT 'habitta'`

**Function: `compute_lead_value_score`**
```sql
CREATE OR REPLACE FUNCTION compute_lead_value_score(
  p_pro_flag boolean, p_severity text, p_system_type text,
  p_cost_max numeric, p_home_id uuid
) RETURNS integer AS $$
DECLARE score integer := 0;
BEGIN
  IF p_pro_flag THEN score := score + 40; END IF;
  IF p_severity = 'urgent' THEN score := score + 20;
  ELSIF p_severity = 'high' THEN score := score + 10; END IF;
  IF p_system_type IN ('hvac','roof','water_heater','electrical_panel') THEN score := score + 15; END IF;
  IF p_cost_max > 500 THEN score := score + 10; END IF;
  IF p_home_id IS NOT NULL THEN score := score + 15; END IF;
  RETURN LEAST(score, 100);
END; $$ LANGUAGE plpgsql IMMUTABLE;
```

**Trigger function: `link_intent_events_on_home_create`**
```sql
-- When a home is created, link any unlinked intent events for that user
-- NOTE: Assumes single-home per user. For multi-home users,
-- unlinked events get assigned to the FIRST home created.
CREATE OR REPLACE FUNCTION link_intent_events_on_home_create()
RETURNS trigger AS $$
BEGIN
  UPDATE home_intent_events
  SET home_id = NEW.id, updated_at = now()
  WHERE user_id = NEW.user_id
    AND home_id IS NULL;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_link_intent_events_on_home_create
AFTER INSERT ON homes
FOR EACH ROW EXECUTE FUNCTION link_intent_events_on_home_create();
```

**Updated_at trigger:** Reuse existing `update_updated_at_column()` on `home_intent_events`.

### Step 2: Edge Function — `receive-chatdiy-intent`

**File:** `supabase/functions/receive-chatdiy-intent/index.ts`

- Validates `x-chatdiy-key` header against `CHATDIY_WEBHOOK_SECRET` env var
- Service role Supabase client for all DB writes
- Resolves `home_id`: query `homes` WHERE `user_id` = payload user_id, `ORDER BY created_at ASC LIMIT 1`
- Calls `compute_lead_value_score` RPC
- Inserts into `home_intent_events`
- If `home_id` resolved AND `intent_category` IN (`repair`, `repair_replace`): also inserts into `home_events` with `source_platform = 'chatdiy'`, `event_type = 'issue_reported'`
- Returns `{ success, intent_event_id, home_id, lead_value_score }`
- CORS headers matching existing edge function patterns

**Config:** Add to `supabase/config.toml`:
```toml
[functions.receive-chatdiy-intent]
verify_jwt = false
```

### Step 3: Secret

Add `CHATDIY_WEBHOOK_SECRET` to Supabase Edge Function secrets. Generate a random 32-char string; the same value must be stored in the ChatDIY project's environment.

### What This Does NOT Touch
- `ai-home-assistant/index.ts` (2,744 lines — no changes)
- `AuthContext.tsx` or `UserHomeContext.tsx`
- `src/integrations/supabase/types.ts` (auto-generated, will sync after migration)
- Any existing migration files
- The ChatDIY project itself

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create `home_intent_events`, indexes, RLS, `compute_lead_value_score`, trigger, `source_platform` column on `home_events` |
| `supabase/functions/receive-chatdiy-intent/index.ts` | New edge function |
| `supabase/config.toml` | Add `receive-chatdiy-intent` entry |
| Supabase secrets | Add `CHATDIY_WEBHOOK_SECRET` |

