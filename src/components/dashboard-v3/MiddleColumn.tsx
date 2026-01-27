import { useRef, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatDock } from "./ChatDock";
import { SystemWatch } from "./SystemWatch";
import { StateOfHomeReport } from "./StateOfHomeReport";
import { TodaysFocusCard } from "./TodaysFocusCard";
import { PositionStrip } from "./PositionStrip";
import { ContextDrawer } from "./ContextDrawer";
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
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import type { AdvisorState, RiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";

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
  risk?: RiskLevel;
  onUserReply?: () => void;
  // Maintenance interaction handlers
  onTaskComplete?: (taskId: string) => void;
}

/**
 * MiddleColumn - Primary Canvas with Single-Narrative Authority
 * 
 * Dashboard Enhancement Architecture:
 * 1. Annual State of Home (conditional interrupt)
 * 2. Today's Focus (PRIMARY - one sentence, one truth)
 * 3. Position Strip (lifecycle orientation, always visible)
 * 4. System Watch (conditional, sharpened)
 * 5. Context Drawer (collapsed by default)
 * 6. ChatDock (sticky, pre-contextualized)
 * 
 * Architectural Principle:
 * - Judgment first. Position second. Evidence last.
 * - Chronology never leads. Orientation always does.
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
}: MiddleColumnProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const healthCardRef = useRef<HTMLDivElement>(null);

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

  // Determine if System Watch should show (not already focus source)
  const shouldShowSystemWatch = useMemo(() => {
    if (todaysFocus.state === 'stable') return false;
    // Only show if there's a planning system that's NOT the focus source
    const planningSystem = systemSignals.find(s => 
      s.monthsToPlanning && s.monthsToPlanning < 84 && s.key !== todaysFocus.sourceSystem
    );
    return !!planningSystem;
  }, [todaysFocus, systemSignals]);

  // Phase 2: View tracking for TodaysFocus (replacing HomeHealthCard tracking)
  useViewTracker(healthCardRef, {
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

  // Check for overdue maintenance
  const hasOverdueMaintenance = maintenanceData.nowTasks.some(t => !t.completed);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Scrollable content area - independent scroll */}
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-3xl mx-auto px-4 py-6">
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

          {/* 2. Today's Focus - PRIMARY AUTHORITY (always visible) */}
          <section ref={healthCardRef}>
            <TodaysFocusCard
              focus={todaysFocus}
              onContextExpand={() => setContextOpen(true)}
            />
          </section>

          {/* 3. Position Strip - ALWAYS VISIBLE */}
          <section>
            <PositionStrip
              label={position.label}
              relativePosition={position.relativePosition}
              confidence={position.confidence}
              sourceSystem={position.sourceSystem}
              onExpand={() => setContextOpen(true)}
            />
          </section>

          {/* 4. System Watch - conditional, sharpened (one sentence) */}
          {shouldShowSystemWatch && (
            <section>
              <SystemWatch
                hvacPrediction={hvacPrediction}
                capitalTimeline={capitalTimeline}
                onSystemClick={handleSystemClick}
                onChatExpand={handleChatExpand}
              />
            </section>
          )}

          {/* 5. Context Drawer - collapsed by default */}
          <section>
            <ContextDrawer
              isOpen={contextOpen}
              onOpenChange={setContextOpen}
              context={contextDrawerData}
              focusState={todaysFocus.state}
            />
          </section>

          {/* 6. ChatDock - Sticky dockable panel (IN FLOW) */}
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
