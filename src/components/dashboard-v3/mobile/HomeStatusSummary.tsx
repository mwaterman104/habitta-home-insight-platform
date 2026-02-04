import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import { 
  STATUS_COPY, 
  deriveStatusLevel,
  getSystemDisplayName 
} from "@/lib/mobileCopy";

interface HomeStatusSummaryProps {
  systems: SystemTimelineEntry[];
  primarySystem: SystemTimelineEntry | null;
  priorityExplanation: string;
  secondarySystemsCount: number;
}

/**
 * HomeStatusSummary - Now/Next/Later structure
 * 
 * Answers "Am I okay?" and "What's next?" immediately.
 * 
 * Mobile Render Contract:
 * - Now: Current state interpretation (from primary system)
 * - Next: Actionable recommendation anchored to primary system
 * - Later: Reassurance for remaining systems
 */
export function HomeStatusSummary({ 
  systems,
  primarySystem,
  priorityExplanation,
  secondarySystemsCount
}: HomeStatusSummaryProps) {
  
  // Empty state
  if (!systems || systems.length === 0) {
    return (
      <div className="space-y-3 px-1">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Home Status
        </h2>
        <p className="text-[15px] text-foreground leading-relaxed">
          Add your home systems to get personalized insights.
        </p>
      </div>
    );
  }
  
  // Derive status level from primary system
  const getStatusInfo = () => {
    if (!primarySystem) {
      return { level: 'stable' as const, name: 'home' };
    }
    
    const currentYear = new Date().getFullYear();
    const installYear = primarySystem.installYear;
    const age = installYear ? currentYear - installYear : null;
    
    const likelyYear = primarySystem.replacementWindow?.likelyYear;
    const expectedLifespan = likelyYear && installYear 
      ? likelyYear - installYear 
      : 15;
    
    const remainingYears = likelyYear ? likelyYear - currentYear : null;
    const lifecyclePercent = age && expectedLifespan 
      ? (age / expectedLifespan) * 100 
      : 0;
    
    const level = deriveStatusLevel(lifecyclePercent, age, expectedLifespan);
    const name = primarySystem.systemLabel || getSystemDisplayName(primarySystem.systemId);
    
    return { level, name };
  };
  
  const { level, name } = getStatusInfo();
  
  // Generate copy from status level
  const nowCopy = STATUS_COPY.now[level](name);
  const nextCopy = STATUS_COPY.next[level](name);
  const laterCopy = STATUS_COPY.later(secondarySystemsCount);

  return (
    <div className="space-y-4 px-1">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Home Status
      </h2>
      
      {/* Now */}
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Now</h3>
        <p className="text-[15px] text-foreground leading-relaxed">
          {nowCopy}
        </p>
      </div>
      
      {/* Next */}
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Next</h3>
        <p className="text-[15px] text-foreground leading-relaxed">
          {nextCopy}
        </p>
      </div>
      
      {/* Later (only show if there are secondary systems) */}
      {secondarySystemsCount > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Later</h3>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            {laterCopy}
          </p>
        </div>
      )}
    </div>
  );
}
