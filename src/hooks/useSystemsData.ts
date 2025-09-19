import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemData {
  id: string;
  home_id: string;
  user_id: string;  
  kind: string;
  install_year?: number;
  confidence: number;
  status: string;
  material?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemsDataHook {
  systems: SystemData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSystemsData(homeId?: string): SystemsDataHook {
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystems = async () => {
    if (!homeId) {
      setSystems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: systemsError } = await supabase
        .from('systems')
        .select('*')
        .eq('home_id', homeId)
        .order('created_at', { ascending: false });

      if (systemsError) throw systemsError;

      setSystems(data || []);
    } catch (err: any) {
      console.error('Error fetching systems data:', err);
      setError(err.message || 'Failed to fetch systems data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystems();
  }, [homeId]);

  return {
    systems,
    loading,
    error,
    refetch: fetchSystems
  };
}