/**
 * System Timeline Artifact
 * 
 * Mini timeline for a single system, showing current position and projection.
 * Used inside chat stream to support a specific claim.
 */

import { cn } from '@/lib/utils';

interface SystemTimelineArtifactProps {
  data: Record<string, unknown>;
}

export function SystemTimelineArtifact({ data }: SystemTimelineArtifactProps) {
  const systemName = String(data.systemName ?? 'System');
  const position = Number(data.position ?? 50);
  const state = String(data.state ?? 'stable');
  const monthsRemaining = data.monthsRemaining as number | undefined;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-20">{systemName}</span>
        
        {/* Timeline bar */}
        <div className="flex-1 h-2 bg-muted rounded-full relative">
          <div 
            className={cn(
              "absolute top-0 left-0 h-full rounded-full",
              state === 'planning_window' ? 'bg-amber-500/30' :
              state === 'elevated' ? 'bg-red-500/30' :
              'bg-muted-foreground/20'
            )}
            style={{ width: `${position}%` }}
          />
          <div 
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full",
              state === 'planning_window' ? 'bg-amber-600' :
              state === 'elevated' ? 'bg-red-600' :
              'bg-muted-foreground'
            )}
            style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>
      
      {monthsRemaining !== undefined && (
        <p className="text-xs text-muted-foreground">
          Approximately {Math.round(monthsRemaining / 12)} years remaining
        </p>
      )}
    </div>
  );
}
