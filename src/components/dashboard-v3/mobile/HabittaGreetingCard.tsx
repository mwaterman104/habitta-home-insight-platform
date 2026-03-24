import { Home, ChevronRight } from "lucide-react";

interface HabittaGreetingCardProps {
  text: string;
  onTap: () => void;
}

/**
 * HabittaGreetingCard — Tappable greeting module for mobile Home Pulse.
 * Displays the Habitta-generated contextual message with a home icon.
 * Tapping navigates to the /chat page to continue the conversation.
 */
export function HabittaGreetingCard({ text, onTap }: HabittaGreetingCardProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full text-left rounded-2xl bg-[hsl(var(--habitta-ivory))] border border-border p-4 flex items-start gap-3 active:bg-accent/50 transition-colors touch-manipulation"
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-[hsl(var(--habitta-olive)/.15)] flex items-center justify-center">
        <Home className="w-4 h-4 text-[hsl(var(--habitta-olive))]" />
      </div>

      {/* Greeting text */}
      <p className="flex-1 text-sm text-foreground leading-relaxed">
        {text}
      </p>

      {/* Chevron hint */}
      <ChevronRight className="shrink-0 mt-1 w-4 h-4 text-muted-foreground" />
    </button>
  );
}
