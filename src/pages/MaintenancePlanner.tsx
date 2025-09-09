import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, List, Plus, Filter } from "lucide-react";
import { MaintenanceTimelineView } from "@/components/maintenance/MaintenanceTimelineView";
import { MaintenanceCalendarView } from "@/components/maintenance/MaintenanceCalendarView";
import { AddTaskDialog } from "@/components/maintenance/AddTaskDialog";
import { useToast } from "@/hooks/use-toast";

interface MaintenanceTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
  category: string | null;
  cost: number | null;
  home_id: string;
  created_at: string;
  updated_at: string;
  completed_date?: string;
}

export default function MaintenancePlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [homes, setHomes] = useState<any[]>([]);
  const [selectedHome, setSelectedHome] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"timeline" | "calendar">("timeline");
  const [showAddTask, setShowAddTask] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchHomes();
    }
  }, [user]);

  useEffect(() => {
    if (selectedHome) {
      fetchTasks();
      setupRealtimeSubscription();
    }
  }, [selectedHome, filterStatus, filterPriority]);

  const fetchHomes = async () => {
    const { data, error } = await supabase
      .from("homes")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error Loading Homes",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setHomes(data || []);
    if (data && data.length > 0 && !selectedHome) {
      setSelectedHome(data[0].id);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    
    let query = supabase
      .from("maintenance_tasks")
      .select("*")
      .eq("home_id", selectedHome)
      .order("due_date", { ascending: true });

    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }

    if (filterPriority !== "all") {
      query = query.eq("priority", filterPriority);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error Loading Tasks",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTasks(data || []);
    }
    
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('maintenance-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_tasks',
          filter: `home_id=eq.${selectedHome}`
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<MaintenanceTask>) => {
    const { error } = await supabase
      .from("maintenance_tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Error Updating Task",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Task Updated",
        description: "Task has been updated successfully.",
      });
    }
  };

  const generateSeasonalPlan = async () => {
    if (!selectedHome) return;

    try {
      const { data, error } = await supabase.functions.invoke("seed-maintenance-plan", {
        body: { homeId: selectedHome, months: 12, force: false }
      });

      if (error) throw error;

      toast({
        title: "Seasonal Plan Generated",
        description: `Added ${data.inserted} new tasks to your maintenance plan.`,
      });
    } catch (error: any) {
      toast({
        title: "Error Generating Plan",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTaskStats = () => {
    const pending = tasks.filter(t => t.status === "pending").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const overdue = tasks.filter(t => 
      t.status !== "completed" && 
      new Date(t.due_date) < new Date()
    ).length;

    return { pending, inProgress, completed, overdue, total: tasks.length };
  };

  const stats = getTaskStats();

  if (loading && !selectedHome) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Planner</h1>
          <p className="text-muted-foreground">
            Proactive scheduling for home maintenance, repairs, and upgrades
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={generateSeasonalPlan} variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Generate Seasonal Plan
          </Button>
          <Button onClick={() => setShowAddTask(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Home Selector */}
      {homes.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label htmlFor="home-select" className="text-sm font-medium">
                Select Home:
              </label>
              <select
                id="home-select"
                value={selectedHome}
                onChange={(e) => setSelectedHome(e.target.value)}
                className="border rounded px-3 py-1"
              >
                {homes.map((home) => (
                  <option key={home.id} value={home.id}>
                    {home.address}, {home.city}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4" />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Priority:</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "timeline" | "calendar")}>
        <TabsList>
          <TabsTrigger value="timeline">
            <List className="h-4 w-4 mr-2" />
            Timeline View
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <MaintenanceTimelineView 
            tasks={tasks} 
            loading={loading}
            onTaskUpdate={handleTaskUpdate}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <MaintenanceCalendarView 
            tasks={tasks} 
            loading={loading}
            onTaskUpdate={handleTaskUpdate}
          />
        </TabsContent>
      </Tabs>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        homeId={selectedHome}
        onTaskAdded={fetchTasks}
      />
    </div>
  );
}