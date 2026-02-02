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
}: MobileChatSheetProps) {
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
            hasAgentMessage={!!openingMessage}
            openingMessage={openingMessage}
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
