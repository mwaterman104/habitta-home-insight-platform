import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useLifestyleMetrics } from "../../src/hooks/useLifestyleData";
import { Zap, Home, TreePine, DollarSign } from "lucide-react";

export default function LifestyleReadinessPanel() {
  const { metrics, loading } = useLifestyleMetrics();

  if (loading || !metrics) return <div>Loading...</div>;

  return (
    <Card className="rounded-2xl h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="bg-primary/10 rounded-lg p-1.5">
            <Home className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm">🏡 Lifestyle Readiness</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-accent" />
              <span className="text-xs font-medium whitespace-nowrap">Energy</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold">{metrics.energyWellness.score}</span>
              <Badge variant="outline" className="text-xs bg-success-green/10 text-success-green border-success-green/20 px-1">
                Above avg
              </Badge>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Home className="h-3 w-3 text-info-blue" />
              <span className="text-xs font-medium whitespace-nowrap">Comfort</span>
            </div>
            <span className="text-sm font-bold text-muted-foreground">{metrics.comfortIndex.rating}</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <TreePine className="h-3 w-3 text-success-green" />
              <span className="text-xs font-medium whitespace-nowrap">Outdoor</span>
            </div>
            <Badge 
              variant="outline" 
              className="bg-success-green/10 text-success-green border-success-green/20 text-xs px-1"
            >
              {metrics.outdoorReadiness.status}
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-success-green" />
              <span className="text-xs font-medium whitespace-nowrap">Savings</span>
            </div>
            <span className="text-sm font-bold text-success-green">${metrics.energyWellness.monthlySavings}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}