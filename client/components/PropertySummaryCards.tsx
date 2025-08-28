import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { usePropertySummary } from "../hooks/useHabittaLocal";
import { Home, TrendingUp, Shield, Zap } from "lucide-react";

export default function PropertySummaryCards() {
  const propertyData = usePropertySummary();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getConditionColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getConditionBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Home Condition Card */}
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
              <Shield className="h-4 w-4 text-blue-600" />
              <div>
                <div className="font-medium">{propertyData.metrics.safety_compliance}%</div>
                <div className="text-xs text-muted-foreground">Safety</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="font-medium">{propertyData.metrics.energy_efficiency_rating}</div>
                <div className="text-xs text-muted-foreground">Efficiency</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Home Value Card */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="bg-blue-100 rounded-xl p-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            Home Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {formatCurrency(propertyData.home_value)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-green-600 text-sm font-medium">
              +{formatCurrency(propertyData.value_change_1year)}
            </span>
            <span className="text-sm text-muted-foreground">
              (+{propertyData.value_change_percent}%) this year
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <div>
              <div className="font-medium">{propertyData.metrics.maintenance_completion_rate}%</div>
              <div className="text-xs text-muted-foreground">Maintenance Rate</div>
            </div>
            <div>
              <div className="font-medium">{propertyData.metrics.preventive_maintenance_score}%</div>
              <div className="text-xs text-muted-foreground">Preventive Score</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}