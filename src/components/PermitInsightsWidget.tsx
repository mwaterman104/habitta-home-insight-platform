import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Clock, Calendar, Sparkles } from 'lucide-react';
import { usePermitInsights } from '@/hooks/usePermitInsights';

interface PermitInsightsWidgetProps {
  homeId: string;
}

export const PermitInsightsWidget: React.FC<PermitInsightsWidgetProps> = ({ homeId }) => {
  const { seasonalRecommendations, loading, error } = usePermitInsights(homeId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Personalized Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || seasonalRecommendations.length === 0) {
    return null; // Don't show widget if no insights
  }

  const priorityRec = seasonalRecommendations[0];
  const urgencyColor = priorityRec.urgency === 'high' ? 'text-red-600' : 
                     priorityRec.urgency === 'medium' ? 'text-yellow-600' : 'text-green-600';

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Priority Action for Your {priorityRec.system.replace('_', ' ').toUpperCase()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={`mt-1 ${urgencyColor}`}>
            {priorityRec.urgency === 'high' ? <AlertTriangle className="h-4 w-4" /> : 
             priorityRec.urgency === 'medium' ? <Clock className="h-4 w-4" /> : 
             <CheckCircle2 className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">
              {priorityRec.tip}
            </p>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {priorityRec.installationYear} Installation
              </Badge>
              <Badge className={`text-xs ${
                priorityRec.urgency === 'high' ? 'bg-red-100 text-red-800' :
                priorityRec.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {priorityRec.urgency.toUpperCase()} PRIORITY
              </Badge>
            </div>
            {priorityRec.actionRequired && (
              <Button size="sm" variant="outline" className="text-xs h-7">
                <Calendar className="h-3 w-3 mr-1" />
                Schedule Now
              </Button>
            )}
          </div>
        </div>
        
        {seasonalRecommendations.length > 1 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            +{seasonalRecommendations.length - 1} more personalized recommendations available
          </div>
        )}
      </CardContent>
    </Card>
  );
};