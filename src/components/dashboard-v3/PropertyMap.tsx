import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PropertyMapProps {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  className?: string;
}

/**
 * PropertyMap - Placeholder for property location map
 * 
 * Part of the Context Rail (Right Column).
 * Shows property location with weather overlay (future).
 */
export function PropertyMap({ lat, lng, address, className }: PropertyMapProps) {
  // Future: Integrate with actual map provider
  const hasCoordinates = lat && lng;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Property Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
          {/* Placeholder map visualization */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-green-100/50" />
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
        </div>
      </CardContent>
    </Card>
  );
}
