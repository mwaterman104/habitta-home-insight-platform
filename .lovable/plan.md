

## Fix: Mobile Photo Upload + AI System Awareness

### Problem 1: Mobile photo upload fails silently

**Root Cause**: The Supabase storage RLS policy for the `home-photos` bucket checks `(storage.foldername(name))[1]` against `auth.uid()`. PostgreSQL arrays are 1-indexed, so for the upload path `chat-uploads/{userId}/photo.jpg`, position `[1]` returns `chat-uploads` — not the user ID. The policy always rejects the upload.

**Fix**: Create a migration that drops the old INSERT policy and replaces it with one that checks position `[2]` for paths that start with `chat-uploads/`, while also supporting direct `{userId}/filename` paths for backward compatibility.

| File | Change |
|------|--------|
| New migration SQL | Drop + recreate INSERT, UPDATE, DELETE policies to handle both `{userId}/...` and `chat-uploads/{userId}/...` path patterns |

**New policy logic**:
```text
INSERT allowed when:
  bucket_id = 'home-photos'
  AND (
    auth.uid() = foldername(name)[1]          -- direct: userId/file.jpg
    OR auth.uid() = foldername(name)[2]        -- nested: chat-uploads/userId/file.jpg
  )
```

Same adjustment for UPDATE and DELETE policies.

---

### Problem 2: Chat doesn't know about user-added appliances

**Root Cause**: The AI edge function (`ai-home-assistant`) queries `systems` (canonical/capital-timeline) and `home_assets` (VIN layer), but NOT `home_systems` — the table where manually added appliances (e.g., refrigerator) are stored.

**Fix**: Add `home_systems` to the parallel fetch in `getPropertyContext()` and include any active entries in the AI's system prompt context.

| File | Change |
|------|--------|
| `supabase/functions/ai-home-assistant/index.ts` | Add `home_systems` query to `Promise.all` block; merge results into returned context; include in system prompt |

**Implementation details**:
- Add to the Promise.all: `supabase.from('home_systems').select('*').eq('home_id', propertyId).eq('status', 'active')`
- Include the results in the returned context object as `userReportedSystems`
- In the system prompt builder, format these as "User-reported appliances" so the AI can reference them naturally
- Deduplicate against canonical systems by `system_key` to avoid double-counting

---

### Files to Modify

| File | Change |
|------|--------|
| New migration file | Fix storage RLS policies for `home-photos` bucket to support `chat-uploads/` prefix |
| `supabase/functions/ai-home-assistant/index.ts` | Add `home_systems` query + merge into AI context |

