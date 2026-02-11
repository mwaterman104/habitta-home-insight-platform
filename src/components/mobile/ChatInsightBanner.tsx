import { MessageCircle } from "lucide-react";

interface ChatInsightBannerProps {
  systemLabel: string;
  onTap: () => void;
}

export function ChatInsightBanner({ systemLabel, onTap }: ChatInsightBannerProps) {
  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-habitta-slate/8 border border-habitta-slate/20 rounded-sm p-4 flex items-start gap-3 cursor-pointer active:bg-habitta-slate/12 transition-colors"
    >
      <MessageCircle size={16} strokeWidth={1.5} className="text-habitta-slate mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-habitta-charcoal text-body-sm leading-relaxed">
          Your {systemLabel} is entering its replacement window. See what a planned replacement looks like.
        </p>
        <p className="text-meta text-habitta-stone/60">Tap to explore</p>
      </div>
    </button>
  );
}
