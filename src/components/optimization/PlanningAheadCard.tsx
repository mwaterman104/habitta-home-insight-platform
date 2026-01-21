import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';

interface PlanningAheadCardProps {
  annualMaintenance: string;
  replacementCost: string;
  subtext: string;
  onCta?: () => void;
}

/**
 * PlanningAheadCard - Shows cost planning info
 * Part of System Optimization section (conditional on foreseeable replacement)
 */
export function PlanningAheadCard({ 
  annualMaintenance, 
  replacementCost, 
  subtext, 
  onCta 
}: PlanningAheadCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <DollarSign className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h3 className="font-medium">Planning ahead</h3>
            <div className="text-sm space-y-1">
              <p>
                Estimated annual HVAC maintenance: <strong>{annualMaintenance}</strong>
              </p>
              <p>
                Typical replacement cost (today's dollars): <strong>{replacementCost}</strong>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{subtext}</p>
            <Button variant="outline" size="sm" onClick={onCta}>
              See cost planning options →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
