/**
 * HomeProfileRecordBar — Shared record strength visualization
 * 
 * Governing concept: "Home Profile Record" replaces all "Data Confidence" references.
 * Record strength measures documentation completeness, not house condition.
 * 
 * Color tokens (locked):
 * - Track fill: bg-habitta-slate (#5A7684)
 * - Track background: bg-habitta-stone/15
 * - No danger colors ever
 */

export type StrengthLevel = 'limited' | 'moderate' | 'established' | 'strong';

export function getStrengthLevel(score: number): StrengthLevel {
  if (score >= 80) return 'strong';
  if (score >= 50) return 'established';
  if (score >= 25) return 'moderate';
  return 'limited';
}

const STRENGTH_BADGE_COLORS: Record<StrengthLevel, string> = {
  strong: 'bg-habitta-olive/15 text-habitta-olive',
  established: 'bg-habitta-slate/15 text-habitta-slate',
  moderate: 'bg-habitta-stone/15 text-habitta-stone',
  limited: 'bg-habitta-clay/15 text-habitta-clay',
};

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  strong: 'Strong',
  established: 'Established',
  moderate: 'Moderate',
  limited: 'Limited',
};

interface HomeProfileRecordBarProps {
  strengthScore: number;
  strengthLevel?: StrengthLevel;
  /** Compact mode for embedding in chat panel */
  compact?: boolean;
}

export function HomeProfileRecordBar({ 
  strengthScore, 
  strengthLevel,
  compact = false,
}: HomeProfileRecordBarProps) {
  const level = strengthLevel ?? getStrengthLevel(strengthScore);
  const badgeColor = STRENGTH_BADGE_COLORS[level];
  const label = STRENGTH_LABELS[level];
  const clampedScore = Math.max(0, Math.min(100, strengthScore));

  return (
    <section className={compact ? 'w-full' : 'w-full'}>
      <div className={`flex items-center justify-between ${compact ? 'mb-1.5' : 'mb-3'}`}>
        <h2 className={`text-habitta-charcoal font-bold tracking-tightest ${compact ? 'text-sm' : 'text-body'}`}>
          Home Profile Record
        </h2>
        <span className={`font-semibold px-2.5 py-1 rounded-sm ${badgeColor} ${compact ? 'text-[11px]' : 'text-meta'}`}>
          {label} ({clampedScore}%)
        </span>
      </div>

      <div className="w-full h-2.5 bg-habitta-stone/15 rounded-sm overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-sm transition-all duration-500"
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </section>
  );
}
