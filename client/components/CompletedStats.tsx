import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useTasksSummary } from "../hooks/useHabittaLocal";
import { CheckCircle, Clock, AlertCircle, BarChart3 } from "lucide-react";

export default function CompletedStats() {
  const { pending, inProgress, completed, total } = useTasksSummary();

  const stats = [
    {
      label: "Completed",
      value: completed,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      label: "In Progress", 
      value: inProgress,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100"
    },
    {
      label: "Pending",
      value: pending,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100"
    }
  ];

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Task Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <div className={`${stat.bgColor} rounded-xl p-2 mb-2 inline-flex`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="text-lg font-semibold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Completion Rate</span>
            <span className="font-semibold">{completionRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}