import { useRef, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ChatConsole } from "../ChatConsole";
import type { BaselineSystem } from "../BaselineSurface";
import type { AdvisorState, AdvisorOpeningMessage, RiskLevel } from "@/types/advisorState";
import type { ChatMode, BaselineSource } from "@/types/chatMode";

interface MobileChatSheetProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  baselineSystems: BaselineSystem[];
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  yearBuilt?: number;
  advisorState?: AdvisorState;
  focusContext?: { systemKey: string; trigger: string };
  openingMessage?: AdvisorOpeningMessage | null;
  confidence?: number;
  risk?: RiskLevel;
  onUserReply?: () => void;
  chatMode?: ChatMode;
  baselineSource?: BaselineSource;
  systemsWithLowConfidence?: string[];
  onSystemUpdated?: () => void;
  onWhyClick?: (systemKey: string) => void;
  /** Contextual priming message to inject on first open */
  primingMessage?: string;
}

/**
 * MobileChatSheet - Bottom drawer for chat on mobile
 * 
 * Mobile Render Contract: Chat never competes with content.
 * Chat appears only after CTA tap.
 */
export function MobileChatSheet({ 
  open, 
  onClose, 
  propertyId,
  baselineSystems,
  confidenceLevel,
  yearBuilt,
  advisorState = 'PASSIVE',
  focusContext,
  openingMessage,
  confidence = 0.5,
  risk = 'LOW',
  onUserReply,
  chatMode = 'silent_steward',
  baselineSource = 'inferred',
  systemsWithLowConfidence = [],
  onSystemUpdated,
  onWhyClick = () => {},
  primingMessage,
}: MobileChatSheetProps) {
  /**
   * Rule 2: Priming Injection is Per-Context, Not Per-Open
   * Guard against re-injection when user re-opens for same system
   */
  const hasPrimedForContext = useRef<string | null>(null);
  
  // Generate dynamic opening message from priming if available
  const effectiveOpeningMessage: AdvisorOpeningMessage | null = (() => {
    if (openingMessage) return openingMessage;
    
    // If we have a priming message and haven't primed for this context yet
    if (primingMessage && focusContext?.systemKey) {
      if (hasPrimedForContext.current !== focusContext.systemKey) {
        // Convert priming message to AdvisorOpeningMessage format
        return {
          observation: primingMessage,
          implication: "Tell me what you're seeing or any concerns you have.",
          optionsPreview: "I can help you understand what's normal and what might need attention.",
        };
      }
    }
    return null;
  })();
  
  // Track when we've primed for a context
  useEffect(() => {
    if (open && primingMessage && focusContext?.systemKey) {
      if (hasPrimedForContext.current !== focusContext.systemKey) {
        hasPrimedForContext.current = focusContext.systemKey;
      }
    }
  }, [open, primingMessage, focusContext?.systemKey]);
  
  // Reset guard when context changes completely (different system)
  useEffect(() => {
    if (!open && focusContext?.systemKey) {
      // Don't reset - we want to remember we primed for this system
    }
  }, [open, focusContext?.systemKey]);
  
  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="h-[85vh] flex flex-col">
        <DrawerHeader className="shrink-0 py-3 border-b border-border/30">
          <DrawerTitle className="text-base">Ask Habitta</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatConsole
            propertyId={propertyId}
            baselineSystems={baselineSystems}
            confidenceLevel={confidenceLevel}
            yearBuilt={yearBuilt}
            advisorState={advisorState}
            focusContext={focusContext}
            hasAgentMessage={!!effectiveOpeningMessage}
            openingMessage={effectiveOpeningMessage}
            confidence={confidence}
            risk={risk}
            onUserReply={onUserReply}
            chatMode={chatMode}
            baselineSource={baselineSource}
            systemsWithLowConfidence={systemsWithLowConfidence}
            onSystemUpdated={onSystemUpdated}
            onWhyClick={onWhyClick}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
