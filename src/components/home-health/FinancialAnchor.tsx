interface FinancialAnchorProps {
  preventiveCost12mo: string;
  avoidedRepairs12mo: string;
  riskReductionPercent: number;
  roiStatement: string;
  region: string;
}

/**
 * FinancialAnchor - The ROI close for subscription conversion
 * 
 * Shows preventive vs avoided costs with regionalized messaging.
 * This is the financial justification that closes the subscription pitch.
 */
export function FinancialAnchor({ 
  preventiveCost12mo, 
  avoidedRepairs12mo, 
  riskReductionPercent, 
  roiStatement 
}: FinancialAnchorProps) {
  return (
    <div className="bg-green-50/50 border border-green-100 rounded-lg p-3 space-y-2">
      <div className="text-xs font-medium text-green-800 uppercase tracking-wider">
        12-Month Financial Outlook
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-gray-900">{preventiveCost12mo}</div>
          <div className="text-xs text-muted-foreground">Preventive cost</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-700">{avoidedRepairs12mo}</div>
          <div className="text-xs text-muted-foreground">Likely avoided</div>
        </div>
        <div>
          <div className="text-lg font-bold text-blue-700">{riskReductionPercent}%</div>
          <div className="text-xs text-muted-foreground">Risk reduced</div>
        </div>
      </div>
      
      <p className="text-xs text-center text-green-700 font-medium pt-1">
        {roiStatement}
      </p>
    </div>
  );
}
