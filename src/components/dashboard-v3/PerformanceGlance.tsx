import { CheckCircle2, AlertTriangle, Clock, Info, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";

interface PerformanceGlanceProps {
  homeForecast: HomeForecast | null;
  hvacPrediction: SystemPrediction | null;
  capitalTimeline: HomeCapitalTimeline | null;
  quarter: string;
}

interface GlanceItem {
  icon: typeof CheckCircle2;
  iconColor: string;
  title: string;
  description: string;
  status: 'good' | 'attention' | 'info';
}

/**
 * PerformanceGlance - "Am I okay?" summary cards
 * 
 * Answers: "Am I okay?" at a glance
 * 
 * Shows:
 * - Home Health status
 * - Systems status
 * - Planning ahead items
 * - Urgent items (or "Nothing urgent")
 * 
 * This is where green/yellow/red do the emotional work chat is not doing.
 */
export function PerformanceGlance({
  homeForecast,
  hvacPrediction,
  capitalTimeline,
  quarter,
}: PerformanceGlanceProps) {
  // Build glance items based on data
  const glanceItems: GlanceItem[] = [];

  // 1. Home Health Status
  const healthScore = homeForecast?.currentScore || 82;
  const healthTrend = homeForecast ? 
    (homeForecast.currentScore >= homeForecast.ifLeftUntracked.score12mo ? 'stable' : 'declining') : 
    'stable';

  if (healthScore >= 75) {
    glanceItems.push({
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      title: "Home Health Stable",
      description: `Score of ${healthScore} — no action needed`,
      status: 'good'
    });
  } else if (healthScore >= 60) {
    glanceItems.push({
      icon: AlertTriangle,
      iconColor: "text-amber-600",
      title: "Home Health Attention",
      description: `Score of ${healthScore} — some items need attention`,
      status: 'attention'
    });
  } else {
    glanceItems.push({
      icon: AlertTriangle,
      iconColor: "text-red-600",
      title: "Home Health Critical",
      description: `Score of ${healthScore} — immediate attention recommended`,
      status: 'attention'
    });
  }

  // 2. HVAC System Status
  if (hvacPrediction) {
    if (hvacPrediction.status === 'low') {
      glanceItems.push({
        icon: CheckCircle2,
        iconColor: "text-emerald-600",
        title: "HVAC System Healthy",
        description: "Well within expected lifespan",
        status: 'good'
      });
    } else if (hvacPrediction.status === 'moderate') {
      glanceItems.push({
        icon: AlertTriangle,
        iconColor: "text-amber-600",
        title: "HVAC Entering Planning Window",
        description: hvacPrediction.forecast.summary || "Consider future replacement planning",
        status: 'attention'
      });
    } else {
      glanceItems.push({
        icon: AlertTriangle,
        iconColor: "text-red-600",
        title: "HVAC Needs Attention",
        description: hvacPrediction.forecast.summary || "Replacement planning recommended",
        status: 'attention'
      });
    }
  }

  // 3. Planning Ahead (from capital timeline)
  if (capitalTimeline) {
    const currentYear = new Date().getFullYear();
    const planningSystem = capitalTimeline.systems.find(s => {
      const yearsToReplacement = s.replacementWindow.likelyYear - currentYear;
      return yearsToReplacement <= 7 && yearsToReplacement > 2;
    });

    if (planningSystem) {
      const yearsToReplacement = planningSystem.replacementWindow.likelyYear - currentYear;
      glanceItems.push({
        icon: Clock,
        iconColor: "text-blue-600",
        title: "Planning Ahead",
        description: `${planningSystem.systemLabel} replacement window in ${Math.round(yearsToReplacement)}-${Math.round(yearsToReplacement + 2)} yrs`,
        status: 'info'
      });
    }
  }

  // 4. Urgent Items or "Nothing Urgent"
  const hasUrgentItems = hvacPrediction?.status === 'high' || 
    (homeForecast && homeForecast.currentScore < 60);

  if (!hasUrgentItems) {
    glanceItems.push({
      icon: RefreshCcw,
      iconColor: "text-muted-foreground",
      title: "Nothing Urgent",
      description: "No immediate maintenance required",
      status: 'good'
    });
  }

  // Determine overall message
  const overallMessage = hasUrgentItems 
    ? "Some items need your attention."
    : "Your home is performing well.";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Performance at a Glance</CardTitle>
          <span className="text-xs text-muted-foreground">{quarter}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall message */}
        <p className="text-sm text-muted-foreground">
          {overallMessage}
          <br />
          <span className="text-xs">Here's what the data tells us:</span>
        </p>

        {/* Glance items */}
        <div className="space-y-3">
          {glanceItems.map((item, index) => (
            <div 
              key={index}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border",
                item.status === 'good' && "bg-emerald-50/50 border-emerald-100",
                item.status === 'attention' && "bg-amber-50/50 border-amber-100",
                item.status === 'info' && "bg-blue-50/50 border-blue-100"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0 mt-0.5", item.iconColor)} />
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
