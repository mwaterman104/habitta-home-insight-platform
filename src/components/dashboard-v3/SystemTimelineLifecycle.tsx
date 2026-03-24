/**
 * SystemTimelineLifecycle - Lifecycle Progress Table
 * 
 * Progress bars showing lifecycle position. No dates, costs, or action language.
 * 
 * HARD GUARDRAILS (QA-approved, non-negotiable):
 * 
 * Expanded rows may ONLY show:
 * - Install source (Permit / Inferred / Unknown)
 * - Confidence level
 * - Environmental stress factors
 * - Permit history (if available)
 * 
 * Expanded rows MUST NOT show:
 * - Cost estimates
 * - Timing/year projections
 * - Recommendations
 * - Actions/CTAs
 * 
 * Purpose: Explain WHY we believe this position is accurate,
 * NOT what to do about it.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { 
  type LifecycleSystem,
  formatInstallSource,
  formatConfidence,
} from "@/lib/dashboardRecoveryCopy";

interface SystemTimelineLifecycleProps {
  systems: LifecycleSystem[];
  onSystemClick?: (systemKey: string) => void;
}

export function SystemTimelineLifecycle({ 
  systems,
  onSystemClick 
}: SystemTimelineLifecycleProps) {
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);
  
  const toggleExpand = (systemKey: string) => {
    setExpandedSystem(prev => prev === systemKey ? null : systemKey);
  };

  if (systems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          System Lifecycle Overview
        </h2>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Relative position within expected lifespan ranges
        </p>
      </div>
      
      {/* Timeline rows */}
      <div className="space-y-3">
        {systems.map((system) => {
          const isExpanded = expandedSystem === system.key;
          const markerPos = Math.min(Math.max(system.positionScore * 100, 5), 95);
          
          return (
            <div 
              key={system.key}
              className="rounded-lg border bg-card"
            >
              {/* Main row - clickable */}
              <button
                onClick={() => toggleExpand(system.key)}
                className="w-full p-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {system.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {system.positionLabel}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-slate-200 rounded-full" />
                  <div 
                    className="absolute top-1/2 h-3 w-1.5 bg-slate-600 rounded-full"
                    style={{ 
                      left: `${markerPos}%`, 
                      transform: 'translate(-50%, -50%)' 
                    }}
                  />
                </div>
                
                {/* Note */}
                <p className="text-xs text-muted-foreground mt-2">
                  {system.note}
                </p>
              </button>
              
              {/* Expanded content - strictly constrained */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 space-y-1.5 text-xs text-muted-foreground border-t">
                  {/* ALLOWED: Why we believe this position */}
                  <div className="flex justify-between">
                    <span>Install source</span>
                    <span className="text-foreground">
                      {formatInstallSource(system.installSource)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence</span>
                    <span className="text-foreground">
                      {formatConfidence(system.confidence)}
                    </span>
                  </div>
                  {system.environmentalStress && (
                    <div className="flex justify-between">
                      <span>Climate factor</span>
                      <span className="text-foreground">
                        {system.environmentalStress}
                      </span>
                    </div>
                  )}
                  
                  {/* View details link */}
                  {onSystemClick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSystemClick(system.key);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground mt-2 block"
                    >
                      View full details →
                    </button>
                  )}
                  
                  {/* 
                   * FORBIDDEN (enforced by code review):
                   * - Cost estimates
                   * - Year projections  
                   * - "Consider..." language
                   * - Action buttons
                   */}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
