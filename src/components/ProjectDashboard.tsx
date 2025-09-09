import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, DollarSign, CheckCircle, Clock, Hammer, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format, isBefore } from 'date-fns';

interface Project {
  id: string;
  title: string;
  room_type: string;
  status: string;
  description?: string;
  created_at: string;
  template_id?: string;
}

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  totalCost: number;
  actualCost: number;
  dueDate?: string;
  dueDateStatus?: 'on-time' | 'at-risk' | 'overdue';
}

const ProjectDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);

      // Fetch stats for each project
      if (data) {
        const stats: Record<string, ProjectStats> = {};
        for (const project of data) {
          stats[project.id] = await fetchProjectStats(project.id);
        }
        setProjectStats(stats);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectStats = async (projectId: string): Promise<ProjectStats> => {
    try {
      // Fetch task stats
      const { data: tasks } = await supabase
        .from('tasks')
        .select('is_completed')
        .eq('project_id', projectId);

      // Fetch budget stats
      const { data: budgets } = await supabase
        .from('project_budgets')
        .select('estimated_amount, actual_amount')
        .eq('project_id', projectId);

      // Fetch project timeline for due date
      const { data: timelines } = await supabase
        .from('project_timelines')
        .select('target_date')
        .eq('project_id', projectId)
        .order('target_date', { ascending: false })
        .limit(1);

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(task => task.is_completed).length || 0;
      const totalCost = budgets?.reduce((sum, budget) => sum + (budget.estimated_amount || 0), 0) || 0;
      const actualCost = budgets?.reduce((sum, budget) => sum + (budget.actual_amount || 0), 0) || 0;
      
      // Calculate due date status
      let dueDate: string | undefined;
      let dueDateStatus: 'on-time' | 'at-risk' | 'overdue' | undefined;
      
      if (timelines && timelines.length > 0 && timelines[0].target_date) {
        dueDate = timelines[0].target_date;
        const today = new Date();
        const targetDate = new Date(dueDate);
        const daysUntilDue = differenceInDays(targetDate, today);
        
        if (isBefore(targetDate, today)) {
          dueDateStatus = 'overdue';
        } else if (daysUntilDue <= 7) {
          dueDateStatus = 'at-risk';
        } else {
          dueDateStatus = 'on-time';
        }
      }

      return { 
        totalTasks, 
        completedTasks, 
        totalCost, 
        actualCost, 
        dueDate,
        dueDateStatus
      };
    } catch (error) {
      console.error('Error fetching project stats:', error);
      return { totalTasks: 0, completedTasks: 0, totalCost: 0, actualCost: 0 };
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'on_hold': return 'outline';
      default: return 'default';
    }
  };

  const getDueDateColor = (dueDateStatus?: string) => {
    switch (dueDateStatus) {
      case 'overdue': return 'text-destructive';
      case 'at-risk': return 'text-warning';
      case 'on-time': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getDueDateIcon = (dueDateStatus?: string) => {
    switch (dueDateStatus) {
      case 'overdue': return AlertTriangle;
      case 'at-risk': return Clock;
      default: return Calendar;
    }
  };

  const getProgressPercentage = (stats: ProjectStats) => {
    if (stats.totalTasks === 0) return 0;
    return Math.round((stats.completedTasks / stats.totalTasks) * 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filterProjects = (projects: Project[], tab: string) => {
    switch (tab) {
      case 'active':
        return projects.filter(p => p.status === 'active');
      case 'planned':
        return projects.filter(p => p.status === 'on_hold');
      case 'completed':
        return projects.filter(p => p.status === 'completed');
      default:
        return projects;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Projects</h1>
          <Button onClick={() => navigate('/templates')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="planned">Planned</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-2 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Projects</h1>
          <p className="text-muted-foreground">
            Manage your home improvement projects and track progress
          </p>
        </div>
        <Button onClick={() => navigate('/templates')} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Project
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="planned">Planned</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {(() => {
            const filteredProjects = filterProjects(projects, activeTab);
            
            if (filteredProjects.length === 0) {
              return (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <Hammer className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {activeTab === 'active' && 'No active projects'}
                      {activeTab === 'planned' && 'No planned projects'}
                      {activeTab === 'completed' && 'No completed projects'}
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {activeTab === 'active' && 'Start a new project to get organized with your home improvements'}
                      {activeTab === 'planned' && 'Projects on hold will appear here'}
                      {activeTab === 'completed' && 'Completed projects will appear here for your records'}
                    </p>
                  </div>
                  {activeTab === 'active' && (
                    <Button onClick={() => navigate('/templates')} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Your First Project
                    </Button>
                  )}
                </div>
              );
            }

            return (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => {
                  const stats = projectStats[project.id] || { totalTasks: 0, completedTasks: 0, totalCost: 0, actualCost: 0 };
                  const progress = getProgressPercentage(stats);
                  const DueDateIcon = getDueDateIcon(stats?.dueDateStatus);

                  return (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{project.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{project.room_type}</p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(project.status)}>
                            {project.status === 'on_hold' ? 'planned' : project.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-primary" />
                            <span>{stats.completedTasks}/{stats.totalTasks} tasks</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-success" />
                            <span>{formatCurrency(stats.totalCost)}</span>
                          </div>
                        </div>

                        {stats?.dueDate && (
                          <div className={`flex items-center gap-2 text-sm ${getDueDateColor(stats.dueDateStatus)}`}>
                            <DueDateIcon className="w-4 h-4" />
                            <span>Due {format(new Date(stats.dueDate), 'MMM d, yyyy')}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <span className="text-xs text-muted-foreground">
                            Created {new Date(project.created_at).toLocaleDateString()}
                          </span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/project/${project.id}`)}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDashboard;