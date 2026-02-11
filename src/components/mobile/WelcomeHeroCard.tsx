import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WELCOME_HERO } from "@/lib/mobileCopy";
import { cn } from "@/lib/utils";

interface WelcomeHeroCardProps {
  systemCount: number;
  onExplore: () => void;
  onDismiss: () => void;
}

export function WelcomeHeroCard({
  systemCount,
  onExplore,
  onDismiss,
}: WelcomeHeroCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(), 300);
  };

  const handleExplore = () => {
    setIsExiting(true);
    setTimeout(() => onExplore(), 300);
  };

  // Build subtitle with bold count segment
  const fullSubtitle = WELCOME_HERO.subtitle(systemCount);
  const boldSegment = WELCOME_HERO.subtitleBoldSegment(systemCount);
  const subtitleParts = fullSubtitle.split(boldSegment);

  return (
    <div
      className={cn(
        "rounded-xl p-6 bg-primary/5 border border-primary/15 shadow-sm",
        isVisible && !isExiting && "animate-in fade-in slide-in-from-top-2 duration-500 fill-mode-both",
        isExiting && "animate-out fade-out slide-out-to-top-2 duration-300 fill-mode-both"
      )}
    >
      {/* Icon + Title */}
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <div className="pt-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {WELCOME_HERO.title}
          </h2>
        </div>
      </div>

      {/* Subtitle */}
      <div className="mt-4 space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {subtitleParts[0]}
          <span className="font-semibold text-foreground">{boldSegment}</span>
          {subtitleParts[1]}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {WELCOME_HERO.reinforcement}
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-5 flex flex-col gap-3">
        <Button
          variant="default"
          className="rounded-lg w-full"
          onClick={handleExplore}
        >
          {WELCOME_HERO.cta}
        </Button>
        <button
          onClick={handleDismiss}
          className="text-sm text-muted-foreground hover:underline text-center"
        >
          {WELCOME_HERO.dismiss}
        </button>
      </div>
    </div>
  );
}
