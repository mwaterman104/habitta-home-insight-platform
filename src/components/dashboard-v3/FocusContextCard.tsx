import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getContextCardCopy, type ContextCardState } from "@/lib/dashboardCopy";
import type { FocusContext, RiskLevel } from "@/types/advisorState";
import type { ClimateZone, ClimateZoneType } from "@/lib/climateZone";
import type { SystemPrediction } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";

interface FocusContextCardProps {
  // Authority coupling - REQUIRED
  focusContext: FocusContext;
  authoritySource: 'todays_focus'; // Must be this value or component won't render
  
  // Context data
  climateZone: ClimateZone;
  hvacPrediction: SystemPrediction | null;
  capitalTimeline: HomeCapitalTimeline | null;
  homeAge?: number;
  risk: RiskLevel;
  confidence: number;
}

/**
 * FocusContextCard - Authority-coupled context card for the Context Rail
 * 
 * This component is SECONDARY to Today's Focus. It explains WHY something matters
 * based on environmental, regional, or structural factors.
 * 
 * Authority Constraints:
 * MAY: Explain factors, reinforce rationale, provide background
 * MAY NOT: Introduce new focus, escalate urgency, present actions, contradict focus
 * 
 * If authoritySource !== 'todays_focus', component returns null.
 */
export function FocusContextCard({
  focusContext,
  authoritySource,
  climateZone,
  hvacPrediction,
  risk,
}: FocusContextCardProps) {
  // Authority gate: MUST have correct authority source
  if (authoritySource !== 'todays_focus') {
    return null;
  }

  // Derive context state based on focus and data
  const contextState = deriveContextState(focusContext, climateZone, hvacPrediction, risk);
  
  // Get system name for copy generation
  const systemName = focusContext.type === 'SYSTEM' 
    ? formatSystemName(focusContext.systemKey) 
    : undefined;
  
  // Get copy from governance module
  const copy = getContextCardCopy(contextState, climateZone.zone, systemName);

  return (
    <Card className="rounded-xl bg-card/50">
      <CardContent className="py-4 space-y-3">
        {/* Authority disclosure - REQUIRED */}
        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest">
          Context for today's focus
        </p>
        
        {/* Contextual label - muted */}
        <p className="text-xs font-medium text-muted-foreground">
          {copy.label}
        </p>
        
        {/* Headline - anchored to THIS home */}
        <p className="system-name text-sm leading-relaxed">
          {copy.headline}
        </p>
        
        {/* Supporting bullets - 2-3 max */}
        <ul className="space-y-1.5 text-meta text-muted-foreground">
          {copy.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="text-xs">{bullet}</span>
            </li>
          ))}
        </ul>
        
        {/* Optional learn-more link - not a CTA */}
        {copy.learnMoreLabel && copy.learnMoreHref && (
          <Link 
            to={copy.learnMoreHref} 
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 pt-1"
          >
            {copy.learnMoreLabel}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Derive context state based on focus and environmental factors
 * 
 * Focus Type → Allowed Context States:
 * - SYSTEM + planning window → local_activity, climate_stress
 * - SYSTEM + monitoring → climate_stress
 * - SYSTEM + action → risk_context
 * - NONE → quiet only
 */
function deriveContextState(
  focusContext: FocusContext,
  climateZone: ClimateZone,
  hvacPrediction: SystemPrediction | null,
  risk: RiskLevel
): ContextCardState {
  // No focus = quiet (Authority Rule #1)
  if (focusContext.type === 'NONE') {
    return 'quiet';
  }
  
  // System in focus - determine appropriate context
  if (focusContext.type === 'SYSTEM') {
    const systemKey = focusContext.systemKey.toLowerCase();
    
    // Risk context for roof/structural systems with high risk
    if ((systemKey === 'roof' || systemKey === 'foundation') && risk === 'HIGH') {
      return 'risk_context';
    }
    
    // Planning window = local activity context
    if (hvacPrediction?.planning) {
      return 'local_activity';
    }
    
    // Climate stress for climate-sensitive systems
    if (['hvac', 'water_heater', 'roof'].includes(systemKey)) {
      if (climateZone.zone === 'high_heat' || climateZone.zone === 'coastal' || climateZone.zone === 'freeze_thaw') {
        return 'climate_stress';
      }
    }
  }
  
  // Default quiet
  return 'quiet';
}

/**
 * Format system key to human-readable name
 */
function formatSystemName(systemKey: string): string {
  const systemNames: Record<string, string> = {
    hvac: 'HVAC',
    roof: 'roof',
    water_heater: 'water heater',
    electrical: 'electrical system',
    plumbing: 'plumbing',
    windows: 'windows',
    foundation: 'foundation',
  };
  return systemNames[systemKey.toLowerCase()] || systemKey;
}
