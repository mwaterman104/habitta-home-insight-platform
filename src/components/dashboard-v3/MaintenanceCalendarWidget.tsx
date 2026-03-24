/**
 * MaintenanceCalendarWidget - Compact calendar for right column
 * 
 * Shows current month with task indicators.
 * Designed for the Context Rail (RightColumn).
 * 
 * Features:
 * - Hover tooltips on task dots
 * - Flip animation to toggle calendar/list view
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar, List, CheckCircle2 } from "lucide-react";
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
  isToday,
  isPast
} from "date-fns";

interface MaintenanceTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
}

interface MaintenanceCalendarWidgetProps {
  tasks: MaintenanceTask[];
  loading?: boolean;
}

export function MaintenanceCalendarWidget({ tasks, loading }: MaintenanceCalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFlipped, setIsFlipped] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      isSameDay(new Date(task.due_date), date)
    );
  };

  const getTasksForMonth = () => {
    return tasks
      .filter(task => isSameMonth(new Date(task.due_date), currentDate))
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  };

  const getTaskIndicator = (dayTasks: MaintenanceTask[]) => {
    if (dayTasks.length === 0) return null;
    const hasHigh = dayTasks.some(t => t.priority === 'high' && t.status !== 'completed');
    const hasMedium = dayTasks.some(t => t.priority === 'medium' && t.status !== 'completed');
    const allCompleted = dayTasks.every(t => t.status === 'completed');
    
    if (allCompleted) return 'bg-green-500';
    if (hasHigh) return 'bg-destructive';
    if (hasMedium) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const getPriorityColor = (priority: string, status: string) => {
    if (status === 'completed') return 'text-green-600';
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-yellow-600';
      default: return 'text-primary';
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    let day = startDate;

    while (day <= endDate) {
      const currentDay = day; // Capture for closure
      const dayTasks = getTasksForDate(currentDay);
      const isCurrentMonth = isSameMonth(currentDay, monthStart);
      const dayIsToday = isToday(currentDay);
      const indicator = getTaskIndicator(dayTasks);

      const dayElement = (
        <div
          key={currentDay.toString()}
          className={`
            relative h-8 w-8 flex items-center justify-center text-xs rounded-full
            ${!isCurrentMonth ? 'text-muted-foreground/40' : 'text-foreground'}
            ${dayIsToday ? 'bg-primary text-primary-foreground font-semibold' : ''}
            ${dayTasks.length > 0 ? 'cursor-pointer hover:bg-muted/50' : ''}
          `}
        >
          {format(currentDay, 'd')}
          {indicator && !dayIsToday && (
            <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${indicator}`} />
          )}
        </div>
      );

      // Wrap with tooltip if there are tasks
      if (dayTasks.length > 0) {
        days.push(
          <Tooltip key={currentDay.toString()}>
            <TooltipTrigger asChild>
              {dayElement}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <div className="space-y-1">
                <p className="font-medium text-xs">
                  {format(currentDay, 'MMM d')} — {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                </p>
                {dayTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center gap-1.5 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      task.status === 'completed' ? 'bg-green-500' :
                      task.priority === 'high' ? 'bg-destructive' :
                      task.priority === 'medium' ? 'bg-yellow-500' : 'bg-primary'
                    }`} />
                    <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                      {task.title}
                    </span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      } else {
        days.push(dayElement);
      }
      
      day = addDays(day, 1);
    }

    return days;
  };

  // Count upcoming tasks
  const upcomingCount = tasks.filter(t => 
    new Date(t.due_date) >= new Date() && t.status !== 'completed'
  ).length;

  const monthTasks = getTasksForMonth();

  if (loading) {
    return (
      <Card className="rounded-xl border bg-muted/20">
        <CardContent className="py-4 px-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="perspective-1000">
        <div 
          className={`relative transition-transform duration-500 transform-style-preserve-3d ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* Front - Calendar View */}
          <Card className={`rounded-xl border bg-muted/20 backface-hidden ${isFlipped ? 'invisible' : ''}`}>
            <CardContent className="py-4 px-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Maintenance Calendar
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsFlipped(true)}
                  title="Switch to list view"
                >
                  <List className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium">
                  {format(currentDate, 'MMM yyyy')}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="h-6 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {renderCalendarDays()}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-3 pt-1 border-t border-border/50">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  <span className="text-[10px] text-muted-foreground">High</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  <span className="text-[10px] text-muted-foreground">Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-muted-foreground">Done</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back - List View */}
          <Card className={`rounded-xl border bg-muted/20 absolute inset-0 backface-hidden [transform:rotateY(180deg)] ${!isFlipped ? 'invisible' : ''}`}>
            <CardContent className="py-4 px-5 space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {format(currentDate, 'MMMM')} Tasks
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsFlipped(false)}
                  title="Switch to calendar view"
                >
                  <Calendar className="h-3 w-3" />
                </Button>
              </div>

              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium">
                  {format(currentDate, 'MMM yyyy')}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              {/* Task list */}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px] max-h-[200px]">
                {monthTasks.length > 0 ? (
                  monthTasks.map(task => {
                    const taskDate = new Date(task.due_date);
                    const isOverdue = isPast(taskDate) && !isToday(taskDate) && task.status !== 'completed';
                    
                    return (
                      <div 
                        key={task.id} 
                        className={`flex items-start gap-2 p-2 rounded-lg bg-background/50 ${
                          isOverdue ? 'border border-destructive/30' : ''
                        }`}
                      >
                        <div className={`mt-0.5 ${getPriorityColor(task.priority, task.status)}`}>
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <span className={`block w-2 h-2 rounded-full ${
                              task.priority === 'high' ? 'bg-destructive' :
                              task.priority === 'medium' ? 'bg-yellow-500' : 'bg-primary'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${
                            task.status === 'completed' ? 'line-through text-muted-foreground' : ''
                          }`}>
                            {task.title}
                          </p>
                          <p className={`text-[10px] ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {isOverdue ? 'Overdue · ' : ''}{format(taskDate, 'MMM d')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-6">
                    <Calendar className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">No tasks this month</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="pt-1 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground text-center">
                  {upcomingCount} upcoming · {tasks.filter(t => t.status === 'completed').length} completed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
