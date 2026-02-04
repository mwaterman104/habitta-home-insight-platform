import { MessageCircle, ChevronRight } from "lucide-react";

interface DockedChatInputProps {
  systemKey: string;
  systemLabel: string;
  onExpandChat: () => void;
}

/**
 * DockedChatInput - Persistent chat input for System Plan screens
 * 
 * This component provides a visual affordance that looks like an input
 * but expands to the full chat sheet when tapped.
 * 
 * Key behaviors:
 * - Always visible at bottom of System Plan screens
 * - Pre-scoped placeholder: "Ask about this [system]..."
 * - Tapping expands to MobileChatSheet
 * - Minimal height (~56px) to preserve content visibility
 */
export function DockedChatInput({
  systemKey,
  systemLabel,
  onExpandChat,
}: DockedChatInputProps) {
  return (
    <button
      onClick={onExpandChat}
      className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors border-b border-border/50"
    >
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
        <MessageCircle className="h-4 w-4 text-primary" />
      </div>
      
      <span className="flex-1 text-left text-sm text-muted-foreground">
        Ask about this {systemLabel.toLowerCase()}...
      </span>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
