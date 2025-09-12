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
  serial?: string;
  install_date?: string;
  last_service_date?: string;
  manufacture_year?: number;
  manufacture_date?: string;
  purchase_date?: string;
  capacity_rating?: string;
  fuel_type?: string;
  location_detail?: string;
  confidence_scores?: Record<string, number>;
  data_sources?: string[];
  status?: string;
  images?: string[];
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
        serial: item.serial || undefined,
        install_date: item.install_date || undefined,
        last_service_date: item.last_service_date || undefined,
        manufacture_year: item.manufacture_year || undefined,
        manufacture_date: item.manufacture_date || undefined,
        purchase_date: item.purchase_date || undefined,
        capacity_rating: item.capacity_rating || undefined,
        fuel_type: item.fuel_type || undefined,
        location_detail: item.location_detail || undefined,
        confidence_scores: (item.confidence_scores as Record<string, number>) || {},
        data_sources: (item.data_sources as string[]) || [],
        status: item.status || 'active',
        images: (item.images as string[]) || [],
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
          serial: systemData.serial,
          install_date: systemData.install_date,
          last_service_date: systemData.last_service_date,
          manufacture_year: systemData.manufacture_year,
          manufacture_date: systemData.manufacture_date,
          purchase_date: systemData.purchase_date,
          capacity_rating: systemData.capacity_rating,
          fuel_type: systemData.fuel_type,
          location_detail: systemData.location_detail,
          confidence_scores: systemData.confidence_scores || {},
          data_sources: systemData.data_sources || ["manual"],
          status: systemData.status || "active",
          images: systemData.images || [],
          expected_lifespan_years: systemData.expected_lifespan_years,
          notes: systemData.notes,
          source: { method: "manual" }
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newSystem: HomeSystem = {
        id: data.id,
        home_id: data.home_id,
        system_key: data.system_key,
        brand: data.brand || undefined,
        model: data.model || undefined,
        serial: data.serial || undefined,
        install_date: data.install_date || undefined,
        last_service_date: data.last_service_date || undefined,
        manufacture_year: data.manufacture_year || undefined,
        manufacture_date: data.manufacture_date || undefined,
        purchase_date: data.purchase_date || undefined,
        capacity_rating: data.capacity_rating || undefined,
        fuel_type: data.fuel_type || undefined,
        location_detail: data.location_detail || undefined,
        confidence_scores: (data.confidence_scores as Record<string, number>) || {},
        data_sources: (data.data_sources as string[]) || ["manual"],
        status: data.status || "active",
        images: (data.images as string[]) || [],
        expected_lifespan_years: data.expected_lifespan_years || undefined,
        notes: data.notes || undefined,
        source: (data.source as Record<string, any>) || undefined
      };
      
      setSystems(prev => [...prev, newSystem]);
      return data;
    } catch (err) {
      console.error("Error adding system:", err);
      throw err;
    }
  };

  const analyzePhoto = async (photo: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('image', photo);

      const { data, error } = await supabase.functions.invoke('analyze-device-photo', {
        body: formData
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error analyzing photo:', error);
      throw error;
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
        ...s,
        ...updates,
        confidence_scores: (updates.confidence_scores as Record<string, number>) || s.confidence_scores,
        data_sources: (updates.data_sources as string[]) || s.data_sources,
        images: (updates.images as string[]) || s.images
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