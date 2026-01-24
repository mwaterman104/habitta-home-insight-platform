import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Square, Bed, Bath, Calendar } from 'lucide-react';

interface KeyMetricsProps {
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
}

/**
 * KeyMetrics - Compact stat chips for property identity
 * 
 * Design decisions:
 * - No section header (chips are self-explanatory)
 * - Tighter spacing
 * - Values use system-name class for visual weight
 */
export const KeyMetrics: React.FC<KeyMetricsProps> = ({
  squareFeet,
  bedrooms,
  bathrooms,
  yearBuilt
}) => {
  const metrics = [
    {
      icon: Square,
      label: 'Sq. ft.',
      value: squareFeet ? squareFeet.toLocaleString() : 'N/A',
    },
    {
      icon: Bed,
      label: 'Beds',
      value: bedrooms?.toString() || 'N/A',
    },
    {
      icon: Bath,
      label: 'Baths',
      value: bathrooms?.toString() || 'N/A',
    },
    {
      icon: Calendar,
      label: 'Built',
      value: yearBuilt?.toString() || 'N/A',
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className="flex flex-col items-center space-y-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-xl font-semibold tabular-nums">{metric.value}</p>
                <p className="text-meta text-muted-foreground">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};