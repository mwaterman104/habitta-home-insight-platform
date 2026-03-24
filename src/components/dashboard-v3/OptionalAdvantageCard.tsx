import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X, ExternalLink } from "lucide-react";
import { getStewardshipCopy } from "@/lib/stewardshipCopy";

interface AdvantageOpportunity {
  advantageType: 'insurance_window' | 'service_pricing' | 'deferral_confirmation';
  headline: string;
  explanation: string;
}

interface OptionalAdvantageCardProps {
  advantage: AdvantageOpportunity;
  homeId: string;
  onDismiss: () => void;
}

/**
 * OptionalAdvantageCard - Timing-advantaged opportunities
 * 
 * Only surfaces when timing favors the homeowner.
 * Dismissible, non-repeating for 90 days.
 * Builds trust by showing restraint.
 */
export function OptionalAdvantageCard({ 
  advantage, 
  homeId, 
  onDismiss 
}: OptionalAdvantageCardProps) {
  const copy = getStewardshipCopy().optionalAdvantage;

  const getAdvantageColor = () => {
    switch (advantage.advantageType) {
      case 'insurance_window': return 'border-violet-100 bg-violet-50/30';
      case 'service_pricing': return 'border-emerald-100 bg-emerald-50/30';
      case 'deferral_confirmation': return 'border-blue-100 bg-blue-50/30';
    }
  };

  const getIconColor = () => {
    switch (advantage.advantageType) {
      case 'insurance_window': return 'bg-violet-100 text-violet-600';
      case 'service_pricing': return 'bg-emerald-100 text-emerald-600';
      case 'deferral_confirmation': return 'bg-blue-100 text-blue-600';
    }
  };

  const getLabelColor = () => {
    switch (advantage.advantageType) {
      case 'insurance_window': return 'text-violet-700';
      case 'service_pricing': return 'text-emerald-700';
      case 'deferral_confirmation': return 'text-blue-700';
    }
  };

  const getLabel = () => {
    switch (advantage.advantageType) {
      case 'insurance_window': return 'Insurance opportunity';
      case 'service_pricing': return 'Service pricing';
      case 'deferral_confirmation': return 'Timing confirmation';
    }
  };

  return (
    <Card className={`rounded-xl border-2 ${getAdvantageColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-2.5">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${getIconColor()}`}>
            <Sparkles className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold uppercase tracking-wider ${getLabelColor()}`}>
                {getLabel()}
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
            
            <p className="text-sm text-foreground font-medium mb-1">
              {advantage.headline}
            </p>
            
            <p className="text-sm text-muted-foreground">
              {advantage.explanation}
            </p>

            {/* Optional learn more link */}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 text-xs text-muted-foreground hover:text-foreground p-0"
            >
              {copy.learnMoreText}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
