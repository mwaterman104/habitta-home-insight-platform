import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import { 
  PLANNING_STATUS, 
  getPlanningStatus, 
  getInstallSourceLabel,
  getSystemDisplayName 
} from "@/lib/mobileCopy";

interface PrimarySystemFocusCardProps {
  system: SystemTimelineEntry;
  priorityExplanation: string;
  onViewPlan: () => void;
}

/**
 * PrimarySystemFocusCard - The one system that matters most right now
 * 
 * Mobile Render Contract:
 * - System name + planning status badge
 * - Install year + source label (Permit verified / Owner reported / Estimated)
 * - One explanatory insight (from priorityExplanation)
 * - Single CTA: "View Plan"
 */
export function PrimarySystemFocusCard({ 
  system, 
  priorityExplanation,
  onViewPlan 
}: PrimarySystemFocusCardProps) {
  const currentYear = new Date().getFullYear();
  const installYear = system.installYear;
  const age = installYear ? currentYear - installYear : null;
  
  // Get lifespan from replacement window (likelyYear - installYear approximates expected lifespan)
  const likelyYear = system.replacementWindow?.likelyYear;
  const expectedLifespan = likelyYear && installYear 
    ? likelyYear - installYear 
    : 15; // Default fallback
  
  const remainingYears = likelyYear ? likelyYear - currentYear : null;
  
  // Get planning status with aging guardrail
  const statusKey = getPlanningStatus(remainingYears, age, expectedLifespan);
  const status = PLANNING_STATUS[statusKey];
  
  // Get display name and source label
  const displayName = system.systemLabel || getSystemDisplayName(system.systemId);
  const sourceLabel = getInstallSourceLabel(system.installSource);
  
  // Build install context line
  const installContext = installYear 
    ? `Installed ${installYear} · ${sourceLabel}`
    : sourceLabel;

  // Status-aware border accent color
  const borderColorMap: Record<string, string> = {
    stable: 'border-l-slate-300',
    watch: 'border-l-amber-400',
    plan: 'border-l-orange-500',
    aging: 'border-l-orange-500',
  };
  const borderColor = borderColorMap[statusKey] || 'border-l-slate-300';
  
  // Aging gets a subtle warm background tint
  const agingBg = statusKey === 'aging' ? 'bg-orange-50/40 dark:bg-orange-950/20' : '';

  return (
    <Card className={`border-border shadow-sm border-l-[3px] ${borderColor} ${agingBg || 'bg-card'}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header: System name + status badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-lg">
              {displayName}
            </h3>
            <span className={`text-sm font-medium ${status.colorClass}`}>
              {status.text}
            </span>
          </div>
        </div>
        
        {/* Install context */}
        <p className="text-sm text-muted-foreground">
          {installContext}
        </p>
        
        {/* Priority explanation (insight) */}
        <p className="text-sm text-foreground leading-relaxed">
          {priorityExplanation}
        </p>
        
        {/* View Plan CTA */}
        <Button 
          onClick={onViewPlan}
          className="w-full mt-2"
          variant="default"
        >
          View Plan
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
