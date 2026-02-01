

# Fix: Robust JWT Token Extraction in AI Home Assistant

## Problem Summary

The `ai-home-assistant` edge function calls `supabase.auth.getUser()` without explicitly passing the JWT token, which returns `null` in Edge Function environments. This causes `update_system_info` tool calls to fail with:

```
"I can't save that update because you're not signed in."
```

## Root Cause

On line 217:
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

In Supabase Edge Functions, `getUser()` **requires the JWT token to be passed explicitly**. The client initialization with the Authorization header alone is not sufficient for `getUser()` to extract the token.

---

## Technical Changes

### File: `supabase/functions/ai-home-assistant/index.ts`

#### 1. Add Robust `extractUserId` Helper Function (after corsHeaders, ~line 18)

```typescript
/**
 * Extract and validate user ID from JWT token
 * Returns userId if valid, undefined if auth is not provided
 * Throws Response with 401 if auth is malformed/invalid
 */
async function extractUserId(
  authHeader: string | null,
  supabase: any
): Promise<string | undefined> {
  // No auth header = anonymous request (valid for some endpoints)
  if (!authHeader) {
    console.warn('[ai-home-assistant] No authorization header present');
    return undefined;
  }

  // Validate Bearer format
  if (!authHeader.startsWith('Bearer ')) {
    console.error('[ai-home-assistant] Invalid auth header format');
    throw new Response(
      JSON.stringify({ error: 'Invalid authorization header format' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Extract and validate token
  const token = authHeader.replace('Bearer ', '').trim();
  
  if (!token) {
    console.error('[ai-home-assistant] Empty token after extraction');
    throw new Response(
      JSON.stringify({ error: 'Missing authentication token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate token with Supabase (CRITICAL: pass token explicitly)
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error) {
    console.error('[ai-home-assistant] Auth error:', error.message);
    
    // Specific handling for expired tokens
    if (error.message.includes('expired')) {
      throw new Response(
        JSON.stringify({ error: 'Session expired', code: 'TOKEN_EXPIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Response(
      JSON.stringify({ error: 'Authentication failed', details: error.message }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const userId = user?.id;
  
  if (!userId) {
    console.error('[ai-home-assistant] No user ID in valid token');
    throw new Response(
      JSON.stringify({ error: 'Invalid user session' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log('[ai-home-assistant] User authenticated:', userId);
  return userId;
}
```

#### 2. Update Main Handler to Use New Helper (lines 214-219)

**Current (broken):**
```typescript
// Get the authenticated user (needed for system updates)
let userId: string | undefined;
if (authHeader) {
  const { data: { user } } = await supabase.auth.getUser();
  userId = user?.id;
}
```

**New (robust):**
```typescript
// Get the authenticated user (needed for system updates)
let userId: string | undefined;
try {
  userId = await extractUserId(authHeader, supabase);
} catch (errorResponse) {
  // If extractUserId throws a Response, return it directly
  if (errorResponse instanceof Response) {
    return errorResponse;
  }
  // Re-throw unexpected errors
  throw errorResponse;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/ai-home-assistant/index.ts` | Add `extractUserId` helper function, update main handler to use it with proper error handling |

---

## Error Handling Matrix

| Scenario | Behavior |
|----------|----------|
| No auth header | `userId = undefined` (allows anonymous requests) |
| Invalid format (not Bearer) | 401 with "Invalid authorization header format" |
| Empty token | 401 with "Missing authentication token" |
| Expired token | 401 with "Session expired" + code: TOKEN_EXPIRED |
| Invalid token | 401 with "Authentication failed" |
| Valid token, no user | 401 with "Invalid user session" |
| Valid token + user | `userId` populated, logged for confirmation |

---

## Expected Log Output After Fix

**Success case:**
```
[ai-home-assistant] User authenticated: abc123-def456-...
[ai-home-assistant] Request: { message: "...", userId: "present", ... }
```

**Failure case (expired token):**
```
[ai-home-assistant] Auth error: Token has expired
```

---

## Verification Checklist

After implementation:
- [ ] Valid JWT → `userId` extracted, logged as authenticated
- [ ] Saying "the roof was replaced in 2008" → Database write succeeds
- [ ] Expired token → Returns 401 with "Session expired"
- [ ] Missing auth header → Continues with `userId = undefined` (graceful)
- [ ] Malformed header (e.g., `Basic xyz`) → Returns 401 with clear message
- [ ] Edge function logs show `userId: "abc123..."` instead of `userId: "missing"`

