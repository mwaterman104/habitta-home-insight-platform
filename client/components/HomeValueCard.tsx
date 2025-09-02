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
    <Card className="rounded-2xl h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="bg-primary/10 rounded-lg p-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm">💰 Home Value</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1">
        <div className="text-center">
          <div className="text-2xl font-bold">{formatCurrency(propertyData.home_value)}</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-xs text-success-green font-medium">
              +{formatCurrency(propertyData.value_change_1year)} YoY
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground whitespace-nowrap">Maintenance</span>
            <div className="text-accent font-bold">
              {propertyData.metrics.maintenance_completion_rate}%
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground whitespace-nowrap">Preventive</span>
            <div className="text-success-green font-bold">
              {propertyData.metrics.preventive_maintenance_score}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}