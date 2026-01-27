/**
 * Chat Governance Hook
 * 
 * Tracks message limits and mode transitions.
 * Implements Subtle Risk #1 Fix: Interpretive mode timeout.
 */

import { useState, useCallback, useEffect } from 'react';
import type { ChatMode } from '@/types/chatMode';
import {
  ChatGovernanceState,
  createInitialGovernanceState,
  canAutoInitiate,
  canSendAgentMessage,
  shouldExitInterpretive,
  recordAutoInitiation,
  recordAgentMessage,
  recordUserMessage,
  enterInterpretiveMode,
  exitInterpretiveMode,
  wasPlanningWindowAcknowledged,
  acknowledgePlanningWindow,
} from '@/lib/chatGovernance';

interface UseChatGovernanceReturn {
  /** Current governance state */
  state: ChatGovernanceState;
  
  /** Whether chat can auto-initiate */
  canAutoInitiate: boolean;
  
  /** Whether agent can send another message */
  canSendAgentMessage: boolean;
  
  /** Whether interpretive mode should exit */
  shouldExitInterpretive: boolean;
  
  /** Mode to return to after interpretive */
  returnMode: ChatMode;
  
  /** Check if planning window was acknowledged for a system */
  isPlanningWindowAcknowledged: (systemKey: string) => boolean;
  
  /** Acknowledge planning window for a system */
  acknowledgePlanningWindow: (systemKey: string) => void;
  
  /** Record an auto-initiation */
  onAutoInitiation: () => void;
  
  /** Record an agent message */
  onAgentMessage: () => void;
  
  /** Record a user message */
  onUserMessage: () => void;
  
  /** Enter interpretive mode */
  onEnterInterpretive: (previousMode: ChatMode) => void;
  
  /** Exit interpretive mode */
  onExitInterpretive: () => void;
}

export function useChatGovernance(chatMode: ChatMode): UseChatGovernanceReturn {
  const [state, setState] = useState<ChatGovernanceState>(createInitialGovernanceState);

  // Track mode changes for interpretive return
  useEffect(() => {
    if (chatMode === 'interpretive' && state.previousMode === null) {
      // Don't auto-set previous mode here - it should be set explicitly
      // when entering interpretive mode
    }
  }, [chatMode, state.previousMode]);

  // Check functions
  const canAutoInit = canAutoInitiate(state);
  const canSendAgent = canSendAgentMessage(state);
  const shouldExitInterp = shouldExitInterpretive(state);
  const returnMode = state.previousMode ?? 'silent_steward';

  // Action handlers
  const onAutoInitiation = useCallback(() => {
    setState(prev => recordAutoInitiation(prev));
  }, []);

  const onAgentMessage = useCallback(() => {
    setState(prev => recordAgentMessage(prev));
  }, []);

  const onUserMessage = useCallback(() => {
    setState(prev => recordUserMessage(prev));
  }, []);

  const onEnterInterpretive = useCallback((previousMode: ChatMode) => {
    setState(prev => enterInterpretiveMode(prev, previousMode));
  }, []);

  const onExitInterpretive = useCallback(() => {
    setState(prev => exitInterpretiveMode(prev));
  }, []);

  // Planning window acknowledgment
  const isPlanningWindowAcknowledged = useCallback((systemKey: string) => {
    return wasPlanningWindowAcknowledged(systemKey);
  }, []);

  const ackPlanningWindow = useCallback((systemKey: string) => {
    acknowledgePlanningWindow(systemKey);
  }, []);

  return {
    state,
    canAutoInitiate: canAutoInit,
    canSendAgentMessage: canSendAgent,
    shouldExitInterpretive: shouldExitInterp,
    returnMode,
    isPlanningWindowAcknowledged,
    acknowledgePlanningWindow: ackPlanningWindow,
    onAutoInitiation,
    onAgentMessage,
    onUserMessage,
    onEnterInterpretive,
    onExitInterpretive,
  };
}
