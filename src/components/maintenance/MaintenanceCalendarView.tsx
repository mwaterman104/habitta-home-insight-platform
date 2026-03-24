import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, CheckCircle, PlayCircle } from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from "date-fns";

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

interface MaintenanceCalendarViewProps {
  tasks: MaintenanceTask[];
  loading: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<MaintenanceTask>) => void;
}

export function MaintenanceCalendarView({ tasks, loading, onTaskUpdate }: MaintenanceCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      isSameDay(new Date(task.due_date), date)
    );
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    const updates: Partial<MaintenanceTask> = { status: newStatus };
    if (newStatus === "completed") {
      updates.completed_date = new Date().toISOString();
    }
    onTaskUpdate(taskId, updates);
  };

  const renderCalendarDays = () => {
    const days = [];
    let day = startDate;

    while (day <= endDate) {
      const dayTasks = getTasksForDate(day);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const dayIsToday = isToday(day);

      days.push(
        <div
          key={day.toString()}
          className={`
            min-h-[120px] border border-gray-200 p-2 cursor-pointer transition-colors
            ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
            ${isSelected ? 'bg-blue-50 border-blue-300' : ''}
            ${dayIsToday ? 'bg-blue-25 border-blue-200' : ''}
            hover:bg-gray-50
          `}
          onClick={() => setSelectedDate(day)}
        >
          <div className={`text-sm font-medium mb-1 ${dayIsToday ? 'text-blue-600' : ''}`}>
            {format(day, 'd')}
          </div>
          <div className="space-y-1">
            {dayTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className={`
                  text-xs p-1 rounded border truncate
                  ${getPriorityColor(task.priority)}
                  ${task.status === 'completed' ? 'opacity-60 line-through' : ''}
                `}
                title={task.title}
              >
                {task.title}
              </div>
            ))}
            {dayTasks.length > 3 && (
              <div className="text-xs text-gray-500 font-medium">
                +{dayTasks.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }

    return days;
  };

  const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4 w-1/4"></div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {renderCalendarDays()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Date Tasks */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-3">
                {selectedTasks.length > 0 ? (
                  selectedTasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <Badge 
                          variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      
                      {task.description && (
                        <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            task.status === 'completed' ? 'text-green-600' :
                            task.status === 'in_progress' ? 'text-blue-600' :
                            'text-orange-600'
                          }`}
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                        
                        <div className="flex gap-1">
                          {task.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(task.id, "in_progress")}
                              className="h-7 px-2"
                            >
                              <PlayCircle className="h-3 w-3" />
                            </Button>
                          )}
                          {task.status !== "completed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(task.id, "completed")}
                              className="h-7 px-2"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tasks scheduled for this date</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click on a date to view tasks</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}