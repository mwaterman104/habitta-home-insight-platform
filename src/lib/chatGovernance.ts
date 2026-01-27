/**
 * Chat Governance - V1 Spec Compliant
 * 
 * Message frequency rules and mode transition management.
 * Implements hard limits to prevent "chatty AI rot".
 * 
 * HARD LIMITS:
 * - Max 1 auto-initiation per session
 * - Max 3 consecutive agent messages without user input
 * - 24hr cooldown per trigger type
 * - Interpretive mode: max 1 message then auto-return
 */

import type { ChatMode } from '@/types/chatMode';

// ============================================
// Governance Rules
// ============================================

export const GOVERNANCE_RULES = {
  /** Max auto-initiations per session */
  maxAutoInitiationsPerSession: 1,
  
  /** Max consecutive agent messages without user input */
  maxConsecutiveAgentMessages: 3,
  
  /** Cooldown between same trigger type (24 hours) */
  cooldownBetweenSameTrigger: 24 * 60 * 60 * 1000,
  
  /** Subtle Risk #1 Fix: Max interpretive messages before auto-return */
  maxInterpretiveMessages: 1,
};

// ============================================
// Chat Governance State
// ============================================

export interface ChatGovernanceState {
  autoInitiationsThisSession: number;
  consecutiveAgentMessages: number;
  interpretiveMessagesCount: number;
  previousMode: ChatMode | null;
  lastAutoMessageTimestamp: number;
}

export function createInitialGovernanceState(): ChatGovernanceState {
  return {
    autoInitiationsThisSession: 0,
    consecutiveAgentMessages: 0,
    interpretiveMessagesCount: 0,
    previousMode: null,
    lastAutoMessageTimestamp: 0,
  };
}

// ============================================
// Governance Checks
// ============================================

/**
 * Check if chat can auto-initiate
 */
export function canAutoInitiate(state: ChatGovernanceState): boolean {
  return state.autoInitiationsThisSession < GOVERNANCE_RULES.maxAutoInitiationsPerSession;
}

/**
 * Check if agent can send another message
 */
export function canSendAgentMessage(state: ChatGovernanceState): boolean {
  return state.consecutiveAgentMessages < GOVERNANCE_RULES.maxConsecutiveAgentMessages;
}

/**
 * Check if interpretive mode should auto-return
 * Subtle Risk #1 Fix: Hard timeout after 1 explanation
 */
export function shouldExitInterpretive(state: ChatGovernanceState): boolean {
  return state.interpretiveMessagesCount >= GOVERNANCE_RULES.maxInterpretiveMessages;
}

// ============================================
// State Mutations
// ============================================

/**
 * Record an auto-initiation
 */
export function recordAutoInitiation(state: ChatGovernanceState): ChatGovernanceState {
  return {
    ...state,
    autoInitiationsThisSession: state.autoInitiationsThisSession + 1,
    lastAutoMessageTimestamp: Date.now(),
  };
}

/**
 * Record an agent message
 */
export function recordAgentMessage(state: ChatGovernanceState): ChatGovernanceState {
  return {
    ...state,
    consecutiveAgentMessages: state.consecutiveAgentMessages + 1,
    interpretiveMessagesCount: state.interpretiveMessagesCount + 1,
  };
}

/**
 * Record a user message (resets consecutive count)
 */
export function recordUserMessage(state: ChatGovernanceState): ChatGovernanceState {
  return {
    ...state,
    consecutiveAgentMessages: 0,
  };
}

/**
 * Enter interpretive mode (store previous mode)
 */
export function enterInterpretiveMode(
  state: ChatGovernanceState, 
  previousMode: ChatMode
): ChatGovernanceState {
  return {
    ...state,
    previousMode,
    interpretiveMessagesCount: 0,
  };
}

/**
 * Exit interpretive mode
 */
export function exitInterpretiveMode(state: ChatGovernanceState): ChatGovernanceState {
  return {
    ...state,
    previousMode: null,
    interpretiveMessagesCount: 0,
  };
}

// ============================================
// Planning Window Acknowledgment Persistence
// Subtle Risk #2 Fix: Remember when planning window was acknowledged
// ============================================

export interface PlanningWindowAcknowledgment {
  systemKey: string;
  acknowledgedAt: string;  // ISO timestamp
  windowEnteredAt: string; // ISO timestamp
}

const PLANNING_ACK_KEY = 'habitta_planning_ack';

export function getPlanningAcknowledgments(): PlanningWindowAcknowledgment[] {
  try {
    const stored = localStorage.getItem(PLANNING_ACK_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function acknowledgePlanningWindow(systemKey: string): void {
  try {
    const acks = getPlanningAcknowledgments();
    const existing = acks.findIndex(a => a.systemKey === systemKey);
    
    const newAck: PlanningWindowAcknowledgment = {
      systemKey,
      acknowledgedAt: new Date().toISOString(),
      windowEnteredAt: new Date().toISOString(),
    };
    
    if (existing >= 0) {
      acks[existing] = newAck;
    } else {
      acks.push(newAck);
    }
    
    localStorage.setItem(PLANNING_ACK_KEY, JSON.stringify(acks));
  } catch {
    // Silent failure
  }
}

export function wasPlanningWindowAcknowledged(systemKey: string): boolean {
  const acks = getPlanningAcknowledgments();
  return acks.some(a => a.systemKey === systemKey);
}

export function clearPlanningAcknowledgment(systemKey: string): void {
  try {
    const acks = getPlanningAcknowledgments().filter(a => a.systemKey !== systemKey);
    localStorage.setItem(PLANNING_ACK_KEY, JSON.stringify(acks));
  } catch {
    // Silent failure
  }
}

export function clearAllPlanningAcknowledgments(): void {
  try {
    localStorage.removeItem(PLANNING_ACK_KEY);
  } catch {
    // Silent failure
  }
}
