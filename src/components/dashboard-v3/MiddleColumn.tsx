import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HomeHealthCard } from "@/components/HomeHealthCard";
import { SystemStatusCard } from "@/components/SystemStatusCard";
import { MaintenanceTimeline } from "@/components/MaintenanceTimeline";
import { CapitalTimeline } from "@/components/CapitalTimeline";
import { ChatDock } from "./ChatDock";
import { ChevronDown } from "lucide-react";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import type { AdvisorState, RiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";

interface TimelineTask {
  id: string;
  title: string;
  metaLine?: string;
  completed?: boolean;
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
}

/**
 * MiddleColumn - Primary Canvas with Advisor State Integration
 * 
 * Strict narrative order:
 * 1. Home Health Forecast (~40%)
 * 2. Timeline / Planning Windows (~40%)
 * 3. Coming Up - Tasks
 * 4. Chat Dock (~20% - collapsed by default, auto-opens on triggers)
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
}: MiddleColumnProps) {
  const navigate = useNavigate();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatDockRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Check if ChatDock is below the fold
  useEffect(() => {
    const checkScrollPosition = () => {
      const scrollArea = scrollAreaRef.current;
      if (!scrollArea) return;
      
      const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
      if (!viewport) return;
      
      const { scrollTop, scrollHeight, clientHeight } = viewport as HTMLElement;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollIndicator(!isNearBottom && !chatExpanded);
    };

    const scrollArea = scrollAreaRef.current;
    const viewport = scrollArea?.querySelector('[data-radix-scroll-area-viewport]');
    
    if (viewport) {
      viewport.addEventListener('scroll', checkScrollPosition);
      // Initial check
      setTimeout(checkScrollPosition, 100);
    }

    return () => {
      if (viewport) {
        viewport.removeEventListener('scroll', checkScrollPosition);
      }
    };
  }, [chatExpanded]);

  // Agent-triggered scroll: when chat expands, scroll ChatDock into view
  useEffect(() => {
    if (chatExpanded && chatDockRef.current) {
      chatDockRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chatExpanded]);

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

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className={`space-y-6 max-w-3xl mx-auto ${chatExpanded ? 'pb-8' : 'pb-32'}`}>
        {/* Enriching indicator */}
        {isEnriching && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Still analyzing your home...
          </div>
        )}

        {/* 1. Home Health Forecast - Primary */}
        <section>
          {forecastLoading ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : homeForecast ? (
            <HomeHealthCard 
              forecast={homeForecast}
              onProtectClick={() => {
                const params = new URLSearchParams({
                  topic: 'protection-plan',
                  score: String(homeForecast.currentScore),
                  projected: String(homeForecast.ifLeftUntracked.score24mo),
                  topRisk: homeForecast.silentRisks[0]?.component || 'system-wear',
                  region: homeForecast.financialOutlook.region
                });
                navigate(`/chatdiy?${params.toString()}`);
              }}
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

        {/* 2. Coming Up - Systems */}
        <section>
          <h2 className="text-xs uppercase text-muted-foreground mb-1 font-medium tracking-wider">
            Coming Up
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Tracking HVAC in detail. More systems coming soon.
          </p>
          <div className="space-y-3">
            {hvacLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : hvacPrediction ? (
              <SystemStatusCard
                systemName={hvacPrediction.header.name}
                summary={hvacPrediction.forecast.summary}
                recommendation={hvacPrediction.actions[0]?.title ? `Recommended: ${hvacPrediction.actions[0].title}` : undefined}
                status={hvacPrediction.status}
                nextReview={hvacPrediction.status === 'low' ? 'Next review after summer season' : undefined}
                onClick={() => onSystemClick('hvac')}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground rounded-xl border border-dashed">
                <p>No HVAC data available yet.</p>
                <p className="text-sm">We're analyzing your home systems.</p>
              </div>
            )}
          </div>
        </section>

        {/* 3. Capital Timeline - Planning Windows */}
        {timelineLoading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : capitalTimeline && capitalTimeline.systems.length >= 2 ? (
          <section>
            <CapitalTimeline 
              timeline={capitalTimeline} 
              onSystemClick={onSystemClick}
            />
          </section>
        ) : null}

        {/* 4. Maintenance Timeline */}
        <section>
          <MaintenanceTimeline
            nowTasks={maintenanceData.nowTasks}
            thisYearTasks={maintenanceData.thisYearTasks}
            futureYearsTasks={maintenanceData.futureYearsTasks}
          />
        </section>

        {/* 5. Chat Dock - Latent (20%) */}
        {!isMobile && (
          <section className="mt-8" id="chat-dock" ref={chatDockRef}>
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
          </section>
        )}
      </div>

      {/* Subtle scroll affordance - gradient fade + chevron (not a CTA) */}
      {showScrollIndicator && !isMobile && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-10 hidden lg:flex flex-col items-center" style={{ width: '48rem', maxWidth: '100%' }}>
          <div className="w-full h-16 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute bottom-2 animate-bounce">
            <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </div>
      )}
    </ScrollArea>
  );
}
