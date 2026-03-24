import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Wallet, ShieldCheck } from "lucide-react";

interface FinancialOutlookCardProps {
  estimatedCosts: string;        // e.g., "$450–$700"
  avoidedRepairs?: string;       // e.g., "~$1,200"
  riskReduced?: string;          // e.g., "18%"
}

/**
 * FinancialOutlookCard - Home financial outlook summary
 * Shows estimated maintenance costs, avoided repairs, and risk reduction
 */
export function FinancialOutlookCard({ 
  estimatedCosts, 
  avoidedRepairs,
  riskReduced 
}: FinancialOutlookCardProps) {
  return (
    <Card className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
      <CardContent className="p-5 space-y-3">
        <div className="text-xs text-blue-600 uppercase tracking-wider font-medium">
          Your Home Financial Outlook
        </div>
        
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-gray-500" />
          <p className="font-medium text-gray-900">
            Estimated maintenance (12 months): <span className="text-blue-700">{estimatedCosts}</span>
          </p>
        </div>
        
        {avoidedRepairs && (
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <p className="text-green-700 text-sm font-medium">
              Avoided repairs so far: {avoidedRepairs}
            </p>
          </div>
        )}
        
        {riskReduced && (
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-gray-400" />
            <p className="text-sm text-muted-foreground">
              Risk reduced through maintenance: <span className="font-medium">{riskReduced}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
