import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Home, Square, Bed, Bath, Calendar } from 'lucide-react';

interface KeyMetricsProps {
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
}

export const KeyMetrics: React.FC<KeyMetricsProps> = ({
  squareFeet,
  bedrooms,
  bathrooms,
  yearBuilt
}) => {
  const metrics = [
    {
      icon: Square,
      label: 'Sq. Ft.',
      value: squareFeet ? squareFeet.toLocaleString() : 'N/A',
      color: 'text-primary'
    },
    {
      icon: Bed,
      label: 'Bedrooms',
      value: bedrooms?.toString() || 'N/A',
      color: 'text-secondary'
    },
    {
      icon: Bath,
      label: 'Bathrooms',
      value: bathrooms?.toString() || 'N/A',
      color: 'text-accent'
    },
    {
      icon: Calendar,
      label: 'Year Built',
      value: yearBuilt?.toString() || 'N/A',
      color: 'text-muted-foreground'
    }
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center space-y-2">
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};