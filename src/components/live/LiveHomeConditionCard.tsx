import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHomeLive } from '@/hooks/useHabittaLive';

interface LiveHomeConditionCardProps {
  homeId?: string;
}

export default function LiveHomeConditionCard({ homeId }: LiveHomeConditionCardProps) {
  const { propertySummary, loading } = useHomeLive(homeId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!propertySummary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">No data available</div>
        </CardContent>
      </Card>
    );
  }

  const getConditionColor = (score: number) => {
    if (score >= 90) return "text-green-700";
    if (score >= 75) return "text-yellow-700";
    return "text-red-700";
  };

  const getConditionBgColor = (score: number) => {
    if (score >= 90) return "bg-green-50";
    if (score >= 75) return "bg-yellow-50";
    return "bg-red-50";
  };

  const getConditionLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Fair";
    return "Needs Attention";
  };

  const conditionScore = propertySummary.metrics.condition_score;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Home Condition</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`p-3 rounded-lg text-center ${getConditionBgColor(conditionScore)}`}>
          <div className={`text-2xl font-bold ${getConditionColor(conditionScore)}`}>
            {conditionScore}
          </div>
          <div className={`text-sm font-medium ${getConditionColor(conditionScore)}`}>
            {getConditionLabel(conditionScore)}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Safety</span>
            <Badge 
              variant="outline" 
              className={`text-xs ${getConditionColor(propertySummary.metrics.safety_compliance)}`}
            >
              {propertySummary.metrics.safety_compliance}%
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Energy</span>
            <Badge 
              variant="outline" 
              className={`text-xs ${getConditionColor(propertySummary.metrics.energy_efficiency)}`}
            >
              {propertySummary.metrics.energy_efficiency}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}