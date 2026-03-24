import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Zap } from "lucide-react";

export default function SeasonalEnergyReadiness() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          ⚡ Seasonal Outlook
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Summer:</span>
            <span className="text-muted-foreground ml-2">Cooling costs 30% below average</span>
          </div>
          <div>
            <span className="font-medium">Winter:</span>
            <span className="text-muted-foreground ml-2">Heating optimized for cozy season</span>
          </div>
          <div>
            <span className="font-medium">Spring:</span>
            <span className="text-muted-foreground ml-2">Perfect efficiency for outdoor living</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}