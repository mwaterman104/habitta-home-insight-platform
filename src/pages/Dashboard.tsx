import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchHomesageReport } from '@/lib/homesageClient';
import { generateSeasonalPlan } from '@/lib/maintenancePlanner';
import { useToast } from '@/hooks/use-toast';
import Donut from '@/components/Donut';
import UpcomingTasksCard from '@/components/UpcomingTasksCard';
import { 
  Plus, 
  Upload, 
  Calendar, 
  TrendingUp,
  AlertTriangle,
  Wrench,
  RefreshCw,
  Sparkles,
  Activity,
  CheckCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface HomeData {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_id?: string;
  year_built?: number;
  square_feet?: number;
  bedrooms?: number;
  bathrooms?: number;
}

interface PropertyData {
  condition_score?: number;
  tlc_score?: number;
  avm?: number;
  avm_low?: number;
  avm_high?: number;
  last_updated?: string;
  renovation_items?: Array<{
    id: string;
    system: string;
    est_cost?: number;
    urgency?: string;
    meta?: any;
  }>;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [home, setHome] = useState<HomeData | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyData>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [fetchingReport, setFetchingReport] = useState(false);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchHomeData();
    }
  }, [user]);

  const fetchHomeData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get the first home for this user
      const { data: homeData, error } = await supabase
        .from('homes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!homeData) {
        setHome(null);
        return;
      }

      setHome(homeData);

      // Fetch recent tasks for this home
      const { data: tasks } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('home_id', homeData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentTasks(tasks || []);

      // If we have a property_id, fetch property-related data
      if (homeData.property_id) {
        await fetchPropertyData(homeData.property_id);
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
      toast({
        title: "Error",
        description: "Failed to load home data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyData = async (propertyId: string) => {
    try {
      // Get latest valuation
      const { data: valuation } = await supabase
        .from('valuations')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get latest maintenance signals
      const { data: signals } = await supabase
        .from('maintenance_signals')
        .select('*')
        .eq('property_id', propertyId)
        .order('asof_date', { ascending: false });

      // Get renovation items
      const { data: renovations } = await supabase
        .from('renovation_items')
        .select('*')
        .eq('property_id', propertyId)
        .order('asof_date', { ascending: false })
        .limit(10);

      // Process signals into a map
      const signalMap: Record<string, number> = {};
      signals?.forEach(signal => {
        if (signal.signal && signal.value && !signalMap[signal.signal]) {
          signalMap[signal.signal] = signal.value;
        }
      });

      setPropertyData({
        condition_score: signalMap.condition_score,
        tlc_score: signalMap.tlc,
        avm: valuation?.avm_value,
        avm_low: valuation?.avm_low,
        avm_high: valuation?.avm_high,
        last_updated: valuation?.created_at,
        renovation_items: renovations?.map(r => ({
          id: r.id,
          system: r.system,
          est_cost: r.estimated_cost,
          urgency: String(r.urgency),
          meta: r
        })) || []
      });
    } catch (error) {
      console.error('Error fetching property data:', error);
    }
  };

  const handleGetNewReport = async () => {
    if (!home) return;
    
    try {
      setFetchingReport(true);
      const result = await fetchHomesageReport(home.address, home.zip_code, true);
      
      if (result.ok) {
        toast({
          title: "Success",
          description: "New property report generated successfully."
        });
        
        // Refresh data
        await fetchHomeData();
      }
    } catch (error) {
      console.error('Error fetching Homesage report:', error);
      toast({
        title: "Error",
        description: "Failed to generate new report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setFetchingReport(false);
    }
  };

  const handleGenerateSeasonalPlan = async () => {
    if (!home) return;
    
    try {
      setGeneratingPlan(true);
      const result = await generateSeasonalPlan(home.id, 12, false);
      
      if (result.ok) {
        toast({
          title: "Success",
          description: `Generated ${result.inserted} new maintenance tasks.`
        });
        
        setRefreshKey(k => k + 1); // Trigger tasks refresh
        await fetchHomeData(); // Refresh recent tasks
      }
    } catch (error) {
      console.error('Error generating seasonal plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate maintenance plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingPlan(false);
    }
  };

  const mapSystemToCategory = (system = "") => {
    const s = system.toLowerCase();
    if (["hvac","furnace","ac","air","heater"].some(k => s.includes(k))) return "hvac";
    if (["plumb","water","pipe","drain"].some(k => s.includes(k))) return "plumbing";
    if (["elect","panel","breaker","wire","outlet"].some(k => s.includes(k))) return "electrical";
    if (["appliance","fridge","range","stove","washer","dryer","dishwasher"].some(k => s.includes(k))) return "appliance";
    if (["roof","gutter","siding","exterior","yard","landscape","window","door"].some(k => s.includes(k))) return "exterior";
    return "interior";
  };

  const mapUrgencyToPriority = (urgency?: string) => {
    const u = (urgency || "").toLowerCase();
    if (u === "high") return "urgent";
    if (u === "med" || u === "medium") return "high";
    return "medium";
  };

  const suggestDueDate = (priority: string) => {
    const days = priority === "urgent" ? 7 : priority === "high" ? 14 : priority === "medium" ? 30 : 60;
    const dt = new Date();
    dt.setDate(dt.getDate() + days);
    return dt.toISOString().slice(0, 10);
  };

  const handleCreateTaskFromRenovation = async (renovation: any) => {
    if (!home || !user) return;
    
    try {
      const category = mapSystemToCategory(renovation.system);
      const priority = mapUrgencyToPriority(renovation.urgency);
      const title = `${(renovation.system || "Home").toUpperCase()} • ${renovation.urgency || "maintenance"}`;
      const description = renovation?.meta?.description || `Auto-created from Homesage: ${(renovation.system || "").toUpperCase()} ${renovation.urgency || ""}`.trim();
      
      const { error } = await supabase.from("maintenance_tasks").insert({
        home_id: home.id,
        user_id: user.id,
        title,
        description,
        category,
        priority,
        status: "pending",
        cost: renovation.est_cost ?? null,
        due_date: suggestDueDate(priority)
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created task for ${renovation.system}.`
      });
      
      setRefreshKey(k => k + 1); // Trigger tasks refresh
      await fetchHomeData(); // Refresh recent tasks
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getConditionBadge = (score?: number) => {
    if (!score) return { label: "Unknown", variant: "secondary" as const };
    if (score >= 90) return { label: "Excellent", variant: "default" as const };
    if (score >= 80) return { label: "Good", variant: "default" as const };
    if (score >= 70) return { label: "Fair", variant: "secondary" as const };
    return { label: "Poor", variant: "destructive" as const };
  };

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return "N/A";
    return `$${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Loading your home profile...</p>
        </div>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to Habitta</h1>
          <p className="text-muted-foreground mb-4">No homes found. Please add a home to get started.</p>
          <Button onClick={() => navigate('/home/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Home
          </Button>
        </div>
      </div>
    );
  }

  const conditionBadge = getConditionBadge(propertyData.condition_score);
  const pendingTasks = recentTasks.filter(task => task.status === 'pending').length;
  const completedTasks = recentTasks.filter(task => task.status === 'completed').length;

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{home.address}</h1>
            <p className="text-muted-foreground">{home.city}, {home.state} {home.zip_code}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGetNewReport} disabled={fetchingReport}>
              <RefreshCw className={`w-4 h-4 mr-2 ${fetchingReport ? 'animate-spin' : ''}`} />
              Get New Report
            </Button>
            <Button onClick={handleGenerateSeasonalPlan} disabled={generatingPlan}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Seasonal Plan
            </Button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex gap-4">
          <Badge variant={conditionBadge.variant}>
            Condition: {conditionBadge.label}
          </Badge>
          {propertyData.avm && (
            <Badge variant="outline">
              AVM: {formatCurrency(propertyData.avm)}
            </Badge>
          )}
          {propertyData.avm_low && propertyData.avm_high && (
            <Badge variant="outline">
              Range: {formatCurrency(propertyData.avm_low)} - {formatCurrency(propertyData.avm_high)}
            </Badge>
          )}
          {propertyData.last_updated && (
            <Badge variant="outline">
              Updated: {new Date(propertyData.last_updated).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Home Health Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Home Condition
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {conditionBadge.label}
              </div>
              <p className="text-sm text-muted-foreground">
                Based on property analysis
              </p>
            </div>
            <Donut value={propertyData.condition_score} size={80} />
          </CardContent>
        </Card>

        {/* Home Value */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Home Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(propertyData.avm)}
            </div>
            {propertyData.avm_low && propertyData.avm_high && (
              <p className="text-sm text-muted-foreground">
                Range: {formatCurrency(propertyData.avm_low)} - {formatCurrency(propertyData.avm_high)}
              </p>
            )}
            <div className="mt-2">
              <Badge variant="outline">
                Automated Valuation
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Task Stats */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{completedTasks}</p>
                  <p className="text-sm text-muted-foreground">Completed Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingTasks}</p>
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
              <RefreshCw className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold">Get New Report</h3>
              <p className="text-sm text-muted-foreground">Update property data</p>
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
        {/* Top Renovations or Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {propertyData.renovation_items?.length ? (
                <>
                  <Wrench className="w-5 h-5" />
                  Top Renovations
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {propertyData.renovation_items?.length ? (
              <div className="space-y-3">
                {propertyData.renovation_items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{item.system}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.urgency && (
                          <Badge 
                            variant={item.urgency === 'high' ? 'destructive' : item.urgency === 'medium' ? 'secondary' : 'outline'} 
                            className="mr-2"
                          >
                            {item.urgency}
                          </Badge>
                        )}
                        {formatCurrency(item.est_cost)}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleCreateTaskFromRenovation(item)}
                    >
                      Create Task
                    </Button>
                  </div>
                ))}
              </div>
            ) : recentTasks.length > 0 ? (
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
              <p className="text-sm text-muted-foreground">
                {propertyData.renovation_items === undefined 
                  ? "Generate a new report to see renovation recommendations."
                  : "No recent activity. Start by adding your first task!"
                }
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <UpcomingTasksCard homeId={home.id} refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default Dashboard;