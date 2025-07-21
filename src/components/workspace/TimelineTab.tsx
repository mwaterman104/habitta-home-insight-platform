import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TimelineMilestone {
  id: string;
  milestone_name: string;
  target_date?: string;
  actual_date?: string;
  is_completed: boolean;
  notes?: string;
}

interface TimelineTabProps {
  projectId: string;
  onDataChange: () => void;
}

const TimelineTab: React.FC<TimelineTabProps> = ({ projectId, onDataChange }) => {
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [projectId]);

  const fetchTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('project_timelines')
        .select('*')
        .eq('project_id', projectId)
        .order('target_date', { ascending: true });

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = async (milestoneId: string, completed: boolean) => {
    try {
      const updateData: any = { is_completed: completed };
      if (completed && !milestones.find(m => m.id === milestoneId)?.actual_date) {
        updateData.actual_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('project_timelines')
        .update(updateData)
        .eq('id', milestoneId);

      if (error) throw error;

      setMilestones(prev => prev.map(milestone =>
        milestone.id === milestoneId 
          ? { ...milestone, ...updateData }
          : milestone
      ));

      onDataChange();
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  };

  const getMilestoneStatus = (milestone: TimelineMilestone) => {
    if (milestone.is_completed) return 'completed';
    if (!milestone.target_date) return 'no-date';
    
    const today = new Date();
    const targetDate = new Date(milestone.target_date);
    const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilTarget < 0) return 'overdue';
    if (daysUntilTarget <= 7) return 'due-soon';
    return 'on-track';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'due-soon':
        return <Badge className="bg-warning text-warning-foreground">Due Soon</Badge>;
      case 'on-track':
        return <Badge variant="outline">On Track</Badge>;
      case 'no-date':
        return <Badge variant="secondary">No Date Set</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const getTimelineStats = () => {
    const completed = milestones.filter(m => m.is_completed).length;
    const total = milestones.length;
    const overdue = milestones.filter(m => {
      const status = getMilestoneStatus(m);
      return status === 'overdue';
    }).length;
    
    return { completed, total, overdue };
  };

  const stats = getTimelineStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Project Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Track key milestones and deadlines for your project
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Milestone
        </Button>
      </div>

      {/* Timeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Milestones</p>
              <p className="font-semibold">{stats.completed}/{stats.total} Complete</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="font-semibold">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="font-semibold">{stats.overdue} Milestones</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {milestones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">No milestones yet</h3>
              <p className="text-sm text-muted-foreground">
                Add project milestones to track important deadlines and goals
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Milestone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {milestones.map((milestone, index) => {
                const status = getMilestoneStatus(milestone);
                
                return (
                  <div key={milestone.id} className="flex items-start gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => toggleMilestone(milestone.id, !milestone.is_completed)}
                        className={`w-4 h-4 rounded-full border-2 transition-colors ${
                          milestone.is_completed
                            ? 'bg-success border-success'
                            : 'bg-background border-muted-foreground hover:border-primary'
                        }`}
                      >
                        {milestone.is_completed && (
                          <CheckCircle className="w-3 h-3 text-success-foreground" />
                        )}
                      </button>
                      {index < milestones.length - 1 && (
                        <div className="w-px h-8 bg-border mt-1" />
                      )}
                    </div>

                    {/* Milestone content */}
                    <div className="flex-1 pb-8">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`font-medium ${
                          milestone.is_completed ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {milestone.milestone_name}
                        </h4>
                        {getStatusBadge(status)}
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        {milestone.target_date && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Target: {formatDate(milestone.target_date)}</span>
                          </div>
                        )}
                        {milestone.actual_date && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Completed: {formatDate(milestone.actual_date)}</span>
                          </div>
                        )}
                        {milestone.notes && (
                          <p className="text-xs mt-1">{milestone.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimelineTab;