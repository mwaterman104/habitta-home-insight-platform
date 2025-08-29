import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Wrench, Calendar, DollarSign } from "lucide-react";
import { Alert } from "../types/alerts";

interface TodaysPrioritiesProps {
  alerts: Alert[];
}

export default function TodaysPriorities({ alerts }: TodaysPrioritiesProps) {
  const navigate = useNavigate();
  const topAlerts = alerts.slice(0, 3);

  if (topAlerts.length === 0) {
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
          <h3 className="font-semibold mb-1">All caught up!</h3>
          <p className="text-muted-foreground text-sm">
            No urgent maintenance items right now.
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
    }
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    return severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : '📋';
  };

  const handleDiagnose = (alert: Alert) => {
    navigate(`/chatdiy?taskId=${alert.id.replace('alert-', '')}`);
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
        {topAlerts.map((alert) => (
          <div key={alert.id} className="border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                  <h4 className="font-semibold">{alert.title}</h4>
                  <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                    {alert.severity} impact
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {alert.consequence}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {alert.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due {new Date(alert.deadline).toLocaleDateString()}
                    </div>
                  )}
                  {alert.cost && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${alert.cost}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {alert.actions.map((action, index) => (
                <Button 
                  key={index}
                  variant={action.type === 'diagnose' ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-xl"
                  onClick={() => action.type === 'diagnose' && handleDiagnose(alert)}
                >
                  {action.type === 'diagnose' && <Wrench className="h-3 w-3 mr-1" />}
                  {action.label}
                  {action.duration && (
                    <span className="text-xs ml-1 opacity-70">
                      ~{action.duration}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}