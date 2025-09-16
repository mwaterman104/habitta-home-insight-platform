import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Wrench, 
  User,
  Calendar,
  AlertTriangle,
  ChevronRight,
  HelpCircle,
  Loader2
} from "lucide-react";
import { useIntelligenceTasks } from "@/hooks/useIntelligenceEngine";
import { useUserHome } from "@/hooks/useUserHome";

interface SmartTask {
  id: string;
  title: string;
  description: string;
  priority: 'today' | 'this_week' | 'upcoming';
  ownership: 'diy' | 'pro' | 'either';
  estimatedTime?: string;
  estimatedCost?: number;
  weatherTriggered?: boolean;
  preventativeSavings?: number;
  dueDate?: string;
  category: string;
}

interface SmartToDoEngineProps {
  tasks?: SmartTask[];
  completionRate?: number;
}

// Mock smart tasks with weather and predictive logic
const mockSmartTasks: SmartTask[] = [
  {
    id: '1',
    title: 'Clear gutters before tonight\'s storm',
    description: 'Heavy rain expected. Clear debris to prevent overflow damage.',
    priority: 'today',
    ownership: 'diy',
    estimatedTime: '15 min',
    weatherTriggered: true,
    preventativeSavings: 1200,
    category: 'Storm Prep'
  },
  {
    id: '2', 
    title: 'Replace HVAC filter (overdue)',
    description: 'System efficiency dropping. Replace to maintain optimal performance.',
    priority: 'today',
    ownership: 'diy',
    estimatedTime: '5 min',
    estimatedCost: 25,
    preventativeSavings: 150,
    dueDate: '2024-01-15',
    category: 'HVAC'
  },
  {
    id: '3',
    title: 'Schedule furnace tune-up',
    description: 'Annual maintenance due. Book before winter peak season.',
    priority: 'this_week',
    ownership: 'pro',
    estimatedCost: 180,
    preventativeSavings: 400,
    category: 'HVAC'
  },
  {
    id: '4',
    title: 'Seal windows before cold snap',
    description: 'Temperatures dropping 20°F this week. Seal gaps to prevent heat loss.',
    priority: 'this_week',
    ownership: 'either',
    estimatedTime: '2 hours',
    estimatedCost: 45,
    weatherTriggered: true,
    preventativeSavings: 200,
    category: 'Energy'
  },
  {
    id: '5',
    title: 'Test smoke detectors',
    description: 'Monthly safety check due.',
    priority: 'upcoming',
    ownership: 'diy',
    estimatedTime: '10 min',
    category: 'Safety'
  }
];

export const SmartToDoEngine: React.FC<SmartToDoEngineProps> = ({ 
  tasks,
  completionRate
}) => {
  const { userHome } = useUserHome();
  const propertyId = userHome?.property_id;
  
  // Use Intelligence Engine for real data
  const { data: intelligenceData, loading, error } = useIntelligenceTasks(propertyId);
  
  // Use real data if available, fallback to props, then mock data
  const actualTasks = intelligenceData?.tasks || tasks || mockSmartTasks;
  const actualCompletionRate = intelligenceData?.completionRate || completionRate || 87;
  const todayTasks = actualTasks.filter(t => t.priority === 'today');
  const thisWeekTasks = actualTasks.filter(t => t.priority === 'this_week');
  const upcomingTasks = actualTasks.filter(t => t.priority === 'upcoming');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'today': return 'bg-danger text-danger-foreground';
      case 'this_week': return 'bg-warning text-warning-foreground';
      case 'upcoming': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getOwnershipIcon = (ownership: string) => {
    switch (ownership) {
      case 'diy': return <Wrench className="h-3 w-3" />;
      case 'pro': return <User className="h-3 w-3" />;
      case 'either': return <ChevronRight className="h-3 w-3" />;
      default: return null;
    }
  };

  const TaskRow = ({ task }: { task: SmartTask }) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors touch-friendly">
      <div className="flex items-start gap-3 flex-1 mb-3 md:mb-0">
        <CheckCircle2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
            <h4 className="font-medium text-sm md:text-base">{task.title}</h4>
            {task.weatherTriggered && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 self-start">
                Weather Alert
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mb-3">{task.description}</p>
          
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs text-muted-foreground">
            {task.estimatedTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{task.estimatedTime}</span>
              </div>
            )}
            {task.estimatedCost && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>${task.estimatedCost}</span>
              </div>
            )}
            {task.preventativeSavings && (
              <div className="flex items-center gap-1 text-accent font-medium">
                <span>Saves ${task.preventativeSavings}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between md:justify-end gap-2 md:ml-4">
        <Badge variant="outline" className="text-xs">
          {getOwnershipIcon(task.ownership)}
          <span className="ml-1 hidden md:inline">{task.ownership.toUpperCase()}</span>
          <span className="ml-1 md:hidden">{task.ownership}</span>
        </Badge>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Smart To-Do
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {intelligenceData && (
              <Badge variant="outline" className="text-xs">
                AI-Powered
              </Badge>
            )}
          </CardTitle>
          <div className="text-right">
            <div className="text-sm font-medium">{actualCompletionRate}%</div>
            <div className="text-xs text-muted-foreground">
              {intelligenceData ? 'AI Completion Rate' : 'Completion Rate'}
            </div>
          </div>
        </div>
        <Progress value={actualCompletionRate} className="h-2" />
        {intelligenceData?.confidence && (
          <div className="text-xs text-muted-foreground">
            Confidence: {Math.round(intelligenceData.confidence * 100)}%
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4 md:space-y-6">
        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
            <p className="text-sm text-danger">Unable to load AI recommendations. Using backup data.</p>
          </div>
        )}
        
        {intelligenceData?.totalSavings && (
          <div className="p-3 md:p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm md:text-base text-accent font-medium">
              💡 Complete these tasks to save ${intelligenceData.totalSavings.toLocaleString()} this year
            </p>
          </div>
        )}
        {/* Today Section */}
        {todayTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={getPriorityColor('today')}>
                Today ({todayTasks.length})
              </Badge>
              <span className="text-sm text-muted-foreground">Priority actions</span>
            </div>
            <div className="space-y-2 md:space-y-3">
              {todayTasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          </div>
        )}

        {/* This Week Section */}
        {thisWeekTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={getPriorityColor('this_week')}>
                This Week ({thisWeekTasks.length})
              </Badge>
              <span className="text-sm text-muted-foreground">Plan ahead</span>
            </div>
            <div className="space-y-2 md:space-y-3">
              {thisWeekTasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {upcomingTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={getPriorityColor('upcoming')}>
                Upcoming ({upcomingTasks.length})
              </Badge>
              <span className="text-sm text-muted-foreground">Coming soon</span>
            </div>
            <div className="space-y-2 md:space-y-3">
              {upcomingTasks.slice(0, 2).map(task => <TaskRow key={task.id} task={task} />)}
            </div>
            {upcomingTasks.length > 2 && (
              <Button variant="ghost" size="sm" className="w-full mt-2">
                View {upcomingTasks.length - 2} more upcoming tasks
              </Button>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <Button className="w-full">
            View Complete Task Timeline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};