import { MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import { CHAT_QUICK_REPLIES, getSystemDisplayName } from "@/lib/mobileCopy";

interface ContextualChatLauncherProps {
  primarySystem: SystemTimelineEntry | null;
  priorityExplanation: string;
  onTap: () => void;
}

/**
 * ContextualChatLauncher - System-anchored chat entry point
 * 
 * Mobile Render Contract:
 * - Chat is never blank - opening message is system-authored
 * - Anchored to Primary Focus system
 * - Quick replies are frozen set
 */
export function ContextualChatLauncher({ 
  primarySystem, 
  priorityExplanation,
  onTap 
}: ContextualChatLauncherProps) {
  // Generate contextual prompt based on primary system
  const getPromptText = (): string => {
    if (!primarySystem) {
      return "Help me understand my home";
    }
    
    const systemName = primarySystem.systemLabel || getSystemDisplayName(primarySystem.systemId);
    return `Ask about ${systemName}`;
  };

  return (
    <Button
      variant="outline"
      onClick={onTap}
      className="w-full h-12 justify-between px-4 bg-card border-border/50 hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {getPromptText()}
        </span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}

/**
 * Get the auto-injected opening message for chat
 * Used by MobileChatSheet to seed the conversation
 */
export function getContextualOpeningMessage(
  primarySystem: SystemTimelineEntry | null
): string {
  if (!primarySystem) {
    return "How can I help you understand your home better?";
  }
  
  const systemName = primarySystem.systemLabel || getSystemDisplayName(primarySystem.systemId);
  return `Based on age, risk, and cost impact, the system most worth planning for right now is your ${systemName}.`;
}

/**
 * Export quick replies for use in MobileChatSheet
 */
export { CHAT_QUICK_REPLIES };
