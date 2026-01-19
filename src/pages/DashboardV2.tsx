import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { HomePulse } from '@/components/HomePulse';
import { useAuth } from '@/contexts/AuthContext';
import { useUserHome } from '@/contexts/UserHomeContext';
import { supabase } from '@/integrations/supabase/client';
import { useTaskCompletion } from '@/components/TaskCompletionHandler';
import {
  Home,
  Bell,
  MessageCircle,
  Wrench,
  Thermometer,
  Droplets,
  Zap,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Bot
} from 'lucide-react';

// Exported for testing
export function deriveStatus(replacementProbability?: number | null): 'excellent' | 'great' | 'warning' | 'critical' {
  if (!replacementProbability || replacementProbability < 0.35) return 'excellent';
  if (replacementProbability < 0.55) return 'great';
  if (replacementProbability < 0.85) return 'warning';
  return 'critical';
}

interface Task {
  id: string;
  property_id: string;
  title: string;
  description?: string;
  due_date?: string;
  estimated_cost?: number;
  priority?: string;
  category?: string;
}

interface System {
  id: string;
  property_id: string;
  system_type: string;
  installation_date?: string;
  predicted_replacement_date?: string;
  replacement_probability?: number;
  estimated_lifespan_years?: number;
}

interface Replacement {
  system_type: string;
  predicted_replacement_date?: string;
  replacement_probability?: number;
  cost_min?: number;
  cost_max?: number;
  cost_avg?: number;
}

interface KPIs {
  healthScore?: number;
  completedTasks: number;
  monthSpend: number;
  homeValue?: number;
}

interface FailedState {
  tasks: boolean;
  systems: boolean;
  upcoming: boolean;
  kpis: boolean;
}

// UI Components
const ConnectCard: React.FC<{ 
  title: string; 
  description: string; 
  onRetry: () => void; 
  loading?: boolean;
}> = ({ title, description, onRetry, loading }) => (
  <Card className="border-warning/20 bg-warning/5">
    <CardContent className="p-6 text-center">
      <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-3" />
      <h3 className="font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <Button 
        onClick={onRetry} 
        variant="outline" 
        size="sm"
        disabled={loading}
        className="border-warning text-warning hover:bg-warning/10"
      >
        {loading ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          'Retry Connection'
        )}
      </Button>
    </CardContent>
  </Card>
);

const ProgressRing: React.FC<{ 
  progress: number; 
  status: 'excellent' | 'great' | 'warning' | 'critical';
  size?: number;
}> = ({ progress, status, size = 42 }) => {
  const circumference = 2 * Math.PI * 16;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  const colors = {
    excellent: 'hsl(var(--accent))',
    great: 'hsl(var(--accent))', 
    warning: 'hsl(var(--warning))',
    critical: 'hsl(var(--danger))'
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={16}
          stroke="hsl(var(--muted))"
          strokeWidth={3}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={16}
          stroke={colors[status]}
          strokeWidth={3}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

const TaskRow: React.FC<{ 
  task: Task; 
  onToggle: (id: string) => void;
  isCompleted: boolean;
}> = ({ task, onToggle, isCompleted }) => {
  const getTaskIcon = (category?: string) => {
    if (category?.toLowerCase().includes('hvac')) return <Thermometer className="h-4 w-4" />;
    if (category?.toLowerCase().includes('plumbing')) return <Droplets className="h-4 w-4" />;
    if (category?.toLowerCase().includes('electrical')) return <Zap className="h-4 w-4" />;
    return <Wrench className="h-4 w-4" />;
  };

  const getPriorityColor = (priority?: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => onToggle(task.id)}
        style={{ accentColor: '#0C3629' }}
        className="flex-shrink-0"
      />
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {getTaskIcon(task.category)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.title}
          </h4>
          {task.priority && (
            <Badge variant={getPriorityColor(task.priority)} className="text-xs">
              {task.priority}
            </Badge>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate">
            {task.description}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.estimated_cost && (
          <span className="text-xs font-medium text-muted-foreground">
            ${task.estimated_cost.toLocaleString()}
          </span>
        )}
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
          <Bot className="h-3 w-3 mr-1" />
          Ask AI
        </Button>
      </div>
    </div>
  );
};

const SystemCard: React.FC<{ system: System }> = ({ system }) => {
  const status = deriveStatus(system.replacement_probability);
  const progress = system.replacement_probability ? Math.round(system.replacement_probability * 100) : 15;
  
  const getSystemIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hvac': return <Thermometer className="h-5 w-5" />;
      case 'water_heater': return <Droplets className="h-5 w-5" />;
      case 'roof': return <Home className="h-5 w-5" />;
      case 'electrical': return <Zap className="h-5 w-5" />;
      default: return <Wrench className="h-5 w-5" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical': return 'Needs attention';
      case 'warning': return 'Mid-life';
      case 'great': return 'Good condition';
      case 'excellent': return 'Excellent';
      default: return 'Unknown';
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getSystemIcon(system.system_type)}
          <h4 className="font-medium text-sm capitalize">
            {system.system_type.replace('_', ' ')}
          </h4>
        </div>
        <ProgressRing progress={progress} status={status} size={36} />
      </div>
      
      <div className="space-y-2">
        <Badge variant={getStatusVariant(status)} className="text-xs">
          {getStatusText(status)}
        </Badge>
        
        {system.predicted_replacement_date && (
          <p className="text-xs text-muted-foreground">
            Next: {new Date(system.predicted_replacement_date).getFullYear()}
          </p>
        )}
      </div>
    </Card>
  );
};

const UpcomingItem: React.FC<{ item: Replacement }> = ({ item }) => {
  const statusColor = deriveStatus(item.replacement_probability);
  const dotColor = statusColor === 'critical' ? 'bg-danger' : statusColor === 'warning' ? 'bg-yellow-500' : 'bg-accent';
  
  return (
    <div className="flex items-center gap-3 p-2">
      <div className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium capitalize">
          {item.system_type.replace('_', ' ')}
        </p>
        {item.predicted_replacement_date && (
          <p className="text-xs text-muted-foreground">
            {new Date(item.predicted_replacement_date).toLocaleDateString()}
          </p>
        )}
      </div>
      {item.cost_avg && (
        <span className="text-xs text-muted-foreground">
          ~${item.cost_avg.toLocaleString()}
        </span>
      )}
    </div>
  );
};

const DashboardV2: React.FC = () => {
  const { user } = useAuth();
  const { userHome, loading: homeLoading, fullAddress } = useUserHome();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [upcoming, setUpcoming] = useState<Replacement[]>([]);
  const [kpis, setKpis] = useState<KPIs>({ completedTasks: 0, monthSpend: 0 });
  
  const [loading, setLoading] = useState({
    tasks: true,
    systems: true,
    upcoming: true,
    kpis: true,
  });
  
  const [failed, setFailed] = useState<FailedState>({
    tasks: false,
    systems: false,
    upcoming: false,
    kpis: false,
  });
  
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [retryLoading, setRetryLoading] = useState<Partial<FailedState>>({});

  // Data fetching functions
  const fetchTasks = useCallback(async (isRetry = false) => {
    if (!userHome?.property_id) return;
    
    if (isRetry) {
      setRetryLoading(prev => ({ ...prev, tasks: true }));
    }
    
    try {
      const { data, error } = await supabase
        .from('v_dashboard_smart_tasks')
        .select('id, property_id, title, description, due_date, estimated_cost, priority, category')
        .eq('property_id', userHome.property_id)
        .order('due_date', { ascending: true })
        .limit(6);

      if (error) throw error;
      
      setTasks(data || []);
      setFailed(prev => ({ ...prev, tasks: false }));
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setFailed(prev => ({ ...prev, tasks: true }));
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }));
      if (isRetry) {
        setRetryLoading(prev => ({ ...prev, tasks: false }));
      }
    }
  }, [userHome?.property_id]);

  const fetchSystems = useCallback(async (isRetry = false) => {
    if (!userHome?.property_id) return;
    
    if (isRetry) {
      setRetryLoading(prev => ({ ...prev, systems: true }));
    }
    
    try {
      const { data, error } = await supabase
        .from('v_dashboard_systems')
        .select('id, property_id, system_type, installation_date, predicted_replacement_date, replacement_probability, estimated_lifespan_years')
        .eq('property_id', userHome.property_id)
        .limit(4);

      if (error) throw error;
      
      setSystems(data || []);
      setFailed(prev => ({ ...prev, systems: false }));
    } catch (error) {
      console.error('Failed to fetch systems:', error);
      setFailed(prev => ({ ...prev, systems: true }));
    } finally {
      setLoading(prev => ({ ...prev, systems: false }));
      if (isRetry) {
        setRetryLoading(prev => ({ ...prev, systems: false }));
      }
    }
  }, [userHome?.property_id]);

  const fetchUpcoming = useCallback(async (isRetry = false) => {
    if (!userHome?.property_id) return;
    
    if (isRetry) {
      setRetryLoading(prev => ({ ...prev, upcoming: true }));
    }
    
    try {
      // Note: v_dashboard_replacements might not exist yet, so we'll use systems data
      const { data, error } = await supabase
        .from('v_dashboard_systems')
        .select('system_type, predicted_replacement_date, replacement_probability')
        .eq('property_id', userHome.property_id)
        .not('predicted_replacement_date', 'is', null)
        .order('predicted_replacement_date', { ascending: true })
        .limit(3);

      if (error) throw error;
      
      setUpcoming(data || []);
      setFailed(prev => ({ ...prev, upcoming: false }));
    } catch (error) {
      console.error('Failed to fetch upcoming:', error);
      setFailed(prev => ({ ...prev, upcoming: true }));
    } finally {
      setLoading(prev => ({ ...prev, upcoming: false }));
      if (isRetry) {
        setRetryLoading(prev => ({ ...prev, upcoming: false }));
      }
    }
  }, [userHome?.property_id]);

  const fetchKpis = useCallback(async (isRetry = false) => {
    if (!userHome?.property_id || !user?.id) return;
    
    if (isRetry) {
      setRetryLoading(prev => ({ ...prev, kpis: true }));
    }
    
    try {
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);

      // Fetch health score
      const { data: propertyData } = await supabase
        .from('properties')
        .select('health_score')
        .eq('id', userHome.property_id)
        .single();

      // Fetch completed tasks this month
      const { data: tasksData } = await supabase
        .from('maintenance_tasks')
        .select('id')
        .eq('user_id', user.id)
        .gte('completed_date', firstOfMonth.toISOString())
        .not('completed_date', 'is', null);

      // Fetch project spending this month
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id);

      let monthSpend = 0;
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);
        const { data: budgetsData } = await supabase
          .from('project_budgets')
          .select('actual_amount')
          .in('project_id', projectIds)
          .gte('created_at', firstOfMonth.toISOString());
        
        monthSpend = budgetsData?.reduce((sum, b) => sum + (b.actual_amount || 0), 0) || 0;
      }

      setKpis({
        healthScore: propertyData?.health_score || undefined,
        completedTasks: tasksData?.length || 0,
        monthSpend,
      });
      
      setFailed(prev => ({ ...prev, kpis: false }));
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
      setFailed(prev => ({ ...prev, kpis: true }));
    } finally {
      setLoading(prev => ({ ...prev, kpis: false }));
      if (isRetry) {
        setRetryLoading(prev => ({ ...prev, kpis: false }));
      }
    }
  }, [userHome?.property_id, user?.id]);

  // Initial data fetch
  useEffect(() => {
    if (userHome?.property_id && user?.id) {
      Promise.all([
        fetchTasks(),
        fetchSystems(),
        fetchUpcoming(),
        fetchKpis(),
      ]);
    }
  }, [userHome?.property_id, user?.id, fetchTasks, fetchSystems, fetchUpcoming, fetchKpis]);

  // Derived alert logic
  const priorityAlert = React.useMemo(() => {
    // Check for critical systems
    const criticalSystems = systems.filter(s => deriveStatus(s.replacement_probability) === 'critical');
    if (criticalSystems.length > 0) {
      return {
        type: 'urgent',
        title: 'Urgent System Attention Required',
        message: `${criticalSystems.length} system(s) need immediate attention to prevent failure.`,
        systems: criticalSystems.map(s => s.system_type.replace('_', ' ')).join(', ')
      };
    }

    // Check for tasks due within 7 days
    const urgentTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const today = new Date();
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7 && daysDiff >= 0;
    });

    if (urgentTasks.length > 0) {
      return {
        type: 'upcoming',
        title: 'Tasks Due This Week',
        message: `${urgentTasks.length} maintenance task(s) scheduled for completion.`,
        tasks: urgentTasks.map(t => t.title).join(', ')
      };
    }

    return null;
  }, [systems, tasks]);

  const { toggleTaskCompletion, completingTasks } = useTaskCompletion();

  const handleTaskToggle = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const isCurrentlyCompleted = completedTasks.has(taskId);
    
    // Optimistic UI update
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
    
    // Persist to database with risk tracking
    await toggleTaskCompletion(
      taskId, 
      !isCurrentlyCompleted,
      task?.category,
      userHome?.id
    );
  };

  if (homeLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">H</span>
            </div>
            <span className="font-semibold text-lg">Habitta</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full" />
            </Button>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-sm">
                <div className="font-medium">{user?.email?.split('@')[0]}</div>
                <div className="text-xs text-muted-foreground truncate max-w-32">
                  {fullAddress}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Priority Alert */}
        {priorityAlert && (
          <Card className="border-danger/20 bg-danger/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{priorityAlert.title}</h3>
                    <Badge variant="destructive" className="text-xs">
                      Due This Week
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {priorityAlert.message}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Schedule Service
                </Button>
                <Button variant="outline" size="sm">
                  Find Contractors
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Remind me tomorrow
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <HomePulse
              homeAddress={fullAddress || undefined}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-accent mb-1">
                {kpis.healthScore || '—'}
              </div>
              <div className="text-xs text-muted-foreground">Home Health</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground mb-1">—</div>
              <div className="text-xs text-muted-foreground">Home Value</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground mb-1">
                ${kpis.monthSpend.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">This Month</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-accent mb-1">
                {kpis.completedTasks}
              </div>
              <div className="text-xs text-muted-foreground">
                Tasks Done
                <span className="text-accent ml-1">↗ +3</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Today's Tasks
                  {tasks.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {tasks.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.tasks ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : failed.tasks ? (
                  <ConnectCard
                    title="Unable to load tasks"
                    description="We couldn't fetch your maintenance tasks right now."
                    onRetry={() => fetchTasks(true)}
                    loading={retryLoading.tasks}
                  />
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                    <p>No tasks scheduled for today!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={handleTaskToggle}
                        isCompleted={completedTasks.has(task.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  System Health Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.systems ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : failed.systems ? (
                  <ConnectCard
                    title="Unable to load system data"
                    description="We couldn't fetch your home systems information."
                    onRetry={() => fetchSystems(true)}
                    loading={retryLoading.systems}
                  />
                ) : systems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Home className="h-8 w-8 mx-auto mb-2" />
                    <p>No system data available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {systems.map((system) => (
                      <SystemCard key={system.id} system={system} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.kpis ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : failed.kpis ? (
                  <ConnectCard
                    title="Unable to load KPIs"
                    description="We couldn't fetch your property statistics."
                    onRetry={() => fetchKpis(true)}
                    loading={retryLoading.kpis}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Saved vs Emergency</span>
                      <span className="text-sm text-muted-foreground">—</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Monthly Budget</span>
                      <span className="text-sm text-muted-foreground">—</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Tasks Completed</span>
                      <span className="text-sm font-medium text-accent">
                        {kpis.completedTasks}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coming Up */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Coming Up
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.upcoming ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : failed.upcoming ? (
                  <ConnectCard
                    title="Unable to load upcoming items"
                    description="We couldn't fetch your upcoming replacements."
                    onRetry={() => fetchUpcoming(true)}
                    loading={retryLoading.upcoming}
                  />
                ) : upcoming.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p>Nothing scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {upcoming.map((item, index) => (
                      <UpcomingItem key={index} item={item} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* FAB */}
      <Button
        className="fixed bottom-6 right-6 h-12 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
        size="sm"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        ChatDIY
      </Button>
    </div>
  );
};

export default DashboardV2;