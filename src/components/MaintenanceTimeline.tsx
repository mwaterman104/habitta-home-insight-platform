import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Calendar } from "lucide-react";

interface TimelineTask {
  id: string;
  title: string;
  metaLine?: string;
  completed?: boolean;
}

interface MaintenanceTimelineProps {
  nowTasks: TimelineTask[];
  thisYearTasks: TimelineTask[];
  futureYearsTasks: TimelineTask[];
}

/**
 * MaintenanceTimeline - Three-bucket task timeline
 * NOW – 3 MONTHS | THIS YEAR | NEXT 2–3 YEARS
 */
export function MaintenanceTimeline({ 
  nowTasks, 
  thisYearTasks, 
  futureYearsTasks 
}: MaintenanceTimelineProps) {
  const TimelineBucket = ({ 
    label, 
    tasks, 
    icon: Icon,
    urgent = false 
  }: { 
    label: string; 
    tasks: TimelineTask[]; 
    icon: React.ElementType;
    urgent?: boolean;
  }) => (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${
        urgent ? 'text-amber-600' : 'text-muted-foreground'
      }`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {tasks.length > 0 ? (
        <ul className="space-y-1.5">
          {tasks.map((task) => (
            <li 
              key={task.id} 
              className={`flex items-center gap-2 text-sm ${
                task.completed ? 'text-muted-foreground line-through' : 'text-gray-700'
              }`}
            >
              {task.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
              )}
              <span>{task.title}</span>
              {task.metaLine && (
                <span className="text-xs text-muted-foreground ml-auto">{task.metaLine}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground italic">No tasks scheduled</p>
      )}
    </div>
  );

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Maintenance Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <TimelineBucket 
          label="Now – 3 Months" 
          tasks={nowTasks} 
          icon={Clock}
          urgent={nowTasks.length > 0}
        />
        <TimelineBucket 
          label="This Year" 
          tasks={thisYearTasks} 
          icon={Calendar}
        />
        <TimelineBucket 
          label="Next 2–3 Years" 
          tasks={futureYearsTasks} 
          icon={Calendar}
        />
      </CardContent>
    </Card>
  );
}
