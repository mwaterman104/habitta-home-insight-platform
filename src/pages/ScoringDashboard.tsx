import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ValidationCockpitDB, ScoredPrediction, AccuracyByField, ErrorTag } from "@/lib/validation-cockpit";
import { ConfidenceCalibration } from "@/components/validation/ConfidenceCalibration";
import { ErrorTaggingSystem } from "@/components/validation/ErrorTaggingSystem";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function ScoringDashboard() {
  const navigate = useNavigate();
  const [accuracyData, setAccuracyData] = useState<AccuracyByField[]>([]);
  const [scoredPredictions, setScoredPredictions] = useState<ScoredPrediction[]>([]);
  const [errorTags, setErrorTags] = useState<Record<string, ErrorTag[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'calibration' | 'errors'>('overview');

  useEffect(() => {
    loadScoringData();
  }, []);

  const loadScoringData = async () => {
    try {
      const [accuracy, scored] = await Promise.all([
        ValidationCockpitDB.getAccuracyByField(),
        ValidationCockpitDB.getScoredPredictions(),
      ]);
      
      setAccuracyData(accuracy);
      setScoredPredictions(scored);
      
      // Load error tags for mismatched predictions
      const mismatches = scored.filter(p => p.match === false);
      const errorTagsData: Record<string, ErrorTag[]> = {};
      
      for (const mismatch of mismatches.slice(0, 20)) { // Limit to first 20 for performance
        try {
          const tags = await ValidationCockpitDB.getErrorTags(mismatch.address_id, mismatch.field);
          const key = `${mismatch.address_id}-${mismatch.field}`;
          errorTagsData[key] = tags;
        } catch (error) {
          console.error('Error loading tags for', mismatch.address_id, mismatch.field, error);
        }
      }
      
      setErrorTags(errorTagsData);
    } catch (error) {
      console.error('Error loading scoring data:', error);
      toast.error('Failed to load scoring data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const totalPredictions = scoredPredictions.length;
  const matchedPredictions = scoredPredictions.filter(p => p.match === true).length;
  const mismatchedPredictions = scoredPredictions.filter(p => p.match === false).length;
  const pendingPredictions = scoredPredictions.filter(p => p.match === null).length;
  
  const overallAccuracy = totalPredictions > 0 ? (matchedPredictions / (matchedPredictions + mismatchedPredictions)) * 100 : 0;

  // Prepare chart data
  const chartData = accuracyData.map(item => ({
    field: item.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    accuracy: Number(item.accuracy) * 100
  }));

  const scatterData = scoredPredictions
    .filter(p => p.match !== null)
    .map(p => ({
      confidence: p.confidence_0_1 * 100,
      match: p.match ? 100 : 0,
      field: p.field
    }));

  const mismatches = scoredPredictions.filter(p => p.match === false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading scoring data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/validation")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cockpit
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Scoring Dashboard</h1>
            <p className="text-muted-foreground">
              Prediction accuracy analysis and model performance metrics
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Overall Accuracy
              {overallAccuracy >= 80 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : overallAccuracy >= 60 ? (
                <Minus className="h-4 w-4 text-yellow-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallAccuracy.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">
              {matchedPredictions}/{matchedPredictions + mismatchedPredictions} correct
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPredictions}</div>
            <div className="text-sm text-muted-foreground">Across all fields</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Matched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{matchedPredictions}</div>
            <div className="text-sm text-muted-foreground">Correct predictions</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mismatched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{mismatchedPredictions}</div>
            <div className="text-sm text-muted-foreground">Incorrect predictions</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calibration">Confidence Analysis</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy by Field Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Accuracy by Field</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="field" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Accuracy']} />
                  <Bar dataKey="accuracy" fill="hsl(var(--primary))">
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.accuracy >= 80 ? '#22c55e' : entry.accuracy >= 60 ? '#eab308' : '#ef4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No accuracy data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confidence vs Accuracy Scatter Plot */}
        <Card>
          <CardHeader>
            <CardTitle>Confidence vs Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={scatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="confidence" 
                    domain={[0, 100]}
                    name="Confidence"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="match" 
                    domain={[0, 100]}
                    name="Correct"
                    tickFormatter={() => ''}
                  />
                  <Tooltip 
                    formatter={(value, name) => name === 'match' ? [value === 100 ? 'Correct' : 'Incorrect', 'Result'] : [`${value}%`, 'Confidence']}
                  />
                  <Scatter 
                    dataKey="match" 
                    fill="hsl(var(--primary))"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No predictions to analyze yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mismatches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction Mismatches</CardTitle>
        </CardHeader>
        <CardContent>
          {mismatches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-2 font-medium">Address ID</th>
                    <th className="text-left p-2 font-medium">Field</th>
                    <th className="text-left p-2 font-medium">Predicted</th>
                    <th className="text-left p-2 font-medium">Actual</th>
                    <th className="text-left p-2 font-medium">Confidence</th>
                    <th className="text-left p-2 font-medium">Error Type</th>
                    <th className="text-left p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                {mismatches.map((mismatch, index) => {
                    const key = `${mismatch.address_id}-${mismatch.field}`;
                    const tags = errorTags[key] || [];
                    
                    return (
                      <tr key={`${mismatch.address_id}-${mismatch.field}-${index}`} className="border-b">
                        <td className="p-2 font-mono text-sm">
                          {mismatch.address_id.slice(0, 8)}...
                        </td>
                        <td className="p-2 font-medium">{mismatch.field}</td>
                        <td className="p-2">
                          <Badge variant="outline">{mismatch.predicted_value}</Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant="default">{mismatch.actual_value}</Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant="secondary">
                            {(mismatch.confidence_0_1 * 100).toFixed(0)}%
                          </Badge>
                        </td>
                        <td className="p-2">
                          {tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {tags.slice(0, 2).map(tag => (
                                <Badge key={tag.id} variant={tag.resolved ? "default" : "destructive"} className="text-xs">
                                  {tag.error_type.replace('_', ' ')}
                                </Badge>
                              ))}
                              {tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">+{tags.length - 2}</Badge>
                              )}
                            </div>
                          ) : (
                            <ErrorTaggingSystem 
                              addressId={mismatch.address_id} 
                              field={mismatch.field}
                              onTagsUpdated={loadScoringData}
                            />
                          )}
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/validation/property/${mismatch.address_id}`)}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No mismatches found. All predictions are accurate! 🎉
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="calibration">
          <ConfidenceCalibration />
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis Dashboard</CardTitle>
              <p className="text-sm text-muted-foreground">
                Analyze and categorize prediction errors to improve model performance
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Error Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{mismatchedPredictions}</div>
                    <div className="text-sm text-red-600">Total Errors</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {Object.values(errorTags).flat().filter(tag => !tag.resolved).length}
                    </div>
                    <div className="text-sm text-orange-600">Unresolved</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(errorTags).flat().filter(tag => tag.resolved).length}
                    </div>
                    <div className="text-sm text-green-600">Resolved</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round((Object.values(errorTags).flat().filter(tag => tag.resolved).length / 
                        Math.max(Object.values(errorTags).flat().length, 1)) * 100)}%
                    </div>
                    <div className="text-sm text-blue-600">Resolution Rate</div>
                  </div>
                </div>

                {/* Error Type Breakdown */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Common Error Types</h3>
                  <div className="space-y-2">
                    {Object.entries(
                      Object.values(errorTags).flat().reduce((acc, tag) => {
                        acc[tag.error_type] = (acc[tag.error_type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([errorType, count]) => (
                      <div key={errorType} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="capitalize">{errorType.replace('_', ' ')}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}