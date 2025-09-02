import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useLifestyleMetrics } from "../hooks/useHabittaLocal";
import { Zap, Home, TreePine, DollarSign } from "lucide-react";

export default function LifestyleReadinessPanel() {
  const metrics = useLifestyleMetrics();

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="bg-purple-100 rounded-xl p-2">
            <Home className="h-5 w-5 text-purple-600" />
          </div>
          🏡 Lifestyle Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Energy Wellness</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">{metrics.energyWellness.score}/100</span>
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Above neighborhood avg
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Comfort Index</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">{metrics.comfortIndex.rating}</span>
              <span className="text-xs text-muted-foreground">{metrics.comfortIndex.summary}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TreePine className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Outdoor Living</span>
            </div>
            <div className="flex items-baseline gap-2">
              <Badge 
                variant="outline" 
                className="bg-green-50 text-green-700 border-green-200"
              >
                {metrics.outdoorReadiness.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {metrics.outdoorReadiness.seasonalNote}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Monthly Savings</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">${metrics.energyWellness.monthlySavings}</span>
              <span className="text-xs text-muted-foreground">vs neighborhood average</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}