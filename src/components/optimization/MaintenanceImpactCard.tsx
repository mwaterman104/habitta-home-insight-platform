import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';

interface MaintenanceImpactCardProps {
  headline: string;
  body: string;
  contextLine: string;
  ctaText: string;
  onCta?: () => void;
}

/**
 * MaintenanceImpactCard - Shows maintenance impact messaging
 * Part of System Optimization section
 */
export function MaintenanceImpactCard({ 
  headline, 
  body, 
  contextLine, 
  ctaText, 
  onCta 
}: MaintenanceImpactCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Wrench className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h3 className="font-medium">{headline}</h3>
            <p className="text-sm text-muted-foreground">{body}</p>
            <p className="text-sm text-muted-foreground italic">{contextLine}</p>
            <Button 
              variant="link" 
              className="p-0 h-auto text-primary" 
              onClick={onCta}
            >
              {ctaText} →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
