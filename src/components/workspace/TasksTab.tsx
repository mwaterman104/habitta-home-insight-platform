import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, ChevronRight, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  order_index: number;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  phase_id?: string;
}

interface Phase {
  id: string;
  name: string;
  description?: string;
  order_index: number;
  is_completed: boolean;
  tasks: Task[];
}

interface TasksTabProps {
  projectId: string;
  onDataChange: () => void;
}

const TasksTab: React.FC<TasksTabProps> = ({ projectId, onDataChange }) => {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhasesAndTasks();
  }, [projectId]);

  const fetchPhasesAndTasks = async () => {
    try {
      // Fetch phases
      const { data: phasesData, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      if (phasesError) throw phasesError;

      // Fetch all tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      if (tasksError) throw tasksError;

      // Group tasks by phase
      const phasesWithTasks = (phasesData || []).map(phase => ({
        ...phase,
        tasks: (tasksData || []).filter(task => task.phase_id === phase.id)
      }));

      // Get unassigned tasks
      const unassigned = (tasksData || []).filter(task => !task.phase_id);

      setPhases(phasesWithTasks);
      setUnassignedTasks(unassigned);

      // Auto-open phases with incomplete tasks
      const newOpenPhases = new Set<string>();
      phasesWithTasks.forEach(phase => {
        if (!phase.is_completed || phase.tasks.some(task => !task.is_completed)) {
          newOpenPhases.add(phase.id);
        }
      });
      setOpenPhases(newOpenPhases);
    } catch (error) {
      console.error('Error fetching phases and tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: completed })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setPhases(prev => prev.map(phase => ({
        ...phase,
        tasks: phase.tasks.map(task => 
          task.id === taskId ? { ...task, is_completed: completed } : task
        )
      })));

      setUnassignedTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, is_completed: completed } : task
      ));

      onDataChange();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const togglePhase = (phaseId: string) => {
    setOpenPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const getPhaseProgress = (phase: Phase) => {
    if (phase.tasks.length === 0) return 0;
    const completed = phase.tasks.filter(task => task.is_completed).length;
    return Math.round((completed / phase.tasks.length) * 100);
  };

  const formatHours = (hours?: number) => {
    if (!hours) return null;
    return `${hours}h`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2].map(j => (
                  <div key={j} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Project Tasks</h3>
          <p className="text-sm text-muted-foreground">
            Organize your work by phases and track progress
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Phases */}
      {phases.map(phase => {
        const isOpen = openPhases.has(phase.id);
        const progress = getPhaseProgress(phase);

        return (
          <Card key={phase.id}>
            <Collapsible open={isOpen} onOpenChange={() => togglePhase(phase.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <div>
                        <CardTitle className="text-base">{phase.name}</CardTitle>
                        {phase.description && (
                          <p className="text-sm text-muted-foreground">{phase.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={progress === 100 ? "secondary" : "default"}>
                        {progress}% Complete
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {phase.tasks.length} tasks
                      </span>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {phase.tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No tasks in this phase yet
                      </p>
                    ) : (
                      phase.tasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={task.is_completed}
                            onCheckedChange={(checked) => 
                              toggleTask(task.id, checked as boolean)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <h4 className={`font-medium ${
                              task.is_completed ? 'line-through text-muted-foreground' : ''
                            }`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {task.estimated_hours && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Est: {formatHours(task.estimated_hours)}</span>
                                </div>
                              )}
                              {task.due_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Unassigned Tasks */}
      {unassignedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unassigned Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unassignedTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={task.is_completed}
                    onCheckedChange={(checked) => 
                      toggleTask(task.id, checked as boolean)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <h4 className={`font-medium ${
                      task.is_completed ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {phases.length === 0 && unassignedTasks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">No tasks yet</h3>
              <p className="text-sm text-muted-foreground">
                Start by adding your first task or creating project phases
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Task
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TasksTab;