import { HomeStatusSummary } from "./HomeStatusSummary";
import { PrimarySystemCard } from "./PrimarySystemCard";
import { SecondarySystemsList } from "./SecondarySystemsList";
import { ChatCTA } from "./ChatCTA";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";

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
 */
export function MobileDashboardView({
  systems,
  healthStatus,
  onSystemTap,
  onChatOpen
}: MobileDashboardViewProps) {
  // Select primary system: closest to replacement window
  const selectPrimarySystem = (): SystemTimelineEntry | null => {
    if (!systems || systems.length === 0) return null;

    const currentYear = new Date().getFullYear();
    
    // Sort by how soon replacement is likely
    const sorted = [...systems].sort((a, b) => {
      const aYear = a.replacementWindow?.likelyYear ?? 9999;
      const bYear = b.replacementWindow?.likelyYear ?? 9999;
      return aYear - bYear;
    });

    return sorted[0];
  };

  const primarySystem = selectPrimarySystem();
  const secondarySystems = primarySystem 
    ? systems.filter(s => s.systemId !== primarySystem.systemId)
    : systems.slice(1);

  // Empty state
  if (!systems || systems.length === 0) {
    return (
      <div className="space-y-4">
        <HomeStatusSummary systems={[]} healthStatus="healthy" />
        <ChatCTA promptText="Help me get started" onTap={onChatOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <HomeStatusSummary systems={systems} healthStatus={healthStatus} />
      
      {primarySystem && (
        <PrimarySystemCard 
          system={primarySystem} 
          onTap={() => onSystemTap(primarySystem.systemId)} 
        />
      )}
      
      {secondarySystems.length > 0 && (
        <SecondarySystemsList 
          systems={secondarySystems} 
          onSystemTap={onSystemTap} 
        />
      )}
      
      <ChatCTA 
        promptText="What should I do?" 
        onTap={onChatOpen} 
      />
    </div>
  );
}
