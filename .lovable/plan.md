

## Surface Discovered Assets on the /systems Hub

### Problem

Chat-discovered systems (sprinkler, microwave) are recorded in `home_assets` but never shown on the `/systems` page. The hub currently only queries `systems` (structural) and `home_systems` (appliances), making discoveries invisible.

### Solution

Add `home_assets` as a third data source in SystemsHub, with smart deduplication and a "Recently Discovered" section. All confidence levels are shown. Clicking a discovered asset navigates to `/systems/{asset_id}`.

### Changes

**1. Update: `src/pages/SystemsHub.tsx`**

Add a new query for `home_assets`:
```text
supabase.from('home_assets')
  .select('id, kind, category, manufacturer, model, confidence, source, status, install_date, created_at')
  .eq('home_id', homeId)
  .eq('status', 'active')
```

Build a deduplication filter using smart prefix + category check:
- Build a Set of existing structural system keys (lowercase) from `systemCards`
- Build a Set of existing appliance key prefixes (lowercase) from `applianceCards`
- For each `home_asset`: skip if `kind.toLowerCase()` exactly matches a structural key, OR if any appliance prefix matches the start of `kind` AND category matches
- Remaining assets become "Discovered Assets" cards

Build discovered asset cards with:
- Display name: `kind.replace(/_/g, ' ')` then title-case each word
- Manufacturer/model subtitle if available
- Confidence indicator (always shown, uses existing ConfidenceBadge component)
- Source badge: "Via chat" / "Via photo" / "Discovered" based on `source` field
- Category-based icon fallback: Appliance -> plug emoji, System -> house emoji, Unknown -> question mark
- Click navigates to `/systems/{asset.id}` (existing route handles UUID detection)

Add a third section after Appliances:
```text
Structural Systems
  [HVAC] [Roof] [Water Heater]

Appliances
  [Refrigerator] [LG Appliance]

Recently Discovered
  [Sprinkler System] [Microwave]
```

Section only renders when `discoveredAssets.length > 0` after dedup.

Update empty state: check all three sources before showing "No systems tracked yet."

Update `isLoading` to include the new query's loading state.

**2. Update: `src/pages/SystemPage.tsx`**

The existing SystemPage already detects UUIDs (line 48: `isApplianceId = systemKey?.length === 36 && systemKey.includes('-')`) and queries `home_systems`. When a `home_assets` UUID is clicked but doesn't exist in `home_systems`, the page currently shows an error.

Add a fallback query: if `home_systems` returns no data for a UUID, try `home_assets` table. If found, render a simplified asset detail view showing:
- Kind (formatted as title)
- Manufacturer / Model if available
- Confidence score
- Source
- Install date if available
- A "Help Habitta learn more" CTA to enrich the asset (opens TeachHabittaModal or links to the detail enrichment flow)

### Card Design for Discovered Assets

```text
+----------------------------------+
| [icon]  Sprinkler System         |
|         Via chat                 |
|                                  |
|         Confidence: 72%          |
|         Tap to view details      |
+----------------------------------+
```

- Dashed border (`border-dashed`) to signal incomplete data
- Slightly reduced opacity (`opacity-80`)
- Uses the same card component and layout as appliance cards for visual consistency

### Data Flow

```text
SystemsHub
  |-- capitalTimeline -> systemCards (structural)
  |-- home_systems -> applianceCards (Tier 1 & 2)
  |-- home_assets -> discoveredAssets (deduplicated)
```

### Icon Mapping for Discovered Assets

Known kinds reuse existing `APPLIANCE_ICONS` and `SYSTEM_DISPLAY` maps first. Unknown kinds fall back to:
- Category "appliance" -> electric plug emoji
- Category "system" or "structural" -> house emoji
- Anything else -> question mark emoji

### What Does NOT Change

- No database migrations
- No changes to how chat discoveries are recorded
- No changes to structural system or appliance card logic
- No changes to mobile layout
- BaselineSurface / HomeSystemsPanel (right column) unchanged
