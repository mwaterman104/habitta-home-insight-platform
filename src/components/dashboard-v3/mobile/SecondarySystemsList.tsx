import { ChevronRight } from "lucide-react";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";

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
 */
export function SecondarySystemsList({ systems, onSystemTap }: SecondarySystemsListProps) {
  if (!systems || systems.length === 0) return null;

  const visibleSystems = systems.slice(0, MAX_VISIBLE);
  const hiddenCount = systems.length - MAX_VISIBLE;

  // Get single-word status from replacement window
  const getStatusWord = (system: SystemTimelineEntry): string => {
    const currentYear = new Date().getFullYear();
    const likelyYear = system.replacementWindow?.likelyYear;
    const remainingYears = likelyYear ? likelyYear - currentYear : undefined;

    if (!remainingYears || remainingYears > 5) return 'Stable';
    if (remainingYears <= 2) return 'Plan';
    return 'Watch';
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      {visibleSystems.map((system, index) => {
        const displayName = system.systemLabel;
        const status = getStatusWord(system);
        const isLast = index === visibleSystems.length - 1 && hiddenCount <= 0;

        return (
          <button
            key={system.systemId}
            onClick={() => onSystemTap(system.systemId)}
            className={`w-full flex items-center justify-between px-4 py-3 text-left active:bg-muted/50 transition-colors ${
              !isLast ? 'border-b border-border/30' : ''
            }`}
          >
            <span className="text-sm text-foreground">
              {displayName} <span className="text-muted-foreground">· {status}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
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
