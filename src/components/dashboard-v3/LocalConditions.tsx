/**
 * LocalConditions - External Awareness
 * 
 * Climate zone + comparable homes context for right column.
 * Reinforces that Habitta understands context beyond the house.
 * 
 * Rules:
 * - Section header: "LOCAL CONDITIONS"
 * - Three lines max
 * - No action language
 */

import { Card, CardContent } from "@/components/ui/card";
import type { EnvironmentalStress } from "@/lib/dashboardRecoveryCopy";

interface LocalConditionsProps {
  climateZone: string;           // "High heat & humidity"
  environmentalStress: EnvironmentalStress;
  comparableHomesPattern: string; // "No unusual patterns detected"
}

export function LocalConditions({
  climateZone,
  environmentalStress,
  comparableHomesPattern,
}: LocalConditionsProps) {
  return (
    <Card className="rounded-xl border bg-muted/20">
      <CardContent className="py-4 px-5 space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Local Conditions
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Climate zone</span>
            <span className="text-foreground">{climateZone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Environmental stress</span>
            <span className="text-foreground">{environmentalStress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Comparable homes</span>
            <span className="text-foreground">{comparableHomesPattern}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
