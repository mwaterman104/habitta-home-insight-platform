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
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className={`${getConditionBgColor(propertyData.condition_score)} rounded-xl p-2`}>
            <Home className={`h-5 w-5 ${getConditionColor(propertyData.condition_score)}`} />
          </div>
          Home Condition
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{propertyData.condition_label}</span>
          <span className="text-lg text-muted-foreground">
            {propertyData.condition_score}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-info-blue" />
            <div>
              <div className="font-medium">{propertyData.metrics.safety_compliance}%</div>
              <div className="text-xs text-muted-foreground">Safety</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            <div>
              <div className="font-medium">{propertyData.metrics.energy_efficiency_rating}</div>
              <div className="text-xs text-muted-foreground">Efficiency</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}