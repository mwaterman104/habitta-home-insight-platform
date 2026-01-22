interface QuietlyMonitoredData {
  subcomponents: Array<{ system: string; component: string; typicalCost: string }>;
  secondarySystems: Array<{
    system: string;
    wearPoints: string[];
    typicalServiceCost: string;
  }>;
}

interface SilentRiskCalloutProps {
  // NEW: Multi-system quiet monitoring
  quietlyMonitored?: QuietlyMonitoredData;
  // Legacy support
  risks?: Array<{
    component: string;
    riskContext: string;
    typicalCost: string;
    preventability: 'high' | 'medium' | 'low';
  }>;
}

/**
 * SilentRiskCallout → RENAMED: "Quietly monitored items"
 * 
 * Shows:
 * A) Subcomponents (HVAC parts)
 * B) Secondary systems (Water heater, Roof wear points)
 * 
 * Styled neutral, not amber/warning.
 */
export function SilentRiskCallout({ quietlyMonitored, risks = [] }: SilentRiskCalloutProps) {
  // Use new format if available
  const hasNewFormat = quietlyMonitored && (
    quietlyMonitored.subcomponents.length > 0 || 
    quietlyMonitored.secondarySystems.length > 0
  );
  
  // If no data in either format, don't render
  if (!hasNewFormat && risks.length === 0) return null;

  return (
    <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-3">
      {/* RENAMED header */}
      <div className="text-sm font-medium text-foreground">
        Quietly monitored items
      </div>
      
      <p className="text-xs text-muted-foreground">
        Smaller components and systems we track to avoid surprises
      </p>
      
      {hasNewFormat ? (
        <>
          {/* A) Subcomponents */}
          {quietlyMonitored!.subcomponents.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">
                HVAC subcomponents
              </p>
              {quietlyMonitored!.subcomponents.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.component}</span>
                  <span className="text-muted-foreground">{item.typicalCost}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* B) Secondary systems */}
          {quietlyMonitored!.secondarySystems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Other systems being tracked
              </p>
              {quietlyMonitored!.secondarySystems.map((sys, i) => (
                <div key={i} className="space-y-0.5">
                  <span className="text-xs font-medium text-foreground">{sys.system}</span>
                  <ul className="text-xs text-muted-foreground list-disc list-inside pl-1">
                    {sys.wearPoints.map((point, j) => (
                      <li key={j}>{point}</li>
                    ))}
                  </ul>
                  <span className="text-[10px] text-muted-foreground">
                    Typical service: {sys.typicalServiceCost}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Legacy format: single list of risks */
        <div className="space-y-1.5">
          {risks.slice(0, 3).map((risk, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{risk.component}</span>
              <span className="text-muted-foreground">{risk.typicalCost}</span>
            </div>
          ))}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground pt-1">
        Not urgent — tracking helps avoid surprises.
      </p>
    </div>
  );
}
