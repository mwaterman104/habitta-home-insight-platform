import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SystemCatalog {
  key: string;
  display_name: string;
  typical_lifespan_years: number;
  cost_low: number;
  cost_high: number;
  risk_weights: Record<string, number>;
  maintenance_checks: string[];
}

export interface HomeSystem {
  id: string;
  home_id: string;
  system_key: string;
  brand?: string;
  model?: string;
  install_date?: string;
  last_service_date?: string;
  expected_lifespan_years?: number;
  notes?: string;
  source?: Record<string, any>;
}

export function useHomeSystems(homeId?: string) {
  const [systems, setSystems] = useState<HomeSystem[]>([]);
  const [catalog, setCatalog] = useState<SystemCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystems = async () => {
    if (!homeId) return;
    
    try {
      setLoading(true);
      
      // Fetch system catalog
      const { data: catalogData, error: catalogError } = await supabase
        .from("system_catalog")
        .select("*")
        .order("display_name");
      
      if (catalogError) throw catalogError;
      
      // Fetch user's home systems
      const { data: systemsData, error: systemsError } = await supabase
        .from("home_systems")
        .select("*")
        .eq("home_id", homeId)
        .order("system_key");
      
      if (systemsError) throw systemsError;
      
      // Transform data to match our interfaces
      const transformedCatalog = (catalogData || []).map(item => ({
        key: item.key,
        display_name: item.display_name,
        typical_lifespan_years: item.typical_lifespan_years,
        cost_low: item.cost_low || 0,
        cost_high: item.cost_high || 0,
        risk_weights: (item.risk_weights as Record<string, number>) || {},
        maintenance_checks: Array.isArray(item.maintenance_checks) 
          ? item.maintenance_checks as string[]
          : []
      }));
      
      const transformedSystems = (systemsData || []).map(item => ({
        id: item.id,
        home_id: item.home_id,
        system_key: item.system_key,
        brand: item.brand || undefined,
        model: item.model || undefined,
        install_date: item.install_date || undefined,
        last_service_date: item.last_service_date || undefined,
        expected_lifespan_years: item.expected_lifespan_years || undefined,
        notes: item.notes || undefined,
        source: (item.source as Record<string, any>) || undefined
      }));
      
      setCatalog(transformedCatalog);
      setSystems(transformedSystems);
      setError(null);
    } catch (err) {
      console.error("Error fetching systems:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch systems");
    } finally {
      setLoading(false);
    }
  };

  const addSystem = async (systemData: Partial<HomeSystem>) => {
    if (!homeId) return;
    
    try {
      const { data, error } = await supabase
        .from("home_systems")
        .insert({
          home_id: homeId,
          system_key: systemData.system_key!,
          brand: systemData.brand,
          model: systemData.model,
          install_date: systemData.install_date,
          last_service_date: systemData.last_service_date,
          expected_lifespan_years: systemData.expected_lifespan_years,
          notes: systemData.notes,
          source: { method: "manual" }
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setSystems(prev => [...prev, {
        id: data.id,
        home_id: data.home_id,
        system_key: data.system_key,
        brand: data.brand || undefined,
        model: data.model || undefined,
        install_date: data.install_date || undefined,
        last_service_date: data.last_service_date || undefined,
        expected_lifespan_years: data.expected_lifespan_years || undefined,
        notes: data.notes || undefined,
        source: (data.source as Record<string, any>) || undefined
      }]);
      return data;
    } catch (err) {
      console.error("Error adding system:", err);
      throw err;
    }
  };

  const updateSystem = async (systemId: string, updates: Partial<HomeSystem>) => {
    try {
      const { data, error } = await supabase
        .from("home_systems")
        .update(updates)
        .eq("id", systemId)
        .select()
        .single();
      
      if (error) throw error;
      
      setSystems(prev => prev.map(s => s.id === systemId ? {
        id: data.id,
        home_id: data.home_id,
        system_key: data.system_key,
        brand: data.brand || undefined,
        model: data.model || undefined,
        install_date: data.install_date || undefined,
        last_service_date: data.last_service_date || undefined,
        expected_lifespan_years: data.expected_lifespan_years || undefined,
        notes: data.notes || undefined,
        source: (data.source as Record<string, any>) || undefined
      } : s));
      return data;
    } catch (err) {
      console.error("Error updating system:", err);
      throw err;
    }
  };

  const deleteSystem = async (systemId: string) => {
    try {
      const { error } = await supabase
        .from("home_systems")
        .delete()
        .eq("id", systemId);
      
      if (error) throw error;
      
      setSystems(prev => prev.filter(s => s.id !== systemId));
    } catch (err) {
      console.error("Error deleting system:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchSystems();
  }, [homeId]);

  return {
    systems,
    catalog,
    loading,
    error,
    addSystem,
    updateSystem,
    deleteSystem,
    analyzePhoto,
    refetch: fetchSystems
  };
}