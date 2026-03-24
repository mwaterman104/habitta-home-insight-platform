import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { SystemTimelineLane } from "./SystemTimelineLane";
import type { HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import {
  getHomeHealthOutlookCopy,
  deriveContributorLevel,
  buildSystemInfluence,
  sortInfluencesByPriority,
  type ContributorLevel,
  type SystemInfluence,
  type ClimateContextType,
} from "@/lib/homeHealthOutlookCopy";

interface HomeHealthOutlookProps {
  forecast: HomeForecast;
  capitalTimeline: HomeCapitalTimeline | null;
  onSystemClick: (systemKey: string) => void;
  isLoading?: boolean;
}

/**
 * HomeHealthOutlook - Unified truth surface for home health
 * 
 * Three-layer architecture:
 * 1. Score Layer - Outcome (X → Y trajectory)
 * 2. Causality Layer - What's influencing this outlook
 * 3. Trajectories Layer - System evidence with contributor indicators
 * 
 * PRODUCT DOCTRINE:
 * - The score is always explainable by systems below it
 * - Arrow indicates direction without blame
 * - Costs appear ONLY in Trajectories section
 * - No "With Habitta" / "If untracked" comparisons
 */
export function HomeHealthOutlook({
  forecast,
  capitalTimeline,
  onSystemClick,
  isLoading,
}: HomeHealthOutlookProps) {
  const copy = getHomeHealthOutlookCopy();
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const endYear = currentYear + (capitalTimeline?.horizonYears || 10);

  // Derive current and projected scores
  const currentScore = forecast.currentScore;
  const projectedScore = forecast.ifLeftUntracked?.score24mo ?? currentScore;

  // Derive system influences for causality section
  const systemInfluences = useMemo<SystemInfluence[]>(() => {
    const influences: SystemInfluence[] = [];
    const systemData = forecast.systemInfluences;

    if (systemData && systemData.length > 0) {
      // Use explicit system influences from forecast
      systemData.forEach(sys => {
        const influence = buildSystemInfluence(
          sys.systemKey,
          sys.installSource,
          sys.lifecyclePosition,
          sys.hasRecentService,
          capitalTimeline?.systems.find(s => s.systemId === sys.systemKey)
            ?.replacementWindow.likelyYear 
            ? (capitalTimeline.systems.find(s => s.systemId === sys.systemKey)!.replacementWindow.likelyYear - currentYear)
            : 10,
          forecast.systemConfidence?.[sys.systemKey]?.confidence_0_1 ?? 0.5,
          sys.climateContext as ClimateContextType | undefined
        );
        influences.push(influence);
      });
    } else if (capitalTimeline?.systems) {
      // Fallback: derive from timeline systems
      capitalTimeline.systems.forEach(sys => {
        const remainingYears = sys.replacementWindow.likelyYear - currentYear;
        const confidence = sys.dataQuality === 'high' ? 0.8 : sys.dataQuality === 'medium' ? 0.5 : 0.3;
        
        const lifecyclePosition = remainingYears <= 3 ? 'end' as const
          : remainingYears <= 7 ? 'late' as const
          : remainingYears <= 12 ? 'mid' as const
          : 'early' as const;

        const influence = buildSystemInfluence(
          sys.systemId as 'hvac' | 'roof' | 'water_heater',
          sys.installSource === 'permit' ? 'permit' : sys.installSource === 'inferred' ? 'inferred' : 'unknown',
          lifecyclePosition,
          false, // hasRecentService not available in timeline
          remainingYears,
          confidence
        );
        influences.push(influence);
      });
    }

    return sortInfluencesByPriority(influences);
  }, [forecast, capitalTimeline, currentYear]);

  // Map system IDs to contributor levels for timeline lanes
  const getContributorLevel = (systemId: string): ContributorLevel | undefined => {
    const influence = systemInfluences.find(i => i.systemKey === systemId);
    return influence?.contributorLevel;
  };

  // Handle system click
  const handleSystemClick = (systemKey: string) => {
    setSelectedSystem(prev => prev === systemKey ? null : systemKey);
    onSystemClick(systemKey);
  };

  // Score color based on trajectory
  const getScoreColor = () => {
    if (currentScore >= 80) return 'text-green-700';
    if (currentScore >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-t-2 border-t-primary/20 animate-pulse">
        <CardContent className="p-5 space-y-4">
          <div className="h-20 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-t-2 border-t-primary/20">
      <CardContent className="p-5 space-y-4">
        {/* Layer 1: Score (Outcome) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="heading-h3 text-foreground">{copy.header}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="focus:outline-none">
                    <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3">
                  <p className="text-sm">
                    This score reflects patterns observed across similar homes in your area.
                    The arrow shows expected direction if current assumptions remain unchanged.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Score trajectory: Current → Projected */}
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-semibold tabular-nums ${getScoreColor()}`}>
              {currentScore}
            </span>
            <span className="text-xl text-muted-foreground">→</span>
            <span className="text-3xl text-muted-foreground tabular-nums">
              {projectedScore}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {copy.scoreSubtext}
          </p>
        </div>

        {/* Layer 2: Causality (What's Influencing This) */}
        {systemInfluences.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">
              {copy.causalitySectionTitle}
            </h4>
            {systemInfluences.slice(0, 3).map(influence => (
              <div key={influence.systemKey} className="space-y-0.5">
                <span className="font-medium text-foreground">
                  {influence.displayName}
                </span>
                <p className="text-sm text-muted-foreground">
                  {influence.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Layer 3: System Trajectories (Evidence) */}
        {capitalTimeline && capitalTimeline.systems.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                {copy.trajectoriesSectionTitle}
              </h4>
              <p className="text-xs text-muted-foreground">
                {copy.trajectoriesSectionSubhead}
              </p>
            </div>
            
            {/* Timeline lanes with contributor indicators */}
            <div className="space-y-1">
              {capitalTimeline.systems.map(system => (
                <SystemTimelineLane
                  key={system.systemId}
                  system={system}
                  startYear={currentYear}
                  endYear={endYear}
                  contributorLevel={getContributorLevel(system.systemId)}
                  showContributorIndicator={true}
                  onClick={() => handleSystemClick(system.systemId)}
                />
              ))}
            </div>
            
            {/* Legend - desaturated colors */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-3 bg-red-300/70 rounded-full" />
                <span>Primary</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-3 bg-amber-300/70 rounded-full" />
                <span>Moderate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-3 bg-emerald-300/70 rounded-full" />
                <span>Minor</span>
              </div>
            </div>
          </div>
        )}

        {/* Interaction: Selected system explanation */}
        {selectedSystem && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 animate-in fade-in">
            <p className="text-sm font-medium">Why this matters</p>
            <p className="text-sm text-muted-foreground">
              {copy.interactionCopy.whyThisMatters}
            </p>
            <p className="text-xs text-muted-foreground italic">
              {copy.interactionCopy.stabilizeHint}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============== Fallback Component ==============

interface HomeHealthOutlookFallbackProps {
  score: number;
  isHealthyState?: boolean;
}

/**
 * HomeHealthOutlookFallback - Renders when full forecast unavailable
 * 
 * CRITICAL:
 * - Explicitly states "limited information"
 * - Does NOT invent causality
 * - Does NOT show trajectories (no data to support them)
 */
export function HomeHealthOutlookFallback({ score }: HomeHealthOutlookFallbackProps) {
  const copy = getHomeHealthOutlookCopy();

  // Score color
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-700';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Card className="rounded-2xl border-t-2 border-t-muted/40">
      <CardContent className="p-5 space-y-3">
        <div className="space-y-1">
          <span className="heading-h3 text-foreground">{copy.header}</span>
          <div className={`text-4xl font-semibold tabular-nums ${getScoreColor()}`}>
            {score}
          </div>
        </div>
        <p className="text-sm text-muted-foreground italic">
          {copy.fallbackCopy.limitedInfoNote}
        </p>
      </CardContent>
    </Card>
  );
}
