/**
 * HomeConfidenceHero — Primary dashboard hero component
 * 
 * Replaces the LifecycleRing-based Home Outlook hero.
 * Shows confidence state (primary), index (secondary),
 * evidence chips, and next gain hint.
 * 
 * Includes a subtle confidence meter (thin track, no percentage).
 */

import type { HomeConfidenceResult, ConfidenceState } from '@/services/homeConfidence';
import { HOME_CONFIDENCE_COPY } from '@/lib/mobileCopy';
import { LifecycleRing } from '@/components/mobile/LifecycleRing';

// ============== State Colors (Locked) ==============

const STATE_COLORS: Record<ConfidenceState, string> = {
  'solid': 'hsl(145, 30%, 55%)',      // Muted green
  'developing': 'hsl(180, 25%, 50%)', // Neutral teal
  'unclear': 'hsl(38, 60%, 55%)',     // Soft amber
  'at-risk': 'hsl(25, 50%, 55%)',     // Warm orange (NEVER red)
};

const STATE_DOT_CLASSES: Record<ConfidenceState, string> = {
  'solid': 'bg-emerald-500/70',
  'developing': 'bg-teal-500/70',
  'unclear': 'bg-amber-500/70',
  'at-risk': 'bg-orange-500/70',
};

// ============== Component ==============

interface HomeConfidenceHeroProps {
  confidence: HomeConfidenceResult;
}

export function HomeConfidenceHero({ confidence }: HomeConfidenceHeroProps) {
  const stateLabel = HOME_CONFIDENCE_COPY.states[confidence.state]?.label ?? confidence.state;
  const fillPercent = Math.max(0, Math.min(100, confidence.score));

  return (
    <div className="flex flex-col items-center text-center space-y-3">
      {/* Confidence Ring with state + score inside */}
      <LifecycleRing percentConsumed={fillPercent} size={120}>
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${STATE_DOT_CLASSES[confidence.state]}`} />
            <span className="text-sm font-semibold text-foreground">
              {stateLabel}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {confidence.score}
          </span>
        </div>
      </LifecycleRing>

      {/* State meaning */}
      <p className="text-sm text-muted-foreground">
        {confidence.stateMeaning}
      </p>

      {/* Evidence chips */}
      {confidence.evidenceChips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {confidence.evidenceChips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* Next gain hint */}
      {confidence.nextGain && (
        <p className="text-xs text-muted-foreground/70">
          Next: {confidence.nextGain.action} (+{confidence.nextGain.delta})
        </p>
      )}
    </div>
  );
}
