import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// System display names
const SYSTEM_NAMES: Record<string, string> = {
  hvac: 'HVAC',
  water_heater: 'water heater',
  roof: 'roof',
  safety: 'safety systems',
  exterior: 'exterior',
  gutters: 'gutters',
  plumbing: 'plumbing',
  electrical: 'electrical',
};

interface SystemInWindow {
  key: string;
  remainingYears: number;
  replacementCost?: number;
  confidence?: number;
}

interface HabittaThinkingProps {
  /**
   * Systems in planning window (sorted by urgency)
   */
  systemsInWindow: SystemInWindow[];
  /**
   * Whether chat has been engaged this session
   */
  chatEngagedThisSession: boolean;
  /**
   * Called when user clicks "Talk about {System}"
   */
  onTalkClick: (systemKey: string) => void;
  /**
   * Called when user clicks "Not right now"
   */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Select the primary system to discuss based on:
 * 1. Lowest remainingYears
 * 2. Tie-breaker: higher replacement cost
 * 3. Tie-breaker: lowest confidence
 */
function selectPrimarySystem(systems: SystemInWindow[]): SystemInWindow | null {
  if (systems.length === 0) return null;
  
  return systems.reduce((best, current) => {
    // Primary: lowest remaining years
    if (current.remainingYears < best.remainingYears) return current;
    if (current.remainingYears > best.remainingYears) return best;
    
    // Tie-breaker 1: higher replacement cost
    const bestCost = best.replacementCost ?? 0;
    const currentCost = current.replacementCost ?? 0;
    if (currentCost > bestCost) return current;
    if (currentCost < bestCost) return best;
    
    // Tie-breaker 2: lowest confidence
    const bestConf = best.confidence ?? 1;
    const currentConf = current.confidence ?? 1;
    if (currentConf < bestConf) return current;
    
    return best;
  });
}

/**
 * HabittaThinking - Chat presence above the fold
 * 
 * Signals that Habitta is actively reasoning before the user scrolls or clicks.
 * This component invites conversation without demanding it.
 * 
 * Display rules (strict):
 * - Hidden if chat has been engaged this session
 * - Hidden if dismissed this session
 * - Hidden if no systems in planning window
 * 
 * Placement: Between HomeHealthCard and CapitalTimeline
 */
export function HabittaThinking({
  systemsInWindow,
  chatEngagedThisSession,
  onTalkClick,
  onDismiss,
  className,
}: HabittaThinkingProps) {
  // Session-level dismissal state
  const [dismissedThisSession, setDismissedThisSession] = useState(() => 
    sessionStorage.getItem('habitta_thinking_dismissed') === 'true'
  );

  // Reset on mount if this is a new session
  useEffect(() => {
    // Check if this is likely a new session (simple approach)
    const lastDismissTime = sessionStorage.getItem('habitta_thinking_dismiss_time');
    if (lastDismissTime) {
      const elapsed = Date.now() - parseInt(lastDismissTime, 10);
      // If more than 30 minutes, reset
      if (elapsed > 30 * 60 * 1000) {
        sessionStorage.removeItem('habitta_thinking_dismissed');
        sessionStorage.removeItem('habitta_thinking_dismiss_time');
        setDismissedThisSession(false);
      }
    }
  }, []);

  // Display rules
  if (chatEngagedThisSession) return null;
  if (dismissedThisSession) return null;
  if (systemsInWindow.length === 0) return null;

  const primarySystem = selectPrimarySystem(systemsInWindow);
  if (!primarySystem) return null;

  const systemName = SYSTEM_NAMES[primarySystem.key] || primarySystem.key;
  const displayName = systemName.charAt(0).toUpperCase() + systemName.slice(1);

  const handleDismiss = () => {
    sessionStorage.setItem('habitta_thinking_dismissed', 'true');
    sessionStorage.setItem('habitta_thinking_dismiss_time', Date.now().toString());
    setDismissedThisSession(true);
    onDismiss?.();
  };

  const handleTalk = () => {
    onTalkClick(primarySystem.key);
  };

  // Generate contextual message based on remaining years
  const getMessage = () => {
    const years = primarySystem.remainingYears;
    if (years <= 2) {
      return `Your ${systemName} is approaching end of life.`;
    }
    if (years <= 5) {
      return `Your ${systemName} is entering a planning window.`;
    }
    return `Your ${systemName} may need attention in the coming years.`;
  };

  return (
    <Card className={className}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary mb-1">
              Habitta's thinking
            </p>
            <p className="text-sm text-foreground mb-3">
              {getMessage()}
              <br />
              <span className="text-muted-foreground">
                Want to talk through options now, or keep an eye on it?
              </span>
            </p>
            
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={handleTalk}
                className="text-xs"
              >
                Talk about {displayName}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs text-muted-foreground"
              >
                Not right now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
