import type { ReportCoverage } from '@/hooks/useHomeReport';

interface CoverageSummarySectionProps {
  coverage: ReportCoverage;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3">
      <p className="text-kpi text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export function CoverageSummarySection({
  coverage,
}: CoverageSummarySectionProps) {
  const confidenceLabel =
    coverage.avgConfidence >= 75
      ? 'High'
      : coverage.avgConfidence >= 50
        ? 'Medium'
        : coverage.avgConfidence > 0
          ? 'Low'
          : '—';

  return (
    <section className="space-y-3">
      <h2 className="heading-h3 text-foreground">
        Confidence & Coverage Summary
      </h2>

      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Metric label="Assets documented" value={coverage.assetCount} />
          <Metric label="Issues logged" value={coverage.issueCount} />
          <Metric label="Repairs recorded" value={coverage.repairCount} />
          <Metric label="Overall confidence" value={confidenceLabel} />
        </div>

        <div className="flex gap-4 justify-center text-xs text-muted-foreground border-t border-border pt-3">
          <span>{coverage.verifiedPct}% verified</span>
          <span>{coverage.estimatedPct}% estimated</span>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Some records are estimated or inferred. Confidence increases as
          systems are verified through photos, permits, or professional work.
        </p>
      </div>
    </section>
  );
}
