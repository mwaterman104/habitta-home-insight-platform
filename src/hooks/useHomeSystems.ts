import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface SystemCatalog {
  key: string;
  display_name: string;
  typical_lifespan_years: number;
  cost_low: number;
  cost_high: number;
  risk_weights: Record<string, number>;
  maintenance_checks: string[];
}

/**
 * HomeSystem — canonical fields match the `systems` table.
 * Legacy aliases (system_key, manufacture_year, data_sources, confidence_scores)
 * are populated for backwards compatibility with existing consumers.
 */
export interface HomeSystem {
  id: string;
  home_id: string;
  // Canonical fields (systems table)
  kind: string;
  install_year?: number;
  install_source?: string;
  material?: string;
  // Legacy aliases — kept for backwards compatibility
  system_key: string;         // = kind
  manufacture_year?: number;  // = install_year
  data_sources?: string[];    // = [install_source]
  confidence_scores?: Record<string, number>; // = { overall: confidence_score }
  // Shared fields
  brand?: string;
  model?: string;
  serial?: string;
  install_date?: string;
  fuel_type?: string;
  location_detail?: string;
  confidence_score?: number;
  field_provenance?: Json;
  last_updated_at?: string;
  notes?: string;
  status?: string;
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

      // Fetch from canonical systems table (used by all edge functions)
      const { data: systemsData, error: systemsError } = await supabase
        .from("systems")
        .select("*")
        .eq("home_id", homeId)
        .order("kind");

      if (systemsError) throw systemsError;

      const transformedCatalog = (catalogData || []).map(item => ({
        key: item.key,
        display_name: item.display_name,
        typical_lifespan_years: item.typical_lifespan_years,
        cost_low: item.cost_low || 0,
        cost_high: item.cost_high || 0,
        risk_weights: (item.risk_weights as Record<string, number>) || {},
        maintenance_checks: Array.isArray(item.maintenance_checks)
          ? item.maintenance_checks as string[]
          : [],
      }));

      const transformedSystems = (systemsData || []).map(item => ({
        id: item.id,
        home_id: item.home_id,
        // Canonical fields
        kind: item.kind,
        install_year: item.install_year || undefined,
        install_source: item.install_source || undefined,
        material: item.material || undefined,
        // Legacy aliases for backwards compatibility
        system_key: item.kind,
        manufacture_year: item.install_year || undefined,
        data_sources: item.install_source ? [item.install_source] : [],
        confidence_scores: { overall: item.confidence_score || 0 },
        // Shared fields
        brand: item.brand || undefined,
        model: item.model || undefined,
        serial: item.serial || undefined,
        install_date: item.install_date || undefined,
        fuel_type: item.fuel_type || undefined,
        location_detail: item.location_detail || undefined,
        confidence_score: item.confidence_score || undefined,
        field_provenance: (item.field_provenance as Json) || undefined,
        last_updated_at: item.last_updated_at || undefined,
        notes: item.notes || undefined,
        status: item.status || 'ACTIVE',
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
      const kind = systemData.kind || systemData.system_key || 'unknown';
      const installYear = systemData.install_year ?? systemData.manufacture_year;
      const installSource = systemData.install_source
        ?? (systemData.data_sources?.[0])
        ?? 'user';

      // Get user_id from homes table (required by systems table)
      const { data: home } = await supabase
        .from('homes')
        .select('user_id')
        .eq('id', homeId)
        .single();

      const { data, error } = await supabase
        .from("systems")
        .insert({
          home_id: homeId,
          user_id: home?.user_id,
          kind,
          brand: systemData.brand,
          model: systemData.model,
          serial: systemData.serial,
          install_date: systemData.install_date,
          install_year: installYear,
          install_source: installSource,
          fuel_type: systemData.fuel_type,
          location_detail: systemData.location_detail,
          confidence_score: systemData.confidence_score || 0.5,
          notes: systemData.notes,
          status: systemData.status || "ACTIVE",
        })
        .select()
        .single();

      if (error) throw error;

      const newSystem: HomeSystem = {
        id: data.id,
        home_id: data.home_id,
        kind: data.kind,
        system_key: data.kind,
        install_year: data.install_year || undefined,
        manufacture_year: data.install_year || undefined,
        install_source: data.install_source || undefined,
        data_sources: data.install_source ? [data.install_source] : [],
        confidence_scores: { overall: data.confidence_score || 0 },
        brand: data.brand || undefined,
        model: data.model || undefined,
        serial: data.serial || undefined,
        install_date: data.install_date || undefined,
        fuel_type: data.fuel_type || undefined,
        location_detail: data.location_detail || undefined,
        confidence_score: data.confidence_score || undefined,
        notes: data.notes || undefined,
        status: data.status || "ACTIVE",
      };

      setSystems(prev => [...prev, newSystem]);
      return data;
    } catch (err) {
      console.error("Error adding system:", err);
      throw err;
    }
  };

  const analyzePhoto = async (photo: File | null, photoUrl?: string): Promise<any> => {
    try {
      // If we have a URL (from QR transfer), use JSON body
      if (photoUrl && !photo) {
        console.log('Analyzing photo from URL:', photoUrl.substring(0, 50) + '...');

        // Use fetch directly to ensure proper Content-Type header
        const response = await fetch(
          `https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/analyze-device-photo`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY3N1b3VieHloamh4Y2dycWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTQ1MTAsImV4cCI6MjA2NzQ5MDUxMH0.cJbuzANuv6IVQHPAl6UvLJ8SYMw4zFlrE1R2xq9yyjs',
            },
            body: JSON.stringify({ image_url: photoUrl }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Analysis failed:', response.status, errorText);
          throw new Error(`Analysis failed: ${response.status}`);
        }

        return await response.json();
      }

      // Otherwise use FormData for file upload
      if (!photo) throw new Error('No photo provided');

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
      // Map legacy field names to canonical systems table columns
      const canonicalUpdates: Record<string, unknown> = {};
      if (updates.kind !== undefined) canonicalUpdates.kind = updates.kind;
      else if (updates.system_key !== undefined) canonicalUpdates.kind = updates.system_key;
      if (updates.install_year !== undefined) canonicalUpdates.install_year = updates.install_year;
      else if (updates.manufacture_year !== undefined) canonicalUpdates.install_year = updates.manufacture_year;
      if (updates.install_source !== undefined) canonicalUpdates.install_source = updates.install_source;
      if (updates.brand !== undefined) canonicalUpdates.brand = updates.brand;
      if (updates.model !== undefined) canonicalUpdates.model = updates.model;
      if (updates.serial !== undefined) canonicalUpdates.serial = updates.serial;
      if (updates.install_date !== undefined) canonicalUpdates.install_date = updates.install_date;
      if (updates.fuel_type !== undefined) canonicalUpdates.fuel_type = updates.fuel_type;
      if (updates.location_detail !== undefined) canonicalUpdates.location_detail = updates.location_detail;
      if (updates.confidence_score !== undefined) canonicalUpdates.confidence_score = updates.confidence_score;
      if (updates.notes !== undefined) canonicalUpdates.notes = updates.notes;
      if (updates.status !== undefined) canonicalUpdates.status = updates.status;
      if (updates.field_provenance !== undefined) canonicalUpdates.field_provenance = updates.field_provenance;

      const { data, error } = await supabase
        .from("systems")
        .update(canonicalUpdates)
        .eq("id", systemId)
        .select()
        .single();

      if (error) throw error;

      setSystems(prev => prev.map(s => {
        if (s.id !== systemId) return s;
        const newKind = (updates.kind || updates.system_key || s.kind);
        const newInstallYear = (updates.install_year ?? updates.manufacture_year ?? s.install_year);
        const newInstallSource = updates.install_source ?? s.install_source;
        const newConfidenceScore = updates.confidence_score ?? s.confidence_score;
        return {
          ...s,
          ...updates,
          kind: newKind,
          system_key: newKind,
          install_year: newInstallYear,
          manufacture_year: newInstallYear,
          install_source: newInstallSource,
          data_sources: newInstallSource ? [newInstallSource] : s.data_sources,
          confidence_score: newConfidenceScore,
          confidence_scores: newConfidenceScore
            ? { overall: newConfidenceScore }
            : s.confidence_scores,
        };
      }));
      return data;
    } catch (err) {
      console.error("Error updating system:", err);
      throw err;
    }
  };

  const deleteSystem = async (systemId: string) => {
    try {
      const { error } = await supabase
        .from("systems")
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
    refetch: fetchSystems,
  };
}
