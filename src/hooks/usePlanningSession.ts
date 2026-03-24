/**
 * PLANNING SESSION HOOK
 * 
 * SESSION PERSISTENCE CONTRACT:
 * User must be able to leave Planning Session, return later,
 * and see the same briefing intact.
 * 
 * Messages are persisted per intervention, not regenerated.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  Intervention, 
  InterventionMessage, 
  ClosedReason,
  DecisionType,
} from '@/types/intervention';

interface UsePlanningSessionOptions {
  interventionId?: string;
  autoLoad?: boolean;
}

interface UsePlanningSessionReturn {
  intervention: Intervention | null;
  messages: InterventionMessage[];
  loading: boolean;
  error: string | null;
  /** Add a user message and persist */
  sendMessage: (content: string) => Promise<void>;
  /** Add an assistant message and persist */
  addAssistantMessage: (content: string, metadata?: Record<string, unknown>) => Promise<void>;
  /** Record a decision and close the session */
  recordDecision: (decisionType: DecisionType, options?: RecordDecisionOptions) => Promise<boolean>;
  /** Close session without decision */
  closeSession: (reason: ClosedReason) => Promise<boolean>;
  /** Update last viewed timestamp */
  markViewed: () => Promise<void>;
  /** Reload the session */
  reload: () => Promise<void>;
}

interface RecordDecisionOptions {
  deferUntil?: Date;
  nextReviewAt?: Date;
  userNotes?: string;
  assumptionsJson?: Record<string, unknown>;
}

/**
 * Map raw database row to Intervention type
 */
function mapRowToIntervention(row: Record<string, unknown>): Intervention {
  // Parse messages from JSONB
  const rawMessages = row.messages;
  const messages: InterventionMessage[] = Array.isArray(rawMessages) 
    ? rawMessages.map(m => ({
        id: String((m as Record<string, unknown>).id ?? ''),
        role: (m as Record<string, unknown>).role as 'system' | 'assistant' | 'user',
        content: String((m as Record<string, unknown>).content ?? ''),
        timestamp: String((m as Record<string, unknown>).timestamp ?? ''),
        metadata: (m as Record<string, unknown>).metadata as Record<string, unknown> | undefined,
      }))
    : [];

  return {
    id: row.id as string,
    homeId: row.home_id as string,
    systemId: row.system_id as string,
    userId: row.user_id as string,
    triggerReason: row.trigger_reason as Intervention['triggerReason'],
    interventionScore: row.intervention_score as number,
    interventionThresholdUsed: row.intervention_threshold_used as number,
    riskOutlookSnapshot: row.risk_outlook_snapshot as number,
    baselineStrengthSnapshot: row.baseline_strength_snapshot as number,
    comparableHomesCount: row.comparable_homes_count as number | undefined,
    dataSources: row.data_sources as Record<string, unknown> | undefined,
    urgencyPremiumSnapshot: row.urgency_premium_snapshot as number,
    urgencyFactorsSnapshot: (row.urgency_factors_snapshot as Record<string, boolean>) ?? {},
    openedAt: row.opened_at as string,
    lastViewedAt: row.last_viewed_at as string | undefined,
    closedAt: row.closed_at as string | undefined,
    closedReason: row.closed_reason as ClosedReason | undefined,
    cooldownUntil: row.cooldown_until as string | undefined,
    messages,
    messageOrder: (row.message_order as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function usePlanningSession(
  options: UsePlanningSessionOptions = {}
): UsePlanningSessionReturn {
  const { interventionId, autoLoad = true } = options;
  
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load intervention from database
   */
  const loadIntervention = useCallback(async () => {
    if (!interventionId) {
      setIntervention(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('interventions')
        .select('*')
        .eq('id', interventionId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data) {
        setIntervention(mapRowToIntervention(data as unknown as Record<string, unknown>));
      }
    } catch (err) {
      console.error('Failed to load intervention:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [interventionId]);

  /**
   * Auto-load on mount if enabled
   */
  useEffect(() => {
    if (autoLoad && interventionId) {
      loadIntervention();
    }
  }, [autoLoad, interventionId, loadIntervention]);

  /**
   * Persist messages to database
   */
  const persistMessages = useCallback(async (
    messages: InterventionMessage[],
    messageOrder: string[]
  ): Promise<boolean> => {
    if (!interventionId) return false;

    try {
      const { error: updateError } = await supabase
        .from('interventions')
        .update({
          messages: JSON.parse(JSON.stringify(messages)),
          message_order: messageOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', interventionId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return true;
    } catch (err) {
      console.error('Failed to persist messages:', err);
      setError('Unable to save message. Please try again.');
      return false;
    }
  }, [interventionId]);

  /**
   * Send a user message
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!intervention) return;

    const newMessage: InterventionMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...intervention.messages, newMessage];
    const updatedOrder = [...intervention.messageOrder, newMessage.id];

    // Optimistic update
    setIntervention(prev => prev ? {
      ...prev,
      messages: updatedMessages,
      messageOrder: updatedOrder,
    } : null);

    // Persist to database
    const success = await persistMessages(updatedMessages, updatedOrder);
    
    if (!success) {
      // Rollback on failure
      setIntervention(prev => prev ? {
        ...prev,
        messages: intervention.messages,
        messageOrder: intervention.messageOrder,
      } : null);
    }
  }, [intervention, persistMessages]);

  /**
   * Add an assistant message
   */
  const addAssistantMessage = useCallback(async (
    content: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!intervention) return;

    const newMessage: InterventionMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const updatedMessages = [...intervention.messages, newMessage];
    const updatedOrder = [...intervention.messageOrder, newMessage.id];

    setIntervention(prev => prev ? {
      ...prev,
      messages: updatedMessages,
      messageOrder: updatedOrder,
    } : null);

    await persistMessages(updatedMessages, updatedOrder);
  }, [intervention, persistMessages]);

  /**
   * Record a decision and close the session
   * 
   * CRITICAL: Transaction must succeed before closing.
   * If write fails → show error, keep session open.
   * NO comforting language without successful save.
   */
  const recordDecision = useCallback(async (
    decisionType: DecisionType,
    options: RecordDecisionOptions = {}
  ): Promise<boolean> => {
    if (!intervention) return false;

    const { deferUntil, nextReviewAt, userNotes, assumptionsJson = {} } = options;

    try {
      // 1. Create decision event
      const { error: decisionError } = await supabase
        .from('decision_events')
        .insert({
          home_id: intervention.homeId,
          system_id: intervention.systemId,
          intervention_id: intervention.id,
          user_id: intervention.userId,
          decision_type: decisionType,
          defer_until: deferUntil?.toISOString(),
          next_review_at: nextReviewAt?.toISOString(),
          user_notes: userNotes,
          assumptions_json: {
            ...assumptionsJson,
            intervention_score: intervention.interventionScore,
            risk_outlook: intervention.riskOutlookSnapshot,
            baseline_strength: intervention.baselineStrengthSnapshot,
            urgency_premium: intervention.urgencyPremiumSnapshot,
            recorded_at: new Date().toISOString(),
          },
        });

      if (decisionError) {
        throw new Error(decisionError.message);
      }

      // 2. Close the intervention
      const closedReason: ClosedReason = decisionType === 'defer_with_date' 
        ? 'user_deferred' 
        : 'decision_made';

      const cooldownDays = decisionType === 'no_action' ? 30 : 7;
      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + cooldownDays);

      const { error: closeError } = await supabase
        .from('interventions')
        .update({
          closed_at: new Date().toISOString(),
          closed_reason: closedReason,
          cooldown_until: cooldownUntil.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', intervention.id);

      if (closeError) {
        throw new Error(closeError.message);
      }

      // 3. Update local state
      setIntervention(prev => prev ? {
        ...prev,
        closedAt: new Date().toISOString(),
        closedReason,
        cooldownUntil: cooldownUntil.toISOString(),
      } : null);

      return true;
    } catch (err) {
      console.error('Failed to record decision:', err);
      setError('Unable to record your decision. Please try again.');
      return false;
    }
  }, [intervention]);

  /**
   * Close session without decision
   */
  const closeSession = useCallback(async (reason: ClosedReason): Promise<boolean> => {
    if (!intervention) return false;

    try {
      const { error: closeError } = await supabase
        .from('interventions')
        .update({
          closed_at: new Date().toISOString(),
          closed_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', intervention.id);

      if (closeError) {
        throw new Error(closeError.message);
      }

      setIntervention(prev => prev ? {
        ...prev,
        closedAt: new Date().toISOString(),
        closedReason: reason,
      } : null);

      return true;
    } catch (err) {
      console.error('Failed to close session:', err);
      setError('Unable to close session. Please try again.');
      return false;
    }
  }, [intervention]);

  /**
   * Update last viewed timestamp
   */
  const markViewed = useCallback(async () => {
    if (!interventionId) return;

    try {
      await supabase
        .from('interventions')
        .update({
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', interventionId);
    } catch (err) {
      // Silent failure for view tracking
      console.warn('Failed to update last_viewed_at:', err);
    }
  }, [interventionId]);

  return {
    intervention,
    messages: intervention?.messages ?? [],
    loading,
    error,
    sendMessage,
    addAssistantMessage,
    recordDecision,
    closeSession,
    markViewed,
    reload: loadIntervention,
  };
}

/**
 * Hook to get active interventions for a home
 */
export function useActiveInterventions(homeId?: string) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!homeId) {
      setInterventions([]);
      return;
    }

    const loadInterventions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('interventions')
          .select('*')
          .eq('home_id', homeId)
          .is('closed_at', null)
          .order('opened_at', { ascending: false });

        if (error) throw error;

        setInterventions((data ?? []).map(d => mapRowToIntervention(d as unknown as Record<string, unknown>)));
      } catch (err) {
        console.error('Failed to load active interventions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInterventions();
  }, [homeId]);

  return { interventions, loading };
}
