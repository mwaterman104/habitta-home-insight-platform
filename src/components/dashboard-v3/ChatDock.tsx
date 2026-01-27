import { useState, useRef, useEffect } from "react";
import { MessageCircle, ChevronUp, ChevronDown, Send, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAIHomeAssistant } from "@/hooks/useAIHomeAssistant";
import type { AdvisorState, RiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";
import type { TodaysFocus } from "@/lib/todaysFocusCopy";
import type { ChatMode } from "@/types/chatMode";
import { getChatPlaceholder, formatSystemName } from "@/lib/todaysFocusCopy";
import { 
  getPromptsForMode, 
  getEmptyStateForMode, 
  getOpeningMessage, 
  formatOpeningMessage,
  wasBaselineOpeningShown,
  markBaselineOpeningShown,
  getModeBehavior,
} from "@/lib/chatModeCopy";
import { getChatModeLabel } from "@/lib/chatModeSelector";

// System display names for context-aware placeholder (legacy fallback)
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
  todaysFocus?: TodaysFocus;
  /** Chat mode for epistemic-aware behavior */
  chatMode?: ChatMode;
  /** System keys with low confidence (for baseline mode) */
  systemsWithLowConfidence?: string[];
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
  todaysFocus,
  chatMode = 'observational',
  systemsWithLowConfidence = [],
}: ChatDockProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasShownOpening, setHasShownOpening] = useState(false);
  const [hasShownBaselineOpening, setHasShownBaselineOpening] = useState(() => wasBaselineOpeningShown());

  const { messages, loading, sendMessage, injectMessage } = useAIHomeAssistant(propertyId, {
    advisorState,
    confidence,
    risk,
    focusSystem: focusContext?.systemKey,
    chatMode,
  });

  // Get mode-specific behavior
  const modeBehavior = getModeBehavior(chatMode);
  const modeLabel = getChatModeLabel(chatMode);

  // Inject opening message when advisor auto-opens chat
  useEffect(() => {
    if (hasAgentMessage && openingMessage && !hasShownOpening && isExpanded) {
      const formattedMessage = `${openingMessage.observation}\n\n${openingMessage.implication}\n\n${openingMessage.optionsPreview}`;
      injectMessage(formattedMessage);
      setHasShownOpening(true);
    }
  }, [hasAgentMessage, openingMessage, hasShownOpening, isExpanded, injectMessage]);

  // Inject baseline opening message (once per session) when in baseline mode
  useEffect(() => {
    if (
      chatMode === 'baseline_establishment' && 
      isExpanded && 
      messages.length === 0 && 
      !hasShownBaselineOpening
    ) {
      const baselineConfig = getOpeningMessage(chatMode);
      if (baselineConfig) {
        const formattedMessage = formatOpeningMessage(baselineConfig);
        injectMessage(formattedMessage);
        markBaselineOpeningShown();
        setHasShownBaselineOpening(true);
      }
    }
  }, [chatMode, isExpanded, messages.length, hasShownBaselineOpening, injectMessage]);

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

  // Context-aware placeholder - prioritize todaysFocus over focusContext
  const placeholder = todaysFocus 
    ? getChatPlaceholder(todaysFocus)
    : focusContext?.systemKey 
      ? `Ask about your ${SYSTEM_NAMES[focusContext.systemKey] || focusContext.systemKey}...`
      : "Ask about your home...";

  // Collapsed state - dockable panel, ~80px
  if (!isExpanded) {
    return (
      <div className="bg-card rounded-xl border shadow-sm transition-all duration-200">
        <button
          onClick={() => onExpandChange(true)}
          className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors rounded-xl"
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

  // Expanded state - dockable panel with bounded height
  return (
    <div className="bg-card rounded-xl border shadow-sm flex flex-col max-h-[min(60vh,420px)] transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b shrink-0 rounded-t-xl">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Habitta</span>
          {/* Mode-specific state indicator */}
          {modeLabel && (
            <span className="text-xs text-muted-foreground">{modeLabel}</span>
          )}
          {/* Legacy advisor state indicators */}
          {!modeLabel && advisorState === 'DECISION' && (
            <span className="text-xs text-muted-foreground">• Comparing options</span>
          )}
          {!modeLabel && advisorState === 'EXECUTION' && (
            <span className="text-xs text-muted-foreground">• Ready to act</span>
          )}
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
            <p className="text-sm">
              {getEmptyStateForMode(chatMode)}
            </p>
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

      {/* Mode-specific suggested prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 space-y-2 shrink-0">
          {/* Prompt suggestions */}
          <div className="flex flex-wrap gap-2">
            {getPromptsForMode(chatMode).map((suggestion) => (
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
          
          {/* Upload affordance - baseline mode only (subtle, equal weight) */}
          {modeBehavior.showUploadAffordance && (
            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
              <button 
                className="flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={() => {
                  // Navigate to photo capture or trigger modal
                  // This links to existing photo capture flow
                }}
              >
                <Camera className="h-3 w-3" />
                <span>Improve accuracy</span>
              </button>
            </div>
          )}
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
