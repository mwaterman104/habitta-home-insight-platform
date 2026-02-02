import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";

interface PrimarySystemCardProps {
  system: SystemTimelineEntry;
  onTap: () => void;
}

/**
 * PrimarySystemCard - Exactly one system card for mobile
 * 
 * Mobile Render Contract:
 * - Allowed: System name, single-word status, one-line context, CTA
 * - Forbidden: Sliders, scales, confidence badges, multiple statuses, inline timelines
 */
export function PrimarySystemCard({ system, onTap }: PrimarySystemCardProps) {
  const currentYear = new Date().getFullYear();
  const likelyYear = system.replacementWindow?.likelyYear;
  const remainingYears = likelyYear ? likelyYear - currentYear : undefined;

  // Derive single-word status from replacement window
  const getStatusWord = (): { text: string; color: string } => {
    if (!remainingYears || remainingYears > 5) {
      return { text: 'Stable', color: 'text-emerald-600' };
    }
    if (remainingYears <= 2) {
      return { text: 'Plan', color: 'text-amber-600' };
    }
    return { text: 'Watch', color: 'text-amber-500' };
  };

  // Derive one-line context
  const getContextLine = (): string => {
    if (system.installYear) {
      return `Installed ${system.installYear}`;
    }
    if (remainingYears !== undefined) {
      if (remainingYears <= 0) return 'End of expected life';
      if (remainingYears === 1) return '~1 year remaining';
      return `~${Math.round(remainingYears)} years remaining`;
    }
    return 'Tap for details';
  };

  const status = getStatusWord();
  const displayName = system.systemLabel;

  return (
    <Card 
      className="bg-card border-border/50 shadow-sm cursor-pointer active:bg-muted/50 transition-colors"
      onClick={onTap}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground text-base">
                {displayName}
              </h3>
              <span className={`text-sm font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
              {getContextLine()}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
        </div>
      </CardContent>
    </Card>
  );
}
