import { Cloud, FileText, TrendingUp, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LocalSignalsProps {
  weather?: {
    condition?: string;
    temperature?: number;
    humidity?: number;
  };
  recentPermits?: number;
  marketTrend?: 'up' | 'down' | 'stable';
  className?: string;
}

/**
 * LocalSignals - Contextual intelligence for the Context Rail
 * 
 * Shows:
 * - Current weather impact
 * - Recent permits in area
 * - Market conditions (if available)
 * 
 * Must remain informational and glanceable.
 * Must NOT repeat health scores or introduce CTAs.
 */
export function LocalSignals({ 
  weather, 
  recentPermits, 
  marketTrend,
  className 
}: LocalSignalsProps) {
  const signals = [
    weather && {
      icon: weather.temperature ? Thermometer : Cloud,
      label: 'Weather',
      value: weather.temperature 
        ? `${weather.temperature}°F` 
        : weather.condition || 'Monitoring active',
      detail: weather.humidity ? `${weather.humidity}% humidity` : undefined,
    },
    recentPermits !== undefined && {
      icon: FileText,
      label: 'Nearby Permits',
      value: `${recentPermits} recent`,
      detail: 'In your neighborhood',
    },
    marketTrend && {
      icon: TrendingUp,
      label: 'Market',
      value: marketTrend === 'up' ? 'Trending up' : marketTrend === 'down' ? 'Trending down' : 'Stable',
      detail: 'Local home values',
    },
  ].filter(Boolean) as Array<{
    icon: React.ElementType;
    label: string;
    value: string;
    detail?: string;
  }>;

  // Show default if no signals available
  if (signals.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Local Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Weather & climate monitoring active
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Habitta continuously monitors local conditions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Local Factors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.map((signal, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
              <signal.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">{signal.label}</span>
                <span className="text-sm font-medium">{signal.value}</span>
              </div>
              {signal.detail && (
                <p className="text-xs text-muted-foreground">{signal.detail}</p>
              )}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-2 border-t">
          Factors that may affect your home systems.
        </p>
      </CardContent>
    </Card>
  );
}
