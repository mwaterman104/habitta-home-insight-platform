/**
 * SPECIFICITY LEVEL: Hero (2)
 * 
 * ALLOWED: Position label, outlook statement, confidence text, climate context
 * PROHIBITED: System-level detail, costs, dates, action buttons, percentages
 * 
 * Cascade Rule: May not exceed Status Header specificity.
 * Must not show system breakdowns (that's Analytical level).
 */

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getLifecycleNoteForAnchor, type PositionLabel, type ConfidenceLevel } from "@/lib/dashboardRecoveryCopy";

interface HomePositionAnchorProps {
  /** Position label: Early, Mid-Life, or Late */
  position: PositionLabel;
  /** Relative position 0.0 → 1.0 for visual bar */
  relativePosition: number;
  /** Outlook statement - observational, no action verbs */
  outlookStatement: string;
  /** Climate zone label */
  climateLabel?: string;
  /** Confidence level for display */
  confidence: ConfidenceLevel;
  /** Additional className */
  className?: string;
}

/**
 * HomePositionAnchor - Primary Hero Component
 * 
 * Replaces "Pulse Score" with a doctrine-compliant position indicator.
 * Visual weight: PRIMARY HERO (largest padding, most prominent)
 * 
 * Key design choices:
 * - Larger bar (h-3), prominent label (text-xl)
 * - No numbers or percentages (forbidden)
 * - One outlook line (observational only)
 * - Climate badge inline with outlook
 * - Confidence as text only, muted
 */
export function HomePositionAnchor({
  position,
  relativePosition,
  outlookStatement,
  climateLabel,
  confidence,
  className,
}: HomePositionAnchorProps) {
  // Clamp position to valid range
  const normalizedPosition = Math.max(0, Math.min(1, relativePosition));
  
  // Position marker offset (as percentage)
  const markerOffset = `${normalizedPosition * 100}%`;

  // Format confidence for display
  const confidenceLabel = confidence === 'high' ? 'High' 
    : confidence === 'moderate' ? 'Moderate' 
    : 'Early assessment';

  return (
    <Card className={cn(
      "py-6 px-6",  // PRIMARY HERO visual weight
      "border border-border/50",
      className
    )}>
      {/* Section Header */}
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Home Position
      </h3>

      {/* Position Label - Prominent */}
      <div className="text-xl font-medium text-foreground mb-4">
        {position}
      </div>

      {/* Position Bar - Visual representation without numbers */}
      <div className="relative mb-6">
        {/* Track */}
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          {/* Filled portion - subtle gradient */}
          <div 
            className="h-full bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/40 rounded-full transition-all duration-500"
            style={{ width: markerOffset }}
          />
        </div>
        
        {/* Position Marker */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow-sm transition-all duration-500"
          style={{ left: markerOffset }}
        />
        
        {/* Stage Labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Early</span>
          <span>Mid-Life</span>
          <span>Late</span>
        </div>
      </div>

      {/* Outlook Statement - One line, observational */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {outlookStatement}
      </p>

      {/* Context Badges - Climate + Confidence */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {climateLabel && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
            <span className="text-muted-foreground/70">Climate:</span>
            <span className="text-foreground/80">{climateLabel}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
          <span className="text-muted-foreground/70">Confidence:</span>
          <span className="text-foreground/80">{confidenceLabel}</span>
        </span>
      </div>
    </Card>
  );
}
