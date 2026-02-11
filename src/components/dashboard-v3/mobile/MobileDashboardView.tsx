import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DataConfidenceBar } from "@/components/mobile/DataConfidenceBar";
import { PrimarySystemCard } from "@/components/mobile/PrimarySystemCard";
import { SystemLedger } from "@/components/mobile/SystemLedger";
import { MissingDocumentation } from "@/components/mobile/MissingDocumentation";
import { ChatInsightBanner } from "@/components/mobile/ChatInsightBanner";
import { selectPrimarySystem } from "@/services/priorityScoring";
import { getLateLifeState } from "@/services/homeOutlook";
import { 
  trackMobileEvent, 
  checkPrimaryFocusChanged,
  MOBILE_EVENTS 
} from "@/lib/analytics/mobileEvents";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import type { HomeConfidenceResult } from "@/services/homeConfidence";
import { useEffect, useState, useCallback } from "react";

// ============================================================
// MOBILE RENDER CONTRACT ENFORCEMENT
// ============================================================

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
}

/**
 * MobileDashboardView — Record + Confidence Surface
 * 
 * Layout (top → bottom):
 * 1. Data Confidence Bar
 * 2. Primary System Card
 * 3. System Ledger
 * 4. Missing Documentation
 */
export function MobileDashboardView({
  systems,
  healthStatus,
  onSystemTap,
  onChatOpen,
  homeConfidence,
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
  
  // Priority scoring for system ordering
  const { primary, scored } = selectPrimarySystem(systems);
  const secondarySystems = scored.slice(1).map(s => s.system);

  // Track primary focus changes within session
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

  // Upload handlers — open chat with upload context
  const handleUploadDoc = useCallback(() => {
    onChatOpen();
  }, [onChatOpen]);

  const handleUploadPhoto = useCallback(() => {
    onChatOpen();
  }, [onChatOpen]);

  // Empty state
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

  const primaryLateLife = primary ? getLateLifeState(primary.system) : 'not-late';
  const showInsightBanner = primary && primaryLateLife !== 'not-late';

  return (
    <div className="space-y-7">
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

      {/* ── Chat Insight Banner (only for late-life primary) ── */}
      {showInsightBanner && (
        <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '50ms' }}>
          <ChatInsightBanner
            systemLabel={primary!.system.systemLabel}
            onTap={onChatOpen}
          />
        </div>
      )}

      {/* ── Primary System Card ── */}
      {primary && (
        <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '75ms' }}>
          <PrimarySystemCard system={primary.system} onAction={onChatOpen} />
        </div>
      )}

      {/* ── System Ledger ── */}
      {secondarySystems.length > 0 && (
        <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '112ms' }}>
          <SystemLedger systems={secondarySystems} />
        </div>
      )}

      {/* ── Missing Documentation ── */}
      <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '150ms' }}>
        <MissingDocumentation
          nextGain={homeConfidence?.nextGain ?? null}
          onUploadDoc={handleUploadDoc}
          onUploadPhoto={handleUploadPhoto}
        />
      </div>
    </div>
  );
}
