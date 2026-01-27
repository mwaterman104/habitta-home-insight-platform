/**
 * ContextDrawer - Merged Intelligence Surface
 * 
 * Replaces: HomeHealthOutlook causality, HabittaThinking, cadence cards
 * 
 * Collapsed by default. Opens only when:
 * - User clicks "Why?"
 * - OR System Watch is visible
 * - OR changedSinceLastVisit === true
 * 
 * Content structure (fixed order):
 * 1. Why This Surfaced (rationale)
 * 2. What We're Seeing (signals - max 3)
 * 3. Confidence (text only)
 * 4. Capital Advisory (quiet tier)
 */

import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { 
  getConfidenceDescription, 
  type FocusState,
  type ContextDrawerData,
  type CapitalAdvisory,
} from "@/lib/todaysFocusCopy";

interface ContextDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  context: ContextDrawerData;
  capitalAdvisory?: CapitalAdvisory;
  focusState: FocusState;
}

export function ContextDrawer({
  isOpen,
  onOpenChange,
  context,
  capitalAdvisory,
}: ContextDrawerProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleContent>
        <Card className="rounded-xl border-0 bg-muted/20">
          <CardContent className="py-4 px-5 space-y-4">
            {/* Section A: Why This Surfaced */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Why this surfaced
              </h4>
              <p className="text-sm text-foreground">
                {context.rationale}
              </p>
            </div>
            
            {/* Section B: What We're Seeing (Signals) */}
            {context.signals.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  What we're seeing
                </h4>
                <ul className="space-y-1.5">
                  {context.signals.slice(0, 3).map((signal, i) => (
                    <li 
                      key={i} 
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Section C: Confidence */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Confidence
              </h4>
              <p className="text-sm text-muted-foreground">
                {getConfidenceDescription(context.confidenceLanguage)}
              </p>
            </div>
            
            {/* Section D: Capital Advisory (quiet tier) */}
            {capitalAdvisory && (
              <div className="pt-3 border-t border-border/50">
                <p className="text-sm text-muted-foreground italic">
                  {capitalAdvisory.insight}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
