import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paintbrush, Thermometer, Zap, Home, Wrench, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface HistoryItem {
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
  Electrical: Zap
};

interface PropertyHistoryProps {
  history?: HistoryItem[];
}

export const PropertyHistory: React.FC<PropertyHistoryProps> = ({ 
  history = [
    {
      id: '1',
      date: '2023-08-15',
      title: 'Exterior Repainted',
      category: 'Exterior',
      notes: 'South-facing wall repainted',
      contractor: 'Pro Painters Inc.'
    },
    {
      id: '2',
      date: '2023-07-01',
      title: 'AC Unit Serviced',
      category: 'HVAC',
      notes: 'Filter replacement and system check',
      contractor: 'Filter Replacement'
    },
    {
      id: '3',
      date: '2023-05-20',
      title: 'Electrical Panel Inspected',
      category: 'Electrical',
      notes: 'Annual safety inspection',
      contractor: 'Sparky Electric'
    }
  ]
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Property History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((item, index) => {
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
        </div>
      </CardContent>
    </Card>
  );
};