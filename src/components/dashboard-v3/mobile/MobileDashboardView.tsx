import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LifecycleRing } from "@/components/mobile/LifecycleRing";
import { SinceLastMonth } from "@/components/mobile/SinceLastMonth";
import { SystemTileScroll } from "@/components/mobile/SystemTileScroll";
import { computeHomeOutlook, getLifecyclePercent } from "@/services/homeOutlook";
import { selectPrimarySystem } from "@/services/priorityScoring";
import { 
  trackMobileEvent, 
  checkPrimaryFocusChanged,
  MOBILE_EVENTS 
} from "@/lib/analytics/mobileEvents";
import {
  HOME_OUTLOOK_COPY,
  ASSESSMENT_QUALITY_LABELS,
  ASSESSMENT_QUALITY_PREFIX,
} from "@/lib/mobileCopy";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import { useEffect, useState } from "react";

// ============================================================
// MOBILE RENDER CONTRACT ENFORCEMENT
// ============================================================

// Governance: Components that NEVER render on mobile summary
// These are documentation-only; actual enforcement is structural
const FORBIDDEN_ON_MOBILE_SUMMARY = [
  'BaselineSurface',
  'SegmentedScale',
  'ConfidenceDots',
  'ConfidenceBadge',
  'LifecycleTimeline',
  'CostInsightPanel',
  'ChatConsole', // Only in sheet after CTA
];

// ============================================================

interface MobileDashboardViewProps {
  systems: SystemTimelineEntry[];
  healthStatus: 'healthy' | 'attention' | 'critical';
  onSystemTap: (systemKey: string) => void;
  onChatOpen: () => void;
}

/**
 * MobileDashboardView — Home Pulse v1
 * 
 * State-of-ownership instrument. Answers:
 * "How is my home doing overall?"
 * "How much time do I have?"
 * "Is anything meaningfully changing?"
 * 
 * Layout (top → bottom):
 * 1. Home Outlook Hero (LifecycleRing + ~X years)
 * 2. Since Last Month (change awareness)
 * 3. Key Systems Preview (horizontal tile scroll)
 */
export function MobileDashboardView({
  systems,
  healthStatus,
  onSystemTap,
  onChatOpen
}: MobileDashboardViewProps) {
  const navigate = useNavigate();
  
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
  
  // Priority scoring for tile ordering
  const { primary, scored } = selectPrimarySystem(systems);
  
  // Home Outlook computation
  const outlook = computeHomeOutlook(systems);
  
  // Compute hero ring percent from weighted average across systems
  const heroPercent = outlook
    ? Math.min(100, Math.max(0, 100 - (outlook.rawYears / 15) * 100))
    : 0;

  // Track primary focus changes within session (trust validation)
  useEffect(() => {
    if (primary?.system) {
      const changed = checkPrimaryFocusChanged(primary.system.systemId);
      if (changed) {
        trackMobileEvent(MOBILE_EVENTS.PRIMARY_FOCUS_CHANGED_SESSION, {
          systemKey: primary.system.systemId,
        });
      }
      
      trackMobileEvent(MOBILE_EVENTS.PRIMARY_FOCUS_IMPRESSION, {
        systemKey: primary.system.systemId,
        score: primary.score,
      });
    }
  }, [primary?.system?.systemId, primary?.score]);

  // Empty state — first-use framing, no fake data
  if (!systems || systems.length === 0) {
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

  // Order tiles by priority score
  const orderedSystems = scored.map(s => s.system);

  return (
    <div className="space-y-6">
      {/* ── Home Outlook Hero ── */}
      <div className={animClass}>
        <div className="flex flex-col items-center text-center space-y-3">
          <LifecycleRing percentConsumed={heroPercent} size={96}>
            <span className="text-lg font-bold text-foreground">
              {outlook ? `~${outlook.displayYears}` : '—'}
            </span>
          </LifecycleRing>

          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              {HOME_OUTLOOK_COPY.label}
            </p>
            <p className="text-sm text-muted-foreground">
              {HOME_OUTLOOK_COPY.subtext}
            </p>
          </div>

          {outlook && (
            <div className="space-y-1">
              {outlook.microSummary && (
                <p className="text-sm text-muted-foreground">
                  {outlook.microSummary}
                </p>
              )}
              <p className="text-xs text-muted-foreground/70">
                {ASSESSMENT_QUALITY_PREFIX}: {ASSESSMENT_QUALITY_LABELS[outlook.assessmentQuality]}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Since Last Month ── */}
      <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '75ms' }}>
        <SinceLastMonth />
      </div>

      {/* ── Key Systems Preview ── */}
      <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '150ms' }}>
        <SystemTileScroll systems={orderedSystems} />
      </div>
    </div>
  );
}
