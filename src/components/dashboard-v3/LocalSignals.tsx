import { Cloud, FileText, TrendingUp, Thermometer } from "lucide-react";

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
 * LocalSignals - Contextual intelligence signals
 * 
 * Redesigned to nest visually under PropertyMap.
 * No longer a separate card - renders as a compact list.
 * 
 * Shows:
 * - Current weather
 * - Permit activity
 * - Market conditions
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
        : weather.condition || 'Monitoring',
      detail: weather.humidity ? `${weather.humidity}% humidity` : undefined,
    },
    recentPermits !== undefined && {
      icon: FileText,
      label: 'Permits',
      value: `${recentPermits} nearby`,
    },
    marketTrend && {
      icon: TrendingUp,
      label: 'Market',
      value: marketTrend === 'up' ? 'Trending up' : marketTrend === 'down' ? 'Trending down' : 'Stable',
    },
  ].filter(Boolean) as Array<{
    icon: React.ElementType;
    label: string;
    value: string;
    detail?: string;
  }>;

  // If no signals, show minimal state
  if (signals.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Cloud className="h-3.5 w-3.5" />
          <span>Monitoring local conditions</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {signals.map((signal, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <signal.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{signal.label}:</span>
            <span className="font-medium">{signal.value}</span>
            {signal.detail && (
              <span className="text-muted-foreground">• {signal.detail}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
