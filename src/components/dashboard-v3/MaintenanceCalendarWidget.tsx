/**
 * MaintenanceCalendarWidget - Compact calendar for right column
 * 
 * Shows current month with task indicators.
 * Designed for the Context Rail (RightColumn).
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      isSameDay(new Date(task.due_date), date)
    );
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

  const renderCalendarDays = () => {
    const days = [];
    let day = startDate;

    while (day <= endDate) {
      const dayTasks = getTasksForDate(day);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const dayIsToday = isToday(day);
      const indicator = getTaskIndicator(dayTasks);

      days.push(
        <div
          key={day.toString()}
          className={`
            relative h-8 w-8 flex items-center justify-center text-xs rounded-full
            ${!isCurrentMonth ? 'text-muted-foreground/40' : 'text-foreground'}
            ${dayIsToday ? 'bg-primary text-primary-foreground font-semibold' : ''}
          `}
        >
          {format(day, 'd')}
          {indicator && !dayIsToday && (
            <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${indicator}`} />
          )}
        </div>
      );
      day = addDays(day, 1);
    }

    return days;
  };

  // Count upcoming tasks
  const upcomingCount = tasks.filter(t => 
    new Date(t.due_date) >= new Date() && t.status !== 'completed'
  ).length;

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
    <Card className="rounded-xl border bg-muted/20">
      <CardContent className="py-4 px-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Maintenance Calendar
          </h3>
          <span className="text-xs text-muted-foreground">
            {upcomingCount} upcoming
          </span>
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
  );
}
