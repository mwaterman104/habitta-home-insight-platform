import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Prediction } from "@/lib/validation-cockpit";

interface DataQualityInsightsProps {
  predictions: Prediction[];
  propertyAddress: string;
}

export function DataQualityInsights({ predictions, propertyAddress }: DataQualityInsightsProps) {
  // Analyze data quality patterns
  const lowConfidencePredictions = predictions.filter(p => p.confidence_0_1 < 0.4);
  const defaultSourcePredictions = predictions.filter(p => 
    p.data_provenance?.source?.includes('default') || 
    p.data_provenance?.source?.includes('assumption')
  );
  
  const missingDataSources = [];
  const hasPermitData = predictions.some(p => 
    p.data_provenance?.sources?.some((s: string) => s.includes('permit'))
  );
  const hasAttomData = predictions.some(p => 
    p.data_provenance?.sources?.some((s: string) => s.includes('attom'))
  );
  const hasImageryData = predictions.some(p => 
    p.data_provenance?.sources?.some((s: string) => s.includes('imagery'))
  );

  if (!hasPermitData) missingDataSources.push("Building Permits");
  if (!hasAttomData) missingDataSources.push("Property Records");
  if (!hasImageryData) missingDataSources.push("Aerial Imagery");

  // Generate recommendations
  const recommendations = [];
  
  if (lowConfidencePredictions.length > 0) {
    recommendations.push({
      type: "action" as const,
      title: "Manual Inspection Recommended",
      description: `${lowConfidencePredictions.length} predictions have low confidence and should be verified through physical inspection or documentation review.`,
      systems: lowConfidencePredictions.map(p => p.field.replace(/_/g, ' '))
    });
  }

  if (missingDataSources.length > 0) {
    recommendations.push({
      type: "data" as const,
      title: "Missing Data Sources",
      description: `Could improve accuracy by obtaining: ${missingDataSources.join(", ")}`,
      systems: []
    });
  }

  if (defaultSourcePredictions.length > 3) {
    recommendations.push({
      type: "warning" as const,
      title: "Limited Property-Specific Data",
      description: "Most predictions are based on statistical defaults rather than property-specific information.",
      systems: []
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Data Quality Insights & Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Source Status */}
        <div>
          <h4 className="font-medium mb-2">Available Data Sources</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Badge variant={hasPermitData ? "default" : "secondary"} className="justify-start">
              {hasPermitData ? <CheckCircle className="h-3 w-3 mr-1" /> : "❌"}
              Building Permits
            </Badge>
            <Badge variant={hasAttomData ? "default" : "secondary"} className="justify-start">
              {hasAttomData ? <CheckCircle className="h-3 w-3 mr-1" /> : "❌"}
              Property Records  
            </Badge>
            <Badge variant={hasImageryData ? "default" : "secondary"} className="justify-start">
              {hasImageryData ? <CheckCircle className="h-3 w-3 mr-1" /> : "❌"}
              Aerial Imagery
            </Badge>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Recommendations</h4>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    rec.type === 'action' ? 'bg-blue-50 border-blue-200' :
                    rec.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {rec.type === 'action' && <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />}
                    {rec.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />}
                    {rec.type === 'data' && <Info className="h-4 w-4 text-gray-600 mt-0.5" />}
                    <div>
                      <div className="font-medium text-sm">{rec.title}</div>
                      <div className="text-sm text-muted-foreground">{rec.description}</div>
                      {rec.systems.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs text-muted-foreground">Affected systems: </span>
                          <span className="text-xs">{rec.systems.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Metrics */}
        <div className="pt-3 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Prediction Accuracy:</span>
              <div className="font-medium">
                {predictions.length > 0 ? 
                  `${Math.round(predictions.reduce((sum, p) => sum + p.confidence_0_1, 0) / predictions.length * 100)}% avg confidence` :
                  'No predictions'
                }
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Data Completeness:</span>
              <div className="font-medium">
                {Math.round((3 - missingDataSources.length) / 3 * 100)}% complete
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}