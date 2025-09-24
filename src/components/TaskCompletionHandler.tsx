import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useTaskCompletion() {
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    setCompletingTasks(prev => new Set([...prev, taskId]));
    
    try {
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({
          status: isCompleted ? 'completed' : 'pending',
          completed_date: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: isCompleted ? 'Task completed' : 'Task marked as pending',
        description: 'Task status has been updated successfully.',
      });

    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error updating task',
        description: error.message || 'Failed to update task status.',
        variant: 'destructive',
      });
    } finally {
      setCompletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  return {
    toggleTaskCompletion,
    completingTasks
  };
}