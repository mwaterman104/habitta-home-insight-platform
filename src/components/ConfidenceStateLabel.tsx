import { cn } from "@/lib/utils";
import { ConfidenceState, getConfidenceStateLabel } from "@/lib/systemConfidence";

/**
 * ConfidenceStateLabel - Minimal inline label for system confidence
 * 
 * Design rules:
 * - Lowercase, muted text (not a badge)
 * - Only visible for 'estimated' and 'needs_confirmation'
 * - High confidence is SILENT (critical)
 * 
 * Usage: "Roof · Estimated" or "Water Heater · Needs confirmation"
 */

interface ConfidenceStateLabelProps {
  state: ConfidenceState;
  className?: string;
}

export function ConfidenceStateLabel({ state, className }: ConfidenceStateLabelProps) {
  const label = getConfidenceStateLabel(state);
  
  // High confidence is silent - this is intentional
  if (!label) return null;
  
  return (
    <span className={cn("text-xs text-muted-foreground lowercase", className)}>
      · {label}
    </span>
  );
}
