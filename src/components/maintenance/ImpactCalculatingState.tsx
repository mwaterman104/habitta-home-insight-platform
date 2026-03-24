import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CALCULATION_TIMEOUT_MS } from '@/types/riskDelta';

interface ImpactCalculatingStateProps {
  startedAt?: string;
}

export function ImpactCalculatingState({ startedAt }: ImpactCalculatingStateProps) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    
    // Initial calculation
    setElapsed(Date.now() - start);
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startedAt]);
  
  // Cap progress at 95% to indicate still working
  const progress = Math.min((elapsed / CALCULATION_TIMEOUT_MS) * 100, 95);
  const isDelayed = elapsed > 30000; // 30 seconds
  
  return (
    <div className="flex items-center gap-3 text-muted-foreground p-3 bg-muted/50 rounded-lg">
      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">Calculating maintenance impact...</p>
        {isDelayed && (
          <p className="text-xs mt-1 text-muted-foreground/70">
            Taking longer than usual. Predictions are recalculating...
          </p>
        )}
      </div>
      <Progress value={progress} className="w-16 h-2" />
    </div>
  );
}
