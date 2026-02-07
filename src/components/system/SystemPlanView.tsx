import { useRef } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DockedChatInput } from "@/components/mobile/DockedChatInput";
import type { SystemTimelineEntry, CapitalSystemType } from "@/types/capitalTimeline";
import { 
  PLANNING_STATUS, 
  getPlanningStatus,
  getInstallSourceLabel,
  getSystemDisplayName,
  PLAN_COPY 
} from "@/lib/mobileCopy";
import { trackMobileEvent, MOBILE_EVENTS } from "@/lib/analytics/mobileEvents";

// ============== Types ==============

interface CostTierDisplay {
  label: string;
  range: { low: number; high: number };
  definition: string;
  tier: 'planned' | 'emergency';
}

interface TimingWindow {
  label: string;
  range: string;
  status: 'best' | 'caution' | 'highRisk';
}

interface SystemPlanViewProps {
  system: SystemTimelineEntry;
  onBack: () => void;
  onStartPlanning: () => void;
  onAddMaintenance: () => void;
  /** Callback to expand chat sheet */
  onChatExpand?: () => void;
}

// ============== Emergency Multipliers (system-specific) ==============

const EMERGENCY_MULTIPLIERS: Record<CapitalSystemType, number> = {
  hvac: 1.50,
  roof: 1.40,
  water_heater: 1.25,
};

// ============== Helper Functions ==============

/**
 * Derive cost tiers from timeline data (no hardcoded constants).
 * Uses typicalLow/typicalHigh for the "Planned" tier when available.
 * QA FIX #3: Only two tiers — "Planned" and "Emergency". No "Typical".
 */
function getCostTiers(system: SystemTimelineEntry): CostTierDisplay[] {
  const cost = system.capitalCost;
  const hasTypicalBand = cost.typicalLow != null && cost.typicalHigh != null;

  // "Planned" tier: uses tightened band when available
  const plannedRange = hasTypicalBand
    ? { low: cost.typicalLow!, high: cost.typicalHigh! }
    : { low: cost.low, high: cost.high };

  // Emergency tier: full range with system-appropriate premium
  const emergencyMultiplier = EMERGENCY_MULTIPLIERS[system.systemId] ?? 1.40;
  const emergencyRange = {
    low: Math.round(cost.low * emergencyMultiplier),
    high: Math.round(cost.high * emergencyMultiplier),
  };

  return [
    {
      label: PLAN_COPY.costTiers.planned.label,
      tier: 'planned',
      range: plannedRange,
      definition: PLAN_COPY.costTiers.planned.definition,
    },
    {
      label: PLAN_COPY.costTiers.emergency.label,
      tier: 'emergency',
      range: emergencyRange,
      definition: PLAN_COPY.costTiers.emergency.definition,
    },
  ];
}

function getTimingWindows(system: SystemTimelineEntry): TimingWindow[] {
  const currentYear = new Date().getFullYear();
  const { earlyYear, likelyYear, lateYear } = system.replacementWindow || {};
  
  if (!likelyYear) {
    return [
      { label: PLAN_COPY.timingOutlook.best, range: 'Now – Unknown', status: 'best' },
    ];
  }
  
  const bestEnd = Math.max(currentYear, (earlyYear ?? likelyYear) - 1);
  const cautionEnd = likelyYear;
  
  return [
    {
      label: PLAN_COPY.timingOutlook.best,
      range: `Now – Dec ${bestEnd}`,
      status: 'best',
    },
    {
      label: PLAN_COPY.timingOutlook.caution,
      range: `Jan ${bestEnd + 1} – Dec ${cautionEnd}`,
      status: 'caution',
    },
    {
      label: PLAN_COPY.timingOutlook.highRisk,
      range: `After Dec ${cautionEnd}`,
      status: 'highRisk',
    },
  ];
}

function getConfidenceLevel(dataQuality: string | undefined): 'high' | 'moderate' | 'low' {
  if (dataQuality === 'high') return 'high';
  if (dataQuality === 'medium') return 'moderate';
  return 'low';
}

function getSeasonalNote(systemType: CapitalSystemType): string | null {
  if (systemType === 'hvac') {
    return 'HVAC replacements in Florida are best scheduled in spring or fall.';
  }
  if (systemType === 'roof') {
    return 'Roof work is best scheduled outside of hurricane season (June–November).';
  }
  return null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============== Sub-Components ==============

function StatusIndicator({ status }: { status: 'best' | 'caution' | 'highRisk' }) {
  const colors = {
    best: 'bg-emerald-500',
    caution: 'bg-amber-500',
    highRisk: 'bg-red-500',
  };
  
  return (
    <div className={`w-2.5 h-2.5 rounded-full ${colors[status]}`} />
  );
}

function CostTierRow({ tier }: { tier: CostTierDisplay }) {
  const formatCurrency = (value: number) => 
    `$${value.toLocaleString()}`;
  
  return (
    <div className="py-3 border-b border-border/30 last:border-0">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-foreground">{tier.label}</span>
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(tier.range.low)} – {formatCurrency(tier.range.high)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{tier.definition}</p>
    </div>
  );
}

function TimingRow({ window }: { window: TimingWindow }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <StatusIndicator status={window.status} />
      <div className="flex-1">
        <span className="text-sm text-foreground">{window.label}</span>
        <span className="text-sm text-muted-foreground ml-2">{window.range}</span>
      </div>
    </div>
  );
}

// ============== Main Component ==============

/**
 * SystemPlanView - Single-screen vertical narrative for system planning
 * 
 * Sections (fixed order):
 * A. System Header (with material when known)
 * B. Cost Reality (two tiers: Planned + Emergency)
 * C. Timing Outlook (three states)
 * D. Confidence & Evidence
 * E. Action Footer
 */
export function SystemPlanView({
  system,
  onBack,
  onStartPlanning,
  onAddMaintenance,
  onChatExpand,
}: SystemPlanViewProps) {
  const costSectionRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const installYear = system.installYear;
  const age = installYear ? currentYear - installYear : null;
  
  const likelyYear = system.replacementWindow?.likelyYear;
  const expectedLifespan = likelyYear && installYear 
    ? likelyYear - installYear 
    : 15;
  
  const remainingYears = likelyYear ? likelyYear - currentYear : null;
  
  // Get planning status with aging guardrail
  const statusKey = getPlanningStatus(remainingYears, age, expectedLifespan);
  const status = PLANNING_STATUS[statusKey];
  
  // Show material in header when known (e.g., "Roof — Tile")
  const baseName = system.systemLabel || getSystemDisplayName(system.systemId);
  const materialSuffix = system.materialType && system.materialType !== 'unknown'
    ? ` — ${capitalize(system.materialType)}`
    : '';
  const displayName = baseName + materialSuffix;
  
  const sourceLabel = getInstallSourceLabel(system.installSource);
  const installContext = installYear 
    ? `Installed ${installYear} · ${sourceLabel}`
    : sourceLabel;
  
  // Get cost tiers from timeline data (no hardcoded constants)
  const costTiers = getCostTiers(system);
  
  // Get timing windows
  const timingWindows = getTimingWindows(system);
  const seasonalNote = getSeasonalNote(system.systemId);
  
  // Get confidence
  const confidenceLevel = getConfidenceLevel(system.dataQuality);
  const confidenceLabel = PLAN_COPY.confidenceLevels[confidenceLevel];
  
  // Improvement suggestion for non-high confidence
  const improvementSuggestion = confidenceLevel !== 'high'
    ? 'Upload a photo of the system label to improve accuracy.'
    : null;

  const handleStartPlanning = () => {
    trackMobileEvent(MOBILE_EVENTS.START_PLANNING_CLICKED, {
      systemKey: system.systemId,
    });
    onStartPlanning();
  };

  const handleAddMaintenance = () => {
    trackMobileEvent(MOBILE_EVENTS.MAINTENANCE_RECORD_ADDED, {
      systemKey: system.systemId,
    });
    onAddMaintenance();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </button>
      </header>
      
      <div className="p-4 space-y-6 pb-32">
        {/* Section A: System Header */}
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">{displayName}</h1>
            <span className={`text-sm font-medium ${status.colorClass}`}>
              {status.text}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{installContext}</p>
        </div>
        
        {/* Section B: Cost Reality */}
        <Card ref={costSectionRef}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Cost Reality
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {costTiers.map((tier) => (
              <CostTierRow key={tier.tier} tier={tier} />
            ))}
            {/* Attribution line (server-generated, confidence-gated) */}
            {system.costAttributionLine && (
              <p className="text-xs text-muted-foreground mt-3">
                {system.costAttributionLine}
              </p>
            )}
            {/* Defensive disclaimer (always shown) */}
            <p className="text-xs text-muted-foreground mt-1">
              {system.costDisclaimer || 'Final pricing varies based on site conditions.'}
            </p>
          </CardContent>
        </Card>
        
        {/* Section C: Timing Outlook */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Timing Outlook
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {timingWindows.map((window, idx) => (
              <TimingRow key={idx} window={window} />
            ))}
            {seasonalNote && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/30 mt-2">
                {seasonalNote}
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Section D: Confidence & Evidence */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Confidence & Evidence
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Install source</span>
              <span className="text-foreground font-medium">{sourceLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Confidence</span>
              <span className="text-foreground font-medium">{confidenceLabel}</span>
            </div>
            {improvementSuggestion && (
              <div className="flex items-start gap-2 pt-2 border-t border-border/30">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{improvementSuggestion}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Section E: Action Footer with Docked Chat (sticky) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        {/* Docked chat input - only show if handler provided */}
        {onChatExpand && (
          <DockedChatInput
            systemKey={system.systemId}
            systemLabel={displayName}
            onExpandChat={onChatExpand}
          />
        )}
        
        {/* Action buttons */}
        <div className="p-4 pt-3 space-y-2">
          <Button 
            onClick={handleStartPlanning}
            className="w-full"
            size="lg"
          >
            {PLAN_COPY.actions.primary}
          </Button>
          <Button 
            onClick={handleAddMaintenance}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {PLAN_COPY.actions.secondary}
          </Button>
        </div>
      </div>
    </div>
  );
}
