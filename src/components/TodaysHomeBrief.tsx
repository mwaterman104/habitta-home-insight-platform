import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import { 
  arbitrateNarrative, 
  formatSystemDisplayName,
  type NarrativeContext,
  type SystemSignal 
} from '@/lib/narrativePriority';
import { getBriefCopy } from '@/lib/dashboardCopy';
import { trackBriefView, trackRecommendationClick } from '@/lib/analytics';
import type { SystemPrediction, HomeForecast } from '@/types/systemPrediction';
import type { HomeCapitalTimeline } from '@/types/capitalTimeline';

interface TodaysHomeBriefProps {
  homeForecast: HomeForecast | null;
  hvacPrediction: SystemPrediction | null;
  capitalTimeline: HomeCapitalTimeline | null;
  isNewUser: boolean;
  hasOverdueMaintenance?: boolean;
  maintenanceCompletedThisMonth?: number;
}

/**
 * TodaysHomeBrief - Narrative Anchor Component
 * 
 * Surface Job: What matters today
 * Uses narrative arbitration to select a single dominant story.
 * Optionally displays a soft recommendation directive.
 */
export function TodaysHomeBrief({
  homeForecast,
  hvacPrediction,
  capitalTimeline,
  isNewUser,
  hasOverdueMaintenance = false,
  maintenanceCompletedThisMonth = 0
}: TodaysHomeBriefProps) {
  const navigate = useNavigate();
  
  // Build system signals from available data
  const systemSignals = useMemo((): SystemSignal[] => {
    const signals: SystemSignal[] = [];
    
    // HVAC signal - use optimization.planningEligibility for remaining years
    if (hvacPrediction) {
      const risk = hvacPrediction.status === 'high' ? 'HIGH' 
        : hvacPrediction.status === 'moderate' ? 'MODERATE' 
        : 'LOW';
      
      // Get remaining years from optimization signals or lifespan prediction
      const remainingYears = hvacPrediction.optimization?.planningEligibility?.remainingYears
        ?? hvacPrediction.lifespan?.years_remaining_p50;
      const monthsToPlanning = remainingYears ? remainingYears * 12 : undefined;
      
      // Get confidence from lifespan or optimization state
      const confidence = hvacPrediction.lifespan?.confidence_0_1 
        ?? (hvacPrediction.optimization?.confidenceState === 'high' ? 0.8 
          : hvacPrediction.optimization?.confidenceState === 'medium' ? 0.6 
          : 0.4);
      
      signals.push({
        key: 'hvac',
        displayName: 'HVAC',
        risk,
        confidence,
        monthsToPlanning,
        confidenceDelta: undefined // Future: track from previous session
      });
    }
    
    // Capital timeline systems - use systemId and replacementWindow
    if (capitalTimeline?.systems) {
      capitalTimeline.systems.forEach(sys => {
        // Skip if already added (like HVAC)
        if (signals.some(s => s.key === sys.systemId)) return;
        
        // Use replacementWindow.likelyYear for planning
        const monthsToPlanning = sys.replacementWindow?.likelyYear 
          ? (sys.replacementWindow.likelyYear - new Date().getFullYear()) * 12 
          : undefined;
        
        // Map dataQuality to confidence
        const confidence = sys.dataQuality === 'high' ? 0.8 
          : sys.dataQuality === 'medium' ? 0.6 
          : 0.4;
        
        signals.push({
          key: sys.systemId,
          displayName: formatSystemDisplayName(sys.systemId),
          risk: 'LOW', // Default - capital timeline doesn't have risk
          confidence,
          monthsToPlanning
        });
      });
    }
    
    return signals;
  }, [hvacPrediction, capitalTimeline]);
  
  // Build narrative context
  const narrativeContext = useMemo((): NarrativeContext => ({
    overallScore: homeForecast?.currentScore ?? 82,
    isNewUser,
    systems: systemSignals,
    hasOverdueMaintenance,
    maintenanceCompletedThisMonth
  }), [homeForecast, isNewUser, systemSignals, hasOverdueMaintenance, maintenanceCompletedThisMonth]);
  
  // Arbitrate to get single narrative
  const narrative = useMemo(() => 
    arbitrateNarrative(narrativeContext), 
    [narrativeContext]
  );
  
  // Get copy for this narrative
  const brief = useMemo(() => 
    getBriefCopy(narrative), 
    [narrative]
  );
  
  // Track brief view on mount
  useEffect(() => {
    trackBriefView(narrative.priority, narrative.dominantSystem);
  }, [narrative.priority, narrative.dominantSystem]);
  
  // Handle recommendation click
  const handleRecommendationClick = () => {
    if (narrative.recommendedAction) {
      trackRecommendationClick(
        narrative.recommendedAction.actionLabel,
        narrative.dominantSystem
      );
      navigate(narrative.recommendedAction.route);
    }
  };
  
  return (
    <Card className="rounded-xl border-0 bg-muted/30 shadow-none">
      <CardContent className="p-4">
        {/* Primary narrative */}
        <p className="text-base font-medium text-foreground leading-relaxed">
          {brief.primary}
        </p>
        
        {/* Secondary context */}
        {brief.secondary && (
          <p className="text-sm text-muted-foreground mt-1.5">
            {brief.secondary}
          </p>
        )}
        
        {/* Soft recommendation directive */}
        {narrative.recommendedAction && (
          <div className="mt-4 pt-3 border-t border-border/40">
            <p className="text-xs text-muted-foreground mb-1.5">
              {narrative.recommendedAction.softFraming}
            </p>
            <button
              onClick={handleRecommendationClick}
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
            >
              {narrative.recommendedAction.actionLabel}
              {narrative.recommendedAction.impactLabel && (
                <span className="ml-2 text-xs font-normal text-green-600">
                  ({narrative.recommendedAction.impactLabel})
                </span>
              )}
              <ChevronRight className="ml-1 h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
