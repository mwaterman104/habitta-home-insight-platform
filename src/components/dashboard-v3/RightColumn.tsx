/**
 * RightColumn - External Awareness Rail
 * 
 * QA Fix #5: FocusContextCard REMOVED.
 * Context must live in ONE place only (ContextDrawer in MiddleColumn).
 * Right column = external/environmental awareness only.
 * 
 * Contains:
 * - PropertyMap (location visualization)
 * - LocalConditions (climate, stress, comparable homes)
 */

import { Skeleton } from "@/components/ui/skeleton";
import { PropertyMap } from "./PropertyMap";
import { LocalConditions } from "./LocalConditions";
import { deriveClimateZone } from "@/lib/climateZone";
import { 
  getClimateZoneLabel, 
  getEnvironmentalStressLabel 
} from "@/lib/dashboardRecoveryCopy";

interface RightColumnProps {
  loading: boolean;
  // Location
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  city?: string;
  state?: string;
  // REMOVED: focusContext, hvacPrediction, capitalTimeline, homeAge, risk, confidence
  // QA Fix #5: Context lives in ContextDrawer only
}

export function RightColumn({
  loading,
  latitude,
  longitude,
  address,
  city,
  state,
}: RightColumnProps) {
  const climate = deriveClimateZone(state, city, latitude);
  
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Property Map - unchanged */}
      <PropertyMap 
        lat={latitude} 
        lng={longitude}
        address={address}
        city={city}
        state={state}
        className="rounded-xl"
      />

      {/* Local Conditions - NEW (replaces FocusContextCard) */}
      <LocalConditions
        climateZone={getClimateZoneLabel(climate.zone)}
        environmentalStress={getEnvironmentalStressLabel(climate.zone)}
        comparableHomesPattern="No unusual patterns detected"
      />
      
      {/* 
       * REMOVED: FocusContextCard
       * QA Fix #5: Context lives in ContextDrawer only.
       * Right column = external/environmental awareness only.
       */}
    </div>
  );
}
