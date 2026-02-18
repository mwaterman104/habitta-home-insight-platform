

## Make Maintenance Plan System-Aware

### The Problem
`seed-maintenance-plan` generates all seasonal templates for a climate zone without checking what systems the home actually has. Pool pump tasks appear for poolless homes. Irrigation tasks appear for homes with no sprinkler system.

### What Data We Have (No Schema Changes Needed)

| Source | Anchored By | Useful Fields |
|--------|------------|---------------|
| `systems` table | `home_id` | `kind` (hvac, roof, water_heater, electrical, smart_devices) |
| `permits` table | `home_id` | `system_tags` (text array), `description`, `trade` |
| `habitta_home_systems` | `user_id` only (no `home_id`) | `type` -- **cannot safely use per-home** |
| `habitta_permits` | `user_id` only (no `home_id`) | `related_system_type` -- **cannot safely use per-home** |
| `homes` table | is the home | No pool/solar indicator stored today |

**Decision:** Only query `systems` and `permits` (both have `home_id`). Skip `habitta_home_systems` and `habitta_permits` since they lack `home_id` and would leak systems across multi-home users.

### The Fix

**File:** `supabase/functions/seed-maintenance-plan/index.ts`

#### 1. Add system normalization constants (top of file)

```typescript
const SYSTEM_ALIASES: Record<string, string> = {
  swimming_pool: "pool", inground_pool: "pool", above_ground_pool: "pool",
  spa_pool: "spa", hot_tub: "spa", jacuzzi: "spa",
  irrigation: "sprinkler", sprinkler_system: "sprinkler",
  ac: "hvac", furnace: "hvac", heat_pump: "hvac", air_conditioning: "hvac",
  water_heater: "water_heater", tankless: "water_heater", boiler: "water_heater",
  ev_charger: "ev_charger", backup_generator: "generator",
};

function normalizeSystemType(type?: string | null): string | null {
  if (!type) return null;
  const t = type.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return SYSTEM_ALIASES[t] || t;
}

const OPTIONAL_SYSTEMS = new Set([
  "pool", "solar", "sprinkler", "spa", "generator", "septic", "well", "ev_charger",
]);

const KEYWORD_SYSTEM_MAP: Record<string, string> = {
  pool: "pool", spa: "spa", irrigation: "sprinkler",
  sprinkler: "sprinkler", solar: "solar", generator: "generator",
};
```

#### 2. Build known system set after home is loaded (~line 231)

After `console.log("Found home:", home.address);`, add:

```typescript
// Build set of systems this home actually has
const knownSystems = new Set<string>();

// Source 1: Canonical systems table (home_id anchored)
const { data: homeSys } = await admin
  .from("systems")
  .select("kind")
  .eq("home_id", homeId);
for (const s of (homeSys || [])) {
  const n = normalizeSystemType(s.kind);
  if (n) knownSystems.add(n);
}

// Source 2: Permits table (home_id anchored) - check system_tags + description
const { data: homePermits } = await admin
  .from("permits")
  .select("system_tags, description, trade")
  .eq("home_id", homeId);
for (const p of (homePermits || [])) {
  // system_tags is a text array
  for (const tag of (p.system_tags || [])) {
    const n = normalizeSystemType(tag);
    if (n) knownSystems.add(n);
  }
  // Also scan description for pool/solar/etc keywords
  const desc = `${p.description || ''} ${p.trade || ''}`.toLowerCase();
  for (const [keyword, system] of Object.entries(KEYWORD_SYSTEM_MAP)) {
    if (desc.includes(keyword)) knownSystems.add(system);
  }
}

console.log("Known systems for home:", [...knownSystems]);
```

#### 3. Filter candidates before insert (~line 307, after all candidates are pushed)

Replace the direct insert flow with a filtered one:

```typescript
// Filter out tasks for optional systems this home doesn't have
function taskRequiresAbsentSystem(task: any, known: Set<string>): boolean {
  // Check system_type field
  const sysType = normalizeSystemType(task.system_type);
  if (sysType && OPTIONAL_SYSTEMS.has(sysType) && !known.has(sysType)) return true;

  // Secondary keyword check on title + description
  const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
  for (const [keyword, system] of Object.entries(KEYWORD_SYSTEM_MAP)) {
    if (text.includes(keyword) && !known.has(system)) return true;
  }
  return false;
}

const systemFilteredCandidates = candidates.filter(
  t => !taskRequiresAbsentSystem(t, knownSystems)
);
```

Then use `systemFilteredCandidates` instead of `candidates` for the dedup and insert logic.

#### 4. Update the `SeasonalTask` interface

No change needed -- `system_type` already exists and is already set to values like `"pool"`, `"hvac"`, etc. The normalization handles the mapping.

### What Changes

| Before | After |
|--------|-------|
| Every FL home gets pool pump tasks | Only homes with pool in `systems` or `permits` |
| "Irrigation & pool check" appears everywhere in moderate zone | Filtered if no pool or sprinkler detected |
| No system awareness at all | Queries `systems` + `permits` by `home_id` |
| HVAC assumed for all | HVAC tasks still included (not in `OPTIONAL_SYSTEMS`) but the system is extensible |

### What Does NOT Change
- No database schema changes
- No new tables or columns  
- No frontend changes
- Existing tasks already in DB are untouched
- Templates themselves remain the same (filtered at generation time)
- `habitta_home_systems` and `habitta_permits` deliberately excluded (no `home_id`)

### Edge Cases Handled
- Home with no systems recorded at all: all universal tasks still generated, only optional-system tasks filtered
- Permit description mentions "pool" but no formal system record: keyword scan catches it, pool tasks included
- Multi-home user: all queries anchored to `home_id`, no cross-home leakage

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/seed-maintenance-plan/index.ts` | Add normalization constants, query systems/permits, filter candidates |

