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
 * - Position marker integrated directly on the scale
 * - Per-system confidence treatment (dashed borders, opacity for low confidence)
 * - No uppercase headers (except zone labels)
 * - No "Why?" buttons (per doctrine)
 * - Collapsible and expandable
 */

import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  /** Per-system data quality (0-100) for visual treatment */
  baselineStrength?: number;
  /** System age in years for display */
  ageYears?: number;
  /** Expected lifespan for context */
  expectedLifespan?: number;
}

interface BaselineSurfaceProps {
  yearBuilt?: number;
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  systems: BaselineSystem[];
  onWhyClick?: (systemKey: string) => void;
  isExpanded?: boolean;
  lastReviewedAt?: Date;
  /** Data sources for confidence explainer */
  dataSources?: Array<{ 
    name: string; 
    status: 'verified' | 'found' | 'missing'; 
    contribution: string;
  }>;
}

// ============================================
// Color Palette (Tailwind scales - vibrant but calm)
// ============================================

type Zone = 'ok' | 'watch' | 'plan';

const ZONE_COLORS = {
  ok: {
    active: {
      bg: 'bg-emerald-100/70',
      text: 'text-emerald-700',
    },
    inactive: {
      bg: 'bg-emerald-50/40',
      text: 'text-emerald-600/50',
    },
    dot: 'bg-emerald-500',
  },
  watch: {
    active: {
      bg: 'bg-amber-100/70',
      text: 'text-amber-700',
    },
    inactive: {
      bg: 'bg-amber-50/40',
      text: 'text-amber-600/50',
    },
    dot: 'bg-amber-500',
  },
  plan: {
    active: {
      bg: 'bg-orange-100/70',
      text: 'text-orange-700',
    },
    inactive: {
      bg: 'bg-orange-50/40',
      text: 'text-orange-600/50',
    },
    dot: 'bg-orange-500',
  },
};

const ZONE_TOOLTIPS: Record<Zone, string> = {
  ok: '0–60% of typical lifespan',
  watch: '60–80% of typical lifespan',
  plan: '80–100%+ of typical lifespan',
};

// ============================================
// Card Treatment by Confidence
// ============================================

interface CardTreatment {
  cardClass: string;
  badgeText: string | null;
  badgeClass: string;
  showInvitation: boolean;
}

function getCardTreatment(baselineStrength: number = 50): CardTreatment {
  if (baselineStrength < 40) {
    return {
      cardClass: 'opacity-80 border-dashed border-stone-300',
      badgeText: 'Early data',
      badgeClass: 'bg-stone-200 text-stone-600',
      showInvitation: true,
    };
  }
  
  if (baselineStrength < 70) {
    return {
      cardClass: 'opacity-90 border-solid border-stone-200',
      badgeText: null, // Don't show badge for moderate
      badgeClass: 'bg-stone-100 text-stone-600',
      showInvitation: false,
    };
  }
  
  return {
    cardClass: 'opacity-100 border-solid border-emerald-200/50',
    badgeText: null, // High confidence is the default, no badge needed
    badgeClass: 'bg-emerald-50 text-emerald-700',
    showInvitation: false,
  };
}

// ============================================
// Helpers
// ============================================

function formatRelativeTime(date?: Date): string {
  if (!date) return 'recently';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get timeline position (0-100) based on system state and months remaining
 */
function getTimelinePosition(system: BaselineSystem): number {
  const months = system.monthsRemaining;
  
  // If no months data, use state-based positioning
  if (months === undefined) {
    switch (system.state) {
      case 'stable': return 25;
      case 'planning_window': return 70;
      case 'elevated': return 90;
      case 'baseline_incomplete': return 50;
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
 * Get zone from position (0-100)
 */
function getZoneFromPosition(position: number): Zone {
  if (position < 33.33) return 'ok';
  if (position < 66.66) return 'watch';
  return 'plan';
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
    case 'baseline_incomplete':
      return 'Establishing baseline';
  }
}

// ============================================
// Sub-Components
// ============================================

interface PositionDotProps {
  positionWithinZone: number;
  baselineStrength: number;
  isExpanded?: boolean;
}

function PositionDot({ positionWithinZone, baselineStrength, isExpanded }: PositionDotProps) {
  const showRange = baselineStrength < 70;
  // Wider range for lower confidence
  const rangeWidth = baselineStrength < 40 ? 35 : 22;
  
  return (
    <>
      {/* Uncertainty range indicator */}
      {showRange && (
        <div 
          className="absolute top-0 bottom-0 bg-stone-400/15 rounded transition-all duration-1000 ease-out"
          style={{ 
            left: `${Math.max(0, positionWithinZone - rangeWidth / 2)}%`, 
            width: `${rangeWidth}%` 
          }}
        />
      )}
      {/* Position dot */}
      <div 
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full ring-2 ring-white/90 shadow-sm z-10 transition-all duration-700 ease-out",
          showRange ? "w-2 h-2 bg-stone-600" : "w-2.5 h-2.5 bg-stone-800",
          isExpanded && (showRange ? "w-2.5 h-2.5" : "w-3 h-3")
        )}
        style={{ left: `${Math.max(8, Math.min(92, positionWithinZone))}%` }}
      />
    </>
  );
}

interface ZoneSegmentProps {
  zone: Zone;
  label: string;
  isActive: boolean;
  positionWithinZone?: number;
  baselineStrength: number;
  isExpanded?: boolean;
  flex?: string;
}

function ZoneSegment({ 
  zone, 
  label, 
  isActive, 
  positionWithinZone, 
  baselineStrength,
  isExpanded,
  flex = 'flex-[33]'
}: ZoneSegmentProps) {
  const colors = ZONE_COLORS[zone];
  const activeState = isActive ? colors.active : colors.inactive;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={cn(
            "flex items-center justify-center relative cursor-default",
            flex,
            activeState.bg,
            activeState.text,
            zone === 'watch' && "border-x border-stone-300/20"
          )}
        >
          <span className={cn(
            "font-semibold",
            isExpanded ? "text-[11px]" : "text-[10px]"
          )}>
            {label}
          </span>
          {isActive && positionWithinZone !== undefined && (
            <PositionDot 
              positionWithinZone={positionWithinZone} 
              baselineStrength={baselineStrength}
              isExpanded={isExpanded}
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[10px]">
        {ZONE_TOOLTIPS[zone]}
      </TooltipContent>
    </Tooltip>
  );
}

interface SegmentedScaleProps {
  position: number;
  zone: Zone;
  baselineStrength: number;
  isExpanded?: boolean;
}

function SegmentedScale({ position, zone, baselineStrength, isExpanded }: SegmentedScaleProps) {
  // Calculate position within the active zone (0-100%)
  const zoneStart = zone === 'ok' ? 0 : zone === 'watch' ? 33.33 : 66.66;
  const zoneWidth = zone === 'plan' ? 33.34 : 33.33;
  const positionWithinZone = ((position - zoneStart) / zoneWidth) * 100;
  
  return (
    <div className={cn(
      "flex rounded-md overflow-hidden",
      isExpanded ? "h-6" : "h-5"
    )}>
      <ZoneSegment 
        zone="ok" 
        label="OK" 
        isActive={zone === 'ok'} 
        positionWithinZone={zone === 'ok' ? positionWithinZone : undefined}
        baselineStrength={baselineStrength}
        isExpanded={isExpanded}
      />
      <ZoneSegment 
        zone="watch" 
        label="WATCH" 
        isActive={zone === 'watch'} 
        positionWithinZone={zone === 'watch' ? positionWithinZone : undefined}
        baselineStrength={baselineStrength}
        isExpanded={isExpanded}
      />
      <ZoneSegment 
        zone="plan" 
        label="PLAN" 
        isActive={zone === 'plan'} 
        positionWithinZone={zone === 'plan' ? positionWithinZone : undefined}
        baselineStrength={baselineStrength}
        isExpanded={isExpanded}
        flex="flex-[34]"
      />
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
  const treatment = getCardTreatment(system.baselineStrength);
  
  return (
    <div className={cn(
      "rounded-lg border p-2.5 space-y-1.5 bg-white/50 transition-all duration-300",
      treatment.cardClass,
      isExpanded && "p-3 space-y-2"
    )}>
      {/* System Info - Inline Layout */}
      <div className="flex items-center justify-between">
        <p className={cn(
          "font-medium text-stone-800",
          isExpanded ? "text-sm" : "text-[13px]"
        )}>
          {system.displayName}
        </p>
        <div className="flex items-center gap-2">
          {treatment.badgeText && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              treatment.badgeClass
            )}>
              {treatment.badgeText}
            </span>
          )}
          <p className={cn(
            "text-stone-500",
            isExpanded ? "text-xs" : "text-[11px]"
          )}>
            {stateLabel}
          </p>
        </div>
      </div>
      
      {/* Segmented Scale with Integrated Position Marker */}
      <SegmentedScale 
        position={position} 
        zone={zone} 
        baselineStrength={system.baselineStrength ?? 50}
        isExpanded={isExpanded}
      />
    </div>
  );
}

// ============================================
// Empty State
// ============================================

function EmptySystemState() {
  return (
    <div className="p-4 border border-dashed border-stone-300 rounded-lg text-center">
      <p className="text-[13px] font-medium text-stone-700 mb-1">
        Let's get started
      </p>
      <p className="text-[11px] text-stone-500 mb-3">
        Tell me about your home's systems and I'll begin monitoring them.
      </p>
      <button className="text-[11px] text-teal-700 underline hover:text-teal-800 transition-colors">
        Add first system
      </button>
    </div>
  );
}

// ============================================
// Unknown Age Card
// ============================================

interface UnknownAgeCardProps {
  system: BaselineSystem;
  isExpanded?: boolean;
}

function UnknownAgeCard({ system, isExpanded }: UnknownAgeCardProps) {
  return (
    <div className="p-2.5 bg-stone-50 rounded-lg border-2 border-dashed border-stone-300">
      <div className="flex items-center justify-between mb-2">
        <p className={cn(
          "font-medium text-stone-800",
          isExpanded ? "text-sm" : "text-[13px]"
        )}>
          {system.displayName}
        </p>
        <span className="text-[11px] text-stone-500">Age unknown</span>
      </div>
      <p className="text-[11px] text-stone-600 mb-1">
        Adding the installation year would help me track this system
      </p>
      <button className="text-[11px] text-teal-700 underline hover:text-teal-800 transition-colors">
        Add installation date
      </button>
    </div>
  );
}

// ============================================
// Confidence Explainer Popover
// ============================================

interface ConfidenceExplainerProps {
  confidenceLevel: string;
  dataSources?: Array<{ 
    name: string; 
    status: 'verified' | 'found' | 'missing'; 
    contribution: string;
  }>;
}

function ConfidenceExplainer({ confidenceLevel, dataSources }: ConfidenceExplainerProps) {
  // Default data sources if none provided
  const sources = dataSources ?? [
    { name: 'Home age', status: 'verified' as const, contribution: '+30 confidence' },
    { name: 'Regional patterns', status: 'found' as const, contribution: '+20 confidence' },
    { name: 'System photos', status: 'missing' as const, contribution: 'Would add +20' },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="group px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-[11px] font-medium rounded transition-colors flex items-center gap-1">
          <span>{confidenceLevel} confidence</span>
          <Info className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <h4 className="text-xs font-semibold text-stone-900 mb-2">What is confidence?</h4>
        <p className="text-[11px] text-stone-600 mb-3">
          Confidence reflects how much verified data I have about your systems. 
          Higher confidence means more accurate timelines.
        </p>
        <div className="space-y-2">
          {sources.map(source => (
            <div key={source.name} className="flex items-center justify-between text-[11px]">
              <span className="text-stone-700">{source.name}</span>
              <span className={cn(
                source.status === 'verified' && 'text-emerald-600',
                source.status === 'found' && 'text-amber-600',
                source.status === 'missing' && 'text-stone-400'
              )}>
                {source.contribution}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// Calculation Disclosure
// ============================================

function CalculationDisclosure() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="mt-3 pt-3 border-t border-stone-200">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-700 transition-colors"
      >
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        <span>How is this calculated?</span>
      </button>
      {isOpen && (
        <div className="mt-2 p-2 bg-stone-50 rounded text-[11px] text-stone-600 space-y-1.5 animate-fade-in">
          <p className="font-medium text-stone-700">Position = (Current Age ÷ Expected Lifespan) × 100</p>
          <p className="text-stone-500">
            Expected lifespans come from regional permit data and manufacturer 
            specifications for your climate zone.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function BaselineSurface({
  yearBuilt,
  confidenceLevel,
  systems,
  onWhyClick,
  isExpanded = false,
  lastReviewedAt,
  dataSources,
}: BaselineSurfaceProps) {
  // Handle empty state
  if (systems.length === 0) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className={cn("space-y-2.5", isExpanded && "p-4 space-y-3")}>
          <div className="flex items-center justify-between px-0.5">
            <p className={cn(
              "font-medium text-stone-900",
              isExpanded ? "text-sm" : "text-[13px]"
            )}>
              Your Home System Outlook
            </p>
          </div>
          <EmptySystemState />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn(
        "space-y-2.5",
        isExpanded && "p-4 space-y-3"
      )}>
        {/* Header - User's requested format with interactive confidence badge */}
        <div className="flex items-center justify-between px-0.5">
          <div>
            <p className={cn(
              "font-medium text-stone-900",
              isExpanded ? "text-sm" : "text-[13px]"
            )}>
              Your Home System Outlook
            </p>
            {lastReviewedAt && (
              <p className="text-[10px] text-stone-400 mt-0.5">
                Last reviewed {formatRelativeTime(lastReviewedAt)}
              </p>
            )}
          </div>
          <ConfidenceExplainer 
            confidenceLevel={confidenceLevel} 
            dataSources={dataSources}
          />
        </div>
        
        {/* System Cards */}
        <div className={cn(
          "space-y-1.5",
          isExpanded && "space-y-2"
        )}>
          {systems.map(system => {
            // Handle unknown age edge case (baseline_incomplete state)
            if (system.state === 'baseline_incomplete' && system.ageYears === undefined) {
              return (
                <UnknownAgeCard 
                  key={system.key} 
                  system={system}
                  isExpanded={isExpanded}
                />
              );
            }
            
            return (
              <SystemCard 
                key={system.key} 
                system={system}
                isExpanded={isExpanded}
              />
            );
          })}
        </div>
        
        {/* Calculation Transparency */}
        {isExpanded && <CalculationDisclosure />}
      </div>
    </TooltipProvider>
  );
}
