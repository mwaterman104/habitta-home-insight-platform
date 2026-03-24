import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle, DollarSign, Calendar, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import TasksTab from './workspace/TasksTab';
import MaterialsTab from './workspace/MaterialsTab';
import BudgetTab from './workspace/BudgetTab';
import TimelineTab from './workspace/TimelineTab';
import AIAssistantTab from './workspace/AIAssistantTab';

interface Project {
  id: string;
  title: string;
  room_type: string;
  status: string;
  description?: string;
  created_at: string;
}

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  totalCost: number;
  actualCost: number;
}

const ProjectWorkspace = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats>({ totalTasks: 0, completedTasks: 0, totalCost: 0, actualCost: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchStats();
    }
  }, [projectId, refreshTrigger]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
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

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(task => task.is_completed).length || 0;
      const totalCost = budgets?.reduce((sum, budget) => sum + (budget.estimated_amount || 0), 0) || 0;
      const actualCost = budgets?.reduce((sum, budget) => sum + (budget.actual_amount || 0), 0) || 0;

      setStats({ totalTasks, completedTasks, totalCost, actualCost });
    } catch (error) {
      console.error('Error fetching project stats:', error);
    }
  };

  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'on_hold': return 'outline';
      default: return 'default';
    }
  };

  const getProgressPercentage = () => {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
          <div className="h-8 bg-muted rounded w-64 animate-pulse"></div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-2 bg-muted rounded animate-pulse"></div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <h3 className="text-lg font-semibold">Project not found</h3>
        <p className="text-muted-foreground">The project you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const progress = getProgressPercentage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <Badge variant={getStatusBadgeVariant(project.status)}>
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground">{project.room_type} • Created {new Date(project.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Project Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Project Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{progress}% Complete</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="font-semibold">{stats.completedTasks}/{stats.totalTasks} Complete</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="font-semibold">{formatCurrency(stats.totalCost)} Estimated</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Spent</p>
                <p className="font-semibold">{formatCurrency(stats.actualCost)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Workspace Tabs */}
      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="assistant" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            AI Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <TasksTab projectId={project.id} onDataChange={handleDataChange} />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsTab projectId={project.id} onDataChange={handleDataChange} />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetTab projectId={project.id} onDataChange={handleDataChange} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab projectId={project.id} onDataChange={handleDataChange} />
        </TabsContent>

        <TabsContent value="assistant">
          <AIAssistantTab projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectWorkspace;