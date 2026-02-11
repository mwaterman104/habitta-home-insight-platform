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
import { SystemPanel } from "./panels/SystemPanel";
import { ContractorListPanel } from "./panels/ContractorListPanel";
import { ContractorDetailPanel } from "./panels/ContractorDetailPanel";
import { HomeSystemsPanel } from "./HomeSystemsPanel";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import type { ContractorRecommendation } from "@/lib/chatFormatting";
import type { BaselineSystem } from "./BaselineSurface";

interface RightColumnSurfaceProps extends HomeOverviewPanelProps {
  /** Capital timeline systems for SystemPanel lookup */
  capitalSystems?: SystemTimelineEntry[];
  /** Baseline systems for the permanent Outlook panel */
  baselineSystems?: BaselineSystem[];
  /** Confidence level for Outlook header */
  confidenceLevel?: 'Unknown' | 'Early' | 'Moderate' | 'High';
  /** Year built for Outlook context */
  yearBuilt?: number;
  /** Data sources for confidence explainer */
  dataSources?: Array<{
    name: string;
    status: 'verified' | 'found' | 'missing';
    contribution: string;
  }>;
}

export function RightColumnSurface({
  capitalSystems = [],
  baselineSystems = [],
  confidenceLevel = 'Unknown',
  yearBuilt,
  dataSources,
  ...homeOverviewProps
}: RightColumnSurfaceProps) {
  const { focus, focusData } = useFocusState();

  const renderPanel = () => {
    if (!focus) {
      return (
        <div className="space-y-6">
          <HomeSystemsPanel
            systems={baselineSystems}
            confidenceLevel={confidenceLevel}
            yearBuilt={yearBuilt}
            dataSources={dataSources}
            isCollapsed={false}
          />
          <HomeOverviewPanel {...homeOverviewProps} />
        </div>
      );
    }

    switch (focus.type) {
      case 'system': {
        const system = capitalSystems.find(s => s.systemId === focus.systemId);
        return (
          <div className="space-y-6">
            <HomeSystemsPanel
              systems={baselineSystems}
              confidenceLevel={confidenceLevel}
              yearBuilt={yearBuilt}
              dataSources={dataSources}
              isCollapsed={true}
            />
            <SystemPanel
              systemId={focus.systemId}
              system={system}
              initialTab={focus.tab}
            />
          </div>
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
