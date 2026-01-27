import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SYSTEM_NAMES: Record<string, string> = {
  hvac: 'HVAC',
  roof: 'roof',
  water_heater: 'water heater',
  electrical: 'electrical system',
  plumbing: 'plumbing',
  windows: 'windows',
};

interface MonthlyPriorityCTAProps {
  suggestedSystemSlug?: string;
  chatEngagedThisSession: boolean;
  hasSystemsInWindow: boolean;
  isStable?: boolean;  // QA #3: Gate behind non-stable states
  onAskClick: () => void;
}

/**
 * MonthlyPriorityCTA - Contextual Prompt
 * 
 * Display Rules:
 * - NEVER shown when isStable === true (QA #3 doctrine compliance)
 * - Shown at most once per session
 * - Suppressed if user already engaged chat this session
 * - Suppressed if no systems are in later lifecycle stages
 * - Copy adapts to system context if available
 */
export function MonthlyPriorityCTA({
  suggestedSystemSlug,
  chatEngagedThisSession,
  hasSystemsInWindow,
  isStable = false,
  onAskClick,
}: MonthlyPriorityCTAProps) {
  // Session-level dedup
  const [hasShown, setHasShown] = useState(() => 
    sessionStorage.getItem('habitta_monthly_priority_shown') === 'true'
  );

  useEffect(() => {
    if (!hasShown) {
      sessionStorage.setItem('habitta_monthly_priority_shown', 'true');
      setHasShown(true);
    }
  }, [hasShown]);

  // Suppression logic
  // QA #3: Never show in stable state (doctrine compliance)
  if (isStable) return null;
  if (chatEngagedThisSession) return null;
  if (!hasSystemsInWindow) return null;

  // Adaptive copy based on system context
  // Doctrine compliance: Soften "needs attention" to "worth understanding"
  const systemName = suggestedSystemSlug 
    ? SYSTEM_NAMES[suggestedSystemSlug] || suggestedSystemSlug 
    : null;

  const headline = systemName
    ? `Your ${systemName} is worth understanding better.`
    : "What would you like to explore?";

  const subtext = systemName
    ? "Get context on its current lifecycle stage."
    : "Let Habitta provide context.";

  return (
    <Card className="rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{headline}</p>
            <p className="text-xs text-muted-foreground">{subtext}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onAskClick}
            className="shrink-0 text-primary hover:text-primary hover:bg-primary/10"
          >
            Ask Habitta →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
