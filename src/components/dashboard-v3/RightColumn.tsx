import { Skeleton } from "@/components/ui/skeleton";
import { PropertyMap } from "./PropertyMap";
import { FocusContextCard } from "./FocusContextCard";
import { deriveClimateZone } from "@/lib/climateZone";
import type { FocusContext, RiskLevel } from "@/types/advisorState";
import type { SystemPrediction } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";

interface RightColumnProps {
  loading: boolean;
  // Location
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  city?: string;
  state?: string;
  // Authority coupling (from advisor state)
  focusContext: FocusContext;
  // Data for context card
  hvacPrediction: SystemPrediction | null;
  capitalTimeline: HomeCapitalTimeline | null;
  homeAge?: number;
  risk: RiskLevel;
  confidence: number;
}

/**
 * RightColumn - Context Rail
 * 
 * Redesigned as a purposeful Context Rail with explicit Authority Contract.
 * Answers: "What external or structural factors matter right now for this home?"
 * 
 * Authority Hierarchy:
 * - Primary: Today's Focus (via focusContext)
 * - Secondary: Context Rail (this component)
 * 
 * Contains:
 * - PropertyMap (with climate meaning) - taller at h-72
 * - FocusContextCard (authority-coupled, single card)
 * 
 * Guardrails (what it MUST NOT do):
 * - Must NOT introduce new system focus
 * - Must NOT escalate urgency beyond Today's Focus
 * - Must NOT present recommendations or actions
 * - Must NOT contradict Today's Focus headline
 * - Must NOT speak when Today's Focus is silent (except Quiet State)
 */
export function RightColumn({
  loading,
  latitude,
  longitude,
  address,
  city,
  state,
  focusContext,
  hvacPrediction,
  capitalTimeline,
  homeAge,
  risk,
  confidence,
}: RightColumnProps) {
  const climate = deriveClimateZone(state, city, latitude);
  
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Property Map - taller, explanatory */}
      <PropertyMap 
        lat={latitude} 
        lng={longitude}
        address={address}
        city={city}
        state={state}
        className="rounded-xl"
      />

      {/* Focus Context Card - authority-coupled */}
      <FocusContextCard
        focusContext={focusContext}
        authoritySource="todays_focus"
        climateZone={climate}
        hvacPrediction={hvacPrediction}
        capitalTimeline={capitalTimeline}
        homeAge={homeAge}
        risk={risk}
        confidence={confidence}
      />
    </div>
  );
}
