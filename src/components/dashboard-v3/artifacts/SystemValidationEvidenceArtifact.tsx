/**
 * System Validation Evidence Artifact
 * 
 * VALIDATION FIRST DOCTRINE:
 * This artifact MUST appear BEFORE AI explanation when a user asks "Why?"
 * It shows the gauge before explaining the diagnosis.
 * 
 * VISUAL CONTRACT:
 * - Lifespan timeline with position marker (OK | WATCH | PLAN scale)
 * - Age context ("Age: ~14 years · Typical lifespan: 10-15 years")
 * - Confidence-based styling (solid, dashed, or dotted borders)
 * - Optional cost block ONLY when real data exists
 * 
 * NO PLACEHOLDERS RULE:
 * Never show "0%" or fake cost comparisons. Either real data or nothing.
 */

import { cn } from '@/lib/utils';

export interface SystemValidationEvidenceData {
  systemKey: string;
  displayName: string;
  state: 'stable' | 'planning_window' | 'elevated';
  position: number;         // 0-100 scale (elapsed % of lifespan)
  ageYears?: number;        // May be undefined if inferred
  expectedLifespan?: number;
  monthsRemaining?: number;
  confidence: number;       // 0-1 for visual treatment
  baselineSource: 'inferred' | 'partial' | 'confirmed';
  // Cost data only included if real numbers exist
  costData?: {
    plannedLow: number;
    plannedHigh: number;
    emergencyLow: number;
    emergencyHigh: number;
  };
}

interface SystemValidationEvidenceArtifactProps {
  data: SystemValidationEvidenceData;
}

export function SystemValidationEvidenceArtifact({ data }: SystemValidationEvidenceArtifactProps) {
  const {
    displayName,
    state,
    position,
    ageYears,
    expectedLifespan,
    confidence,
    baselineSource,
    costData,
  } = data;
  
  // Determine visual treatment based on confidence
  const isLowConfidence = confidence < 0.4;
  const isMediumConfidence = confidence >= 0.4 && confidence < 0.7;
  
  const borderStyle = isLowConfidence 
    ? 'border-dotted' 
    : isMediumConfidence 
      ? 'border-dashed' 
      : 'border-solid';
  
  const opacity = isLowConfidence 
    ? 'opacity-70' 
    : isMediumConfidence 
      ? 'opacity-85' 
      : 'opacity-100';
  
  // State label for display
  const stateLabel = getStateLabel(state);
  
  // Format age display
  const ageDisplay = ageYears !== undefined 
    ? `Age: ~${ageYears} years` 
    : 'Age: Estimated';
  
  const lifespanDisplay = expectedLifespan 
    ? `Typical lifespan: ${expectedLifespan - 3}–${expectedLifespan + 2} years`
    : 'Typical lifespan: varies by conditions';
  
  // Confidence badge
  const confidenceBadge = isLowConfidence 
    ? 'Based on regional norms' 
    : isMediumConfidence 
      ? 'Estimated' 
      : null;
  
  return (
    <div className={cn(
      "rounded-lg border bg-muted/5 p-4 space-y-3",
      borderStyle,
      opacity
    )}>
      {/* Header: System name + state */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{displayName}</span>
          <span className="text-xs text-muted-foreground">— {stateLabel}</span>
        </div>
        {confidenceBadge && (
          <span className="text-[10px] text-muted-foreground/70 bg-muted/30 px-2 py-0.5 rounded">
            {confidenceBadge}
          </span>
        )}
      </div>
      
      {/* Lifespan Timeline Scale */}
      <div className="space-y-1.5">
        <TimelineScale position={position} state={state} />
        
        {/* Age context line */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{ageDisplay}</span>
          <span>{lifespanDisplay}</span>
        </div>
      </div>
      
      {/* Cost comparison block - ONLY if real data exists */}
      {costData && (
        <CostComparisonBlock costData={costData} />
      )}
      
      {/* Source disclosure */}
      <div className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border/20">
        {baselineSource === 'confirmed' 
          ? 'Based on confirmed records'
          : baselineSource === 'partial'
            ? 'Based on partial records and regional data'
            : 'Based on property age and regional patterns'}
      </div>
    </div>
  );
}

/**
 * Timeline Scale Component
 * Visual OK | WATCH | PLAN segmented scale with position marker
 */
function TimelineScale({ position, state }: { position: number; state: string }) {
  // Clamp position to 0-100 (handle systems beyond expected life)
  const clampedPosition = Math.min(100, Math.max(0, position));
  const isOverLimit = position > 100;
  
  // Zone boundaries (as percentages)
  const WATCH_START = 60;  // 0-60 = OK, 60-80 = WATCH, 80-100 = PLAN
  const PLAN_START = 80;
  
  return (
    <div className="relative">
      {/* Zone labels */}
      <div className="flex text-[10px] text-muted-foreground/70 mb-1">
        <span className="flex-1 text-left">OK</span>
        <span className="flex-1 text-center">WATCH</span>
        <span className="flex-1 text-right">PLAN</span>
      </div>
      
      {/* Scale bar */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted/30">
        {/* Zone segments */}
        <div 
          className="absolute inset-y-0 left-0 bg-emerald-500/20 dark:bg-emerald-500/15"
          style={{ width: `${WATCH_START}%` }}
        />
        <div 
          className="absolute inset-y-0 bg-amber-500/20 dark:bg-amber-500/15"
          style={{ left: `${WATCH_START}%`, width: `${PLAN_START - WATCH_START}%` }}
        />
        <div 
          className="absolute inset-y-0 right-0 bg-rose-500/20 dark:bg-rose-500/15"
          style={{ left: `${PLAN_START}%` }}
        />
        
        {/* Position marker */}
        <div 
          className={cn(
            "absolute top-0 w-3 h-full rounded-sm transition-all",
            state === 'stable' && "bg-emerald-600",
            state === 'planning_window' && "bg-amber-600",
            state === 'elevated' && "bg-rose-600"
          )}
          style={{ 
            left: `calc(${clampedPosition}% - 6px)`,
            boxShadow: '0 0 4px rgba(0,0,0,0.2)'
          }}
        />
      </div>
      
      {/* Overflow indicator */}
      {isOverLimit && (
        <div className="text-[10px] text-rose-600/80 mt-1 text-right">
          Beyond typical lifespan ({Math.round(position)}%)
        </div>
      )}
    </div>
  );
}

/**
 * Cost Comparison Block
 * ONLY renders if real cost data exists (never placeholders)
 */
function CostComparisonBlock({ costData }: { costData: NonNullable<SystemValidationEvidenceData['costData']> }) {
  const { plannedLow, plannedHigh, emergencyLow, emergencyHigh } = costData;
  
  const plannedRange = `$${plannedLow.toLocaleString()}–$${plannedHigh.toLocaleString()}`;
  const emergencyRange = `$${emergencyLow.toLocaleString()}–$${emergencyHigh.toLocaleString()}`;
  
  // Calculate difference
  const minDifference = emergencyLow - plannedHigh;
  const differenceNote = minDifference > 0 
    ? `$${minDifference.toLocaleString()}+ difference`
    : null;
  
  return (
    <div className="bg-muted/20 rounded p-2.5 space-y-1.5 text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Planned replacement:</span>
        <span className="font-medium">{plannedRange}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Emergency replacement:</span>
        <span className="font-medium">{emergencyRange}</span>
      </div>
      {differenceNote && (
        <div className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border/20">
          {differenceNote} (plus water damage risk, emergency labor)
        </div>
      )}
    </div>
  );
}

function getStateLabel(state: string): string {
  switch (state) {
    case 'stable':
      return 'Within expected range';
    case 'planning_window':
      return 'Approaching planning window';
    case 'elevated':
      return 'Warrants attention';
    default:
      return 'Unknown';
  }
}
