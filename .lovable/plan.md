

# Appliance Intelligence: Tiered Integration Plan

## Overview

This plan integrates appliances into Habitta as **second-order systems** with strict tiering, capped health influence, and constrained intelligence—all while preserving the core "home-as-an-operating-system" model.

Your QA feedback is locked in as non-negotiable guardrails.

---

## Architecture Decision: Appliances Live Inside Systems Hub

Per your recommendation, appliances will **not** get a parallel navigation item. Instead:

- **Systems Hub** (`/systems`) becomes the unified view for all tracked items
- Systems are visually grouped: **Structural Systems** (top) and **Appliances** (below)
- Clicking an appliance navigates to `/systems/:applianceId` (same pattern as HVAC/Roof)

This preserves one mental model and one navigation surface.

---

## Phase 1: Database Foundation (Tiering Model)

### 1.1 Extend `system_catalog` with Tier + Health Weight

```sql
ALTER TABLE public.system_catalog
ADD COLUMN IF NOT EXISTS appliance_tier INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS health_weight_cap DECIMAL(3,2) DEFAULT 1.0;

-- Existing structural systems = Tier 0 (not appliances)
UPDATE system_catalog SET appliance_tier = 0, health_weight_cap = 1.0
WHERE key IN ('hvac', 'roof', 'water_heater', 'electrical', 'plumbing', 'windows', 'flooring');

-- Add Tier 1 Critical Appliances
INSERT INTO public.system_catalog 
(key, display_name, typical_lifespan_years, cost_low, cost_high, risk_weights, maintenance_checks, appliance_tier, health_weight_cap)
VALUES
('refrigerator', 'Refrigerator', 12, 1000, 4000, '{"age":0.5,"usage":0.3}', '["Clean coils annually","Check seals"]', 1, 1.0),
('oven_range', 'Oven/Range', 15, 800, 3500, '{"age":0.6,"usage":0.3}', '["Clean regularly","Check burners annually"]', 1, 1.0),
('dishwasher', 'Dishwasher', 10, 400, 1200, '{"age":0.6}', '["Clean filter monthly","Check spray arms"]', 1, 1.0),
('washer', 'Washing Machine', 10, 500, 1500, '{"age":0.5,"usage":0.4}', '["Clean drum monthly","Check hoses"]', 1, 1.0),
('dryer', 'Dryer', 13, 400, 1200, '{"age":0.5,"usage":0.3}', '["Clean lint trap","Vent cleaning annually"]', 1, 1.0)
ON CONFLICT (key) DO UPDATE SET
  appliance_tier = EXCLUDED.appliance_tier,
  health_weight_cap = EXCLUDED.health_weight_cap;

-- Add Tier 2 Contextual Appliances (no health impact)
INSERT INTO public.system_catalog 
(key, display_name, typical_lifespan_years, cost_low, cost_high, risk_weights, maintenance_checks, appliance_tier, health_weight_cap)
VALUES
('microwave', 'Microwave', 9, 150, 600, '{"age":0.7}', '["Clean interior regularly"]', 2, 0.0),
('garbage_disposal', 'Garbage Disposal', 10, 100, 400, '{"age":0.6}', '["Run with cold water"]', 2, 0.0),
('wine_cooler', 'Wine Cooler', 10, 300, 2000, '{"age":0.5}', '["Clean condenser annually"]', 2, 0.0)
ON CONFLICT (key) DO UPDATE SET
  appliance_tier = EXCLUDED.appliance_tier,
  health_weight_cap = EXCLUDED.health_weight_cap;
```

### 1.2 Type Definitions

```typescript
// src/lib/systemMeta.ts additions
export type ApplianceTier = 0 | 1 | 2;

export interface ApplianceCategory {
  key: string;
  displayName: string;
  tier: ApplianceTier;
  healthWeightCap: number;
  typicalLifespan: number;
  icon: string;
}

export const TIER_1_APPLIANCES = [
  'refrigerator', 'oven_range', 'dishwasher', 'washer', 'dryer'
];

export const TIER_2_APPLIANCES = [
  'microwave', 'garbage_disposal', 'wine_cooler'
];
```

---

## Phase 2: Visibility in Systems Hub

### 2.1 Update SystemsHub to Show Appliances

Modify `/systems` to fetch both capital timeline systems AND `home_systems` appliances, then render them in grouped sections.

**Key Changes to `src/pages/SystemsHub.tsx`:**

```typescript
// Fetch appliances from home_systems
const { data: appliances } = useQuery({
  queryKey: ['home-appliances', userHome?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('home_systems')
      .select('*, system_catalog!inner(display_name, typical_lifespan_years, appliance_tier)')
      .eq('home_id', userHome?.id)
      .gte('system_catalog.appliance_tier', 1); // Tier 1 and 2 only
    return data;
  },
  enabled: !!userHome?.id,
});

// Render as two sections
<section>
  <h2>Structural Systems</h2>
  {/* HVAC, Roof, Water Heater cards */}
</section>

<section className="mt-8">
  <h2>Appliances</h2>
  <p className="text-sm text-muted-foreground">
    {tier1Count} critical • {tier2Count} tracked
  </p>
  {/* Appliance cards with tier badge */}
</section>
```

### 2.2 Appliance Card Visual Treatment

- **Tier 1**: Full card styling, status badge (Healthy/Planning/Attention)
- **Tier 2**: Muted styling, no status badge, subtle "Tracked" label
- Both link to `/systems/:applianceKey`

```typescript
// Card rendering logic
{appliances.map(appliance => (
  <Card 
    key={appliance.id}
    className={cn(
      "cursor-pointer",
      appliance.tier === 2 && "opacity-70 border-dashed"
    )}
    onClick={() => navigate(`/systems/${appliance.id}`)}
  >
    <CardHeader>
      <div className="flex justify-between">
        <span>{appliance.brand} {appliance.system_catalog.display_name}</span>
        {appliance.tier === 1 && getStatusBadge(appliance.status)}
        {appliance.tier === 2 && (
          <Badge variant="outline" className="text-muted-foreground">
            Tracked
          </Badge>
        )}
      </div>
    </CardHeader>
    <CardContent>
      <p>{ageYears} years old</p>
      {appliance.tier === 1 && remainingYears && (
        <p>~{remainingYears} years remaining</p>
      )}
    </CardContent>
  </Card>
))}
```

---

## Phase 3: Appliance Detail Page

### 3.1 Extend SystemPage for Appliances

The existing `/systems/:systemKey` route will handle appliances by detecting whether the key is a structural system or appliance.

**Changes to `src/pages/SystemPage.tsx`:**

```typescript
// Detect if this is an appliance (UUID) vs structural system (key)
const isApplianceId = systemKey?.length === 36; // UUID format

// Fetch appliance data if UUID
const { data: applianceData } = useQuery({
  queryKey: ['appliance-detail', systemKey],
  queryFn: async () => {
    const { data } = await supabase
      .from('home_systems')
      .select('*, system_catalog(*)')
      .eq('id', systemKey)
      .single();
    return data;
  },
  enabled: isApplianceId,
});

// Render appliance-specific layout
if (isApplianceId && applianceData) {
  return <ApplianceDetailView appliance={applianceData} />;
}
```

### 3.2 ApplianceDetailView Component

```typescript
// src/components/system/ApplianceDetailView.tsx
export function ApplianceDetailView({ appliance }: Props) {
  const tier = appliance.system_catalog.appliance_tier;
  const ageYears = appliance.manufacture_year 
    ? new Date().getFullYear() - appliance.manufacture_year 
    : null;
  const typicalLifespan = appliance.system_catalog.typical_lifespan_years;
  const remainingYears = ageYears ? Math.max(0, typicalLifespan - ageYears) : null;

  return (
    <DashboardV3Layout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header with photo */}
        <div className="flex gap-4 mb-6">
          {appliance.images?.[0] && (
            <img src={appliance.images[0]} className="w-24 h-24 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-xl font-semibold">
              {appliance.brand} {appliance.system_catalog.display_name}
            </h1>
            <p className="text-muted-foreground">
              {appliance.model || 'Model unknown'}
            </p>
            {tier === 2 && (
              <Badge variant="outline" className="mt-2">
                Tracked (low-impact)
              </Badge>
            )}
          </div>
        </div>

        {/* Lifespan card - Tier 1 only */}
        {tier === 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Planning Outlook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {remainingYears !== null ? `~${remainingYears} years` : 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    estimated remaining
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg">{ageYears ?? '?'} years old</p>
                  <p className="text-sm text-muted-foreground">
                    Typical lifespan: {typicalLifespan} years
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tier 2 disclaimer */}
        {tier === 2 && (
          <Card className="mb-6 border-dashed">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                I'll keep an eye on this, but it won't affect your home's outlook.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Maintenance tips */}
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {appliance.system_catalog.maintenance_checks?.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardV3Layout>
  );
}
```

---

## Phase 4: Health Roll-Up (Constrained)

### 4.1 Tiered Median Scoring in Intelligence Engine

Update `supabase/functions/intelligence-engine/index.ts`:

```typescript
// New: Appliance health contribution (capped)
async function calculateApplianceHealthPenalty(homeId: string): Promise<number> {
  // Fetch Tier 1 appliances only
  const { data: appliances } = await supabaseAdmin
    .from('home_systems')
    .select('manufacture_year, system_catalog!inner(typical_lifespan_years, appliance_tier)')
    .eq('home_id', homeId)
    .eq('system_catalog.appliance_tier', 1);

  if (!appliances || appliances.length === 0) return 0; // No penalty

  const currentYear = new Date().getFullYear();
  
  // Calculate status for each appliance
  const applianceStatuses = appliances.map(a => {
    const age = a.manufacture_year 
      ? currentYear - a.manufacture_year 
      : 5; // Conservative default
    const lifespan = a.system_catalog.typical_lifespan_years;
    const remaining = Math.max(0, lifespan - age);
    
    if (remaining <= 2) return 'attention';
    if (remaining <= 5) return 'planning';
    return 'healthy';
  });

  // Count appliances in Attention
  const attentionCount = applianceStatuses.filter(s => s === 'attention').length;

  // RULE: Only apply penalty if 2+ appliances are in Attention
  if (attentionCount < 2) return 0;

  // Calculate penalty (capped at 5 points)
  const penaltyPerAppliance = 2;
  const maxPenalty = 5;
  
  return Math.min(attentionCount * penaltyPerAppliance, maxPenalty);
}

// Update calculateMultiSystemScore to include appliance penalty
async function calculateMultiSystemScore(homeId: string): Promise<MultiSystemScoreResult> {
  // ... existing structural calculation ...
  
  // Apply capped appliance penalty
  const appliancePenalty = await calculateApplianceHealthPenalty(homeId);
  
  const finalScore = Math.round(baseStructuralScore - appliancePenalty);
  
  // Include in drivers if penalty applied
  if (appliancePenalty > 0) {
    drivers.appliances = {
      penalty: appliancePenalty,
      message: 'Multiple appliances nearing end of life'
    };
  }
  
  // ... rest of function ...
}
```

### 4.2 UI Rules (Locked)

| Surface | Tier 1 Behavior | Tier 2 Behavior |
|---------|-----------------|-----------------|
| **Dashboard (Home Pulse)** | Counted in health if ≥2 in Attention. Max copy: "2 appliances nearing replacement" | Never shown |
| **SystemWatch** | Only when confidence ≥ estimated AND planning window ≤ 3 years | Never shown |
| **HabittaThinking** | Allowed with soft language: "Your refrigerator may be worth planning for." | Never triggered |
| **Systems Hub** | Full status badge, remaining years | Muted card, "Tracked" badge |

---

## Phase 5: Appliance Type Recognition (TeachHabittaModal Update)

### 5.1 Update QUICK_SYSTEM_TYPES

```typescript
// src/components/TeachHabittaModal.tsx
const QUICK_SYSTEM_TYPES = [
  // Structural
  'hvac',
  'water_heater',
  'roof',
  'electrical',
  'plumbing',
  // Critical Appliances (Tier 1)
  'refrigerator',
  'oven_range',
  'dishwasher',
  'washer',
  'dryer',
  // Contextual (Tier 2)
  'microwave',
];

const SYSTEM_DISPLAY_NAMES: Record<string, string> = {
  // ... existing ...
  refrigerator: 'Refrigerator',
  oven_range: 'Oven/Range',
  dishwasher: 'Dishwasher',
  washer: 'Washing Machine',
  dryer: 'Dryer',
  microwave: 'Microwave',
  garbage_disposal: 'Garbage Disposal',
};
```

### 5.2 Add Tier Messaging on Save

When saving a Tier 2 appliance, show reassurance:

```typescript
// In handleConfirmInterpretation or handleSaveCorrection
const tier = TIER_2_APPLIANCES.includes(selectedSystemType) ? 2 : 1;

// Show appropriate success message
const successMessage = tier === 2
  ? "I'll keep an eye on this, but it won't affect your home's outlook."
  : "Added. I'll start tracking this.";
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/system/ApplianceDetailView.tsx` | Appliance-specific detail page component |
| `src/lib/applianceTiers.ts` | Tier definitions and helper functions |

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/SystemsHub.tsx` | Add appliances section, grouped display |
| `src/pages/SystemPage.tsx` | Detect appliance vs structural, render accordingly |
| `src/lib/systemMeta.ts` | Add appliance type definitions and tier constants |
| `src/components/TeachHabittaModal.tsx` | Add appliance types, tier messaging |
| `supabase/functions/intelligence-engine/index.ts` | Add `calculateApplianceHealthPenalty` with ≥2 rule |

## Database Migration

| Migration | Content |
|-----------|---------|
| `add_appliance_tiers.sql` | Add `appliance_tier` and `health_weight_cap` columns, seed appliance categories |

---

## Guardrails Summary (Locked)

1. **Tiering is non-negotiable**: Tier 1 = critical (health-impacting), Tier 2 = contextual (tracked only)
2. **Appliances cap at 5-point penalty**: Never dominate health score
3. **≥2 Attention rule**: Single aging appliance = advisory only
4. **Status language is standardized**: Healthy / Planning / Attention everywhere
5. **No parallel navigation**: Appliances live inside Systems Hub
6. **Tier 2 messaging**: "I'll keep an eye on this, but it won't affect your home's outlook."
7. **Brand intelligence is advisory**: Adjusts confidence, never generates urgency

---

## Recommended Build Order

1. **Database migration** → Tier columns + appliance catalog entries
2. **SystemsHub update** → Show appliances in grouped section
3. **ApplianceDetailView** → Detail page for appliance clicks
4. **TeachHabittaModal** → Add appliance type options
5. **Intelligence engine** → Health roll-up with ≥2 rule

Phase 3 (Brand Intelligence) can follow as a separate iteration once visibility and tiering are proven in production.

