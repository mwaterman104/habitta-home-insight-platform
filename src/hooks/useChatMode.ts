/**
 * Chat Mode Hook
 * 
 * Derives chat mode from system data context.
 * Implements the deterministic chat state machine.
 */

import { useMemo } from 'react';
import type { ChatMode, ChatModeContext } from '@/types/chatMode';
import type { HomeSystem } from '@/hooks/useHomeSystems';
import { 
  deriveSystemConfidence, 
  computeCriticalSystemsCoverage,
  hasUserConfirmedSystems,
  findLowConfidenceSystems,
} from '@/lib/systemConfidenceDerivation';
import { determineChatMode } from '@/lib/chatModeSelector';

interface UseChatModeOptions {
  homeId?: string;
  systems: HomeSystem[];
  permitsFound: boolean;
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
export function useChatMode(options: UseChatModeOptions): ChatModeContext {
  const { systems, permitsFound } = options;

  return useMemo(() => {
    // 1. Derive system confidence
    const systemConfidence = deriveSystemConfidence(systems);

    // 2. Compute critical systems coverage (QC #3)
    const criticalSystemsCoverage = computeCriticalSystemsCoverage(systems);

    // 3. Check if any system was user-confirmed
    const userConfirmedSystems = hasUserConfirmedSystems(systems);

    // 4. Find systems with low confidence
    const systemsWithLowConfidence = findLowConfidenceSystems(systems);

    // 5. Determine chat mode
    const mode = determineChatMode({
      systemConfidence,
      permitsFound,
      criticalSystemsCoverage,
      userConfirmedSystems,
    });

    return {
      mode,
      systemConfidence,
      permitsFound,
      criticalSystemsCoverage,
      userConfirmedSystems,
      systemsWithLowConfidence,
    };
  }, [systems, permitsFound]);
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
  };
}
