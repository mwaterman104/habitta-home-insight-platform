import { useState, useMemo } from "react";
import { MapPin, Thermometer, Droplet, Snowflake, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ClimateZone {
  zone: "high_heat" | "coastal" | "freeze_thaw" | "moderate";
  label: string;
  impact: string;
  icon: React.ElementType;
  gradient: string;
}

interface PropertyMapProps {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  city?: string;
  state?: string;
  className?: string;
}

/**
 * Derive climate zone based on location
 * V1: Heuristic-based (will be replaced with proper climate data)
 */
function deriveClimateZone(
  state?: string,
  city?: string,
  lat?: number | null
): ClimateZone {
  const location = `${city || ""} ${state || ""}`.toLowerCase();

  // South Florida / low latitude - high heat & humidity
  if (
    location.includes("miami") ||
    location.includes("fort lauderdale") ||
    location.includes("west palm") ||
    location.includes("tampa") ||
    location.includes("orlando") ||
    state?.toLowerCase() === "florida" ||
    (lat && lat < 28)
  ) {
    return {
      zone: "high_heat",
      label: "High heat & humidity zone",
      impact: "Impacts HVAC, roof, and water heater lifespan",
      icon: Thermometer,
      gradient: "from-orange-100/60 to-amber-100/40",
    };
  }

  // Coastal areas
  if (
    location.includes("beach") ||
    location.includes("coast") ||
    location.includes("key ") ||
    location.includes("island")
  ) {
    return {
      zone: "coastal",
      label: "Salt air exposure zone",
      impact: "Accelerates exterior and HVAC wear",
      icon: Droplet,
      gradient: "from-cyan-100/60 to-blue-100/40",
    };
  }

  // Northern / freeze-thaw areas
  if (
    location.includes("boston") ||
    location.includes("chicago") ||
    location.includes("minneapolis") ||
    location.includes("denver") ||
    location.includes("detroit") ||
    location.includes("milwaukee") ||
    ["mn", "wi", "mi", "nd", "sd", "mt", "wy", "vt", "nh", "me"].includes(
      state?.toLowerCase() || ""
    ) ||
    (lat && lat > 42)
  ) {
    return {
      zone: "freeze_thaw",
      label: "Freeze-thaw zone",
      impact: "Impacts plumbing, foundation, and exterior",
      icon: Snowflake,
      gradient: "from-blue-100/60 to-slate-100/40",
    };
  }

  // Default: moderate
  return {
    zone: "moderate",
    label: "Moderate climate zone",
    impact: "Standard wear patterns expected",
    icon: Sun,
    gradient: "from-green-100/40 to-emerald-100/30",
  };
}

/**
 * PropertyMap - Property location with climate exposure indicator
 *
 * Part of the Context Rail (Right Column).
 * Shows property location with climate zone meaning.
 *
 * Uses Google Static Maps API via edge function proxy.
 * Fallback: coordinate placeholder (no OSM to avoid centering issues).
 */
export function PropertyMap({
  lat,
  lng,
  address,
  city,
  state,
  className,
}: PropertyMapProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const hasCoordinates = lat != null && lng != null;
  const climate = deriveClimateZone(state, city, lat);
  const ClimateIcon = climate.icon;

  // Build Google Static Map URL via edge function - memoized for stability
  const googleMapUrl = useMemo(() => {
    if (!hasCoordinates) return null;

    const params = new URLSearchParams({
      lat: lat!.toString(),
      lng: lng!.toString(),
      zoom: "16",
      size: "640x360",
      scale: "2",
      maptype: "roadmap",
    });

    return `https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/google-static-map?${params}`;
  }, [lat, lng, hasCoordinates]);

  // Climate badge component - enhanced contrast for busy Google Map backgrounds
  const ClimateBadge = () => (
    <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md border border-black/5">
      <ClimateIcon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-semibold text-foreground">
        {climate.label}
      </span>
    </div>
  );

  // Fallback placeholder when no coordinates available
  if (!hasCoordinates) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div className="aspect-video bg-muted flex items-center justify-center relative">
          {/* Climate-based gradient overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br",
              climate.gradient
            )}
          />

          {/* Placeholder content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              {address ? (
                <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {address}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Location available
                </p>
              )}
            </div>
          </div>

          <ClimateBadge />
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="aspect-video relative bg-muted">
        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <Skeleton className="absolute inset-0" />
        )}

        {/* Google Static Map or Coordinate Fallback */}
        {!imageError && googleMapUrl ? (
          <img
            src={googleMapUrl}
            alt={`Map of ${address || "property location"}`}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          /* Coordinate placeholder fallback - calm, no error banners */
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-50",
                climate.gradient
              )}
            />
            <div className="text-center space-y-2 relative z-10">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">
                {lat?.toFixed(4)}, {lng?.toFixed(4)}
              </p>
              {address && (
                <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {address}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Climate zone overlay badge */}
        <ClimateBadge />
      </div>
    </Card>
  );
}
