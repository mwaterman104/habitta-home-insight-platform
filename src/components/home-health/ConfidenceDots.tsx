import { cn } from '@/lib/utils';

interface ConfidenceDotsProps {
  confidence_0_1: number;
}

/**
 * Derives dot fill from numeric confidence
 * Uses existing confidence scale, no new taxonomy
 */
function confidenceToDots(confidence_0_1: number): number {
  if (confidence_0_1 >= 0.8) return 5;
  if (confidence_0_1 >= 0.6) return 4;
  if (confidence_0_1 >= 0.4) return 3;
  if (confidence_0_1 >= 0.2) return 2;
  return 1;
}

export function ConfidenceDots({ confidence_0_1 }: ConfidenceDotsProps) {
  const filledCount = confidenceToDots(confidence_0_1);
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full",
            i <= filledCount ? "bg-primary" : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
