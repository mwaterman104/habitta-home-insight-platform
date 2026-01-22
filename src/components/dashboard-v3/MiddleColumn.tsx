import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HomeHealthCard } from "@/components/HomeHealthCard";
import { MaintenanceTimeline } from "@/components/MaintenanceTimeline";
import { CapitalTimeline } from "@/components/CapitalTimeline";
import { TodaysHomeBrief } from "@/components/TodaysHomeBrief";
import { ChatDock } from "./ChatDock";
import { trackScrollDepth, trackSystemCardClick } from "@/lib/analytics";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import type { AdvisorState, RiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";

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
 * MiddleColumn - Primary Canvas with Sticky ChatDock
 * 
 * V3.1 Architecture:
 * - Scrollable content: Home Brief → Health Score → Timeline → Maintenance
 * - Sticky ChatDock at bottom (outside scroll area)
 * - Chat expands upward, content compresses
 * 
 * Removed:
 * - "Coming Up" HVAC card (redundant with Timeline)
 * - Scroll indicator (chat is always visible now)
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

  // Track scroll depth for analytics
  const lastTrackedDepth = useRef(0);
  const trackScroll = useCallback((percentage: number) => {
    // Only track significant scroll depth changes (every 25%)
    const bucket = Math.floor(percentage / 25) * 25;
    if (bucket > lastTrackedDepth.current) {
      lastTrackedDepth.current = bucket;
      trackScrollDepth(bucket, false);
    }
  }, []);

  // Scroll tracking
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    const viewport = scrollArea?.querySelector('[data-radix-scroll-area-viewport]');
    
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport as HTMLElement;
      const scrollPercentage = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      trackScroll(scrollPercentage);
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [trackScroll]);

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

  // Handle system click with analytics
  const handleSystemClickWithTracking = (systemKey: string) => {
    trackSystemCardClick(systemKey);
    onSystemClick(systemKey);
  };

  // Handle "protect" CTA - opens chat in-place with context
  const handleProtectClick = () => {
    // Expand chat with pre-seeded context instead of navigating away
    onChatExpandChange(true);
  };

  // Determine if user is new (no forecast data)
  const isNewUser = !homeForecast && !hvacPrediction;

  // Check for overdue maintenance
  const hasOverdueMaintenance = maintenanceData.nowTasks.some(t => !t.completed);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
        <div className="space-y-6 max-w-3xl mx-auto pb-4">
          {/* Enriching indicator */}
          {isEnriching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              Still analyzing your home...
            </div>
          )}

          {/* 0. Today's Home Brief - Narrative Anchor */}
          <section>
            <TodaysHomeBrief
              homeForecast={homeForecast}
              hvacPrediction={hvacPrediction}
              capitalTimeline={capitalTimeline}
              isNewUser={isNewUser}
              hasOverdueMaintenance={hasOverdueMaintenance}
            />
          </section>

          {/* 1. Home Health Forecast - Primary */}
          <section>
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

          {/* 2. Capital Timeline - Planning Windows (Entry point for systems) */}
          {timelineLoading ? (
            <Skeleton className="h-48 rounded-2xl" />
          ) : capitalTimeline && capitalTimeline.systems.length >= 2 ? (
            <section>
              <CapitalTimeline 
                timeline={capitalTimeline} 
                onSystemClick={handleSystemClickWithTracking}
              />
            </section>
          ) : null}

          {/* 3. Maintenance Timeline - What prevents change */}
          <section>
            <MaintenanceTimeline
              nowTasks={maintenanceData.nowTasks}
              thisYearTasks={maintenanceData.thisYearTasks}
              futureYearsTasks={maintenanceData.futureYearsTasks}
              onTaskComplete={onTaskComplete}
              showRiskImpact
            />
          </section>
        </div>
      </ScrollArea>
      
      {/* Sticky ChatDock - Always visible at bottom */}
      {!isMobile && (
        <div className="shrink-0">
          <ChatDock
            propertyId={propertyId}
            isExpanded={chatExpanded}
            onExpandChange={onChatExpandChange}
            hasAgentMessage={hasAgentMessage}
            advisorState={advisorState}
            focusContext={focusContext}
            openingMessage={openingMessage}
            confidence={confidence}
            risk={risk}
            onUserReply={onUserReply}
          />
        </div>
      )}
    </div>
  );
}
