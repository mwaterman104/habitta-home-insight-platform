import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AlertItem {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  system_type: string | null;
}

interface MaintenanceAlertsData {
  overdue: number;
  upcoming: number;
  highPriority: number;
  tasks: AlertItem[];
  chatMessage?: string;
}

interface UseMaintenanceAlertsReturn {
  alerts: AlertItem[];
  totalCount: number;
  loading: boolean;
}

export function useMaintenanceAlerts(homeId: string | undefined): UseMaintenanceAlertsReturn {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!homeId) return;

    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('maintenance-alerts', {
          body: { homeId, daysAhead: 7 },
        });

        if (error) {
          console.error('[useMaintenanceAlerts] Edge function error:', error);
          return;
        }

        const result = data as MaintenanceAlertsData;
        if (result) {
          setAlerts(result.tasks || []);
          setTotalCount((result.overdue || 0) + (result.upcoming || 0));
        }
      } catch (err) {
        console.error('[useMaintenanceAlerts] Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [homeId]);

  return { alerts, totalCount, loading };
}
