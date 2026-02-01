
# Fix: update-system-install Gateway Rejecting Service Role Key as JWT

## Problem Summary

The `ai-home-assistant` edge function successfully authenticates users and correctly calls `update-system-install`. However, all calls are failing with **401 "Invalid JWT"** before the edge function code even runs.

**Root Cause:** The `update-system-install` function has `verify_jwt = true` in `supabase/config.toml`. This causes Supabase's gateway to validate the Authorization header as a JWT **before** the edge function code executes.

When `ai-home-assistant` calls `update-system-install` with:
```typescript
'Authorization': `Bearer ${supabaseServiceKey}`
```

The gateway rejects it because the **service role key is NOT a JWT** — it's a secret key that should bypass JWT validation entirely.

---

## Evidence

**Edge function logs from ai-home-assistant:**
```
[update_system_info] Calling update-system-install for: {
  homeId: "46ba7ab3-1682-422d-8cd4-de6ae4f40794",
  systemKey: "roof",
  replacementStatus: "original",
  userId: "present"
}
[update_system_info] Failed: 401 {"code":401,"message":"Invalid JWT"}
```

**Analytics query showing gateway-level 401s:**
```
POST | 401 | https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/update-system-install
```

**No logs exist from inside update-system-install** — confirming the function code never executes.

**config.toml line 65:**
```toml
[functions.update-system-install]
verify_jwt = true  # <-- THIS IS THE PROBLEM
```

---

## Solution

Change `update-system-install` to `verify_jwt = false` in config.toml and handle authentication **inside the function code** (which already does this correctly).

This is the standard pattern for edge functions that need to accept both:
1. User JWT tokens (from frontend calls)
2. Service role keys (from internal edge-to-edge calls)

The function code already handles this with the `isServiceRoleCall` check — it just never gets a chance to run.

---

## Technical Changes

### File: `supabase/config.toml`

**Current (line 64-65):**
```toml
[functions.update-system-install]
verify_jwt = true
```

**Fixed:**
```toml
[functions.update-system-install]
verify_jwt = false
```

---

## Why This Is Safe

The `update-system-install` function already has robust authentication logic inside:

1. **Service role detection:** Checks if the Authorization header contains the service role key
2. **JWT validation:** For non-service-role calls, explicitly validates the JWT with `supabase.auth.getUser(token)`
3. **Ownership verification:** Always verifies `home.user_id === userId` before any write

Setting `verify_jwt = false` does NOT mean the endpoint is unauthenticated. It means authentication is handled **in code** rather than **at the gateway level**.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Line 65: Change `verify_jwt = true` to `verify_jwt = false` |

---

## Expected Result After Fix

1. `ai-home-assistant` calls `update-system-install` with service role key
2. Supabase gateway passes the request through (no JWT validation at gateway)
3. Edge function code runs and detects `isServiceRoleCall = true`
4. Function trusts the `userId` from the request body
5. Database write succeeds
6. User sees "I've saved that the roof is original to the house (owner-reported)."
