import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useHomeLive } from '@/hooks/useHabittaLive';

interface LiveHomeValueCardProps {
  homeId?: string;
}

export default function LiveHomeValueCard({ homeId }: LiveHomeValueCardProps) {
  const { propertySummary, loading } = useHomeLive(homeId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!propertySummary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">No data available</div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isPositiveChange = propertySummary.yearOverYearChange >= 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Home Value</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(propertySummary.homeValue)}
          </div>
          <div className={`flex items-center justify-center gap-1 text-sm ${
            isPositiveChange ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositiveChange ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {isPositiveChange ? '+' : ''}{propertySummary.yearOverYearChange}% YoY
          </div>
        </div>
        
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Maintenance Rate</span>
            <span className="text-xs font-medium">{propertySummary.maintenanceCompletionRate}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Preventive Score</span>
            <span className="text-xs font-medium">{propertySummary.preventiveMaintenanceScore}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}