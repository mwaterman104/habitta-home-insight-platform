/**
 * RightColumnSurface - Polymorphic panel switcher for the right column.
 * 
 * Renders the active panel based on FocusState.
 * Default: HomeOverviewPanel (map, conditions, calendar).
 * Panels replace — never stack.
 */

import { useFocusState } from "@/contexts/FocusStateContext";
import { HomeOverviewPanel, type HomeOverviewPanelProps } from "./panels/HomeOverviewPanel";
import { SystemPanel } from "./panels/SystemPanel";
import { ContractorListPanel } from "./panels/ContractorListPanel";
import { ContractorDetailPanel } from "./panels/ContractorDetailPanel";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import type { ContractorRecommendation } from "@/lib/chatFormatting";

interface RightColumnSurfaceProps extends HomeOverviewPanelProps {
  /** Capital timeline systems for SystemPanel lookup */
  capitalSystems?: SystemTimelineEntry[];
}

export function RightColumnSurface({ capitalSystems = [], ...homeOverviewProps }: RightColumnSurfaceProps) {
  const { focus, focusData } = useFocusState();

  const renderPanel = () => {
    if (!focus) {
      return <HomeOverviewPanel {...homeOverviewProps} />;
    }

    switch (focus.type) {
      case 'system': {
        const system = capitalSystems.find(s => s.systemId === focus.systemId);
        return (
          <SystemPanel
            systemId={focus.systemId}
            system={system}
            initialTab={focus.tab}
          />
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
        // Fallback to home overview until panels are built
        return <HomeOverviewPanel {...homeOverviewProps} />;
      default:
        return <HomeOverviewPanel {...homeOverviewProps} />;
    }
  };

  return (
    <div key={focus?.type === 'system' ? `system-${(focus as any)?.systemId}` : focus?.type ?? 'home'} className="animate-in fade-in slide-in-from-right-4 duration-200">
      {renderPanel()}
    </div>
  );
}
