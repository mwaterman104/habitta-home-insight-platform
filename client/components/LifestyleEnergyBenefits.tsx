import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useLifestyleMetrics } from "../../src/hooks/useLifestyleData";
import { Home, DollarSign, Leaf } from "lucide-react";

export default function LifestyleEnergyBenefits() {
  const { metrics, loading } = useLifestyleMetrics();

  if (loading || !metrics) return <div>Loading...</div>;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          🏡 Your Energy Advantage Enables
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Home className="h-4 w-4 text-blue-600" />
            Comfort Benefits
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Consistent temps {metrics.comfortIndex.temperatureStability} year-round</li>
            <li>• Perfect home office environment</li>
            <li>• Ideal for entertaining guests</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Financial Freedom
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• ${(metrics.energyWellness.monthlySavings * 12).toLocaleString()}/year = Kitchen renovation fund</li>
            <li>• Energy independence: {metrics.energyWellness.score}% efficiency</li>
            <li>• Qualify for $200 utility rebate</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Leaf className="h-4 w-4 text-green-600" />
            Environmental Impact
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• 23% lower carbon footprint</li>
            <li>• Leading your neighborhood in sustainability</li>
          </ul>
          <Badge variant="outline" className="mt-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
            Estimated
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}