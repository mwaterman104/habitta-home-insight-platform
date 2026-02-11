import type { SystemTimelineEntry } from "@/types/capitalTimeline";

interface SystemLedgerProps {
  systems: SystemTimelineEntry[];
}

const QUALITY_DOT_COLORS: Record<string, string> = {
  high: 'bg-habitta-olive',
  medium: 'bg-habitta-slate',
  low: 'bg-habitta-clay',
};

const QUALITY_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Moderate',
  low: 'Low',
};

export function SystemLedger({ systems }: SystemLedgerProps) {
  if (systems.length === 0) return null;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex justify-between items-end py-3 border-b border-habitta-stone/30">
        <h3 className="text-habitta-charcoal font-bold text-body-sm uppercase tracking-tightest">
          System Ledger
        </h3>
        <span className="text-habitta-stone text-meta uppercase font-semibold tracking-wider">
          Next Service / Confidence
        </span>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {systems.map((system) => {
          const { earlyYear, lateYear } = system.replacementWindow;
          const dotColor = QUALITY_DOT_COLORS[system.dataQuality] || 'bg-habitta-stone';
          const qualityLabel = QUALITY_LABELS[system.dataQuality] || 'Unknown';

          return (
            <div
              key={system.systemId}
              className="flex justify-between items-center py-4 border-b border-habitta-stone/10 last:border-0"
            >
              <span className="text-habitta-charcoal font-medium text-body">
                {system.systemLabel}
              </span>

              <div className="flex items-center gap-2 text-right">
                <div className="flex flex-col">
                  <span className="text-habitta-charcoal text-body-sm">
                    Est. {earlyYear}–{lateYear}
                  </span>
                  <span className="text-habitta-stone text-meta">
                    {qualityLabel}
                  </span>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-3 text-meta text-habitta-stone leading-relaxed italic">
        Estimates based on available records and typical material lifecycles.
      </p>
    </section>
  );
}
