/**
 * Hook for fetching service provider options
 * 
 * Currently returns empty array (stub).
 * Future: Integrates with partner API.
 * 
 * CANONICAL DOCTRINE:
 * This is support, not shopping.
 */

import { useState, useCallback } from 'react';
import type { ProOption, ServiceOptionsContext } from '@/types/prosAndLogistics';
import { canShowServiceOptions } from '@/types/prosAndLogistics';

export function useServiceOptions(context: ServiceOptionsContext): {
  options: ProOption[];
  loading: boolean;
  canShow: boolean;
  requestOptions: () => void;
} {
  const [options] = useState<ProOption[]>([]);
  const [loading] = useState(false);
  
  const canShow = canShowServiceOptions(context);
  
  const requestOptions = useCallback(() => {
    // Stub: Would fetch from partner API
    console.log('Service options requested for:', context.systemKey);
  }, [context.systemKey]);
  
  return {
    options,
    loading,
    canShow,
    requestOptions,
  };
}
