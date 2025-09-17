import { supabase } from '@/integrations/supabase/client';

// Type definitions for validation cockpit
export interface PropertySample {
  address_id: string;
  street_address: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  apn?: string;
  lat?: number;
  lon?: number;
  source_list?: string;
  assigned_to?: string;
  status: 'pending' | 'enriched' | 'predicted' | 'labeled' | 'scored';
  created_at: string;
}

export interface EnrichmentSnapshot {
  snapshot_id: string;
  address_id: string;
  provider: 'estated' | 'attom' | 'shovels' | 'imagery' | 'smarty' | 'manual';
  payload: Record<string, any>;
  retrieved_at: string;
}

export interface Prediction {
  prediction_id: string;
  address_id: string;
  prediction_run_id: string;
  field: string;
  predicted_value: string;
  confidence_0_1: number;
  data_provenance?: Record<string, any>;
  model_version: string;
  predicted_at: string;
}

export interface Label {
  label_id: string;
  address_id: string;
  labeler: string;
  label_date: string;
  
  // Roof data
  roof_material?: string;
  roof_age_bucket?: string;
  roof_visible_damage?: boolean;
  roof_estimated_remaining_years?: number;
  
  // HVAC data
  hvac_present?: boolean;
  hvac_system_type?: string;
  hvac_age_bucket?: string;
  hvac_estimated_remaining_years?: number;
  
  // Water heater data
  water_heater_present?: boolean;
  water_heater_type?: string;
  water_heater_age_bucket?: string;
  
  // Other systems
  windows_age_bucket?: string;
  doors_age_bucket?: string;
  
  // Permits
  last_roof_permit_year?: number;
  last_hvac_permit_year?: number;
  last_water_heater_permit_year?: number;
  
  // Additional
  basement_or_crawlspace?: string;
  moisture_risk?: boolean;
  electrical_gfci_kitchen?: boolean;
  electrical_gfci_bath?: boolean;
  
  evidence_photo_urls?: string;
  labeler_confidence_0_1?: number;
  labeler_notes?: string;
  created_at: string;
}

export interface ScoredPrediction {
  address_id: string;
  field: string;
  predicted_value: string;
  actual_value?: string;
  match?: boolean;
  confidence_0_1: number;
  data_provenance?: Record<string, any>;
}

export interface AccuracyByField {
  field: string;
  accuracy: number;
}

// Data access functions
export class ValidationCockpitDB {
  // Properties Sample
  static async getPropertiesSample() {
    const { data, error } = await supabase
      .from('properties_sample')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as PropertySample[];
  }

  static async getPropertySample(addressId: string) {
    const { data, error } = await supabase
      .from('properties_sample')
      .select('*')
      .eq('address_id', addressId)
      .single();
    
    if (error) throw error;
    return data as PropertySample;
  }

  static async createPropertySample(property: Omit<PropertySample, 'address_id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('properties_sample')
      .insert(property)
      .select()
      .single();
    
    if (error) throw error;
    return data as PropertySample;
  }

  static async batchCreatePropertiesSample(properties: Omit<PropertySample, 'address_id' | 'created_at'>[]) {
    if (properties.length === 0) return [];

    const { data, error } = await supabase
      .from('properties_sample')
      .insert(properties)
      .select();

    if (error) throw error;
    return data as PropertySample[];
  }

  static async updatePropertySample(addressId: string, updates: Partial<PropertySample>) {
    const { data, error } = await supabase
      .from('properties_sample')
      .update(updates)
      .eq('address_id', addressId)
      .select()
      .single();
    
    if (error) throw error;
    return data as PropertySample;
  }

  // Enrichment Snapshots
  static async getEnrichmentSnapshots(addressId: string) {
    const { data, error } = await supabase
      .from('enrichment_snapshots')
      .select('*')
      .eq('address_id', addressId)
      .order('retrieved_at', { ascending: false });
    
    if (error) throw error;
    return data as EnrichmentSnapshot[];
  }

  static async createEnrichmentSnapshot(snapshot: Omit<EnrichmentSnapshot, 'snapshot_id' | 'retrieved_at'>) {
    const { data, error } = await supabase
      .from('enrichment_snapshots')
      .insert(snapshot)
      .select()
      .single();
    
    if (error) throw error;
    return data as EnrichmentSnapshot;
  }

  // Predictions
  static async getPredictions(addressId: string) {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('address_id', addressId)
      .order('predicted_at', { ascending: false });
    
    if (error) throw error;
    return data as Prediction[];
  }

  static async createPrediction(prediction: Omit<Prediction, 'prediction_id' | 'predicted_at'>) {
    const { data, error } = await supabase
      .from('predictions')
      .insert(prediction)
      .select()
      .single();
    
    if (error) throw error;
    return data as Prediction;
  }

  // Labels
  static async getLabel(addressId: string) {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('address_id', addressId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data as Label | null;
  }

  static async getLatestLabel(addressId: string): Promise<Label | null> {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('address_id', addressId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as Label | null;
  }

  static async createLabel(addressId: string, labelData: Omit<Label, 'label_id' | 'address_id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('labels')
      .insert({ 
        ...labelData, 
        address_id: addressId 
      })
      .select()
      .single();

    if (error) throw error;
    return data as Label;
  }

  // Scoring
  static async getScoredPredictions() {
    const { data, error } = await supabase
      .from('v_scored')
      .select('*');
    
    if (error) throw error;
    return data as ScoredPrediction[];
  }

  static async getAccuracyByField() {
    const { data, error } = await supabase
      .rpc('rpc_accuracy_by_field');
    
    if (error) throw error;
    return data as AccuracyByField[];
  }

  // Batch operations
  static async createMultiplePropertiesSample(properties: Omit<PropertySample, 'address_id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('properties_sample')
      .insert(properties)
      .select();
    
    if (error) throw error;
    return data as PropertySample[];
  }
}
