/**
 * ChatConsole — The Entire Middle Column
 * 
 * AUTHORITY MODEL (LOCKED):
 * - Chat console owns 100% of the middle column
 * - Baseline Surface is the FIRST artifact inside the chat (pinned)
 * - Messages appear BELOW the baseline
 * - No standalone cards, no dashboard narration outside chat
 * 
 * BASELINE VS ARTIFACT DISTINCTION:
 * 
 * BaselineSurface (the summary strip):
 * - MAY appear based on chat state/mode
 * - Is part of the chat context UI
 * - Is NOT an artifact
 * 
 * Aging Profile Artifact:
 * - NEVER appears at page load
 * - ONLY appears after justification message
 * - Is rendered inline with messages
 * - Is dismissible and ephemeral
 * 
 * Visual Grammar:
 * - Pure white background
 * - Rounded corners on all four sides
 * - No shadows implying elevation
 * - Baseline is NOT styled as a message bubble
 * - No chat bubbles with tails
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Camera, ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAIHomeAssistant } from "@/hooks/useAIHomeAssistant";
import { BaselineSurface, type BaselineSystem } from "./BaselineSurface";
import { ChatPhotoUpload } from "./ChatPhotoUpload";
import { InlineArtifact } from "./artifacts/InlineArtifact";
import { applySystemUpdate, buildNoSystemDetectedSummary, buildAnalysisFailedSummary } from "@/lib/systemUpdates";
import { track } from "@/lib/analytics";
import type { AdvisorState, RiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";
import type { TodaysFocus } from "@/lib/todaysFocusCopy";
import type { ChatMode, BaselineSource } from "@/types/chatMode";
import type { SystemState } from "@/types/systemState";
import { getChatPlaceholder } from "@/lib/todaysFocusCopy";
import { 
  getPromptsForMode, 
  getEmptyStateForMode, 
  getOpeningMessage, 
  formatOpeningMessage,
  wasBaselineOpeningShown,
  markBaselineOpeningShown,
  getModeBehavior,
  formatProvenanceOpeningMessage,
  getWhyStateLabel,
  generatePersonalBlurb,
  isFirstVisit,
  markFirstVisitComplete,
} from "@/lib/chatModeCopy";
import { getChatModeLabel } from "@/lib/chatModeSelector";

// ============================================
// Types
// ============================================

interface ChatConsoleProps {
  propertyId: string;
  /** Baseline systems for evidence layer */
  baselineSystems: BaselineSystem[];
  /** Year the home was built (for home context) */
  yearBuilt?: number;
  /** Overall confidence level */
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  /** Chat mode for epistemic-aware behavior */
  chatMode?: ChatMode;
  /** Baseline source for provenance-aware messaging */
  baselineSource?: BaselineSource;
  /** System keys with low confidence (for baseline mode) */
  systemsWithLowConfidence?: string[];
  /** Callback when "Why?" is clicked on a system - now injects message into chat */
  onWhyClick: (systemKey: string) => void;
  /** Callback when system is updated via photo analysis */
  onSystemUpdated?: () => void;
  /** Today's focus for context-aware placeholder */
  todaysFocus?: TodaysFocus;
  // Legacy advisor props (for compatibility)
  advisorState?: AdvisorState;
  focusContext?: { systemKey: string; trigger: string };
  hasAgentMessage?: boolean;
  openingMessage?: AdvisorOpeningMessage | null;
  confidence?: number;
  risk?: RiskLevel;
  onUserReply?: () => void;
}

// ============================================
// Component
// ============================================

export function ChatConsole({
  propertyId,
  baselineSystems,
  yearBuilt,
  confidenceLevel,
  chatMode = 'silent_steward',
  baselineSource = 'inferred',
  systemsWithLowConfidence = [],
  onWhyClick,
  onSystemUpdated,
  todaysFocus,
  advisorState = 'PASSIVE',
  focusContext,
  hasAgentMessage = false,
  openingMessage,
  confidence = 0.5,
  risk = 'LOW',
  onUserReply,
}: ChatConsoleProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasShownOpening, setHasShownOpening] = useState(false);
  const [hasShownBaselineOpening, setHasShownBaselineOpening] = useState(() => wasBaselineOpeningShown());
  const [isFirstUserVisit] = useState(() => isFirstVisit());
  // Artifact controls
  const [isBaselineCollapsed, setIsBaselineCollapsed] = useState(false);
  const [isBaselineExpanded, setIsBaselineExpanded] = useState(false);
  // Map baselineSystems to VisibleBaselineSystem format for AI context
  const visibleBaseline = baselineSystems.map(s => ({
    key: s.key,
    displayName: s.displayName,
    state: s.state,
  }));

  const { messages, loading, sendMessage, injectMessage } = useAIHomeAssistant(propertyId, {
    advisorState,
    confidence,
    risk,
    focusSystem: focusContext?.systemKey,
    chatMode,
    // Epistemic coherence: pass baseline context to AI
    baselineSource,
    visibleBaseline,
  });

  // Get mode-specific behavior
  const modeBehavior = getModeBehavior(chatMode);
  const modeLabel = getChatModeLabel(chatMode);

  // Inject opening message when advisor auto-opens chat
  useEffect(() => {
    if (hasAgentMessage && openingMessage && !hasShownOpening) {
      const formattedMessage = `${openingMessage.observation}\n\n${openingMessage.implication}\n\n${openingMessage.optionsPreview}`;
      injectMessage(formattedMessage);
      setHasShownOpening(true);
    }
  }, [hasAgentMessage, openingMessage, hasShownOpening, injectMessage]);

  // Inject personal blurb explaining the System Outlook artifact
  // Uses the new generatePersonalBlurb for warm, time-aware greetings
  useEffect(() => {
    if (
      messages.length === 0 && 
      !hasShownBaselineOpening &&
      baselineSystems.length > 0 // Only show if we have visible baseline
    ) {
      const planningCount = baselineSystems.filter(
        s => s.state === 'planning_window' || s.state === 'elevated'
      ).length;
      
      const message = generatePersonalBlurb({
        yearBuilt,
        systemCount: baselineSystems.length,
        planningCount,
        confidenceLevel,
        isFirstVisit: isFirstUserVisit,
      });
      
      injectMessage(message);
      markBaselineOpeningShown();
      setHasShownBaselineOpening(true);
      
      // Mark first visit complete after showing onboarding message
      if (isFirstUserVisit) {
        markFirstVisitComplete();
      }
    }
  }, [messages.length, hasShownBaselineOpening, injectMessage, baselineSystems, confidenceLevel, yearBuilt, isFirstUserVisit]);

  // Reset opening state when focus changes
  useEffect(() => {
    setHasShownOpening(false);
  }, [focusContext?.systemKey]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle send
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const message = input;
    setInput("");
    
    // Notify parent of user reply (triggers state transition to DECISION)
    onUserReply?.();
    
    await sendMessage(message);
  };

  /**
   * Handle "Why?" click - inject message into chat instead of navigating away
   * This delivers complete understanding in one response (closure, not a thread)
   */
  const handleWhyClick = useCallback((systemKey: string) => {
    const system = baselineSystems.find(s => s.key === systemKey);
    if (!system) return;
    
    track('baseline_why_clicked', { system_key: systemKey }, { surface: 'dashboard' });
    
    // Generate a "Why?" question on user's behalf with state label
    const stateLabel = getWhyStateLabel(system.state);
    sendMessage(`Why is my ${system.displayName.toLowerCase()} showing as "${stateLabel}"?`);
  }, [baselineSystems, sendMessage]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle photo analysis through System Update Contract
   */
  const handlePhotoAnalysis = useCallback(async (photoUrl: string) => {
    try {
      const response = await fetch(
        `https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/analyze-device-photo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY3N1b3VieHloamh4Y2dycWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTQ1MTAsImV4cCI6MjA2NzQ5MDUxMH0.cJbuzANuv6IVQHPAl6UvLJ8SYMw4zFlrE1R2xq9yyjs',
          },
          body: JSON.stringify({ image_url: photoUrl }),
        }
      );

      if (!response.ok) {
        console.error('Photo analysis failed:', response.status);
        sendMessage(buildAnalysisFailedSummary());
        return;
      }

      const data = await response.json();
      const analysis = data?.analysis;

      if (!analysis || !analysis.system_type) {
        sendMessage(buildNoSystemDetectedSummary());
        return;
      }

      const result = await applySystemUpdate({
        home_id: propertyId,
        system_key: analysis.system_type,
        source: 'photo_analysis',
        extracted_data: {
          brand: analysis.brand,
          model: analysis.model,
          serial: analysis.serial,
          manufacture_year: analysis.manufacture_year,
          capacity_rating: analysis.capacity_rating,
          fuel_type: analysis.fuel_type,
          system_type: analysis.system_type,
        },
        confidence_signal: {
          visual_certainty: analysis.visual_certainty ?? 0.5,
          source_reliability: 0.7,
        },
        image_url: photoUrl,
      });

      sendMessage(result.chat_summary);

      if (result.update_applied && result.should_trigger_mode_recompute) {
        onSystemUpdated?.();
      }
    } catch (err) {
      console.error('Photo analysis error:', err);
      sendMessage(buildAnalysisFailedSummary());
    }
  }, [propertyId, sendMessage, onSystemUpdated]);

  // Context-aware placeholder
  const placeholder = todaysFocus 
    ? getChatPlaceholder(todaysFocus)
    : "Ask about your home...";

  // Check if we should show silence (silent_steward with no messages)
  const isSilentSteward = chatMode === 'silent_steward' && messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-card rounded-2xl border border-border/30 overflow-hidden">
      {/* Scrollable content area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* BASELINE SURFACE - Chat-surfaced artifact style */}
          {baselineSystems.length > 0 && (
            <div className={cn(
              "ml-6 rounded-lg border border-border/30 bg-muted/10 overflow-hidden",
              "transition-all duration-200"
            )}>
              {/* Artifact Header with Controls */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/20 bg-muted/5">
                <button 
                  onClick={() => setIsBaselineCollapsed(!isBaselineCollapsed)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isBaselineCollapsed ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                  <span>System Outlook — {baselineSystems.length} systems</span>
                </button>
                <button 
                  onClick={() => setIsBaselineExpanded(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Expand"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              
              {/* Collapsible Content */}
              {!isBaselineCollapsed && (
                <div className="p-3">
                  <BaselineSurface
                    yearBuilt={yearBuilt}
                    confidenceLevel={confidenceLevel}
                    systems={baselineSystems}
                    onWhyClick={handleWhyClick}
                  />
                </div>
              )}
            </div>
          )}

          {/* Chat messages appear BELOW baseline */}
          <div className="space-y-4 pt-2">
            {/* 
              * CANONICAL ARCHITECTURE LOCK:
              * Silent Steward intentionally renders no messages.
              * Silence is a product feature, not an empty state.
              * Do not add fallback copy here.
              */}

            {/* Mode-specific empty state (non-silent modes) */}
            {!isSilentSteward && messages.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">
                  {getEmptyStateForMode(chatMode)}
                </p>
              </div>
            )}
            
            {/* Messages - no bubbles with tails, with inline artifacts */}
            {messages.map((message) => (
              <div key={message.id}>
                {/* Message bubble */}
                <div
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2.5 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-foreground"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
                
                {/* Attached artifact (if chat earned it) */}
                {message.attachedArtifact && (
                  <InlineArtifact
                    artifact={message.attachedArtifact}
                    anchorMessageId={message.id}
                    onCollapse={(id) => {
                      // Track artifact collapse
                      track('artifact_collapsed', { artifact_id: id }, { surface: 'chat' });
                    }}
                    onDismiss={(id) => {
                      // Track artifact dismiss
                      track('artifact_dismissed', { artifact_id: id }, { surface: 'chat' });
                    }}
                  />
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/40 rounded-lg px-4 py-2.5">
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
        </div>
      </ScrollArea>

      {/* Mode-specific suggested prompts (only when few messages) */}
      {messages.length <= 1 && !isSilentSteward && (
        <div className="px-4 pb-2 space-y-2 shrink-0 border-t border-border/20 pt-3">
          <div className="flex flex-wrap gap-2">
            {getPromptsForMode(chatMode).map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setInput(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
          
          {/* Upload affordance - baseline mode only */}
          {modeBehavior.showUploadAffordance && (
            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
              <button 
                className="flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={() => inputRef.current?.focus()}
              >
                <Camera className="h-3 w-3" />
                <span>Improve accuracy with a photo</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input - anchored bottom, always visible */}
      <div className="p-4 border-t border-border/30 shrink-0 bg-white dark:bg-card">
        <div className="flex gap-2">
          <ChatPhotoUpload
            homeId={propertyId}
            onPhotoReady={handlePhotoAnalysis}
            disabled={loading}
          />
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1 bg-muted/20 border-border/40"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Subtle mode indicator */}
        {modeLabel && (
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground/50">{modeLabel}</span>
          </div>
        )}
      </div>
      
      {/* Expanded Modal */}
      <Dialog open={isBaselineExpanded} onOpenChange={setIsBaselineExpanded}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">
              System Aging Profile
            </DialogTitle>
          </DialogHeader>
          <BaselineSurface
            yearBuilt={yearBuilt}
            confidenceLevel={confidenceLevel}
            systems={baselineSystems}
            onWhyClick={handleWhyClick}
            isExpanded={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
