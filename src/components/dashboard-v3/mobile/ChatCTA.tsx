import { MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatCTAProps {
  promptText?: string;
  onTap: () => void;
}

/**
 * ChatCTA - Single call-to-action button to open chat
 * 
 * Mobile Render Contract:
 * - One prompt
 * - One button
 * - Opens ChatConsole in sheet/drawer
 */
export function ChatCTA({ promptText = "What should I do?", onTap }: ChatCTAProps) {
  return (
    <Button
      variant="outline"
      onClick={onTap}
      className="w-full h-12 justify-between px-4 bg-card border-border/50 hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{promptText}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
