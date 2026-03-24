import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  AdvisorState,
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
import {
  loadTriggerHistory,
  saveTriggerToHistory,
  canAutoOpen,
  incrementSessionAutoOpens,
  CADENCE_RULES,
} from '@/lib/uiGovernance';

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
 * Cadence Rules:
 * - 24hr cooldown per trigger type
 * - Max 2 auto-opens per session
 * - Silent if no data change
 * 
 * Auto-open triggers:
 * - System selected (once per system per session)
 * - Risk threshold crossed (once per threshold level)
 * - Confidence improved >15% (once per system)
 * - Planning window entered (once per system)
 * 
 * Non-triggers (never auto-open):
 * - App load with no changes
 * - User scrolling
 * - Map interactions
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

  // Load trigger history from localStorage on mount
  useEffect(() => {
    const history = loadTriggerHistory();
    if (history.length > 0) {
      setExpandedTriggers(new Set(history.map(entry => entry.key)));
    }
  }, []);

  // Process a trigger and potentially transition state
  const processTrigger = useCallback((trigger: AdvisorTrigger) => {
    // Check if this trigger should cause auto-expansion
    const basicShouldExpand = shouldAutoExpand(trigger, advisorState, expandedTriggers);
    
    // Apply session-level cadence rules
    const sessionAllowsExpand = canAutoOpen();
    const shouldExpand = basicShouldExpand && sessionAllowsExpand;
    
    if (shouldExpand) {
      // Mark this trigger as processed (once per unique trigger)
      const triggerKey = getTriggerKey(trigger);
      setExpandedTriggers(prev => new Set(prev).add(triggerKey));
      
      // Persist to localStorage for cross-session cadence
      saveTriggerToHistory(triggerKey);
      
      // Increment session counter
      incrementSessionAutoOpens();
      
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
