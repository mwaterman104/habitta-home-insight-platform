/**
 * SystemPanelOverview - Lifecycle bar, environmental factors, system verdict.
 */

import { Card, CardContent } from "@/components/ui/card";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";

interface SystemPanelOverviewProps {
  system?: SystemTimelineEntry;
}

function LifecycleBar({ system }: { system?: SystemTimelineEntry }) {
  if (!system?.installYear || !system.replacementWindow) {
    return (
      <Card className="border bg-muted/20">
        <CardContent className="py-4 px-5">
          <p className="text-sm text-muted-foreground">Insufficient data for lifecycle visualization.</p>
        </CardContent>
      </Card>
    );
  }

  const currentYear = new Date().getFullYear();
  const { earlyYear, likelyYear, lateYear } = system.replacementWindow;
  const totalSpan = Math.max(lateYear - system.installYear, 1);
  const elapsed = Math.max(currentYear - system.installYear, 0);
  const progressPercent = Math.min((elapsed / totalSpan) * 100, 100);

  // Segment boundaries as percentages
  const okEnd = Math.min(((earlyYear - system.installYear) / totalSpan) * 100, 100);
  const watchEnd = Math.min(((likelyYear - system.installYear) / totalSpan) * 100, 100);

  return (
    <Card className="border bg-muted/20">
      <CardContent className="py-4 px-5 space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lifecycle Status</h4>

        {/* Bar */}
        <div className="relative h-3 rounded-full overflow-hidden bg-muted">
          {/* OK segment */}
          <div
            className="absolute inset-y-0 left-0 bg-green-500/30 rounded-l-full"
            style={{ width: `${okEnd}%` }}
          />
          {/* Watch segment */}
          <div
            className="absolute inset-y-0 bg-yellow-500/30"
            style={{ left: `${okEnd}%`, width: `${watchEnd - okEnd}%` }}
          />
          {/* Plan segment */}
          <div
            className="absolute inset-y-0 bg-destructive/30 rounded-r-full"
            style={{ left: `${watchEnd}%`, width: `${100 - watchEnd}%` }}
          />
          {/* Current position */}
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground z-10"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Labels */}
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Installed {system.installYear}</span>
          <span>Today</span>
          <span>Replace ~{likelyYear}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SystemPanelOverview({ system }: SystemPanelOverviewProps) {
  const currentYear = new Date().getFullYear();
  const age = system?.installYear ? currentYear - system.installYear : undefined;
  const lifespan = system?.replacementWindow
    ? system.replacementWindow.likelyYear - (system.installYear ?? currentYear)
    : undefined;

  // Derive verdict
  const statusBadge = (() => {
    if (!system?.replacementWindow) return null;
    const remaining = system.replacementWindow.likelyYear - currentYear;
    if (remaining > 5) return 'System performing within normal parameters.';
    if (remaining > 2) return 'Approaching planning window. Monitor closely.';
    return 'Replacement planning recommended.';
  })();

  return (
    <div className="space-y-4 pt-2">
      <LifecycleBar system={system} />

      {/* Environmental Factors */}
      {system?.lifespanDrivers && system.lifespanDrivers.length > 0 && (
        <Card className="border bg-muted/20">
          <CardContent className="py-4 px-5 space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Environmental Factors</h4>
            <div className="space-y-1.5">
              {system.lifespanDrivers.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.factor}</span>
                  <span className={`text-xs font-medium ${
                    d.impact === 'decrease' ? 'text-destructive' : 'text-green-600'
                  }`}>
                    {d.impact === 'decrease' ? '↓' : '↑'} {d.severity}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Verdict */}
      <Card className="border bg-muted/20">
        <CardContent className="py-4 px-5 space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Verdict</h4>
          {statusBadge && (
            <p className="text-sm font-medium text-foreground">{statusBadge}</p>
          )}
          <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
            {age !== undefined && lifespan !== undefined && (
              <li>{age} of ~{lifespan} expected years used</li>
            )}
            {system?.installSource === 'permit' && (
              <li>Install date verified via permit record</li>
            )}
            {system?.maintenanceEffect?.shiftsTimeline && (
              <li>Regular maintenance can extend lifespan by {system.maintenanceEffect.expectedDelayYears ?? '2–4'} years</li>
            )}
            {system?.disclosureNote && (
              <li>{system.disclosureNote}</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
