import { useState, useCallback, useMemo } from 'react';
import type {
  AdvisorState,
  AdvisorContext,
  AdvisorTrigger,
  FocusContext,
  RiskLevel,
  AdvisorOpeningMessage,
} from '@/types/advisorState';
import {
  getConfidenceBucket,
  shouldAutoExpand,
  getTriggerKey,
  generateOpeningMessage,
} from '@/types/advisorState';

interface UseAdvisorStateOptions {
  initialConfidence?: number;
  initialRisk?: RiskLevel;
}

interface UseAdvisorStateReturn {
  // Current state
  advisorState: AdvisorState;
  focusContext: FocusContext;
  confidence: number;
  risk: RiskLevel;
  
  // Derived
  shouldChatBeOpen: boolean;
  openingMessage: AdvisorOpeningMessage | null;
  hasAgentMessage: boolean;
  
  // Actions
  selectSystem: (systemKey: string) => void;
  handleRiskThresholdCrossed: (systemKey: string, newLevel: RiskLevel) => void;
  handleConfidenceImproved: (systemKey: string, oldConf: number, newConf: number) => void;
  handlePlanningWindowEntered: (systemKey: string, monthsRemaining: number) => void;
  handleUserReply: () => void;
  handleUserCommitted: (decisionId: string) => void;
  handleChatDismissed: () => void;
  handleChatExpanded: () => void;
  reset: () => void;
}

/**
 * useAdvisorState - State machine for Habitta advisor behavior
 * 
 * Manages transitions between:
 * PASSIVE → OBSERVING → ENGAGED → DECISION → EXECUTION
 * 
 * Rules:
 * - Auto-open only happens on specific triggers
 * - Chat never auto-closes
 * - Each unique trigger only causes expansion once
 */
export function useAdvisorState(options: UseAdvisorStateOptions = {}): UseAdvisorStateReturn {
  const { initialConfidence = 0.5, initialRisk = 'LOW' } = options;
  
  const [advisorState, setAdvisorState] = useState<AdvisorState>('PASSIVE');
  const [focusContext, setFocusContext] = useState<FocusContext>({ type: 'NONE' });
  const [confidence, setConfidence] = useState(initialConfidence);
  const [risk, setRisk] = useState<RiskLevel>(initialRisk);
  const [expandedTriggers, setExpandedTriggers] = useState<Set<string>>(new Set());
  const [lastTrigger, setLastTrigger] = useState<AdvisorTrigger | null>(null);
  const [chatManuallyOpened, setChatManuallyOpened] = useState(false);

  // Process a trigger and potentially transition state
  const processTrigger = useCallback((trigger: AdvisorTrigger) => {
    const shouldExpand = shouldAutoExpand(trigger, advisorState, expandedTriggers);
    
    if (shouldExpand) {
      // Mark this trigger as processed (once per unique trigger)
      const triggerKey = getTriggerKey(trigger);
      setExpandedTriggers(prev => new Set(prev).add(triggerKey));
      setLastTrigger(trigger);
      setAdvisorState('ENGAGED');
    }

    // Handle state-specific transitions
    switch (trigger.type) {
      case 'SYSTEM_SELECTED':
        setFocusContext({ type: 'SYSTEM', systemKey: trigger.systemKey });
        if (advisorState === 'PASSIVE') {
          setAdvisorState(shouldExpand ? 'ENGAGED' : 'OBSERVING');
        }
        break;
        
      case 'USER_REPLIED':
        if (advisorState === 'ENGAGED') {
          setAdvisorState('DECISION');
        }
        break;
        
      case 'USER_COMMITTED':
        setFocusContext({ type: 'DECISION', decisionId: trigger.decisionId });
        setAdvisorState('EXECUTION');
        break;
        
      case 'USER_DISMISSED_CHAT':
        // Never auto-close, but allow manual close
        // State drops to OBSERVING but user can re-open
        if (advisorState === 'ENGAGED' || advisorState === 'DECISION') {
          setAdvisorState('OBSERVING');
        }
        setChatManuallyOpened(false);
        break;
        
      case 'USER_SWITCHED_SYSTEM':
        setFocusContext({ type: 'SYSTEM', systemKey: trigger.newSystemKey });
        // Stay in current state, just reframe context
        break;
    }
  }, [advisorState, expandedTriggers]);

  // Public actions
  const selectSystem = useCallback((systemKey: string) => {
    processTrigger({ type: 'SYSTEM_SELECTED', systemKey });
  }, [processTrigger]);

  const handleRiskThresholdCrossed = useCallback((systemKey: string, newLevel: RiskLevel) => {
    setRisk(newLevel);
    processTrigger({ type: 'RISK_THRESHOLD_CROSSED', systemKey, newLevel });
  }, [processTrigger]);

  const handleConfidenceImproved = useCallback((systemKey: string, oldConf: number, newConf: number) => {
    setConfidence(newConf);
    processTrigger({ type: 'CONFIDENCE_IMPROVED', systemKey, oldConfidence: oldConf, newConfidence: newConf });
  }, [processTrigger]);

  const handlePlanningWindowEntered = useCallback((systemKey: string, monthsRemaining: number) => {
    processTrigger({ type: 'PLANNING_WINDOW_ENTERED', systemKey, monthsRemaining });
  }, [processTrigger]);

  const handleUserReply = useCallback(() => {
    processTrigger({ type: 'USER_REPLIED' });
  }, [processTrigger]);

  const handleUserCommitted = useCallback((decisionId: string) => {
    processTrigger({ type: 'USER_COMMITTED', decisionId });
  }, [processTrigger]);

  const handleChatDismissed = useCallback(() => {
    processTrigger({ type: 'USER_DISMISSED_CHAT' });
  }, [processTrigger]);

  const handleChatExpanded = useCallback(() => {
    setChatManuallyOpened(true);
    if (advisorState === 'PASSIVE' || advisorState === 'OBSERVING') {
      setAdvisorState('ENGAGED');
    }
  }, [advisorState]);

  const reset = useCallback(() => {
    setAdvisorState('PASSIVE');
    setFocusContext({ type: 'NONE' });
    setExpandedTriggers(new Set());
    setLastTrigger(null);
    setChatManuallyOpened(false);
  }, []);

  // Derived state
  const shouldChatBeOpen = useMemo(() => {
    return chatManuallyOpened || 
           advisorState === 'ENGAGED' || 
           advisorState === 'DECISION' || 
           advisorState === 'EXECUTION';
  }, [chatManuallyOpened, advisorState]);

  const hasAgentMessage = useMemo(() => {
    return advisorState === 'ENGAGED' && lastTrigger !== null;
  }, [advisorState, lastTrigger]);

  const openingMessage = useMemo(() => {
    if (!hasAgentMessage || !lastTrigger) return null;
    
    const systemName = focusContext.type === 'SYSTEM' 
      ? formatSystemName(focusContext.systemKey) 
      : 'system';
    
    return generateOpeningMessage(
      lastTrigger,
      getConfidenceBucket(confidence),
      risk,
      systemName
    );
  }, [hasAgentMessage, lastTrigger, focusContext, confidence, risk]);

  return {
    advisorState,
    focusContext,
    confidence,
    risk,
    shouldChatBeOpen,
    openingMessage,
    hasAgentMessage,
    selectSystem,
    handleRiskThresholdCrossed,
    handleConfidenceImproved,
    handlePlanningWindowEntered,
    handleUserReply,
    handleUserCommitted,
    handleChatDismissed,
    handleChatExpanded,
    reset,
  };
}

function formatSystemName(systemKey: string): string {
  const names: Record<string, string> = {
    hvac: 'HVAC system',
    roof: 'roof',
    water_heater: 'water heater',
    electrical: 'electrical system',
    plumbing: 'plumbing',
  };
  return names[systemKey] || systemKey;
}
