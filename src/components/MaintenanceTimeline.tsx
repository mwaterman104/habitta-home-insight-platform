import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Clock, Calendar, Info, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskImpact {
  type: 'prevents' | 'reduces' | 'extends';
  systemName: string;
  description: string; // e.g., "reduces roof moisture risk by ~12%"
}

interface TimelineTask {
  id: string;
  title: string;
  metaLine?: string;
  completed?: boolean;
  systemKey?: string;
  riskImpact?: RiskImpact;
}

interface MaintenanceTimelineProps {
  nowTasks: TimelineTask[];
  thisYearTasks: TimelineTask[];
  futureYearsTasks: TimelineTask[];
  onTaskComplete?: (taskId: string) => void;
  showRiskImpact?: boolean;
}

/**
 * MaintenanceTimeline - Three-bucket task timeline with completion + risk impact
 * NOW – 3 MONTHS | THIS YEAR | NEXT 2–3 YEARS
 * 
 * Surface Job: What prevents change
 * - Completing tasks reduces system risk
 * - Risk impact shown on hover (before) and inline (after completion)
 */
export function MaintenanceTimeline({ 
  nowTasks, 
  thisYearTasks, 
  futureYearsTasks,
  onTaskComplete,
  showRiskImpact = false,
}: MaintenanceTimelineProps) {
  
  const handleTaskToggle = (taskId: string, isCompleted: boolean) => {
    if (onTaskComplete && !isCompleted) {
      onTaskComplete(taskId);
    }
  };

  const getRiskImpactIcon = (type: RiskImpact['type']) => {
    switch (type) {
      case 'prevents': return '🛡️';
      case 'reduces': return '↓';
      case 'extends': return '⏱️';
      default: return '✓';
    }
  };

  const TaskItem = ({ task, interactive = true }: { task: TimelineTask; interactive?: boolean }) => (
    <li className="flex items-start gap-2 text-sm group">
      {interactive && onTaskComplete ? (
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => handleTaskToggle(task.id, !!task.completed)}
          className="mt-0.5"
          disabled={task.completed}
        />
      ) : task.completed ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
      ) : (
        <div className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0 mt-2" />
      )}
      
      <div className="flex-1 min-w-0">
        <span className={cn(
          task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
        )}>
          {task.title}
        </span>
        
        {/* Risk impact hint (before completion) */}
        {showRiskImpact && task.riskImpact && !task.completed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center ml-1.5 text-muted-foreground hover:text-foreground">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">
                  {getRiskImpactIcon(task.riskImpact.type)} {task.riskImpact.description}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Completion benefit (after completion) */}
        {showRiskImpact && task.riskImpact && task.completed && (
          <span className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
            <TrendingDown className="h-3 w-3" />
            {task.riskImpact.description}
          </span>
        )}
      </div>
      
      {task.metaLine && (
        <span className="text-xs text-muted-foreground shrink-0">{task.metaLine}</span>
      )}
    </li>
  );

  const TimelineBucket = ({ 
    label, 
    tasks, 
    icon: Icon,
    urgent = false,
    interactive = true,
  }: { 
    label: string; 
    tasks: TimelineTask[]; 
    icon: React.ElementType;
    urgent?: boolean;
    interactive?: boolean;
  }) => (
    <div className="space-y-2">
      <div className={cn(
        "flex items-center gap-2 text-xs font-medium uppercase tracking-wider",
        urgent ? 'text-amber-600' : 'text-muted-foreground'
      )}>
        <Icon className="h-3.5 w-3.5" />
        {label}
        {tasks.length > 0 && (
          <span className="text-muted-foreground font-normal">
            ({tasks.filter(t => !t.completed).length} remaining)
          </span>
        )}
      </div>
      {tasks.length > 0 ? (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} interactive={interactive} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground italic">No tasks scheduled</p>
      )}
    </div>
  );

  const totalPending = [...nowTasks, ...thisYearTasks, ...futureYearsTasks].filter(t => !t.completed).length;
  const totalCompleted = [...nowTasks, ...thisYearTasks, ...futureYearsTasks].filter(t => t.completed).length;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Maintenance Timeline</CardTitle>
          {totalCompleted > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalCompleted} completed
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Keeping up with these tasks helps maintain your home's health score.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <TimelineBucket 
          label="Now – 3 Months" 
          tasks={nowTasks} 
          icon={Clock}
          urgent={nowTasks.some(t => !t.completed)}
          interactive={true}
        />
        <TimelineBucket 
          label="This Year" 
          tasks={thisYearTasks} 
          icon={Calendar}
          interactive={true}
        />
        <TimelineBucket 
          label="Next 2–3 Years" 
          tasks={futureYearsTasks} 
          icon={Calendar}
          interactive={false}
        />
      </CardContent>
    </Card>
  );
}
