import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, DollarSign, FileText, Bot, Home, Wrench, TrendingUp, Building, Upload, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface HomeData {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type?: string;
  photo_url?: string;
  year_built?: number;
  square_feet?: number;
  bedrooms?: number;
  bathrooms?: number;
  property_id?: string;
}

interface HomeStats {
  conditionScore: number;
  avmValue: number;
  avmRange: { low: number; high: number };
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalDocs: number;
}

interface SystemItem {
  id: string;
  system: string;
  item_name: string;
  urgency: number;
  estimated_cost: number | null;
  last_service_date: string | null;
  next_service_due: string | null;
}

const HomeProfilePage = () => {
  const { homeId } = useParams<{ homeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [home, setHome] = useState<HomeData | null>(null);
  const [stats, setStats] = useState<HomeStats>({
    conditionScore: 0,
    avmValue: 0,
    avmRange: { low: 0, high: 0 },
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalDocs: 0
  });
  const [systems, setSystems] = useState<SystemItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (homeId) {
      fetchHomeData();
    }
  }, [homeId, user]);

  const fetchHomeData = async () => {
    if (!user || !homeId) return;
    
    try {
      setLoading(true);
      
      // Fetch home details
      const { data: homeData, error: homeError } = await supabase
        .from('homes')
        .select('*')
        .eq('id', homeId)
        .eq('user_id', user.id)
        .single();

      if (homeError) throw homeError;
      setHome(homeData);

      if (homeData?.property_id) {
        // Fetch condition score
        const { data: signals } = await supabase
          .from('maintenance_signals')
          .select('value')
          .eq('property_id', homeData.property_id)
          .eq('signal', 'condition_score')
          .order('created_at', { ascending: false })
          .limit(1);

        // Fetch AVM data
        const { data: valuations } = await supabase
          .from('valuations')
          .select('avm_value, avm_low, avm_high')
          .eq('property_id', homeData.property_id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Fetch renovation items (systems)
        const { data: renovationItems } = await supabase
          .from('renovation_items')
          .select('*')
          .eq('property_id', homeData.property_id)
          .order('urgency', { ascending: false });

        setSystems(renovationItems || []);

        setStats(prev => ({
          ...prev,
          conditionScore: signals?.[0]?.value || 85,
          avmValue: valuations?.[0]?.avm_value || 0,
          avmRange: {
            low: valuations?.[0]?.avm_low || 0,
            high: valuations?.[0]?.avm_high || 0
          }
        }));
      }

      // Fetch tasks data
      const { data: tasks } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('home_id', homeId)
        .order('created_at', { ascending: false })
        .limit(5);

      const completedTasks = tasks?.filter(task => task.status === 'completed').length || 0;
      const totalTasks = tasks?.length || 0;

      // Fetch documents count
      const { data: docs } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id)
        .eq('home_id', homeId);

      setRecentTasks(tasks || []);
      setStats(prev => ({
        ...prev,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        totalDocs: docs?.length || 0
      }));

    } catch (error) {
      console.error('Error fetching home data:', error);
      toast({
        title: "Error",
        description: "Failed to load home data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getConditionBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', variant: 'default' as const };
    if (score >= 80) return { label: 'Good', variant: 'secondary' as const };
    if (score >= 70) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Needs Attention', variant: 'destructive' as const };
  };

  const getSystemIcon = (system: string) => {
    const icons: Record<string, any> = {
      hvac: Building,
      roof: Home,
      plumbing: Wrench,
      electrical: Wrench,
      appliances: Building
    };
    return icons[system] || Wrench;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-24 bg-muted rounded-2xl mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Home not found</h3>
          <p className="text-muted-foreground">This home doesn't exist or you don't have access to it.</p>
        </div>
        <Button onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const conditionBadge = getConditionBadge(stats.conditionScore);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="border-0 bg-gradient-to-r from-habitta-green/5 to-habitta-light-green/5 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {home.photo_url && (
                <img 
                  src={home.photo_url} 
                  alt="Home"
                  className="w-16 h-16 rounded-xl object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-habitta-green">
                  {home.address}
                </h1>
                <p className="text-gray-medium">
                  {home.city}, {home.state} {home.zip_code}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant={conditionBadge.variant}>
                    {conditionBadge.label} ({stats.conditionScore}%)
                  </Badge>
                  {stats.avmValue > 0 && (
                    <Badge variant="outline">
                      AVM: {formatCurrency(stats.avmValue)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" />
                Upload Doc
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-1" />
                Get Report
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-1" />
                Calendar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-habitta-green" />
              Home Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.conditionScore}%</div>
                <div className="text-xs text-muted-foreground">Overall Score</div>
              </div>
              <Progress value={stats.conditionScore} className="w-16 h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="w-4 h-4 text-habitta-green" />
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}/{stats.totalTasks}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
            {stats.totalTasks > 0 && (
              <Progress value={(stats.completedTasks / stats.totalTasks) * 100} className="w-full h-1 mt-2" />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-habitta-green" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocs}</div>
            <div className="text-xs text-muted-foreground">Stored</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-habitta-green" />
              Value Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {stats.avmRange.low > 0 ? 
                `${formatCurrency(stats.avmRange.low)} - ${formatCurrency(stats.avmRange.high)}` :
                'N/A'
              }
            </div>
            <div className="text-xs text-muted-foreground">Estimated Range</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-6 text-center">
            <Plus className="w-8 h-8 mx-auto mb-2 text-habitta-green" />
            <div className="font-medium">Add Task</div>
            <div className="text-xs text-muted-foreground">Create new task</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-6 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-habitta-green" />
            <div className="font-medium">Upload Document</div>
            <div className="text-xs text-muted-foreground">Store important files</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-6 text-center">
            <Bot className="w-8 h-8 mx-auto mb-2 text-habitta-green" />
            <div className="font-medium">Get AI Help</div>
            <div className="text-xs text-muted-foreground">Ask AI assistant</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-6 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-habitta-green" />
            <div className="font-medium">View Calendar</div>
            <div className="text-xs text-muted-foreground">Schedule tasks</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
          <TabsTrigger value="renovations">Renovations</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTasks.length > 0 ? (
                  <div className="space-y-3">
                    {recentTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div>
                          <div className="font-medium">{task.title}</div>
                          <div className="text-sm text-muted-foreground">{task.category}</div>
                        </div>
                        <Badge variant={task.status === 'completed' ? 'default' : 'outline'}>
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTasks.filter(task => task.status === 'pending').length > 0 ? (
                  <div className="space-y-3">
                    {recentTasks.filter(task => task.status === 'pending').slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div>
                          <div className="font-medium">{task.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}
                          </div>
                        </div>
                        <Badge variant="outline">{task.priority}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming tasks
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="systems" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systems.length > 0 ? systems.map((item) => {
              const Icon = getSystemIcon(item.system);
              return (
                <Card key={item.id} className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 capitalize">
                      <Icon className="w-4 h-4" />
                      {item.system}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="font-medium">{item.item_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Urgency: {item.urgency}/5
                      </div>
                      {item.estimated_cost && (
                        <div className="text-sm">
                          Est. Cost: {formatCurrency(item.estimated_cost)}
                        </div>
                      )}
                      {item.next_service_due && (
                        <div className="text-sm text-orange-600">
                          Due: {new Date(item.next_service_due).toLocaleDateString()}
                        </div>
                      )}
                      <Button size="sm" variant="outline" className="w-full mt-2">
                        Create Task
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <div>No system data available</div>
                <Button variant="outline" className="mt-4">
                  Get New Report
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="valuation" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Property Valuation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-habitta-green">
                    {stats.avmValue > 0 ? formatCurrency(stats.avmValue) : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Current AVM</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold">
                    {stats.avmRange.low > 0 ? 
                      `${formatCurrency(stats.avmRange.low)} - ${formatCurrency(stats.avmRange.high)}` :
                      'N/A'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Value Range</div>
                </div>
                <div className="text-center">
                  <Button variant="outline">
                    Get Updated Valuation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renovations" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Renovation Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {systems.length > 0 ? (
                <div className="space-y-3">
                  {systems.sort((a, b) => b.urgency - a.urgency).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                      <div>
                        <div className="font-medium">{item.item_name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {item.system} • Urgency: {item.urgency}/5
                        </div>
                        {item.estimated_cost && (
                          <div className="text-sm font-medium text-habitta-green">
                            {formatCurrency(item.estimated_cost)}
                          </div>
                        )}
                      </div>
                      <Button size="sm">Create Task</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div>No renovation recommendations available</div>
                  <Button variant="outline" className="mt-4">
                    Get Property Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Document Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <div>Document management coming soon</div>
                <Button variant="outline" className="mt-4">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HomeProfilePage;