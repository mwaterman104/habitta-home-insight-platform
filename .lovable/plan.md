
# Fix: Wire `schedule_maintenance` Tool to Home Events Ledger

## Problem

The `schedule_maintenance` tool handler (line 1483) returns a static text string with no side effect. The LLM has no evidence that anything changed, so when the user affirms ("lets do it"), it re-calls the same tool, creating a response loop.

## Solution

Replace the static return with a handler that:

1. **Deduplicates** — checks for an existing pending maintenance event with the same title + system before inserting
2. **Writes** — inserts into `home_events` using the same service-role client pattern as `record_home_event`
3. **Returns honest confirmation** — different copy depending on whether the write succeeded, was a duplicate, or failed

## Changes

### File: `supabase/functions/ai-home-assistant/index.ts`

**Replace lines 1483-1484** (the `schedule_maintenance` case) with a full handler block:

```typescript
case 'schedule_maintenance': {
  const homeId = context?.homeId;
  const userId = context?.userId;
  const task = parsedArgs.task || 'maintenance';
  const system = parsedArgs.system || 'system';
  const urgency = parsedArgs.urgency || 'medium';
  const costNote = parsedArgs.estimated_cost
    ? ` (estimated cost: $${parsedArgs.estimated_cost})`
    : '';
  const timeframe = urgency === 'high' ? '1-2 weeks'
    : urgency === 'medium' ? '1-2 months' : '3-6 months';

  // If no home context, return helpful text without claiming a write
  if (!homeId || !userId) {
    return `I recommend scheduling "${task}" for your ${system} within ${timeframe}${costNote}. Once your home is set up, I can record this to your home history.`;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing config');

    const { createClient: createServiceClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const serviceSupabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    const systemKind = system.toLowerCase().replace(/\s+/g, '_');
    const severityMap: Record<string, string> = {
      low: 'minor', medium: 'moderate', high: 'major'
    };
    const severity = severityMap[urgency] || 'minor';

    // IDEMPOTENCY: Check for existing pending event with same title + system
    const { data: existing } = await serviceSupabase
      .from('home_events')
      .select('id')
      .eq('home_id', homeId)
      .eq('event_type', 'recommendation')
      .eq('title', task)
      .eq('status', 'open')
      .limit(1);

    if (existing && existing.length > 0) {
      return `"${task}" is already on your home record as a pending maintenance item. I recommend scheduling it within ${timeframe}${costNote}. Would you like help finding a contractor?`;
    }

    // INSERT to home_events (append-only ledger)
    const { data: newEvent, error: eventError } = await serviceSupabase
      .from('home_events')
      .insert({
        home_id: homeId,
        user_id: userId,
        event_type: 'recommendation',
        title: task,
        description: `Scheduled maintenance: ${task}${costNote}`,
        severity,
        status: 'open',
        source: 'ai_assistant',
        metadata: {
          system_kind: systemKind,
          urgency,
          estimated_cost: parsedArgs.estimated_cost || null,
          recommended_timeframe: timeframe,
        },
      })
      .select('id')
      .single();

    if (eventError) {
      console.error('[schedule_maintenance] Insert failed:', eventError);
      return `I recommend scheduling "${task}" for your ${system} within ${timeframe}${costNote}. I wasn't able to save this to your home record right now, but you can ask me again later.`;
    }

    console.log(`[schedule_maintenance] Event recorded: ${newEvent.id}`);
    return `I've added "${task}" to your home record as a pending maintenance item${costNote}. I recommend scheduling this within ${timeframe}. Would you like help finding a contractor?`;
  } catch (e) {
    console.error('[schedule_maintenance] Error:', e);
    return `I recommend scheduling "${task}" for your ${system} within ${timeframe}${costNote}. I wasn't able to save this right now, but the recommendation stands.`;
  }
}
```

### Key Design Decisions

1. **`event_type: 'recommendation'`** — Stays consistent with `record_home_event`'s existing use of this type for AI-generated recommendations. The `metadata.urgency` field distinguishes scheduled maintenance from passive recommendations.

2. **`status: 'open'`** — Matches the existing event status convention (the `record_home_event` handler uses `'open'` as default). The idempotency check queries against this status.

3. **Idempotency check** — Queries `home_events` for matching `(home_id, event_type, title, status='open')` before inserting. Prevents duplicates from model retries, double-taps, or network hiccups.

4. **Honest failure copy** — Three distinct return paths:
   - Success: "I've added..."
   - Duplicate: "...is already on your home record"
   - Failure: "I recommend..." (no false claim of recording)

5. **Same infra pattern** — Uses the identical `createClient` + service-role pattern from `record_home_event` (line 2072-2074). No new infrastructure.

## Files Summary

| File | Changes | Risk |
|------|---------|------|
| `supabase/functions/ai-home-assistant/index.ts` | Replace `schedule_maintenance` static return with write + idempotency + honest confirmation | Low |

No frontend changes. No schema changes. No new tables.

## Loop Resolution Proof

```text
Before:
  User: "lets do it"
  → AI calls schedule_maintenance
  → Tool returns static text (no write)
  → AI has no state evidence → repeats tool call → loop

After:
  User: "lets do it"
  → AI calls schedule_maintenance
  → Tool writes home_event, returns "I've added..."
  → Confirmation is in chat history
  → User says "lets do it" again
  → AI calls schedule_maintenance again
  → Idempotency check finds existing event
  → Returns "already on your home record"
  → No duplicate, no loop
```

## QA Checklist

- "Start planning" opens chat with assistant question (existing fix preserved)
- User affirms and gets unique confirmation, not a repeat
- Maintenance event recorded in `home_events` table
- Repeating "lets do it" does NOT create duplicate `home_events`
- If DB insert fails, user gets honest fallback (no false claim)
- If no `homeId`/`userId`, user gets recommendation without false write claim
- No schema migration needed
