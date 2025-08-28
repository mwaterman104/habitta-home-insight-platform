import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUpcomingTasks(homeId?: string, days: 30 | 60 | 90 = 30, refreshKey: number = 0) {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!homeId) return;
    
    let cancel = false;
    setLoading(true);
    
    (async () => {
      const now = new Date();
      const end = new Date();
      end.setDate(now.getDate() + days);
      
      const { data: rows } = await supabase
        .from("maintenance_tasks")
        .select("*")
        .eq("home_id", homeId)
        .in("status", ["pending", "in_progress"]) // upcoming, not completed
        .gte("due_date", now.toISOString().slice(0, 10))
        .lte("due_date", end.toISOString().slice(0, 10))
        .order("due_date", { ascending: true });
      
      if (!cancel) {
        setData(rows || []);
        setLoading(false);
      }
    })();
    
    return () => {
      cancel = true;
    };
  }, [homeId, days, refreshKey]);
  
  return { data, loading };
}