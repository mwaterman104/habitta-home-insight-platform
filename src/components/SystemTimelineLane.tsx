import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";

interface SystemTimelineLaneProps {
  system: SystemTimelineEntry;
  startYear: number;
  endYear: number;
  onClick?: () => void;
}

/**
 * SystemTimelineLane - Renders a single system's replacement window as a gradient bar
 * 
 * Maps p10 (early) → p50 (likely) → p90 (late) onto the timeline.
 * Darker center indicates higher probability.
 */
export function SystemTimelineLane({ system, startYear, endYear, onClick }: SystemTimelineLaneProps) {
  const { earlyYear, likelyYear, lateYear } = system.replacementWindow;
  const range = endYear - startYear;
  
  // Calculate positions as percentages
  const earlyPos = Math.max(0, ((earlyYear - startYear) / range) * 100);
  const likelyPos = Math.max(0, Math.min(100, ((likelyYear - startYear) / range) * 100));
  const latePos = Math.min(100, ((lateYear - startYear) / range) * 100);
  
  // Width of the window bar
  const barWidth = Math.max(5, latePos - earlyPos); // Minimum 5% width for visibility
  
  // Color based on how soon the likely replacement is
  const yearsToLikely = likelyYear - startYear;
  const getBarColor = () => {
    if (yearsToLikely <= 3) return 'from-red-200 via-red-400 to-red-200';
    if (yearsToLikely <= 6) return 'from-amber-200 via-amber-400 to-amber-200';
    return 'from-green-200 via-green-400 to-green-200';
  };
  
  const getMarkerColor = () => {
    if (yearsToLikely <= 3) return 'bg-red-600';
    if (yearsToLikely <= 6) return 'bg-amber-600';
    return 'bg-green-600';
  };
  
  // Format cost range
  const formatCost = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg py-2 px-1 -mx-1 transition-colors"
            onClick={onClick}
          >
            {/* System label */}
            <div className="w-28 flex-shrink-0">
              <span className="text-sm font-medium text-foreground">
                {system.systemLabel}
              </span>
              {system.dataQuality === 'low' && (
                <span className="block text-[10px] text-muted-foreground">
                  Estimated
                </span>
              )}
            </div>
            
            {/* Timeline bar container */}
            <div className="flex-1 h-7 bg-muted/30 rounded-lg relative overflow-hidden">
              {/* The replacement window bar */}
              {earlyPos < 100 && (
                <div 
                  className={`absolute inset-y-1 bg-gradient-to-r ${getBarColor()} rounded-md transition-all`}
                  style={{ 
                    left: `${earlyPos}%`, 
                    width: `${barWidth}%`,
                  }}
                />
              )}
              
              {/* Most likely marker */}
              {likelyPos <= 100 && likelyPos >= 0 && (
                <div 
                  className={`absolute inset-y-0 w-1 ${getMarkerColor()} rounded-sm`}
                  style={{ left: `${likelyPos}%` }}
                />
              )}
              
              {/* Year label on the bar if room */}
              {likelyPos > 10 && likelyPos < 90 && (
                <span 
                  className="absolute top-1/2 -translate-y-1/2 text-[10px] font-medium text-foreground/70"
                  style={{ left: `${likelyPos + 2}%` }}
                >
                  {likelyYear}
                </span>
              )}
            </div>
            
            {/* Cost range */}
            <div className="w-24 text-right flex-shrink-0">
              <span className="text-sm text-muted-foreground">
                {formatCost(system.capitalCost.low)}–{formatCost(system.capitalCost.high)}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-medium">{system.systemLabel}</p>
            <p className="text-sm">
              Likely replacement: <strong>{likelyYear}</strong>
              <br />
              Window: {earlyYear}–{lateYear}
            </p>
            <p className="text-xs text-muted-foreground italic">
              {system.disclosureNote}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
