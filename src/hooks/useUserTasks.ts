import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserHome } from '@/hooks/useUserHome';
import { useAuth } from '@/contexts/AuthContext';

export interface UserTask {
  id: string;
  home_id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed_date?: string;
  status: string;
  priority: string;
  category?: string;
  cost?: number;
  recurring?: boolean;
  recurrence_interval?: string;
  created_at: string;
  updated_at: string;
}

export interface UserTasksHook {
  tasks: UserTask[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTask: (task: Partial<UserTask>) => Promise<void>;
  updateTask: (id: string, updates: Partial<UserTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export function useUserTasks(): UserTasksHook {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { userHome } = useUserHome();
  const { user } = useAuth();
  const homeId = userHome?.id;
  const userId = user?.id;

  const fetchTasks = async () => {
    if (!homeId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('home_id', homeId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setTasks(data || []);
    } catch (err: any) {
      console.error('Error fetching user tasks:', err);
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (task: Partial<UserTask>) => {
    if (!homeId || !userId) return;

    try {
      const { error: createError } = await supabase
        .from('maintenance_tasks')
        .insert({
          title: task.title || '',
          description: task.description,
          due_date: task.due_date,
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          category: task.category,
          cost: task.cost,
          recurring: task.recurring || false,
          recurrence_interval: task.recurrence_interval,
          home_id: homeId,
          user_id: userId,
        });

      if (createError) throw createError;
      
      await fetchTasks(); // Refresh the list
    } catch (err: any) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<UserTask>) => {
    try {
      const { error: updateError } = await supabase
        .from('maintenance_tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;
      
      await fetchTasks(); // Refresh the list
    } catch (err: any) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('maintenance_tasks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      await fetchTasks(); // Refresh the list
    } catch (err: any) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [homeId]);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask
  };
}