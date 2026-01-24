

# Home Profile Page — Corrected Spec

## Fixes Applied from Review

| Issue # | Problem | Resolution |
|---------|---------|------------|
| 1 | Source type inconsistency | Lock to canonical enum from `systemConfidence.ts`; map legacy DB values |
| 2 | Confidence color = risk color confusion | Use neutral badge styling (slate/gray), not traffic lights |
| 3 | HVAC insight under Structure | Remove; insights only for structure/exterior attributes |
| 4 | Install year display edge cases | Define complete rendering policy with 5 cases |
| 5 | Audit table underspecified | Already exists; add precedence rule via computed view or "best" resolver |
| 6 | Mock data as "ground truth" | Replace with empty state UI; no fake upload dates |
| 7 | Chat context payload undefined | Define exact `homeProfileContext` shape |
| 8 | Status pill too prominent | Make subtle indicator, not banner |
| 9 | Climate zone source undocumented | Reuse `deriveClimateZone()` from `PropertyMap.tsx` |

---

## 1. Source Type Contract (LOCKED)

### Canonical Enum (Already Exists)
```typescript
// src/lib/systemConfidence.ts:16
type InstallSource = 'heuristic' | 'owner_reported' | 'inspection' | 'permit_verified';
```

### Legacy DB Value Mapping
The original migration used `'permit' | 'user' | 'inferred'`. Create a normalizer:

| DB Value | Canonical Value |
|----------|-----------------|
| `'permit'` | `'permit_verified'` |
| `'user'` | `'owner_reported'` |
| `'inferred'` | `'heuristic'` |
| `null` / missing | `'heuristic'` (default) |

**File:** `src/lib/systemConfidence.ts`
Add:
```typescript
export function normalizeInstallSource(dbValue: string | null): InstallSource {
  switch (dbValue) {
    case 'permit':
    case 'permit_verified':
      return 'permit_verified';
    case 'user':
    case 'owner_reported':
      return 'owner_reported';
    case 'inspection':
      return 'inspection';
    case 'inferred':
    case 'heuristic':
    default:
      return 'heuristic';
  }
}
```

### UI Display Labels (Already Exists)
```typescript
// src/lib/systemConfidence.ts:195-208
getSourceLabel(source) → 
  'heuristic' → "Estimated"
  'owner_reported' → "Owner-reported"  
  'inspection' → "Verified"
  'permit_verified' → "Permit-verified"
```

---

## 2. Confidence Badge Styling (NOT Risk Colors)

**Problem:** Using green/amber/red will be mistaken for risk severity.

**Solution:** Use neutral, muted badge variants:

| Confidence Level | Badge Class | Visual |
|------------------|-------------|--------|
| High | `bg-slate-100 text-slate-700 border-slate-200` | Subtle, doesn't draw attention |
| Medium | `bg-slate-50 text-slate-600 border-slate-200` | Slightly faded |
| Low | `bg-slate-50 text-slate-500 border-dashed border-slate-300` | Dashed border = uncertainty |

**Icon treatment:**
- High: Solid dot or checkmark
- Medium: Outlined circle
- Low: Question mark or dotted circle

No red. No amber. No green on confidence badges.

---

## 3. Install Year Display Policy (Complete)

| Case | Display | Example |
|------|---------|---------|
| Exact year known | `{year}` | `2018` |
| Inferred/estimated | `~{year}` | `~2012` |
| Year range | `{start}–{end}` | `2016–2018` |
| Unknown | `Unknown` | `Unknown` |
| Conflict (rare) | Primary + tooltip | `2018` with tooltip "Also reported: 2015" |
| Original system | `{year_built}` + "(original)" | `1987 (original)` |

**Implementation:** Extend `formatInstalledLine()` or create a new `formatInstallYearCell()` for table display:

```typescript
export function formatInstallYearCell(
  installYear: number | null,
  installSource: InstallSource,
  replacementStatus: ReplacementStatus,
  yearRange?: [number, number] | null,
  conflictingYear?: number | null
): { display: string; tooltip?: string } {
  if (!installYear && !yearRange) {
    return { display: 'Unknown' };
  }
  
  if (yearRange) {
    return { display: `${yearRange[0]}–${yearRange[1]}` };
  }
  
  let display = installSource === 'heuristic' ? `~${installYear}` : `${installYear}`;
  
  if (replacementStatus === 'original') {
    display += ' (original)';
  }
  
  const tooltip = conflictingYear ? `Also reported: ${conflictingYear}` : undefined;
  
  return { display, tooltip };
}
```

---

## 4. Structure Section Insights (Tightened)

**Allowed insights** (structure/exterior attributes only):

| Attribute | Insight Line |
|-----------|--------------|
| Roof: Tile | "Tile roofs typically age slower but fail abruptly near end of life." |
| Roof: Asphalt Shingle | "Asphalt shingles degrade faster in high-heat climates." |
| Exterior: Stucco | "Stucco requires regular inspection for hairline cracks." |
| Foundation: Concrete slab | "Slab foundations have lower maintenance but limited repair options." |
| Stories: 2+ | "Multi-story homes increase HVAC load and roof access difficulty." |

**NOT allowed:** HVAC, water heater, or any system-level insights in this section.

---

## 5. Audit Table & Precedence (Already Exists, Add Resolver)

The `system_install_events` table already captures:
- `prev_install_year`, `new_install_year`
- `prev_install_source`, `new_install_source`
- `prev_replacement_status`, `new_replacement_status`

**Add precedence logic:** Create a function to resolve "best estimate" when conflicts exist:

```typescript
// src/lib/systemConfidence.ts
export function resolveInstallAuthority(
  sources: Array<{ year: number; source: InstallSource; timestamp?: Date }>
): { year: number; source: InstallSource } {
  // Priority: permit_verified > inspection > owner_reported > heuristic
  const priorityOrder: InstallSource[] = ['permit_verified', 'inspection', 'owner_reported', 'heuristic'];
  
  const sorted = sources.sort((a, b) => {
    const priorityA = priorityOrder.indexOf(a.source);
    const priorityB = priorityOrder.indexOf(b.source);
    if (priorityA !== priorityB) return priorityA - priorityB;
    // Same priority: prefer more recent
    return (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0);
  });
  
  return sorted[0];
}
```

---

## 6. Empty States (No Fake Data)

### Supporting Records (Documents)
**Before:** Mock data with "Uploaded 2023"
**After:**
```tsx
<div className="text-center py-8 text-muted-foreground">
  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
  <p>No records uploaded yet</p>
  <Button variant="outline" size="sm" className="mt-4">
    <Upload className="h-4 w-4 mr-2" />
    Add your first record
  </Button>
</div>
```

### Home Activity Log
**Before:** Mock history items
**After:**
```tsx
<div className="text-center py-8 text-muted-foreground">
  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
  <p>No activity logged yet</p>
  <p className="text-sm mt-1">Recording maintenance helps Habitta distinguish wear from neglect.</p>
</div>
```

---

## 7. Chat Context Payload (Defined)

```typescript
interface HomeProfileChatContext {
  page: 'home_profile';
  home_id: string;
  identity: {
    address: string;
    city: string;
    state: string;
    year_built: number;
    sqft: number;
    beds: number;
    baths: number;
  };
  structure: {
    property_type: string;
    foundation?: string;
    stories?: number;
  };
  exterior: {
    wall_material?: string;
    roof_material?: string;
  };
  site: {
    lot_size?: string;
    climate_zone: string; // derived via deriveClimateZone()
  };
  systems_provenance: Array<{
    system_type: string;
    install_year: number | null;
    source_type: InstallSource;
    confidence: number;
  }>;
  permits_summary: {
    count: number;
    last_permit_date?: string;
  };
  docs_count: number;
  activity_count: number;
}
```

**Chat behavior rule:** On Home Profile, chat defaults to explaining inputs, not predicting outcomes. System prompt includes: "You are explaining the Home Profile context, not forecasting."

---

## 8. Status Indicator (Subtle)

**Before:** Considered adding a prominent `"critical"` pill

**After:** Small, calm indicator in header area:

```tsx
// Part of HomeProfileContextHeader
<div className="flex items-center gap-2 text-meta text-muted-foreground">
  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
  <span>Home Pulse: Healthy</span>
</div>
```

Status colors (for the dot only, not badge):
- Healthy: `bg-emerald-500`
- Attention: `bg-amber-500`
- Critical: `bg-red-500`

The dot is small (8px). No banner. No alarm.

---

## 9. Climate Zone Source (Documented)

Reuse `deriveClimateZone()` from `src/components/dashboard-v3/PropertyMap.tsx`.

Move to shared utility: `src/lib/climateZone.ts`

```typescript
export type ClimateZoneType = 'high_heat' | 'coastal' | 'freeze_thaw' | 'moderate';

export interface ClimateZone {
  zone: ClimateZoneType;
  label: string;
  impact: string;
}

export function deriveClimateZone(
  state?: string,
  city?: string,
  lat?: number | null
): ClimateZone { ... }
```

Display in HomeStructure section under "Site" group.

---

## Updated Component List

| Component | Action | Key Changes |
|-----------|--------|-------------|
| `src/components/HomeProfile/HomeProfileContextHeader.tsx` | Create | Context framing + subtle status dot |
| `src/components/HomeProfile/PropertyHero.tsx` | Modify | Add "Used in forecasting" badge, serif typography |
| `src/components/HomeProfile/KeyMetrics.tsx` | Modify | Remove header, tighten spacing |
| `src/components/HomeProfile/HomeStructure.tsx` | Create (rename from PropertyDetails) | 2-column grid, structure-only insights |
| `src/components/HomeProfile/SystemProvenance.tsx` | Create | Table with neutral confidence badges, edit affordance |
| `src/components/HomeProfile/PermitsHistory.tsx` | Modify | Add framing sentence |
| `src/components/HomeProfile/SupportingRecords.tsx` | Rename + Modify | Empty state UI, no mock data |
| `src/components/HomeProfile/HomeActivityLog.tsx` | Rename + Modify | Empty state UI, no mock data |
| `src/pages/HomeProfilePage.tsx` | Modify | Compose new layout, add ChatDock with context |
| `src/hooks/useSystemsData.ts` | Modify | Add `install_source`, `replacement_status` to interface |
| `src/lib/systemConfidence.ts` | Modify | Add `normalizeInstallSource()`, `formatInstallYearCell()` |
| `src/lib/climateZone.ts` | Create | Extract `deriveClimateZone()` from PropertyMap |

---

## Acceptance Tests (Per Section)

### SystemProvenance
- [ ] Shows source label for every system (never raw DB value)
- [ ] Shows confidence band derived from score, using neutral colors
- [ ] "Edit" updates provenance and reflects on refresh
- [ ] Unknown source displays "Unknown" and "Low confidence"
- [ ] No forecast language appears in this section
- [ ] Install year uses `~` prefix for heuristic sources

### HomeStructure
- [ ] Organized into Structure vs. Exterior & Site columns
- [ ] Insight lines only reference structure/exterior attributes
- [ ] No HVAC or system-level insights appear
- [ ] Climate zone displays correctly based on address

### Supporting Records & Activity Log
- [ ] Empty state shows placeholder, not fake data
- [ ] No "Uploaded 2023" style mock entries
- [ ] Upload affordance is calm, not urgent

### Chat Integration
- [ ] Placeholder reads "Ask how Habitta understands your home"
- [ ] Context payload includes all defined fields
- [ ] Chat does not auto-open on this page
- [ ] Responses explain inputs, not predict outcomes

---

## Design Principles (Non-Negotiable)

| Principle | Enforcement |
|-----------|-------------|
| Calm > clever | No urgent CTAs, no red badges for confidence |
| Trust > excitement | Provenance is visible, corrections are easy |
| Ground truth only | No mock data pretending to be real |
| Confidence ≠ risk | Separate visual languages for certainty vs. health |

