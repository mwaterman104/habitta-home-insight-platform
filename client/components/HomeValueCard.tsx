import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { usePropertySummary } from "../hooks/useHabittaLocal";
import { TrendingUp } from "lucide-react";

export default function HomeValueCard() {
  const propertyData = usePropertySummary();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="bg-info-blue/10 rounded-xl p-2">
            <TrendingUp className="h-5 w-5 text-info-blue" />
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
          <span className="text-success-green text-sm font-medium">
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

        {/* Lifestyle Investment Section */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2">💡 Your savings unlock:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Kitchen refresh fund: $195/month</div>
            <div>Home gym addition: On track for 2026</div>
            <div>Energy independence: 87% efficiency rating</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}