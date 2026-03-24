/**
 * SYSTEM STATE RESET SERVICE
 * 
 * Old risk data must not bleed forward after system replacement.
 * This service handles explicit state mutations when decisions are made.
 */

import { supabase } from '@/integrations/supabase/client';
import type { DecisionType } from '@/types/intervention';

interface SystemResetData {
  systemId: string;
  homeId: string;
  userId: string;
  decisionType: DecisionType;
  assumptionsJson: Record<string, unknown>;
  userNotes?: string;
  interventionId?: string;
}

interface ResetResult {
  success: boolean;
  error?: string;
  decisionEventId?: string;
}

/**
 * Handle a replacement decision - reset system state completely
 * 
 * State transition:
 * Old System (age: 14, risk: 92%) 
 *   → Decision: replace_now
 *   → New System (age: 0, risk: 5%, baseline: 20%)
 */
export async function handleReplacementDecision(
  data: SystemResetData
): Promise<ResetResult> {
  const { systemId, homeId, userId, assumptionsJson, userNotes, interventionId } = data;

  try {
    // 1. Create decision event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: decisionEvent, error: decisionError } = await (supabase
      .from('decision_events') as any)
      .insert({
        home_id: homeId,
        system_id: systemId,
        intervention_id: interventionId,
        user_id: userId,
        decision_type: 'replace_now',
        assumptions_json: {
          ...assumptionsJson,
          reset_triggered: true,
          reset_at: new Date().toISOString(),
        },
        user_notes: userNotes,
      })
      .select('id')
      .single();

    if (decisionError) {
      throw new Error(`Failed to create decision event: ${decisionError.message}`);
    }

    // 2. Reset system state for new installation
    const { error: updateError } = await supabase
      .from('home_systems')
      .update({
        // Risk resets to near-zero for new system
        risk_outlook_12mo: 5,
        
        // Baseline strength drops until new evidence arrives
        baseline_strength: 20,
        
        // Clear intervention data
        intervention_score: null,
        intervention_score_calculated_at: null,
        
        // Mark installation as unverified
        installation_verified: false,
        
        // Record state change
        last_state_change: 'replaced',
        last_state_change_at: new Date().toISOString(),
        last_decision_at: new Date().toISOString(),
        last_decision_type: 'replace_now',
        
        // Update timestamp
        updated_at: new Date().toISOString(),
      })
      .eq('id', systemId);

    if (updateError) {
      throw new Error(`Failed to reset system state: ${updateError.message}`);
    }

    return {
      success: true,
      decisionEventId: decisionEvent.id,
    };
  } catch (err) {
    console.error('handleReplacementDecision failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Handle a deferred decision - schedule next review
 */
export async function handleDeferralDecision(
  data: SystemResetData & { deferUntil: Date; nextReviewAt?: Date }
): Promise<ResetResult> {
  const { 
    systemId, 
    homeId, 
    userId, 
    assumptionsJson, 
    userNotes, 
    interventionId,
    deferUntil,
    nextReviewAt 
  } = data;

  try {
    // Create decision event with deferral info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: decisionEvent, error: decisionError } = await (supabase
      .from('decision_events') as any)
      .insert({
        home_id: homeId,
        system_id: systemId,
        intervention_id: interventionId,
        user_id: userId,
        decision_type: 'defer_with_date',
        defer_until: deferUntil.toISOString(),
        next_review_at: (nextReviewAt ?? deferUntil).toISOString(),
        assumptions_json: assumptionsJson,
        user_notes: userNotes,
      })
      .select('id')
      .single();

    if (decisionError) {
      throw new Error(`Failed to create decision event: ${decisionError.message}`);
    }

    // Update system with decision tracking
    const { error: updateError } = await supabase
      .from('home_systems')
      .update({
        last_decision_at: new Date().toISOString(),
        last_decision_type: 'defer_with_date',
        updated_at: new Date().toISOString(),
      })
      .eq('id', systemId);

    if (updateError) {
      console.warn('Failed to update system decision tracking:', updateError);
    }

    return {
      success: true,
      decisionEventId: decisionEvent.id,
    };
  } catch (err) {
    console.error('handleDeferralDecision failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Handle inspection/maintenance scheduling
 */
export async function handleScheduleDecision(
  data: SystemResetData & { scheduleType: 'inspection' | 'maintenance' }
): Promise<ResetResult> {
  const { 
    systemId, 
    homeId, 
    userId, 
    assumptionsJson, 
    userNotes, 
    interventionId,
    scheduleType 
  } = data;

  const decisionType = scheduleType === 'inspection' 
    ? 'schedule_inspection' as const
    : 'schedule_maintenance' as const;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: decisionEvent, error: decisionError } = await (supabase
      .from('decision_events') as any)
      .insert({
        home_id: homeId,
        system_id: systemId,
        intervention_id: interventionId,
        user_id: userId,
        decision_type: decisionType,
        assumptions_json: assumptionsJson,
        user_notes: userNotes,
      })
      .select('id')
      .single();

    if (decisionError) {
      throw new Error(`Failed to create decision event: ${decisionError.message}`);
    }

    // Update system tracking
    await supabase
      .from('home_systems')
      .update({
        last_decision_at: new Date().toISOString(),
        last_decision_type: decisionType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', systemId);

    return {
      success: true,
      decisionEventId: decisionEvent.id,
    };
  } catch (err) {
    console.error('handleScheduleDecision failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Handle "no action" decision - user explicitly chose to do nothing
 * This is DIFFERENT from closing without decision
 */
export async function handleNoActionDecision(
  data: SystemResetData
): Promise<ResetResult> {
  const { systemId, homeId, userId, assumptionsJson, userNotes, interventionId } = data;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: decisionEvent, error: decisionError } = await (supabase
      .from('decision_events') as any)
      .insert({
        home_id: homeId,
        system_id: systemId,
        intervention_id: interventionId,
        user_id: userId,
        decision_type: 'no_action',
        // Set next review 30 days out
        next_review_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        assumptions_json: {
          ...assumptionsJson,
          user_acknowledged_risk: true,
        },
        user_notes: userNotes,
      })
      .select('id')
      .single();

    if (decisionError) {
      throw new Error(`Failed to create decision event: ${decisionError.message}`);
    }

    // Update system tracking
    await supabase
      .from('home_systems')
      .update({
        last_decision_at: new Date().toISOString(),
        last_decision_type: 'no_action',
        updated_at: new Date().toISOString(),
      })
      .eq('id', systemId);

    return {
      success: true,
      decisionEventId: decisionEvent.id,
    };
  } catch (err) {
    console.error('handleNoActionDecision failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Handle new evidence arriving for a system
 * Updates baseline_strength based on evidence quality
 */
export async function handleNewEvidence(
  systemId: string,
  evidenceType: 'permit_data' | 'receipt_upload' | 'photo_upload' | 'user_input'
): Promise<{ success: boolean; newBaselineStrength?: number }> {
  try {
    // Get current system state
    const { data: system, error: fetchError } = await supabase
      .from('home_systems')
      .select('baseline_strength, installation_verified')
      .eq('id', systemId)
      .single();

    if (fetchError || !system) {
      throw new Error('System not found');
    }

    // Calculate new baseline strength based on evidence
    const currentStrength = system.baseline_strength ?? 20;
    let strengthIncrease = 0;
    let verified = system.installation_verified;

    switch (evidenceType) {
      case 'permit_data':
        strengthIncrease = 40;
        verified = true;
        break;
      case 'receipt_upload':
        strengthIncrease = 30;
        verified = true;
        break;
      case 'photo_upload':
        strengthIncrease = 15;
        break;
      case 'user_input':
        strengthIncrease = 10;
        break;
    }

    const newBaselineStrength = Math.min(100, currentStrength + strengthIncrease);

    // Update system
    const { error: updateError } = await supabase
      .from('home_systems')
      .update({
        baseline_strength: newBaselineStrength,
        installation_verified: verified,
        last_state_change: 'evidence_added',
        last_state_change_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', systemId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return {
      success: true,
      newBaselineStrength,
    };
  } catch (err) {
    console.error('handleNewEvidence failed:', err);
    return { success: false };
  }
}
