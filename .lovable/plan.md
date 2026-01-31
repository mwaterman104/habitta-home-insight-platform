

# Canonical System Truth: AI Reads from `systems` Table

## Problem Summary

The user correctly identified a **data desync bug**: photo-derived data lands in `home_systems` and `systems`, but the AI reads from `system_lifecycles` — a **third, stale table** that never gets updated.

**Current data flow:**
```
Photo Upload → home_systems ✅
            → systems (via syncToCanonicalSystems) ✅
            → system_lifecycles ❌ NEVER UPDATED
            
AI reads from → system_lifecycles (STALE)
capital-timeline reads from → systems (CORRECT)
```

**The fix:** Make `ai-home-assistant` read from `systems` (the canonical table), matching `capital-timeline`.

---

## Table Schema Comparison

| Column | `system_lifecycles` | `systems` (Canonical) |
|--------|---------------------|----------------------|
| ID Reference | `property_id` | `home_id` |
| System Type | `system_type` | `kind` |
| Install Date | `installation_date` (DATE) | `install_year` (INTEGER) |
| Confidence | `confidence_level` | `confidence` |
| Source | (none) | `install_source` |
| Status | (none) | `replacement_status` |
| Derived Fields | `estimated_lifespan_years`, `predicted_replacement_date`, `replacement_probability` | (none - computed at runtime) |

**Key insight:** `system_lifecycles` has computed lifecycle fields that `systems` lacks. But `_shared/systemInference.ts` already has pure calculator functions that derive these from `systems` data. The AI doesn't need pre-computed fields — it can compute them.

---

## Architecture Decision

**The user's recommendation is correct:**
- **Canonical truth** = `systems` table (facts + provenance)
- **Derived intelligence** = computed at request time using `calculateSystemLifecycle()` from `_shared/systemInference.ts`

This matches what `capital-timeline` already does.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/ai-home-assistant/index.ts` | Read from `systems` table, compute lifecycle at runtime, add verified language rules |

---

## Technical Section

### 1. Update `getPropertyContext()` to Read from `systems`

**Before (line 285):**
```typescript
supabase.from('system_lifecycles').select('*').eq('property_id', propertyId)
```

**After:**
```typescript
supabase.from('systems').select('*').eq('home_id', propertyId)
```

### 2. Import Lifecycle Calculator (Already Exists)

The shared module `_shared/systemInference.ts` provides:
- `calculateSystemLifecycle()` - pure lifecycle math
- `getRegionContext()` - climate factors
- `dataQualityFromConfidence()` - confidence → quality mapping

**Import:**
```typescript
import { 
  calculateSystemLifecycle,
  getRegionContext,
  type PropertyContext as LifecyclePropertyContext
} from '../_shared/systemInference.ts';
```

### 3. Compute Lifecycle at Request Time

Transform `systems` rows into AI-ready context:

```typescript
interface EnrichedSystemContext {
  kind: string;
  systemLabel: string;
  installYear: number | null;
  installSource: string;
  confidence: number;
  verified: boolean;
  // Computed lifecycle fields
  replacementWindow: {
    earlyYear: number;
    likelyYear: number;
    lateYear: number;
  };
  lifecycleStage: 'early' | 'mid' | 'late';
  dataQuality: 'high' | 'medium' | 'low';
}

function enrichSystemWithLifecycle(
  system: SystemRow,
  property: LifecyclePropertyContext,
  region: RegionContext
): EnrichedSystemContext {
  const currentYear = new Date().getFullYear();
  
  // Build resolved install input for calculator
  const resolvedInstall: ResolvedInstallInput = {
    installYear: system.install_year,
    installSource: (system.install_source as any) || 'heuristic',
    confidenceScore: system.confidence || 0.3,
    replacementStatus: (system.replacement_status as any) || 'unknown',
    rationale: ''
  };
  
  // Calculate lifecycle using pure math
  const lifecycle = calculateSystemLifecycle(
    system.kind as 'hvac' | 'roof' | 'water_heater',
    resolvedInstall,
    property,
    region
  );
  
  // Determine lifecycle stage
  const age = currentYear - (system.install_year || property.yearBuilt);
  const midpoint = (lifecycle.replacementWindow.earlyYear - (system.install_year || property.yearBuilt)) / 2;
  const lifecycleStage = 
    age < midpoint ? 'early' :
    age < lifecycle.replacementWindow.earlyYear - (system.install_year || property.yearBuilt) ? 'mid' : 'late';
  
  return {
    kind: system.kind,
    systemLabel: lifecycle.systemLabel,
    installYear: system.install_year,
    installSource: system.install_source || 'heuristic',
    confidence: system.confidence || 0.3,
    verified: system.install_source !== 'heuristic' && system.install_source !== null,
    replacementWindow: lifecycle.replacementWindow,
    lifecycleStage,
    dataQuality: dataQualityFromConfidence(system.confidence || 0.3)
  };
}
```

### 4. Update System Prompt Context Formatting (line 434)

**Before:**
```typescript
const systemInfo = context.systems.map((s: any) => 
  `- ${s.system_name}: ${s.current_condition || 'Good'} (installed ${s.installed_year || 'unknown'})`
).join('\n');
```

**After:**
```typescript
const systemInfo = context.systems.map((s: EnrichedSystemContext) => {
  const verifiedNote = s.verified ? ' [verified]' : ' [estimated]';
  const stageNote = s.lifecycleStage === 'late' ? ' — approaching replacement window' : '';
  return `- ${s.systemLabel}: installed ${s.installYear || 'unknown'}${verifiedNote}${stageNote}`;
}).join('\n');
```

### 5. Add Verified Language Rules to System Prompt

Add to the system prompt when systems have verified data:

```typescript
// Build verified language instructions
const verifiedSystems = context.systems.filter((s: EnrichedSystemContext) => s.verified);
let verifiedLanguageRules = '';

if (verifiedSystems.length > 0) {
  verifiedLanguageRules = `
VERIFIED DATA LANGUAGE RULES:
${verifiedSystems.map((s: EnrichedSystemContext) => {
  const sourceLabel = s.installSource === 'user' || s.installSource === 'owner_reported' 
    ? 'based on the information you provided'
    : s.installSource === 'permit_verified' || s.installSource === 'permit'
    ? 'per your permit records'
    : s.installSource === 'photo' 
    ? 'based on the label you uploaded'
    : 'based on confirmed data';
  
  return `- For ${s.systemLabel}: Say "${sourceLabel}, your ${s.systemLabel.toLowerCase()} was installed in ${s.installYear}." NOT "Based on typical lifespans..."`;
}).join('\n')}

FORBIDDEN when referencing verified systems:
- "Based on typical lifespans..."
- "Estimated age..."
- "Approximately..."
- "We estimate..."
`;
}
```

### 6. Fetch Home Data for Property Context

Extend the homes query to get yearBuilt and state for lifecycle calculations:

```typescript
supabase.from('homes').select('id, latitude, longitude, city, state, zip_code, year_built').eq('id', propertyId).single()
```

---

## Verification Flow After Fix

1. **Photo uploaded** → `home_systems` updated ✅
2. **Photo uploaded** → `systems` updated (via `syncToCanonicalSystems`) ✅
3. **AI reads from** → `systems` ✅ (NEW)
4. **Lifecycle computed** → at request time using pure calculators ✅
5. **AI uses verified language** → when `install_source !== 'heuristic'` ✅

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No systems in `systems` table | Fall back to empty array, AI acknowledges no registered systems |
| System has `install_source = 'heuristic'` | Use estimated language, compute lifecycle from yearBuilt fallback |
| System has verified data | Use verified language, compute lifecycle from actual install_year |
| Mixed verified/estimated | Per-system language rules in prompt |

---

## Deprecation Path for `system_lifecycles`

After this change:
- `ai-home-assistant` reads from `systems`
- `capital-timeline` already reads from `systems`
- `intelligence-engine` reads from `system_lifecycles` (still needs migration)

**Future work:** Migrate `intelligence-engine` to `systems` and deprecate `system_lifecycles` table entirely.

---

## Testing Checklist

After implementation:
- [ ] AI reads from `systems` table (confirm via logs)
- [ ] Photo upload updates are visible to AI immediately
- [ ] Verified systems use verified language ("based on the label you uploaded...")
- [ ] Estimated systems use estimated language ("based on typical lifespans...")
- [ ] Lifecycle fields (stage, replacement window) are computed correctly
- [ ] No regression in existing AI capabilities (tools, planning sessions, etc.)

