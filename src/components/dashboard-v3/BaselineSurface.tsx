/**
 * Baseline Surface - Evidence Layer
 * 
 * V1 Spec Compliant:
 * - Always visible, non-interactive except for "Why?" triggers
 * - No tooltips (chat explains)
 * - No green (green = "done", homes never are)
 * - No motion except on state change
 * 
 * Visual rules:
 * - Muted neutral for stable
 * - Soft amber for planning window
 * - Restrained red for elevated
 * - Greyed/dashed for data gap
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
  yearBuilt?: number;  // For home context (houses don't have lifecycles)
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  systems: BaselineSystem[];
  onWhyClick: (systemKey: string) => void;
}

// ============================================
// Component
// ============================================

export function BaselineSurface({
  yearBuilt,
  confidenceLevel,
  systems,
  onWhyClick,
}: BaselineSurfaceProps) {
  return (
    <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
      {/* Home Context - Static property facts (houses don't have lifecycles) */}
      <div className="flex justify-between text-sm text-muted-foreground mb-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            Home context
          </span>
          <span className="text-sm text-foreground">
            {yearBuilt 
              ? `Typical age profile for homes built around ${yearBuilt}`
              : 'Home age profile based on regional patterns'}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm">
            Confidence: <span className="text-foreground font-medium">{confidenceLevel}</span>
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            {getConfidenceExplainer(confidenceLevel)}
          </span>
        </div>
      </div>
      
      {/* System Condition Outlook - Where each system sits on its lifespan curve */}
      <div className="pt-2 pb-1">
        <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
          System condition outlook
        </span>
      </div>
      
      {/* Systems Timeline */}
      <div className="space-y-3">
        {systems.map(system => (
          <SystemRow 
            key={system.key} 
            system={system} 
            onWhyClick={onWhyClick} 
          />
        ))}
      </div>
      
      {/* Timeline labels - age-based language (how homeowners think) */}
      <div className="flex justify-between text-[10px] text-muted-foreground/60 pt-2">
        <span>New</span>
        <span>Typical</span>
        <span>Aging</span>
      </div>
    </div>
  );
}

// ============================================
// System Row
// ============================================

interface SystemRowProps {
  system: BaselineSystem;
  onWhyClick: (systemKey: string) => void;
}

function SystemRow({ system, onWhyClick }: SystemRowProps) {
  const position = getTimelinePosition(system);
  
  return (
    <div className="flex items-center gap-3">
      {/* System label */}
      <span className="w-24 text-sm truncate text-muted-foreground">
        {system.displayName}
      </span>
      
      {/* Timeline bar */}
      <div className="flex-1 h-2 bg-muted rounded-full relative">
        {/* State zone */}
        <div 
          className={cn(
            "absolute top-0 left-0 h-full rounded-full transition-all duration-300",
            getStateColor(system.state)
          )}
          style={{ width: `${position}%` }}
        />
        
        {/* Position marker */}
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full transition-all duration-300",
            getMarkerColor(system.state)
          )}
          style={{ left: `${position}%`, transform: `translate(-50%, -50%)` }}
        />
      </div>
      
      {/* State label + Why? */}
      <div className="w-32 flex items-center gap-1">
        <span className={cn(
          "text-xs",
          getStateTextColor(system.state)
        )}>
          {getStateLabel(system.state)}
        </span>
        
        {/* Subtle Risk #3 Fix: "Why?" affordance */}
        <button 
          onClick={() => onWhyClick(system.key)}
          className="text-muted-foreground hover:text-foreground text-xs opacity-60 hover:opacity-100 transition-opacity"
        >
          Why?
        </button>
      </div>
    </div>
  );
}

// ============================================
// Visual Helpers
// ============================================

/**
 * Get timeline position (0-100) based on system state
 */
function getTimelinePosition(system: BaselineSystem): number {
  const months = system.monthsRemaining;
  
  // If no months data, use confidence-based positioning
  if (months === undefined) {
    return system.confidence > 0.6 ? 40 : 50;
  }
  
  // Map months remaining to position (0 = right/late, 100 = left/early)
  // Assume 25 year max lifespan = 300 months
  const maxMonths = 300;
  const position = Math.min(100, Math.max(0, (months / maxMonths) * 100));
  
  // Invert so 0 months = right side (late), more months = left side (early)
  return 100 - position;
}

/**
 * Get state fill color (no green)
 */
function getStateColor(state: SystemState): string {
  switch (state) {
    case 'stable':
      return 'bg-muted-foreground/20';
    case 'planning_window':
      return 'bg-amber-500/30';
    case 'elevated':
      return 'bg-red-500/30';
    case 'data_gap':
      return 'bg-muted/50 border border-dashed border-muted-foreground/30';
  }
}

/**
 * Get marker color
 */
function getMarkerColor(state: SystemState): string {
  switch (state) {
    case 'stable':
      return 'bg-muted-foreground';
    case 'planning_window':
      return 'bg-amber-600';
    case 'elevated':
      return 'bg-red-600';
    case 'data_gap':
      return 'bg-muted-foreground/50';
  }
}

/**
 * Get state text color
 */
function getStateTextColor(state: SystemState): string {
  switch (state) {
    case 'stable':
      return 'text-muted-foreground';
    case 'planning_window':
      return 'text-amber-600';
    case 'elevated':
      return 'text-red-600';
    case 'data_gap':
      return 'text-muted-foreground/60';
  }
}

/**
 * Get state label
 * Note: "Planning Window" banned on main dashboard per governance
 */
function getStateLabel(state: SystemState): string {
  switch (state) {
    case 'stable':
      return 'Stable';
    case 'planning_window':
      return 'Approaching typical limit';
    case 'elevated':
      return 'Elevated';
    case 'data_gap':
      return 'Data Gap';
  }
}

/**
 * Get confidence explainer - grounds confidence in specific evidence
 */
function getConfidenceExplainer(level: 'Unknown' | 'Early' | 'Moderate' | 'High'): string {
  switch (level) {
    case 'High': return 'Verified by records';
    case 'Moderate': return 'Based on home age and regional patterns';
    case 'Early': return 'Limited data';
    default: return 'Still learning';
  }
}
