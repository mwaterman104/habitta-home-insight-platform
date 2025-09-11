import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Calendar, DollarSign, Settings, TrendingUp, Plus } from "lucide-react";
import { useAILifecyclePredictions } from "@/hooks/useAILifecyclePredictions";
import { HomeSystemsSetup } from "./HomeSystemsSetup";
import { useState } from "react";

interface AILifecycleDashboardProps {
  homeId?: string;
}

export function AILifecycleDashboard({ homeId }: AILifecycleDashboardProps) {
  const { data, loading, error } = useAILifecyclePredictions(homeId);
  const [showSystemsSetup, setShowSystemsSetup] = useState(false);

  if (loading) {
    return <div>Loading AI predictions...</div>;
  }

  if (error) {
    return <div>Error loading predictions: {error}</div>;
  }

  if (!data || data.predictions.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Systems Data</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your home's systems to get AI-powered lifecycle predictions.
            </p>
            <Button onClick={() => setShowSystemsSetup(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Home Systems
            </Button>
          </CardContent>
        </Card>
        
        {showSystemsSetup && homeId && (
          <HomeSystemsSetup homeId={homeId} />
        )}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUrgencyColor = (yearsRemaining: number) => {
    if (yearsRemaining <= 1) return "destructive";
    if (yearsRemaining <= 3) return "secondary"; 
    return "default";
  };

  return (
    <div className="space-y-6">
      {/* Cost Forecast Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next 12 Months</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalCosts.oneYear)}</div>
            <p className="text-xs text-muted-foreground">
              Predicted replacement costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next 2 Years</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalCosts.twoYear)}</div>
            <p className="text-xs text-muted-foreground">
              Total forecast horizon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">5-Year Outlook</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalCosts.fiveYear)}</div>
            <p className="text-xs text-muted-foreground">
              Long-term planning budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>System Lifecycle Predictions</CardTitle>
          <CardDescription>
            AI-powered predictions for your home systems based on age, maintenance history, and local conditions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.predictions.map((prediction) => (
              <div key={prediction.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{prediction.systemName}</h3>
                    <Badge variant={getUrgencyColor(prediction.predictedYearsRemaining)}>
                      {prediction.predictedYearsRemaining.toFixed(1)} years left
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Predicted cost: {formatCurrency(prediction.predictedCost)}
                  </p>
                  {prediction.recommendations.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Next: {prediction.recommendations[0]}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {Math.round(prediction.confidence * 100)}% confident
                    </div>
                    <Progress 
                      value={prediction.confidence * 100} 
                      className="w-20 h-2" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* High Risk Systems */}
      {data.highRiskSystems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              High Priority Systems
            </CardTitle>
            <CardDescription>
              Systems that need attention in the next 2 years.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.highRiskSystems.map((system) => (
                <Badge key={system} variant="destructive">
                  {system}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Systems Setup */}
      {homeId && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Home Systems</CardTitle>
            <CardDescription>
              Add or update your home systems to improve prediction accuracy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HomeSystemsSetup homeId={homeId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}