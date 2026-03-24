/**
 * SystemsOverview - Coverage Proof
 * 
 * Shows breadth of monitoring without noise.
 * Answers: "What all is this watching for me?"
 * 
 * QA Fix #6: Status labels are strictly neutral
 * - Normal: Low risk, typical state
 * - Typical: Environmental systems (weather, etc.)
 * - Stable: Moderate risk, nothing alarming
 * - Observed: Higher attention, but NOT "Monitoring" (ambiguous)
 * 
 * Rules:
 * - Section header: "SYSTEMS BEING MONITORED"
 * - Simple two-column list (name + status)
 * - Neutral language only
 * - No color coding beyond muted text
 * - No progress bars, percentages, or condition scores
 */

import type { SystemStatusLabel } from "@/lib/dashboardRecoveryCopy";

interface SystemOverviewItem {
  key: string;
  label: string;
  status: SystemStatusLabel;
}

interface SystemsOverviewProps {
  systems: SystemOverviewItem[];
}

export function SystemsOverview({ systems }: SystemsOverviewProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Systems Being Monitored
      </h2>
      <div className="space-y-2">
        {systems.map((system) => (
          <div 
            key={system.key}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-foreground">{system.label}</span>
            <span className="text-muted-foreground">{system.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
