import { ChevronRight } from "lucide-react";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import { 
  SECONDARY_STATUS, 
  getPlanningStatus,
  getSystemDisplayName 
} from "@/lib/mobileCopy";

interface SecondarySystemsListProps {
  systems: SystemTimelineEntry[];
  onSystemTap: (systemKey: string) => void;
}

// Maximum visible items before showing "+N more"
const MAX_VISIBLE = 3;

/**
 * SecondarySystemsList - Text-only collapsed list of other systems
 * 
 * Mobile Render Contract:
 * - Text only (no cards)
 * - No nested components
 * - Maximum 3 visible, "+N more" if exceeded
 * - Critical Guardrail: Systems past lifespan are NEVER labeled "Stable"
 */
export function SecondarySystemsList({ systems, onSystemTap }: SecondarySystemsListProps) {
  if (!systems || systems.length === 0) return null;

  const visibleSystems = systems.slice(0, MAX_VISIBLE);
  const hiddenCount = systems.length - MAX_VISIBLE;

  const currentYear = new Date().getFullYear();

  // Get status with aging guardrail
  // Status dot color mapping
  const dotColorMap: Record<string, string> = {
    stable: 'bg-slate-300',
    watch: 'bg-amber-400',
    plan: 'bg-orange-500',
    aging: 'bg-orange-500',
  };

  const getStatusInfo = (system: SystemTimelineEntry): { 
    label: string; 
    showChevron: boolean;
    dotColor: string;
  } => {
    const installYear = system.installYear;
    const age = installYear ? currentYear - installYear : null;
    
    const likelyYear = system.replacementWindow?.likelyYear;
    const expectedLifespan = likelyYear && installYear 
      ? likelyYear - installYear 
      : 15;
    
    const remainingYears = likelyYear ? likelyYear - currentYear : null;
    
    // Get planning status with aging guardrail
    const statusKey = getPlanningStatus(remainingYears, age, expectedLifespan);
    
    // Map planning status to secondary status labels
    const statusMap: Record<string, keyof typeof SECONDARY_STATUS> = {
      stable: 'stable',
      watch: 'watch',
      plan: 'plan',
      aging: 'aging',
    };
    
    const secondaryKey = statusMap[statusKey] || 'stable';
    const label = SECONDARY_STATUS[secondaryKey];
    
    // Only show chevron for non-stable systems (they're actionable)
    const showChevron = statusKey !== 'stable';
    const dotColor = dotColorMap[statusKey] || 'bg-slate-300';
    
    return { label, showChevron, dotColor };
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      {visibleSystems.map((system, index) => {
        const displayName = system.systemLabel || getSystemDisplayName(system.systemId);
        const { label, showChevron, dotColor } = getStatusInfo(system);
        const isLast = index === visibleSystems.length - 1 && hiddenCount <= 0;

        return (
          <button
            key={system.systemId}
            onClick={() => onSystemTap(system.systemId)}
            className={`w-full flex items-center justify-between px-4 py-3 text-left active:bg-muted/50 transition-colors ${
              !isLast ? 'border-b border-border/30' : ''
            }`}
          >
            <span className="text-sm text-foreground flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
              {displayName} <span className="text-muted-foreground">· {label}</span>
            </span>
            {showChevron && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </button>
        );
      })}
      
      {hiddenCount > 0 && (
        <div className="px-4 py-2.5 text-xs text-muted-foreground bg-muted/30">
          +{hiddenCount} more system{hiddenCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
