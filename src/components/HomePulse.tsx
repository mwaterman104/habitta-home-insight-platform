import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWeatherInsights } from "@/hooks/useWeatherInsights";
import { 
  CloudRain, 
  Sun, 
  Cloud, 
  Snowflake,
  MapPin,
  Clock
} from "lucide-react";

interface HomePulseProps {
  latitude?: number;
  longitude?: number;
  homeAddress?: string;
}

interface GreetingData {
  message: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

export const HomePulse: React.FC<HomePulseProps> = ({ 
  latitude, 
  longitude, 
  homeAddress = "Your Home"
}) => {
  const [greeting, setGreeting] = useState<GreetingData | null>(null);
  const { insights: weatherInsights, loading: weatherLoading } = useWeatherInsights(latitude, longitude);

  useEffect(() => {
    const generateGreeting = () => {
      const now = new Date();
      const hour = now.getHours();
      const month = now.getMonth();
      
      // Determine time of day
      let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'morning';
      if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17) timeOfDay = 'evening';
      
      // Determine season
      let season: 'spring' | 'summer' | 'fall' | 'winter' = 'winter';
      if (month >= 2 && month <= 4) season = 'spring';
      else if (month >= 5 && month <= 7) season = 'summer';
      else if (month >= 8 && month <= 10) season = 'fall';
      
      // Generate personalized message
      const timeGreeting = timeOfDay === 'morning' ? 'Good morning' : 
                          timeOfDay === 'afternoon' ? 'Good afternoon' : 'Good evening';
      
      let weatherContext = '';
      if (weatherInsights) {
        if (weatherInsights.severity === 'high') {
          weatherContext = ` ${weatherInsights.title.toLowerCase()} expected - let's prepare.`;
        } else if (weatherInsights.severity === 'medium') {
          weatherContext = ` Weather looks dynamic today.`;
        }
      }
      
      const message = `${timeGreeting}! ${weatherContext}`;
      
      setGreeting({ message, season, timeOfDay });
    };

    generateGreeting();
    const interval = setInterval(generateGreeting, 300000); // Update every 5 minutes
    
    return () => clearInterval(interval);
  }, [weatherInsights]);

  const getSeasonalGradient = (season: string) => {
    switch (season) {
      case 'spring': return 'from-green-100 to-emerald-50';
      case 'summer': return 'from-yellow-100 to-orange-50';
      case 'fall': return 'from-orange-100 to-red-50';  
      case 'winter': return 'from-blue-100 to-indigo-50';
      default: return 'from-muted to-background';
    }
  };

  const getWeatherIcon = () => {
    if (weatherLoading || !weatherInsights) return <Cloud className="h-5 w-5" />;
    
    if (weatherInsights.title.toLowerCase().includes('storm') || 
        weatherInsights.title.toLowerCase().includes('rain')) {
      return <CloudRain className="h-5 w-5 text-blue-600" />;
    }
    if (weatherInsights.title.toLowerCase().includes('snow')) {
      return <Snowflake className="h-5 w-5 text-blue-500" />;
    }
    return <Sun className="h-5 w-5 text-yellow-500" />;
  };

  if (!greeting) return null;

  return (
    <Card className={`bg-gradient-to-r ${getSeasonalGradient(greeting.season)} border-0 shadow-sm`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getWeatherIcon()}
              <Badge variant="secondary" className="text-xs">
                {greeting.season.charAt(0).toUpperCase() + greeting.season.slice(1)} • {greeting.timeOfDay}
              </Badge>
            </div>
            
            <h2 className="text-lg font-semibold text-foreground">
              {greeting.message}
            </h2>
            
            {weatherInsights && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {weatherInsights.description}
                </p>
                
                {weatherInsights.severity !== 'low' && weatherInsights.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Recommended Actions:</h4>
                    <div className="grid grid-cols-1 gap-1">
                      {weatherInsights.recommendations.slice(0, 3).map((rec, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-warning rounded-full flex-shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{weatherInsights?.locationName || homeAddress}</span>
              <Clock className="h-3 w-3 ml-2" />
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          
          {weatherInsights && weatherInsights.stormScore > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-warning">
                {weatherInsights.stormScore}
              </div>
              <div className="text-xs text-muted-foreground">
                Storm Score
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};