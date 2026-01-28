/**
 * System Aging Profile Artifact
 * 
 * ARTIFACT BEHAVIORAL CONTRACT:
 * 1. "This artifact does not explain itself. The chat explains why it exists."
 * 2. "The artifact proves the chat earned the right to speak."
 * 3. "It doesn't live anywhere. It was brought here."
 * 
 * HARD RULES:
 * - NO info icons
 * - NO question marks
 * - NO hover hints
 * - NO "Why?" buttons
 * - NO clickable rows
 * - NO tooltips
 * - Only allowed interactions: collapse, dismiss, scroll
 * 
 * This component renders a multi-system aging context comparison.
 * It is designed to look like "an inserted document" in the chat stream,
 * not a dashboard widget.
 */

import { cn } from '@/lib/utils';

export interface SystemAgingProfileData {
  yearBuilt?: number;
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  confidenceBasis?: string; // e.g., "home age and regional patterns"
  systems: Array<{
    key: string;
    displayName: string;
    state: 'stable' | 'planning_window' | 'elevated' | 'data_gap';
    /** Position on 0-100 scale (0 = New, 100 = Aging) */
    position: number;
  }>;
}

interface SystemAgingProfileArtifactProps {
  data: SystemAgingProfileData;
}

/**
 * Get dot color based on position (age-based semantics)
 * STRICT: No red colors. This is context, not diagnosis.
 */
function getDotColor(position: number): string {
  if (position <= 50) {
    // New to Typical: muted
    return 'bg-muted-foreground';
  } else if (position <= 75) {
    // Approaching typical limit: amber (low saturation)
    return 'bg-amber-600';
  } else {
    // Aging / Late: deeper amber (still not red)
    return 'bg-amber-700';
  }
}

/**
 * Get track color (even more muted than dot)
 */
function getTrackColor(position: number): string {
  if (position <= 50) {
    return 'bg-muted-foreground/20';
  } else if (position <= 75) {
    return 'bg-amber-500/30';
  } else {
    return 'bg-amber-600/40';
  }
}

export function SystemAgingProfileArtifact({ data }: SystemAgingProfileArtifactProps) {
  const { yearBuilt, confidenceLevel, confidenceBasis, systems } = data;
  
  const yearLabel = yearBuilt ? `~${yearBuilt}` : 'this region';
  const basisLabel = confidenceBasis || 'home age and regional patterns';
  
  return (
    <div className="space-y-3">
      {/* Header - Provenance-aware (no section titles) */}
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-muted-foreground">
          Typical system aging profile — homes built {yearLabel}
        </p>
        <p className="text-[10px] text-muted-foreground/70">
          Confidence: {confidenceLevel} · Based on {basisLabel}
        </p>
      </div>
      
      {/* System Rows (non-interactive) */}
      <div className="space-y-2.5">
        {systems.map((system) => (
          <SystemRow 
            key={system.key}
            displayName={system.displayName}
            position={system.position}
          />
        ))}
      </div>
      
      {/* Axis Labels (age-based, not condition-based) */}
      <div className="flex justify-between text-[10px] text-muted-foreground/60 pt-1">
        <span>New</span>
        <span>Typical</span>
        <span>Aging</span>
      </div>
    </div>
  );
}

/**
 * Single system row - purely visual, NO interactions
 */
interface SystemRowProps {
  displayName: string;
  position: number;
}

function SystemRow({ displayName, position }: SystemRowProps) {
  const dotColor = getDotColor(position);
  const trackColor = getTrackColor(position);
  
  return (
    <div className="flex items-center gap-3">
      {/* System Label */}
      <span className="text-xs text-muted-foreground w-24 shrink-0">
        {displayName}
      </span>
      
      {/* Track */}
      <div className="flex-1 relative h-2">
        <div className={cn("absolute inset-0 rounded-full", trackColor)} />
        
        {/* Position Dot */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-background",
            dotColor
          )}
          style={{ 
            left: `calc(${Math.min(100, Math.max(0, position))}% - 5px)` 
          }}
        />
      </div>
    </div>
  );
}
