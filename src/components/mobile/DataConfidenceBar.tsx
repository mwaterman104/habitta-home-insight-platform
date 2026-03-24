import { Progress } from "@/components/ui/progress";
import { getSystemDisplayName } from "@/lib/mobileCopy";
import type { HomeConfidenceResult, ConfidenceState } from "@/services/homeConfidence";

interface DataConfidenceBarProps {
  confidence: HomeConfidenceResult;
}

const STATE_BADGE_COLORS: Record<ConfidenceState, string> = {
  strong: 'bg-habitta-olive/15 text-habitta-olive',
  established: 'bg-habitta-slate/15 text-habitta-slate',
  moderate: 'bg-habitta-stone/15 text-habitta-stone',
  limited: 'bg-habitta-clay/15 text-habitta-clay',
};

const STATE_LABELS: Record<ConfidenceState, string> = {
  strong: 'Strong',
  established: 'Established',
  moderate: 'Moderate',
  limited: 'Limited',
};

export function DataConfidenceBar({ confidence }: DataConfidenceBarProps) {
  const { score, state, nextGain } = confidence;
  const badgeColor = STATE_BADGE_COLORS[state];
  const stateLabel = STATE_LABELS[state];

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-habitta-charcoal font-bold text-body tracking-tightest">
          Home Profile Record
        </h2>
        <span className={`text-meta font-semibold px-2.5 py-1 rounded-sm ${badgeColor}`}>
          {stateLabel} ({score}%)
        </span>
      </div>

      <Progress
        value={score}
        className="h-2.5 bg-habitta-stone/15 rounded-sm"
        style={{
          // Override indicator color via CSS custom property
          '--progress-indicator-color': '#5A7684',
        } as React.CSSProperties}
      />

      {nextGain && (
        <p className="mt-2.5 text-meta text-habitta-stone leading-relaxed">
          {nextGain.action.includes('photo')
            ? `A photo of your ${nextGain.systemKey ? getSystemDisplayName(nextGain.systemKey) : 'system'} would strengthen this record.`
            : nextGain.action.includes('Confirm when')
              ? `Confirming when your ${nextGain.systemKey ? getSystemDisplayName(nextGain.systemKey) : 'system'} was installed improves estimate accuracy.`
              : `Adding details to your ${nextGain.systemKey ? getSystemDisplayName(nextGain.systemKey) : 'system'} record improves estimate accuracy.`}
        </p>
      )}
    </section>
  );
}
