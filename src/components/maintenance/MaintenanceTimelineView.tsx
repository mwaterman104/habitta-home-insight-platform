import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, DollarSign, CheckCircle, PlayCircle, Pause } from "lucide-react";
import { format, isAfter, isBefore, startOfDay } from "date-fns";

interface MaintenanceTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
  category: string | null;
  cost: number | null;
  home_id: string;
  created_at: string;
  updated_at: string;
  completed_date?: string;
}

interface MaintenanceTimelineViewProps {
  tasks: MaintenanceTask[];
  loading: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<MaintenanceTask>) => void;
}

export function MaintenanceTimelineView({ tasks, loading, onTaskUpdate }: MaintenanceTimelineViewProps) {
  const today = startOfDay(new Date());

  const getTasksByTimeframe = () => {
    const overdue = tasks.filter(task => 
      task.status !== "completed" && 
      isBefore(new Date(task.due_date), today)
    );
    
    const upcoming = tasks.filter(task => 
      task.status !== "completed" && 
      isAfter(new Date(task.due_date), today)
    );
    
    const completed = tasks.filter(task => task.status === "completed");

    return { overdue, upcoming, completed };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "in_progress": return "text-blue-600";
      case "pending": return "text-orange-600";
      default: return "text-muted-foreground";
    }
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    const updates: Partial<MaintenanceTask> = { status: newStatus };
    if (newStatus === "completed") {
      updates.completed_date = new Date().toISOString();
    }
    onTaskUpdate(taskId, updates);
  };

  const TaskCard = ({ task }: { task: MaintenanceTask }) => {
    const isOverdue = task.status !== "completed" && isBefore(new Date(task.due_date), today);
    
    return (
      <Card className={`mb-4 ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold">{task.title}</h3>
                <Badge variant={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
                <Badge variant="outline" className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.category && (
                  <Badge variant="secondary">{task.category}</Badge>
                )}
              </div>
              
              {task.description && (
                <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
                  {isOverdue && <span className="text-red-600 font-medium">(Overdue)</span>}
                </div>
                {task.cost && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>${task.cost.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {task.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(task.id, "in_progress")}
                  variant="outline"
                >
                  <PlayCircle className="h-4 w-4 mr-1" />
                  Start
                </Button>
              )}
              {task.status === "in_progress" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(task.id, "completed")}
                    variant="outline"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(task.id, "pending")}
                    variant="ghost"
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                </>
              )}
              {task.status === "completed" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(task.id, "pending")}
                  variant="ghost"
                >
                  Reopen
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
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { overdue, upcoming, completed } = getTasksByTimeframe();

  return (
    <div className="space-y-6">
      {/* Overdue Tasks */}
      {overdue.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold text-red-600">Overdue ({overdue.length})</h2>
          </div>
          {overdue.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Upcoming Tasks */}
      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-blue-600">Upcoming ({upcoming.length})</h2>
          </div>
          {upcoming.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Completed Tasks */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold text-green-600">Completed ({completed.length})</h2>
          </div>
          {completed.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No maintenance tasks</h3>
              <p className="text-muted-foreground">
                Add your first task or generate a seasonal maintenance plan to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}