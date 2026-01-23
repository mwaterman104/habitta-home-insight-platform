import { Skeleton } from "@/components/ui/skeleton";
import type { HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import { PropertyMap } from "./PropertyMap";
import { LocalSignals } from "./LocalSignals";
import { Card, CardContent } from "@/components/ui/card";

interface RightColumnProps {
  homeForecast: HomeForecast | null;
  capitalTimeline: HomeCapitalTimeline | null;
  loading: boolean;
  // Property location data
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  city?: string;
  state?: string;
}

/**
 * RightColumn - Context Rail
 * 
 * Redesigned to visually nest LocalSignals under PropertyMap.
 * PropertyMap now includes climate zone indicator.
 * 
 * Contains:
 * - PropertyMap (with climate meaning)
 * - LocalSignals (nested under map)
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
  city,
  state,
}: RightColumnProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Property Map - Location with climate meaning */}
      <PropertyMap 
        lat={latitude} 
        lng={longitude}
        address={address}
        city={city}
        state={state}
        className="rounded-xl"
      />

      {/* Local Signals - Nested under map */}
      <Card className="rounded-xl">
        <CardContent className="py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Local Factors
          </p>
          <LocalSignals 
            weather={{
              condition: 'Clear',
              // Future: integrate with actual weather API
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
