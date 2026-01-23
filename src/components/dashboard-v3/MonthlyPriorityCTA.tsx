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
  onAskClick: () => void;
}

/**
 * MonthlyPriorityCTA - Chat-first monthly prompt
 * 
 * Display Rules:
 * - Shown at most once per session
 * - Suppressed if user already engaged chat this session
 * - Suppressed if no systems are in planning windows
 * - Copy adapts to system context if available
 * 
 * This replaces static CTAs with a conversational action.
 */
export function MonthlyPriorityCTA({
  suggestedSystemSlug,
  chatEngagedThisSession,
  hasSystemsInWindow,
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
  if (chatEngagedThisSession) return null;
  if (!hasSystemsInWindow) return null;

  // Adaptive copy based on system context
  const systemName = suggestedSystemSlug 
    ? SYSTEM_NAMES[suggestedSystemSlug] || suggestedSystemSlug 
    : null;

  const headline = systemName
    ? `Your ${systemName} needs attention.`
    : "What should I focus on this month?";

  const subtext = systemName
    ? "Get personalized guidance for your planning window."
    : "Let Habitta help you prioritize.";

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
