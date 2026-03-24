import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from "lucide-react";
import { getStewardshipCopy, type MonthlyResponse } from "@/lib/stewardshipCopy";
import { cn } from "@/lib/utils";

interface MonthlyConfirmationCardProps {
  homeId: string;
  onResponse: (response: MonthlyResponse) => void;
  onDismiss: () => void;
}

/**
 * MonthlyConfirmationCard - 30-second monthly validation
 * 
 * Non-anxious, dismissible. Uses validation language.
 * Response quietly increments confidence by 0.01.
 */
export function MonthlyConfirmationCard({ 
  homeId, 
  onResponse, 
  onDismiss 
}: MonthlyConfirmationCardProps) {
  const copy = getStewardshipCopy().monthlyValidation;
  const responses: MonthlyResponse[] = ['nothing_changed', 'system_replaced', 'renovation', 'insurance_update'];

  return (
    <Card className="rounded-xl border-2 border-blue-100 bg-blue-50/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                {copy.headline}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={onDismiss}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            <p className="text-sm text-foreground mb-3">
              {copy.prompt}
            </p>
            
            {/* Response options as pills */}
            <div className="flex flex-wrap gap-2">
              {responses.map((response) => (
                <Button
                  key={response}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-xs rounded-full",
                    "bg-white/80 hover:bg-white",
                    "border-blue-200 hover:border-blue-300"
                  )}
                  onClick={() => onResponse(response)}
                >
                  {copy.responses[response]}
                </Button>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground mt-3">
              {copy.dismissText}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
