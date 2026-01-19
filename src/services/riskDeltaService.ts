import { supabase } from '@/integrations/supabase/client';
import { 
  type RiskSnapshot, 
  type RiskDelta, 
  type ValidationResult,
  DELTA_BOUNDS,
  CALCULATION_TIMEOUT_MS,
  POLL_INTERVAL_MS
} from '@/types/riskDelta';

// Re-export types for convenience
export type { RiskSnapshot, RiskDelta, ValidationResult };

interface BeforeSnapshot {
  score: number;
  failureProbability12mo?: number;
  monthsRemaining?: number;
  status: string;
}

interface InternalRiskDelta {
  score: number;
  failureProbability12mo: number | null;
  monthsAdded: number | null;
  statusChange: {
    from: string;
    to: string;
  } | null;
}

/**
 * Validate calculated delta for sanity and consistency
 * Returns validation result with flags for suspicious or invalid data
 */
export function validateDelta(
  delta: RiskDelta,
  before: RiskSnapshot,
  after: RiskSnapshot
): ValidationResult {
  // Check for zero scores (indicates bad data)
  if (after.score === 0 || before.score === 0) {
    return { 
      isValid: false, 
      isSuspicious: true,
      reason: 'Invalid zero score detected', 
      shouldUseEstimate: true 
    };
  }

  // Check upper bounds
  if (delta.scoreChange > DELTA_BOUNDS.maxScoreChange) {
    return { 
      isValid: false, 
      isSuspicious: true, 
      reason: 'Unusually large score improvement', 
      shouldUseEstimate: true 
    };
  }
  
  // Check lower bounds
  if (delta.scoreChange < DELTA_BOUNDS.minScoreChange) {
    return { 
      isValid: true, 
      isSuspicious: true, 
      reason: 'Maintenance may have revealed hidden issues' 
    };
  }

  // Check months added bounds
  if (delta.monthsAdded !== null) {
    if (delta.monthsAdded > DELTA_BOUNDS.maxMonthsAdded) {
      return { 
        isValid: false, 
        isSuspicious: true,
        reason: 'Unusually large lifespan extension', 
        shouldUseEstimate: true 
      };
    }
    if (delta.monthsAdded < DELTA_BOUNDS.minMonthsAdded) {
      return { 
        isValid: true, 
        isSuspicious: true,
        reason: 'Maintenance reduced expected system life' 
      };
    }
  }

  // Check failure probability reduction bounds
  if (delta.failureProbReduction !== null && 
      delta.failureProbReduction > DELTA_BOUNDS.maxFailureReduction) {
    return { 
      isValid: false, 
      isSuspicious: true,
      reason: 'Unusually large risk reduction', 
      shouldUseEstimate: true 
    };
  }

  // Consistency check: score change direction
  if (delta.scoreChange > 0 && after.score <= before.score) {
    return { 
      isValid: false, 
      isSuspicious: true,
      reason: 'Score delta direction mismatch', 
      shouldUseEstimate: true 
    };
  }

  // Consistency check: failure probability direction
  if (delta.failureProbReduction !== null && delta.failureProbReduction > 0 &&
      after.failureProbability12mo !== null && before.failureProbability12mo !== null &&
      after.failureProbability12mo >= before.failureProbability12mo) {
    return { 
      isValid: false, 
      isSuspicious: true,
      reason: 'Failure probability mismatch', 
      shouldUseEstimate: true 
    };
  }

  return { isValid: true, isSuspicious: false };
}

/**
 * Wait for prediction refresh to complete by polling the predictions table
 * Replaces arbitrary setTimeout with proper polling (fixes race condition)
 */
async function waitForPredictionRefresh(
  homeId: string,
  startTime: Date,
  maxAttempts = 20,
  intervalMs = 500
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('predicted_at')
        .eq('address_id', homeId)
        .order('predicted_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.warn(`Polling attempt ${attempt} failed:`, error);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }
      
      if (data && data.length > 0 && new Date(data[0].predicted_at) > startTime) {
        console.log(`Predictions refreshed after ${attempt} attempts`);
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (err) {
      console.warn(`Polling attempt ${attempt} error:`, err);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  console.error(`Prediction refresh timeout after ${maxAttempts} attempts`);
  return false;
}

/**
 * Trigger prediction refresh and capture risk delta after task completion
 * This is the "moat move" - measuring impact of maintenance tasks
 */
export async function captureRiskDelta(
  homeId: string,
  systemType: string,
  beforeSnapshot: BeforeSnapshot,
  taskId: string
): Promise<void> {
  const startTime = new Date();
  
  try {
    // Step 1: Trigger prediction refresh (fixes missing trigger issue)
    console.log(`Triggering prediction refresh for ${homeId}`);
    const { error: refreshError } = await supabase.functions.invoke('predict-property', {
      body: {
        address_id: homeId,
        force_refresh: true,
        trigger_source: 'task_completion',
        task_id: taskId
      }
    });
    
    if (refreshError) {
      console.error('Prediction refresh failed:', refreshError);
      // Continue anyway - we may still get updated data
    }
    
    // Step 2: Wait for prediction refresh to complete (polls instead of fixed delay)
    const refreshComplete = await waitForPredictionRefresh(homeId, startTime);
    
    if (!refreshComplete) {
      console.warn('Prediction refresh did not complete in time, using current data');
    }
    
    // Step 3: Fetch fresh predictions from intelligence-engine
    console.log(`Fetching after-snapshot for ${systemType}`);
    const { data: afterPredictions, error: afterError } = await supabase.functions.invoke(
      'intelligence-engine',
      {
        body: { action: 'predictions', property_id: homeId }
      }
    );
    
    if (afterError) {
      console.error('Failed to fetch after predictions:', afterError);
      throw afterError;
    }
    
    if (!afterPredictions?.systems) {
      throw new Error('No systems data in after predictions');
    }
    
    // Step 4: Find the relevant system
    const afterSnapshot = afterPredictions.systems.find(
      (s: any) => s.system === systemType
    );
    
    if (!afterSnapshot) {
      console.warn(`System ${systemType} not found in predictions`);
      return;
    }
    
    // Step 5: Calculate delta
    const delta: InternalRiskDelta = {
      score: afterSnapshot.score - beforeSnapshot.score,
      failureProbability12mo: 
        beforeSnapshot.failureProbability12mo !== undefined && 
        afterSnapshot.survival?.failureProbability12mo !== undefined
          ? beforeSnapshot.failureProbability12mo - afterSnapshot.survival.failureProbability12mo
          : null,
      monthsAdded:
        beforeSnapshot.monthsRemaining !== undefined && 
        afterSnapshot.survival?.monthsRemaining?.p50 !== undefined
          ? afterSnapshot.survival.monthsRemaining.p50 - beforeSnapshot.monthsRemaining
          : null,
      statusChange: 
        beforeSnapshot.status !== afterSnapshot.status
          ? { from: beforeSnapshot.status, to: afterSnapshot.status }
          : null
    };
    
    console.log('Risk delta calculated:', delta);
    
    // Step 6: Update event with delta using RPC function (fixes SQL syntax error)
    const { error: updateError } = await supabase.rpc('append_event_metadata', {
      p_home_id: homeId,
      p_system_type: systemType as any,
      p_new_data: JSON.parse(JSON.stringify({
        risk_delta: delta,
        after_snapshot: {
          score: afterSnapshot.score,
          failureProbability12mo: afterSnapshot.survival?.failureProbability12mo,
          monthsRemaining: afterSnapshot.survival?.monthsRemaining?.p50,
          status: afterSnapshot.status
        },
        delta_calculated_at: new Date().toISOString(),
        prediction_refresh_duration_ms: Date.now() - startTime.getTime()
      }))
    });

    if (updateError) {
      console.error('Failed to update event metadata:', updateError);
      throw updateError;
    }

    console.log(`Risk delta successfully captured for task ${taskId}`);
  } catch (error) {
    console.error('Risk delta capture failed:', error);
    
    // Log failure - just console for now, events table has strict types
    try {
      console.error('Delta capture failed for task:', taskId, 'system:', systemType, 'error:', error);
    } catch (logError) {
      console.error('Failed to log delta capture failure:', logError);
    }
    
    // Don't re-throw - task completion should still succeed
  }
}

/**
 * Fetch the most recent risk delta for a system
 */
export async function getLatestRiskDelta(
  homeId: string,
  systemType: string
): Promise<{ before: BeforeSnapshot; after: any; delta: InternalRiskDelta } | null> {
  try {
    const { data, error } = await supabase
      .from('habitta_system_events')
      .select('metadata')
      .eq('home_id', homeId)
      .eq('system_type', systemType as any)
      .eq('event_type', 'maintenance_completed' as any)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const metadata = data[0].metadata as any;
    if (!metadata?.risk_delta) return null;
    return {
      before: metadata.before_snapshot,
      after: metadata.after_snapshot,
      delta: metadata.risk_delta
    };
  } catch (err) {
    console.error('Failed to fetch latest risk delta:', err);
    return null;
  }
}
