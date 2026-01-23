import { Skeleton } from "@/components/ui/skeleton";
import type { HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import { PropertyMap } from "./PropertyMap";
import { LocalSignals } from "./LocalSignals";

interface RightColumnProps {
  homeForecast: HomeForecast | null;
  capitalTimeline: HomeCapitalTimeline | null;
  loading: boolean;
  // Property location data
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
}

/**
 * RightColumn - Context Rail
 * 
 * Redesigned from "Performance at a Glance" to pure contextual intelligence.
 * 
 * Contains:
 * - PropertyMap (location visualization)
 * - LocalSignals (weather, permits, market)
 * 
 * Guardrails (what it must NOT do):
 * - Must NOT repeat health scores
 * - Must NOT summarize timelines
 * - Must NOT introduce CTAs
 * - Must remain informational and glanceable
 */
export function RightColumn({
  loading,
  latitude,
  longitude,
  address,
}: RightColumnProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Property Map - Location visualization */}
      <PropertyMap 
        lat={latitude} 
        lng={longitude}
        address={address}
        className="rounded-xl"
      />

      {/* Local Signals - Contextual intelligence */}
      <LocalSignals 
        weather={{
          condition: 'Clear',
          // Future: integrate with actual weather API
        }}
        className="rounded-xl"
      />
    </div>
  );
}
