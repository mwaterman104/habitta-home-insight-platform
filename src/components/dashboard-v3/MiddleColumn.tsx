import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HomeHealthCard } from "@/components/HomeHealthCard";
import { MaintenanceRoadmap } from "./MaintenanceRoadmap";
import { CapitalTimeline } from "@/components/CapitalTimeline";
import { ChatDock } from "./ChatDock";
import { SystemWatch } from "./SystemWatch";
import { HabittaThinking } from "./HabittaThinking";
import { track } from "@/lib/analytics";
import { useViewTracker } from "@/lib/analytics/useViewTracker";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import type { AdvisorState, RiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";

interface RoadmapTask {
  id: string;
  title: string;
  metaLine?: string;
  completed?: boolean;
  systemKey?: string;
  dueDate?: string;
  dueMonth?: string;
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  riskImpact?: {
    type: 'prevents' | 'reduces' | 'extends';
    systemName: string;
    description: string;
  };
}

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

interface SystemInWindow {
  key: string;
  remainingYears: number;
  replacementCost?: number;
  confidence?: number;
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
 * MiddleColumn - Primary Canvas with Sticky ChatDock
 * 
 * V3.2 Architecture (Structural Transformation):
 * 1. SystemWatch (authoritative, boxed)
 * 2. HomeHealthCard (primary instrument)
 * 3. HabittaThinking (chat presence above fold) - NEW
 * 4. CapitalTimeline (systems planning)
 * 5. MaintenanceRoadmap (horizontal time model) - REPLACED
 * 6. ChatDock (sticky, connected)
 * 
 * Deprecated:
 * - TodaysHomeBrief (replaced by SystemWatch)
 * - MonthlyPriorityCTA (replaced by HabittaThinking)
 * - MaintenanceTimeline (replaced by MaintenanceRoadmap)
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
  const navigate = useNavigate();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const healthCardRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const maintenanceRef = useRef<HTMLDivElement>(null);

  // Track if chat was engaged this session
  const [chatEngagedThisSession, setChatEngagedThisSession] = useState(false);

  // Derive systems in planning window for HabittaThinking
  const systemsInWindow = useMemo<SystemInWindow[]>(() => {
    const systems: SystemInWindow[] = [];
    const currentYear = new Date().getFullYear();

    if (hvacPrediction?.lifespan?.years_remaining_p50) {
      const years = hvacPrediction.lifespan.years_remaining_p50;
      if (years <= 7) {
        systems.push({ 
          key: 'hvac', 
          remainingYears: years,
          // Confidence may not be on lifespan, use a default
        });
      }
    }

    capitalTimeline?.systems.forEach(sys => {
      if (systems.some(s => s.key === sys.systemId)) return;
      const years = sys.replacementWindow.likelyYear - currentYear;
      if (years <= 7 && years > 0) {
        systems.push({ 
          key: sys.systemId, 
          remainingYears: years,
          // estimatedCost may not exist on SystemTimelineEntry
        });
      }
    });

    return systems.sort((a, b) => a.remainingYears - b.remainingYears);
  }, [hvacPrediction, capitalTimeline]);

  // Convert legacy bucket tasks to roadmap tasks
  const roadmapTasks = useMemo<RoadmapTask[]>(() => {
    const allTasks = [
      ...maintenanceData.nowTasks.map(t => ({ ...t, season: 'spring' as const })),
      ...maintenanceData.thisYearTasks.map(t => ({ ...t, season: 'summer' as const })),
      ...maintenanceData.futureYearsTasks.map(t => ({ ...t })),
    ];
    return allTasks;
  }, [maintenanceData]);

  // Phase 2: View tracking for HomeHealthCard
  useViewTracker(healthCardRef, {
    eventName: 'home_health_forecast_viewed',
    properties: {
      current_score: homeForecast?.currentScore,
      projected_score_12mo: homeForecast?.ifLeftUntracked?.score12mo,
      has_habitta_care: !!homeForecast?.withHabittaCare
    },
    context: { surface: 'dashboard' },
    enabled: !!homeForecast
  });

  // Phase 2: View tracking for Timeline
  useViewTracker(timelineRef, {
    eventName: 'systems_timeline_viewed',
    properties: {
      systems_visible: capitalTimeline?.systems.length ?? 0
    },
    context: { surface: 'dashboard' },
    enabled: !!capitalTimeline && capitalTimeline.systems.length >= 2
  });

  // Phase 2: View tracking for Maintenance
  useViewTracker(maintenanceRef, {
    eventName: 'maintenance_roadmap_viewed',
    properties: {
      upcoming_items_12mo: roadmapTasks.filter(t => !t.completed).length
    },
    context: { surface: 'maintenance' },
    enabled: true
  });

  // Derive scores for legacy fallback
  const getOverallScore = () => {
    if (!hvacPrediction) return 82;
    switch (hvacPrediction.status) {
      case 'low': return 85;
      case 'moderate': return 70;
      case 'high': return 55;
      default: return 82;
    }
  };

  const getSystemsNeedingAttention = () => {
    if (!hvacPrediction) return 0;
    return hvacPrediction.status !== 'low' ? 1 : 0;
  };

  const getWhyBullets = (): string[] => {
    if (!hvacPrediction?.why?.bullets) {
      return [
        "HVAC system age is well within expected lifespan",
        "No abnormal usage or stress indicators detected",
        "Local climate conditions are continuously monitored"
      ];
    }
    return hvacPrediction.why.bullets;
  };

  // Handle system click with tracking
  const handleSystemClick = (systemKey: string) => {
    track('timeline_system_focused', {
      system_slug: systemKey,
    }, { surface: 'dashboard', system_slug: systemKey });
    onSystemClick(systemKey);
  };

  // Handle "protect" CTA - opens chat in-place with context
  const handleProtectClick = () => {
    setChatEngagedThisSession(true);
    onChatExpandChange(true);
  };

  // Handle chat expand (for SystemWatch and MonthlyPriorityCTA)
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

          {/* 1. SystemWatch - Authoritative planning window alert (NEW) */}
          <section>
            <SystemWatch
              hvacPrediction={hvacPrediction}
              capitalTimeline={capitalTimeline}
              onSystemClick={handleSystemClick}
              onChatExpand={handleChatExpand}
            />
          </section>

          {/* 2. Home Health Forecast - Primary instrument */}
          <section ref={healthCardRef}>
            {forecastLoading ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : homeForecast ? (
              <HomeHealthCard 
                forecast={homeForecast}
                onProtectClick={handleProtectClick}
              />
            ) : (
              <HomeHealthCard 
                overallScore={getOverallScore()}
                systemsNeedingAttention={getSystemsNeedingAttention()}
                lastUpdated="today"
                scoreDrivers="HVAC age, recent maintenance, and local climate"
                whyBullets={getWhyBullets()}
                confidenceScore={35}
              />
            )}
          </section>

          {/* 3. HabittaThinking - Chat presence above fold (NEW) */}
          <section>
            <HabittaThinking
              systemsInWindow={systemsInWindow}
              chatEngagedThisSession={chatEngagedThisSession}
              onTalkClick={(systemKey) => {
                // Set focus context and expand chat
                handleSystemClick(systemKey);
                handleChatExpand();
              }}
              onDismiss={() => {
                // Dismiss handled internally via sessionStorage
              }}
            />
          </section>

          {/* 4. Capital Timeline - Planning Windows */}
          {timelineLoading ? (
            <Skeleton className="h-48 rounded-2xl" />
          ) : capitalTimeline && capitalTimeline.systems.length >= 2 ? (
            <section ref={timelineRef}>
              <CapitalTimeline 
                timeline={capitalTimeline} 
                onSystemClick={handleSystemClick}
              />
            </section>
          ) : null}

          {/* 5. Maintenance Roadmap - Horizontal time model */}
          <section ref={maintenanceRef}>
            <MaintenanceRoadmap
              tasks={roadmapTasks}
              onTaskComplete={onTaskComplete}
              showRiskImpact
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
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
