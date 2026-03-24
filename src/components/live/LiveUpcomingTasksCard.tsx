import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign } from 'lucide-react';
import { useUpcomingTasksLive } from '@/hooks/useHabittaLive';

interface LiveUpcomingTasksCardProps {
  homeId?: string;
  refreshKey?: number;
}

export default function LiveUpcomingTasksCard({ homeId, refreshKey }: LiveUpcomingTasksCardProps) {
  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(30);
  const { data: tasks, loading } = useUpcomingTasksLive(homeId, windowDays, refreshKey);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Upcoming Tasks</CardTitle>
          <div className="flex gap-1">
            {[30, 60, 90].map((days) => (
              <Button
                key={days}
                variant={windowDays === days ? "default" : "outline"}
                size="sm"
                onClick={() => setWindowDays(days as 30 | 60 | 90)}
                className="text-xs px-2 py-1"
              >
                {days}d
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No upcoming tasks in the next {windowDays} days
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">{task.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(task.due_date)}</span>
                    </div>
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {task.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline"
                      className={`text-xs px-1 py-0 ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </Badge>
                    {task.cost && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        <span>${task.cost}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {tasks.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing 5 of {tasks.length} upcoming tasks
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}