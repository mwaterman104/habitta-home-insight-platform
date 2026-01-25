import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import type { ContributorLevel } from "@/lib/homeHealthOutlookCopy";

interface ExtendedSystemTimelineEntry extends SystemTimelineEntry {
  // Pre-formatted labels from server (UI renders blindly)
  installedLine?: string;
  confidenceScore?: number;
  confidenceLevel?: 'low' | 'medium' | 'high';
}

interface SystemTimelineLaneProps {
  system: ExtendedSystemTimelineEntry;
  startYear: number;
  endYear: number;
  onClick?: () => void;
  // NEW: Contributor level for score connection
  contributorLevel?: ContributorLevel;
  // NEW: Whether to show the contributor indicator
  showContributorIndicator?: boolean;
}

/**
 * SystemTimelineLane - Renders a single system's replacement window as a gradient bar
 * 
 * Maps p10 (early) → p50 (likely) → p90 (late) onto the timeline.
 * Darker center indicates higher probability.
 * 
 * IMPORTANT: Uses server-provided `installedLine` for labels when available.
 * Falls back to local derivation only for backward compatibility.
 */
export function SystemTimelineLane({ 
  system, 
  startYear, 
  endYear, 
  onClick,
  contributorLevel,
  showContributorIndicator = false,
}: SystemTimelineLaneProps) {
  const { earlyYear, likelyYear, lateYear } = system.replacementWindow;
  const range = endYear - startYear;
  
  // Calculate positions as percentages (clamped to visible range)
  const rawEarlyPos = ((earlyYear - startYear) / range) * 100;
  const rawLikelyPos = ((likelyYear - startYear) / range) * 100;
  const rawLatePos = ((lateYear - startYear) / range) * 100;
  
  // Clamp positions for rendering
  const earlyPos = Math.max(0, Math.min(100, rawEarlyPos));
  const likelyPos = Math.max(0, Math.min(100, rawLikelyPos));
  const latePos = Math.max(0, Math.min(100, rawLatePos));
  
  // Determine if any part of the window is visible
  const isWindowVisible = rawEarlyPos < 100 && rawLatePos > 0;
  
  // Width of the window bar (clamped to visible portion)
  const visibleStart = Math.max(0, earlyPos);
  const visibleEnd = Math.min(100, latePos);
  const barWidth = Math.max(5, visibleEnd - visibleStart); // Minimum 5% width for visibility
  
  // Color based on how soon the likely replacement is (from current year, not startYear)
  const currentYear = new Date().getFullYear();
  const yearsToLikely = likelyYear - currentYear;
  
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

  // Use server-provided dataQuality OR confidenceLevel for "Estimated" label
  // Priority: confidenceLevel (new) > dataQuality (legacy)
  const effectiveQuality = system.confidenceLevel ?? system.dataQuality;
  const showEstimatedLabel = effectiveQuality === 'low';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg py-2 px-1 -mx-1 transition-colors"
            onClick={onClick}
          >
            {/* Contributor indicator - desaturated colors */}
            {showContributorIndicator && contributorLevel && (
              <div className={cn(
                "w-1.5 h-7 rounded-full shrink-0",
                contributorLevel === 'primary' && "bg-red-300/70",
                contributorLevel === 'moderate' && "bg-amber-300/70",
                contributorLevel === 'minor' && "bg-emerald-300/70"
              )} />
            )}
            
            {/* System label */}
            <div className={cn("flex-shrink-0", showContributorIndicator ? "w-24" : "w-28")}>
              <span className="system-name text-sm text-foreground">
                {system.systemLabel}
              </span>
              {showEstimatedLabel && (
                <span className="block text-[10px] text-muted-foreground">
                  Based on permits, records, and regional averages
                </span>
              )}
            </div>
            
            {/* Timeline bar container */}
            <div className="flex-1 h-7 bg-muted/30 rounded-lg relative overflow-hidden">
              {/* The replacement window bar - light solid color */}
              {isWindowVisible && (
                <div 
                  className={`absolute inset-y-1 ${getWindowColor()} rounded-md transition-all`}
                  style={{ 
                    left: `${visibleStart}%`, 
                    width: `${barWidth}%`,
                  }}
                />
              )}
              
              {/* "Most likely" filled portion - darker solid from early to likely */}
              {isWindowVisible && likelyPos > visibleStart && (
                <div 
                  className={`absolute inset-y-1 ${getLikelyColor()} rounded-md transition-all`}
                  style={{ 
                    left: `${visibleStart}%`, 
                    width: `${Math.max(0, Math.min(likelyPos, visibleEnd) - visibleStart)}%`,
                  }}
                />
              )}
              
              {/* Most likely marker - taller vertical line (only if visible) */}
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
              
              {/* "Beyond timeline" indicator for systems entirely past visible range */}
              {rawEarlyPos >= 100 && (
                <div className="absolute inset-0 flex items-center justify-end pr-2">
                  <span className="text-xs text-emerald-600 font-medium">
                    ~{likelyYear} (beyond horizon)
                  </span>
                </div>
              )}
              
              {/* Indicator when likely year extends past visible range but window starts visible */}
              {isWindowVisible && rawLikelyPos > 100 && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground italic">
                  →{likelyYear}
                </div>
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
            {/* Use server-provided installedLine if available */}
            {system.installedLine && (
              <p className="text-sm text-muted-foreground">
                {system.installedLine}
              </p>
            )}
            <p className="text-sm">
              Observed replacement window: <strong>{likelyYear}</strong>
              <br />
              Range: {earlyYear}–{lateYear}
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
