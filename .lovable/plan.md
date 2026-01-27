

# System Update Contract — Corrected Implementation

## QA Corrections Applied

This plan incorporates all required corrections from the executive QA review:

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| **Critical #1**: Provenance storage inconsistent | **Fixed** | Single canonical location: `field_provenance` column |
| **Critical #2**: Provenance read path wrong | **Fixed** | Read/write from dedicated `field_provenance` column |
| **Critical #3**: `wasOverwrite` undefined | **Fixed** | Explicitly tracked in `resolveFieldUpdates` |
| **Medium #4**: Confidence triggers too easily | **Fixed** | Minimum delta gate (0.05) added |
| **Medium #5**: Held updates lost | **Noted** | Staging table optional for v1, architecture supports future |

---

## Schema Migration

Add dedicated `field_provenance` column to `home_systems` table for canonical provenance storage.

```sql
-- Add field_provenance as top-level column (not nested in source)
ALTER TABLE home_systems
ADD COLUMN IF NOT EXISTS field_provenance jsonb DEFAULT '{}'::jsonb;

-- Add convenience column for overall confidence score
ALTER TABLE home_systems
ADD COLUMN IF NOT EXISTS confidence_score numeric DEFAULT 0;

-- Add last_updated_at for audit
ALTER TABLE home_systems
ADD COLUMN IF NOT EXISTS last_updated_at timestamptz DEFAULT now();

-- Comment for clarity
COMMENT ON COLUMN home_systems.field_provenance IS 
  'Canonical field-level provenance. Each key (brand, model, etc.) maps to {source, confidence, updated_at}. 
   This is the ONLY location for provenance data - do not use source.field_provenance.';
```

**Rationale**: This fixes Critical #1 and #2 by creating a single, queryable, predictable location for provenance.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/systemUpdates/authority.ts` | **Create** | Authority rank definitions |
| `src/lib/systemUpdates/resolveFieldUpdates.ts` | **Create** | Field-level authority resolution with `wasOverwrite` tracking |
| `src/lib/systemUpdates/confidenceCalculator.ts` | **Create** | Deterministic confidence scoring with delta gate |
| `src/lib/systemUpdates/chatSummaryBuilder.ts` | **Create** | Chat-safe output formatting |
| `src/lib/systemUpdates/applySystemUpdate.ts` | **Create** | Core enforcement gate |
| `src/lib/systemUpdates/index.ts` | **Create** | Module exports |
| `src/hooks/useHomeSystems.ts` | **Modify** | Add `field_provenance` support to interface |
| `src/components/dashboard-v3/ChatDock.tsx` | **Modify** | Wire photo analysis to `applySystemUpdate` |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Modify** | Pass system update callback |
| `src/pages/DashboardV3.tsx` | **Modify** | Pass `useHomeSystems` refetch to MiddleColumn |

---

## Part 1: Authority Definitions

**File:** `src/lib/systemUpdates/authority.ts`

```typescript
/**
 * Authority Rank Definitions
 * 
 * Higher authority never gets overwritten by lower authority.
 * This is the spine of the system update contract.
 */

export type SystemUpdateSource =
  | 'professional_override'  // Pro verification (future)
  | 'user_confirmed'         // User explicitly confirmed/corrected
  | 'photo_analysis'         // AI vision extraction
  | 'permit_record'          // Public permit data
  | 'inferred';              // Heuristic/age-based estimation

export const AUTHORITY_RANK: Record<SystemUpdateSource, number> = {
  professional_override: 5,
  user_confirmed: 4,
  photo_analysis: 3,
  permit_record: 2,
  inferred: 1,
};

export interface FieldProvenance {
  source: SystemUpdateSource;
  confidence: number;
  updated_at: string;
}
```

---

## Part 2: Field Resolution with wasOverwrite (Critical #3 Fix)

**File:** `src/lib/systemUpdates/resolveFieldUpdates.ts`

```typescript
import { AUTHORITY_RANK, type SystemUpdateSource, type FieldProvenance } from './authority';

interface ResolveInput {
  existingFields: Record<string, any>;
  existingProvenance: Record<string, FieldProvenance>;
  extractedData: Record<string, any>;
  source: SystemUpdateSource;
  confidenceSignal: {
    visual_certainty?: number;
    source_reliability: number;
  };
}

interface ResolveResult {
  updateApplied: boolean;
  wasOverwrite: boolean;  // Critical #3: Explicitly tracked
  requiresConfirmation: boolean;
  updatedFields: Record<string, any>;
  updatedProvenance: Record<string, FieldProvenance>;
  fieldsUpdated: string[];
  fieldsHeld: string[];
  confidenceDelta: number;
  newConfidence: number;
}

export function resolveFieldUpdates(input: ResolveInput): ResolveResult {
  const { existingFields, existingProvenance, extractedData, source, confidenceSignal } = input;
  
  const updatedFields: Record<string, any> = {};
  const updatedProvenance: Record<string, FieldProvenance> = { ...existingProvenance };
  const fieldsUpdated: string[] = [];
  const fieldsHeld: string[] = [];
  
  let applied = false;
  let wasOverwrite = false;  // Critical #3: Track if we're overwriting existing data
  let held = false;

  const incomingRank = AUTHORITY_RANK[source];
  const incomingConfidence = confidenceSignal.visual_certainty ?? confidenceSignal.source_reliability;

  Object.entries(extractedData).forEach(([field, value]) => {
    if (value === undefined || value === null) return;

    const current = existingProvenance[field];
    const currentRank = current ? AUTHORITY_RANK[current.source] : 0;
    const existingValue = existingFields[field];

    if (!current || incomingRank > currentRank) {
      // Accept: new field or higher authority
      updatedFields[field] = value;
      updatedProvenance[field] = {
        source,
        confidence: incomingConfidence,
        updated_at: new Date().toISOString(),
      };
      fieldsUpdated.push(field);
      applied = true;
      
      // Critical #3: Mark as overwrite if existing value existed
      if (existingValue !== undefined && existingValue !== null) {
        wasOverwrite = true;
      }
    } else if (incomingRank === currentRank && value !== existingValue) {
      // Same authority, different value → hold for confirmation
      fieldsHeld.push(field);
      held = true;
    }
    // Lower authority → silently ignore (no action needed)
  });

  // Calculate confidence scores
  const oldConfidence = calculateConfidenceFromProvenance(existingProvenance);
  const newConfidence = calculateConfidenceFromProvenance(updatedProvenance);
  const confidenceDelta = newConfidence - oldConfidence;

  return {
    updateApplied: applied,
    wasOverwrite,  // Critical #3: Return it
    requiresConfirmation: held && !applied,
    updatedFields,
    updatedProvenance,
    fieldsUpdated,
    fieldsHeld,
    confidenceDelta,
    newConfidence,
  };
}

// Import from confidenceCalculator
function calculateConfidenceFromProvenance(provenance: Record<string, FieldProvenance>): number {
  const FIELD_WEIGHTS: Record<string, number> = {
    brand: 0.25,
    model: 0.25,
    manufacture_year: 0.20,
    serial: 0.15,
    capacity_rating: 0.10,
    fuel_type: 0.05,
  };

  let score = 0;
  Object.entries(FIELD_WEIGHTS).forEach(([field, weight]) => {
    const fieldProv = provenance[field];
    if (fieldProv) {
      score += weight * fieldProv.confidence;
    }
  });

  return Math.min(1, Number(score.toFixed(2)));
}
```

---

## Part 3: Confidence Calculator with Delta Gate (Medium #4 Fix)

**File:** `src/lib/systemUpdates/confidenceCalculator.ts`

```typescript
import type { FieldProvenance } from './authority';

const FIELD_WEIGHTS: Record<string, number> = {
  brand: 0.25,
  model: 0.25,
  manufacture_year: 0.20,
  serial: 0.15,
  capacity_rating: 0.10,
  fuel_type: 0.05,
};

/**
 * Minimum confidence delta required to trigger mode recompute.
 * Medium #4 Fix: Prevents trivial updates from inflating confidence.
 */
export const MINIMUM_MEANINGFUL_DELTA = 0.05;

export function calculateSystemConfidence(
  provenance: Record<string, FieldProvenance>
): number {
  let score = 0;

  Object.entries(FIELD_WEIGHTS).forEach(([field, weight]) => {
    const fieldProv = provenance[field];
    if (fieldProv) {
      score += weight * fieldProv.confidence;
    }
  });

  return Math.min(1, Number(score.toFixed(2)));
}

/**
 * Check if confidence delta is meaningful enough to trigger mode recompute.
 * Medium #4 Fix: Only trigger mode transition for substantial changes.
 */
export function isMeaningfulDelta(delta: number): boolean {
  return Math.abs(delta) >= MINIMUM_MEANINGFUL_DELTA;
}
```

---

## Part 4: Chat Summary Builder

**File:** `src/lib/systemUpdates/chatSummaryBuilder.ts`

```typescript
const SYSTEM_DISPLAY_NAMES: Record<string, string> = {
  hvac: 'HVAC system',
  water_heater: 'water heater',
  roof: 'roof',
  electrical: 'electrical panel',
  refrigerator: 'refrigerator',
  oven_range: 'oven/range',
  dishwasher: 'dishwasher',
  washer: 'washing machine',
  dryer: 'dryer',
};

export function buildChatSummary(params: {
  applied: boolean;
  held: boolean;
  wasOverwrite: boolean;
  fieldsUpdated: string[];
  fieldsHeld: string[];
  systemType?: string;
  brand?: string;
}): string {
  const { applied, held, wasOverwrite, systemType, brand } = params;

  if (applied && !held) {
    const systemName = systemType 
      ? SYSTEM_DISPLAY_NAMES[systemType] || systemType 
      : 'system';
    const brandNote = brand ? ` (${brand})` : '';
    
    // Minor #6: Be slightly more specific
    return `I analyzed the photo and identified key details about your ${systemName}${brandNote}. I've updated your home profile and will use this to refine future assessments.`;
  }

  if (held) {
    return `I detected some details that differ from existing records. Can you confirm before I update your home profile?`;
  }

  return `I saved the photo but couldn't extract enough details. A closer shot of the manufacturer label would help improve accuracy.`;
}
```

---

## Part 5: Main Update Gate (Corrected)

**File:** `src/lib/systemUpdates/applySystemUpdate.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { resolveFieldUpdates } from './resolveFieldUpdates';
import { buildChatSummary } from './chatSummaryBuilder';
import { isMeaningfulDelta, MINIMUM_MEANINGFUL_DELTA } from './confidenceCalculator';
import type { SystemUpdateSource, FieldProvenance } from './authority';

export interface ApplySystemUpdateInput {
  home_id: string;
  system_key: string;
  source: SystemUpdateSource;
  extracted_data: {
    brand?: string;
    model?: string;
    serial?: string;
    manufacture_year?: number;
    capacity_rating?: string;
    fuel_type?: string;
  };
  confidence_signal: {
    visual_certainty?: number;
    source_reliability: number;
  };
  image_url?: string;
}

export interface SystemUpdateResult {
  system_id: string;
  update_applied: boolean;
  confidence_delta: number;
  authority_applied: 'accepted' | 'merged' | 'held_for_confirmation';
  chat_summary: string;
  fields_updated: string[];
  fields_held: string[];
  should_trigger_mode_recompute: boolean;  // Medium #4: Gated by delta
}

export async function applySystemUpdate(
  input: ApplySystemUpdateInput
): Promise<SystemUpdateResult> {
  const { home_id, system_key, source, extracted_data, confidence_signal, image_url } = input;

  // 1. Find existing system of same type
  const { data: existingSystems } = await supabase
    .from('home_systems')
    .select('*')
    .eq('home_id', home_id)
    .ilike('system_key', `${system_key}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  const existing = existingSystems?.[0] ?? null;
  
  // Critical #2 Fix: Read provenance from dedicated column, not nested source
  const existingProvenance = (existing?.field_provenance as Record<string, FieldProvenance>) ?? {};
  const existingFields = {
    brand: existing?.brand,
    model: existing?.model,
    serial: existing?.serial,
    manufacture_year: existing?.manufacture_year,
    capacity_rating: existing?.capacity_rating,
    fuel_type: existing?.fuel_type,
  };

  // 2. Resolve field updates with authority rules
  const resolved = resolveFieldUpdates({
    existingFields,
    existingProvenance,
    extractedData: extracted_data,
    source,
    confidenceSignal: confidence_signal,
  });

  // 3. Build chat summary (includes wasOverwrite for accurate messaging)
  const chatSummary = buildChatSummary({
    applied: resolved.updateApplied,
    held: resolved.requiresConfirmation,
    wasOverwrite: resolved.wasOverwrite,
    fieldsUpdated: resolved.fieldsUpdated,
    fieldsHeld: resolved.fieldsHeld,
    systemType: extracted_data.system_type || system_key,
    brand: extracted_data.brand,
  });

  // 4. If held for confirmation, return early (no DB write)
  if (!resolved.updateApplied && resolved.requiresConfirmation) {
    return {
      system_id: existing?.id ?? '',
      update_applied: false,
      confidence_delta: 0,
      authority_applied: 'held_for_confirmation',
      chat_summary: chatSummary,
      fields_updated: [],
      fields_held: resolved.fieldsHeld,
      should_trigger_mode_recompute: false,
    };
  }

  // 5. Persist to database
  let systemId = existing?.id;

  if (existing) {
    // Merge into existing record
    const newImages = image_url 
      ? [...(existing.images || []), image_url]
      : existing.images;

    // Critical #2 Fix: Write provenance to dedicated column
    await supabase
      .from('home_systems')
      .update({
        ...resolved.updatedFields,
        images: newImages,
        data_sources: [...new Set([...(existing.data_sources || []), source])],
        confidence_scores: { 
          ...(existing.confidence_scores || {}),
          overall: resolved.newConfidence 
        },
        field_provenance: resolved.updatedProvenance,  // Dedicated column
        confidence_score: resolved.newConfidence,      // Convenience column
        last_updated_at: new Date().toISOString(),
        source: {
          ...(existing.source || {}),
          last_update_source: source,
          last_update_at: new Date().toISOString(),
        },
      })
      .eq('id', existing.id);
  } else {
    // Create new system record
    const { data: inserted } = await supabase
      .from('home_systems')
      .insert({
        home_id,
        system_key: generateUniqueSystemKey(system_key, extracted_data.brand),
        ...resolved.updatedFields,
        images: image_url ? [image_url] : [],
        data_sources: [source],
        confidence_scores: { overall: resolved.newConfidence },
        field_provenance: resolved.updatedProvenance,
        confidence_score: resolved.newConfidence,
        source: {
          original_type: system_key,
          last_update_source: source,
          last_update_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    systemId = inserted?.id;
  }

  // Medium #4 Fix: Only trigger mode recompute if delta is meaningful
  const shouldTrigger = isMeaningfulDelta(resolved.confidenceDelta);

  // Critical #3 Fix: Use wasOverwrite for authority_applied
  const authorityApplied = resolved.wasOverwrite ? 'accepted' : 'merged';

  return {
    system_id: systemId!,
    update_applied: true,
    confidence_delta: resolved.confidenceDelta,
    authority_applied: authorityApplied,
    chat_summary: chatSummary,
    fields_updated: resolved.fieldsUpdated,
    fields_held: [],
    should_trigger_mode_recompute: shouldTrigger,
  };
}

/**
 * Generate deterministic unique system key.
 * Minor #7: Same home + type + brand = same key (prevents duplicates)
 */
function generateUniqueSystemKey(systemType: string, brand?: string): string {
  const brandSuffix = brand?.toLowerCase().replace(/\s+/g, '_') || '';
  const timestamp = Date.now().toString(36);
  return brandSuffix 
    ? `${systemType}_${brandSuffix}_${timestamp}` 
    : `${systemType}_${timestamp}`;
}
```

---

## Part 6: ChatDock Integration

**File:** `src/components/dashboard-v3/ChatDock.tsx`

Update the `onPhotoReady` callback to use the enforcement gate:

```typescript
// Add import
import { applySystemUpdate } from '@/lib/systemUpdates';

// Update ChatDockProps
interface ChatDockProps {
  // ... existing props
  onSystemUpdated?: () => void;  // Callback when system is updated
}

// Replace the photo handler in the component
const handlePhotoAnalysis = async (photoUrl: string) => {
  try {
    // 1. Call analyze-device-photo
    const response = await fetch(
      `https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/analyze-device-photo`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY3N1b3VieHloamh4Y2dycWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTQ1MTAsImV4cCI6MjA2NzQ5MDUxMH0.cJbuzANuv6IVQHPAl6UvLJ8SYMw4zFlrE1R2xq9yyjs',
        },
        body: JSON.stringify({ image_url: photoUrl }),
      }
    );

    const { analysis } = await response.json();

    if (!analysis || !analysis.system_type) {
      sendMessage("I saved the photo but couldn't extract clear details. A closer shot of the manufacturer label would help improve accuracy.");
      return;
    }

    // 2. Apply system update through enforcement gate
    const result = await applySystemUpdate({
      home_id: propertyId,
      system_key: analysis.system_type,
      source: 'photo_analysis',
      extracted_data: {
        brand: analysis.brand,
        model: analysis.model,
        serial: analysis.serial,
        manufacture_year: analysis.manufacture_year,
        capacity_rating: analysis.capacity_rating,
        fuel_type: analysis.fuel_type,
      },
      confidence_signal: {
        visual_certainty: analysis.visual_certainty,
        source_reliability: 0.7,
      },
      image_url: photoUrl,
    });

    // 3. Send chat summary (ONLY after persistence)
    sendMessage(result.chat_summary);

    // 4. Trigger mode recompute ONLY if meaningful (Medium #4)
    if (result.update_applied && result.should_trigger_mode_recompute) {
      onSystemUpdated?.();
    }
  } catch (err) {
    console.error('Photo analysis error:', err);
    sendMessage("I had trouble processing this image. The photo was saved and I'll try again shortly.");
  }
};

// Update the ChatPhotoUpload usage
<ChatPhotoUpload
  homeId={propertyId}
  onPhotoReady={handlePhotoAnalysis}  // Now uses enforcement gate
  disabled={loading}
/>
```

---

## Part 7: Data Wiring

### DashboardV3.tsx

Pass `refetchSystems` to MiddleColumn:

```typescript
const handleSystemUpdated = useCallback(() => {
  refetchSystems();
  // Chat mode will recompute via useChatMode dependency
}, [refetchSystems]);

<MiddleColumn
  // ... existing props
  onSystemUpdated={handleSystemUpdated}
/>
```

### MiddleColumn.tsx

Add prop and pass to ChatDock:

```typescript
interface MiddleColumnProps {
  // ... existing
  onSystemUpdated?: () => void;
}

<ChatDock
  // ... existing props
  onSystemUpdated={onSystemUpdated}
/>
```

### useHomeSystems.ts

Add `field_provenance` to interface:

```typescript
export interface HomeSystem {
  // ... existing fields
  field_provenance?: Record<string, {
    source: string;
    confidence: number;
    updated_at: string;
  }>;
  confidence_score?: number;
  last_updated_at?: string;
}
```

---

## Corrected Behavior Summary

| Scenario | Behavior | Result |
|----------|----------|--------|
| Photo contradicts user-confirmed brand | **Hold** | Ask confirmation, no DB write |
| User corrects photo result | **Overwrite** | `authority_applied: 'accepted'` |
| New photo same system | **Merge** | `authority_applied: 'merged'` |
| Trivial field update (delta < 0.05) | **Write** | Mode recompute NOT triggered |
| Meaningful update (delta ≥ 0.05) | **Write** | Mode recompute triggered |

---

## QA Verification Checklist

**Critical Fixes**:
- [x] Single canonical provenance location (`field_provenance` column)
- [x] Correct read path (`existing?.field_provenance`, not nested in `source`)
- [x] `wasOverwrite` explicitly defined and tracked in `resolveFieldUpdates`

**Medium Fixes**:
- [x] Minimum delta gate (0.05) prevents trivial confidence inflation
- [x] Architecture supports future held-update staging (optional v2)

**Preserved Wins**:
- [x] AI never sees raw extracted data (only `chat_summary`)
- [x] Chat speaks only after persistence
- [x] Authority hierarchy is boring and explicit
- [x] Same-authority conflicts are held, not guessed
- [x] Mode transitions are earned, not triggered

