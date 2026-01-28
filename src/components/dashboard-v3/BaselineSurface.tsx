/**
 * Baseline Surface - Chat-Surfaced Evidence Artifact
 * 
 * ARTIFACT BEHAVIORAL CONTRACT:
 * - "This artifact does not explain itself. The chat explains why it exists."
 * - "The artifact proves the chat earned the right to speak."
 * - "It doesn't live anywhere. It was brought here."
 * 
 * Visual rules:
 * - Looks like evidence the AI surfaced (not a dashboard widget)
 * - Card-based system rows with segmented OK | WATCH | PLAN scales
 * - No uppercase headers
 * - No "Why?" buttons (per doctrine)
 * - Collapsible and expandable
 */

import { cn } from "@/lib/utils";
import type { SystemState } from "@/types/systemState";

// ============================================
// Types
// ============================================

export interface BaselineSystem {
  key: string;
  displayName: string;
  state: SystemState;
  confidence: number;
  monthsRemaining?: number;
}

interface BaselineSurfaceProps {
  yearBuilt?: number;
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  systems: BaselineSystem[];
  onWhyClick?: (systemKey: string) => void;
  isExpanded?: boolean;
}

// ============================================
// Color Palette (sage, ochre, amber)
// ============================================

const ZONE_COLORS = {
  ok: {
    bg: 'bg-[hsl(140,20%,55%)]/20',
    text: 'text-[hsl(140,20%,35%)]',
    dot: 'bg-[hsl(140,20%,40%)]',
  },
  watch: {
    bg: 'bg-[hsl(45,45%,58%)]/20',
    text: 'text-[hsl(45,45%,40%)]',
    dot: 'bg-[hsl(45,45%,45%)]',
  },
  plan: {
    bg: 'bg-[hsl(35,65%,55%)]/20',
    text: 'text-[hsl(35,65%,40%)]',
    dot: 'bg-[hsl(35,65%,45%)]',
  },
};

// ============================================
// Component
// ============================================

export function BaselineSurface({
  yearBuilt,
  confidenceLevel,
  systems,
  onWhyClick,
  isExpanded = false,
}: BaselineSurfaceProps) {
  const yearRef = yearBuilt ? `~${yearBuilt}` : 'this region';
  
  return (
    <div className={cn(
      "space-y-3",
      isExpanded && "p-4"
    )}>
      {/* Header - Provenance info */}
      <div className="px-1">
        <p className="text-sm font-medium text-foreground">
          Typical system aging profile — homes built {yearRef}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Confidence: {confidenceLevel} · {getConfidenceExplainer(confidenceLevel)}
        </p>
      </div>
      
      {/* System Cards */}
      <div className={cn(
        "space-y-2",
        isExpanded && "space-y-3"
      )}>
        {systems.map(system => (
          <SystemCard 
            key={system.key} 
            system={system}
            isExpanded={isExpanded}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// System Card
// ============================================

interface SystemCardProps {
  system: BaselineSystem;
  isExpanded?: boolean;
}

function SystemCard({ system, isExpanded }: SystemCardProps) {
  const position = getTimelinePosition(system);
  const zone = getZoneFromPosition(position);
  const stateLabel = getStateLabel(system.state);
  
  return (
    <div className={cn(
      "rounded-lg border border-border/20 p-3 space-y-2 bg-background/50",
      isExpanded && "p-4"
    )}>
      {/* System Info */}
      <div>
        <p className={cn(
          "font-medium text-foreground",
          isExpanded ? "text-base" : "text-sm"
        )}>
          {system.displayName}
        </p>
        <p className={cn(
          "text-muted-foreground",
          isExpanded ? "text-sm" : "text-xs"
        )}>
          {stateLabel}
        </p>
      </div>
      
      {/* Segmented Scale */}
      <div className={cn(
        "flex rounded-full overflow-hidden text-[10px] font-medium",
        isExpanded ? "h-8 text-xs" : "h-6"
      )}>
        <div className={cn(
          "flex-1 flex items-center justify-center",
          ZONE_COLORS.ok.bg,
          ZONE_COLORS.ok.text
        )}>
          OK
        </div>
        <div className={cn(
          "flex-1 flex items-center justify-center",
          ZONE_COLORS.watch.bg,
          ZONE_COLORS.watch.text
        )}>
          WATCH
        </div>
        <div className={cn(
          "flex-1 flex items-center justify-center",
          ZONE_COLORS.plan.bg,
          ZONE_COLORS.plan.text
        )}>
          PLAN
        </div>
      </div>
      
      {/* Position Track with Dot */}
      <div className="relative h-1.5 bg-muted/30 rounded-full">
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full shadow-sm",
            isExpanded ? "w-4 h-4" : "w-3 h-3",
            getZoneDotColor(zone)
          )}
          style={{ 
            left: `${position}%`, 
            transform: `translate(-50%, -50%)` 
          }}
        />
      </div>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get timeline position (0-100) based on system state
 */
function getTimelinePosition(system: BaselineSystem): number {
  const months = system.monthsRemaining;
  
  // If no months data, use state-based positioning
  if (months === undefined) {
    switch (system.state) {
      case 'stable': return 20;
      case 'planning_window': return 55;
      case 'elevated': return 85;
      case 'data_gap': return 50;
    }
  }
  
  // Map months remaining to position
  // More months = left (OK), fewer months = right (PLAN)
  const maxMonths = 300; // 25 years
  const normalized = Math.min(100, Math.max(0, (months / maxMonths) * 100));
  
  // Invert: 0 months = 100% (right/PLAN), max months = 0% (left/OK)
  return 100 - normalized;
}

/**
 * Get zone from position
 */
function getZoneFromPosition(position: number): 'ok' | 'watch' | 'plan' {
  if (position < 33) return 'ok';
  if (position < 66) return 'watch';
  return 'plan';
}

/**
 * Get dot color based on zone
 */
function getZoneDotColor(zone: 'ok' | 'watch' | 'plan'): string {
  return ZONE_COLORS[zone].dot;
}

/**
 * Get state label - natural language
 */
function getStateLabel(state: SystemState): string {
  switch (state) {
    case 'stable':
      return 'Within expected range';
    case 'planning_window':
      return 'Approaching typical limit';
    case 'elevated':
      return 'Beyond typical lifespan';
    case 'data_gap':
      return 'Limited data available';
  }
}

/**
 * Get confidence explainer
 */
function getConfidenceExplainer(level: 'Unknown' | 'Early' | 'Moderate' | 'High'): string {
  switch (level) {
    case 'High': return 'Verified by records';
    case 'Moderate': return 'Based on home age and regional patterns';
    case 'Early': return 'Limited data';
    default: return 'Still learning';
  }
}
