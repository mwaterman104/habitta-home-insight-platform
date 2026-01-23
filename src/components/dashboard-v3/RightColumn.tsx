import { useState } from "react";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import { PropertyMap } from "./PropertyMap";
import { LocalSignals } from "./LocalSignals";
import { Card, CardContent } from "@/components/ui/card";
import { TeachHabittaModal } from "@/components/TeachHabittaModal";

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
  // For TeachHabitta modal
  homeId?: string;
  onSystemAdded?: () => void;
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
  homeId,
  onSystemAdded,
}: RightColumnProps) {
  const [showTeachModal, setShowTeachModal] = useState(false);
  
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

      {/* Add System Affordance - Entry point for TeachHabittaModal */}
      {homeId && (
        <Card className="rounded-xl">
          <CardContent className="py-3">
            <button
              onClick={() => setShowTeachModal(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Plus className="h-4 w-4" />
              <div className="text-left">
                <span className="block font-medium">Add a system or appliance</span>
                <span className="text-xs">Help Habitta track something new</span>
              </div>
            </button>
          </CardContent>
        </Card>
      )}

      {/* TeachHabittaModal */}
      {homeId && (
        <TeachHabittaModal
          open={showTeachModal}
          onOpenChange={setShowTeachModal}
          homeId={homeId}
          onSystemAdded={() => {
            onSystemAdded?.();
          }}
        />
      )}
    </div>
  );
}
