import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAILifecyclePredictions } from '@/hooks/useAILifecyclePredictions';
import { Brain, TrendingUp, AlertTriangle, Calendar, DollarSign, Settings, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AILifecycleDashboardProps {
  propertyId?: string;
}

export const AILifecycleDashboard: React.FC<AILifecycleDashboardProps> = ({ propertyId }) => {
  const { data, loading, error, refetch, submitFeedback } = useAILifecyclePredictions(propertyId);
  const { toast } = useToast();
  const [feedbackSystemType, setFeedbackSystemType] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Unable to Load AI Predictions</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={refetch}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.predictions.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">AI Learning Your Home</h3>
              <p className="text-muted-foreground">
                Add your home systems to get AI-powered lifecycle predictions and maintenance recommendations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getUrgencyColor = (yearsRemaining: number) => {
    if (yearsRemaining <= 1) return 'destructive';
    if (yearsRemaining <= 3) return 'secondary';
    return 'outline';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'outline';
    if (confidence >= 0.6) return 'secondary';
    return 'destructive';
  };

  const handleFeedback = async (systemType: string, isPositive: boolean) => {
    try {
      await submitFeedback(systemType, isPositive ? 5 : 2, 
        isPositive ? 'Prediction seems accurate' : 'Prediction seems off'
      );
      toast({
        title: "Feedback Submitted",
        description: "Thank you! This helps improve our AI predictions.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Unable to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Lifecycle Predictions
          </h2>
          <p className="text-muted-foreground">
            Machine learning powered maintenance forecasting for your home systems
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Refresh Predictions
        </Button>
      </div>

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Next 12 Months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(data.totalPredictedCosts.oneYear)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.predictions.filter(p => p.predictedYearsRemaining <= 1).length} systems
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Next 2 Years
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(data.totalPredictedCosts.twoYear)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.predictions.filter(p => p.predictedYearsRemaining <= 2).length} systems
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              5-Year Outlook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalPredictedCosts.fiveYear)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.predictions.filter(p => p.predictedYearsRemaining <= 5).length} systems
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="predictions">All Predictions</TabsTrigger>
          <TabsTrigger value="high-risk">
            High Risk ({data.highRiskSystems.length})
          </TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid gap-4">
            {data.predictions.map((prediction, index) => (
              <Card key={`${prediction.systemType}-${index}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize">
                        {prediction.systemType.replace('_', ' ')} System
                      </CardTitle>
                      <CardDescription>
                        AI Prediction • Model v{prediction.modelVersion}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getUrgencyColor(prediction.predictedYearsRemaining)}>
                        {prediction.predictedYearsRemaining} years remaining
                      </Badge>
                      <Badge variant={getConfidenceColor(prediction.confidenceScore)}>
                        {Math.round(prediction.confidenceScore * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Predicted Replacement</div>
                      <div className="text-lg font-semibold">
                        {new Date(prediction.predictedReplacementDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Estimated cost: {formatCurrency(prediction.predictedCost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">AI Analysis Factors</div>
                      <div className="space-y-1 text-sm">
                        <div>Weather Impact: {Math.round(prediction.features.weatherImpact * 100)}%</div>
                        <div>Maintenance Bonus: {Math.round(prediction.features.maintenanceBonus * 100)}%</div>
                        <div>Quality Factor: {Math.round(prediction.features.qualityFactor * 100)}%</div>
                      </div>
                    </div>
                  </div>

                  {prediction.riskFactors.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Risk Factors
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {prediction.riskFactors.map((risk, idx) => (
                          <li key={idx}>• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {prediction.recommendations.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">AI Recommendations</div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {prediction.recommendations.map((rec, idx) => (
                          <li key={idx}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      Was this prediction helpful?
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFeedback(prediction.systemType, true)}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Yes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFeedback(prediction.systemType, false)}
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        No
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="high-risk" className="space-y-4">
          {data.highRiskSystems.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-lg font-semibold text-success">All Systems Looking Good!</div>
                  <p className="text-muted-foreground">No high-risk systems identified by AI analysis.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {data.highRiskSystems.map((system, index) => (
                <Card key={`high-risk-${index}`} className="border-warning">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="capitalize flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        {system.systemType.replace('_', ' ')} System
                      </CardTitle>
                      <Badge variant="secondary">High Priority</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Predicted replacement in {system.predictedYearsRemaining} years</span>
                        <span className="font-semibold">{formatCurrency(system.predictedCost)}</span>
                      </div>
                      <Progress 
                        value={Math.max(5, 100 - (system.predictedYearsRemaining * 10))} 
                        className="h-2" 
                      />
                      <div className="text-sm text-muted-foreground">
                        AI Confidence: {Math.round(system.confidenceScore * 100)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Model Performance</CardTitle>
              <CardDescription>
                Insights about prediction accuracy and system learning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-2">Average Confidence Score</div>
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(data.predictions.reduce((sum, p) => sum + p.confidenceScore, 0) / data.predictions.length * 100)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Systems Analyzed</div>
                  <div className="text-2xl font-bold">
                    {data.predictions.length}
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(data.lastUpdated).toLocaleString()}
              </div>
              
            <div className="pt-4 border-t">
                <div className="text-sm font-medium mb-2">How AI Predictions Work</div>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Our AI analyzes multiple factors including system age, maintenance history, local weather patterns, and material quality to predict when replacements will be needed.</p>
                  <p>Predictions improve over time as the system learns from more data and user feedback.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};