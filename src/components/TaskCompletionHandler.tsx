import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { captureRiskDelta } from '@/services/riskDeltaService';

// Category to system type mapping (fixes missing system mapping)
const CATEGORY_TO_SYSTEM: Record<string, string> = {
  'hvac': 'hvac',
  'heating': 'hvac',
  'cooling': 'hvac',
  'ac': 'hvac',
  'furnace': 'hvac',
  'air conditioning': 'hvac',
  'roof': 'roof',
  'roofing': 'roof',
  'water_heater': 'water_heater',
  'water heater': 'water_heater',
  'hot_water': 'water_heater',
  'hot water': 'water_heater',
  'plumbing': 'plumbing',
  'electrical': 'electrical_panel',
  'electrical_panel': 'electrical_panel',
  'foundation': 'foundation',
  'pool': 'pool',
  'solar': 'solar'
};

interface BeforeSnapshot {
  score: number;
  failureProbability12mo?: number;
  monthsRemaining?: number;
  status: string;
}

export function useTaskCompletion() {
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleTaskCompletion = async (
    taskId: string, 
    isCompleted: boolean,
    taskCategory?: string,
    homeId?: string
  ) => {
    setCompletingTasks(prev => new Set([...prev, taskId]));
    
    // Simple uncomplete flow
    if (!isCompleted) {
      try {
        const { error } = await supabase
          .from('maintenance_tasks')
          .update({
            status: 'pending',
            completed_date: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);

        if (error) throw error;

        toast({
          title: 'Task marked as pending',
          description: 'Task status has been updated.',
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
      return;
    }
    
    // Complex completion flow with risk tracking
    let beforeSnapshot: BeforeSnapshot | null = null;
    const systemType = taskCategory ? CATEGORY_TO_SYSTEM[taskCategory.toLowerCase()] : null;
    
    try {
      // Step 1: Get user ID from session (fixes missing user ID)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');
      const userId = user.id;
      
      // Step 2: Capture "before" risk snapshot (if we have system mapping)
      if (systemType && homeId) {
        try {
          const { data: predictions, error: predictError } = await supabase.functions.invoke(
            'intelligence-engine',
            {
              body: { action: 'predictions', property_id: homeId }
            }
          );
          
          if (predictError) {
            console.warn('Failed to fetch before snapshot:', predictError);
          } else if (predictions?.systems) {
            const systemData = predictions.systems.find(
              (s: any) => s.system === systemType
            );
            
            if (systemData) {
              beforeSnapshot = {
                score: systemData.score,
                failureProbability12mo: systemData.survival?.failureProbability12mo,
                monthsRemaining: systemData.survival?.monthsRemaining?.p50,
                status: systemData.status
              };
            }
          }
        } catch (snapshotError) {
          console.warn('Non-fatal: Failed to capture before snapshot:', snapshotError);
          // Continue with task completion even if snapshot fails
        }
      }
      
      // Step 3: Mark task completed (critical operation - don't fail here)
      const { error: updateError } = await supabase
        .from('maintenance_tasks')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) throw updateError;
      
      // Step 4: Log event with before snapshot (non-blocking)
      if (systemType && homeId && beforeSnapshot) {
        try {
          // Log to console for now - full event logging requires valid system_type enum
          console.log('Maintenance completed:', { taskId, systemType, homeId, beforeSnapshot });
          
          // Step 5: Trigger prediction refresh and delta capture (async, non-blocking)
          // Don't await - let this happen in background
          captureRiskDelta(homeId, systemType, beforeSnapshot, taskId)
            .catch(err => {
              console.error('Background delta capture failed:', err);
            });
            
        } catch (eventError) {
          console.error('Non-fatal: Failed to log event:', eventError);
          // Task is still completed successfully
        }
      }

      // Calm confirmation (not celebratory - per QC feedback)
      toast({
        title: 'Maintenance logged',
        description: systemType === 'hvac' 
          ? 'Your HVAC outlook has improved.' 
          : 'Task status has been updated successfully.',
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
