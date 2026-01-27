import { useRef, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatDock } from "./ChatDock";
import { StateOfHomeReport } from "./StateOfHomeReport";
import { ContextDrawer } from "./ContextDrawer";
import { HomeStatusHeader } from "./HomeStatusHeader";
import { HomePositionAnchor } from "./HomePositionAnchor";
import { EquityPositionCard } from "./EquityPositionCard";
import { deriveFinancingPosture, deriveEquityConfidence, type MortgageSource, type MarketValueState } from "@/lib/equityPosition";
import { LifecycleHorizon } from "./LifecycleHorizon";
import { useEngagementCadence } from "@/hooks/useEngagementCadence";
import { track } from "@/lib/analytics";
import { useViewTracker } from "@/lib/analytics/useViewTracker";
import { 
  arbitrateTodaysFocus, 
  resolvePosition, 
  resolveContextDrawer,
  type SystemSignal,
  type NarrativeContext,
} from "@/lib/narrativePriority";
import {
  getPositionLabel,
  getLifecycleNote,
  getOutlookSummary,
  getLifecycleNoteForAnchor,
  calculatePositionScore,
  type LifecycleSystem,
} from "@/lib/dashboardRecoveryCopy";
import { deriveClimateZone } from "@/lib/climateZone";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline, SystemTimelineEntry } from "@/types/capitalTimeline";
import type { AdvisorState, RiskLevel as AdvisorRiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";

// Legacy interface for backwards compatibility
interface TimelineTask {
  id: string;
  title: string;
  metaLine?: string;
  completed?: boolean;
  systemKey?: string;
  riskImpact?: {
    type: 'prevents' | 'reduces' | 'extends';
    systemName: string;
    description: string;
  };
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
  // Selective Intelligence Upgrade props - Equity Position
  marketValue?: number | null;
  marketValueState?: MarketValueState;
  mortgageBalance?: number | null;
  mortgageSource?: MortgageSource;
  city?: string | null;
  state?: string | null;
}

/**
 * MiddleColumn - Primary Canvas with Selective Intelligence Layout
 * 
 * SELECTIVE INTELLIGENCE UPGRADE - Card Grid Architecture:
 * 
 * 1. Annual State of Home (conditional interrupt)
 * 2. TODAY'S STATUS (HomeStatusHeader) - QUIET
 * 3. HERO GRID (HomePositionAnchor + EquityContextCard) - PRIMARY + SECONDARY
 * 4. LIFECYCLE HORIZON (LifecycleHorizon) - ANALYTICAL
 * 5. WHY THIS ASSESSMENT (ContextDrawer) - EXPANDABLE
 * 6. CHAT (ChatDock) - AMBIENT
 * 
 * Visual Weight Tiering (QC #1):
 * - Status Header = quiet (no card, no border)
 * - Position Anchor = primary hero (larger padding, prominent)
 * - Equity Context = secondary hero (smaller text, muted)
 * - Lifecycle Horizon = analytical (subtle bg, compact rows)
 * - Context Drawer = expandable (collapsed by default)
 * - ChatDock = ambient (sticky, minimal presence)
 * 
 * Card Cap Enforcement (QC #4):
 * - Hero cards: 2 (Position + Equity)
 * - Analytical surfaces: 1 (Lifecycle Horizon)
 * - Expandable context: 1 (Context Drawer)
 * - Chat: 1 (ChatDock)
 */
export function MiddleColumn({
  homeForecast,
  forecastLoading,
  hvacPrediction,
  hvacLoading,
  capitalTimeline,
  timelineLoading,
  maintenanceData,
  chatExpanded,
  onChatExpandChange,
  hasAgentMessage,
  propertyId,
  onSystemClick,
  isEnriching,
  isMobile = false,
  advisorState = 'PASSIVE',
  focusContext,
  openingMessage,
  confidence = 0.5,
  risk = 'LOW',
  onUserReply,
  onTaskComplete,
  marketValue,
  marketValueState,
  mortgageBalance,
  mortgageSource,
  city,
  state,
}: MiddleColumnProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const statusHeaderRef = useRef<HTMLDivElement>(null);

  // Track if chat was engaged this session
  const [chatEngagedThisSession, setChatEngagedThisSession] = useState(false);
  
  // Context drawer state (collapsed by default)
  const [contextOpen, setContextOpen] = useState(false);

  // Engagement cadence hook - stewardship mode
  const {
    annualCard,
    homeState,
    dismissAnnual,
    loading: cadenceLoading,
  } = useEngagementCadence(propertyId);

  // Derive climate zone for position anchor
  const climate = deriveClimateZone(state, city, null);

  // Derive if home is in healthy/stewardship mode
  const isHealthyState = homeState === 'healthy';

  // Build system signals for narrative arbitration
  const systemSignals = useMemo<SystemSignal[]>(() => {
    const signals: SystemSignal[] = [];
    const currentYear = new Date().getFullYear();

    // Add HVAC from prediction
    if (hvacPrediction?.lifespan?.years_remaining_p50) {
      const years = hvacPrediction.lifespan.years_remaining_p50;
      const months = years * 12;
      signals.push({ 
        key: 'hvac',
        displayName: 'HVAC',
        risk: hvacPrediction.status === 'high' ? 'HIGH' : 
              hvacPrediction.status === 'moderate' ? 'MODERATE' : 'LOW',
        confidence: 0.6, // Default confidence
        monthsToPlanning: months,
      });
    }

    // Add systems from capital timeline
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

  // Build narrative context
  const narrativeContext = useMemo<NarrativeContext>(() => ({
    overallScore: homeForecast?.currentScore ?? 80,
    isNewUser: false,
    systems: systemSignals,
    hasOverdueMaintenance: maintenanceData.nowTasks.some(t => !t.completed),
    maintenanceCompletedThisMonth: 0,
    hasChangedSinceLastVisit: false,
  }), [homeForecast, systemSignals, maintenanceData]);

  // Arbitrate Today's Focus
  const todaysFocus = useMemo(() => 
    arbitrateTodaysFocus(narrativeContext), 
    [narrativeContext]
  );

  // Resolve Position Strip data
  const position = useMemo(() => 
    resolvePosition(narrativeContext), 
    [narrativeContext]
  );

  // Resolve Context Drawer data
  const contextDrawerData = useMemo(() => 
    resolveContextDrawer(todaysFocus, narrativeContext), 
    [todaysFocus, narrativeContext]
  );

  // Note: getHvacRisk and monitoredSystems removed in Selective Intelligence Upgrade
  // SystemsOverview merged into LifecycleHorizon for cleaner analytical surface

  // Helper to derive lifecycle system from capital timeline entry
  const deriveLifecycleSystem = (sys: SystemTimelineEntry): LifecycleSystem => {
    const currentYear = new Date().getFullYear();
    const hasInstallYear = sys.installYear !== null;
    
    // QA Fix #4: When installYear is missing, clamp to mid-range
    if (!hasInstallYear) {
      return {
        key: sys.systemId,
        label: sys.systemLabel,
        positionScore: 0.5,         // Clamp to mid-range
        positionLabel: 'Mid-Life',
        note: 'Based on regional patterns',  // Clear about uncertainty
        hasInstallYear: false,
        confidence: 'early',        // Lower confidence
        installSource: sys.installSource,
        environmentalStress: undefined,
      };
    }
    
    // Normal calculation when install year exists
    const expectedLifespan = sys.replacementWindow.lateYear - (sys.installYear ?? currentYear);
    const { score: positionScore } = calculatePositionScore(
      sys.installYear,
      expectedLifespan,
      currentYear
    );
    
    const confidenceScore = sys.dataQuality === 'high' ? 0.8 : 0.5;
    
    return {
      key: sys.systemId,
      label: sys.systemLabel,
      positionScore,
      positionLabel: getPositionLabel(positionScore),
      note: getLifecycleNote(positionScore, confidenceScore, true),
      hasInstallYear: true,
      confidence: sys.dataQuality === 'high' ? 'high' : 'moderate',
      installSource: sys.installSource,
      environmentalStress: undefined,
    };
  };

  // Derive lifecycle systems with QA Fix #4 handling
  const lifecycleSystems = useMemo<LifecycleSystem[]>(() => {
    return capitalTimeline?.systems.map(sys => deriveLifecycleSystem(sys)) ?? [];
  }, [capitalTimeline]);

  // Derive outlook summary (QA Fix #1)
  const outlookSummary = useMemo(() => {
    const approaching = systemSignals.filter(s => 
      s.monthsToPlanning && s.monthsToPlanning < 36
    ).length;
    return getOutlookSummary(approaching, todaysFocus.state === 'stable');
  }, [systemSignals, todaysFocus.state]);

  // View tracking for status header
  useViewTracker(statusHeaderRef, {
    eventName: 'todays_focus_viewed',
    properties: {
      focus_state: todaysFocus.state,
      source_system: todaysFocus.sourceSystem,
      position_label: position.label,
    },
    context: { surface: 'dashboard' },
    enabled: true
  });

  // Handle system click with tracking
  const handleSystemClick = (systemKey: string) => {
    track('timeline_system_focused', {
      system_slug: systemKey,
    }, { surface: 'dashboard', system_slug: systemKey });
    onSystemClick(systemKey);
  };

  // Handle chat expand
  const handleChatExpand = () => {
    setChatEngagedThisSession(true);
    onChatExpandChange(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Scrollable content area - independent scroll */}
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="space-y-6 max-w-3xl mx-auto px-4 py-6">
          {/* 0. Enriching indicator (transient) */}
          {isEnriching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              Still analyzing your home...
            </div>
          )}

          {/* 1. Annual State of Home - interrupt only */}
          {annualCard && (
            <section>
              <StateOfHomeReport 
                data={annualCard} 
                onDismiss={dismissAnnual} 
              />
            </section>
          )}

          {/* 2. TODAY'S STATUS - QUIET (no card, no border) */}
          <section ref={statusHeaderRef}>
            <HomeStatusHeader
              message={todaysFocus.message}
              changedSinceLastVisit={todaysFocus.changedSinceLastVisit}
            />
          </section>

          {/* 3. HERO GRID - PRIMARY + SECONDARY */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PRIMARY HERO: Home Position Anchor */}
            <HomePositionAnchor
              position={position.label}
              relativePosition={position.relativePosition}
              outlookStatement={outlookSummary}
              climateLabel={climate.label}
              confidence={position.confidence}
            />
            
            {/* SECONDARY HERO: Equity Position */}
            <EquityPositionCard
              marketValue={marketValue ?? null}
              marketValueState={marketValueState ?? 'unknown'}
              financingPosture={deriveFinancingPosture(marketValue ?? null, mortgageBalance ?? null)}
              confidence={deriveEquityConfidence(!!marketValue, !!mortgageBalance, mortgageSource ?? null, marketValueState)}
              city={city}
              state={state}
            />
          </section>

          {/* 4. LIFECYCLE HORIZON - ANALYTICAL (subtle bg, compact rows) */}
          {lifecycleSystems.length > 0 && (
            <section>
              <LifecycleHorizon
                systems={lifecycleSystems}
                onSystemClick={handleSystemClick}
              />
            </section>
          )}

          {/* 5. WHY THIS ASSESSMENT - EXPANDABLE (collapsed by default) */}
          <section>
            <ContextDrawer
              isOpen={contextOpen}
              onOpenChange={setContextOpen}
              context={contextDrawerData}
              focusState={todaysFocus.state}
            />
          </section>

          {/* 6. CHAT - AMBIENT (sticky, minimal presence) */}
          <div className="sticky bottom-4">
            <ChatDock
              propertyId={propertyId}
              isExpanded={chatExpanded}
              onExpandChange={onChatExpandChange}
              advisorState={advisorState}
              focusContext={focusContext}
              hasAgentMessage={hasAgentMessage}
              openingMessage={openingMessage}
              confidence={confidence}
              risk={risk}
              onUserReply={onUserReply}
              todaysFocus={todaysFocus}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
