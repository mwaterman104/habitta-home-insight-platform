import { Badge } from "@/components/ui/badge";
import { Sun, Wind, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvironmentalSignals {
  heatStress: 'normal' | 'elevated' | 'low';
  permitActivity: 'normal' | 'elevated';
  weatherAlerts: boolean;
}

interface MapEnvironmentOverlayProps {
  signals: EnvironmentalSignals;
  className?: string;
}

/**
 * MapEnvironmentOverlay - Environmental confirmation signals
 * 
 * Reinforces: "Habitta is validating even when I'm not looking"
 * Small, muted badges. No clicks required.
 */
export function MapEnvironmentOverlay({ signals, className }: MapEnvironmentOverlayProps) {
  const getHeatStressConfig = () => {
    switch (signals.heatStress) {
      case 'elevated':
        return { 
          label: 'Heat stress: elevated', 
          icon: Sun, 
          className: 'bg-amber-100 text-amber-700 border-amber-200' 
        };
      case 'low':
        return { 
          label: 'Heat stress: low', 
          icon: Check, 
          className: 'bg-emerald-100 text-emerald-700 border-emerald-200' 
        };
      default:
        return { 
          label: 'Heat stress: normal', 
          icon: Sun, 
          className: 'bg-muted text-muted-foreground border-muted' 
        };
    }
  };

  const getPermitConfig = () => {
    if (signals.permitActivity === 'elevated') {
      return { 
        label: 'Permit activity: elevated', 
        className: 'bg-amber-100 text-amber-700 border-amber-200' 
      };
    }
    return { 
      label: 'No abnormal permit activity', 
      className: 'bg-muted text-muted-foreground border-muted' 
    };
  };

  const heatConfig = getHeatStressConfig();
  const permitConfig = getPermitConfig();
  const HeatIcon = heatConfig.icon;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Heat stress */}
      <Badge 
        variant="outline" 
        className={cn("text-xs py-0.5 px-2 font-normal shadow-sm", heatConfig.className)}
      >
        <HeatIcon className="h-3 w-3 mr-1" />
        {heatConfig.label}
      </Badge>

      {/* Permit activity */}
      <Badge 
        variant="outline" 
        className={cn("text-xs py-0.5 px-2 font-normal shadow-sm", permitConfig.className)}
      >
        {permitConfig.label}
      </Badge>

      {/* Weather alerts */}
      {signals.weatherAlerts ? (
        <Badge 
          variant="outline" 
          className="text-xs py-0.5 px-2 font-normal shadow-sm bg-amber-100 text-amber-700 border-amber-200"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Weather alerts active
        </Badge>
      ) : (
        <Badge 
          variant="outline" 
          className="text-xs py-0.5 px-2 font-normal shadow-sm bg-muted text-muted-foreground border-muted"
        >
          <Check className="h-3 w-3 mr-1" />
          No weather alerts
        </Badge>
      )}
    </div>
  );
}
