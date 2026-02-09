

# Fix: SystemPlanPage Hooks Violation

## Problem

`SystemPlanPage.tsx` has a `useMemo` call (line 235) placed **after** multiple early `return` statements (lines 98-226). React requires hooks to be called in the same order on every render. When the component returns early (e.g., during loading), `useMemo` is skipped. On re-render when data arrives, it tries to call `useMemo`, producing the "Rendered more hooks than during the previous render" crash.

## Fix

Move the `useMemo` for `baselineSystems` **above** all early returns (after line 76, near the other derived values). The memo already handles the null case internally (`if (!timeline?.systems) return []`), so it is safe to call unconditionally.

### File: `src/services/homeOutlook.ts`
No changes.

### File: `src/pages/SystemPlanPage.tsx`

1. **Remove** the `useMemo` block from lines 234-262
2. **Insert** it immediately after line 76 (after the `system` derivation), before any early returns
3. No logic changes needed -- the existing `if (!timeline?.systems) return []` guard handles all null states

## Risk
Zero. Pure hook ordering fix. No behavior change.

