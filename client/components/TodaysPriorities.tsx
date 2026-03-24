import { Alert } from "../types/alerts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertTriangle, DollarSign, Clock, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLifestyleMetrics } from "../hooks/useHabittaLocal";

interface TodaysPrioritiesProps {
  alerts: Alert[];
}

export default function TodaysPriorities({ alerts }: TodaysPrioritiesProps) {
  const navigate = useNavigate();
  const topAlerts = alerts.slice(0, 3);
  const lifestyleMetrics = useLifestyleMetrics();

  if (topAlerts.length === 0) {
    const monthlySavings = lifestyleMetrics.energyWellness.monthlySavings;
    
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-600" />
            Today's Priorities
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="text-green-600 mb-2">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h3 className="font-semibold mb-1">All Systems Optimal</h3>
          <p className="text-muted-foreground text-sm">
            Your efficiency is building reserves (${monthlySavings} this month)
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const handleDiagnose = (alert: Alert) => {
    navigate(`/diagnose/${alert.id}`);
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Today's Priorities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topAlerts.map((alert, index) => (
          <div key={alert.id} className="border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                  <h3 className="font-semibold text-sm">{alert.title}</h3>
                  <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mb-2">
                  {alert.consequence}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{alert.deadline}</span>
                  </div>
                  {alert.cost && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>${alert.cost}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => handleDiagnose(alert)}
                className="rounded-lg"
              >
                <Wrench className="h-3 w-3 mr-1" />
                Diagnose
              </Button>
            </div>
          </div>
        ))}
        
        {alerts.length > 3 && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all {alerts.length} priorities
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}