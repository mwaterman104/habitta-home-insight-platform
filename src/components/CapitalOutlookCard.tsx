import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendingUp } from "lucide-react";
import type { CapitalOutlook } from "@/types/capitalTimeline";

interface CapitalOutlookCardProps {
  outlook: CapitalOutlook;
}

/**
 * CapitalOutlookCard - Summarizes expected capital exposure
 * 
 * "This is where conversion happens"
 * Shows 3yr / 5yr / 10yr roll-ups with weighted methodology
 */
export function CapitalOutlookCard({ outlook }: CapitalOutlookCardProps) {
  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount}`;
  };

  // Determine if there's significant near-term exposure
  const horizon3 = outlook.horizons.find(h => h.yearsAhead === 3);
  const hasNearTermExposure = horizon3 && horizon3.highEstimate > 5000;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Capital Outlook</CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Estimated capital expenditure based on system replacement probability.
                  Ranges reflect uncertainty in timing and costs.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          {outlook.horizons.map(h => (
            <div key={h.yearsAhead} className="space-y-1">
              <div className="text-2xl font-bold text-foreground">
                {formatAmount(h.lowEstimate)}–{formatAmount(h.highEstimate)}
              </div>
              <div className="text-xs text-muted-foreground">
                Next {h.yearsAhead} years
              </div>
            </div>
          ))}
        </div>
        
        {hasNearTermExposure && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Significant capital needs identified within 3 years. 
              Consider budgeting ahead.
            </p>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground text-center mt-4 italic">
          {outlook.methodologyNote}
        </p>
      </CardContent>
    </Card>
  );
}
