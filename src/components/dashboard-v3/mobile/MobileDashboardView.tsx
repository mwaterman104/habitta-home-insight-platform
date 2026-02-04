import { useNavigate } from "react-router-dom";
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
import { useEffect } from "react";

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

  // Empty state
  if (!systems || systems.length === 0) {
    return (
      <div className="space-y-4">
        <HomeStatusSummary 
          systems={[]} 
          primarySystem={null}
          priorityExplanation=""
          secondarySystemsCount={0}
        />
        <ContextualChatLauncher 
          primarySystem={null}
          priorityExplanation=""
          onTap={onChatOpen} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Now/Next/Later Status Summary */}
      <HomeStatusSummary 
        systems={systems} 
        primarySystem={primarySystem}
        priorityExplanation={priorityExplanation}
        secondarySystemsCount={secondarySystems.length}
      />
      
      {/* Primary Focus Card */}
      {primarySystem && (
        <PrimarySystemFocusCard 
          system={primarySystem} 
          priorityExplanation={priorityExplanation}
          onViewPlan={handleViewPlan}
        />
      )}
      
      {/* Secondary Systems List */}
      {secondarySystems.length > 0 && (
        <SecondarySystemsList 
          systems={secondarySystems} 
          onSystemTap={onSystemTap} 
        />
      )}
      
      {/* Contextual Chat Launcher */}
      <ContextualChatLauncher 
        primarySystem={primarySystem}
        priorityExplanation={priorityExplanation}
        onTap={onChatOpen} 
      />
    </div>
  );
}
