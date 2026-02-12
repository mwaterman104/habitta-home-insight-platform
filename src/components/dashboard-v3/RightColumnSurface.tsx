/**
 * RightColumnSurface - Polymorphic panel switcher for the right column.
 * 
 * Renders the active panel based on FocusState.
 * Default: HomeSystemsPanel (full) + HomeOverviewPanel (map, conditions, calendar).
 * System focus: HomeSystemsPanel (collapsed) + SystemPanel.
 * Other focus: only the relevant panel (no Outlook).
 */

import { useState } from "react";
import { useFocusState } from "@/contexts/FocusStateContext";
import { useChatContext } from "@/contexts/ChatContext";
import { HomeOverviewPanel, type HomeOverviewPanelProps } from "./panels/HomeOverviewPanel";
import { SystemFocusDetail } from "./panels/SystemFocusDetail";
import { ContractorListPanel } from "./panels/ContractorListPanel";
import { ContractorDetailPanel } from "./panels/ContractorDetailPanel";
import { HomeSystemsPanel } from "./HomeSystemsPanel";
import { CapExBudgetRoadmap } from "./CapExBudgetRoadmap";
import { SystemUpdateModal } from "@/components/system/SystemUpdateModal";
import { SystemPhotoCapture } from "./SystemPhotoCapture";
import type { SystemTimelineEntry, HomeCapitalTimeline } from "@/types/capitalTimeline";
import type { ContractorRecommendation } from "@/lib/chatFormatting";

interface RightColumnSurfaceProps extends HomeOverviewPanelProps {
  /** Capital timeline systems for SystemPanel lookup */
  capitalSystems?: SystemTimelineEntry[];
  /** Full capital timeline for the timeline visualization */
  capitalTimeline?: HomeCapitalTimeline | null;
  /** Confidence level for Outlook header */
  confidenceLevel?: 'Unknown' | 'Early' | 'Moderate' | 'High';
  /** Home ID for modals */
  homeId?: string;
  /** Year built for SystemUpdateModal */
  yearBuilt?: number;
}

export function RightColumnSurface({
  capitalSystems = [],
  capitalTimeline,
  confidenceLevel = 'Unknown',
  homeId,
  yearBuilt,
  ...homeOverviewProps
}: RightColumnSurfaceProps) {
  const { focus, focusData, setFocus, goBack } = useFocusState();
  const { openChat } = useChatContext();
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [focusedSystemForModal, setFocusedSystemForModal] = useState<SystemTimelineEntry | null>(null);

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
              onVerifyPhoto={() => {
                setFocusedSystemForModal(system);
                setShowPhotoCapture(true);
              }}
              onReportYear={() => {
                setFocusedSystemForModal(system);
                setShowUpdateModal(true);
              }}
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
    <>
      <div key={focus?.type === 'system' ? `system-${(focus as any)?.systemId}` : focus?.type ?? 'home'} className="animate-in fade-in slide-in-from-right-4 duration-150">
        {renderPanel()}
      </div>

      {/* Photo capture modal */}
      {focusedSystemForModal && homeId && (
        <SystemPhotoCapture
          open={showPhotoCapture}
          onOpenChange={setShowPhotoCapture}
          homeId={homeId}
          systemLabel={focusedSystemForModal.systemLabel}
          systemKey={focusedSystemForModal.systemId}
        />
      )}

      {/* Year update modal */}
      {focusedSystemForModal && homeId && (
        <SystemUpdateModal
          open={showUpdateModal}
          onOpenChange={setShowUpdateModal}
          homeId={homeId}
          systemKey={focusedSystemForModal.systemId}
          currentInstallYear={focusedSystemForModal.installYear}
          yearBuilt={yearBuilt}
          onUpdateComplete={(result) => {
            openChat({
              type: 'system',
              systemKey: focusedSystemForModal.systemId,
              autoSendMessage: `I just updated the install year for my ${focusedSystemForModal.systemLabel}. The status is: ${result.replacementStatus}.`,
            });
          }}
        />
      )}
    </>
  );
}
