import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Sun, Cloud, CloudRain, Snowflake } from "lucide-react";
import { useWeatherInsights } from "@/hooks/useWeatherInsights";

interface HomePulseGreetingProps {
  address?: string;
  onAddressClick?: () => void;
  latitude?: number;
  longitude?: number;
}

/**
 * HomePulseGreeting - Calm, time-aware greeting with address link
 * 
 * Entry point to Home Profile via address click.
 * Shows weather only when relevant to home health.
 */
export function HomePulseGreeting({ 
  address, 
  onAddressClick,
  latitude,
  longitude 
}: HomePulseGreetingProps) {
  const { insights: weather } = useWeatherInsights({ latitude, longitude, address });

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Weather icon based on severity
  const getWeatherIcon = () => {
    if (!weather) return <Sun className="h-4 w-4 text-amber-500" />;
    
    switch (weather.severity) {
      case 'high':
        return <CloudRain className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Cloud className="h-4 w-4 text-amber-500" />;
      default:
        return <Sun className="h-4 w-4 text-green-500" />;
    }
  };

  // Only show weather context when there's notable activity
  const showWeatherContext = weather && weather.severity !== 'low';

  return (
    <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-gray-900">
              {getGreeting()}
            </h1>
            {address && (
              <Button 
                variant="ghost" 
                className="p-0 h-auto text-left hover:bg-transparent"
                onClick={onAddressClick}
              >
                <div className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-sm">{address}</span>
                </div>
              </Button>
            )}
          </div>
          
          {/* Weather indicator - only when relevant */}
          {showWeatherContext && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {getWeatherIcon()}
              <span className="capitalize">{weather.severity} risk</span>
            </div>
          )}
        </div>

        {/* Weather advisory - only for high severity */}
        {weather?.severity === 'high' && weather.title && (
          <p className="text-xs text-amber-600 mt-2">
            {weather.title}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
