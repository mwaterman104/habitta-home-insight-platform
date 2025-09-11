import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Calendar, Wrench } from 'lucide-react';
import { usePredictiveCosts } from '@/hooks/usePredictiveCosts';

interface PredictiveCostDashboardProps {
  propertyId?: string;
}

export const PredictiveCostDashboard: React.FC<PredictiveCostDashboardProps> = ({ propertyId }) => {
  const { data, loading, error } = usePredictiveCosts(propertyId);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load cost predictions</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2" />
            <p>No cost prediction data available</p>
            <p className="text-sm">Add your home systems to see predictive insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const getUrgencyColor = (urgency: number) => {
    if (urgency >= 8) return 'destructive';
    if (urgency >= 6) return 'secondary';
    return 'default';
  };

  const getTimelineColor = (timeline: string) => {
    if (timeline.includes('1 year')) return 'text-destructive';
    if (timeline.includes('2 year')) return 'text-secondary-foreground';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Cost Forecast Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">1-Year Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(data.totalUpcomingCosts['1_year'])}
            </div>
            <p className="text-xs text-muted-foreground">
              High probability expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">2-Year Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-foreground">
              {formatCurrency(data.totalUpcomingCosts['2_year'])}
            </div>
            <p className="text-xs text-muted-foreground">
              Moderate probability expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">5-Year Forecast</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalUpcomingCosts['5_year'])}
            </div>
            <p className="text-xs text-muted-foreground">
              Long-term planning budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High Priority Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Priority Maintenance & Replacements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.highPriorityItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-8 w-8 mx-auto mb-2" />
              <p>No high-priority items detected</p>
              <p className="text-sm">Your home systems are in good condition</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.highPriorityItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium capitalize">{item.system}</h4>
                      <Badge variant={getUrgencyColor(item.urgency)} className="text-xs">
                        Urgency: {item.urgency}/10
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">{item.action}</p>
                    <p className={`text-xs ${getTimelineColor(item.timeline)}`}>
                      {item.timeline}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatCurrency(item.cost)}
                    </div>
                    <Button variant="outline" size="sm" className="mt-2">
                      Plan Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>System Replacement Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.systems.map((system) => {
              const replacementProb = system.replacement_probability;
              const fiveYearProb = replacementProb?.['5_year'] || 0;
              
              return (
                <div key={system.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium capitalize">{system.system_type.replace('_', ' ')}</h4>
                      {system.brand && (
                        <p className="text-sm text-muted-foreground">{system.brand} {system.model}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{Math.round(fiveYearProb * 100)}%</div>
                      <div className="text-xs text-muted-foreground">5-year replacement risk</div>
                    </div>
                  </div>
                  <Progress value={fiveYearProb * 100} className="h-2" />
                  {system.predicted_replacement_date && (
                    <p className="text-xs text-muted-foreground">
                      Predicted replacement: {new Date(system.predicted_replacement_date).getFullYear()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};