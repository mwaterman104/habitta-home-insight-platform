import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useTasksStatsLive } from '@/hooks/useHabittaLive';

interface LiveCompletedStatsProps {
  homeId?: string;
  refreshKey?: number;
}

export default function LiveCompletedStats({ homeId, refreshKey }: LiveCompletedStatsProps) {
  const { stats, loading } = useTasksStatsLive(homeId, refreshKey);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading stats...</div>
        </CardContent>
      </Card>
    );
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statItems = [
    {
      label: "Pending",
      value: stats.pending,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Task Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {statItems.map((stat) => (
            <div key={stat.label} className={`p-3 rounded-lg ${stat.bgColor}`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Completion Rate</span>
            <span className="text-sm font-bold">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats.completed} of {stats.total} total tasks completed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}