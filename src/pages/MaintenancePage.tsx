import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, List, Plus, Filter, Wrench, AlertTriangle, MessageCircle } from "lucide-react";
import { MaintenanceTimelineView } from "@/components/maintenance/MaintenanceTimelineView";
import { MaintenanceCalendarView } from "@/components/maintenance/MaintenanceCalendarView";
import { MobileMaintenanceView } from "@/components/maintenance/MobileMaintenanceView";
import { SystemFilterChips } from "@/components/maintenance/SystemFilterChips";
import { AddTaskDialog } from "@/components/maintenance/AddTaskDialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { deriveClimateZone } from "@/lib/climateZone";
import { DashboardV3Layout } from "@/layouts/DashboardV3Layout";
import { useChatContext } from "@/contexts/ChatContext";

interface MaintenanceTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
  category: string | null;
  system_type?: string | null;
  cost: number | null;
  home_id: string;
  created_at: string;
  updated_at: string;
  completed_date?: string;
}

export default function MaintenancePage() {
  return (
    <DashboardV3Layout>
      <MaintenancePageContent />
    </DashboardV3Layout>
  );
}

function MaintenancePageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { openChat } = useChatContext();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [userHome, setUserHome] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateTimeout, setGenerateTimeout] = useState(false);
  const [activeView, setActiveView] = useState<"timeline" | "calendar">("timeline");
  const [showAddTask, setShowAddTask] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterSystem, setFilterSystem] = useState("all");

  // Fetch user's home
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("homes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) setUserHome(data);
    })();
  }, [user]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!userHome?.id) return;
    setLoading(true);

    let query = supabase
      .from("maintenance_tasks")
      .select("*")
      .eq("home_id", userHome.id)
      .order("due_date", { ascending: true });

    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterPriority !== "all") query = query.eq("priority", filterPriority);
    if (filterSystem !== "all") query = query.eq("system_type", filterSystem);

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error loading tasks", description: error.message, variant: "destructive" });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [userHome?.id, filterStatus, filterPriority, filterSystem, toast]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!userHome?.id) return;
    const channel = supabase
      .channel("maintenance-page-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "maintenance_tasks",
        filter: `home_id=eq.${userHome.id}`,
      }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userHome?.id, fetchTasks]);

  const handleTaskUpdate = async (taskId: string, updates: Partial<MaintenanceTask>) => {
    try {
      const { error } = await supabase
        .from("maintenance_tasks")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) {
        toast({ title: "Error updating task", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Task updated", description: `Status changed to ${updates.status || "updated"}.` });
      }
    } catch (error: any) {
      console.error("Task update failed:", error);
      toast({ title: "Error updating task", description: error?.message || "Please try again.", variant: "destructive" });
    }
  };

  const generateSeasonalPlan = async () => {
    if (!userHome?.id) return;
    setGenerating(true);
    setGenerateTimeout(false);
    
    // Timeout fallback: after 10s, show chat escape hatch
    const timeoutId = setTimeout(() => setGenerateTimeout(true), 10000);
    
    try {
      const climateZone = deriveClimateZone(userHome.state, userHome.city, userHome.latitude);
      const { data, error } = await supabase.functions.invoke("seed-maintenance-plan", {
        body: { homeId: userHome.id, months: 12, force: false, climateZone: climateZone.zone },
      });
      if (error) throw error;
      toast({
        title: "Seasonal plan generated",
        description: `Added ${data.inserted} region-specific tasks (${data.climateZone} zone).`,
      });
    } catch (error: any) {
      toast({ title: "Error generating plan", description: error.message, variant: "destructive" });
    } finally {
      clearTimeout(timeoutId);
      setGenerating(false);
      setGenerateTimeout(false);
    }
  };

  // Stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    overdue: tasks.filter(t => t.status !== "completed" && new Date(t.due_date) < new Date()).length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  const climateZone = userHome ? deriveClimateZone(userHome.state, userHome.city, userHome.latitude) : null;

  // ── Mobile Layout ──
  if (isMobile) {
    return (
      <div className="p-3 space-y-3">
        {/* Mobile header strip */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Maintenance</h1>
            {climateZone && (
              <p className="text-xs text-muted-foreground">{climateZone.label}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={generateSeasonalPlan} size="sm" variant="outline" disabled={generating}>
              {generating ? "Generating..." : "Generate Plan"}
            </Button>
          </div>
        </div>

        {/* Generate timeout fallback */}
        {generating && generateTimeout && (
          <button 
            onClick={() => openChat({ type: 'maintenance', trigger: 'generate_plan' })}
            className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-1 py-2"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Taking longer than expected — talk to Habitta
          </button>
        )}

        {/* Quick stats */}
        {stats.total > 0 && (
          <div className="flex gap-4">
            {stats.overdue > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs font-medium text-destructive">{stats.overdue} overdue</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">{stats.pending} pending</span>
            <span className="text-xs text-muted-foreground">{stats.completed} done</span>
          </div>
        )}

        <MobileMaintenanceView
          tasks={tasks}
          loading={loading}
          onTaskUpdate={handleTaskUpdate}
          onAddTask={() => setShowAddTask(true)}
        />

        <AddTaskDialog
          open={showAddTask}
          onOpenChange={setShowAddTask}
          homeId={userHome?.id || ""}
          onTaskAdded={fetchTasks}
        />
      </div>
    );
  }

  // ── Desktop Layout ──
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">
            Region-aware scheduling for your home
            {climateZone && (
              <span className="ml-2">
                · {climateZone.label}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={generateSeasonalPlan} variant="outline" disabled={generating}>
            <Calendar className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Generate Seasonal Plan"}
          </Button>
          <Button onClick={() => setShowAddTask(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Generate timeout fallback */}
      {generating && generateTimeout && (
        <button 
          onClick={() => openChat({ type: 'maintenance', trigger: 'generate_plan' })}
          className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-1 py-2"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Taking longer than expected — talk to Habitta
        </button>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-accent-foreground">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-primary">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm bg-background"
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
                className="border rounded-md px-2 py-1 text-sm bg-background"
              >
                <option value="all">All</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">System:</label>
              <select
                value={filterSystem}
                onChange={(e) => setFilterSystem(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm bg-background"
              >
                <option value="all">All Systems</option>
                <option value="hvac">HVAC</option>
                <option value="roof">Roof</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="water_heater">Water Heater</option>
                <option value="exterior">Exterior</option>
                <option value="pool">Pool</option>
                <option value="safety">Safety</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "timeline" | "calendar")}>
        <TabsList>
          <TabsTrigger value="timeline">
            <List className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <MaintenanceTimelineView
            tasks={tasks}
            loading={loading}
            onTaskUpdate={handleTaskUpdate}
            homeId={userHome?.id}
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

      <AddTaskDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        homeId={userHome?.id || ""}
        onTaskAdded={fetchTasks}
      />
    </div>
  );
}
