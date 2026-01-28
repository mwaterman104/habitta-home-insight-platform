/**
 * MiddleColumn — Chat Console Authority
 * 
 * LOCKED DOCTRINE:
 * "Habitta does not have a dashboard with a chat.
 *  Habitta is a chat that shows its work."
 * 
 * The middle column is ONE COMPONENT: ChatConsole
 * - No standalone cards
 * - No dashboard narration outside chat
 * - Baseline Surface is INSIDE the chat (pinned artifact)
 * 
 * ELIMINATED from middle column:
 * - HomeStatusHeader (spoke in sentences outside chat)
 * - HomePositionAnchor (standalone card)
 * - EquityPositionCard (standalone card)
 * - LifecycleHorizon (duplicated by BaselineSurface)
 * - ContextDrawer (interpretive mode handles "why")
 * 
 * KEPT:
 * - StateOfHomeReport (annual interrupt - only exception)
 * - ChatConsole (the entire column)
 */

import { useMemo, useCallback } from "react";
import { ChatConsole } from "./ChatConsole";
import { StateOfHomeReport } from "./StateOfHomeReport";
import { type BaselineSystem } from "./BaselineSurface";
import { useEngagementCadence } from "@/hooks/useEngagementCadence";
import { track } from "@/lib/analytics";
import { PLANNING_MONTHS, DATA_GAP_CONFIDENCE } from "@/types/systemState";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import type { AdvisorState, RiskLevel as AdvisorRiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";
import type { ChatMode } from "@/types/chatMode";
import { arbitrateTodaysFocus, type SystemSignal, type NarrativeContext } from "@/lib/narrativePriority";

// Legacy interface for backwards compatibility
interface TimelineTask {
  id: string;
  title: string;
  metaLine?: string;
  completed?: boolean;
  systemKey?: string;
}

interface MaintenanceData {
  nowTasks: TimelineTask[];
  thisYearTasks: TimelineTask[];
  futureYearsTasks: TimelineTask[];
}

interface MiddleColumnProps {
  homeForecast: HomeForecast | null;
  forecastLoading: boolean;
  hvacPrediction: SystemPrediction | null;
  hvacLoading: boolean;
  capitalTimeline: HomeCapitalTimeline | null;
  timelineLoading: boolean;
  maintenanceData: MaintenanceData;
  chatExpanded: boolean;
  onChatExpandChange: (expanded: boolean) => void;
  hasAgentMessage: boolean;
  propertyId: string;
  onSystemClick: (systemKey: string) => void;
  isEnriching?: boolean;
  isMobile?: boolean;
  // Advisor state props
  advisorState?: AdvisorState;
  focusContext?: { systemKey: string; trigger: string };
  openingMessage?: AdvisorOpeningMessage | null;
  confidence?: number;
  risk?: AdvisorRiskLevel;
  onUserReply?: () => void;
  // Maintenance interaction handlers
  onTaskComplete?: (taskId: string) => void;
  // Chat State Machine props
  chatMode?: ChatMode;
  systemsWithLowConfidence?: string[];
  // System Update Contract callback
  onSystemUpdated?: () => void;
}

export function MiddleColumn({
  homeForecast,
  hvacPrediction,
  capitalTimeline,
  maintenanceData,
  hasAgentMessage,
  propertyId,
  onSystemClick,
  isEnriching,
  advisorState = 'PASSIVE',
  focusContext,
  openingMessage,
  confidence = 0.5,
  risk = 'LOW',
  onUserReply,
  chatMode = 'silent_steward',
  systemsWithLowConfidence = [],
  onSystemUpdated,
}: MiddleColumnProps) {
  // Engagement cadence hook - only for annual interrupt
  const { annualCard, dismissAnnual } = useEngagementCadence(propertyId);

  // ============================================
  // Derive Baseline Systems for ChatConsole
  // ============================================
  const systemSignals = useMemo<SystemSignal[]>(() => {
    const signals: SystemSignal[] = [];
    const currentYear = new Date().getFullYear();

    if (hvacPrediction?.lifespan?.years_remaining_p50) {
      const years = hvacPrediction.lifespan.years_remaining_p50;
      const months = years * 12;
      signals.push({ 
        key: 'hvac',
        displayName: 'HVAC',
        risk: hvacPrediction.status === 'high' ? 'HIGH' : 
              hvacPrediction.status === 'moderate' ? 'MODERATE' : 'LOW',
        confidence: 0.6,
        monthsToPlanning: months,
      });
    }

    capitalTimeline?.systems.forEach(sys => {
      if (signals.some(s => s.key === sys.systemId)) return;
      const years = sys.replacementWindow.likelyYear - currentYear;
      if (years > 0) {
        signals.push({ 
          key: sys.systemId,
          displayName: sys.systemLabel,
          risk: years <= 3 ? 'HIGH' : years <= 7 ? 'MODERATE' : 'LOW',
          confidence: 0.5,
          monthsToPlanning: years * 12,
        });
      }
    });

    return signals;
  }, [hvacPrediction, capitalTimeline]);

  // Derive baseline systems for ChatConsole
  const baselineSystems = useMemo<BaselineSystem[]>(() => {
    const currentYear = new Date().getFullYear();
    
    return capitalTimeline?.systems.map(sys => {
      const expectedEnd = sys.replacementWindow.likelyYear;
      const yearsRemaining = expectedEnd - currentYear;
      const monthsRemaining = yearsRemaining * 12;
      const confidenceValue = sys.dataQuality === 'high' ? 0.8 : 
                               sys.dataQuality === 'medium' ? 0.5 : 0.3;
      
      let state: 'stable' | 'planning_window' | 'elevated' | 'data_gap' = 'stable';
      
      if (confidenceValue < DATA_GAP_CONFIDENCE) {
        state = 'data_gap';
      } else if (monthsRemaining < 12 && systemSignals.some(s => s.key === sys.systemId && s.risk === 'HIGH')) {
        state = 'elevated';
      } else if (monthsRemaining < PLANNING_MONTHS) {
        state = 'planning_window';
      }
      
      return {
        key: sys.systemId,
        displayName: sys.systemLabel,
        state,
        confidence: confidenceValue,
        monthsRemaining: monthsRemaining > 0 ? monthsRemaining : undefined,
      };
    }) ?? [];
  }, [capitalTimeline, systemSignals]);

  // Extract yearBuilt from capitalTimeline for home context
  // (Houses provide context; systems carry risk)
  const yearBuilt = useMemo<number | undefined>(() => {
    // Try to derive from capitalTimeline property data
    // For now, use a reasonable fallback based on system ages
    if (capitalTimeline?.systems && capitalTimeline.systems.length > 0) {
      const installYears = capitalTimeline.systems
        .map(s => s.installYear)
        .filter((y): y is number => y !== undefined && y !== null);
      if (installYears.length > 0) {
        // Assume home is older than oldest system install
        return Math.min(...installYears) - 5;
      }
    }
    return undefined;
  }, [capitalTimeline]);

  // Derive confidence level
  const confidenceLevel = useMemo<'Unknown' | 'Early' | 'Moderate' | 'High'>(() => {
    if (baselineSystems.length === 0) return 'Unknown';
    const avgConfidence = baselineSystems.reduce((sum, s) => sum + s.confidence, 0) / baselineSystems.length;
    if (avgConfidence >= 0.7) return 'High';
    if (avgConfidence >= 0.5) return 'Moderate';
    if (avgConfidence >= 0.3) return 'Early';
    return 'Unknown';
  }, [baselineSystems]);

  // Derive Today's Focus for chat context
  const narrativeContext = useMemo<NarrativeContext>(() => ({
    overallScore: homeForecast?.currentScore ?? 80,
    isNewUser: false,
    systems: systemSignals,
    hasOverdueMaintenance: maintenanceData.nowTasks.some(t => !t.completed),
    maintenanceCompletedThisMonth: 0,
    hasChangedSinceLastVisit: false,
  }), [homeForecast, systemSignals, maintenanceData]);

  const todaysFocus = useMemo(() => 
    arbitrateTodaysFocus(narrativeContext), 
    [narrativeContext]
  );

  // Handle "Why?" click - trigger interpretive mode
  const handleWhyClick = useCallback((systemKey: string) => {
    track('baseline_why_clicked', { system_key: systemKey }, { surface: 'dashboard' });
    onSystemClick(systemKey);
  }, [onSystemClick]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-4">
      {/* Annual State of Home - ONLY interrupt allowed */}
      {annualCard && (
        <div className="mb-4 shrink-0">
          <StateOfHomeReport 
            data={annualCard} 
            onDismiss={dismissAnnual} 
          />
        </div>
      )}

      {/* Enriching indicator (transient) */}
      {isEnriching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-4 shrink-0">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          Still analyzing your home...
        </div>
      )}

      {/* THE CHAT CONSOLE IS THE MIDDLE COLUMN */}
      <ChatConsole
        propertyId={propertyId}
        baselineSystems={baselineSystems}
        yearBuilt={yearBuilt}
        confidenceLevel={confidenceLevel}
        chatMode={chatMode}
        baselineSource={baselineSystems.length > 0 ? 'inferred' : 'inferred'}
        systemsWithLowConfidence={systemsWithLowConfidence}
        onWhyClick={handleWhyClick}
        onSystemUpdated={onSystemUpdated}
        todaysFocus={todaysFocus}
        advisorState={advisorState}
        focusContext={focusContext}
        hasAgentMessage={hasAgentMessage}
        openingMessage={openingMessage}
        confidence={confidence}
        risk={risk}
        onUserReply={onUserReply}
      />
    </div>
  );
}
