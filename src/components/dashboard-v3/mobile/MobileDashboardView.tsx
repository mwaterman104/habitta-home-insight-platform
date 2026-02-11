import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DataConfidenceBar } from "@/components/mobile/DataConfidenceBar";
import { PrimarySystemCard } from "@/components/mobile/PrimarySystemCard";
import { SystemLedger } from "@/components/mobile/SystemLedger";
import { MissingDocumentation } from "@/components/mobile/MissingDocumentation";
import { ChatInsightBanner } from "@/components/mobile/ChatInsightBanner";
import { WelcomeHeroCard } from "@/components/mobile/WelcomeHeroCard";
import { selectPrimarySystem } from "@/services/priorityScoring";
import { getLateLifeState } from "@/services/homeOutlook";
import { 
  trackMobileEvent, 
  checkPrimaryFocusChanged,
  MOBILE_EVENTS 
} from "@/lib/analytics/mobileEvents";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import type { HomeConfidenceResult } from "@/services/homeConfidence";
import { CHAT_FIRST_TURN } from "@/lib/mobileCopy";
import { useEffect, useState, useCallback, useRef } from "react";

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
  onChatOpen: (intent?: MobileChatIntent) => void;
  homeConfidence: HomeConfidenceResult | null;
  filterActive?: boolean;
  onClearFilter?: () => void;
  isFirstVisit?: boolean;
  onWelcomeDismiss?: () => void;
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
  filterActive = false,
  onClearFilter,
  isFirstVisit = false,
  onWelcomeDismiss,
}: MobileDashboardViewProps) {
  const navigate = useNavigate();
  const primarySystemRef = useRef<HTMLDivElement>(null);
  
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
    // Scroll to primary system card after dismiss animation
    setTimeout(() => {
      primarySystemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    onChatOpen({ initialAssistantMessage: CHAT_FIRST_TURN.uploadDoc() });
  }, [onChatOpen]);

  const handleUploadPhoto = useCallback(() => {
    onChatOpen({ initialAssistantMessage: CHAT_FIRST_TURN.uploadPhoto() });
  }, [onChatOpen]);

  // Filtered empty state (badge filter active but no matches)
  if (filterActive && systems.length > 0) {
    const attentionSystems = systems.filter(s => getLateLifeState(s) !== 'not-late');
    if (attentionSystems.length === 0) {
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
  }

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

      {/* ── Chat Insight Banner (only for late-life primary) ── */}
      {showInsightBanner && (
        <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '50ms' }}>
          <ChatInsightBanner
            systemLabel={primary!.system.systemLabel}
            onTap={() => onChatOpen({
              systemKey: primary!.system.systemId,
              systemLabel: primary!.system.systemLabel,
              initialAssistantMessage: CHAT_FIRST_TURN.replacementPlanning(primary!.system.systemLabel),
            })}
          />
        </div>
      )}

      {/* ── Primary System Card ── */}
      {primary && (
        <div ref={primarySystemRef} className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '75ms' }}>
          <PrimarySystemCard
            system={primary.system}
            onAction={() => {
              const isAtRisk = primaryLateLife !== 'not-late';
              onChatOpen({
                systemKey: primary.system.systemId,
                systemLabel: primary.system.systemLabel,
                initialAssistantMessage: isAtRisk
                  ? CHAT_FIRST_TURN.replacementPlanning(primary.system.systemLabel)
                  : CHAT_FIRST_TURN.logService(primary.system.systemLabel),
              });
            }}
          />
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
