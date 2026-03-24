/**
 * SystemPanelTimeline - Vertical timeline from install to projected replacement.
 * Future events use dashed styling.
 */

import type { SystemTimelineEntry } from "@/types/capitalTimeline";

interface SystemPanelTimelineProps {
  system?: SystemTimelineEntry;
}

interface TimelineEvent {
  year: number;
  label: string;
  description?: string;
  isFuture: boolean;
}

function deriveTimelineEvents(system?: SystemTimelineEntry): TimelineEvent[] {
  if (!system) return [];
  const events: TimelineEvent[] = [];
  const currentYear = new Date().getFullYear();

  // Install
  if (system.installYear) {
    events.push({
      year: system.installYear,
      label: 'System installed',
      description: system.installSource === 'permit'
        ? 'Verified via permit record'
        : system.installSource === 'inferred'
          ? 'Date inferred from property data'
          : 'Date unknown — estimated',
      isFuture: false,
    });
  }

  // Last event
  if (system.lastEventAt) {
    const eventYear = new Date(system.lastEventAt).getFullYear();
    events.push({
      year: eventYear,
      label: 'Last recorded event',
      description: system.eventShiftYears
        ? `Timeline shifted by ${system.eventShiftYears} years`
        : undefined,
      isFuture: false,
    });
  }

  // Replacement window
  if (system.replacementWindow) {
    const { earlyYear, likelyYear, lateYear } = system.replacementWindow;

    if (earlyYear > currentYear) {
      events.push({
        year: earlyYear,
        label: 'Earliest replacement window',
        isFuture: true,
      });
    }

    events.push({
      year: likelyYear,
      label: 'Projected replacement',
      description: system.replacementWindow.rationale,
      isFuture: likelyYear > currentYear,
    });

    if (lateYear > likelyYear) {
      events.push({
        year: lateYear,
        label: 'Latest replacement window',
        isFuture: true,
      });
    }
  }

  return events.sort((a, b) => a.year - b.year);
}

export function SystemPanelTimeline({ system }: SystemPanelTimelineProps) {
  const events = deriveTimelineEvents(system);

  if (events.length === 0) {
    return (
      <div className="pt-4">
        <p className="text-sm text-muted-foreground">No timeline data available for this system.</p>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="relative pl-6 space-y-6">
        {/* Vertical line */}
        <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />

        {events.map((event, i) => (
          <div key={i} className="relative">
            {/* Dot */}
            <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 ${
              event.isFuture
                ? 'border-dashed border-muted-foreground bg-background'
                : 'border-primary bg-primary/20'
            }`} />

            {/* Content */}
            <div className={event.isFuture ? 'opacity-60' : ''}>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-mono text-muted-foreground">{event.year}</span>
                <span className={`text-sm font-medium ${event.isFuture ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {event.label}
                </span>
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
