/**
 * PlanningSessionBadge - Quiet Dashboard Indicator
 * 
 * BEHAVIORAL CONTRACT:
 * - Uses "quiet" language: "Review available", "Briefing ready"
 * - NEVER uses: "Attention needed", "Action required", "Alert"
 * - Respects user agency - user chooses when to engage
 */

import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TriggerReason } from '@/types/intervention';

interface PlanningSessionBadgeProps {
  triggerReason?: TriggerReason;
  systemName?: string;
  onClick?: () => void;
  className?: string;
}

const QUIET_LABELS: Record<TriggerReason, string> = {
  risk_threshold_crossed: 'Review available',
  seasonal_risk_event: 'Briefing ready',
  financial_planning_window: 'Planning session prepared',
  user_initiated: 'Session ready',
  new_evidence_arrived: 'Update available',
};

export function PlanningSessionBadge({
  triggerReason = 'risk_threshold_crossed',
  systemName,
  onClick,
  className,
}: PlanningSessionBadgeProps) {
  const label = QUIET_LABELS[triggerReason];

  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 cursor-pointer hover:bg-secondary/80 transition-colors",
        "text-xs font-normal text-muted-foreground",
        className
      )}
      onClick={onClick}
    >
      <FileText className="h-3 w-3" />
      <span>{label}</span>
      {systemName && (
        <span className="text-muted-foreground/70">· {systemName}</span>
      )}
    </Badge>
  );
}
