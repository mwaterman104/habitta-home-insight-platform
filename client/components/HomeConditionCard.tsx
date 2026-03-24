import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { usePropertySummary } from "../hooks/useHabittaLocal";
import { Home, Shield, Zap } from "lucide-react";

export default function HomeConditionCard() {
  const propertyData = usePropertySummary();

  const getConditionColor = (score: number) => {
    if (score >= 80) return "text-success-green";
    if (score >= 60) return "text-accent";
    return "text-error-red";
  };

  const getConditionBgColor = (score: number) => {
    if (score >= 80) return "bg-success-green/10";
    if (score >= 60) return "bg-accent/10";
    return "bg-error-red/10";
  };

  return (
    <Card className="rounded-2xl h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="bg-primary/10 rounded-lg p-1.5">
            <Home className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm">🏠 Home Condition</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1">
        <div className="text-center">
          <div className={`text-2xl font-bold ${getConditionColor(propertyData.condition_score)}`}>
            {propertyData.condition_score}/100
          </div>
          <p className="text-xs text-muted-foreground">{propertyData.condition_label}</p>
        </div>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground whitespace-nowrap">Safety</span>
            <div className={`px-1.5 py-0.5 rounded text-xs ${getConditionBgColor(propertyData.metrics.safety_compliance)}`}>
              {propertyData.metrics.safety_compliance}%
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground whitespace-nowrap">Energy</span>
            <div className={`px-1.5 py-0.5 rounded text-xs bg-accent/10 text-accent`}>
              {propertyData.metrics.energy_efficiency_rating}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}