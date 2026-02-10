import { Loader2 } from 'lucide-react';
import { DashboardV3Layout } from '@/layouts/DashboardV3Layout';
import { useHomeReport } from '@/hooks/useHomeReport';
import { ReportHeader } from '@/components/report/ReportHeader';
import { PropertyOverviewSection } from '@/components/report/PropertyOverviewSection';
import { AssetInventorySection } from '@/components/report/AssetInventorySection';
import { CapitalOutlookSection } from '@/components/report/CapitalOutlookSection';
import { OpenIssuesSection } from '@/components/report/OpenIssuesSection';
import { ResolvedHistorySection } from '@/components/report/ResolvedHistorySection';
import { ReplacementsSection } from '@/components/report/ReplacementsSection';
import { SaleHistorySection } from '@/components/report/SaleHistorySection';
import { DeferredRecommendationsSection } from '@/components/report/DeferredRecommendationsSection';
import { CoverageSummarySection } from '@/components/report/CoverageSummarySection';
import { generateHomeReportHtml } from '@/lib/reportPdfGenerator';
import { toast } from 'sonner';

export default function HomeReportPage() {
  const report = useHomeReport();

  const handleDownloadPdf = () => {
    try {
      const html = generateHomeReportHtml(report);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const addressSlug = report.property
        ? report.property.address.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
        : 'home';
      const dateSlug = new Date().toISOString().split('T')[0];
      link.download = `home-report-${addressSlug}-${dateSlug}.html`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (err) {
      console.error('Error generating report:', err);
      toast.error('Failed to generate report');
    }
  };

  // Day-1 empty state: show structure even when data is sparse
  const showDayOneFraming =
    !report.loading &&
    !report.error &&
    report.assets.coreSystems.length === 0 &&
    report.assets.appliances.length === 0 &&
    report.openIssues.length === 0 &&
    report.resolvedHistory.length === 0;

  return (
    <DashboardV3Layout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-24 md:pb-6">
        {report.loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : report.error ? (
          <div className="text-center py-20">
            <p className="text-sm text-destructive">{report.error}</p>
          </div>
        ) : (
          <>
            <ReportHeader
              property={report.property}
              onDownloadPdf={handleDownloadPdf}
            />

            {showDayOneFraming && (
              <div className="bg-card rounded-lg border border-border p-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  This report tracks the systems, appliances, and work
                  associated with your home over time.
                </p>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground">Current coverage:</p>
                  <ul className="list-none space-y-1 text-muted-foreground pl-2">
                    <li>
                      • Home details:{' '}
                      <span className="text-foreground">
                        {report.property ? 'Available' : 'Not yet set up'}
                      </span>
                    </li>
                    <li>
                      • Core systems:{' '}
                      <span className="text-foreground">Not yet documented</span>
                    </li>
                    <li>
                      • Appliances:{' '}
                      <span className="text-foreground">Not yet documented</span>
                    </li>
                    <li>
                      • Issues & repairs:{' '}
                      <span className="text-foreground">None yet</span>
                    </li>
                    <li>
                      • Capital outlook:{' '}
                      <span className="text-foreground">Not yet available</span>
                    </li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  As you chat with Habitta, this report will automatically build
                  itself.
                </p>
              </div>
            )}

            {/* Fixed section order — always the same structure */}
            <PropertyOverviewSection property={report.property} />

            <AssetInventorySection
              coreSystems={report.assets.coreSystems}
              appliances={report.assets.appliances}
            />

            <CapitalOutlookSection systems={report.capitalOutlook} />

            <OpenIssuesSection issues={report.openIssues} />

            <ResolvedHistorySection items={report.resolvedHistory} />

            <ReplacementsSection items={report.replacements} />

            <DeferredRecommendationsSection
              items={report.deferredRecommendations}
            />

            <CoverageSummarySection coverage={report.coverage} />
          </>
        )}
      </div>
    </DashboardV3Layout>
  );
}
