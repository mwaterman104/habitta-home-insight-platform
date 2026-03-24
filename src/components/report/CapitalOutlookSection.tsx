import type { ReportCapitalSystem } from '@/hooks/useHomeReport';

interface CapitalOutlookSectionProps {
  systems: ReportCapitalSystem[];
}

export function CapitalOutlookSection({ systems }: CapitalOutlookSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Capital Outlook</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Forward-looking planning based on system age, climate, and typical lifespans.
        </p>
      </div>

      <div className="bg-muted/50 rounded-md border border-border px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Projections are estimates, not guarantees. They update as new information is added.
        </p>
      </div>

      {systems.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground italic">
            No lifecycle projections available yet. As system details are added, capital planning estimates will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {systems.map((system) => (
              <SystemCard key={system.systemKey} system={system} />
            ))}
          </div>

          {systems.length >= 2 && <SummaryTable systems={systems} />}
        </>
      )}
    </div>
  );
}

function SystemCard({ system }: { system: ReportCapitalSystem }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground">{system.systemLabel}</h4>
        <span className="text-xs text-muted-foreground">{system.installSourceLabel}</span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Installed</span>
          <span className="text-foreground">
            {system.installYear ?? 'Install year not documented'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Lifecycle</span>
          <span className="text-muted-foreground">{system.lifecycleStageLabel}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {system.windowIsOverdue ? 'Typical window' : 'Projected window'}
          </span>
          <span className="text-foreground">{system.windowDisplay}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Guidance</span>
          <span className="text-foreground">{system.planningGuidance}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Climate</span>
          <span className="text-muted-foreground">{system.climateNote}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-1 border-t border-border">
        Confidence: {system.confidenceDetail}
      </p>
    </div>
  );
}

function SummaryTable({ systems }: { systems: ReportCapitalSystem[] }) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">System</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Typical Window</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {systems.map((system) => (
            <tr key={system.systemKey} className="border-b border-border last:border-0">
              <td className="px-4 py-2 text-foreground">{system.systemLabel}</td>
              <td className="px-4 py-2 text-muted-foreground">{system.lifecycleStageLabel}</td>
              <td className="px-4 py-2 text-foreground">{system.windowDisplay}</td>
              <td className="px-4 py-2 text-muted-foreground">{system.confidenceLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
