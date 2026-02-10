import { Loader2, ChevronDown } from 'lucide-react';
import { DashboardV3Layout } from '@/layouts/DashboardV3Layout';
import { useChatContext } from '@/contexts/ChatContext';
import { useHomeReport } from '@/hooks/useHomeReport';
import { useSystemsData } from '@/hooks/useSystemsData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Report sections
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

// Profile sections (folded in)
import { HomeStructure } from '@/components/HomeProfile/HomeStructure';
import { PermitsHistory } from '@/components/HomeProfile/PermitsHistory';
import { SupportingRecords } from '@/components/HomeProfile/SupportingRecords';
import { HomeActivityLog } from '@/components/HomeProfile/HomeActivityLog';

// Export
import { generateHomeReportHtml } from '@/lib/reportPdfGenerator';
import { toast } from 'sonner';

// Collapsible
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ─── Chat CTA Wrappers ─────────────────────────────────────────────────────
// These must render inside DashboardV3Layout to access ChatContext.

function SupportingRecordsWithChat() {
  const { openChat } = useChatContext();
  return (
    <SupportingRecords
      documents={[]}
      onUploadRecord={() => openChat({ type: 'supporting_record', trigger: 'upload' })}
    />
  );
}

function HomeActivityLogWithData({ homeId }: { homeId: string }) {
  const { openChat } = useChatContext();

  const { data: homeEvents } = useQuery({
    queryKey: ['home-activity-events', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_events')
        .select('id, event_type, title, description, metadata, created_at')
        .eq('home_id', homeId)
        .in('event_type', [
          'system_discovered', 'issue_reported', 'repair_completed',
          'maintenance_performed', 'replacement', 'status_change',
        ])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!homeId,
  });

  const activities = (homeEvents || []).map((event) => {
    const meta = (event.metadata as Record<string, any>) || {};
    return {
      id: event.id,
      date: event.created_at,
      title: event.title,
      category: meta.system_type || meta.kind || meta.category || 'Home',
      notes: event.description || undefined,
      contractor: meta.contractor || undefined,
    };
  });

  return (
    <HomeActivityLog
      activities={activities}
      onLogActivity={() => openChat({ type: 'activity_log', trigger: 'log_activity' })}
    />
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function HomeRecordContent() {
  const report = useHomeReport();
  const { systems: systemsData } = useSystemsData(report.homeId || '');

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
      link.download = `home-record-${addressSlug}-${dateSlug}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Record downloaded');
    } catch (err) {
      console.error('Error generating report:', err);
      toast.error('Failed to generate record');
    }
  };

  // Effective year built from ATTOM
  const yearBuiltEffective = report.attomData?.normalizedProfile?.effectiveYearBuilt ?? null;

  // Day-1 empty state
  const showDayOneFraming =
    !report.loading &&
    !report.error &&
    report.assets.coreSystems.length === 0 &&
    report.assets.appliances.length === 0 &&
    report.openIssues.length === 0 &&
    report.resolvedHistory.length === 0;

  if (report.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (report.error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-destructive">{report.error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-24 md:pb-6">
      {/* 1. Header */}
      <ReportHeader
        property={report.property}
        onDownloadPdf={handleDownloadPdf}
        yearBuiltEffective={yearBuiltEffective}
      />

      {/* 2. Day-1 empty state */}
      {showDayOneFraming && (
        <div className="bg-card rounded-lg border border-border p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            This record tracks the systems, structure, and work associated
            with your home over time.
          </p>
          <div className="space-y-1 text-sm">
            <p className="text-foreground">Current coverage:</p>
            <ul className="list-none space-y-1 text-muted-foreground pl-2">
              <li>• Home details: <span className="text-foreground">{report.property ? 'Available' : 'Not yet set up'}</span></li>
              <li>• Core systems: <span className="text-foreground">Not yet documented</span></li>
              <li>• Appliances: <span className="text-foreground">Not yet documented</span></li>
              <li>• Issues & repairs: <span className="text-foreground">None yet</span></li>
              <li>• Capital outlook: <span className="text-foreground">Not yet available</span></li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            As you chat with Habitta, this record will automatically build itself.
          </p>
        </div>
      )}

      {/* 3. Property Overview */}
      <PropertyOverviewSection property={report.property} />

      {/* 4. Home Structure & Materials */}
      {report.home && (
        <HomeStructure
          propertyData={report.attomData || undefined}
          propertyType={report.home.property_type}
          city={report.home.city}
          state={report.home.state}
          lat={report.home.lat}
        />
      )}

      {/* 5. Asset Inventory */}
      <AssetInventorySection
        coreSystems={report.assets.coreSystems}
        appliances={report.assets.appliances}
      />

      {/* 6. Capital Outlook */}
      <CapitalOutlookSection systems={report.capitalOutlook} />

      {/* 7. Open Issues */}
      <OpenIssuesSection issues={report.openIssues} />

      {/* 8. Resolved History */}
      <ResolvedHistorySection items={report.resolvedHistory} />

      {/* 9. Ownership & Purchase History */}
      <SaleHistorySection
        saleHistory={report.saleHistory}
        lastSale={report.lastSale}
      />

      {/* 10. Replacements */}
      <ReplacementsSection items={report.replacements} />

      {/* 11. Deferred Recommendations */}
      <DeferredRecommendationsSection items={report.deferredRecommendations} />

      {/* 12-14. Deferred sections (collapsed by default) */}
      {report.homeId && report.fullAddress && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-3 group">
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            Show permits, records, and activity log
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-8 pt-4">
            {/* 12. Permits & Construction History */}
            <PermitsHistory homeId={report.homeId} address={report.fullAddress} />

            {/* 13. Supporting Records */}
            <SupportingRecordsWithChat />

            {/* 14. Home Activity Log */}
            <HomeActivityLogWithData homeId={report.homeId} />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* 15. Record Confidence */}
      <CoverageSummarySection coverage={report.coverage} />
    </div>
  );
}

const HomeProfilePage = () => {
  return (
    <DashboardV3Layout>
      <HomeRecordContent />
    </DashboardV3Layout>
  );
};

export default HomeProfilePage;
