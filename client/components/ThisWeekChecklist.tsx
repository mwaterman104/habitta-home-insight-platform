import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Calendar, Clock, DollarSign, Cloud } from "lucide-react";
import { Alert } from "../types/alerts";
import { useState } from "react";

interface WeeklyTask {
  id: string;
  title: string;
  duration: string;
  cost?: number;
  weatherHint?: string;
  priority: "low" | "medium" | "high";
}

interface ThisWeekChecklistProps {
  alerts: Alert[];
}

export default function ThisWeekChecklist({ alerts }: ThisWeekChecklistProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  // Convert alerts to weekly tasks format
  const weeklyTasks: WeeklyTask[] = alerts
    .filter(alert => {
      if (!alert.deadline) return false;
      const dueDate = new Date(alert.deadline);
      const now = new Date();
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 7;
    })
    .slice(0, 5)
    .map(alert => ({
      id: alert.id,
      title: alert.title,
      duration: alert.actions.find(a => a.duration)?.duration || "30m",
      cost: alert.cost,
      priority: alert.severity,
      weatherHint: getWeatherHint(alert.title)
    }));

  function getWeatherHint(title: string): string | undefined {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('gutter') || lowerTitle.includes('roof')) {
      return "dry weather";
    }
    if (lowerTitle.includes('exterior') || lowerTitle.includes('paint')) {
      return "no rain forecasted";
    }
    return undefined;
  }

  const toggleTask = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
  };

  const getPriorityColor = (priority: WeeklyTask['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
    }
  };

  if (weeklyTasks.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground">No urgent tasks this week</p>
        </CardContent>
      </Card>
    );
  }

  const completionRate = (completedTasks.size / weeklyTasks.length) * 100;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            This Week
          </span>
          <span className="text-sm text-muted-foreground">
            {completedTasks.size} of {weeklyTasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        {weeklyTasks.map((task) => {
          const isCompleted = completedTasks.has(task.id);
          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                isCompleted ? 'bg-green-50' : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox
                checked={isCompleted}
                onCheckedChange={() => toggleTask(task.id)}
                className="mt-1"
              />
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </span>
                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {task.duration}
                  </div>
                  
                  {task.cost && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${task.cost}
                    </div>
                  )}
                  
                  {task.weatherHint && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Cloud className="h-3 w-3" />
                      {task.weatherHint}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}