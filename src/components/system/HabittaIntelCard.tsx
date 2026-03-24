import { useEffect } from "react";
import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getSystemNarrative } from "@/lib/systemNarratives";
import { trackMobileEvent, MOBILE_EVENTS } from "@/lib/analytics/mobileEvents";

interface HabittaIntelCardProps {
  systemId: string;
  systemLabel: string;
  isLateLife?: boolean;
}

/**
 * HabittaIntelCard — Quiet annotation card for system detail pages.
 * 
 * Displays pro-tip and conditional forecast tip (late-life only).
 * Includes narrative subtitle as card header.
 * Does not render if no narrative exists for the system.
 */
export function HabittaIntelCard({
  systemId,
  systemLabel,
  isLateLife = false,
}: HabittaIntelCardProps) {
  const narrative = getSystemNarrative(systemId);

  useEffect(() => {
    if (narrative) {
      trackMobileEvent(MOBILE_EVENTS.INTEL_CARD_VIEWED, { systemKey: systemId });
    }
  }, [systemId, narrative]);

  if (!narrative) return null;

  return (
    <Card className="bg-[hsl(var(--habitta-slate)/0.06)] border-[hsl(var(--habitta-slate)/0.15)]">
      <CardContent className="p-4 space-y-2.5">
        {/* Header with narrative subtitle */}
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[hsl(var(--habitta-slate))] shrink-0" />
          <span className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--habitta-stone))]">
            Habitta Intel
          </span>
        </div>

        {/* Narrative subtitle */}
        <p className="text-sm italic text-[hsl(var(--habitta-stone))]">
          Your {systemLabel}: {narrative.subtitle}
        </p>

        {/* Pro tip (always shown) */}
        <p className="text-sm text-foreground/80 leading-relaxed">
          {narrative.proTip}
        </p>

        {/* Forecast tip (late-life only) */}
        {isLateLife && (
          <p className="text-sm text-foreground/70 leading-relaxed pt-1 border-t border-border/30">
            {narrative.forecastTip}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
