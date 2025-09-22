import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useCostModel } from "../../src/hooks/useBenchmarkData";
import { useAllTasks } from "../hooks/useHabittaLocal";
import { Slider } from "../ui/slider";
import { DollarSign, AlertTriangle } from "lucide-react";

export default function CostImpactModel() {
  const [monthsDelay, setMonthsDelay] = useState(0);
  const { costModel, loading: costLoading } = useCostModel();
  const allTasks = useAllTasks();

  if (costLoading || !costModel) return <div>Loading...</div>;

  const calculateTotalCost = (delay: number) => {
    const baseCost = allTasks
      .filter(task => task.status === "pending")
      .reduce((sum, task) => sum + (task.cost || costModel.baseline_monthly_cost), 0);

    // Apply delay multiplier
    const multiplier = 1 + (costModel.global_multiplier * delay);
    
    return baseCost * multiplier;
  };

  const baseCost = calculateTotalCost(0);
  const delayedCost = calculateTotalCost(monthsDelay);
  const costIncrease = delayedCost - baseCost;
  const percentIncrease = baseCost > 0 ? ((costIncrease / baseCost) * 100) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getImpactColor = (delay: number) => {
    if (delay === 0) return "text-green-600";
    if (delay <= 3) return "text-yellow-600";
    if (delay <= 6) return "text-orange-600";
    return "text-red-600";
  };

  const getImpactBgColor = (delay: number) => {
    if (delay === 0) return "bg-green-100";
    if (delay <= 3) return "bg-yellow-100";
    if (delay <= 6) return "bg-orange-100";
    return "bg-red-100";
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cost Impact Model
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">Maintenance Delay</label>
            <span className="text-sm text-muted-foreground">
              {monthsDelay} months
            </span>
          </div>
          <Slider
            value={[monthsDelay]}
            onValueChange={(value) => setMonthsDelay(value[0])}
            max={12}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>On Time</span>
            <span>1 Year Delay</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Baseline Cost */}
          <div className="text-center p-3 bg-muted/50 rounded-xl">
            <div className="text-sm text-muted-foreground">Baseline</div>
            <div className="text-lg font-semibold">{formatCurrency(baseCost)}</div>
          </div>

          {/* Delayed Cost */}
          <div className={`text-center p-3 rounded-xl ${getImpactBgColor(monthsDelay)}`}>
            <div className="text-sm text-muted-foreground">With Delay</div>
            <div className={`text-lg font-semibold ${getImpactColor(monthsDelay)}`}>
              {formatCurrency(delayedCost)}
            </div>
          </div>
        </div>

        {monthsDelay > 0 && (
          <div className={`p-3 rounded-xl ${getImpactBgColor(monthsDelay)}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`h-4 w-4 ${getImpactColor(monthsDelay)}`} />
              <span className="text-sm font-medium">Cost Impact</span>
            </div>
            <div className="text-sm">
              <div className={getImpactColor(monthsDelay)}>
                +{formatCurrency(costIncrease)} ({percentIncrease.toFixed(1)}% increase)
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Delaying maintenance increases costs due to compounding damage
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Model assumes {(costModel.global_multiplier * 100).toFixed(0)}% monthly cost inflation for delayed maintenance
        </div>
      </CardContent>
    </Card>
  );
}