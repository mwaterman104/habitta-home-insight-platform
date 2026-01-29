
# Filter Appliances from System Outlook Artifact

## The Problem

The BaselineSurface (System Outlook) is displaying an appliance record:
- `system_key: appliance_lg_mkrkejbl`
- `source.original_type: appliance`

Per the architecture, the System Outlook should only show **structural systems** (HVAC, Roof, Water Heater), not appliances.

## Root Cause

In `MiddleColumn.tsx`, the `baselineSystems` memo maps **all** records from `homeSystems` without filtering:

```typescript
// Line 129-131 - No filtering
if (homeSystems && homeSystems.length > 0) {
  return homeSystems.map(sys => { ... }); // Maps everything including appliances
}
```

## The Fix

Filter `homeSystems` to only include systems whose `system_key` matches the supported structural systems (`hvac`, `roof`, `water_heater`).

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard-v3/MiddleColumn.tsx` | Add filter for structural systems only |

## Implementation

### MiddleColumn.tsx — Filter Before Mapping

```typescript
// In the baselineSystems useMemo:

if (homeSystems && homeSystems.length > 0) {
  // Filter to only structural systems (not appliances)
  const structuralSystems = homeSystems.filter(sys => {
    // Check if system_key matches a supported structural system
    // SUPPORTED_SYSTEMS = ['hvac', 'roof', 'water_heater']
    return SUPPORTED_SYSTEMS.some(supported => 
      sys.system_key === supported || 
      sys.system_key.startsWith(`${supported}_`)
    );
  });
  
  if (structuralSystems.length === 0) {
    // Fall through to capitalTimeline fallback
  } else {
    return structuralSystems.map(sys => { ... });
  }
}
```

### Filter Logic Explained

The `system_key` in the database can be:
- Exact match: `hvac`, `roof`, `water_heater`
- With suffix (from addSystem): `hvac_carrier_abc123`, `water_heater_rheem_xyz`

Appliances have keys like:
- `appliance_lg_mkrkejbl`
- `appliance_samsung_abc123`

The filter checks if the key **matches or starts with** a supported system prefix.

## Verification

- [ ] Appliances no longer appear in System Outlook
- [ ] Structural systems (hvac, roof, water_heater) still display correctly
- [ ] Fallback to capitalTimeline works when no structural systems exist
- [ ] Appliances remain visible in Systems Hub (separate component)
