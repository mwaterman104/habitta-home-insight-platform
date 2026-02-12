/**
 * RightColumnSurface - Polymorphic panel switcher for the right column.
 * 
 * Renders the active panel based on FocusState.
 * Default: HomeSystemsPanel (full) + HomeOverviewPanel (map, conditions, calendar).
 * System focus: HomeSystemsPanel (collapsed) + SystemPanel.
 * Other focus: only the relevant panel (no Outlook).
 */

import { useFocusState } from "@/contexts/FocusStateContext";
import { HomeOverviewPanel, type HomeOverviewPanelProps } from "./panels/HomeOverviewPanel";
import { SystemFocusDetail } from "./panels/SystemFocusDetail";
import { ContractorListPanel } from "./panels/ContractorListPanel";
import { ContractorDetailPanel } from "./panels/ContractorDetailPanel";
import { HomeSystemsPanel } from "./HomeSystemsPanel";
import { CapExBudgetRoadmap } from "./CapExBudgetRoadmap";
import type { SystemTimelineEntry, HomeCapitalTimeline } from "@/types/capitalTimeline";
import type { ContractorRecommendation } from "@/lib/chatFormatting";

interface RightColumnSurfaceProps extends HomeOverviewPanelProps {
  /** Capital timeline systems for SystemPanel lookup */
  capitalSystems?: SystemTimelineEntry[];
  /** Full capital timeline for the timeline visualization */
  capitalTimeline?: HomeCapitalTimeline | null;
  /** Confidence level for Outlook header */
  confidenceLevel?: 'Unknown' | 'Early' | 'Moderate' | 'High';
}

export function RightColumnSurface({
  capitalSystems = [],
  capitalTimeline,
  confidenceLevel = 'Unknown',
  ...homeOverviewProps
}: RightColumnSurfaceProps) {
  const { focus, focusData, setFocus, goBack } = useFocusState();

  const handleSystemFocus = (systemId: string) => {
    setFocus({ type: 'system', systemId }, { push: true });
  };

  const renderPanel = () => {
    if (!focus) {
      return (
        <div className="space-y-8">
          <HomeSystemsPanel
            confidenceLevel={confidenceLevel}
            capitalTimeline={capitalTimeline}
            isCollapsed={false}
          />
          {capitalTimeline && (
            <CapExBudgetRoadmap
              timeline={capitalTimeline}
              onSystemClick={handleSystemFocus}
            />
          )}
          <HomeOverviewPanel {...homeOverviewProps} />
        </div>
      );
    }

    switch (focus.type) {
      case 'system': {
        const system = capitalSystems.find(s => s.systemId === focus.systemId);
        if (!system) return <HomeOverviewPanel {...homeOverviewProps} />;
        return (
          <>
            <HomeSystemsPanel
              confidenceLevel={confidenceLevel}
              capitalTimeline={capitalTimeline}
              isCollapsed={true}
            />
            <SystemFocusDetail
              system={system}
              onBack={() => goBack()}
              currentYear={new Date().getFullYear()}
            />
          </>
        );
      }
      case 'contractor_list': {
        const listData = focusData?.contractorList || {};
        return (
          <ContractorListPanel
            query={focus.query}
            systemId={focus.systemId}
            contractors={listData.contractors}
            disclaimer={listData.disclaimer}
          />
        );
      }
      case 'contractor_detail': {
        const detailData = focusData?.contractorDetail || {};
        return (
          <ContractorDetailPanel
            contractorId={focus.contractorId}
            contractor={detailData.contractor}
          />
        );
      }
      // Future panels
      case 'maintenance':
      case 'capital_plan':
        return <HomeOverviewPanel {...homeOverviewProps} />;
      default:
        return <HomeOverviewPanel {...homeOverviewProps} />;
    }
  };

  return (
    <div key={focus?.type === 'system' ? `system-${(focus as any)?.systemId}` : focus?.type ?? 'home'} className="animate-in fade-in slide-in-from-right-4 duration-150">
      {renderPanel()}
    </div>
  );
}
