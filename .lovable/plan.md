

# Fix: System Record Case-Sensitivity and Authority Resolution (Final)

## Problem Summary

The `/systems` page shows inconsistent ages because:
1. **Duplicate records exist** with case mismatches (`ROOF` vs `roof`, `HVAC` vs `hvac`)
2. **Case-sensitive lookups** in edge functions match the wrong records
3. **No tiebreaking logic** when multiple records have the same authority

**Current Database State (Home `46ba7ab3...`):**

| kind | install_year | install_source | confidence |
|------|--------------|----------------|------------|
| `hvac` | 2023 | permit_verified | 0.85 |
| `HVAC` | 2023 | owner_reported | 0.80 |
| `roof` | 2010 | owner_reported | 0.70 (Wrong - house built 2012!) |
| `ROOF` | null | heuristic | 0.30 |
| `water_heater` | 2012 | owner_reported | 0.60 |
| `WATER_HEATER` | 2015 | heuristic | 0.20 |

---

## Solution Overview

### Phase 1: Database Cleanup (SQL Migration)
1. Create safety backup
2. Create case-insensitive index for performance
3. Delete all duplicates except the highest-authority record
4. Normalize remaining `kind` values to lowercase
5. Fix the roof install year for this specific home
6. Add unique constraint to prevent future duplicates

### Phase 2: Edge Function Updates
1. **update-system-install**: Case-insensitive lookup, proper tiebreaking, defensive duplicate cleanup, race condition handling
2. **capital-timeline**: Case-insensitive matching with authority preference

---

## Technical Changes

### Migration Script (with Backup and Verification)

```sql
-- ================================================================
-- PHASE 0: BACKUP (Run First!)
-- ================================================================
CREATE TABLE IF NOT EXISTS systems_backup_20260201 AS 
SELECT * FROM systems;

-- Verify backup
SELECT COUNT(*) as original_count FROM systems;
SELECT COUNT(*) as backup_count FROM systems_backup_20260201;
-- Counts should match

-- ================================================================
-- PHASE 1: Create index for performance
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_systems_home_kind_lower 
ON systems (home_id, LOWER(kind));

-- VERIFY: Index created
SELECT indexname FROM pg_indexes 
WHERE tablename = 'systems' AND indexname = 'idx_systems_home_kind_lower';

-- ================================================================
-- PHASE 2: Delete all duplicates except highest-authority record
-- ================================================================
WITH ranked_systems AS (
  SELECT 
    id,
    home_id,
    LOWER(kind) as normalized_kind,
    kind,
    install_source,
    confidence,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY home_id, LOWER(kind)
      ORDER BY 
        CASE install_source 
          WHEN 'permit_verified' THEN 4 
          WHEN 'inspection' THEN 3 
          WHEN 'owner_reported' THEN 2 
          ELSE 1 
        END DESC,
        confidence DESC NULLS LAST,
        created_at DESC NULLS LAST
    ) as rank
  FROM systems
)
DELETE FROM systems
WHERE id IN (
  SELECT id FROM ranked_systems WHERE rank > 1
);

-- VERIFY: No duplicates remain
SELECT home_id, LOWER(kind), COUNT(*) as count
FROM systems 
GROUP BY home_id, LOWER(kind) 
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- ================================================================
-- PHASE 3: Normalize all kind values to lowercase
-- ================================================================
UPDATE systems
SET kind = LOWER(kind)
WHERE kind != LOWER(kind);

-- VERIFY: All lowercase
SELECT COUNT(*) as non_lowercase_count 
FROM systems 
WHERE kind != LOWER(kind);
-- Should return 0

-- ================================================================
-- PHASE 4: Fix roof install year for specific home
-- ================================================================
UPDATE systems 
SET 
  install_year = 2012, 
  install_source = 'owner_reported', 
  replacement_status = 'original',
  confidence = 0.7,
  updated_at = NOW()
WHERE home_id = '46ba7ab3-1682-422d-8cd4-de6ae4f40794' 
AND LOWER(kind) = 'roof'
RETURNING *;
-- Should return 1 row with install_year = 2012

-- ================================================================
-- PHASE 5: Add unique constraint to prevent future duplicates
-- ================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_systems_home_kind_unique
ON systems (home_id, LOWER(kind));

-- VERIFY: Constraint created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'systems' AND indexname = 'idx_systems_home_kind_unique';

-- ================================================================
-- FINAL VERIFICATION: Try to insert duplicate (should fail)
-- ================================================================
DO $$
BEGIN
  INSERT INTO systems (home_id, kind, install_year)
  VALUES ('46ba7ab3-1682-422d-8cd4-de6ae4f40794', 'ROOF', 2023);
  RAISE EXCEPTION 'Duplicate insert should have failed!';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Good: Unique constraint is working';
END $$;
```

---

### Rollback Script (If Needed)

```sql
-- ROLLBACK SCRIPT - Only run if migration failed

-- Step 1: Drop the unique constraint
DROP INDEX IF EXISTS idx_systems_home_kind_unique;

-- Step 2: Restore from backup
DELETE FROM systems;
INSERT INTO systems SELECT * FROM systems_backup_20260201;

-- Step 3: Verify restoration
SELECT COUNT(*) FROM systems;
SELECT COUNT(*) FROM systems_backup_20260201;
-- Counts should match
```

---

### File 1: `supabase/functions/update-system-install/index.ts`

**Add Helper Function (after line 78):**

```typescript
/**
 * Pick the highest-authority record from duplicates
 * Tiebreaking: authority -> confidence -> created_at (newest wins)
 */
function pickHighestAuthorityRecord(records: any[]): any {
  const authorityOrder: Record<string, number> = {
    'permit_verified': 4,
    'inspection': 3,
    'owner_reported': 2,
    'heuristic': 1,
  };
  
  return records.reduce((best, current) => {
    const bestAuth = authorityOrder[best.install_source] || 0;
    const currentAuth = authorityOrder[current.install_source] || 0;
    
    // 1. Higher authority wins
    if (currentAuth > bestAuth) return current;
    if (currentAuth < bestAuth) return best;
    
    // 2. Same authority: higher confidence wins
    const bestConf = best.confidence || 0;
    const currentConf = current.confidence || 0;
    if (currentConf > bestConf) return current;
    if (currentConf < bestConf) return best;
    
    // 3. Same authority + confidence: newer record wins
    const bestDate = new Date(best.created_at || 0).getTime();
    const currentDate = new Date(current.created_at || 0).getTime();
    return currentDate > bestDate ? current : best;
  });
}
```

**Replace System Lookup (lines 216-222):**

Current:
```typescript
const { data: existingSystem, error: systemError } = await supabaseAdmin
  .from('systems')
  .select('*')
  .eq('home_id', homeId)
  .eq('kind', systemKey)  // Case-sensitive!
  .maybeSingle();
```

New:
```typescript
// Normalize kind to lowercase for consistent storage
const normalizedKind = systemKey.toLowerCase();

// Case-insensitive lookup - find all variants
const { data: existingSystems, error: systemError } = await supabaseAdmin
  .from('systems')
  .select('*')
  .eq('home_id', homeId)
  .ilike('kind', normalizedKind);

// Pick highest-authority record if multiple exist
const existingSystem = existingSystems && existingSystems.length > 0
  ? pickHighestAuthorityRecord(existingSystems)
  : null;

// Log if duplicates found (shouldn't happen after cleanup)
if (existingSystems && existingSystems.length > 1) {
  console.warn(`[update-system-install] Found ${existingSystems.length} duplicate records for ${normalizedKind}`);
}
```

**Normalize `kind` on Write (line 315):**

Current:
```typescript
kind: systemKey,
```

New:
```typescript
kind: normalizedKind, // Always lowercase
```

**Add Duplicate Cleanup After Update (after line 341):**

```typescript
// Defensive cleanup: delete any remaining duplicates
if (existingSystems && existingSystems.length > 1) {
  const duplicateIds = existingSystems
    .filter(s => s.id !== existingSystem.id)
    .map(s => s.id);
    
  console.warn('[update-system-install] Cleaning up duplicates:', duplicateIds);
  await supabaseAdmin
    .from('systems')
    .delete()
    .in('id', duplicateIds);
}
```

**Handle Race Condition on Insert (replace lines 344-358):**

```typescript
} else {
  // Insert new
  const { data, error: insertError } = await supabaseAdmin
    .from('systems')
    .insert(systemPayload)
    .select()
    .single();

  // Handle race condition if unique constraint fires
  if (insertError) {
    if (insertError.code === '23505') { // Unique constraint violation
      console.warn('[update-system-install] Duplicate detected during insert, retrying update...');
      
      // Another process created the record between our check and insert
      const { data: retrySystem } = await supabaseAdmin
        .from('systems')
        .select('*')
        .eq('home_id', homeId)
        .ilike('kind', normalizedKind)
        .single();
        
      if (retrySystem) {
        const { data: retryData } = await supabaseAdmin
          .from('systems')
          .update(systemPayload)
          .eq('id', retrySystem.id)
          .select()
          .single();
          
        updatedSystem = retryData;
      } else {
        throw insertError;
      }
    } else {
      console.error('Error inserting system:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create system' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } else {
    updatedSystem = data;
  }
}
```

---

### File 2: `supabase/functions/capital-timeline/index.ts`

**Add Helper Function (after line 178, after SystemRow interface):**

```typescript
/**
 * Select the best system record from potentially duplicate records
 * Uses case-insensitive matching and authority-based selection
 */
function selectBestSystemRecord(
  systems: SystemRow[] | null,
  systemType: string
): SystemRow | undefined {
  if (!systems) return undefined;
  
  // Case-insensitive matching
  const matching = systems.filter(s => 
    s.kind.toLowerCase() === systemType.toLowerCase()
  );
  
  if (matching.length === 0) return undefined;
  if (matching.length === 1) return matching[0];
  
  // Log warning if duplicates found (shouldn't happen after cleanup)
  console.warn(
    `[capital-timeline] Found ${matching.length} records for "${systemType}". Using authority resolution.`
  );
  
  // Authority priority with proper tiebreaking
  const authorityOrder: Record<string, number> = {
    'permit_verified': 4,
    'inspection': 3,
    'owner_reported': 2,
    'heuristic': 1,
  };
  
  return matching.reduce((best, current) => {
    const bestAuth = authorityOrder[best.install_source || 'heuristic'] || 0;
    const currentAuth = authorityOrder[current.install_source || 'heuristic'] || 0;
    
    // 1. Higher authority wins
    if (currentAuth > bestAuth) return current;
    if (currentAuth < bestAuth) return best;
    
    // 2. Same authority: higher confidence wins
    const bestConf = best.confidence || 0;
    const currentConf = current.confidence || 0;
    if (currentConf > bestConf) return current;
    if (currentConf < bestConf) return best;
    
    // 3. Same authority + confidence: newer record wins
    const bestDate = new Date(best.created_at || 0).getTime();
    const currentDate = new Date(current.created_at || 0).getTime();
    return currentDate > bestDate ? current : best;
  });
}
```

**Replace System Lookups:**

Line 463-464 (property context):
```typescript
// Current
roofMaterial: systems?.find(s => s.kind === 'roof')?.material || 'unknown',
waterHeaterType: systems?.find(s => s.kind === 'water_heater')?.material || 'unknown',

// New
roofMaterial: selectBestSystemRecord(systems, 'roof')?.material || 'unknown',
waterHeaterType: selectBestSystemRecord(systems, 'water_heater')?.material || 'unknown',
```

Line 471 (system-detail action):
```typescript
// Current
const userSystem = systems?.find(s => s.kind === systemType);

// New
const userSystem = selectBestSystemRecord(systems, systemType);
```

Line 505 (timeline loop):
```typescript
// Current
const userSystem = systems?.find(s => s.kind === sysType);

// New
const userSystem = selectBestSystemRecord(systems, sysType);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/update-system-install/index.ts` | Add `pickHighestAuthorityRecord` helper, case-insensitive lookup with `ilike`, normalize `kind` to lowercase, defensive duplicate cleanup, race condition handling |
| `supabase/functions/capital-timeline/index.ts` | Add `selectBestSystemRecord` helper, replace all `find()` calls with case-insensitive + authority-aware selection |

---

## Pre-Deployment Checklist

### Database Migration
- [ ] Create backup of systems table
- [ ] Run migration script in staging/test environment first
- [ ] Verify each phase completes successfully
- [ ] Test unique constraint prevents duplicates
- [ ] Verify roof install year is corrected
- [ ] Keep backup table for at least 7 days

### Code Deployment
- [ ] Deploy update-system-install with case-insensitive lookup
- [ ] Deploy capital-timeline with selectBestSystemRecord
- [ ] Verify edge function logs show no duplicate warnings
- [ ] Test update flow: "roof is original" updates correctly
- [ ] Test insert flow: "furnace installed 2020" inserts lowercase

### Verification
- [ ] No duplicate records exist
- [ ] All kind values are lowercase
- [ ] Roof shows 2012 (not 2010)
- [ ] System ages are correct on /systems page
- [ ] Unique constraint blocks duplicate inserts

---

## Monitoring Query (Run Daily)

```sql
-- Alert if duplicates appear after the fix
SELECT 
  home_id,
  LOWER(kind) as system_type,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(kind) as case_variants,
  ARRAY_AGG(install_source) as sources,
  ARRAY_AGG(install_year) as years
FROM systems
GROUP BY home_id, LOWER(kind)
HAVING COUNT(*) > 1;
```

---

## Expected Results After Fix

| System | Current Age | Expected After Fix |
|--------|-------------|-------------------|
| HVAC | ~3 years | ~3 years (2023, permit-verified) |
| Roof | ~16 years | ~14 years (2012, original) |
| Water Heater | ~14 years | ~14 years (2012, original) |

