/**
 * SystemsHealthTimeline - Vertical system list showing remaining lifespan and status.
 * 
 * Rivian-inspired minimalist design with thin progress bars and pill status badges.
 * Consumes HomeCapitalTimeline data directly.
 */

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { deriveZone, getBarColor, getBadgeClasses } from "@/lib/dashboardUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";

interface SystemsHealthTimelineProps {
  timeline: HomeCapitalTimeline;
  onSystemClick?: (systemId: string) => void;
}

export function SystemsHealthTimeline({ timeline, onSystemClick }: SystemsHealthTimelineProps) {
  const currentYear = new Date().getFullYear();
  const horizonYears = timeline.horizonYears;
  const years = [currentYear, currentYear + 2, currentYear + 4, currentYear + 6, currentYear + 8, currentYear + 10];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-stone-900 tracking-tightest">
          Home Systems Health &amp; Timeline
        </h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-stone-400 cursor-help hover:text-stone-600 transition-colors" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Shows the current lifecycle position of your major home systems. 
                Progress bars indicate how much of a system's expected lifespan has been consumed.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Year-marker scale */}
      <div className="flex justify-between mb-6 px-2">
        {years.map((year) => (
          <span key={year} className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter w-8 text-center">
            {year === currentYear ? 'Now' : `'${year.toString().slice(-2)}`}
          </span>
        ))}
      </div>

      {/* Systems list */}
      <div className="space-y-6">
        {timeline.systems.map((system) => {
          const isBeyondHorizon = system.replacementWindow.earlyYear > currentYear + horizonYears;
          const yearsToLikely = system.replacementWindow.likelyYear - currentYear;
          const zone = deriveZone(yearsToLikely);

          // Lifecycle progress: how much life consumed
          const totalLifeSpan = system.replacementWindow.lateYear - (system.installYear ?? currentYear);
          const lifeConsumed = currentYear - (system.installYear ?? currentYear);
          const progressPercent = Math.min(Math.max((lifeConsumed / totalLifeSpan) * 100, 5), 98);

          return (
            <div
              key={system.systemId}
              className="flex items-center gap-4 cursor-pointer group"
              onClick={() => onSystemClick?.(system.systemId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSystemClick?.(system.systemId)}
            >
              {/* System Name */}
              <div className="w-28 flex-shrink-0">
                <p className="text-sm font-bold text-stone-800 leading-tight group-hover:text-stone-950 transition-colors">
                  {system.systemLabel}
                </p>
              </div>

              {/* Progress Bar or Beyond Horizon */}
              <div className="flex-grow">
                {isBeyondHorizon ? (
                  <div className="flex items-center">
                    <div className="h-px flex-grow border-t border-dashed border-stone-300" />
                    <span className="px-3 text-[11px] font-medium text-stone-400 italic whitespace-nowrap">
                      ~{system.replacementWindow.earlyYear} (beyond horizon)
                    </span>
                  </div>
                ) : (
                  <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        getBarColor(zone)
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="w-24 flex justify-end flex-shrink-0">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase",
                  getBadgeClasses(zone)
                )}>
                  {zone}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {timeline.systems.length === 0 && (
        <p className="text-xs text-stone-500 leading-relaxed text-center py-4">
          We're building your system profile. Add documentation to increase coverage.
        </p>
      )}
    </div>
  );
}
