/**
 * SPECIFICITY LEVEL: Analytical (3)
 * 
 * ALLOWED: System names, position bars (visual), lifecycle stage labels
 * PROHIBITED: Costs, specific dates, action buttons, urgency indicators
 * 
 * Cascade Rule: May not exceed Hero Cards specificity.
 * Can show system-level detail, but no financial or action content.
 * 
 * QC #3: Layer-Varied Copy
 * Uses getLifecycleNoteForHorizon() for unique copy at this layer.
 */

import { cn } from "@/lib/utils";
import { getLifecycleNoteForHorizon, type PositionLabel } from "@/lib/dashboardRecoveryCopy";

interface LifecycleSystem {
  /** System key for identification */
  key: string;
  /** Display label */
  label: string;
  /** Position score 0.0 → 1.0 */
  positionScore: number;
  /** Position label */
  positionLabel: PositionLabel;
  /** Whether install year is known */
  hasInstallYear: boolean;
}

interface LifecycleHorizonProps {
  /** Systems to display in the horizon */
  systems: LifecycleSystem[];
  /** Handler when a system row is clicked */
  onSystemClick?: (systemKey: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * LifecycleHorizon - Analytical Surface Component
 * 
 * Replaces SystemTimelineLifecycle with a compact, doctrine-compliant view.
 * Visual weight: ANALYTICAL (subtle background, compact rows)
 * 
 * Key differences from SystemTimelineLifecycle:
 * - Compact single table (not individual expandable cards)
 * - Subtle row separators (not card borders)
 * - Click row for context (not "View full details" link)
 * - bg-muted/10 analytical tone (not white background)
 * - Layer-varied copy (QC #3)
 */
export function LifecycleHorizon({
  systems,
  onSystemClick,
  className,
}: LifecycleHorizonProps) {
  if (systems.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "bg-muted/10 rounded-xl p-4",  // ANALYTICAL visual weight
      className
    )}>
      {/* Section Header */}
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
        Lifecycle Horizon
      </h3>
      <p className="text-xs text-muted-foreground/70 mb-4">
        Relative position within expected ranges
      </p>

      {/* System Rows */}
      <div className="space-y-0">
        {systems.map((system, index) => (
          <SystemRow
            key={system.key}
            system={system}
            onClick={() => onSystemClick?.(system.key)}
            isLast={index === systems.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface SystemRowProps {
  system: LifecycleSystem;
  onClick?: () => void;
  isLast: boolean;
}

function SystemRow({ system, onClick, isLast }: SystemRowProps) {
  // Clamp position to valid range
  const normalizedPosition = Math.max(0, Math.min(1, system.positionScore));
  const markerOffset = `${normalizedPosition * 100}%`;

  // Get layer-varied copy (QC #3)
  const lifecycleNote = getLifecycleNoteForHorizon(system.positionScore);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg",
        "hover:bg-muted/50 transition-colors text-left",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !isLast && "border-b border-border/30"
      )}
    >
      {/* System Label */}
      <span className="text-sm font-medium text-foreground w-28 shrink-0">
        {system.label}
      </span>

      {/* Position Bar */}
      <div className="flex-1 relative">
        {/* Track */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          {/* Filled portion */}
          <div 
            className="h-full bg-muted-foreground/30 rounded-full transition-all duration-300"
            style={{ width: markerOffset }}
          />
        </div>
        
        {/* Position Marker */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-foreground/80 border-2 border-background shadow-sm transition-all duration-300"
          style={{ left: markerOffset }}
        />
      </div>

      {/* Lifecycle Note - Layer-varied copy */}
      <span className="text-xs text-muted-foreground w-32 text-right shrink-0">
        {lifecycleNote}
      </span>
    </button>
  );
}
