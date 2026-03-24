/**
 * HomePositionOutlook - Orientation Layer
 * 
 * Lifecycle position + outlook summary.
 * QA Fix #1: When stable, outlook explains rather than reassures.
 * 
 * Rules:
 * - Section header: "HOME POSITION"
 * - Stage label prominent
 * - Single horizontal bar with position marker
 * - One-line outlook summary below bar
 * - No dates, years, or future commitments
 */

import { Card, CardContent } from "@/components/ui/card";
import type { PositionLabel, ConfidenceLevel } from "@/lib/dashboardRecoveryCopy";

interface HomePositionOutlookProps {
  label: PositionLabel;
  relativePosition: number;  // 0.0 → 1.0
  confidence: ConfidenceLevel;
  outlookSummary: string;  // QA Fix #1: Explanation, not reassurance
  onDetailsClick?: () => void;
}

export function HomePositionOutlook({ 
  label, 
  relativePosition, 
  confidence,
  outlookSummary,
  onDetailsClick 
}: HomePositionOutlookProps) {
  // Calculate marker position (5% to 95% to keep within bounds)
  const markerPosition = Math.min(Math.max(relativePosition * 100, 5), 95);
  
  return (
    <Card className="rounded-xl border bg-muted/20">
      <CardContent className="py-4 px-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Home Position
            </h2>
            <span className="text-lg font-medium text-foreground">
              {label}
            </span>
          </div>
          {onDetailsClick && (
            <button
              onClick={onDetailsClick}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Details
            </button>
          )}
        </div>
        
        {/* Bar visualization */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          {/* Gradient background */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 rounded-full"
          />
          
          {/* Current position marker */}
          <div 
            className="absolute top-1/2 h-3 w-1.5 bg-foreground rounded-full shadow-sm"
            style={{ 
              left: `${markerPosition}%`, 
              transform: 'translate(-50%, -50%)' 
            }}
          />
        </div>
        
        {/* Position indicator */}
        <div className="flex justify-center mt-1.5">
          <span className="text-xs text-muted-foreground">
            Current position
          </span>
        </div>
        
        {/* Outlook summary - QA Fix #1: Explanation, not reassurance */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Outlook:</span>{' '}
            {outlookSummary}
          </p>
        </div>
        
        {/* Confidence (optional, text only) */}
        {confidence !== 'high' && (
          <p className="text-xs text-muted-foreground/70 mt-2">
            Position confidence: {confidence === 'moderate' ? 'Moderate' : 'Early assessment'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
