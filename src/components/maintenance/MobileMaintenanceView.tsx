import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Clock, PlayCircle, Plus, ChevronRight } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { SystemFilterChips } from "./SystemFilterChips";

interface MaintenanceTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
  category: string | null;
  system_type?: string | null;
  cost: number | null;
  home_id: string;
}

interface MobileMaintenanceViewProps {
  tasks: MaintenanceTask[];
  loading: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<MaintenanceTask>) => void;
  onAddTask: () => void;
}

export function MobileMaintenanceView({ tasks, loading, onTaskUpdate, onAddTask }: MobileMaintenanceViewProps) {
  const [systemFilter, setSystemFilter] = useState("all");
  const today = startOfDay(new Date());

  const availableTypes = [...new Set(tasks.map(t => t.system_type).filter(Boolean))] as string[];

  const filtered = systemFilter === "all" 
    ? tasks 
    : tasks.filter(t => t.system_type === systemFilter);

  const overdue = filtered.filter(t => t.status !== "completed" && isBefore(new Date(t.due_date), today));
  const upcoming = filtered.filter(t => t.status !== "completed" && !isBefore(new Date(t.due_date), today));
  const completed = filtered.filter(t => t.status === "completed");

  const handleStatusChange = (taskId: string, newStatus: string) => {
    const updates: Partial<MaintenanceTask> = { status: newStatus };
    if (newStatus === "completed") {
      (updates as any).completed_date = new Date().toISOString();
    }
    onTaskUpdate(taskId, updates);
  };

  const TaskCard = ({ task }: { task: MaintenanceTask }) => {
    const isOverdue = task.status !== "completed" && isBefore(new Date(task.due_date), today);

    return (
      <Card className={`${isOverdue ? "border-destructive/40 bg-destructive/5" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm truncate">{task.title}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant={task.priority === "high" || task.priority === "urgent" ? "destructive" : "secondary"} 
                  className="text-xs h-5"
                >
                  {task.priority}
                </Badge>
                {task.system_type && (
                  <Badge variant="outline" className="text-xs h-5">
                    {task.system_type.replace("_", " ")}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), "MMM d")}
                </span>
                {isOverdue && (
                  <span className="text-xs text-destructive font-medium">Overdue</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {task.status === "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStatusChange(task.id, "in_progress")}
                  className="h-8 w-8 p-0"
                >
                  <PlayCircle className="h-4 w-4" />
                </Button>
              )}
              {task.status !== "completed" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStatusChange(task.id, "completed")}
                  className="h-8 w-8 p-0"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* System filter chips */}
      <div className="px-1">
        <SystemFilterChips
          selected={systemFilter}
          onSelect={setSystemFilter}
          availableTypes={availableTypes}
        />
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Clock className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">Overdue ({overdue.length})</span>
          </div>
          {overdue.map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Upcoming ({upcoming.length})</span>
          </div>
          {upcoming.map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-muted-foreground">Completed ({completed.length})</span>
          </div>
          {completed.slice(0, 5).map(task => <TaskCard key={task.id} task={task} />)}
          {completed.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">+{completed.length - 5} more completed</p>
          )}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No maintenance tasks</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a seasonal plan to get started with region-specific tasks.
            </p>
          </CardContent>
        </Card>
      )}

      {/* FAB */}
      <Button
        onClick={onAddTask}
        size="lg"
        className="fixed bottom-20 right-4 rounded-full h-14 w-14 shadow-lg z-40 p-0"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
