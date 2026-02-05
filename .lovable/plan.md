

# ✅ Tier-Aware Home Issue Responsiveness (IMPLEMENTED)

## Problem Summary

When a user asks about a garbage disposal breaking (a $150-$400 repair), the AI incorrectly triggers HVAC cost analysis ($6,000-$19,200). This destroys trust by presenting a disproportionately high cost for a minor issue.

**Root Cause Chain:**
1. User mentions "garbage disposal" 
2. AI calls `calculate_cost_impact` with `repair_type: "garbage_disposal"`
3. `getSystemConfig("garbage_disposal")` fails to find a match
4. Falls back to `SYSTEM_CONFIGS.hvac` (line 124 of `systemConfigs.ts`)
5. User sees HVAC replacement costs for a $200 appliance

---

## Solution: Three-Tier Classification Framework (IMPLEMENTED)

### Tier Model

| Tier | Category | Examples | Cost Range | Response Style |
|------|----------|----------|------------|----------------|
| 1 | Small Appliance | Garbage disposal, faucet, toilet, GFCI | $50-$500 | Calm, practical, DIY-eligible |
| 2 | Medium System | Water heater repair, sump pump, garage door | $300-$3,000 | Balanced, safety-aware |
| 3 | Capital System | HVAC, Roof, Electrical Panel | $5,000+ | Strategic, planning-oriented |

---

## Implementation (COMPLETED)

### Phase 1: Add Appliance Config Registry

**File:** `supabase/functions/_shared/applianceConfigs.ts` (New)

✅ Created a parallel configuration for appliances and minor repairs with:
- SmallApplianceType: garbage_disposal, faucet, toilet, toilet_flapper, gfci_outlet, doorbell, smoke_detector
- MediumSystemType: sump_pump, garage_door_opener, dishwasher_repair, water_softener, whole_house_fan
- Each config includes: tier, displayName, costRange, typicalLifespan, diyEligible, keywords, tradeType
- `findApplianceByKeyword()` for fuzzy matching user input

### Phase 2: Update getSystemConfig with Fail-Closed Behavior ✅

**File:** `supabase/functions/_shared/systemConfigs.ts`

✅ Changes made:
- `getSystemConfig()` now returns `null` instead of falling back to HVAC
- Added `classifyIssueType()` helper that checks appliances first, then capital systems
- Returns `IssueClassification` with tier, config, systemKey, isCapitalSystem
- Unknown issues return null (AI asks clarifying question)

### Phase 3: Add Tier-Aware Cost Tool ✅

**File:** `supabase/functions/ai-home-assistant/index.ts`

✅ Changes made:
- Added tier classification before processing any cost request
- Unknown issues return fail-closed response asking for clarification
- Tier 1 (small_appliance): Returns simple cost range + DIY eligibility
- Tier 2 (medium_system): Returns cost range + safety note + trade type
- Tier 3 (capital_system): Uses existing lifecycle/replacement logic

### Phase 4: Add Tier-Aware System Prompt Rules ✅

**File:** `supabase/functions/ai-home-assistant/index.ts` (createSystemPrompt)

✅ Added to system prompt:
- Full tier classification rules (Tier 1/2/3 definitions)
- Forbidden language for Tier 1 (no "system failure", "baseline degradation", etc.)
- Mode switching rules (DIY Mode vs Pro Mode triggers and behaviors)

### Phase 5: Add Mode Switching (DIY vs Pro) ✅

✅ Included in Phase 4 system prompt additions

---

## Files Changed

### New Files ✅
| File | Purpose |
|------|---------|
| `supabase/functions/_shared/applianceConfigs.ts` | Appliance tier registry with cost bands |

### Modified Files ✅
| File | Changes |
|------|---------|
| `supabase/functions/_shared/systemConfigs.ts` | Remove HVAC fallback, add `classifyIssueType()` |
| `supabase/functions/ai-home-assistant/index.ts` | Tier-aware `calculate_cost_impact`, updated system prompt |

---

## Expected Behavior After Fix

**User:** "My kitchen garbage disposal broke"

**AI Response (Correct):**
> "No problem — a broken garbage disposal is usually a small, contained repair.
> 
> Most replacements run about $150–$400 installed, depending on the unit.
> 
> This is often something homeowners can handle themselves, but a plumber can also swap it quickly.
> 
> Would you like to:
> - Try a DIY fix
> - Get help finding a pro
> - Do a quick diagnosis first"

**What Will NOT Happen:**
- No HVAC cost analysis
- No "system failure" language
- No "baseline degradation" references
- No $6,000-$19,000 cost ranges

---

## Success Criteria

This fix is working when:
1. Small problems feel small (garbage disposal = $150-$400)
2. Big problems feel navigable (HVAC = strategic planning)
3. Users don't feel talked down to
4. Users act immediately instead of abandoning the chat
5. HVAC is NEVER shown as a fallback for unrecognized issues

---

## Technical Notes

### Why Not Just Add Garbage Disposal to SYSTEM_CONFIGS?

That would be architecturally wrong. `SYSTEM_CONFIGS` is for capital/structural systems with:
- Multi-decade lifespans
- Replacement windows
- Climate stress factors
- Emergency premium calculations

Small appliances don't need this complexity. They need:
- Simple cost range
- DIY eligibility flag
- Calm, practical tone

Mixing these concerns would pollute the capital system logic.

### Alignment with Frontend

The frontend already has `src/lib/applianceTiers.ts` with Tier 1/Tier 2 appliances. This fix brings the edge function into alignment with that classification.

