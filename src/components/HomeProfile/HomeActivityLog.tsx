import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Paintbrush, Thermometer, Zap, Home, Wrench, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityItem {
  id: string;
  date: string;
  title: string;
  category: string;
  notes?: string;
  contractor?: string;
}

const categoryIcons: Record<string, React.ComponentType<any>> = {
  Exterior: Paintbrush,
  HVAC: Thermometer,
  Safety: Home,
  Plumbing: Wrench,
  Electrical: Zap,
  // System kind mappings from home_events
  hvac: Thermometer,
  roof: Paintbrush,
  water_heater: Wrench,
  electrical_panel: Zap,
  plumbing: Wrench,
  exterior: Paintbrush,
};

interface HomeActivityLogProps {
  activities?: ActivityItem[];
}

/**
 * HomeActivityLog - Human-entered maintenance history
 * 
 * Renamed from "PropertyHistory" to reframe as intelligence input.
 * This is the human counterpart to permits.
 * 
 * Design decisions:
 * - Empty state when no real activities exist (no mock data)
 * - Subtle framing that connects maintenance to intelligence
 */
export const HomeActivityLog: React.FC<HomeActivityLogProps> = ({ 
  activities = []
}) => {
  const hasActivities = activities.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="heading-h3">Home activity log</CardTitle>
          <p className="text-meta text-muted-foreground">
            Regular maintenance helps Habitta distinguish wear from neglect.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {hasActivities ? (
          <div className="space-y-4">
            {activities.map((item) => {
              const Icon = categoryIcons[item.category] || Home;
              
              return (
                <div key={item.id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium">{item.title}</h4>
                    {item.contractor && (
                      <p className="text-sm text-muted-foreground">
                        Completed by {item.contractor}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.date), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              );
            })}
            
            <div className="pt-4 border-t border-border">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Log activity
              </Button>
            </div>
          </div>
        ) : (
          /* Empty state - no fake data */
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity logged yet</p>
            <p className="text-sm mt-1">Recording maintenance helps Habitta distinguish wear from neglect.</p>
            <Button variant="outline" size="sm" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Log your first activity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
