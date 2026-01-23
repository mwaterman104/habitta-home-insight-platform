import { useState, useEffect } from "react";
import { MapPin, Thermometer, Droplet, Snowflake, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ClimateZone {
  zone: 'high_heat' | 'coastal' | 'freeze_thaw' | 'moderate';
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

const SUPABASE_URL = "https://vbcsuoubxyhjhxcgrqco.supabase.co";
// Use dedicated google-static-map endpoint for map images

/**
 * Derive climate zone based on location
 * V1: Heuristic-based (will be replaced with proper climate data)
 */
function deriveClimateZone(
  state?: string, 
  city?: string, 
  lat?: number | null
): ClimateZone {
  const location = `${city || ''} ${state || ''}`.toLowerCase();
  
  // South Florida / low latitude - high heat & humidity
  if (
    location.includes('miami') || 
    location.includes('fort lauderdale') ||
    location.includes('west palm') ||
    location.includes('tampa') ||
    location.includes('orlando') ||
    (state?.toLowerCase() === 'florida') ||
    (lat && lat < 28)
  ) {
    return {
      zone: 'high_heat',
      label: 'High heat & humidity zone',
      impact: 'Impacts HVAC, roof, and water heater lifespan',
      icon: Thermometer,
      gradient: 'from-orange-100/60 to-amber-100/40',
    };
  }
  
  // Coastal areas
  if (
    location.includes('beach') || 
    location.includes('coast') ||
    location.includes('key ') ||
    location.includes('island')
  ) {
    return {
      zone: 'coastal',
      label: 'Salt air exposure zone',
      impact: 'Accelerates exterior and HVAC wear',
      icon: Droplet,
      gradient: 'from-cyan-100/60 to-blue-100/40',
    };
  }
  
  // Northern / freeze-thaw areas
  if (
    location.includes('boston') || 
    location.includes('chicago') ||
    location.includes('minneapolis') ||
    location.includes('denver') ||
    location.includes('detroit') ||
    location.includes('milwaukee') ||
    ['mn', 'wi', 'mi', 'nd', 'sd', 'mt', 'wy', 'vt', 'nh', 'me'].includes(state?.toLowerCase() || '') ||
    (lat && lat > 42)
  ) {
    return {
      zone: 'freeze_thaw',
      label: 'Freeze-thaw zone',
      impact: 'Impacts plumbing, foundation, and exterior',
      icon: Snowflake,
      gradient: 'from-blue-100/60 to-slate-100/40',
    };
  }
  
  // Default: moderate
  return {
    zone: 'moderate',
    label: 'Moderate climate zone',
    impact: 'Standard wear patterns expected',
    icon: Sun,
    gradient: 'from-green-100/40 to-emerald-100/30',
  };
}

/**
 * PropertyMap - Property location with climate exposure indicator
 * 
 * Part of the Context Rail (Right Column).
 * Shows property location with climate zone meaning.
 * 
 * The map now has a JOB: explain why location matters.
 */
export function PropertyMap({ 
  lat, 
  lng, 
  address, 
  city,
  state,
  className 
}: PropertyMapProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const hasCoordinates = lat != null && lng != null;
  const climate = deriveClimateZone(state, city, lat);
  
  // Reset state when coordinates change
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setRetryCount(0);
  }, [lat, lng]);
  
  // Key for forcing image reload on retry
  const mapKey = `${lat}-${lng}-${retryCount}`;
  const ClimateIcon = climate.icon;

  // Build the static map URL via dedicated edge function
  const mapUrl = hasCoordinates
    ? `${SUPABASE_URL}/functions/v1/google-static-map?lat=${lat}&lng=${lng}&zoom=15&size=640x360`
    : null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Full-bleed map visualization */}
      <div className="aspect-video bg-muted flex items-center justify-center relative">
        {/* Show actual Google Map if we have coordinates and no error */}
        {mapUrl && !imageError ? (
          <>
            {imageLoading && (
              <Skeleton className="absolute inset-0" />
            )}
            <img
              key={mapKey}
              src={mapUrl}
              alt={`Map of ${address || 'property location'}`}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                imageLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={() => {
                setImageLoading(false);
                setImageError(false);
              }}
              onError={() => {
                setImageLoading(false);
                // Retry up to 2 times with a delay
                if (retryCount < 2) {
                  setTimeout(() => setRetryCount(prev => prev + 1), 1000);
                } else {
                  setImageError(true);
                }
              }}
            />
            {/* Climate zone overlay badge */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm shadow-sm">
              <ClimateIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{climate.label}</span>
            </div>
          </>
        ) : (
          // Fallback placeholder when no coordinates or image error
          <>
            {/* Climate-based gradient overlay */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br",
              climate.gradient
            )} />
            
            {/* Placeholder content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                {hasCoordinates ? (
                  <p className="text-xs text-muted-foreground">
                    {lat?.toFixed(4)}, {lng?.toFixed(4)}
                  </p>
                ) : address ? (
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
            
            {/* Climate badge on fallback too */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm">
              <ClimateIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{climate.label}</span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
