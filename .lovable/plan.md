
# Fix: Tool Failure JSON Leak + Missing Appliance Coverage

## Problem Summary

Two interrelated bugs cause raw JSON to leak into user-facing chat:

1. **Missing appliances**: `washing_machine`, `dryer`, `refrigerator`, `oven_range`, `microwave` are not in the edge function's `APPLIANCE_CONFIGS`, so `classifyIssueType()` returns `null` and the tool emits `{"type":"unknown_issue",...}`
2. **No frontend handler**: The normalization layer (`chatFormatting.ts`) only handles 4 domain types: `contractor_recommendations`, `system_update`, `replacement_tradeoff`, `proposed_addition`. The three new response types (`unknown_issue`, `small_appliance_repair`, `medium_system_repair`) pass through untranslated.

---

## Phase 1: Add Missing Appliances to Edge Function Registry

**File:** `supabase/functions/_shared/applianceConfigs.ts`

Add 5 missing appliances that the frontend already tracks in `applianceTiers.ts`:

### New `SmallApplianceType` additions:
| Key | Display | Cost Range | DIY | Keywords |
|-----|---------|-----------|-----|----------|
| `microwave` | Microwave | $100-$400 | Yes | microwave, over-the-range microwave |

### New `MediumSystemType` additions:
| Key | Display | Cost Range | DIY | Keywords |
|-----|---------|-----------|-----|----------|
| `washing_machine` | Washing Machine | $400-$1,200 | No | washer, washing machine, laundry machine, clothes washer |
| `dryer` | Dryer | $350-$1,000 | No | dryer, clothes dryer, tumble dryer |
| `refrigerator` | Refrigerator | $500-$2,500 | No | refrigerator, fridge, freezer |
| `oven_range` | Oven/Range | $400-$2,000 | No | oven, range, stove, cooktop |

### Type updates:
- Add `microwave` to `SmallApplianceType` union
- Add `washing_machine`, `dryer`, `refrigerator`, `oven_range` to `MediumSystemType` union

---

## Phase 2: Frontend Normalization (Critical Safety Fix)

**File:** `src/lib/chatFormatting.ts`

### A. Expand `DOMAIN_TYPES` whitelist (line 99)

Add `unknown_issue`, `small_appliance_repair`, `medium_system_repair` to prevent the execution artifact firewall from accidentally stripping these as execution artifacts.

### B. Add extraction + translation functions

Three new functions following the same pattern as `extractSystemUpdateData`:

- **`extractUnknownIssueData(content)`** -- Finds `{"type":"unknown_issue",...}`, removes the JSON, returns a human-readable message: *"To provide accurate cost information, I need a bit more detail about the specific issue."*

- **`extractSmallApplianceData(content)`** -- Finds `{"type":"small_appliance_repair",...}`, removes the JSON, returns formatted text with cost range, DIY eligibility, and trade recommendation.

- **`extractMediumSystemData(content)`** -- Finds `{"type":"medium_system_repair",...}`, removes the JSON, returns formatted text with cost range, professional recommendation, and safety note.

### C. Wire into `extractAndSanitize()` pipeline

Add three new extraction steps (after step 4, before artifact tag stripping):
- Step 5: Extract unknown issue data
- Step 6: Extract small appliance data
- Step 7: Extract medium system data

Append their human-readable messages to clean text, same as existing pattern.

### D. Add catch-all JSON stripper (defense in depth)

After all known extractors run but before final cleanup, scan for any remaining `{"type":"..."}` JSON objects and strip them entirely. This prevents future tool response types from leaking if new tools are added before the frontend is updated.

### E. Update `ExtractedStructuredData` interface

Add optional fields for the three new data types so they can be consumed by future UI components if needed.

---

## Phase 3: Diagnostic Gating in System Prompt

**File:** `supabase/functions/ai-home-assistant/index.ts`

Add mandatory diagnostic gating rules to `createSystemPrompt()` (after the existing COST CALCULATION RULES section around line 1002):

```
DIAGNOSTIC GATING RULES (MANDATORY):
Before calling calculate_cost_impact, you MUST have identified at least ONE of:
- A specific appliance or system (e.g., "garbage disposal", "HVAC", "washing machine")
- A specific component (e.g., "drain pump", "compressor", "control board")
- An error code or specific symptom

If the user describes a CATEGORY without specifying what's wrong:
1. Acknowledge the issue calmly
2. Ask ONE narrowing question about symptoms or error codes
3. ONLY THEN call the cost tool

FORBIDDEN PATTERN:
"I've pulled a breakdown of costs..." followed by a tool call.
You may NOT announce results before the tool has returned successfully.
```

---

## Files Changed

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/_shared/applianceConfigs.ts` | Add `washing_machine`, `dryer`, `refrigerator`, `oven_range`, `microwave` with keywords |
| `src/lib/chatFormatting.ts` | Expand DOMAIN_TYPES, add 3 extraction/translation functions, catch-all JSON stripper |
| `supabase/functions/ai-home-assistant/index.ts` | Add diagnostic gating rules to system prompt |

---

## Defense in Depth (3 Layers)

1. **Layer 1 (Registry):** The appliance is now recognized, so `classifyIssueType()` returns a valid tier instead of `null`. The tool returns `small_appliance_repair` or `medium_system_repair` with proper cost data.

2. **Layer 2 (Normalization):** Even if the tool returns `unknown_issue` (for genuinely unrecognized items), the frontend catches the JSON, strips it, and replaces it with human-readable text.

3. **Layer 3 (Catch-all):** Any remaining `{"type":"..."}` JSON that slips through all extractors is stripped entirely. No raw JSON ever reaches the user.

Any single layer prevents the bug. All three together make it structurally impossible.

---

## Expected Behavior After Fix

**User:** "My washing machine is broken"

**AI (correct):**
> Washing machine issues can range from simple fixes to component replacements.
>
> Most washing machine repairs run $150-$500 for individual components, or $400-$1,200 for a full replacement.
>
> To narrow this down: do you know the error code on the display, or can you describe what the washer does right before it stops?

**What will NOT happen:**
- No raw JSON in the chat
- No `{"type":"unknown_issue",...}` visible to user
- No HVAC fallback costs
- No "system failure" language for appliances
