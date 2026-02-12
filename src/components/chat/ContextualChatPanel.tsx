import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatConsole } from "@/components/dashboard-v3/ChatConsole";
import { useChatContext } from "@/contexts/ChatContext";
import { getContextualAssistantMessage } from "@/lib/chatContextCopy";
import { cn } from "@/lib/utils";
import { HomeProfileRecordBar, type StrengthLevel } from "@/components/home-profile/HomeProfileRecordBar";

interface ContextualChatPanelProps {
  propertyId: string;
  yearBuilt?: number;
  strengthScore?: number;
  strengthLevel?: StrengthLevel;
}

/**
 * ContextualChatPanel - Desktop right-side slide-out chat panel
 * 
 * Wraps ChatConsole with contextual opening messages.
 * Scoped to the current ChatContext (system, maintenance, etc.)
 */
export function ContextualChatPanel({ propertyId, yearBuilt, strengthScore, strengthLevel }: ContextualChatPanelProps) {
  const { chatContext, isOpen, closeChat } = useChatContext();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, closeChat]);

  if (!isOpen || !chatContext) return null;

  const assistantMessage = getContextualAssistantMessage(chatContext);

  return (
    <div className={cn(
      "w-[400px] shrink-0 border-l border-border bg-card",
      "flex flex-col",
      "animate-in slide-in-from-right duration-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <h2 className="text-base font-semibold text-foreground">Ask Habitta</h2>
        <Button variant="ghost" size="sm" onClick={closeChat} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Home Profile Record Bar */}
      {strengthScore != null && (
        <div className="px-4 py-2 border-b border-border/20 shrink-0">
          <HomeProfileRecordBar strengthScore={strengthScore} strengthLevel={strengthLevel} compact />
        </div>
      )}
      
      {/* Chat */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatConsole
          propertyId={propertyId}
          baselineSystems={[]}
          confidenceLevel="Moderate"
          yearBuilt={yearBuilt}
          focusContext={chatContext.systemKey ? { systemKey: chatContext.systemKey, trigger: chatContext.trigger || '' } : undefined}
          hasAgentMessage={true}
          openingMessage={{
            observation: assistantMessage,
            implication: "",
            optionsPreview: "",
          }}
          autoSendMessage={chatContext.autoSendMessage}
          onWhyClick={() => {}}
        />
      </div>
    </div>
  );
}
