/**
 * Chat Mode Hook - V1 Spec Compliant
 * 
 * Derives chat mode from system data context.
 * Implements the deterministic chat state machine.
 */

import { useMemo, useState, useCallback } from 'react';
import type { ChatMode, ChatModeContext, SystemModeInput, SystemState } from '@/types/chatMode';
import type { HomeSystem } from '@/hooks/useHomeSystems';
import { 
  deriveSystemConfidence, 
  computeCriticalSystemsCoverage,
  hasUserConfirmedSystems,
  findLowConfidenceSystems,
} from '@/lib/systemConfidenceDerivation';
import { determineChatMode, shouldEnterInterpretive, isBaselineComplete } from '@/lib/chatModeSelector';
import { DATA_GAP_CONFIDENCE, ELEVATED_MONTHS, PLANNING_MONTHS } from '@/types/systemState';

interface UseChatModeOptions {
  homeId?: string;
  systems: HomeSystem[];
  permitsFound: boolean;
}

interface UseChatModeReturn extends ChatModeContext {
  /** Enter interpretive mode (triggered by user "why/how" question) */
  enterInterpretive: () => void;
  /** Exit interpretive mode (returns to previous mode) */
  exitInterpretive: () => void;
  /** Check if message should trigger interpretive mode */
  checkInterpretiveTrigger: (message: string) => boolean;
}

/**
 * Hook to derive chat mode from system data.
 * 
 * Usage:
 * ```tsx
 * const chatModeContext = useChatMode({
 *   homeId: userHome?.id,
 *   systems: homeSystems,
 *   permitsFound: permitInsights.length > 0,
 * });
 * ```
 */
export function useChatMode(options: UseChatModeOptions): UseChatModeReturn {
  const { systems, permitsFound } = options;
  
  // Track interpretive mode state (ephemeral)
  const [isInInterpretive, setIsInInterpretive] = useState(false);
  const [previousMode, setPreviousMode] = useState<ChatMode>('silent_steward');

  const context = useMemo(() => {
    // 1. Derive system confidence
    const systemConfidence = deriveSystemConfidence(systems);

    // 2. Compute critical systems coverage (QC #3)
    const criticalSystemsCoverage = computeCriticalSystemsCoverage(systems);

    // 3. Check if any system was user-confirmed
    const userConfirmedSystems = hasUserConfirmedSystems(systems);

    // 4. Find systems with low confidence
    const systemsWithLowConfidence = findLowConfidenceSystems(systems);

    // 5. Build system mode inputs (for mode derivation)
    const systemModeInputs: SystemModeInput[] = systems.map(s => {
      const { state, months, deviation } = deriveSystemStateFromHome(s);
      return {
        key: s.system_key,
        state,
        months_remaining: months,
        deviation_detected: deviation,
        anomaly_flags: [],
        confidence: s.confidence_score ?? 0.5,
      };
    });

    // 6. Build input context
    const modeInput = {
      systemConfidence,
      permitsFound,
      criticalSystemsCoverage,
      userConfirmedSystems,
      systems: systemModeInputs,
    };

    // 7. Determine base mode
    const baseMode = determineChatMode(modeInput);
    
    // 8. Apply interpretive override if active
    const mode = isInInterpretive ? 'interpretive' : baseMode;

    // 9. Check if baseline is complete
    const baselineComplete = isBaselineComplete(modeInput);

    return {
      mode,
      systemConfidence,
      permitsFound,
      criticalSystemsCoverage,
      userConfirmedSystems,
      systemsWithLowConfidence,
      previousMode: isInInterpretive ? previousMode : undefined,
      isBaselineComplete: baselineComplete,
    };
  }, [systems, permitsFound, isInInterpretive, previousMode]);

  // Enter interpretive mode
  const enterInterpretive = useCallback(() => {
    if (!isInInterpretive) {
      setPreviousMode(context.mode);
      setIsInInterpretive(true);
    }
  }, [isInInterpretive, context.mode]);

  // Exit interpretive mode (returns to previous)
  const exitInterpretive = useCallback(() => {
    setIsInInterpretive(false);
  }, []);

  // Check if message should trigger interpretive
  const checkInterpretiveTrigger = useCallback((message: string): boolean => {
    return shouldEnterInterpretive(message);
  }, []);

  return {
    ...context,
    enterInterpretive,
    exitInterpretive,
    checkInterpretiveTrigger,
  };
}

/**
 * Derive system state from HomeSystem record
 * Returns state, months remaining, and deviation flag
 */
function deriveSystemStateFromHome(system: HomeSystem): { 
  state: SystemState; 
  months?: number; 
  deviation: boolean; 
} {
  const confidence = system.confidence_score ?? 0.5;
  
  // Calculate months remaining from install date and expected lifespan
  let months: number | undefined;
  if (system.install_date && system.expected_lifespan_years) {
    const installDate = new Date(system.install_date);
    const now = new Date();
    const ageYears = (now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const remainingYears = system.expected_lifespan_years - ageYears;
    months = remainingYears * 12;
  }

  // Deviation detection: For now, we don't have deviation signals in HomeSystem
  // This would come from monitoring/analysis features in the future
  // For V1, deviation is always false unless explicitly set
  const deviation = false;

  // Priority 1: Data Gap
  if (confidence < DATA_GAP_CONFIDENCE) {
    return { state: 'data_gap', months, deviation: false };
  }

  // Priority 2: Elevated (requires deviation - which we don't have yet)
  // In future: check for runtime anomalies, efficiency drops, etc.
  if (deviation) {
    return { state: 'elevated', months, deviation: true };
  }

  // Priority 3: Planning Window
  if (months !== undefined && months < PLANNING_MONTHS) {
    return { state: 'planning_window', months, deviation: false };
  }

  // Default: Stable
  return { state: 'stable', months, deviation: false };
}

/**
 * Default context when no data is available.
 * Returns baseline_establishment mode.
 */
export function getDefaultChatModeContext(): ChatModeContext {
  return {
    mode: 'baseline_establishment',
    systemConfidence: 'Early',
    permitsFound: false,
    criticalSystemsCoverage: 0,
    userConfirmedSystems: false,
    systemsWithLowConfidence: [],
    isBaselineComplete: false,
  };
}
