/**
 * RightColumn - External Awareness Rail
 * 
 * QA Fix #5: FocusContextCard REMOVED.
 * Context must live in ONE place only (ContextDrawer in MiddleColumn).
 * Right column = external/environmental awareness only.
 * 
 * Selective Intelligence Upgrade:
 * - PropertyMap now includes intelligence overlays
 * - Click-to-context support for opening ContextDrawer
 * 
 * Contains:
 * - PropertyMap (location visualization with intelligence overlays)
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

interface IntelligenceOverlay {
  comparableHomesCount?: number;
  permitActivity?: 'normal' | 'elevated';
  environmentalContext?: string;
}

interface RightColumnProps {
  loading: boolean;
  // Location
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  city?: string;
  state?: string;
  // Intelligence overlay data (Selective Intelligence Upgrade)
  intelligenceOverlay?: IntelligenceOverlay;
  // Handler for map click - opens context drawer
  onMapClick?: () => void;
}

export function RightColumn({
  loading,
  latitude,
  longitude,
  address,
  city,
  state,
  intelligenceOverlay,
  onMapClick,
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

  // Derive comparable homes pattern from intelligence overlay
  const comparablePattern = intelligenceOverlay?.comparableHomesCount 
    ? `${intelligenceOverlay.comparableHomesCount} comparable homes in area`
    : "No unusual patterns detected";

  return (
    <div className="space-y-6">
      {/* Property Map - with intelligence overlays */}
      <PropertyMap 
        lat={latitude} 
        lng={longitude}
        address={address}
        city={city}
        state={state}
        className="rounded-xl"
        intelligenceOverlay={intelligenceOverlay}
        onMapClick={onMapClick}
      />

      {/* Local Conditions - environmental awareness */}
      <LocalConditions
        climateZone={getClimateZoneLabel(climate.zone)}
        environmentalStress={getEnvironmentalStressLabel(climate.zone)}
        comparableHomesPattern={comparablePattern}
      />
      
      {/* 
       * REMOVED: FocusContextCard
       * QA Fix #5: Context lives in ContextDrawer only.
       * Right column = external/environmental awareness only.
       */}
    </div>
  );
}
