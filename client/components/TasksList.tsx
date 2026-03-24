import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useAllTasks } from "../hooks/useHabittaLocal";
import { getCostImpact } from "../utils/costImpact";
import { ExternalLink, Calendar, Tag } from "lucide-react";

export default function TasksList() {
  const navigate = useNavigate();
  const allTasks = useAllTasks();
  
  // Show only pending tasks
  const pendingTasks = allTasks.filter(task => task.status === "pending").slice(0, 5);

  const handleSendToChatDIY = (taskId: string) => {
    navigate(`/chatdiy?taskId=${taskId}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600";
      case "medium": return "text-yellow-600";
      default: return "text-green-600";
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Tasks List
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingTasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No pending tasks found
          </p>
        ) : (
          pendingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{task.title}</h4>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.due_date)}
                  </span>
                  <span className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </span>
                  <span className="text-muted-foreground">
                    {getCostImpact(task)} impact
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendToChatDIY(task.id)}
                className="ml-3 rounded-xl"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                ChatDIY
              </Button>
            </div>
          ))
        )}
        {pendingTasks.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Showing {pendingTasks.length} pending tasks
          </p>
        )}
      </CardContent>
    </Card>
  );
}