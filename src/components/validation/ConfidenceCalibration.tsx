import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

interface ConfidenceCalibrationData {
  confidence_bucket: string;
  field: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  avg_confidence: number;
}

export function ConfidenceCalibration() {
  const [calibrationData, setCalibrationData] = useState<ConfidenceCalibrationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalibrationData();
  }, []);

  const loadCalibrationData = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_confidence_calibration');
      
      if (error) throw error;
      
      setCalibrationData(data || []);
    } catch (error) {
      console.error('Error loading confidence calibration:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group data by confidence bucket for overall analysis
  const overallCalibration = calibrationData.reduce((acc, item) => {
    const existing = acc.find(a => a.confidence_bucket === item.confidence_bucket);
    if (existing) {
      existing.total_predictions += Number(item.total_predictions);
      existing.correct_predictions += Number(item.correct_predictions);
      existing.accuracy = existing.correct_predictions / existing.total_predictions;
      existing.avg_confidence = (existing.avg_confidence + Number(item.avg_confidence)) / 2;
    } else {
      acc.push({
        confidence_bucket: item.confidence_bucket,
        total_predictions: Number(item.total_predictions),
        correct_predictions: Number(item.correct_predictions),
        accuracy: Number(item.accuracy),
        avg_confidence: Number(item.avg_confidence),
      });
    }
    return acc;
  }, [] as Array<{
    confidence_bucket: string;
    total_predictions: number;
    correct_predictions: number;
    accuracy: number;
    avg_confidence: number;
  }>);

  // Sort by confidence bucket
  const bucketOrder = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];
  overallCalibration.sort((a, b) => 
    bucketOrder.indexOf(a.confidence_bucket) - bucketOrder.indexOf(b.confidence_bucket)
  );

  // Prepare data for calibration curve (perfect calibration line)
  const calibrationCurve = overallCalibration.map(item => ({
    confidence_bucket: item.confidence_bucket,
    actual_accuracy: item.accuracy * 100,
    predicted_confidence: item.avg_confidence * 100,
    perfect_calibration: item.avg_confidence * 100, // Perfect calibration = confidence equals accuracy
    sample_size: item.total_predictions,
  }));

  // Calculate overall calibration quality
  const totalSamples = overallCalibration.reduce((sum, item) => sum + item.total_predictions, 0);
  const weightedCalibrationError = overallCalibration.reduce((sum, item) => {
    const error = Math.abs(item.accuracy - item.avg_confidence);
    const weight = item.total_predictions / totalSamples;
    return sum + (error * weight);
  }, 0);

  const calibrationQuality = weightedCalibrationError < 0.1 ? 'Excellent' : 
                           weightedCalibrationError < 0.2 ? 'Good' : 
                           weightedCalibrationError < 0.3 ? 'Fair' : 'Poor';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (calibrationData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No confidence calibration data available yet. More predictions needed for analysis.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calibration Quality Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Calibration Quality
              <Target className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={
                calibrationQuality === 'Excellent' ? 'default' :
                calibrationQuality === 'Good' ? 'secondary' :
                calibrationQuality === 'Fair' ? 'outline' : 'destructive'
              }>
                {calibrationQuality}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({(weightedCalibrationError * 100).toFixed(1)}% error)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Samples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSamples}</div>
            <div className="text-sm text-muted-foreground">Predictions analyzed</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallCalibration.length}/5</div>
            <div className="text-sm text-muted-foreground">Confidence buckets</div>
          </CardContent>
        </Card>
      </div>

      {/* Calibration Curve */}
      <Card>
        <CardHeader>
          <CardTitle>Confidence Calibration Curve</CardTitle>
          <p className="text-sm text-muted-foreground">
            Perfect calibration: predicted confidence should match actual accuracy
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={calibrationCurve}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="confidence_bucket" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name) => [
                  `${Number(value).toFixed(1)}%`, 
                  name === 'actual_accuracy' ? 'Actual Accuracy' : 
                  name === 'predicted_confidence' ? 'Predicted Confidence' : 'Perfect Calibration'
                ]}
                labelFormatter={(label) => `Bucket: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="predicted_confidence" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Predicted Confidence"
              />
              <Line 
                type="monotone" 
                dataKey="actual_accuracy" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                name="Actual Accuracy"
              />
              <Line 
                type="monotone" 
                dataKey="perfect_calibration" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Perfect Calibration"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Calibration by Confidence Bucket</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2 font-medium">Confidence Bucket</th>
                  <th className="text-left p-2 font-medium">Sample Size</th>
                  <th className="text-left p-2 font-medium">Predicted</th>
                  <th className="text-left p-2 font-medium">Actual</th>
                  <th className="text-left p-2 font-medium">Calibration</th>
                </tr>
              </thead>
              <tbody>
                {overallCalibration.map((bucket) => {
                  const calibrationError = Math.abs(bucket.accuracy - bucket.avg_confidence);
                  const isWellCalibrated = calibrationError < 0.1;
                  const isOverconfident = bucket.avg_confidence > bucket.accuracy;
                  
                  return (
                    <tr key={bucket.confidence_bucket} className="border-b">
                      <td className="p-2 font-medium">{bucket.confidence_bucket}</td>
                      <td className="p-2">{bucket.total_predictions}</td>
                      <td className="p-2">{(bucket.avg_confidence * 100).toFixed(1)}%</td>
                      <td className="p-2">{(bucket.accuracy * 100).toFixed(1)}%</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {isWellCalibrated ? (
                            <Badge variant="default" className="gap-1">
                              <Target className="h-3 w-3" />
                              Well Calibrated
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              {isOverconfident ? (
                                <TrendingUp className="h-3 w-3 text-red-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-blue-500" />
                              )}
                              {isOverconfident ? 'Overconfident' : 'Underconfident'}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            ({(calibrationError * 100).toFixed(1)}% error)
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}