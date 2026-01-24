import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import { getStewardshipCopy } from "@/lib/stewardshipCopy";
import { cn } from "@/lib/utils";

interface QuarterlyPosition {
  agingRate: 'better' | 'average' | 'faster';
  percentile: number;
  environmentalStress: 'normal' | 'elevated' | 'low';
  maintenanceSignalStrength: 'high' | 'medium' | 'low';
  positionChanged: boolean;
}

interface QuarterlyPositionCardProps {
  position: QuarterlyPosition;
  homeId: string;
  onDismiss: () => void;
}

/**
 * QuarterlyPositionCard - Comparative intelligence
 * 
 * Creates pull through curiosity, not duty.
 * Shows aging rate, environmental stress, signal strength.
 * "Position unchanged" appears when nothing changed — that's the point.
 */
export function QuarterlyPositionCard({ 
  position, 
  homeId, 
  onDismiss 
}: QuarterlyPositionCardProps) {
  const copy = getStewardshipCopy().quarterlyPosition;

  const getAgingIcon = () => {
    switch (position.agingRate) {
      case 'better': return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case 'faster': return <TrendingDown className="h-4 w-4 text-amber-600" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStressColor = () => {
    switch (position.environmentalStress) {
      case 'low': return 'text-emerald-600';
      case 'elevated': return 'text-amber-600';
      default: return 'text-foreground';
    }
  };

  const getSignalColor = () => {
    switch (position.maintenanceSignalStrength) {
      case 'high': return 'text-emerald-600';
      case 'low': return 'text-amber-600';
      default: return 'text-foreground';
    }
  };

  return (
    <Card className="rounded-xl border-2 border-indigo-100 bg-indigo-50/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            {copy.header}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Metrics grid */}
        <div className="space-y-3">
          {/* Aging rate */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Aging rate</span>
            <div className="flex items-center gap-2">
              {getAgingIcon()}
              <span className="text-sm font-medium">
                {copy.agingRateLabels[position.agingRate]}
              </span>
            </div>
          </div>

          {/* Percentile */}
          {position.agingRate === 'better' && (
            <p className="text-xs text-muted-foreground pl-0">
              Better than {position.percentile}% of similar homes
            </p>
          )}

          {/* Environmental stress */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Environmental stress</span>
            <span className={cn("text-sm font-medium capitalize", getStressColor())}>
              {position.environmentalStress}
            </span>
          </div>

          {/* Maintenance signal strength */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Maintenance signal</span>
            <span className={cn("text-sm font-medium capitalize", getSignalColor())}>
              {position.maintenanceSignalStrength}
            </span>
          </div>
        </div>

        {/* Footer - position status */}
        <div className="mt-4 pt-3 border-t border-indigo-200/50">
          <p className="text-sm text-indigo-700 font-medium">
            {position.positionChanged ? copy.positionImproved : copy.positionUnchanged}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
