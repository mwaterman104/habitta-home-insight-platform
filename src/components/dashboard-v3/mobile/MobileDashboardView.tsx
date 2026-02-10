import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HomeConfidenceHero } from "@/components/mobile/HomeConfidenceHero";
import { RecommendationCards } from "@/components/mobile/RecommendationCards";
import { SinceLastMonth } from "@/components/mobile/SinceLastMonth";
import { SystemTileScroll } from "@/components/mobile/SystemTileScroll";
import { selectPrimarySystem } from "@/services/priorityScoring";
import { 
  trackMobileEvent, 
  checkPrimaryFocusChanged,
  MOBILE_EVENTS 
} from "@/lib/analytics/mobileEvents";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import type { HomeConfidenceResult } from "@/services/homeConfidence";
import type { Recommendation } from "@/services/recommendationEngine";
import { useEffect, useState } from "react";

// ============================================================
// MOBILE RENDER CONTRACT ENFORCEMENT
// ============================================================

// Governance: Components that NEVER render on mobile summary
const FORBIDDEN_ON_MOBILE_SUMMARY = [
  'BaselineSurface',
  'SegmentedScale',
  'ConfidenceDots',
  'ConfidenceBadge',
  'LifecycleTimeline',
  'CostInsightPanel',
  'ChatConsole',
];

// ============================================================

interface MobileDashboardViewProps {
  systems: SystemTimelineEntry[];
  healthStatus: 'healthy' | 'attention' | 'critical';
  onSystemTap: (systemKey: string) => void;
  onChatOpen: () => void;
  homeConfidence: HomeConfidenceResult | null;
  recommendations: Recommendation[];
  onDismissRecommendation: (id: string) => void;
}

/**
 * MobileDashboardView — Home Pulse v2
 * 
 * State-of-ownership instrument powered by Home Confidence.
 * Answers:
 * "How confident am I about my home?"
 * "What should I do next?"
 * "How are my systems doing?"
 * 
 * Layout (top → bottom):
 * 1. Home Confidence Hero (state + index + evidence + next gain)
 * 2. Since Last Month (change awareness)
 * 3. Recommendations (max 3 actionable cards)
 * 4. Key Systems Preview (horizontal tile scroll)
 */
export function MobileDashboardView({
  systems,
  healthStatus,
  onSystemTap,
  onChatOpen,
  homeConfidence,
  recommendations,
  onDismissRecommendation,
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
      {/* ── Home Confidence Hero ── */}
      <div className={animClass}>
        {homeConfidence ? (
          <HomeConfidenceHero confidence={homeConfidence} />
        ) : (
          <div className="flex flex-col items-center text-center space-y-2">
            <p className="text-sm text-muted-foreground">Calculating confidence…</p>
          </div>
        )}
      </div>

      {/* ── Since Last Month ── */}
      <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '75ms' }}>
        <SinceLastMonth />
      </div>

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '112ms' }}>
          <RecommendationCards
            recommendations={recommendations}
            onDismiss={onDismissRecommendation}
          />
        </div>
      )}

      {/* ── Key Systems Preview ── */}
      <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '150ms' }}>
        <SystemTileScroll systems={orderedSystems} />
      </div>
    </div>
  );
}
