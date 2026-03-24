import { supabase } from "@/integrations/supabase/client";

export async function generateSeasonalPlan(homeId: string, months = 12, force = false) {
  const { data, error } = await supabase.functions.invoke("seed-maintenance-plan", { 
    body: { homeId, months, force } 
  });
  
  if (error) throw error;
  return data as { ok: boolean; inserted: number; considered: number };
}