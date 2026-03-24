// Labels for systems (UI owns copy)
const SYSTEM_LABELS: Record<string, string> = {
  hvac: 'HVAC',
  roof: 'Roof',
  water_heater: 'Water heater'
};

// Driver verbs for different metrics (UI owns copy)
const DRIVER_VERBS: Record<string, string> = {
  preventive: 'service',
  avoided: 'issues',
  risk: 'aging'
};

/**
 * Formats driver keys into human-readable copy
 * Backend returns keys, UI generates sentences
 */
function formatDrivers(drivers: string[], verb: string): string {
  if (!drivers || drivers.length === 0) return '';
  const labels = drivers.map(d => SYSTEM_LABELS[d] || d);
  return labels.join(', ') + ' ' + verb;
}

interface FinancialAnchorProps {
  preventiveCost12mo: string;
  avoidedRepairs12mo: string;
  riskReductionPercent: number;
  roiStatement?: string;
  region?: string;
  // NEW: Financial attribution (keys only, no copy)
  financialAttribution?: {
    preventiveDrivers: Array<'hvac' | 'roof' | 'water_heater'>;
    avoidedRepairDrivers: Array<'hvac' | 'roof' | 'water_heater'>;
    riskDrivers: Array<'hvac' | 'roof' | 'water_heater'>;
    primaryRiskSystem: 'hvac' | 'roof' | 'water_heater';
  };
}

/**
 * FinancialAnchor - The ROI close for subscription conversion
 * 
 * UPDATED:
 * - Shows system attribution under each metric
 * - Primary risk driver line at bottom
 * - Copy generated from driver keys (not hardcoded)
 */
export function FinancialAnchor({ 
  preventiveCost12mo, 
  avoidedRepairs12mo, 
  riskReductionPercent,
  financialAttribution
}: FinancialAnchorProps) {
  // Derive primary risk label
  const primaryLabel = financialAttribution 
    ? SYSTEM_LABELS[financialAttribution.primaryRiskSystem] || 'Your home'
    : 'HVAC';
    
  // Generate attribution copy if available
  const preventiveAttribution = financialAttribution
    ? formatDrivers(financialAttribution.preventiveDrivers, DRIVER_VERBS.preventive)
    : 'HVAC service, Water heater upkeep';
    
  const avoidedAttribution = financialAttribution
    ? formatDrivers(financialAttribution.avoidedRepairDrivers, DRIVER_VERBS.avoided)
    : 'HVAC failures, Water heater leaks';
    
  const riskAttribution = financialAttribution
    ? formatDrivers(financialAttribution.riskDrivers, DRIVER_VERBS.risk)
    : 'HVAC age, Roof exposure';

  return (
    <div className="bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-lg p-3 space-y-2">
      <div className="text-xs font-medium text-green-800 dark:text-green-300 uppercase tracking-wider">
        12-Month Financial Outlook
      </div>
      
      <p className="text-[10px] text-muted-foreground">
        Based on your home's major systems and typical maintenance patterns
      </p>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Preventive cost */}
        <div>
          <div className="text-lg font-bold text-foreground">{preventiveCost12mo}</div>
          <div className="text-xs text-muted-foreground">Preventive cost</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {preventiveAttribution}
          </div>
        </div>
        
        {/* Repairs likely avoided */}
        <div>
          <div className="text-lg font-bold text-green-700 dark:text-green-400">{avoidedRepairs12mo}</div>
          <div className="text-xs text-muted-foreground">Repairs avoided</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Most impact: {avoidedAttribution}
          </div>
        </div>
        
        {/* Risk reduced */}
        <div>
          <div className="text-lg font-bold text-primary">{riskReductionPercent}%</div>
          <div className="text-xs text-muted-foreground">Risk reduced</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Driven by: {riskAttribution}
          </div>
        </div>
      </div>
      
      {/* Primary risk driver line */}
      <p className="text-xs text-center text-muted-foreground pt-2 border-t border-green-200 dark:border-green-900/30 mt-2">
        Your <strong className="text-foreground">{primaryLabel}</strong> is currently the largest driver of near-term risk.
      </p>
    </div>
  );
}
