/**
 * Shared zone derivation utilities for system health visualizations.
 * Used by SystemsHealthTimeline, SystemFocusDetail, and CapExBudgetRoadmap.
 */

export type Zone = 'OK' | 'WATCH' | 'PLAN NOW';

export function deriveZone(yearsToLikely: number | null): Zone {
  if (yearsToLikely === null) return 'OK';
  if (yearsToLikely <= 3) return 'PLAN NOW';
  if (yearsToLikely <= 6) return 'WATCH';
  return 'OK';
}

export function getBarColor(zone: Zone): string {
  switch (zone) {
    case 'PLAN NOW': return 'bg-red-500';
    case 'WATCH': return 'bg-amber-500';
    case 'OK': return 'bg-emerald-500';
  }
}

export function getBadgeClasses(zone: Zone): string {
  switch (zone) {
    case 'PLAN NOW': return 'bg-red-500 text-white animate-subtle-pulse shadow-sm shadow-red-200';
    case 'WATCH': return 'bg-amber-500 text-white';
    case 'OK': return 'bg-emerald-500 text-white';
  }
}
