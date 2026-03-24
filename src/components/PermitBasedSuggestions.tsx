import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Wrench,
  Shield,
  TrendingUp,
  Droplets,
  Wind,
  Zap
} from 'lucide-react';
import { usePermitInsights } from '@/hooks/usePermitInsights';
import { PermitInsight } from '@/lib/permitAnalyzer';

interface PermitBasedSuggestionsProps {
  homeId: string;
}

const SYSTEM_ICONS = {
  pool: Droplets,
  hurricane_shutters: Shield,
  hvac: Wind,
  electrical: Zap,
  roofing: Shield,
  plumbing: Droplets,
  driveway: TrendingUp,
  solar: Zap
};

const getUrgencyColor = (urgency: 'low' | 'medium' | 'high') => {
  switch (urgency) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const SystemCard: React.FC<{ insight: PermitInsight }> = ({ insight }) => {
  const IconComponent = SYSTEM_ICONS[insight.systemType as keyof typeof SYSTEM_ICONS] || Wrench;
  const installYear = new Date(insight.installationDate).getFullYear();
  const systemAge = new Date().getFullYear() - installYear;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg capitalize">
              {insight.systemType.replace('_', ' ')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Installed {installYear} • {systemAge} year{systemAge !== 1 ? 's' : ''} old
            </p>
          </div>
          {insight.valuation && (
            <Badge variant="secondary" className="text-xs">
              ${insight.valuation.toLocaleString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Season Tips */}
        {insight.seasonalTips.length > 0 && (
          <div>
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Seasonal Tips
            </h5>
            <div className="space-y-2">
              {insight.seasonalTips.slice(0, 2).map((tip, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Badge className={`text-xs ${getUrgencyColor(tip.urgency)}`}>
                    {tip.season}
                  </Badge>
                  <span className="text-muted-foreground flex-1">{tip.tip}</span>
                  {tip.actionRequired && (
                    <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Maintenance */}
        {insight.maintenanceSchedule.length > 0 && (
          <div>
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Upcoming Maintenance
            </h5>
            <div className="space-y-2">
              {insight.maintenanceSchedule.slice(0, 2).map((task, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getUrgencyColor(task.urgency)}`}>
                      {task.frequency}
                    </Badge>
                    <span className="text-muted-foreground">{task.task}</span>
                    {task.diyFriendly && (
                      <Badge variant="outline" className="text-xs">DIY</Badge>
                    )}
                  </div>
                  {task.estimatedCost && (
                    <span className="text-xs font-medium">${task.estimatedCost}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Insights */}
        {insight.financialInsights.length > 0 && (
          <div>
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <DollarSign className="h-3 w-3" />
              Financial Opportunities
            </h5>
            <div className="space-y-2">
              {insight.financialInsights.slice(0, 1).map((financial, index) => (
                <div key={index} className="p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{financial.title}</span>
                    {financial.potentialValue && (
                      <Badge variant="secondary" className="text-xs">
                        ${financial.potentialValue.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{financial.description}</p>
                  {financial.actionRequired && (
                    <Button size="sm" variant="outline" className="mt-2 h-6 text-xs">
                      Take Action
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const PermitBasedSuggestions: React.FC<PermitBasedSuggestionsProps> = ({ homeId }) => {
  const { insights, seasonalRecommendations, loading, error } = usePermitInsights(homeId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Personalized Property Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Personalized Property Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Permit Data Available</h3>
            <p className="text-muted-foreground">
              Sync your permit history to get personalized maintenance and care suggestions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seasonal Recommendations Alert */}
      {seasonalRecommendations.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              This Season's Priority Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {seasonalRecommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge className={`${getUrgencyColor(rec.urgency)} text-xs`}>
                    {rec.urgency.toUpperCase()}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">{rec.system.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{rec.tip}</p>
                  </div>
                  {rec.actionRequired && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System-Specific Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            System-Specific Care Plans
            <Badge variant="secondary" className="ml-auto">
              {insights.length} System{insights.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {insights.map((insight) => (
              <SystemCard key={insight.id} insight={insight} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};