import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  mapMaintenanceTaskToTask, 
  mapTasksToAlerts, 
  generateSystemHealthFromTasks,
  mapHomeToPropertySummary
} from '../adapters/habittaMappers';
import { Task } from '../../client/types/habitta';

export const useHabittaLive = (homeId?: string) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch tasks from Supabase
  useEffect(() => {
    if (!user || !homeId) return;

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('maintenance_tasks')
          .select('*')
          .eq('home_id', homeId)
          .eq('user_id', user.id);

        if (error) throw error;

        const mappedTasks = (data || []).map(mapMaintenanceTaskToTask);
        setTasks(mappedTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user, homeId, refreshKey]);

  // Set up real-time subscriptions for tasks
  useEffect(() => {
    if (!user || !homeId) return;

    const channel = supabase
      .channel('maintenance_tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_tasks',
          filter: `home_id=eq.${homeId}`
        },
        () => {
          // Refresh data when changes occur
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, homeId]);

  // Generate derived data from tasks
  const alerts = useMemo(() => mapTasksToAlerts(tasks), [tasks]);
  const systemHealth = useMemo(() => generateSystemHealthFromTasks(tasks), [tasks]);
  
  const tasksSummary = useMemo(() => {
    const pending = tasks.filter(t => t.status === "pending").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const completed = tasks.filter(t => t.status === "completed").length;
    
    return { pending, inProgress, completed, total: pending + inProgress + completed };
  }, [tasks]);

  return {
    tasks,
    alerts,
    systemHealth,
    tasksSummary,
    loading,
    refreshKey
  };
};

// Hook for upcoming tasks with time window filtering
export const useUpcomingTasksLive = (homeId?: string, windowDays: 30 | 60 | 90 = 30, refreshKey?: number) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !homeId) return;

    const fetchUpcomingTasks = async () => {
      try {
        const now = new Date();
        const endDate = new Date();
        endDate.setDate(now.getDate() + windowDays);

        const { data, error } = await supabase
          .from('maintenance_tasks')
          .select('*')
          .eq('home_id', homeId)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .gte('due_date', now.toISOString().split('T')[0])
          .lte('due_date', endDate.toISOString().split('T')[0])
          .order('due_date', { ascending: true });

        if (error) throw error;

        const mappedTasks = (data || []).map(mapMaintenanceTaskToTask);
        setTasks(mappedTasks);
      } catch (error) {
        console.error('Error fetching upcoming tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingTasks();
  }, [user, homeId, windowDays, refreshKey]);

  return { data: tasks, loading };
};

// Hook for task completion statistics
export const useTasksStatsLive = (homeId?: string, refreshKey?: number) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !homeId) return;

    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('maintenance_tasks')
          .select('status')
          .eq('home_id', homeId)
          .eq('user_id', user.id);

        if (error) throw error;

        const pending = data?.filter(t => t.status === 'pending').length || 0;
        const inProgress = data?.filter(t => t.status === 'in_progress').length || 0;
        const completed = data?.filter(t => t.status === 'completed').length || 0;
        const total = pending + inProgress + completed;

        setStats({ pending, inProgress, completed, total });
      } catch (error) {
        console.error('Error fetching task stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, homeId, refreshKey]);

  return { stats, loading };
};

// Hook for home data and property summary
export const useHomeLive = (homeId?: string) => {
  const { user } = useAuth();
  const [home, setHome] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !homeId) return;

    const fetchHome = async () => {
      try {
        const { data, error } = await supabase
          .from('homes')
          .select('*')
          .eq('id', homeId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setHome(data);
      } catch (error) {
        console.error('Error fetching home:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHome();
  }, [user, homeId]);

  const propertySummary = useMemo(() => {
    return home ? mapHomeToPropertySummary(home) : null;
  }, [home]);

  return { home, propertySummary, loading };
};