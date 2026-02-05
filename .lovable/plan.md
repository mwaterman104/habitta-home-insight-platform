

# Fix: PRO MODE Contractor Tool Enforcement

## Problem

When a user clicks "hire a pro" after discussing an appliance issue, the AI generates prose like "I'll pull some local recommendations for you" and "I've prioritized technicians known for quick response times" -- but never actually calls the `get_contractor_recommendations` tool. The user sees empty promises instead of real contractor cards.

This is the same "authority drift" pattern: the model says the right things without doing the right things.

## Root Cause

1. The PRO MODE system prompt says "Offer local recommendations" -- advisory, not mandatory
2. `tool_choice: 'auto'` lets the model skip the tool entirely
3. Forward-commit language bans only cover `calculate_cost_impact`, not contractor discovery
4. The `searchQueries` map inside `searchLocalContractors` is missing appliance repair service types, so even if the tool were called with `service_type: "appliance_repair"`, it would fall back to a generic search

## Fix (3 Changes, 1 File)

All changes are in `supabase/functions/ai-home-assistant/index.ts`.

### Change 1: Strengthen PRO MODE Prompt (System Prompt)

**Location:** Lines 1085-1095 (PRO MODE section of `createSystemPrompt`)

Replace the soft "Offer local recommendations" guidance with mandatory tool invocation rules:

- Expand trigger phrases: add "hire a pro", "find a contractor", "find someone", "get quotes"
- Make tool call mandatory: "You MUST call `get_contractor_recommendations` immediately"
- Infer `service_type` from conversation context (e.g., washing machine discussion means `appliance_repair`)
- Ban prose-only contractor promises

### Change 2: Extend Forward-Commit Bans (System Prompt)

**Location:** Lines 1016-1019 (FORBIDDEN PATTERNS in DIAGNOSTIC GATING RULES)

Add contractor-specific forbidden patterns:

- "I'll pull some local recommendations..." before `get_contractor_recommendations` returns
- "I've prioritized technicians..." without tool results
- Any present-tense claim of contractor data retrieval before the tool has executed

### Change 3: Add Appliance Repair to Contractor Search Queries

**Location:** Lines 1159-1168 (the `searchQueries` map inside `searchLocalContractors`)

Add missing service type mappings so the Google Places search actually returns relevant results:

| Service Type | Search Query |
|-------------|-------------|
| `appliance_repair` | `appliance repair technician` |
| `appliance` | `appliance repair technician` |
| `washing_machine` | `washing machine repair` |
| `dryer` | `dryer repair technician` |
| `refrigerator` | `refrigerator repair technician` |
| `oven` | `oven range repair technician` |
| `dishwasher` | `dishwasher repair technician` |

### What About Runtime Enforcement?

The user's audit correctly identifies that system prompt instructions are advisory, not enforceable. A true runtime enforcement gate (checking if `tool_calls` includes `get_contractor_recommendations` after the LLM responds, and retrying with forced `tool_choice` if not) would make this bulletproof.

However, implementing a full retry loop with forced `tool_choice` adds significant complexity:

- It requires a second LLM call (cost and latency)
- It needs careful error handling for the retry path
- The forced retry must reconstruct context correctly

The current approach combines three reinforcing layers:

1. **Strong prompt language** ("MUST call", not "offer") -- this alone fixes most cases since Gemini follows explicit instructions well
2. **Forward-commit ban** -- prevents the failure mode where the model promises results without calling the tool
3. **Search query coverage** -- ensures the tool returns useful results when called

This is a pragmatic fix that addresses the immediate failure. A runtime enforcement gate can be added as a follow-up if prompt-level enforcement proves insufficient.

---

## Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/ai-home-assistant/index.ts` | Strengthen PRO MODE prompt, extend forward-commit bans, add appliance repair search queries |

## Expected Behavior After Fix

**User:** "hire a pro" (after discussing washing machine)

**Before (broken):**
> "I'll pull some local recommendations for you. I've prioritized technicians known for quick response times. What specific information would you like?"

**After (correct):**
> "That makes sense. For a mechanical issue like this, an appliance repair technician can usually diagnose the exact part failure quickly."
>
> [Contractor cards appear with real Google Places data: names, ratings, phone numbers]
>
> "When you call, ask whether they stock common washer parts and what their diagnostic fee covers."
