

# Refined Fix: React Hooks Violation in DashboardV3

## Validated Root Cause

The `mobileBaselineSystems` useMemo hook at **lines 424-453** is declared after two early returns:
- Line 383-388: `if (loading) return ...`
- Line 392-418: `if (!userHome) return ...`

This causes React to see different hook counts across renders.

---

## Implementation (with QA Hardening)

### File: `src/pages/DashboardV3.tsx`

**Step 1: Move useMemo to line 305** (after `maintenanceTimelineData`)

Insert after line 304 with enhanced comments:

```typescript
  }, [maintenanceTasks, hvacPrediction]);

  // ============================================================
  // Mobile-specific derivations
  // NOTE: These are internal lifecycle states for data processing.
  // UI mapping to user-facing labels (Stable/Watch/Plan) happens
  // downstream in PrimarySystemCard and SecondarySystemsList.
  // ============================================================
  const mobileBaselineSystems: BaselineSystem[] = useMemo(() => {
    if (!capitalTimeline?.systems) return [];
    const currentYear = new Date().getFullYear();
    return capitalTimeline.systems.map(sys => {
      const likelyYear = sys.replacementWindow?.likelyYear;
      const remainingYears = likelyYear ? likelyYear - currentYear : undefined;
      
      // Internal state taxonomy (not UI labels)
      let state: 'stable' | 'planning_window' | 'elevated' | 'baseline_incomplete' = 'stable';
      if (sys.dataQuality === 'low') {
        state = 'baseline_incomplete';
      } else if (remainingYears !== undefined && remainingYears <= 1) {
        state = 'elevated';
      } else if (remainingYears !== undefined && remainingYears <= 3) {
        state = 'planning_window';
      }
      
      return {
        key: sys.systemId,
        displayName: sys.systemLabel,
        state,
        confidence: sys.dataQuality === 'high' ? 0.9 : sys.dataQuality === 'medium' ? 0.6 : 0.3,
        monthsRemaining: remainingYears !== undefined ? remainingYears * 12 : undefined,
        ageYears: sys.installYear ? currentYear - sys.installYear : undefined,
        installYear: sys.installYear,
        installSource: sys.installSource,
      };
    });
  }, [capitalTimeline]);

  // Navigate to system detail AND trigger advisor state
```

**Step 2: Add "no hooks below" guard comment** (before line 382)

```typescript
  }, [userHome?.id, refetchTasks, invalidateRiskDeltas, queryClient]);

  // ========================================================
  // 🚨 HOOKS BOUNDARY - Do not add hooks below this point.
  // React hooks must be declared above early returns.
  // ========================================================

  // Loading state
  if (loading) {
```

**Step 3: Delete the duplicate useMemo** (lines 424-453)

Remove the now-duplicated block that appears after the early returns.

---

## QA Hardening Applied

| Risk | Mitigation |
|------|------------|
| **Unnecessary computation during loading** | ✅ Acceptable - memo guards with `if (!capitalTimeline?.systems) return []` |
| **Dependency completeness** | ✅ `[capitalTimeline]` is correct - data layer returns new object on update |
| **State taxonomy drift** | ✅ Added clarifying comment: internal states vs UI labels |
| **Future regression** | ✅ Added "no hooks below" guard comment |

---

## Final File Structure

```text
Lines 60-304:  All hooks (useState, useEffect, useMemo, useCallback)
Lines 305-336: mobileBaselineSystems useMemo (MOVED ✅)
Lines 337-380: Remaining callbacks
Lines 381:     🚨 HOOKS BOUNDARY comment (NEW ✅)
Lines 382-388: if (loading) early return
Lines 392-418: if (!userHome) early return  
Lines 420+:    Render logic (no hooks)
```

---

## Files Modified

| File | Lines Changed | Change |
|------|---------------|--------|
| `src/pages/DashboardV3.tsx` | 305 | Insert mobileBaselineSystems useMemo with clarifying comments |
| `src/pages/DashboardV3.tsx` | 381 | Add hooks boundary guard comment |
| `src/pages/DashboardV3.tsx` | 424-453 | Delete duplicate useMemo block |

