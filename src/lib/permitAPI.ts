import { supabase } from "@/integrations/supabase/client";

export interface Permit {
  id: string;
  permit_number?: string;
  permit_type?: string;
  work_class?: string;
  description?: string;
  status?: string;
  date_issued?: string;
  date_finaled?: string;
  valuation?: number;
  contractor_name?: string;
  contractor_license?: string;
  jurisdiction?: string;
  source_url?: string;
  is_energy_related: boolean;
  system_tags: string[];
  source: string;
  raw: any;
  created_at: string;
  updated_at: string;
}

export interface CodeViolation {
  id: string;
  violation_number?: string;
  violation_type?: string;
  description?: string;
  status?: string;
  severity?: string;
  date_reported?: string;
  date_resolved?: string;
  jurisdiction?: string;
  source_url?: string;
  source: string;
  raw: any;
  created_at: string;
  updated_at: string;
}

export const getPermits = async (homeId: string): Promise<Permit[]> => {
  try {
    const { data, error } = await supabase
      .from('permits')
      .select('*')
      .eq('home_id', homeId)
      .order('date_issued', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching permits:', error);
    throw new Error('Failed to fetch permits');
  }
};

export const getCodeViolations = async (homeId: string): Promise<CodeViolation[]> => {
  try {
    const { data, error } = await supabase
      .from('code_violations')
      .select('*')
      .eq('home_id', homeId)
      .order('date_reported', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching code violations:', error);
    throw new Error('Failed to fetch code violations');
  }
};

export const syncPermitsData = async (address: string, homeId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await supabase.functions.invoke('shovels-permits', {
      body: { address, homeId }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  } catch (error) {
    console.error('Error syncing permits data:', error);
    throw new Error('Failed to sync permits data');
  }
};