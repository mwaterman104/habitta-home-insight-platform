/**
 * SystemTileScroll — Horizontal scrolling system preview tiles
 * 
 * Each tile shows:
 * - Small LifecycleRing (56px)
 * - System name
 * - ~X yrs remaining
 * - Replacement window (earlyYear-lateYear)
 * - Assessment quality label
 * - NO cost (per spec)
 * 
 * Ordered by priority score (reuses selectPrimarySystem ordering).
 * Tappable → navigates to /systems/:id/plan
 */

import { useNavigate } from 'react-router-dom';
import { LifecycleRing } from './LifecycleRing';
import { getLifecyclePercent, getRemainingYearsForSystem, getSystemPlanningTier } from '@/services/homeOutlook';
import {
  getSystemDisplayName,
  ASSESSMENT_QUALITY_LABELS,
  ASSESSMENT_QUALITY_PREFIX,
  LATE_LIFE_COPY,
  REPLACEMENT_WINDOW_PREFIX,
} from '@/lib/mobileCopy';
import { trackMobileEvent, MOBILE_EVENTS } from '@/lib/analytics/mobileEvents';
import type { SystemTimelineEntry } from '@/types/capitalTimeline';

interface SystemTileScrollProps {
  systems: SystemTimelineEntry[];
}

export function SystemTileScroll({ systems }: SystemTileScrollProps) {
  const navigate = useNavigate();

  const handleTileTap = (system: SystemTimelineEntry) => {
    trackMobileEvent(MOBILE_EVENTS.VIEW_PLAN_OPEN, {
      systemKey: system.systemId,
    });
    navigate(`/systems/${system.systemId}/plan`);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">Key systems</h3>

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
        {systems.map((system) => {
          const percent = getLifecyclePercent(system);
          const remainingYears = getRemainingYearsForSystem(system);
          const qualityLabel = ASSESSMENT_QUALITY_LABELS[system.dataQuality] ?? 'Low';
          const window = system.replacementWindow;

          const isLateLife = remainingYears !== null && remainingYears <= 0;
          const tier = getSystemPlanningTier(system.systemId);
          const lateLifeCopy = tier === 'planning-critical'
            ? LATE_LIFE_COPY.planningCritical
            : LATE_LIFE_COPY.routineReplacement;

          return (
            <button
              key={system.systemId}
              onClick={() => handleTileTap(system)}
              className="snap-start shrink-0 w-[160px] rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
            >
              <div className="flex flex-col items-center gap-2">
                <LifecycleRing
                  percentConsumed={percent}
                  size={56}
                  aria-label={isLateLife ? lateLifeCopy.primary : undefined}
                >
                  <span className="text-xs font-semibold text-foreground">
                    {remainingYears === null ? '—' : isLateLife ? '—' : `~${remainingYears}`}
                  </span>
                </LifecycleRing>

                <div className="w-full text-center space-y-0.5">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getSystemDisplayName(system.systemId)}
                  </p>
                  {isLateLife ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {lateLifeCopy.primary}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        {lateLifeCopy.secondary}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {remainingYears !== null ? `~${remainingYears} yrs remaining` : 'Age unknown'}
                    </p>
                  )}
                  {window && (
                    <p className="text-xs text-muted-foreground">
                      {REPLACEMENT_WINDOW_PREFIX}: {window.earlyYear}–{window.lateYear}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground/70">
                    {ASSESSMENT_QUALITY_PREFIX}: {qualityLabel}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
