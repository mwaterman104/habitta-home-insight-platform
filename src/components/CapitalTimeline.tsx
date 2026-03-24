import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import { SystemTimelineLane } from "./SystemTimelineLane";

interface CapitalTimelineProps {
  timeline: HomeCapitalTimeline;
  onSystemClick?: (systemId: string) => void;
}

/**
 * CapitalTimeline - Horizontal multi-system replacement window visualization
 * 
 * Design:
 * - Horizontal axis: Now → +10 years
 * - One lane per system
 * - Bars = probabilistic replacement window
 * - Center emphasis = most likely year
 */
export function CapitalTimeline({ timeline, onSystemClick }: CapitalTimelineProps) {
  const currentYear = new Date().getFullYear();
  const endYear = currentYear + timeline.horizonYears;
  
  // Generate year markers
  const yearMarkers = useMemo(() => {
    const markers: number[] = [];
    for (let y = currentYear; y <= endYear; y += 2) {
      markers.push(y);
    }
    return markers;
  }, [currentYear, endYear]);

  return (
    <Card className="rounded-2xl border-t-2 border-t-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="heading-h3">Home Systems Timeline</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Shows when major systems may need replacement. Bars represent probable windows—
                  darker areas indicate higher likelihood. Estimates improve with verified data.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {timeline.dataQuality.completenessPercent < 50 && (
          <p className="text-xs text-muted-foreground">
            {timeline.dataQuality.limitingFactors[0]}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline header with year markers */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="w-28" /> {/* Spacer for system labels */}
          <div className="flex-1 flex justify-between px-1">
            {yearMarkers.map(year => (
              <span key={year} className="text-center" style={{ minWidth: '2rem' }}>
                {year === currentYear ? 'Now' : `'${String(year).slice(2)}`}
              </span>
            ))}
          </div>
          <div className="w-24" /> {/* Spacer for cost range */}
        </div>
        
        {/* System lanes */}
        <div className="space-y-3">
          {timeline.systems.map(system => (
            <SystemTimelineLane
              key={system.systemId}
              system={system}
              startYear={currentYear}
              endYear={endYear}
              onClick={() => onSystemClick?.(system.systemId)}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gradient-to-r from-amber-200 to-amber-400 rounded" />
              <span>Replacement window</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-0.5 h-3 bg-amber-600 rounded" />
              <span>Most likely</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground italic">
            Tap a system for details
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
