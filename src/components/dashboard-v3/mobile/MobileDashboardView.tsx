import { Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DataConfidenceBar } from "@/components/mobile/DataConfidenceBar";
import { SystemsHealthTimeline } from "@/components/dashboard-v3/SystemsHealthTimeline";
import { CapExBudgetRoadmap } from "@/components/dashboard-v3/CapExBudgetRoadmap";
import { WelcomeHeroCard } from "@/components/mobile/WelcomeHeroCard";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import type { HomeConfidenceResult } from "@/services/homeConfidence";
import { useEffect, useState, useRef } from "react";

// ============================================================
// MobileChatIntent — carries CTA context to MobileChatSheet
// ============================================================
export interface MobileChatIntent {
  systemKey?: string;
  systemLabel?: string;
  initialAssistantMessage?: string;
  autoSendMessage?: string;
}

// ============================================================

interface MobileDashboardViewProps {
  capitalTimeline: HomeCapitalTimeline | null;
  onSystemTap: (systemKey: string) => void;
  homeConfidence: HomeConfidenceResult | null;
  filterActive?: boolean;
  onClearFilter?: () => void;
  isFirstVisit?: boolean;
  onWelcomeDismiss?: () => void;
}

/**
 * MobileDashboardView — Visual Home Pulse
 * 
 * Layout (top → bottom):
 * 1. Data Confidence Bar
 * 2. Systems Health & Timeline (Rivian-style progress bars)
 * 3. CapEx Budget Roadmap (lollipop financial horizon)
 */
export function MobileDashboardView({
  capitalTimeline,
  onSystemTap,
  homeConfidence,
  filterActive = false,
  onClearFilter,
  isFirstVisit = false,
  onWelcomeDismiss,
}: MobileDashboardViewProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  // Welcome hero dismissed state
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try {
      return localStorage.getItem('habitta_welcome_dismissed') === 'true';
    } catch { return false; }
  });
  const showWelcome = isFirstVisit && !welcomeDismissed;

  const handleWelcomeDismiss = () => {
    try { localStorage.setItem('habitta_welcome_dismissed', 'true'); } catch {}
    setWelcomeDismissed(true);
    onWelcomeDismiss?.();
  };

  const handleWelcomeExplore = () => {
    handleWelcomeDismiss();
    setTimeout(() => {
      timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  };

  // Respect user's motion preferences
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const animClass = prefersReducedMotion ? '' : 'animate-in fade-in duration-300 fill-mode-both';

  const systems = capitalTimeline?.systems || [];

  // Filtered empty state (badge filter active but no matches)
  if (filterActive && systems.length === 0 && capitalTimeline) {
    return (
      <div className="space-y-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              All systems are operating within expected ranges.
            </p>
            {onClearFilter && (
              <button
                onClick={onClearFilter}
                className="text-sm font-semibold text-[hsl(var(--habitta-slate))]"
              >
                Show all systems
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (!systems.length) {
    return (
      <div className="space-y-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center space-y-3">
            <div className="mx-auto p-3 bg-muted rounded-full w-fit">
              <Home className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground text-lg">
              Your home systems are being analyzed
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We're building your capital outlook. This usually takes a few moments.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Welcome Hero Card (first visit only) ── */}
      {showWelcome && (
        <WelcomeHeroCard
          systemCount={systems.length}
          onExplore={handleWelcomeExplore}
          onDismiss={handleWelcomeDismiss}
        />
      )}

      {/* ── Data Confidence Bar ── */}
      <div className={animClass}>
        {homeConfidence ? (
          <DataConfidenceBar confidence={homeConfidence} />
        ) : (
          <div className="flex flex-col items-center text-center space-y-2">
            <p className="text-sm text-muted-foreground">Calculating confidence…</p>
          </div>
        )}
      </div>

      {/* ── Systems Health & Timeline ── */}
      {capitalTimeline && (
        <div ref={timelineRef} className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '75ms' }}>
          <SystemsHealthTimeline
            timeline={capitalTimeline}
            onSystemClick={onSystemTap}
          />
        </div>
      )}

      {/* ── CapEx Budget Roadmap ── */}
      {capitalTimeline && (
        <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '150ms' }}>
          <CapExBudgetRoadmap
            timeline={capitalTimeline}
            onSystemClick={onSystemTap}
          />
        </div>
      )}
    </div>
  );
}
