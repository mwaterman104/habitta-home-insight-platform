import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Plus, Calendar, Loader2 } from 'lucide-react';
import { useUserTasks, UserTask } from '@/hooks/useUserTasks';
import { useTaskCompletion } from './TaskCompletionHandler';

interface UserTasksListProps {
  showCreateButton?: boolean;
  maxTasks?: number;
}

export const UserTasksList: React.FC<UserTasksListProps> = ({
  showCreateButton = false,
  maxTasks = 5
}) => {
  const { tasks, loading, error, refetch } = useUserTasks();
  const { toggleTaskCompletion, completingTasks } = useTaskCompletion();
  
  const pendingTasks = tasks
    .filter(task => task.status === 'pending' || task.status === 'in_progress')
    .slice(0, maxTasks);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-danger text-danger-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const TaskRow = ({ task }: { task: UserTask }) => {
    const isCompleting = completingTasks.has(task.id);
    const isOverdue = task.due_date && new Date(task.due_date) < new Date();

    return (
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-3 flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-5 w-5"
            onClick={() => toggleTaskCompletion(task.id, task.status !== 'completed')}
            disabled={isCompleting}
          >
            <CheckCircle2 
              className={`h-5 w-5 ${
                isCompleting ? 'text-accent animate-pulse' : 
                task.status === 'completed' ? 'text-accent' : 
                'text-muted-foreground hover:text-accent'
              }`} 
            />
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </h4>
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive">
                  Overdue
                </Badge>
              )}
            </div>
            
            {task.description && (
              <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
            )}
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(task.due_date)}</span>
                </div>
              )}
              {task.cost && (
                <span className="font-medium">
                  ${task.cost.toLocaleString()}
                </span>
              )}
              {task.category && (
                <Badge variant="outline" className="text-xs">
                  {task.category}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            My Tasks
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          {showCreateButton && (
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
            <p className="text-sm text-danger">Failed to load tasks</p>
          </div>
        )}
        
        {!loading && pendingTasks.length === 0 && !error && (
          <div className="text-center p-4">
            <p className="text-muted-foreground mb-2">No active tasks</p>
            {showCreateButton && (
              <p className="text-sm text-muted-foreground">Create your first maintenance task</p>
            )}
          </div>
        )}
        
        {pendingTasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
        
        {tasks.length > maxTasks && (
          <Button variant="ghost" size="sm" className="w-full">
            View all {tasks.length} tasks
          </Button>
        )}
      </CardContent>
    </Card>
  );
};