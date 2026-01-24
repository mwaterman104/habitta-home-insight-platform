

# Fix: Map Not Displaying - Coordinate Backfill Edge Function

## Problem Confirmed

The property at "9511 Phipps Ln, Wellington, FL 33414" has:
- `latitude: null`
- `longitude: null`  
- `status: 'enriching'`

The enrichment pipeline never completed the coordinate geocoding for this home.

---

## Architecture: Server-Side Enrichment Function

Following QA guidance, we'll create a **dedicated edge function** for coordinate backfill rather than mutating data directly from the dashboard. This keeps:
- UI components as pure renderers (no DB mutations)
- Single authoritative source for coordinates
- Proper observability and logging
- No race conditions with other enrichment processes

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Dashboard (UI Layer)                       │
│  DashboardV3.tsx                                                │
│  Detects missing coords → Triggers backfill → Refreshes data    │
│  (No direct DB mutations)                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ invoke('backfill-home-coordinates')
┌──────────────────────────▼──────────────────────────────────────┐
│             backfill-home-coordinates (Edge Function)           │
│  - Load home by ID                                              │
│  - Guard: skip if coords already exist                          │
│  - Call Smarty rooftop geocoding API                            │
│  - Update homes table with lat/lng + source tracking            │
│  - Return success/failed/noop                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Create Edge Function

### New File: `supabase/functions/backfill-home-coordinates/index.ts`

**Responsibilities:**
1. Accept `home_id` from request body
2. Load home record from database
3. Guard clause: skip if coordinates already exist (idempotent)
4. Call Smarty rooftop geocoding API directly
5. Update home with `latitude`, `longitude`, `geo_source`, `geo_updated_at`
6. Return structured response: `{ status: 'success' | 'failed' | 'noop', geo? }`

**Key Design Decisions:**
- **No JWT verification** - internal function protected by `x-internal-secret` header
- **Direct Smarty API call** - doesn't go through smarty-proxy to avoid auth chain complexity
- **Source tracking** - records `geo_source: 'smarty_backfill'` for audit trail
- **Observability** - logs home_id, success/failure, latency

```typescript
// Pseudocode structure
serve(async (req) => {
  // 1. Validate internal secret
  // 2. Parse home_id from body
  // 3. Fetch home from DB
  // 4. Guard: return 'noop' if lat/lng exist
  // 5. Call Smarty rooftop geocoding
  // 6. Extract lat/lng from response
  // 7. Update home record
  // 8. Return success/failure
});
```

### Response Shape

```typescript
interface BackfillResponse {
  status: 'success' | 'failed' | 'noop';
  home_id?: string;
  geo?: {
    latitude: number;
    longitude: number;
  };
  reason?: string;  // For noop/failed cases
}
```

---

## Phase 2: Update config.toml

Add the new function to the config with JWT verification disabled (uses internal secret):

```toml
[functions.backfill-home-coordinates]
verify_jwt = false
```

---

## Phase 3: Dashboard Trigger (Lightweight)

### File: `src/pages/DashboardV3.tsx`

Add a `useEffect` that **only triggers the backfill** - no state mutation in the dashboard:

```typescript
// After userHome is loaded, check for missing coordinates
useEffect(() => {
  if (!userHome?.id) return;
  if (userHome.latitude != null && userHome.longitude != null) return; // Already has coords
  
  // Fire-and-forget: request backfill, don't wait for response
  supabase.functions.invoke('backfill-home-coordinates', {
    body: { home_id: userHome.id }
  }).then(({ data }) => {
    if (data?.status === 'success' && data?.geo) {
      // Refresh home data to pick up new coordinates
      // This re-triggers the existing fetchUserHome effect
      refetchUserHome();
    }
  }).catch((err) => {
    console.error('[DashboardV3] Coordinate backfill failed:', err);
    // Silent failure - map shows fallback, no error banner
  });
}, [userHome?.id, userHome?.latitude, userHome?.longitude]);
```

**Key behaviors:**
- Fire-and-forget pattern (no blocking)
- Silent failure (map shows calm fallback)
- Triggers data refresh only on success
- No direct state mutation from UI

### Add refetchUserHome helper

Refactor the existing `fetchUserHome` logic into a reusable function:

```typescript
const fetchUserHome = useCallback(async () => {
  if (!user) return;
  try {
    const { data, error } = await supabase
      .from('homes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) setUserHome(data);
  } catch (error) {
    console.error('Error fetching user home:', error);
  } finally {
    setLoading(false);
  }
}, [user]);
```

---

## Phase 4: Database Column Addition (Optional)

Add tracking columns to `homes` table if not present:
- `geo_source: text` - e.g., 'smarty_backfill', 'onboarding', 'attom'
- `geo_updated_at: timestamptz`

This enables future debugging and prevents duplicate geocoding calls from different sources.

---

## Smarty API Integration

The edge function will call Smarty's rooftop geocoding API directly:

```typescript
const SMARTY_AUTH_ID = Deno.env.get("SMARTY_AUTH_ID")!;
const SMARTY_AUTH_TOKEN = Deno.env.get("SMARTY_AUTH_TOKEN")!;

const geoUrl = `https://us-rooftop-geo.api.smarty.com/lookup?${new URLSearchParams({
  'auth-id': SMARTY_AUTH_ID,
  'auth-token': SMARTY_AUTH_TOKEN,
  street: home.address,
  city: home.city,
  state: home.state,
  zipcode: home.zip_code || '',
}).toString()}`;

const response = await fetch(geoUrl);
const geocode = await response.json();

// Extract from Smarty response
const latitude = geocode[0]?.metadata?.latitude;
const longitude = geocode[0]?.metadata?.longitude;
```

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/backfill-home-coordinates/index.ts` | Create | Dedicated geocoding backfill function |
| `supabase/config.toml` | Modify | Add function config |
| `src/pages/DashboardV3.tsx` | Modify | Add lightweight trigger for missing coords |

---

## Observability

The edge function will log:
- `[backfill-home-coordinates] Starting for home: {home_id}`
- `[backfill-home-coordinates] Skipping - coords exist: {home_id}`
- `[backfill-home-coordinates] Smarty response: {status}, {latency}ms`
- `[backfill-home-coordinates] Updated home: {home_id} with lat={lat}, lng={lng}`
- `[backfill-home-coordinates] Failed for home: {home_id}, reason: {error}`

---

## Product Behavior

**When coordinates are missing:**
1. Dashboard loads normally
2. Map shows calm fallback (climate zone placeholder)
3. Background backfill triggers
4. On success: data refreshes, map appears
5. On failure: silent (no error banners, fallback remains)

**No user-facing errors** - the experience should feel calm even when data is incomplete.

---

## Technical Notes

- **Secrets already configured**: `SMARTY_AUTH_ID` and `SMARTY_AUTH_TOKEN` exist
- **Internal secret protection**: Uses existing `INTERNAL_ENRICH_SECRET` pattern
- **Idempotent**: Safe to call multiple times (guard clause)
- **Non-blocking**: Dashboard doesn't wait for geocoding to complete

