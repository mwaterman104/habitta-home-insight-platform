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
  
  // Solid colors matching the reference design aesthetic
  const getWindowColor = () => {
    if (yearsToLikely <= 3) return 'bg-red-200';
    if (yearsToLikely <= 6) return 'bg-amber-200';
    return 'bg-emerald-200';
  };
  
  const getLikelyColor = () => {
    if (yearsToLikely <= 3) return 'bg-red-500';
    if (yearsToLikely <= 6) return 'bg-amber-500';
    return 'bg-emerald-500';
  };
  
  const getMarkerColor = () => {
    if (yearsToLikely <= 3) return 'bg-red-600';
    if (yearsToLikely <= 6) return 'bg-teal-600';
    return 'bg-teal-600';
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
              {/* The replacement window bar - light solid color */}
              {earlyPos < 100 && (
                <div 
                  className={`absolute inset-y-1 ${getWindowColor()} rounded-md transition-all`}
                  style={{ 
                    left: `${earlyPos}%`, 
                    width: `${barWidth}%`,
                  }}
                />
              )}
              
              {/* "Most likely" filled portion - darker solid from early to likely */}
              {earlyPos < 100 && likelyPos >= earlyPos && (
                <div 
                  className={`absolute inset-y-1 ${getLikelyColor()} rounded-md transition-all`}
                  style={{ 
                    left: `${earlyPos}%`, 
                    width: `${Math.max(0, likelyPos - earlyPos)}%`,
                  }}
                />
              )}
              
              {/* Most likely marker - taller vertical line */}
              {likelyPos <= 100 && likelyPos >= 0 && (
                <div 
                  className={`absolute w-1 ${getMarkerColor()} rounded-sm`}
                  style={{ 
                    left: `${likelyPos}%`,
                    top: '0',
                    height: '100%'
                  }}
                />
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
