import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Home, Wind, Loader2, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SnapshotData {
  city: string;
  state: string;
  roof_type: string;
  roof_age_band: string;
  cooling_type: string;
  climate_stress: string;
  year_built?: number | null;
  hvac_permit_year?: number | null;
}

interface InstantSnapshotProps {
  snapshot: SnapshotData;
  confidence: number;
  isEnriching?: boolean;
}

export function InstantSnapshot({ snapshot, confidence, isEnriching = false }: InstantSnapshotProps) {
  // Human-readable labels
  const getRoofLabel = (type: string) => {
    const labels: Record<string, string> = {
      'tile': 'Tile',
      'asphalt_shingle': 'Asphalt Shingle',
      'metal': 'Metal',
      'unknown': 'Unknown',
    };
    return labels[type] || type;
  };

  const getCoolingLabel = (type: string) => {
    const labels: Record<string, string> = {
      'central_ac': 'Central A/C',
      'heat_pump': 'Heat Pump',
      'window_unit': 'Window Unit',
      'unknown': 'Unknown',
    };
    return labels[type] || type;
  };

  const getClimateStressLabel = (stress: string) => {
    const labels: Record<string, { text: string; className: string }> = {
      'high': { text: 'High stress — heat & humidity', className: 'bg-amber-100 text-amber-800 border-amber-200' },
      'moderate': { text: 'Moderate stress', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      'low': { text: 'Low stress', className: 'bg-green-100 text-green-800 border-green-200' },
    };
    return labels[stress] || { text: stress, className: 'bg-muted text-muted-foreground' };
  };

  const climateInfo = getClimateStressLabel(snapshot.climate_stress);
  const hasHvacPermit = !!snapshot.hvac_permit_year;

  // Generate confidence summary based on score
  const getConfidenceSummary = () => {
    if (isEnriching) return 'Finding more data...';
    if (confidence >= 70) return 'High confidence from permit records';
    if (confidence >= 50) return 'Moderate confidence from property data';
    if (confidence >= 40) return 'Based on available public data';
    return 'Limited data available';
  };

  return (
    <div className="space-y-6">
      {/* Location Badge */}
      <div className="flex justify-center">
        <Badge variant="secondary" className="text-base px-4 py-1.5">
          {snapshot.city}, {snapshot.state}
        </Badge>
      </div>

      {/* System Cards */}
      <div className="grid gap-3">
        {/* Year Built - show if available */}
        {snapshot.year_built && (
          <Card className="border-muted animate-in fade-in slide-in-from-top-2 duration-300">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Year Built</p>
                <p className="font-medium">{snapshot.year_built}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Roof */}
        <Card className="border-muted">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Home className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Roof</p>
              <p className="font-medium">
                {getRoofLabel(snapshot.roof_type)}
                {snapshot.roof_age_band !== 'unknown' && (
                  <span className="text-muted-foreground font-normal">
                    {' '}(estimated)
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cooling */}
        <Card className="border-muted">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Wind className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Cooling</p>
              <p className="font-medium">
                {getCoolingLabel(snapshot.cooling_type)}
                {hasHvacPermit ? (
                  <span className="text-primary font-normal"> (replaced {snapshot.hvac_permit_year})</span>
                ) : (
                  <span className="text-muted-foreground font-normal"> (likely)</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Climate Stress */}
        <Card className="border-muted">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Thermometer className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Climate</p>
              <Badge variant="outline" className={climateInfo.className}>
                {climateInfo.text}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Score */}
      <Card className="bg-muted/50 border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Home Confidence</span>
            <span 
              className={cn(
                "text-2xl font-bold transition-all duration-500",
                isEnriching && "animate-pulse"
              )}
            >
              {confidence}%
            </span>
          </div>
          <Progress 
            value={confidence} 
            className={cn(
              "h-2 transition-all duration-500",
              isEnriching && "[&>div]:animate-pulse"
            )} 
          />
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            {isEnriching && <Loader2 className="h-3 w-3 animate-spin" />}
            {getConfidenceSummary()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
