import { supabase } from "@/integrations/supabase/client";

export async function fetchHomesageReport(address: string, zipcode?: string, fresh = false) {
  const { data, error } = await supabase.functions.invoke("homesage-full-report", { 
    body: { address, zipcode, fresh } 
  });
  
  if (error) throw error;
  return data as any;
}