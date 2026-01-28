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
    <div className="space-y-4">
      {/* Header - Provenance-aware (no section titles) */}
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground">
          Typical system aging profile — homes built {yearLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          Confidence: {confidenceLevel} · Based on {basisLabel}
        </p>
      </div>
      
      {/* Table-like System Rows */}
      <div className="border border-border/40 rounded-lg overflow-hidden bg-background">
        {/* Column Headers */}
        <div className="grid grid-cols-[120px_1fr] text-[11px] text-muted-foreground/70 border-b border-border/30 bg-muted/20">
          <div className="px-3 py-2 font-medium">System</div>
          <div className="px-3 py-2">
            <div className="flex justify-between">
              <span>New</span>
              <span>Typical</span>
              <span>Aging</span>
            </div>
          </div>
        </div>
        
        {/* System Rows (non-interactive) */}
        <div className="divide-y divide-border/20">
          {systems.map((system, index) => (
            <SystemRow 
              key={system.key}
              displayName={system.displayName}
              position={system.position}
              isLast={index === systems.length - 1}
            />
          ))}
        </div>
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
  isLast?: boolean;
}

function SystemRow({ displayName, position }: SystemRowProps) {
  const dotColor = getDotColor(position);
  const trackColor = getTrackColor(position);
  
  return (
    <div className="grid grid-cols-[120px_1fr] items-center">
      {/* System Label */}
      <div className="px-3 py-2.5 text-xs text-foreground font-medium">
        {displayName}
      </div>
      
      {/* Track Container */}
      <div className="px-3 py-2.5">
        <div className="relative h-3">
          {/* Background Track */}
          <div className={cn("absolute inset-0 rounded-full", trackColor)} />
          
          {/* Position Marker (filled dot with ring) */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-2 ring-background shadow-sm",
              dotColor
            )}
            style={{ 
              left: `calc(${Math.min(100, Math.max(0, position))}% - 6px)` 
            }}
          />
          
          {/* Track end marker (hollow circle) */}
          <div 
            className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-muted-foreground/30 bg-background"
          />
        </div>
      </div>
    </div>
  );
}
