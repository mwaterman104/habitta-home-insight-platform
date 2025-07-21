import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Calendar, DollarSign, CheckCircle, Clock, Hammer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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
}

const ProjectDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});
  const [loading, setLoading] = useState(true);
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

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(task => task.is_completed).length || 0;
      const totalCost = budgets?.reduce((sum, budget) => sum + (budget.estimated_amount || 0), 0) || 0;
      const actualCost = budgets?.reduce((sum, budget) => sum + (budget.actual_amount || 0), 0) || 0;

      return { totalTasks, completedTasks, totalCost, actualCost };
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Projects</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-2 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">My Projects</h2>
          <p className="text-muted-foreground">
            Manage your home improvement projects and track progress
          </p>
        </div>
        <Button onClick={() => navigate('/templates')} className="gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Hammer className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">No projects yet</h3>
            <p className="text-muted-foreground max-w-md">
              Start your first home improvement project by choosing from our templates
            </p>
          </div>
          <Button onClick={() => navigate('/templates')} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Project
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const stats = projectStats[project.id] || { totalTasks: 0, completedTasks: 0, totalCost: 0, actualCost: 0 };
            const progress = getProgressPercentage(stats);

            return (
              <Card 
                key={project.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{project.room_type}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {project.status.replace('_', ' ')}
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
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>{stats.completedTasks}/{stats.totalTasks} tasks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span>{formatCurrency(stats.totalCost)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;