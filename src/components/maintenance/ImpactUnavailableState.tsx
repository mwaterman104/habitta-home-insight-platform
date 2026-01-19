import { HelpCircle } from 'lucide-react';

interface ImpactUnavailableStateProps {
  reason?: string;
}

export function ImpactUnavailableState({ reason }: ImpactUnavailableStateProps) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted/30 rounded-lg">
      <HelpCircle className="h-4 w-4 flex-shrink-0" />
      <span>{reason || 'No impact data available for this task'}</span>
    </div>
  );
}
