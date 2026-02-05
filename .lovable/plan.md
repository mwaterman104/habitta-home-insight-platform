

# Home Record: Hardened Implementation ("Carfax for the Home")

## Overview

This plan implements the master system of record with all hardening tweaks applied. Two new tables, one new AI tool, system prompt protocols, and chat formatting -- everything needed to turn conversations into permanent home history.

## Database Layer (Step 1)

### Table: `home_assets` (VIN Layer)

One durable identity per physical thing. Assets are never deleted -- only status-transitioned via events.

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `home_id` | uuid | FK to homes | Which home |
| `user_id` | uuid | not null | Owner (for RLS) |
| `category` | text | not null | `appliance`, `system`, `structure` |
| `kind` | text | not null | `washing_machine`, `hvac`, `roof`, etc. |
| `manufacturer` | text | nullable | Brand name |
| `model` | text | nullable | Model number |
| `serial` | text | nullable | Serial number |
| `install_date` | date | nullable | When installed |
| `removal_date` | date | nullable | When removed/replaced |
| `status` | text | `'active'` | `active`, `replaced`, `removed`, `unknown` |
| `source` | text | not null | `chat`, `photo`, `permit`, `pro`, `manual` |
| `confidence` | integer | 50 | 0-100, capped by source type |
| `notes` | text | nullable | Free-form |
| `metadata` | jsonb | `'{}'` | Age estimate, fuel type, capacity, etc. |
| `created_at` | timestamptz | `now()` | |
| `updated_at` | timestamptz | `now()` | |

**Confidence Ceiling Rules** (enforced in tool handler, not DB constraint):

| Source | Max Confidence |
|--------|---------------|
| `chat` | 60 |
| `photo` | 80 |
| `pro` (invoice) | 95 |
| `permit` | 95 |

**Indexes**: `(home_id, kind)`, `(user_id)`

**RLS**: Users can CRUD assets for homes they own (`user_id = auth.uid()`). Service role can write on behalf of users.

### Table: `home_events` (Immutable Ledger)

Append-only. Events are never mutated -- status changes are new events linked via `related_event_id`.

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `home_id` | uuid | FK to homes | Which home |
| `user_id` | uuid | not null | Owner (for RLS) |
| `asset_id` | uuid | nullable, FK to home_assets | Which asset |
| `event_type` | text | not null | See list below |
| `title` | text | not null | Human-readable summary |
| `description` | text | nullable | Detailed description |
| `severity` | text | `'info'` | `info`, `minor`, `moderate`, `major` |
| `status` | text | `'open'` | `open`, `in_progress`, `resolved`, `deferred` |
| `cost_estimated` | jsonb | nullable | `{low: 150, high: 400}` |
| `cost_actual` | numeric | nullable | What was paid |
| `source` | text | not null | `chat`, `photo`, `pro`, `permit`, `manual` |
| `related_event_id` | uuid | nullable, FK to self | Event chaining |
| `metadata` | jsonb | `'{}'` | Semantic sub-records |
| `created_at` | timestamptz | `now()` | |

**Event Types**: `system_discovered`, `issue_reported`, `diagnosis`, `recommendation`, `repair_completed`, `maintenance_performed`, `replacement`, `user_decision`, `contractor_referred`, `status_change`

**Hardening Rule -- Append-Only Semantics**:
- No `UPDATE` policy on `home_events` -- only `INSERT` and `SELECT`
- Status changes are recorded as new `status_change` events linked via `related_event_id`
- No `resolved_at` column -- resolution is determined by the existence of a linked `status_change` event with `status: 'resolved'`

**Indexes**: `(home_id)`, `(asset_id)`, `(related_event_id)`

**RLS**: Users can INSERT and SELECT events for homes they own. No UPDATE or DELETE.

### Semantic Sub-Records (in `metadata` JSONB)

For `issue_reported`:
```text
{"symptom": "Drum spins slowly, grinding noise", "reported_by": "homeowner"}
```

For `diagnosis`:
```text
{"probable_cause": "Worn drive belt", "confidence": 0.72, "diagnosed_by": "ai"}
```

For `recommendation`:
```text
{"path": "repair", "who": "pro", "urgency": "soon", "rationale": "Risk of motor damage"}
```

For `user_decision`:
```text
{"decision": "hire_pro", "contractor_name": "ABC Appliance"}
```

For `contractor_referred`:
```text
{"contractors_shown": 3, "service_type": "appliance_repair"}
```

### Hardening: `contractor_referred` Cannot Resolve Issues

The `contractor_referred` event type is purely informational. The tool handler enforces:
- It never sets `status: 'resolved'` on any linked issue
- It never changes asset status
- It is recorded as an advisory-only event in the chain

## AI Tool Layer (Step 2)

### New Tool: `record_home_event`

Added to the tools array in `generateAIResponse` alongside `schedule_maintenance`, `get_contractor_recommendations`, etc.

**Tool Definition Parameters**:

| Parameter | Required | Type | Notes |
|-----------|----------|------|-------|
| `event_type` | Yes | string | One of the event types listed above |
| `system_kind` | Yes | string | `washing_machine`, `hvac`, `roof`, etc. |
| `title` | Yes | string | Short human-readable summary |
| `description` | No | string | Detailed description |
| `severity` | No | string | `info`, `minor`, `moderate`, `major` (default: `info`) |
| `cost_estimate_low` | No | number | Low end of cost range |
| `cost_estimate_high` | No | number | High end of cost range |
| `manufacturer` | No | string | For system discovery |
| `model` | No | string | For system discovery |
| `age_estimate_years` | No | number | For system discovery |
| `resolution` | No | string | For `user_decision` or `repair_completed` events |
| `related_event_id` | No | string | UUID linking to prior event |
| `metadata` | No | object | Additional structured data |

### Tool Handler Logic

**Asset Matching (Hardened)**:

When the tool is called:

1. Query `home_assets` for `(home_id, kind, status = 'active')`
2. If exactly ONE match: attach event to that asset
3. If ZERO matches and `event_type = 'system_discovered'`: create new asset with `source = 'chat'`, `confidence = 50`
4. If MULTIPLE active matches of the same kind: do NOT auto-attach. Log the event with `asset_id = null` and include a note in the response asking the user to clarify which one (e.g., "I see two washing machines on file -- which one are you referring to?")

This prevents silent mis-attribution.

**Confidence Ceiling Enforcement**:

When creating an asset via `system_discovered`:
- Source `chat` caps confidence at 60
- If the user later provides a photo, a separate update can raise to 80
- If a permit confirms, can go to 95
- Never exceeds 95 without external verification

**Contractor Referral Guard**:

When `event_type = 'contractor_referred'`:
- Status is always `'info'` -- never `'resolved'`
- `related_event_id` is set to the original issue if one exists
- No asset status changes occur

**Return Format**:

The handler returns structured JSON:

```text
{
  "type": "home_event_recorded",
  "success": true,
  "eventId": "uuid",
  "assetId": "uuid",
  "isNewAsset": true,
  "eventType": "system_discovered",
  "systemKind": "washing_machine",
  "title": "Washing machine discovered",
  "message": "Added to your home record: Samsung washing machine (chat-reported, ~5 years old)"
}
```

### Property Context Enhancement

Update `getPropertyContext()` to also fetch `home_assets` for the property:

```text
supabase.from('home_assets').select('*').eq('home_id', propertyId).eq('status', 'active')
```

Add to system prompt under a new section:

```text
HOME ASSETS ON FILE:
- Washing Machine (Samsung, ~2021, chat-reported, confidence: 50)
- Refrigerator (LG, photo-verified, confidence: 75)
```

Also fetch recent open events:

```text
supabase.from('home_events').select('*').eq('home_id', propertyId).eq('status', 'open').order('created_at', { ascending: false }).limit(5)
```

Add to prompt:

```text
OPEN ISSUES:
- Washing machine drum not spinning (moderate, reported 2 days ago)
```

This gives the AI full context for discovery checks and follow-up linking.

## System Prompt Protocols (Step 3)

### SYSTEM DISCOVERY PROTOCOL

```text
When the user mentions an appliance or system by name (e.g., "washing machine", 
"dishwasher", "hot tub") that does NOT appear in PROPERTY CONTEXT or HOME ASSETS ON FILE:

1. Acknowledge: "I don't have a [system] on record for your home yet."
2. Call record_home_event with event_type: 'system_discovered'
3. Ask ONE contextual question (brand OR approximate age -- not both)
4. Continue with the conversation naturally

No user permission required. This is bookkeeping, not publishing.
Do NOT ask "Would you like me to add this to your record?" -- just do it.
```

### ISSUE RECORDING PROTOCOL

```text
After completing a diagnosis or providing repair/replacement guidance, call 
record_home_event to persist the finding:

1. Log event_type: 'diagnosis' with severity, probable cause, and confidence in metadata
2. If you provided a recommendation, log a second event_type: 'recommendation' 
   with path (repair/replace/defer), urgency, and rationale in metadata
3. Link both to the original issue_reported event via related_event_id

The user should see a subtle confirmation that this is part of their home record.
```

### FOLLOW-UP LINKING PROTOCOL

```text
When the user returns to discuss a previously-reported issue:
- "I got the washer fixed"
- "How's the washing machine?"
- "The repair cost $200"

1. Find the original open event in OPEN ISSUES context
2. Create a linked event (user_decision, repair_completed, or status_change)
3. Use related_event_id to chain to the original
4. Acknowledge: "I've updated the record. The [issue] is now [status]."
```

### IMMUTABILITY RULE

```text
NEVER update an existing home_events record. Status changes are NEW events:

Wrong: Update issue #123 status from 'open' to 'resolved'
Right: Create new event type='status_change', status='resolved', 
       related_event_id='issue-123-uuid'

This preserves the full audit trail.
```

## Chat Formatting Layer (Step 4)

### New Type: `HomeEventData`

Added to `src/lib/chatFormatting.ts`:

```text
export interface HomeEventData {
  success: boolean;
  eventId?: string;
  assetId?: string;
  isNewAsset?: boolean;
  eventType?: string;
  systemKind?: string;
  title?: string;
  message?: string;
}
```

### Extraction

- Add `'home_event_recorded'` to the `DOMAIN_TYPES` whitelist
- Add `extractHomeEventData()` function following the same balanced-brace pattern as existing extractors (e.g., `extractSystemUpdateData`)
- Build human-readable confirmation messages:
  - Discovery: "Added to your home record: Samsung washing machine (chat-reported, ~5 years old)"
  - Issue: "Recorded: Washing machine drum not spinning (moderate severity)"
  - Diagnosis: "Recorded diagnosis: Likely worn drive belt -- repair estimate $150-$400"
  - Status change: "Updated: Washing machine issue resolved"

### ChatMessageContent Update

Add rendering for `home_event_recorded` type in `ChatMessageContent.tsx`:
- A subtle confirmation card with muted background, small check icon, and one-line summary
- Placed AFTER structured data (contractors, cost analysis) but BEFORE prose
- Not a loud toast or alert -- this is quiet bookkeeping

## Files Changed

| File | Changes |
|------|---------|
| New migration SQL | Create `home_assets` and `home_events` tables with RLS, indexes, triggers |
| `supabase/functions/ai-home-assistant/index.ts` | Add `record_home_event` tool definition, handler with hardened asset matching, confidence ceiling, contractor guard; update `getPropertyContext` to fetch assets and open events; add Discovery, Issue Recording, Follow-up, and Immutability protocols to system prompt |
| `src/lib/chatFormatting.ts` | Add `HomeEventData` interface, `home_event_recorded` to `DOMAIN_TYPES`, `extractHomeEventData()` function |
| `src/components/chat/ChatMessageContent.tsx` | Add subtle confirmation card rendering for home event records |

## What This Does NOT Change

- The canonical `systems` table remains the authority for core lifecycle systems (HVAC, Roof, Water Heater)
- The existing `home_systems` table remains the evidence layer for photo analysis
- The existing `update_system_info` tool continues to handle core system install updates
- No existing UI dashboards are modified -- this is backend-first
- The `home_assets` table complements (not replaces) existing tables

## Implementation Order

1. **Migration** -- Create both tables, RLS, indexes, updated_at trigger
2. **Edge function** -- Tool definition, handler, context fetch, system prompt protocols
3. **Chat formatting** -- Type, extraction, domain type whitelist
4. **Chat rendering** -- Confirmation card component

