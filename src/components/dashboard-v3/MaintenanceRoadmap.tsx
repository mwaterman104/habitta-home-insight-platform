import { useState, useMemo } from "react";
import { format, addMonths, parseISO, isSameMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, List, Thermometer, Wrench, Shield, Home, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapTask {
  id: string;
  title: string;
  metaLine?: string;
  completed?: boolean;
  systemKey?: string;
  dueDate?: string;      // ISO date
  dueMonth?: string;     // "2026-03" format
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  riskImpact?: {
    type: 'prevents' | 'reduces' | 'extends';
    systemName: string;
    description: string;
  };
}

interface MaintenanceRoadmapProps {
  tasks: RoadmapTask[];
  onTaskComplete?: (taskId: string) => void;
  showRiskImpact?: boolean;
}

interface MonthData {
  key: string;      // yyyy-MM
  label: string;    // Jan, Feb, etc.
  isNow: boolean;
  tasks: RoadmapTask[];
}

// System icons mapping
const SYSTEM_ICONS: Record<string, React.ElementType> = {
  hvac: Thermometer,
  water_heater: Droplet,
  roof: Home,
  safety: Shield,
  exterior: Wrench,
  default: Wrench,
};

// System display names
const SYSTEM_NAMES: Record<string, string> = {
  hvac: 'HVAC',
  water_heater: 'Water Heater',
  roof: 'Roof',
  safety: 'Safety',
  exterior: 'Exterior',
  gutters: 'Gutters',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
};

// Season to month mapping
const SEASON_MONTHS: Record<string, string> = {
  spring: '03',
  summer: '06',
  fall: '09',
  winter: '12',
};

/**
 * Map a task to its target month
 */
function mapTaskToMonth(task: RoadmapTask): string | null {
  if (task.dueDate) {
    try {
      return format(parseISO(task.dueDate), 'yyyy-MM');
    } catch {
      return null;
    }
  }
  if (task.dueMonth) {
    return task.dueMonth;
  }
  if (task.season) {
    const year = new Date().getFullYear();
    return `${year}-${SEASON_MONTHS[task.season]}`;
  }
  return null;
}

/**
 * Generate 12 months of data starting from current month
 */
function generateMonths(tasks: RoadmapTask[]): MonthData[] {
  const months: MonthData[] = [];
  const now = new Date();
  
  // Map tasks to months
  const tasksByMonth = new Map<string, RoadmapTask[]>();
  tasks.forEach(task => {
    const monthKey = mapTaskToMonth(task);
    if (monthKey) {
      const existing = tasksByMonth.get(monthKey) || [];
      existing.push(task);
      tasksByMonth.set(monthKey, existing);
    }
  });
  
  for (let i = 0; i < 12; i++) {
    const month = addMonths(now, i);
    const key = format(month, 'yyyy-MM');
    const monthTasks = tasksByMonth.get(key) || [];
    
    months.push({
      key,
      label: format(month, 'MMM'),
      isNow: i === 0,
      tasks: monthTasks,
    });
  }
  
  return months;
}

/**
 * MaintenanceRoadmap - Horizontal time-based maintenance visualization
 * 
 * Replaces the vertical bucket-based MaintenanceTimeline with a calendar-first view.
 * Time is visualized, not implied. Tasks appear on a 12-month horizontal rail.
 */
export function MaintenanceRoadmap({ 
  tasks, 
  onTaskComplete,
  showRiskImpact = false,
}: MaintenanceRoadmapProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'roadmap' | 'list'>('roadmap');
  
  // Generate month rail data
  const months = useMemo(() => generateMonths(tasks), [tasks]);
  
  // Get current month key for default selection
  const currentMonthKey = months[0]?.key;
  
  // Effective selected month (default to current)
  const activeMonth = selectedMonth || currentMonthKey;
  
  // Get tasks for selected month
  const selectedMonthData = months.find(m => m.key === activeMonth);
  const tasksForMonth = selectedMonthData?.tasks || [];
  
  // Get unscheduled tasks (no timing info)
  const unscheduledTasks = useMemo(() => 
    tasks.filter(t => !mapTaskToMonth(t)),
    [tasks]
  );
  
  // Group tasks by system
  const tasksBySystem = useMemo(() => {
    const grouped = new Map<string, RoadmapTask[]>();
    tasksForMonth.forEach(task => {
      const key = task.systemKey || 'other';
      const existing = grouped.get(key) || [];
      existing.push(task);
      grouped.set(key, existing);
    });
    return grouped;
  }, [tasksForMonth]);
  
  // Stats
  const totalPending = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;
  
  // Get tasks for quarter (next 3 months)
  const tasksThisQuarter = useMemo(() => {
    const quarterMonths = months.slice(0, 3).map(m => m.key);
    return tasks.filter(t => {
      const monthKey = mapTaskToMonth(t);
      return monthKey && quarterMonths.includes(monthKey) && !t.completed;
    });
  }, [months, tasks]);

  const handleTaskToggle = (taskId: string, isCompleted: boolean) => {
    if (onTaskComplete && !isCompleted) {
      onTaskComplete(taskId);
    }
  };
  
  // Get system icon
  const getSystemIcon = (systemKey?: string) => {
    return SYSTEM_ICONS[systemKey || 'default'] || SYSTEM_ICONS.default;
  };
  
  // Check if month has incomplete tasks
  const hasIncompleteTasks = (month: MonthData) => 
    month.tasks.some(t => !t.completed);
  
  // Check if month has only completed tasks
  const hasOnlyCompletedTasks = (month: MonthData) => 
    month.tasks.length > 0 && month.tasks.every(t => t.completed);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Maintenance Roadmap</CardTitle>
          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {completedCount} completed
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode(viewMode === 'roadmap' ? 'list' : 'roadmap')}
            >
              {viewMode === 'roadmap' ? (
                <>
                  <List className="h-3 w-3 mr-1" />
                  List view
                </>
              ) : (
                <>
                  <Calendar className="h-3 w-3 mr-1" />
                  Roadmap
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().getFullYear()} • {totalPending} tasks ahead
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {viewMode === 'roadmap' ? (
          <>
            {/* Month Rail */}
            <div className="relative">
              <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
                {months.map((month, idx) => {
                  const hasTasks = month.tasks.length > 0;
                  const isActive = month.key === activeMonth;
                  const isNow = month.isNow;
                  
                  return (
                    <button
                      key={month.key}
                      onClick={() => setSelectedMonth(month.key)}
                      className={cn(
                        "flex flex-col items-center min-w-[52px] px-2 py-2 rounded-lg transition-colors",
                        isActive 
                          ? "bg-primary/10 ring-1 ring-primary/30" 
                          : "hover:bg-muted",
                        isNow && !isActive && "bg-muted/50"
                      )}
                    >
                      {/* Month label */}
                      <span className={cn(
                        "text-xs font-medium",
                        isActive ? "text-primary" : "text-muted-foreground",
                        isNow && "font-semibold"
                      )}>
                        {month.label}
                      </span>
                      
                      {/* NOW marker */}
                      {isNow && (
                        <span className="text-[10px] font-medium text-primary mt-0.5">
                          NOW
                        </span>
                      )}
                      
                      {/* Task dot(s) */}
                      <div className="flex gap-0.5 mt-1.5 h-3">
                        {hasTasks ? (
                          hasOnlyCompletedTasks(month) ? (
                            <div className="h-2 w-2 rounded-full border-2 border-green-500 bg-transparent" />
                          ) : hasIncompleteTasks(month) ? (
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              isNow ? "bg-amber-500" : "bg-primary"
                            )} />
                          ) : null
                        ) : (
                          <div className="h-2 w-2" /> // Spacer
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Task Detail Panel */}
            <div className="border rounded-lg p-4 bg-muted/30">
              {selectedMonthData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      {format(parseISO(`${activeMonth}-01`), 'MMMM yyyy')}
                    </h4>
                    {tasksForMonth.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {tasksForMonth.filter(t => !t.completed).length} pending
                      </Badge>
                    )}
                  </div>
                  
                  {tasksForMonth.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">
                      No maintenance scheduled this month — you're on track.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Array.from(tasksBySystem.entries()).map(([systemKey, sysTasks]) => {
                        const Icon = getSystemIcon(systemKey);
                        const systemName = SYSTEM_NAMES[systemKey] || systemKey;
                        
                        return (
                          <div key={systemKey} className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                              <Icon className="h-3.5 w-3.5" />
                              {systemName}
                            </div>
                            <ul className="space-y-2 pl-5">
                              {sysTasks.map(task => (
                                <li key={task.id} className="flex items-start gap-2 text-sm">
                                  {onTaskComplete ? (
                                    <Checkbox
                                      checked={task.completed}
                                      onCheckedChange={() => handleTaskToggle(task.id, !!task.completed)}
                                      className="mt-0.5"
                                      disabled={task.completed}
                                    />
                                  ) : task.completed ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                  ) : null}
                                  
                                  <div className="flex-1 min-w-0">
                                    <span className={cn(
                                      task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                                    )}>
                                      {task.title}
                                    </span>
                                    {task.metaLine && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        {task.metaLine}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Quarter summary */}
            {tasksThisQuarter.length > 0 && (
              <p className="text-xs text-muted-foreground">
                ▸ {tasksThisQuarter.length} tasks this quarter
              </p>
            )}
            
            {/* Unscheduled tasks (if any) */}
            {unscheduledTasks.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Unscheduled
                </h4>
                <ul className="space-y-2">
                  {unscheduledTasks.map(task => (
                    <li key={task.id} className="flex items-start gap-2 text-sm">
                      {onTaskComplete ? (
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleTaskToggle(task.id, !!task.completed)}
                          className="mt-0.5"
                          disabled={task.completed}
                        />
                      ) : null}
                      <span className={cn(
                        task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                      )}>
                        {task.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          /* List View (Legacy Bucket Fallback) */
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No maintenance tasks scheduled
              </p>
            ) : (
              <ul className="space-y-2">
                {tasks.map(task => {
                  const Icon = getSystemIcon(task.systemKey);
                  return (
                    <li key={task.id} className="flex items-start gap-2 text-sm">
                      {onTaskComplete ? (
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleTaskToggle(task.id, !!task.completed)}
                          className="mt-0.5"
                          disabled={task.completed}
                        />
                      ) : task.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                        )}>
                          {task.title}
                        </span>
                        {task.metaLine && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {task.metaLine}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
