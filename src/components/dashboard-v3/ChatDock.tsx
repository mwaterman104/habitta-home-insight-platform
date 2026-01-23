import { useState, useRef, useEffect } from "react";
import { MessageCircle, ChevronUp, ChevronDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAIHomeAssistant } from "@/hooks/useAIHomeAssistant";
import type { AdvisorState, RiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";

// System display names for context-aware placeholder
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

interface ChatDockProps {
  propertyId: string;
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  advisorState?: AdvisorState;
  focusContext?: { systemKey: string; trigger: string };
  hasAgentMessage?: boolean;
  openingMessage?: AdvisorOpeningMessage | null;
  confidence?: number;
  risk?: RiskLevel;
  onUserReply?: () => void;
}

/**
 * ChatDock - Sticky collapsed-first chat interface
 * 
 * V3.2 Updates:
 * - Rounded top corners (drawer feel)
 * - Upward shadow for visual connection
 * - Context-aware placeholder
 * - Focus header chip (not injected message)
 * 
 * Design:
 * - Collapsed (48px): Input affordance only, or "Habitta has a suggestion" with pulse
 * - Expanded: Full chat interface, max 60% viewport height
 * - Never auto-closes during active conversation
 * - Expands upward (content scrolls behind)
 */
export function ChatDock({
  propertyId,
  isExpanded,
  onExpandChange,
  advisorState = 'PASSIVE',
  focusContext,
  hasAgentMessage = false,
  openingMessage,
  confidence = 0.5,
  risk = 'LOW',
  onUserReply,
}: ChatDockProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasShownOpening, setHasShownOpening] = useState(false);

  const { messages, loading, sendMessage, injectMessage } = useAIHomeAssistant(propertyId, {
    advisorState,
    confidence,
    risk,
    focusSystem: focusContext?.systemKey,
  });

  // Inject opening message when advisor auto-opens chat
  useEffect(() => {
    if (hasAgentMessage && openingMessage && !hasShownOpening && isExpanded) {
      const formattedMessage = `${openingMessage.observation}\n\n${openingMessage.implication}\n\n${openingMessage.optionsPreview}`;
      injectMessage(formattedMessage);
      setHasShownOpening(true);
    }
  }, [hasAgentMessage, openingMessage, hasShownOpening, isExpanded, injectMessage]);

  // Reset opening state when focus changes
  useEffect(() => {
    setHasShownOpening(false);
  }, [focusContext?.systemKey]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isExpanded]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Handle send
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const message = input;
    setInput("");
    
    // Notify parent of user reply (triggers state transition to DECISION)
    onUserReply?.();
    
    await sendMessage(message);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Context-aware placeholder
  const systemName = focusContext?.systemKey 
    ? SYSTEM_NAMES[focusContext.systemKey] || focusContext.systemKey
    : null;
  const placeholder = systemName
    ? `Ask about your ${systemName}...`
    : "Ask about your home...";

  // Collapsed state - floating, minimal (48px)
  if (!isExpanded) {
    return (
      <div className="bg-card rounded-xl border shadow-lg">
        <button
          onClick={() => onExpandChange(true)}
          className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors rounded-xl"
        >
          {hasAgentMessage ? (
            <>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">
                Habitta has a suggestion
              </span>
            </>
          ) : (
            <>
              <Input 
                placeholder={placeholder}
                className="flex-1 bg-muted/50 border-0 cursor-pointer pointer-events-none"
                readOnly
                tabIndex={-1}
              />
            </>
          )}
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </div>
    );
  }

  // Expanded state - floating chat interface with drawer feel
  return (
    <div className="bg-card rounded-xl border shadow-lg flex flex-col max-h-[75vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b shrink-0 rounded-t-xl">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Habitta</span>
          {/* Subtle state indicator */}
          <span className="text-xs text-muted-foreground">
            {advisorState === 'DECISION' && '• Comparing options'}
            {advisorState === 'EXECUTION' && '• Ready to act'}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={() => onExpandChange(false)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Focus context header chip (NOT a message) */}
      {focusContext?.systemKey && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
          <Badge variant="secondary" className="text-xs">
            Focus: {SYSTEM_NAMES[focusContext.systemKey] || focusContext.systemKey}
          </Badge>
        </div>
      )}

      {/* Messages - scrollable area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">I'll let you know when something important changes.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-3 w-3 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "rounded-lg px-3 py-2 max-w-[80%] text-sm whitespace-pre-wrap",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {message.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MessageCircle className="h-3 w-3 text-primary" />
            </div>
            <div className="bg-muted rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Contextual suggestions (only in ENGAGED state with low message count) */}
      {messages.length <= 1 && advisorState === 'ENGAGED' && (
        <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
          {[
            "Walk me through my options",
            "What happens if I wait?",
            "Help me understand the timeline"
          ].map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setInput(suggestion);
              }}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      {/* Input - always visible */}
      <div className="p-3 border-t shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
