/**
 * PositionStrip - Lifecycle Position Visualization
 * 
 * Gives instant positional clarity without dates, tasks, or anxiety.
 * Answers: "Am I early, mid-life, or late — right now?"
 * 
 * Rules:
 * - Always visible
 * - Non-interactive by default
 * - Single horizontal bar
 * - One marker only: "Current Position"
 * - Muted, neutral color palette
 * - No numbers, dates, or milestones
 */

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PositionLabel, ConfidenceLanguage } from "@/lib/todaysFocusCopy";

interface PositionStripProps {
  label: PositionLabel;
  relativePosition: number;  // 0.0 → 1.0
  confidence: ConfidenceLanguage;
  sourceSystem?: string | null;
  onExpand?: () => void;
}

export function PositionStrip({ 
  label, 
  relativePosition, 
  confidence,
  onExpand 
}: PositionStripProps) {
  // Calculate marker position (0-100%), clamped with some margin
  const markerPosition = Math.min(Math.max(relativePosition * 100, 5), 95);
  
  return (
    <Card className="rounded-xl border bg-muted/30">
      <CardContent className="py-4 px-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">
            Position: {label}
          </span>
          {onExpand && (
            <button
              onClick={onExpand}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Details
            </button>
          )}
        </div>
        
        {/* Bar visualization */}
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          {/* Gradient background - subtle, neutral tones */}
          <div 
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              "bg-gradient-to-r from-emerald-200/60 via-amber-200/60 to-rose-200/60"
            )}
            style={{ width: '100%' }}
          />
          
          {/* Current position marker */}
          <div 
            className="absolute top-1/2 h-4 w-1.5 bg-foreground rounded-full shadow-sm"
            style={{ 
              left: `${markerPosition}%`, 
              transform: 'translate(-50%, -50%)' 
            }}
          />
        </div>
        
        {/* Position indicator label */}
        <div className="flex justify-center mt-2">
          <span className="text-xs text-muted-foreground">
            Current Position
          </span>
        </div>
        
        {/* Confidence (optional, text only - only show if not high) */}
        {confidence !== 'high' && (
          <p className="text-xs text-muted-foreground/70 mt-2 text-center">
            Position confidence: {confidence === 'moderate' ? 'Moderate' : 'Early'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
