

# Home Confidence: Replace Home Outlook with Earned Confidence Score

## Overview

Replace the Home Outlook hero (LifecycleRing + "~X years") with a normalized Home Confidence model. The score measures how well-understood, documented, and managed a home is -- not system age or condition. Includes a recommendation engine that surfaces the top 3 highest-leverage actions.

---

## Scoring Contract (Authoritative)

### Key Systems (Normalization Anchor)

```text
KEY_SYSTEMS = ['hvac', 'roof', 'electrical', 'water_heater', 'plumbing']
```

Only these systems contribute to the base score. Other systems (pool, solar, mini-split) may generate recommendations but do not affect the denominator.

### Per-System Cap

Each key system contributes at most **20 points** (adjusted from 25 to avoid over-rewarding documentation on systems that may lack most data fields).

```text
MAX_POINTS_PER_SYSTEM = 20
MAX_BASE_POINTS = 5 * 20 = 100
normalizedScore = min(100, round(earnedPoints / MAX_BASE_POINTS * 100))
finalScore = max(0, normalizedScore + freshnessDecay)
```

### Boolean Signal Derivation (Per System)

Every scoring input is a boolean. No stacking, no farming.

```text
deriveSystemSignals(system, homeAssets[], homeEvents[]) -> SystemSignals

SystemSignals:
  hasInstallYear       -> true if systems.install_year is non-null
  hasMaterial          -> true if systems.material is non-null (only for roof, plumbing)
  hasSerial            -> true if home_assets.serial exists for this system kind
  hasPhoto             -> true if >= 1 home_asset with metadata containing photo for this kind
  hasPermitOrInvoice   -> true if systems.install_source in ('permit', 'permit_verified')
  hasMaintenanceRecord -> true if >= 1 home_event with event_type='maintenance' matching system
  hasProfessionalService -> true if maintenance event source='professional' or metadata.professional=true
  hasMaintenanceNotes  -> true if any maintenance event has non-empty description
  hasReplacementAcknowledged -> true if systems.replacement_status not in ('unknown', null)
  hasPlannedReplacement -> true if home_event with event_type='recommendation' and status='open' exists for system
```

### Point Values (Per System, Clamped at 20)

| Signal | Points |
|--------|--------|
| hasInstallYear | +5 |
| hasMaterial (roof, plumbing only) | +3 |
| hasSerial | +2 |
| hasPhoto | +2 |
| hasPermitOrInvoice | +4 |
| hasMaintenanceRecord | +2 |
| hasProfessionalService | +2 |
| hasMaintenanceNotes | +1 |
| hasReplacementAcknowledged (late-life only) | +2 |
| hasPlannedReplacement (late-life only) | +2 |

Systems where material is not applicable (HVAC, electrical, water_heater) have their max adjusted so the denominator stays fair. For those systems, the effective max is 20 (the remaining budget is redistributable across documentation/maintenance signals that do apply).

### Freshness Decay

`last_user_touch_at` = max of:
- Latest `home_events.created_at`
- Latest `home_assets.updated_at`
- `homes.updated_at` (from userHome already fetched)

| Condition | Penalty |
|-----------|---------|
| No touch >= 18 months | -5 |
| No touch >= 36 months | -10 (total, not cumulative) |

### State Mapping (After Decay)

| Score | State | Copy |
|-------|-------|------|
| 80-100 | solid | Most systems are understood and tracked |
| 55-79 | developing | Key gaps exist, but nothing critical is hidden |
| 30-54 | unclear | Too many unknowns to plan confidently |
| < 30 | at-risk | Major systems lack basic information |

---

## Recommendation Engine Contract

### Generation: 4 Sequential Passes

1. **Documentation Gaps** -- missing install year, material, serial, photo, permit
2. **Maintenance Confirmation** -- no maintenance record for a system
3. **Planning Acknowledgment** -- late-life system with unacknowledged replacement
4. **Data Freshness** -- home-level, max 1 recommendation

### Priority Scoring

```text
priorityScore = confidenceDelta * systemTierWeight * uncertaintyMultiplier

systemTierWeight:
  planning-critical (hvac, roof, electrical) = 1.0
  routine (water_heater, plumbing) = 0.7

uncertaintyMultiplier:
  = 1 + (missingSignalCount / totalSignalCount) * 0.5
```

### Deterministic IDs

```text
id = `${type}:${systemKey ?? 'home'}:${signalName}`
```

### Action Routing Map (v1)

Each recommendation resolves to an existing route. If a route does not exist, the recommendation does not render.

| Action Type | Route | Exists? |
|-------------|-------|---------|
| add_year | `/systems/${systemKey}` (edit flow) | Yes (SystemPage) |
| upload_doc | `/systems/${systemKey}` | Yes |
| upload_photo | `/systems/${systemKey}` | Yes |
| add_serial | `/systems/${systemKey}` | Yes |
| confirm_material | `/systems/${systemKey}` | Yes |
| log_maintenance | `/systems/${systemKey}/plan` (planning chat) | Yes |
| acknowledge | `/systems/${systemKey}/plan` | Yes |
| review_freshness | `/home-profile` | Yes |

All routes resolve to existing pages. Detailed edit fields (query params) are deferred to v2 when those edit forms exist.

### Suppression (v1 Minimal)

- **Completed**: Signal is now true -- recommendation disappears naturally
- **Dismissed**: Stored in `localStorage` under key `habitta_dismissed_recommendations` as `string[]` of deterministic IDs
- Dismissal does not affect confidence score

---

## Explicit v1 Exclusions

- "Planning chat engaged" (+2) -- removed from v1 scoring (unreliable without chat state persistence)
- `home.year_built` and `home.square_feet` -- not used as scoring inputs
- Micro-gamification toasts -- deferred
- DB persistence of recommendation state -- deferred
- Chat integration for recommendations -- deferred
- System Plan page recommendation display -- deferred

---

## Files to Create

### 1. `src/services/homeConfidence.ts` -- Computation Engine

Pure functions, no side effects.

- `KEY_SYSTEMS` constant
- `deriveSystemSignals(systemKind, systems[], homeAssets[], homeEvents[])` returning `SystemSignals`
- `computeHomeConfidence(systems[], homeAssets[], homeEvents[], lastTouchAt)` returning `HomeConfidenceResult`
- `HomeConfidenceResult` type: `{ score, state, stateMeaning, evidenceChips[], nextGain, breakdown }`

### 2. `src/services/recommendationEngine.ts` -- Recommendation Generator

Pure functions. Four-pass deterministic generation.

- `generateRecommendations(systems[], homeAssets[], homeEvents[], dismissedIds[])` returning `Recommendation[]` (max 3)
- `Recommendation` type: `{ id, type, systemId?, title, rationale, confidenceDelta, priorityScore, actionType, route }`
- `getRecommendationRoute(actionType, systemKey?)` returning route string

### 3. `src/hooks/useHomeConfidence.ts` -- Data Fetching Hook

Fetches from existing tables (`systems`, `home_assets`, `home_events`, `homes`) using the Supabase client. Computes confidence and recommendations. Manages localStorage dismissal state.

Returns: `{ confidence: HomeConfidenceResult, recommendations: Recommendation[], dismissRecommendation: (id) => void, loading }`

### 4. `src/components/mobile/HomeConfidenceHero.tsx` -- Hero Component

Replaces the LifecycleRing hero block. Layout:

```text
[State-colored dot] [State label: "Developing"]
[Confidence index: 62]
[State meaning in muted text]
[Evidence chips: "2 systems documented" . "1 service confirmed"]
[Next gain: "Next: add roof install year (+5)"]
```

Includes a subtle confidence meter (thin horizontal track, muted fill from left, no percentage label, no ring). Track goes from "At Risk" to "Solid" conceptually but shows no text labels on the meter itself -- just the fill level.

### 5. `src/components/mobile/RecommendationCards.tsx` -- Recommendation List

Max 3 cards below "Since Last Month." Each card:

```text
[Title]                          [+5 badge]
[Rationale in muted text]
[Dismiss X button]
```

Tapping the card navigates to the action route. Dismiss button calls `dismissRecommendation(id)`.

---

## Files to Modify

### 6. `src/lib/mobileCopy.ts`

**Add:**
- `HOME_CONFIDENCE_COPY` with state labels, meanings, and index prefix
- `RECOMMENDATION_COPY` with section header and copy templates per action type

**Deprecate (keep but stop consuming):**
- `HOME_OUTLOOK_COPY`
- `HOME_OUTLOOK_CLARIFIER`
- `ASSESSMENT_QUALITY_PREFIX` / `ASSESSMENT_QUALITY_LABELS` (still used by SystemTileScroll, kept)

### 7. `src/components/dashboard-v3/mobile/MobileDashboardView.tsx`

- Remove `computeHomeOutlook`, `getLifecyclePercent` imports and hero ring block
- Remove `HOME_OUTLOOK_COPY`, `ASSESSMENT_QUALITY_*`, `HOME_OUTLOOK_CLARIFIER` usage from hero
- Accept new props: `homeConfidence: HomeConfidenceResult`, `recommendations: Recommendation[]`, `onDismissRecommendation: (id) => void`
- Render `HomeConfidenceHero` in place of the old hero block
- Render `RecommendationCards` between "Since Last Month" and "Key Systems Preview"

New layout order:
1. Home Confidence Hero (replaces Home Outlook)
2. Since Last Month (unchanged)
3. Recommendations (new, max 3 cards)
4. Key Systems Preview (unchanged -- tiles keep LifecycleRing per system)

### 8. `src/pages/DashboardV3.tsx`

- Import and call `useHomeConfidence(userHome?.id)`
- Pass `homeConfidence`, `recommendations`, `onDismissRecommendation` to `MobileDashboardView`
- No changes to desktop layout in this pass

---

## What Is NOT Changed

- **System tiles** -- keep LifecycleRing per system with years remaining
- **System Plan pages** -- unchanged
- **Desktop layout** -- untouched
- **`homeOutlook.ts`** -- kept (SystemTileScroll still uses `getLifecyclePercent` and `getRemainingYearsForSystem`)
- **Backend / schema** -- no changes, no new tables, no edge functions

---

## Sanity Tests

1. Two homes with identical systems but different documentation completeness produce different scores
2. A home with all 5 key systems fully documented scores near 100
3. A home with no systems data scores near 0
4. Adding an install year immediately changes the score and removes the corresponding recommendation
5. Dismissing a recommendation does not change the score
6. Score never exceeds 100 even with bonus systems
7. Freshness decay applies only once (not cumulative -5 then -10)

