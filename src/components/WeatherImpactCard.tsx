import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Cloud, CloudRain, Wind, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWeatherInsights } from '@/hooks/useWeatherInsights';

interface WeatherImpactCardProps {
  latitude?: number;
  longitude?: number;
}

export const WeatherImpactCard: React.FC<WeatherImpactCardProps> = ({
  latitude,
  longitude
}) => {
  const { insights, loading, error } = useWeatherInsights(latitude, longitude);
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Loading Weather Impact...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !insights) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Weather monitoring unavailable. Regular maintenance schedule recommended.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityIcon = () => {
    switch (insights.severity) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'medium':
        return <CloudRain className="h-5 w-5 text-warning" />;
      default:
        return <CheckCircle className="h-5 w-5 text-success" />;
    }
  };

  const getSeverityColor = () => {
    switch (insights.severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleCheckItem = (item: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getSeverityIcon()}
            {insights.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getSeverityColor()}>
              {insights.severity.toUpperCase()}
            </Badge>
            <div className="text-sm font-medium">
              Score: {insights.stormScore}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {insights.description}
        </p>

        {insights.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recommendations:</h4>
            <ul className="text-sm space-y-1">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Wind className="h-3 w-3 mt-1 text-muted-foreground flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.checkList.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Inspection Checklist:</h4>
            <div className="space-y-2">
              {insights.checkList.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`check-${index}`}
                    checked={checkedItems[item] || false}
                    onCheckedChange={() => handleCheckItem(item)}
                  />
                  <label
                    htmlFor={`check-${index}`}
                    className={`text-sm ${
                      checkedItems[item] 
                        ? 'line-through text-muted-foreground' 
                        : ''
                    }`}
                  >
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.severity !== 'low' && (
          <div className="pt-2">
            <Button variant="outline" size="sm" className="w-full">
              Schedule Professional Inspection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};