interface SilentRiskCalloutProps {
  risks: Array<{
    component: string;
    riskContext: string;
    typicalCost: string;
    preventability: 'high' | 'medium' | 'low';
  }>;
}

/**
 * SilentRiskCallout - Quiet monitoring display without alarmism
 * 
 * Shows components being monitored without creating fear.
 * Styled neutral, not amber/warning.
 */
export function SilentRiskCallout({ risks }: SilentRiskCalloutProps) {
  if (risks.length === 0) return null;

  return (
    <div className="bg-gray-50/50 border border-gray-100 rounded-lg p-3 space-y-2">
      <div className="text-sm font-medium text-gray-700">
        Components we quietly monitor
      </div>
      <p className="text-xs text-muted-foreground">
        These parts tend to wear faster in South Florida's climate:
      </p>
      
      <div className="space-y-1.5">
        {risks.slice(0, 3).map((risk, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{risk.component}</span>
            <span className="text-muted-foreground">{risk.typicalCost}</span>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground pt-1">
        Not urgent — tracking helps avoid surprises.
      </p>
    </div>
  );
}
