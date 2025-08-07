import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppSidebar from '@/components/AppSidebar';
import { 
  Plus, 
  Upload, 
  Camera, 
  Calendar,
  Home,
  CheckCircle,
  AlertTriangle,
  FileText,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  totalDocuments: number;
  totalDiagnoses: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    totalDocuments: 0,
    totalDiagnoses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch maintenance tasks
      const { data: tasks } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch documents count
      const { count: documentsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Fetch diagnoses count
      const { count: diagnosesCount } = await supabase
        .from('diagnoses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      const totalTasks = tasks?.length || 0;
      const pendingTasks = tasks?.filter(task => task.status === 'pending').length || 0;
      const completedTasks = tasks?.filter(task => task.status === 'completed').length || 0;

      setStats({
        totalTasks,
        pendingTasks,
        completedTasks,
        totalDocuments: documentsCount || 0,
        totalDiagnoses: diagnosesCount || 0,
      });

      setRecentTasks(tasks || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthScore = () => {
    if (stats.totalTasks === 0) return 85; // Default good score
    const completionRate = (stats.completedTasks / stats.totalTasks) * 100;
    if (completionRate >= 80) return 90;
    if (completionRate >= 60) return 75;
    if (completionRate >= 40) return 60;
    return 45;
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-success-green' };
    if (score >= 60) return { label: 'Good', color: 'text-info-blue' };
    if (score >= 40) return { label: 'Fair', color: 'text-chatdiy-yellow' };
    return { label: 'Needs Attention', color: 'text-error-red' };
  };

  const healthScore = getHealthScore();
  const healthStatus = getHealthStatus(healthScore);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <main className="flex-1 p-6">
          <div className="flex items-center gap-4 mb-8">
            <SidebarTrigger />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </h1>
              <p className="text-muted-foreground">Here's what's happening with your home today.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Home Health Score */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Home Health Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{healthScore}</span>
                    </div>
                    <Progress value={healthScore} className="w-full h-full [&>div]:rounded-full" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold ${healthStatus.color}`}>
                      {healthStatus.label}
                    </h3>
                    <p className="text-muted-foreground">
                      {stats.pendingTasks} tasks due this week
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-success-green" />
                    <div>
                      <p className="text-2xl font-bold">{stats.completedTasks}</p>
                      <p className="text-sm text-muted-foreground">Completed Tasks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-chatdiy-yellow" />
                    <div>
                      <p className="text-2xl font-bold">{stats.pendingTasks}</p>
                      <p className="text-sm text-muted-foreground">Pending Tasks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link to="/tasks">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Plus className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">Add Task</h3>
                  <p className="text-sm text-muted-foreground">Create maintenance reminder</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/documents">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Upload className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">Upload Document</h3>
                  <p className="text-sm text-muted-foreground">Store important files</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/diagnosis">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Camera className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">Get AI Help</h3>
                  <p className="text-sm text-muted-foreground">Diagnose an issue</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/tasks">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">View Calendar</h3>
                  <p className="text-sm text-muted-foreground">See upcoming tasks</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentTasks.length > 0 ? (
                  <div className="space-y-4">
                    {recentTasks.slice(0, 3).map((task: any) => (
                      <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg border">
                        <CheckCircle className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(task.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No recent activity. Start by adding your first task!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentTasks.filter((task: any) => task.status === 'pending').length > 0 ? (
                  <div className="space-y-4">
                    {recentTasks
                      .filter((task: any) => task.status === 'pending')
                      .slice(0, 3)
                      .map((task: any) => (
                        <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg border">
                          <AlertTriangle className="w-4 h-4 text-chatdiy-yellow" />
                          <div className="flex-1">
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {task.due_date 
                                ? new Date(task.due_date).toLocaleDateString()
                                : 'No due date'
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No upcoming tasks. You're all caught up!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;