import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HomeStatusSummary } from "./HomeStatusSummary";
import { PrimarySystemFocusCard } from "./PrimarySystemFocusCard";
import { SecondarySystemsList } from "./SecondarySystemsList";
import { ContextualChatLauncher } from "./ContextualChatLauncher";
import { selectPrimarySystem } from "@/services/priorityScoring";
import { 
  trackMobileEvent, 
  checkPrimaryFocusChanged,
  MOBILE_EVENTS 
} from "@/lib/analytics/mobileEvents";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import { useEffect, useState } from "react";

// ============================================================
// MOBILE RENDER CONTRACT ENFORCEMENT
// ============================================================

// Governance: Maximum allowed on mobile summary
const MAX_CARDS_ON_SCREEN = 2;
const MAX_CTAS_PER_SCREEN = 1;
const MAX_TEXT_LINES_PER_BLOCK = 3;

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
 * MobileDashboardView - Complete mobile summary view
 * 
 * Mobile Render Contract enforcement:
 * - Sequential, not comparative
 * - One idea at a time
 * - Comparative/dense content gated behind intent
 * 
 * Priority Score integration:
 * - Uses selectPrimarySystem() for deterministic selection
 * - Tracks primary focus changes for trust validation
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
  
  // Use Priority Score to select primary system
  const { primary, scored } = selectPrimarySystem(systems);
  const primarySystem = primary?.system ?? null;
  const priorityExplanation = primary?.explanation ?? '';
  
  // Get secondary systems (all except primary)
  const secondarySystems = primarySystem 
    ? systems.filter(s => s.systemId !== primarySystem.systemId)
    : systems.slice(1);

  // Track primary focus changes within session (trust validation)
  useEffect(() => {
    if (primarySystem) {
      const changed = checkPrimaryFocusChanged(primarySystem.systemId);
      if (changed) {
        trackMobileEvent(MOBILE_EVENTS.PRIMARY_FOCUS_CHANGED_SESSION, {
          systemKey: primarySystem.systemId,
        });
      }
      
      // Track impression
      trackMobileEvent(MOBILE_EVENTS.PRIMARY_FOCUS_IMPRESSION, {
        systemKey: primarySystem.systemId,
        score: primary?.score,
      });
    }
  }, [primarySystem?.systemId, primary?.score]);

  // Handle View Plan navigation
  const handleViewPlan = () => {
    if (primarySystem) {
      trackMobileEvent(MOBILE_EVENTS.VIEW_PLAN_OPEN, {
        systemKey: primarySystem.systemId,
      });
      navigate(`/systems/${primarySystem.systemId}/plan`);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Now/Next/Later Status Summary */}
      <div className={animClass}>
        <HomeStatusSummary 
          systems={systems} 
          primarySystem={primarySystem}
          priorityExplanation={priorityExplanation}
          secondarySystemsCount={secondarySystems.length}
        />
      </div>
      
      {/* Primary Focus Card */}
      {primarySystem && (
        <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '75ms' }}>
          <PrimarySystemFocusCard 
            system={primarySystem} 
            priorityExplanation={priorityExplanation}
            onViewPlan={handleViewPlan}
          />
        </div>
      )}
      
      {/* Secondary Systems List */}
      {secondarySystems.length > 0 && (
        <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '150ms' }}>
          <SecondarySystemsList 
            systems={secondarySystems} 
            onSystemTap={onSystemTap} 
          />
        </div>
      )}
      
      {/* Contextual Chat Launcher */}
      <div className={animClass} style={prefersReducedMotion ? undefined : { animationDelay: '225ms' }}>
        <ContextualChatLauncher 
          primarySystem={primarySystem}
          priorityExplanation={priorityExplanation}
          onTap={onChatOpen} 
        />
      </div>
    </div>
  );
}
