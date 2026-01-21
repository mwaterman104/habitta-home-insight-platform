import { AlertTriangle } from "lucide-react";

interface SilentRiskCalloutProps {
  risks: Array<{
    component: string;
    riskContext: string;
    typicalCost: string;
    preventability: 'high' | 'medium' | 'low';
  }>;
}

/**
 * SilentRiskCallout - Creates productive tension without alarmism
 * 
 * Shows emerging risks that aren't urgent but worth tracking.
 * Language emphasizes "forming" and "typically" to avoid fear-mongering.
 */
export function SilentRiskCallout({ risks }: SilentRiskCalloutProps) {
  if (risks.length === 0) return null;

  return (
    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <AlertTriangle className="h-4 w-4" />
        Silent risks currently forming
      </div>
      
      <ul className="space-y-1 text-xs text-amber-700">
        {risks.slice(0, 3).map((risk, i) => (
          <li key={i} className="flex items-start gap-2">
            <span>•</span>
            <span>
              {risk.component}: {risk.riskContext}
              <span className="text-muted-foreground ml-1">
                ({risk.typicalCost} if unaddressed)
              </span>
            </span>
          </li>
        ))}
      </ul>
      
      <p className="text-xs text-muted-foreground italic">
        These aren't urgent — but tracking them prevents surprises.
      </p>
    </div>
  );
}
