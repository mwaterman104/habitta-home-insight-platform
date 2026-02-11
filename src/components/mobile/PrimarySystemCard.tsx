import { Droplets, Wind, Home, Zap, Wrench, type LucideIcon } from "lucide-react";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import { getRemainingYearsForSystem, getLateLifeState } from "@/services/homeOutlook";

interface PrimarySystemCardProps {
  system: SystemTimelineEntry;
}

const ICON_MAP: Record<string, LucideIcon> = {
  water_heater: Droplets,
  hvac: Wind,
  roof: Home,
  electrical: Zap,
  plumbing: Wrench,
};

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

const SOURCE_LABELS: Record<string, string> = {
  permit: 'Install Permit',
  inferred: 'Inferred Record',
  unknown: 'Unknown Source',
};

function getStatusLine(system: SystemTimelineEntry): string {
  const remaining = getRemainingYearsForSystem(system);
  const lateLife = getLateLifeState(system);
  const { earlyYear, lateYear } = system.replacementWindow;

  if (lateLife === 'planning-critical-late') {
    return `Inside planning window (${earlyYear}–${lateYear})`;
  }
  if (lateLife === 'routine-late') {
    return `At end of expected life (${earlyYear}–${lateYear})`;
  }
  if (remaining !== null && remaining <= 3) {
    return `Approaching replacement (${earlyYear}–${lateYear})`;
  }
  return `Est. service window ${earlyYear}–${lateYear}`;
}

function getDescription(system: SystemTimelineEntry): string {
  const parts: string[] = [];
  if (system.installYear) {
    parts.push(`Based on ${system.installYear} ${SOURCE_LABELS[system.installSource] || 'records'}`);
  }
  if (system.materialType && system.materialType !== 'unknown') {
    parts.push(`${system.materialType} material`);
  }
  const lifespan = system.replacementWindow;
  if (lifespan) {
    const span = lifespan.lateYear - lifespan.earlyYear;
    parts.push(`typical ${span + (lifespan.earlyYear - (system.installYear || lifespan.earlyYear))}–${lifespan.lateYear - (system.installYear || lifespan.earlyYear)} year lifecycle`);
  }
  return parts.length > 0 ? parts.join('; ') + '.' : 'Limited records available.';
}

export function PrimarySystemCard({ system }: PrimarySystemCardProps) {
  const Icon = ICON_MAP[system.systemId] || Wrench;
  const lateLife = getLateLifeState(system);
  const isAtRisk = lateLife !== 'not-late';
  const borderClass = isAtRisk ? 'border-habitta-clay/40' : 'border-habitta-stone/20';
  const qualityDot = QUALITY_DOT_COLORS[system.dataQuality] || 'bg-habitta-stone';
  const qualityLabel = QUALITY_LABELS[system.dataQuality] || 'Unknown';

  return (
    <section className={`w-full p-5 bg-habitta-ivory border-2 ${borderClass} rounded-sm`}>
      <div className="flex items-start gap-4">
        <div className="mt-1 bg-habitta-stone/5 p-3 rounded-sm shrink-0">
          <Icon size={28} strokeWidth={1.5} className="text-habitta-stone" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <h3 className="text-habitta-charcoal font-bold text-h3 tracking-tightest">
            {system.systemLabel}
          </h3>

          <p className="text-habitta-clay font-medium text-body-sm">
            {getStatusLine(system)}
          </p>

          <p className="text-habitta-stone text-meta leading-relaxed">
            {getDescription(system)}
          </p>

          {/* Footer: Source + Confidence */}
          <div className="pt-3 mt-2 border-t border-habitta-stone/15 space-y-1.5">
            <div className="flex items-center justify-between text-meta">
              <span className="text-habitta-stone uppercase tracking-wider font-semibold">Source</span>
              <span className="text-habitta-charcoal">
                {system.installYear ? `${system.installYear} ${SOURCE_LABELS[system.installSource] || 'Record'}` : 'No record'}
              </span>
            </div>
            <div className="flex items-center justify-between text-meta">
              <span className="text-habitta-stone uppercase tracking-wider font-semibold">Confidence</span>
              <div className="flex items-center gap-1.5">
                <span className="text-habitta-charcoal">{qualityLabel}</span>
                <span className={`w-2 h-2 rounded-full ${qualityDot}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
