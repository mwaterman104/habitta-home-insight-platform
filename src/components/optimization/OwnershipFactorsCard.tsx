import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, MinusCircle, BarChart3 } from 'lucide-react';
import type { OwnershipFactor } from '@/lib/optimizationCopy';

interface OwnershipFactorsCardProps {
  factors: OwnershipFactor[];
  footer: string;
}

/**
 * OwnershipFactorsCard - Shows ownership factors checklist
 * Part of System Optimization section
 */
export function OwnershipFactorsCard({ factors, footer }: OwnershipFactorsCardProps) {
  const getStatusIcon = (status: OwnershipFactor['status']) => {
    switch (status) {
      case 'good': 
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warning': 
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      default: 
        return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <BarChart3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <h3 className="font-medium">Ownership factors affecting this system</h3>
            <div className="space-y-2">
              {factors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>{factor.label}</span>
                  <div className="flex items-center gap-2">
                    {factor.value && (
                      <span className="text-muted-foreground">{factor.value}</span>
                    )}
                    {getStatusIcon(factor.status)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{footer}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
