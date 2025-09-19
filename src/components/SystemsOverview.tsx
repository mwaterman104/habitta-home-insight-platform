import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wrench, Calendar, DollarSign } from "lucide-react";
import { SystemData } from "@/hooks/useSystemsData";
import { ValidationInsight } from "@/hooks/useValidationInsights";

interface SystemsOverviewProps {
  systems: SystemData[];
  insights: ValidationInsight[];
}

export function SystemsOverview({ systems, insights }: SystemsOverviewProps) {
  if (systems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Home Systems
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-2" />
            <p>No systems found. Connect your home data to see system information.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Home Systems Overview
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {systems.length} systems monitored with AI-powered insights
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {systems.map((system) => {
          const insight = insights.find(i => i.system === system.kind);
          const currentYear = new Date().getFullYear();
          const estimatedAge = system.install_year ? currentYear - system.install_year : 10;
          const conditionScore = insight?.conditionScore || Math.max(10, 100 - (estimatedAge * 3));
          
          return (
            <div key={system.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    {system.kind.charAt(0).toUpperCase() + system.kind.slice(1).replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {system.install_year ? `Installed ${system.install_year}` : 'Installation year unknown'} • 
                    Age: {estimatedAge} years
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={
                    conditionScore >= 85 ? 'default' :
                    conditionScore >= 70 ? 'secondary' :
                    conditionScore >= 55 ? 'outline' : 'destructive'
                  }>
                    {Math.round(conditionScore)}%
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(system.confidence * 100)}% confidence
                  </p>
                </div>
              </div>

              <Progress value={conditionScore} className="h-2" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {insight?.nextService || 'Schedule service'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {insight?.replacementTimeline || 'Monitor condition'}
                  </span>
                </div>
              </div>

              {system.material && (
                <div className="text-sm text-muted-foreground">
                  Material/Type: {system.material}
                </div>
              )}

              {system.notes && (
                <div className="text-sm text-muted-foreground">
                  Notes: {system.notes}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}