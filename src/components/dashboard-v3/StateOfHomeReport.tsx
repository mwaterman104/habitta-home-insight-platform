import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, TrendingUp, X, ChevronDown, ChevronUp } from "lucide-react";
import { getStewardshipCopy } from "@/lib/stewardshipCopy";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AnnualBriefData {
  heldSteady: Array<{ system: string; description: string }>;
  agedSlightly: Array<{ system: string; description: string }>;
  filteredOut: Array<{ id: string; description: string }>;
  confidenceTrajectory: {
    startOfYear: number;
    current: number;
    improved: boolean;
  };
}

interface StateOfHomeReportProps {
  data: AnnualBriefData;
  onDismiss: () => void;
}

/**
 * StateOfHomeReport - Annual stewardship briefing
 * 
 * Creates structural bond through accumulated context.
 * "What Habitta filtered out" = the bond mechanism.
 * Makes cancellation hard because history is expensive to recreate.
 */
export function StateOfHomeReport({ data, onDismiss }: StateOfHomeReportProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const copy = getStewardshipCopy().annualBrief;

  const year = new Date().getFullYear();
  const confidencePercent = Math.round(data.confidenceTrajectory.current * 100);
  const startPercent = Math.round(data.confidenceTrajectory.startOfYear * 100);

  return (
    <Card className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {copy.header} — {year}
              </h3>
              <p className="text-xs text-muted-foreground">
                Annual stewardship briefing
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            {data.heldSteady.length} systems stable
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            {data.agedSlightly.length} aging normally
          </Badge>
          <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
            {data.filteredOut.length} items filtered
          </Badge>
        </div>

        {/* What held steady */}
        <section className="mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2">
            {copy.sectionsLabels.heldSteady}
          </h4>
          <ul className="space-y-1.5">
            {data.heldSteady.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">{item.system}:</strong>{' '}
                  <span className="text-muted-foreground">{item.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Expand toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground mb-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>Hide details <ChevronUp className="h-4 w-4 ml-1" /></>
          ) : (
            <>See full report <ChevronDown className="h-4 w-4 ml-1" /></>
          )}
        </Button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t border-primary/10 animate-in slide-in-from-top-2 duration-200">
            {/* What aged slightly */}
            {data.agedSlightly.length > 0 && (
              <section>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  {copy.sectionsLabels.agedSlightly}
                </h4>
                <ul className="space-y-1.5">
                  {data.agedSlightly.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 mt-0.5">—</span>
                      <span>
                        <strong className="text-foreground">{item.system}:</strong>{' '}
                        <span className="text-muted-foreground">{item.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* What Habitta filtered out - THE BOND MECHANISM */}
            <section className="bg-muted/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {copy.sectionsLabels.filteredOut}
              </h4>
              <ul className="space-y-1.5">
                {data.filteredOut.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-muted-foreground/50">—</span>
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground/70 italic mt-3">
                {copy.filteredOutFooter}
              </p>
            </section>

            {/* Confidence trajectory */}
            <section>
              <h4 className="text-sm font-medium text-foreground mb-2">
                {copy.sectionsLabels.confidenceTrajectory}
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">Start of year:</span>
                  <span className="text-sm font-medium">{startPercent}%</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">Now:</span>
                  <span className="text-sm font-semibold text-primary">{confidencePercent}%</span>
                  {data.confidenceTrajectory.improved && (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
              </div>
            </section>

            {/* Accumulated context note */}
            <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3 italic">
              {copy.accumulatedContextNote}
            </p>
          </div>
        )}

        {/* Dismiss action */}
        <div className="mt-4 pt-3 border-t border-primary/10">
          <Button 
            className="w-full" 
            onClick={onDismiss}
          >
            Continue to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
