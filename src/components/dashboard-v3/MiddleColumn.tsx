/**
 * MiddleColumn — Chat Console Authority
 * 
 * LOCKED DOCTRINE:
 * "Habitta does not have a dashboard with a chat.
 *  Habitta is a chat that shows its work."
 * 
 * The middle column is ONE COMPONENT: ChatConsole
 * - No standalone cards
 * - No dashboard narration outside chat
 * - Baseline Surface is INSIDE the chat (pinned artifact)
 * 
 * ELIMINATED from middle column:
 * - HomeStatusHeader (spoke in sentences outside chat)
 * - HomePositionAnchor (standalone card)
 * - EquityPositionCard (standalone card)
 * - LifecycleHorizon (duplicated by BaselineSurface)
 * - ContextDrawer (interpretive mode handles "why")
 * 
 * KEPT:
 * - StateOfHomeReport (annual interrupt - only exception)
 * - ChatConsole (the entire column)
 */

import { useMemo, useCallback } from "react";
import { ChatConsole } from "./ChatConsole";
import { StateOfHomeReport } from "./StateOfHomeReport";
import { type BaselineSystem } from "./BaselineSurface";
import { useEngagementCadence } from "@/hooks/useEngagementCadence";
import { track } from "@/lib/analytics";
import { PLANNING_MONTHS, DATA_GAP_CONFIDENCE } from "@/types/systemState";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";
import type { AdvisorState, RiskLevel as AdvisorRiskLevel, AdvisorOpeningMessage } from "@/types/advisorState";
import type { ChatMode } from "@/types/chatMode";
import type { HomeSystem } from "@/hooks/useHomeSystems";
import { arbitrateTodaysFocus, type SystemSignal, type NarrativeContext } from "@/lib/narrativePriority";
import { SYSTEM_META, SUPPORTED_SYSTEMS } from "@/lib/systemMeta";

// Legacy interface for backwards compatibility
interface TimelineTask {
  id: string;
  title: string;
  metaLine?: string;
  completed?: boolean;
  systemKey?: string;
}

interface MaintenanceData {
  nowTasks: TimelineTask[];
  thisYearTasks: TimelineTask[];
  futureYearsTasks: TimelineTask[];
}

interface MiddleColumnProps {
  homeForecast: HomeForecast | null;
  forecastLoading: boolean;
  hvacPrediction: SystemPrediction | null;
  hvacLoading: boolean;
  capitalTimeline: HomeCapitalTimeline | null;
  timelineLoading: boolean;
  maintenanceData: MaintenanceData;
  chatExpanded: boolean;
  onChatExpandChange: (expanded: boolean) => void;
  hasAgentMessage: boolean;
  propertyId: string;
  onSystemClick: (systemKey: string) => void;
  isEnriching?: boolean;
  isMobile?: boolean;
  // Advisor state props
  advisorState?: AdvisorState;
  focusContext?: { systemKey: string; trigger: string };
  openingMessage?: AdvisorOpeningMessage | null;
  confidence?: number;
  risk?: AdvisorRiskLevel;
  onUserReply?: () => void;
  // Maintenance interaction handlers
  onTaskComplete?: (taskId: string) => void;
  // Chat State Machine props
  chatMode?: ChatMode;
  systemsWithLowConfidence?: string[];
  // System Update Contract callback
  onSystemUpdated?: () => void;
  // Home systems from database (source of truth)
  homeSystems?: HomeSystem[];
  // Year built from home record
  yearBuilt?: number;
}

export function MiddleColumn({
  homeForecast,
  hvacPrediction,
  capitalTimeline,
  maintenanceData,
  hasAgentMessage,
  propertyId,
  onSystemClick,
  isEnriching,
  advisorState = 'PASSIVE',
  focusContext,
  openingMessage,
  confidence = 0.5,
  risk = 'LOW',
  onUserReply,
  chatMode = 'silent_steward',
  systemsWithLowConfidence = [],
  onSystemUpdated,
  homeSystems = [],
  yearBuilt: yearBuiltProp,
}: MiddleColumnProps) {
  // Engagement cadence hook - only for annual interrupt
  const { annualCard, dismissAnnual } = useEngagementCadence(propertyId);

  // ============================================
  // Derive Baseline Systems from home_systems (SOURCE OF TRUTH)
  // ============================================
  
  /**
   * BASELINE DATA SOURCE PRIORITY:
   * 1. home_systems table (real user data) - PRIMARY
   * 2. capitalTimeline (inferred/enriched) - FALLBACK
   * 
   * This ensures the artifact displays what the user actually has in their database.
   */
  const baselineSystems = useMemo<BaselineSystem[]>(() => {
    const currentYear = new Date().getFullYear();
    
    // PRIMARY: Use home_systems from database if available
    if (homeSystems && homeSystems.length > 0) {
      // Filter to only structural systems (not appliances)
      // SUPPORTED_SYSTEMS = ['hvac', 'roof', 'water_heater']
      const structuralSystems = homeSystems.filter(sys => 
        SUPPORTED_SYSTEMS.some(supported => 
          sys.system_key === supported || 
          sys.system_key.startsWith(`${supported}_`)
        )
      );
      
      // If we have structural systems, map them
      if (structuralSystems.length > 0) {
        return structuralSystems.map(sys => {
          // Get display name from system meta or format from key
          const meta = SYSTEM_META[sys.system_key as keyof typeof SYSTEM_META];
          const displayName = meta?.label || 
            sys.system_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          
          // Calculate age and remaining lifespan
          const installYear = sys.manufacture_year || 
            (sys.install_date ? new Date(sys.install_date).getFullYear() : null);
          const expectedLifespan = sys.expected_lifespan_years || 15;
          
          let monthsRemaining: number | undefined;
          let ageYears: number | undefined;
          
          if (installYear) {
            ageYears = currentYear - installYear;
            const yearsRemaining = Math.max(0, expectedLifespan - ageYears);
            monthsRemaining = yearsRemaining * 12;
          }
          
          // Determine confidence from system data
          const confidenceValue = sys.confidence_score ?? 
            (sys.data_sources && sys.data_sources.length > 0 ? 0.7 : 0.4);
          
          // Derive state based on lifespan position
          let state: 'stable' | 'planning_window' | 'elevated' | 'data_gap' = 'stable';
          
          if (confidenceValue < DATA_GAP_CONFIDENCE) {
            state = 'data_gap';
          } else if (monthsRemaining !== undefined) {
            if (monthsRemaining < 12) {
              state = 'elevated';
            } else if (monthsRemaining < PLANNING_MONTHS) {
              state = 'planning_window';
            }
          }
          
          return {
            key: sys.system_key,
            displayName,
            state,
            confidence: confidenceValue,
            monthsRemaining,
          };
        });
      }
      // If no structural systems found, fall through to capitalTimeline fallback
    }
    
    // FALLBACK: Use capitalTimeline if no home_systems or no structural systems
    if (capitalTimeline?.systems && capitalTimeline.systems.length > 0) {
      return capitalTimeline.systems.map(sys => {
        const expectedEnd = sys.replacementWindow.likelyYear;
        const yearsRemaining = expectedEnd - currentYear;
        const monthsRemaining = yearsRemaining * 12;
        const confidenceValue = sys.dataQuality === 'high' ? 0.8 : 
                                 sys.dataQuality === 'medium' ? 0.5 : 0.3;
        
        let state: 'stable' | 'planning_window' | 'elevated' | 'data_gap' = 'stable';
        
        if (confidenceValue < DATA_GAP_CONFIDENCE) {
          state = 'data_gap';
        } else if (monthsRemaining < 12) {
          state = 'elevated';
        } else if (monthsRemaining < PLANNING_MONTHS) {
          state = 'planning_window';
        }
        
        return {
          key: sys.systemId,
          displayName: sys.systemLabel,
          state,
          confidence: confidenceValue,
          monthsRemaining: monthsRemaining > 0 ? monthsRemaining : undefined,
        };
      });
    }
    
    return [];
  }, [homeSystems, capitalTimeline]);

  // System signals for narrative priority (uses both sources)
  const systemSignals = useMemo<SystemSignal[]>(() => {
    const signals: SystemSignal[] = [];

    if (hvacPrediction?.lifespan?.years_remaining_p50) {
      const years = hvacPrediction.lifespan.years_remaining_p50;
      const months = years * 12;
      signals.push({ 
        key: 'hvac',
        displayName: 'HVAC',
        risk: hvacPrediction.status === 'high' ? 'HIGH' : 
              hvacPrediction.status === 'moderate' ? 'MODERATE' : 'LOW',
        confidence: 0.6,
        monthsToPlanning: months,
      });
    }

    // Add signals from baseline systems
    baselineSystems.forEach(sys => {
      if (signals.some(s => s.key === sys.key)) return;
      if (sys.monthsRemaining !== undefined) {
        const years = sys.monthsRemaining / 12;
        signals.push({ 
          key: sys.key,
          displayName: sys.displayName,
          risk: years <= 1 ? 'HIGH' : years <= 5 ? 'MODERATE' : 'LOW',
          confidence: sys.confidence,
          monthsToPlanning: sys.monthsRemaining,
        });
      }
    });

    return signals;
  }, [hvacPrediction, baselineSystems]);

  // Extract yearBuilt - prefer prop, then try to derive from systems
  const yearBuilt = useMemo<number | undefined>(() => {
    if (yearBuiltProp) return yearBuiltProp;
    
    // Try to derive from home systems install dates
    if (homeSystems && homeSystems.length > 0) {
      const installYears = homeSystems
        .map(s => s.manufacture_year || (s.install_date ? new Date(s.install_date).getFullYear() : null))
        .filter((y): y is number => y !== null);
      if (installYears.length > 0) {
        // Assume home is older than oldest system install
        return Math.min(...installYears) - 5;
      }
    }
    
    // Fallback to capitalTimeline
    if (capitalTimeline?.systems && capitalTimeline.systems.length > 0) {
      const installYears = capitalTimeline.systems
        .map(s => s.installYear)
        .filter((y): y is number => y !== undefined && y !== null);
      if (installYears.length > 0) {
        return Math.min(...installYears) - 5;
      }
    }
    
    return undefined;
  }, [yearBuiltProp, homeSystems, capitalTimeline]);

  // Derive confidence level
  const confidenceLevel = useMemo<'Unknown' | 'Early' | 'Moderate' | 'High'>(() => {
    if (baselineSystems.length === 0) return 'Unknown';
    const avgConfidence = baselineSystems.reduce((sum, s) => sum + s.confidence, 0) / baselineSystems.length;
    if (avgConfidence >= 0.7) return 'High';
    if (avgConfidence >= 0.5) return 'Moderate';
    if (avgConfidence >= 0.3) return 'Early';
    return 'Unknown';
  }, [baselineSystems]);

  // Derive Today's Focus for chat context
  const narrativeContext = useMemo<NarrativeContext>(() => ({
    overallScore: homeForecast?.currentScore ?? 80,
    isNewUser: false,
    systems: systemSignals,
    hasOverdueMaintenance: maintenanceData.nowTasks.some(t => !t.completed),
    maintenanceCompletedThisMonth: 0,
    hasChangedSinceLastVisit: false,
  }), [homeForecast, systemSignals, maintenanceData]);

  const todaysFocus = useMemo(() => 
    arbitrateTodaysFocus(narrativeContext), 
    [narrativeContext]
  );

  // Handle "Why?" click - trigger interpretive mode
  const handleWhyClick = useCallback((systemKey: string) => {
    track('baseline_why_clicked', { system_key: systemKey }, { surface: 'dashboard' });
    onSystemClick(systemKey);
  }, [onSystemClick]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-4">
      {/* Annual State of Home - ONLY interrupt allowed */}
      {annualCard && (
        <div className="mb-4 shrink-0">
          <StateOfHomeReport 
            data={annualCard} 
            onDismiss={dismissAnnual} 
          />
        </div>
      )}

      {/* Enriching indicator (transient) */}
      {isEnriching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-4 shrink-0">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          Still analyzing your home...
        </div>
      )}

      {/* THE CHAT CONSOLE IS THE MIDDLE COLUMN */}
      <ChatConsole
        propertyId={propertyId}
        baselineSystems={baselineSystems}
        yearBuilt={yearBuilt}
        confidenceLevel={confidenceLevel}
        chatMode={chatMode}
        baselineSource={baselineSystems.length > 0 ? 'inferred' : 'inferred'}
        systemsWithLowConfidence={systemsWithLowConfidence}
        onWhyClick={handleWhyClick}
        onSystemUpdated={onSystemUpdated}
        todaysFocus={todaysFocus}
        advisorState={advisorState}
        focusContext={focusContext}
        hasAgentMessage={hasAgentMessage}
        openingMessage={openingMessage}
        confidence={confidence}
        risk={risk}
        onUserReply={onUserReply}
      />
    </div>
  );
}
