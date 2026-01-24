import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronRight, Zap, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStewardshipCopy } from "@/lib/stewardshipCopy";
import type { SystemPrediction } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";

interface PlanningSystem {
  key: string;
  name: string;
  remainingYears: number;
  status: 'attention' | 'planning';
}

interface SystemWatchProps {
  hvacPrediction: SystemPrediction | null;
  capitalTimeline: HomeCapitalTimeline | null;
  onSystemClick: (systemKey: string) => void;
  onChatExpand?: () => void;
  nextReviewMonth?: string;
}

const SYSTEM_NAMES: Record<string, string> = {
  hvac: 'HVAC',
  roof: 'Roof',
  water_heater: 'Water Heater',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  windows: 'Windows',
  appliances: 'Appliances',
};

/**
 * SystemWatch - Authoritative planning window alert with stewardship mode
 * 
 * V2: Uses validation language for healthy homes ("Baseline confirmed")
 * instead of dismissive "No planning windows for 7 years"
 * 
 * Positioned at top of dashboard. Shows systems entering planning windows.
 * Boxed, high-visibility design. Plain English, no metrics.
 */
export function SystemWatch({
  hvacPrediction,
  capitalTimeline,
  onSystemClick,
  onChatExpand,
  nextReviewMonth,
}: SystemWatchProps) {
  const stewardshipCopy = getStewardshipCopy().systemWatchHealthy;
  const navigate = useNavigate();

  const planningWindowSystems = useMemo(() => {
    const systems: PlanningSystem[] = [];
    const currentYear = new Date().getFullYear();

    // Check HVAC from prediction
    if (hvacPrediction) {
      const remainingYears = hvacPrediction.lifespan?.years_remaining_p50;
      if (remainingYears && remainingYears <= 7) {
        systems.push({
          key: 'hvac',
          name: 'HVAC',
          remainingYears,
          status: remainingYears <= 3 ? 'attention' : 'planning'
        });
      }
    }

    // Check capital timeline systems
    capitalTimeline?.systems.forEach(sys => {
      // Skip if already added from HVAC prediction
      if (systems.some(s => s.key === sys.systemId)) return;
      
      const yearsToReplacement = sys.replacementWindow.likelyYear - currentYear;
      if (yearsToReplacement <= 7 && yearsToReplacement > 0) {
        systems.push({
          key: sys.systemId,
          name: SYSTEM_NAMES[sys.systemId] || sys.systemLabel,
          remainingYears: yearsToReplacement,
          status: yearsToReplacement <= 3 ? 'attention' : 'planning'
        });
      }
    });

    // Sort by most imminent first
    return systems.sort((a, b) => a.remainingYears - b.remainingYears);
  }, [hvacPrediction, capitalTimeline]);

  const primarySystem = planningWindowSystems[0];
  const secondaryCount = planningWindowSystems.length - 1;
  const hasAttention = planningWindowSystems.some(s => s.status === 'attention');
  const isAllClear = planningWindowSystems.length === 0;

  const handleViewSystem = () => {
    if (primarySystem) {
      navigate(`/systems/${primarySystem.key}`);
      onSystemClick(primarySystem.key);
    }
  };

  const handleAskHabitta = () => {
    onChatExpand?.();
  };

  // All-clear state - STEWARDSHIP MODE (validation language)
  if (isAllClear) {
    return (
      <Card className={cn(
        "rounded-xl border-2",
        "border-emerald-200 bg-emerald-50/50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  System Watch
                </span>
              </div>
              <p className="text-sm text-foreground font-medium">
                {stewardshipCopy.headline}
              </p>
              <p className="text-sm text-muted-foreground">
                {stewardshipCopy.subtext}
              </p>
              {/* Next review indicator - creates return rhythm */}
              {nextReviewMonth && (
                <p className="text-xs text-muted-foreground/70 mt-2">
                  {stewardshipCopy.nextReviewText(nextReviewMonth)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Planning/attention state
  return (
    <Card className={cn(
      "rounded-xl border-2",
      hasAttention 
        ? "border-amber-300 bg-amber-50/50" 
        : "border-amber-200 bg-amber-50/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-2.5">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            hasAttention ? "bg-amber-200" : "bg-amber-100"
          )}>
            <AlertTriangle className={cn(
              "h-4 w-4",
              hasAttention ? "text-amber-700" : "text-amber-600"
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                System Watch
              </span>
            </div>
            
            <p className="text-sm text-foreground font-medium">
              Your {primarySystem.name} is entering its planning window.
            </p>
            <p className="text-sm text-muted-foreground">
              {primarySystem.remainingYears <= 3 
                ? `${primarySystem.remainingYears}–${primarySystem.remainingYears + 2} years until likely replacement.`
                : `${primarySystem.remainingYears - 2}–${primarySystem.remainingYears} years until likely replacement.`
              }
            </p>
            
            {/* Secondary systems summary */}
            {secondaryCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2 border-t border-amber-200/50 pt-2">
                {secondaryCount} other system{secondaryCount > 1 ? 's' : ''} monitored.
              </p>
            )}
            
            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleViewSystem}
                className="h-8 text-xs bg-white/80 hover:bg-white"
              >
                View {primarySystem.name} Details
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              {onChatExpand && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAskHabitta}
                  className="h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100/50"
                >
                  Ask Habitta
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
