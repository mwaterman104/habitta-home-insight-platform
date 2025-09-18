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
  enrichment_status?: 'pending' | 'enriching' | 'completed' | 'failed';
  enrichment_started_at?: string;
  enrichment_completed_at?: string;
  enrichment_error?: string;
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
// Error tag interface
export interface ErrorTag {
  id: string;
  address_id: string;
  field: string;
  error_type: string;
  description: string | null;
  tagged_by: string;
  tagged_at: string;
  resolved: boolean;
  resolution_notes: string | null;
}

// Batch job interface  
export interface BatchJob {
  id: string;
  user_id: string;
  operation_type: 'enrich' | 'predict';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  total_properties: number;
  processed_properties: number;
  successful_properties: number;
  failed_properties: number;
  current_property_id: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  properties_list: string[];
}

// Confidence calibration interface
export interface ConfidenceCalibrationData {
  confidence_bucket: string;
  field: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  avg_confidence: number;
}

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
    // First create the property sample
    const { data, error } = await supabase
      .from('properties_sample')
      .insert({
        ...property,
        enrichment_status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;

    const createdProperty = data as PropertySample;

    // Auto-trigger enrichment in the background
    this.triggerAutoEnrichment(createdProperty.address_id).catch(error => {
      console.error('Auto-enrichment failed for property:', createdProperty.address_id, error);
      // Update status to failed but don't throw - property creation should still succeed
      supabase
        .from('properties_sample')
        .update({ 
          enrichment_status: 'failed',
          enrichment_error: error.message || 'Auto-enrichment failed'
        })
        .eq('address_id', createdProperty.address_id);
    });

    return createdProperty;
  }

  static async triggerAutoEnrichment(addressId: string): Promise<void> {
    try {
      console.log('Starting auto-enrichment for property:', addressId);
      
      // Update status to enriching
      await supabase
        .from('properties_sample')
        .update({ 
          enrichment_status: 'enriching',
          enrichment_started_at: new Date().toISOString(),
          enrichment_error: null
        })
        .eq('address_id', addressId);

      // Call the enrichment function
      const { data, error } = await supabase.functions.invoke('enrich-property', {
        body: { address_id: addressId }
      });

      if (error) {
        throw new Error(`Enrichment function error: ${error.message}`);
      }

      // Update status to completed
      await supabase
        .from('properties_sample')
        .update({ 
          enrichment_status: 'completed',
          enrichment_completed_at: new Date().toISOString(),
          status: 'enriched'
        })
        .eq('address_id', addressId);

      console.log('Auto-enrichment completed successfully for property:', addressId);
    } catch (error) {
      console.error('Auto-enrichment failed:', error);
      
      // Update status to failed with error details
      await supabase
        .from('properties_sample')
        .update({ 
          enrichment_status: 'failed',
          enrichment_error: error instanceof Error ? error.message : String(error)
        })
        .eq('address_id', addressId);

      throw error;
    }
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

  // Error tagging methods
  static async getErrorTags(addressId: string, field?: string): Promise<ErrorTag[]> {
    let query = supabase
      .from('error_tags')
      .select('*')
      .eq('address_id', addressId)
      .order('tagged_at', { ascending: false });
      
    if (field) {
      query = query.eq('field', field);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async createErrorTag(errorTag: Omit<ErrorTag, 'id' | 'tagged_at'>): Promise<ErrorTag> {
    const { data, error } = await supabase
      .from('error_tags')
      .insert(errorTag)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  // Confidence calibration methods
  static async getConfidenceCalibration(): Promise<ConfidenceCalibrationData[]> {
    const { data, error } = await supabase.rpc('rpc_confidence_calibration');
    if (error) throw error;
    return data || [];
  }

  // Batch operations
  static async createMultiplePropertiesSample(properties: Omit<PropertySample, 'address_id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('properties_sample')
      .insert(properties.map(p => ({ ...p, enrichment_status: 'pending' })))
      .select();
    
    if (error) throw error;

    const createdProperties = data as PropertySample[];

    // Auto-trigger enrichment for each property in background
    createdProperties.forEach(property => {
      this.triggerAutoEnrichment(property.address_id).catch(error => {
        console.error('Auto-enrichment failed for property:', property.address_id, error);
        supabase
          .from('properties_sample')
          .update({ 
            enrichment_status: 'failed',
            enrichment_error: error.message || 'Auto-enrichment failed'
          })
          .eq('address_id', property.address_id);
      });
    });

    return createdProperties;
  }

  // Manual enrichment retry method
  static async retryEnrichment(addressId: string): Promise<void> {
    await this.triggerAutoEnrichment(addressId);
  }

  // Reset methods for property cleanup
  static async clearLabels(addressId: string): Promise<void> {
    const { error } = await supabase
      .from('labels')
      .delete()
      .eq('address_id', addressId);
    
    if (error) throw error;
  }

  static async clearPredictions(addressId: string): Promise<void> {
    const { error } = await supabase
      .from('predictions')
      .delete()
      .eq('address_id', addressId);
    
    if (error) throw error;
  }

  static async clearEnrichmentData(addressId: string): Promise<void> {
    const { error } = await supabase
      .from('enrichment_snapshots')
      .delete()
      .eq('address_id', addressId);
    
    if (error) throw error;
  }

  static async clearErrorTags(addressId: string): Promise<void> {
    const { error } = await supabase
      .from('error_tags')
      .delete()
      .eq('address_id', addressId);
    
    if (error) throw error;
  }

  static async resetProperty(addressId: string, options: {
    clearLabels?: boolean;
    clearPredictions?: boolean;
    clearEnrichmentData?: boolean;
    clearErrorTags?: boolean;
  } = {}): Promise<void> {
    const {
      clearLabels = true,
      clearPredictions = true,
      clearEnrichmentData = false,
      clearErrorTags = true
    } = options;

    try {
      // Clear data based on options
      if (clearLabels) {
        await this.clearLabels(addressId);
      }
      
      if (clearPredictions) {
        await this.clearPredictions(addressId);
      }
      
      if (clearEnrichmentData) {
        await this.clearEnrichmentData(addressId);
      }

      if (clearErrorTags) {
        await this.clearErrorTags(addressId);
      }

      // Reset property status
      await this.updatePropertySample(addressId, { 
        status: 'pending',
        enrichment_status: clearEnrichmentData ? 'pending' : undefined,
        enrichment_error: clearEnrichmentData ? null : undefined
      });

    } catch (error) {
      console.error('Error resetting property:', error);
      throw error;
    }
  }

  // Delete properties
  static async deletePropertySample(addressId: string) {
    try {
      // Delete the property and all associated data
      const { error } = await supabase
        .from('properties_sample')
        .delete()
        .eq('address_id', addressId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  }

  static async deleteMultipleProperties(addressIds: string[]) {
    try {
      const { error } = await supabase
        .from('properties_sample')
        .delete()
        .in('address_id', addressIds);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting multiple properties:', error);
      throw error;
    }
  }
}
