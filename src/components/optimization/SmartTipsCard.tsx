import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface SmartTipsCardProps {
  header: string;
  items: string[];
  microcopy: string;
}

/**
 * SmartTipsCard - Shows seasonal/climate-aware tips
 * Part of System Optimization section
 */
export function SmartTipsCard({ header, items, microcopy }: SmartTipsCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h3 className="font-medium">{header}</h3>
            <ul className="space-y-1">
              {items.map((tip, index) => (
                <li key={index} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground italic">{microcopy}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
