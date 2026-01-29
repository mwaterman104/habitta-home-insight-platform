
# Canonical Consistency Contract: Photo Data → Systems Table

## Problem Summary

When a user uploads a photo of a system label (e.g., water heater), the extracted data:
1. Is analyzed via `analyze-device-photo` edge function
2. Is saved to `home_systems` table (rich fields: brand, model, serial)
3. **Never reaches the canonical `systems` table** (which the AI, capital timeline, and intelligence engine read)

Additionally, there's evidence that the photo analysis edge function isn't consistently triggering — the database shows a recent upload with `status: uploaded` but **zero logs** from `analyze-device-photo`.

**Current State Evidence:**
- `photo_transfer_sessions`: Photo uploaded at 11:43 today, `status: uploaded`, photo URL exists
- `analyze-device-photo` logs: **Empty** — function never fired
- `home_systems` table: No water heater record (only an LG appliance from January 24)
- `systems` table: Water heater exists with `install_year: 2012`, `install_source: owner_reported`, `confidence: 0.6`

**Result:** The AI is "forgetful" — user provided evidence, but Habitta didn't absorb it.

---

## Root Causes

### Issue 1: Photo Analysis Not Triggering

The `QRPhotoSession` polling detects `status: uploaded` and calls `onPhotoReceived`, but somewhere in the callback chain:
```
QRPhotoSession.onPhotoReceived → ChatPhotoUpload.handleQRPhotoReceived → ChatConsole.handlePhotoAnalysis → fetch(analyze-device-photo)
```
...the analysis never fires. Likely causes:
- Modal closes before fetch completes
- Component unmounts during async operation
- No error handling/retry for dropped callbacks

### Issue 2: `applySystemUpdate` Only Writes to `home_systems`

Even when photo analysis works, the data never syncs to the canonical `systems` table:
- `applySystemUpdate` writes exclusively to `home_systems`
- `capital-timeline`, `intelligence-engine`, and AI context read from `systems`
- **Two tables, zero sync**

---

## Solution Architecture

### Part 1: Fix Photo Analysis Trigger Reliability

**Problem:** Callback chain drops when modal closes.

**Fix:** Add defensive logging and ensure callback completes before modal state change.

```typescript
// ChatPhotoUpload.tsx - handleQRPhotoReceived
const handleQRPhotoReceived = async (photoUrl: string) => {
  console.log('[ChatPhotoUpload] Photo received via QR, triggering analysis:', photoUrl.substring(0, 50));
  
  // Show toast immediately (user feedback)
  toast({
    title: "Photo received",
    description: "Analyzing your photo...",
  });
  
  // CRITICAL: Call the callback BEFORE closing modal
  // This ensures the async chain starts before unmount
  onPhotoReady(photoUrl);
  
  // Then close modal (after callback initiated)
  setShowQRModal(false);
};
```

**Add logging to `ChatConsole.handlePhotoAnalysis`:**
```typescript
const handlePhotoAnalysis = useCallback(async (photoUrl: string) => {
  console.log('[ChatConsole] handlePhotoAnalysis called with URL:', photoUrl.substring(0, 50));
  // ... rest of function
```

### Part 2: Dual-Write to Canonical `systems` Table

**Pattern:** When `applySystemUpdate` writes to `home_systems`, also upsert to `systems` for core system types.

**Authority Hierarchy Mapping:**
| `SystemUpdateSource` | `systems.install_source` | Confidence |
|---------------------|-------------------------|------------|
| `photo_analysis`    | `owner_reported`        | 0.6        |
| `permit_record`     | `permit_verified`       | 0.85       |
| `user_confirmed`    | `owner_reported`        | 0.7        |
| `inferred`          | `heuristic`             | 0.3        |

**New File: `src/lib/systemUpdates/syncToCanonicalSystems.ts`**

```typescript
interface SyncInput {
  home_id: string;
  kind: string;
  manufactureYear?: number;
  confidence: number;
  source: SystemUpdateSource;
  photoUrl?: string;
}

/**
 * Sync photo analysis data to canonical 'systems' table.
 * 
 * AUTHORITY RULES:
 * - permit_verified (0.85) > owner_reported (0.60-0.70) > heuristic (0.30)
 * - Photo evidence CANNOT overwrite permit-verified data
 * - Photo evidence CAN upgrade heuristic data
 */
export async function syncToCanonicalSystems(input: SyncInput): Promise<void> {
  // ... implementation
}
```

### Part 3: Guard Install Year Inference

**Problem:** `manufacture_year` ≠ `install_year`. Units can sit in inventory for 1-3 years.

**Fix:** Introduce inference rules with explicit uncertainty:

```typescript
interface InferInstallYearResult {
  year: number | null;
  isEstimated: boolean;
  basis: 'serial_decode' | 'manufacture_year' | 'unknown';
}

function inferInstallYear(manufactureYear?: number, confidence?: number): InferInstallYearResult {
  if (!manufactureYear) {
    return { year: null, isEstimated: true, basis: 'unknown' };
  }
  
  // If high confidence (serial decode worked), trust manufacture year
  if (confidence && confidence >= 0.7) {
    return { year: manufactureYear, isEstimated: false, basis: 'serial_decode' };
  }
  
  // Otherwise, add 1 year buffer (median inventory time)
  return { 
    year: manufactureYear + 1, 
    isEstimated: true, 
    basis: 'manufacture_year' 
  };
}
```

### Part 4: Make Dual-Write Idempotent

**Problem:** Same photo processed multiple times could inflate confidence.

**Fix:** Add processing hash guard:

```typescript
// In applySystemUpdate or syncToCanonicalSystems
const processHash = btoa(`${image_url}:${system_key}`).substring(0, 20);

// Check if already processed
const { data: existing } = await supabase
  .from('systems')
  .select('raw_data')
  .eq('home_id', home_id)
  .ilike('kind', kind);

const previousHashes = existing?.raw_data?.processed_photo_hashes || [];
if (previousHashes.includes(processHash)) {
  console.log('[syncToCanonical] Skipping duplicate photo processing');
  return;
}

// After update, append hash
await supabase
  .from('systems')
  .update({ 
    raw_data: { 
      ...existing.raw_data, 
      processed_photo_hashes: [...previousHashes, processHash] 
    } 
  });
```

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `src/components/dashboard-v3/ChatPhotoUpload.tsx` | Reorder callback before modal close, add logging | P0 (blocking) |
| `src/components/dashboard-v3/ChatConsole.tsx` | Add logging to `handlePhotoAnalysis` | P0 (blocking) |
| `src/lib/systemUpdates/syncToCanonicalSystems.ts` | **New file**: Dual-write helper | P0 |
| `src/lib/systemUpdates/applySystemUpdate.ts` | Call `syncToCanonicalSystems` after `home_systems` write | P0 |
| `src/lib/systemUpdates/authority.ts` | Add source-to-install_source mapping | P1 |
| `src/lib/systemUpdates/index.ts` | Export new function | P1 |

---

## Technical Specification

### syncToCanonicalSystems Interface

```typescript
interface SyncInput {
  home_id: string;
  kind: 'hvac' | 'roof' | 'water_heater';  // Core systems only
  manufactureYear?: number;
  confidence: number;
  source: SystemUpdateSource;
  photoUrl?: string;
}

interface SyncResult {
  synced: boolean;
  reason?: 'higher_authority_exists' | 'duplicate_photo' | 'synced' | 'created';
}
```

### Authority Comparison Logic

```typescript
const INSTALL_SOURCE_PRIORITY: Record<string, number> = {
  permit_verified: 4,
  inspection: 3,
  owner_reported: 2,
  heuristic: 1,
};

function canOverwrite(existing: string | null, incoming: string): boolean {
  const existingPriority = existing ? INSTALL_SOURCE_PRIORITY[existing] || 0 : 0;
  const incomingPriority = INSTALL_SOURCE_PRIORITY[incoming] || 0;
  return incomingPriority >= existingPriority;
}
```

---

## Database Impact

When photo analysis succeeds for a core system:

1. **`home_systems`** (existing behavior):
   - Creates/updates record with brand, model, serial, images
   - Stores field_provenance with authority tracking

2. **`systems`** (new behavior):
   - Updates `install_year` from inferred year (with buffer)
   - Updates `install_source` to `owner_reported`
   - Updates `confidence` (respecting authority hierarchy)
   - Appends photo hash to `raw_data.processed_photo_hashes`
   - Preserves `permit_verified` data (never overwrites)

---

## Testing Checklist

### Part 1: Photo Analysis Trigger

| Step | Expected |
|------|----------|
| Upload photo via mobile direct upload | `analyze-device-photo` logs show function called |
| Upload photo via QR transfer (desktop) | `analyze-device-photo` logs show function called |
| Close QR modal while polling | Analysis still completes (callback fired before close) |
| Check console logs | `[ChatConsole] handlePhotoAnalysis called with URL:` appears |

### Part 2: Dual-Write Sync

| Step | Expected |
|------|----------|
| Upload water heater photo | `systems` table updates with new confidence |
| Upload photo for permit-verified HVAC | `systems` table NOT overwritten (higher authority) |
| Upload same photo twice | Second upload skipped (idempotent hash check) |
| Check AI chat context | AI references updated system data |

### Part 3: Install Year Inference

| Step | Expected |
|------|----------|
| Photo with serial decode (high confidence) | `install_year` = `manufacture_year` |
| Photo without serial (low confidence) | `install_year` = `manufacture_year + 1`, marked estimated |
| Photo with no manufacture year | No `install_year` update |

---

## Doctrine Addition

Add to `src/lib/systemUpdates/index.ts`:

```typescript
/**
 * CANONICAL CONSISTENCY CONTRACT (IMMUTABLE):
 * 
 * Any data that can influence:
 * - System state (stable/watch/plan)
 * - Capital timeline projections
 * - AI chat responses
 * - Confidence scoring
 * 
 * MUST land in the canonical `systems` table, not just `home_systems`.
 * 
 * The `systems` table is the single source of truth for:
 * - capital-timeline edge function
 * - intelligence-engine edge function
 * - AI home assistant context
 * - Dashboard baseline derivation
 */
```

---

## Summary

This fix implements a **Canonical Consistency Contract** ensuring:

1. **Photo analysis reliably triggers** (defensive logging + callback ordering)
2. **Photo data syncs to canonical systems table** (dual-write pattern)
3. **Authority hierarchy is preserved** (permit > photo > heuristic)
4. **Install year inference is guarded** (manufacture_year ≠ install_year)
5. **Duplicate processing is prevented** (idempotent hash check)

After this fix, when a user uploads a water heater photo:
- The AI will immediately see the updated data
- Capital timeline will reflect the new install year
- Confidence will increase appropriately
- The system state may transition from WATCH to OK if data improves

This transforms Habitta from "forgetful assistant" to "reliable steward."
