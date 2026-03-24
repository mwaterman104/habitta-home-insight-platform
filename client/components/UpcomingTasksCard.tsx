import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useUpcomingTasks } from "../hooks/useHabittaLocal";
import { getCostImpact } from "../utils/costImpact";
import { Calendar, DollarSign } from "lucide-react";

export default function UpcomingTasksCard() {
  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(30);
  const tasks = useUpcomingTasks(windowDays);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Tasks
        </CardTitle>
        <div className="flex gap-2">
          {[30, 60, 90].map((days) => (
            <Button
              key={days}
              size="sm"
              variant={windowDays === days ? "default" : "outline"}
              onClick={() => setWindowDays(days as 30 | 60 | 90)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground">No upcoming tasks in the next {windowDays} days.</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{task.title}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    <span className="capitalize">{task.category}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      task.priority === "high" ? "bg-destructive/10 text-destructive" :
                      task.priority === "medium" ? "bg-accent/10 text-accent-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
                {task.cost && (
                  <div className="text-right">
                    <div className="flex items-center text-sm font-medium">
                      <DollarSign className="h-4 w-4" />
                      {task.cost}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getCostImpact(task)} Impact
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}