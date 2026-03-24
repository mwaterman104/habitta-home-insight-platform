import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MaintenanceImpact, RiskSnapshot, RiskDelta } from '@/types/riskDelta';

interface UseRiskDeltasOptions {
  homeId?: string;
  systemType?: string;
  taskIds?: string[];
  limit?: number;
  since?: Date;
}

interface RiskDeltaResponse {
  impacts: MaintenanceImpact[];
  total: number;
  oldestDate: string | null;
}

async function fetchRiskDeltas(options: UseRiskDeltasOptions): Promise<RiskDeltaResponse> {
  const { homeId, systemType, limit = 20, since } = options;
  
  if (!homeId) return { impacts: [], total: 0, oldestDate: null };

  let query = supabase
    .from('habitta_system_events')
    .select('id, system_type, metadata, created_at, home_id', { count: 'exact' })
    .eq('home_id', homeId)
    .eq('event_type', 'maintenance_completed' as any)
    .not('metadata->risk_delta', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (systemType) {
    query = query.eq('system_type', systemType as any);
  }

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }

  const { data, error, count } = await query;

  if (error) throw error;

  const impacts: MaintenanceImpact[] = (data || []).map(event => {
    const metadata = event.metadata as Record<string, unknown> | null;
    const riskDelta = metadata?.risk_delta as RiskDelta | undefined;
    const beforeSnapshot = metadata?.before_snapshot as RiskSnapshot | undefined;
    const afterSnapshot = metadata?.after_snapshot as RiskSnapshot | undefined;
    
    return {
      taskId: (metadata?.task_id as string) || event.id,
      homeId: event.home_id || homeId,
      systemType: event.system_type,
      completedAt: event.created_at || new Date().toISOString(),
      before: beforeSnapshot || { score: 0, failureProbability12mo: null, monthsRemaining: null, status: 'attention' as const },
      after: afterSnapshot || { score: 0, failureProbability12mo: null, monthsRemaining: null, status: 'attention' as const },
      delta: riskDelta || { scoreChange: 0, failureProbReduction: null, monthsAdded: null, statusChange: null },
      calculationDurationMs: (metadata?.prediction_refresh_duration_ms as number) || 0,
      calculationStatus: (metadata?.calculation_status as MaintenanceImpact['calculationStatus']) || 'success',
    };
  });

  return {
    impacts,
    total: count || 0,
    oldestDate: impacts.length > 0 ? impacts[impacts.length - 1].completedAt : null,
  };
}

export function useRiskDeltas(options: UseRiskDeltasOptions) {
  return useQuery({
    queryKey: ['risk-deltas', options.homeId, options.systemType, options.limit],
    queryFn: () => fetchRiskDeltas(options),
    enabled: !!options.homeId,
    staleTime: 5 * 60 * 1000,        // 5 minutes - data doesn't change frequently
    gcTime: 10 * 60 * 1000,          // 10 minutes in cache after unmount
    refetchOnWindowFocus: false,      // No auto-refetch on focus
    refetchOnMount: true,             // Check for new deltas on mount
    refetchInterval: false,           // No polling
    retry: 2,                         // Retry failed requests twice
  });
}

// Hook to get a task ID → impact map for efficient lookups
export function useRiskDeltaMap(homeId?: string) {
  const { data, ...rest } = useRiskDeltas({ homeId, limit: 50 });
  
  const deltaMap = new Map<string, MaintenanceImpact>();
  data?.impacts.forEach(impact => {
    deltaMap.set(impact.taskId, impact);
  });
  
  return { deltaMap, ...rest };
}

// Hook for invalidating risk delta cache after new completion
export function useInvalidateRiskDeltas() {
  const queryClient = useQueryClient();
  
  return (homeId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: ['risk-deltas', homeId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['intelligence-predictions'] 
    });
  };
}
