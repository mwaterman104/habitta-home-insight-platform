import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useUpcomingTasks } from "@/hooks/useUpcomingTasks";

interface UpcomingTasksCardProps {
  homeId?: string;
  refreshKey?: number;
}

export default function UpcomingTasksCard({ homeId, refreshKey = 0 }: UpcomingTasksCardProps) {
  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(30);
  const { data, loading } = useUpcomingTasks(homeId, windowDays, refreshKey);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Upcoming Tasks</CardTitle>
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant={windowDays === 30 ? "default" : "secondary"} 
            onClick={() => setWindowDays(30)}
          >
            30d
          </Button>
          <Button 
            size="sm" 
            variant={windowDays === 60 ? "default" : "secondary"} 
            onClick={() => setWindowDays(60)}
          >
            60d
          </Button>
          <Button 
            size="sm" 
            variant={windowDays === 90 ? "default" : "secondary"} 
            onClick={() => setWindowDays(90)}
          >
            90d
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No upcoming tasks. You're all caught up!</p>
        ) : (
          <ul className="space-y-2">
            {data.map((task: any) => (
              <li key={task.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Due {new Date(task.due_date).toLocaleDateString()} • {task.category} • {task.priority}
                  </div>
                </div>
                <div className="text-sm">
                  {task.cost != null ? `$${Number(task.cost).toLocaleString()}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}