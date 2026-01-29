/**
 * INTERVENTION ELIGIBILITY HOOK
 * 
 * Determines if a system is eligible for a new intervention
 * based on score threshold, cooldown periods, and active sessions.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  calculateInterventionEligibility, 
  type InterventionEligibilityResult 
} from '@/services/interventionScoring';
import type { RiskContext } from '@/types/riskContext';
import { getDefaultRiskContext } from '@/types/riskContext';

interface SystemForEligibility {
  id: string;
  system_key: string;
  risk_outlook_12mo?: number;
  estimated_impact_cost?: {
    proactive?: number;
    emergency?: number;
    potential_damage?: number;
  };
}

interface HomeForEligibility {
  id: string;
  intervention_threshold?: number;
  state?: string;
}

interface EligibilityCheckResult extends InterventionEligibilityResult {
  systemId: string;
  hasActiveCooldown: boolean;
  hasActiveIntervention: boolean;
  cooldownUntil?: string;
}

/**
 * Check if a system has an active cooldown
 */
async function checkCooldown(systemId: string): Promise<{ hasCooldown: boolean; until?: string }> {
  const { data } = await supabase
    .from('interventions')
    .select('cooldown_until')
    .eq('system_id', systemId)
    .not('cooldown_until', 'is', null)
    .gt('cooldown_until', new Date().toISOString())
    .order('cooldown_until', { ascending: false })
    .limit(1)
    .single();

  if (data?.cooldown_until) {
    return { hasCooldown: true, until: data.cooldown_until };
  }

  return { hasCooldown: false };
}

/**
 * Check if a system has an active (open) intervention
 */
async function checkActiveIntervention(systemId: string): Promise<boolean> {
  const { count } = await supabase
    .from('interventions')
    .select('id', { count: 'exact', head: true })
    .eq('system_id', systemId)
    .is('closed_at', null);

  return (count ?? 0) > 0;
}

/**
 * Load risk context for a location
 */
async function loadRiskContext(state: string): Promise<RiskContext> {
  const today = new Date().toISOString().split('T')[0];

  // Try to find a risk context for this state
  const { data } = await supabase
    .from('risk_contexts')
    .select('*')
    .eq('state', state)
    .lte('valid_from', today)
    .gte('valid_until', today)
    .limit(1)
    .maybeSingle();

  if (data) {
    return {
      hurricaneSeason: data.hurricane_season,
      freezeWarning: data.freeze_warning,
      heatWave: data.heat_wave,
      currentDate: new Date(),
      location: { state: data.state, climateZone: data.climate_zone },
      peakSeasonHvac: data.peak_season_hvac,
      peakSeasonRoofing: data.peak_season_roofing,
    };
  }

  return getDefaultRiskContext(state, '');
}

/**
 * Check intervention eligibility for a single system
 */
export async function checkInterventionEligibility(
  system: SystemForEligibility,
  home: HomeForEligibility
): Promise<EligibilityCheckResult> {
  // Get costs with defaults
  const costs = system.estimated_impact_cost ?? {};
  const proactiveCost = costs.proactive ?? 5000;
  const emergencyCost = costs.emergency ?? 8000;
  const potentialDamage = costs.potential_damage ?? 2000;
  const riskOutlook = system.risk_outlook_12mo ?? 50;
  const homeThreshold = home.intervention_threshold ?? 1000;

  // Load risk context
  const riskContext = await loadRiskContext(home.state ?? '');

  // Calculate eligibility
  const eligibility = calculateInterventionEligibility(
    riskOutlook,
    emergencyCost,
    proactiveCost,
    potentialDamage,
    system.system_key,
    riskContext,
    homeThreshold
  );

  // Check cooldown
  const { hasCooldown, until: cooldownUntil } = await checkCooldown(system.id);

  // Check for active intervention
  const hasActiveIntervention = await checkActiveIntervention(system.id);

  // Final eligibility: must pass score AND not be in cooldown AND no active intervention
  const finalEligible = eligibility.eligible && !hasCooldown && !hasActiveIntervention;

  return {
    ...eligibility,
    eligible: finalEligible,
    systemId: system.id,
    hasActiveCooldown: hasCooldown,
    hasActiveIntervention,
    cooldownUntil,
  };
}

/**
 * Hook to check eligibility for all systems in a home
 */
export function useInterventionEligibility(homeId?: string) {
  const [eligibleSystems, setEligibleSystems] = useState<EligibilityCheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAllSystems = useCallback(async () => {
    if (!homeId) {
      setEligibleSystems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load home data
      const { data: home, error: homeError } = await supabase
        .from('homes')
        .select('id, intervention_threshold, state')
        .eq('id', homeId)
        .single();

      if (homeError || !home) {
        throw new Error('Home not found');
      }

      // Load systems
      const { data: systems, error: systemsError } = await supabase
        .from('home_systems')
        .select('id, system_key, risk_outlook_12mo, estimated_impact_cost')
        .eq('home_id', homeId);

      if (systemsError) {
        throw new Error(systemsError.message);
      }

      // Check eligibility for each system
      const results: EligibilityCheckResult[] = [];
      for (const system of systems ?? []) {
        // Parse estimated_impact_cost from JSONB
        const parsedSystem: SystemForEligibility = {
          id: system.id,
          system_key: system.system_key,
          risk_outlook_12mo: system.risk_outlook_12mo ?? undefined,
          estimated_impact_cost: typeof system.estimated_impact_cost === 'object' && system.estimated_impact_cost !== null
            ? system.estimated_impact_cost as { proactive?: number; emergency?: number; potential_damage?: number }
            : undefined,
        };
        const result = await checkInterventionEligibility(parsedSystem, home);
        results.push(result);
      }

      setEligibleSystems(results);
    } catch (err) {
      console.error('Failed to check intervention eligibility:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => {
    checkAllSystems();
  }, [checkAllSystems]);

  return {
    eligibleSystems,
    hasEligibleInterventions: eligibleSystems.some(s => s.eligible),
    loading,
    error,
    refresh: checkAllSystems,
  };
}

/**
 * Get systems that are eligible for intervention
 */
export function useEligibleInterventions(homeId?: string) {
  const { eligibleSystems, loading, error, refresh } = useInterventionEligibility(homeId);

  return {
    eligibleSystems: eligibleSystems.filter(s => s.eligible),
    loading,
    error,
    refresh,
  };
}
