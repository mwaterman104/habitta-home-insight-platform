import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import { getLifecyclePercent, getLateLifeState } from "@/services/homeOutlook";

interface SystemLedgerProps {
  systems: SystemTimelineEntry[];
}

const QUALITY_DOT_COLORS: Record<string, string> = {
  high: 'bg-habitta-olive',
  medium: 'bg-habitta-slate',
  low: 'bg-habitta-clay'
};
const QUALITY_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Moderate',
  low: 'Low'
};

function getBarColor(percentRemaining: number): string {
  if (percentRemaining > 40) return 'bg-habitta-olive';
  if (percentRemaining > 15) return 'bg-habitta-slate';
  return 'bg-habitta-clay';
}

function shouldShowBar(system: SystemTimelineEntry): boolean {
  if (system.dataQuality === 'low' && getLateLifeState(system) === 'not-late') return false;
  if (system.installYear == null) return false;
  return true;
}

export function SystemLedger({ systems }: SystemLedgerProps) {
  const navigate = useNavigate();

  if (systems.length === 0) return null;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex justify-between items-end py-3 border-b border-habitta-stone/30">
        <h3 className="text-habitta-charcoal font-bold text-body-sm uppercase tracking-tightest">
          Systems
        </h3>
        <span className="text-habitta-stone text-meta uppercase font-semibold tracking-wider">
          Next Service / Confidence
        </span>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {systems.map(system => {
          const { earlyYear, lateYear } = system.replacementWindow;
          const dotColor = QUALITY_DOT_COLORS[system.dataQuality] || 'bg-habitta-stone';
          const qualityLabel = QUALITY_LABELS[system.dataQuality] || 'Unknown';
          const percentConsumed = getLifecyclePercent(system);
          const percentRemaining = Math.max(0, 100 - percentConsumed);
          const showBar = shouldShowBar(system);

          return (
            <div
              key={system.systemId}
              onClick={() => navigate(`/systems/${system.systemId}/plan`)}
              className="flex justify-between items-center py-4 border-b border-habitta-stone/10 last:border-0 cursor-pointer active:bg-habitta-stone/5 transition-colors"
            >
              <span className="text-habitta-charcoal font-medium text-body">
                {system.systemLabel}
              </span>

              <div className="flex items-center gap-2 text-right">
                <div className="flex flex-col gap-1">
                  <span className="text-habitta-charcoal text-body-sm">
                    Est. {earlyYear}–{lateYear}
                  </span>
                  {showBar && (
                    <div className="w-[72px] h-[3px] bg-habitta-stone/10 rounded-full overflow-hidden ml-auto">
                      <div
                        className={`h-full rounded-full ${getBarColor(percentRemaining)}`}
                        style={{ width: `${percentRemaining}%` }}
                      />
                    </div>
                  )}
                  {!showBar && (
                    <span className="text-habitta-stone text-meta">
                      {qualityLabel}
                    </span>
                  )}
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <ChevronRight size={14} strokeWidth={1.5} className="text-habitta-stone/30 shrink-0" />
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