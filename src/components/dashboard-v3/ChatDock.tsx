import { useState, useRef, useEffect } from "react";
import { MessageCircle, ChevronUp, ChevronDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAIHomeAssistant } from "@/hooks/useAIHomeAssistant";
import type { AdvisorState, RiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";

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
 * ChatDock - Collapsible chat interface with advisor state integration
 * 
 * Behavior rules:
 * - Chat auto-opens only when triggered by advisor state machine
 * - Chat never auto-closes (user control only)
 * - Opening message follows Observation → Implication → Options structure
 * - Silence is intentional in PASSIVE/OBSERVING states
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

  // Collapsed state
  if (!isExpanded) {
    return (
      <Card 
        className={cn(
          "transition-all duration-200",
          hasAgentMessage && "shadow-md border-primary/20"
        )}
      >
        <button
          onClick={() => onExpandChange(true)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              hasAgentMessage ? "bg-primary/10" : "bg-muted"
            )}>
              <MessageCircle className={cn(
                "h-4 w-4",
                hasAgentMessage ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="text-left">
              {hasAgentMessage ? (
                <p className="text-sm font-medium text-primary">Habitta has a suggestion</p>
              ) : (
                <p className="text-sm text-muted-foreground">Ask about your home...</p>
              )}
            </div>
          </div>
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </button>
      </Card>
    );
  }

  // Expanded state
  return (
    <Card className="transition-all duration-200 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
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

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4 space-y-4">
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
        <div className="px-4 pb-2 flex flex-wrap gap-2">
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

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your home..."
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
    </Card>
  );
}
