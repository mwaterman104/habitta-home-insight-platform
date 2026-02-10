export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      address_geocode: {
        Row: {
          address_id: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          precision: string | null
          raw: Json | null
        }
        Insert: {
          address_id?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          precision?: string | null
          raw?: Json | null
        }
        Update: {
          address_id?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          precision?: string | null
          raw?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "address_geocode_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          canonical_hash: string | null
          carrier_route: string | null
          city: string
          congressional_district: string | null
          country: string
          created_at: string | null
          created_by: string | null
          dpv_match: string | null
          id: string
          line1: string
          line2: string | null
          postal_code: string
          raw: Json | null
          state: string
          updated_at: string | null
        }
        Insert: {
          canonical_hash?: string | null
          carrier_route?: string | null
          city: string
          congressional_district?: string | null
          country?: string
          created_at?: string | null
          created_by?: string | null
          dpv_match?: string | null
          id?: string
          line1: string
          line2?: string | null
          postal_code: string
          raw?: Json | null
          state: string
          updated_at?: string | null
        }
        Update: {
          canonical_hash?: string | null
          carrier_route?: string | null
          city?: string
          congressional_district?: string | null
          country?: string
          created_at?: string | null
          created_by?: string | null
          dpv_match?: string | null
          id?: string
          line1?: string
          line2?: string | null
          postal_code?: string
          raw?: Json | null
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      appliances: {
        Row: {
          age: number | null
          brand: string | null
          created_at: string | null
          health_score: number | null
          id: string
          model_number: string | null
          property_id: string | null
          serial_number: string
        }
        Insert: {
          age?: number | null
          brand?: string | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          model_number?: string | null
          property_id?: string | null
          serial_number: string
        }
        Update: {
          age?: number | null
          brand?: string | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          model_number?: string | null
          property_id?: string | null
          serial_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "appliances_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_property_id: string | null
          error_message: string | null
          failed_properties: number | null
          id: string
          operation_type: string
          processed_properties: number | null
          properties_list: Json
          started_at: string | null
          status: string
          successful_properties: number | null
          total_properties: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_property_id?: string | null
          error_message?: string | null
          failed_properties?: number | null
          id?: string
          operation_type: string
          processed_properties?: number | null
          properties_list: Json
          started_at?: string | null
          status?: string
          successful_properties?: number | null
          total_properties: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_property_id?: string | null
          error_message?: string | null
          failed_properties?: number | null
          id?: string
          operation_type?: string
          processed_properties?: number | null
          properties_list?: Json
          started_at?: string | null
          status?: string
          successful_properties?: number | null
          total_properties?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_factors: {
        Row: {
          climate_zone: string
          created_at: string
          description: string | null
          factor_type: string
          id: string
          multiplier: number
        }
        Insert: {
          climate_zone: string
          created_at?: string
          description?: string | null
          factor_type: string
          id?: string
          multiplier?: number
        }
        Update: {
          climate_zone?: string
          created_at?: string
          description?: string | null
          factor_type?: string
          id?: string
          multiplier?: number
        }
        Relationships: []
      }
      code_violations: {
        Row: {
          created_at: string
          date_reported: string | null
          date_resolved: string | null
          description: string | null
          hash: string | null
          home_id: string
          id: string
          jurisdiction: string | null
          raw: Json
          severity: string | null
          source: string
          source_url: string | null
          status: string | null
          updated_at: string
          user_id: string
          violation_number: string | null
          violation_type: string | null
        }
        Insert: {
          created_at?: string
          date_reported?: string | null
          date_resolved?: string | null
          description?: string | null
          hash?: string | null
          home_id: string
          id?: string
          jurisdiction?: string | null
          raw: Json
          severity?: string | null
          source?: string
          source_url?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          violation_number?: string | null
          violation_type?: string | null
        }
        Update: {
          created_at?: string
          date_reported?: string | null
          date_resolved?: string | null
          description?: string | null
          hash?: string | null
          home_id?: string
          id?: string
          jurisdiction?: string | null
          raw?: Json
          severity?: string | null
          source?: string
          source_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          violation_number?: string | null
          violation_type?: string | null
        }
        Relationships: []
      }
      contractor_projects: {
        Row: {
          actual_cost: number | null
          communication_rating: number | null
          completion_date: string | null
          contractor_id: string | null
          created_at: string | null
          estimated_cost: number | null
          id: string
          permit_obtained: boolean | null
          permit_required: boolean | null
          project_notes: string | null
          project_type: string
          property_id: string | null
          quality_rating: number | null
          start_date: string | null
          timeliness_rating: number | null
          warranty_length_months: number | null
          would_recommend: boolean | null
        }
        Insert: {
          actual_cost?: number | null
          communication_rating?: number | null
          completion_date?: string | null
          contractor_id?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          permit_obtained?: boolean | null
          permit_required?: boolean | null
          project_notes?: string | null
          project_type: string
          property_id?: string | null
          quality_rating?: number | null
          start_date?: string | null
          timeliness_rating?: number | null
          warranty_length_months?: number | null
          would_recommend?: boolean | null
        }
        Update: {
          actual_cost?: number | null
          communication_rating?: number | null
          completion_date?: string | null
          contractor_id?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          permit_obtained?: boolean | null
          permit_required?: boolean | null
          project_notes?: string | null
          project_type?: string
          property_id?: string | null
          quality_rating?: number | null
          start_date?: string | null
          timeliness_rating?: number | null
          warranty_length_months?: number | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_projects_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "local_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_models: {
        Row: {
          baseline_monthly_cost: number | null
          category_multipliers: Json | null
          created_at: string
          delay_scenarios: Json | null
          global_multiplier: number | null
          id: string
        }
        Insert: {
          baseline_monthly_cost?: number | null
          category_multipliers?: Json | null
          created_at?: string
          delay_scenarios?: Json | null
          global_multiplier?: number | null
          id?: string
        }
        Update: {
          baseline_monthly_cost?: number | null
          category_multipliers?: Json | null
          created_at?: string
          delay_scenarios?: Json | null
          global_multiplier?: number | null
          id?: string
        }
        Relationships: []
      }
      cost_predictions: {
        Row: {
          confidence_level: number | null
          cost_breakdown: Json | null
          created_at: string | null
          data_sources: string[] | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          id: string
          market_factors: Json | null
          prediction_type: string
          property_id: string | null
          roi_score: number | null
          system_lifecycle_id: string | null
          urgency_score: number | null
          valid_until: string | null
        }
        Insert: {
          confidence_level?: number | null
          cost_breakdown?: Json | null
          created_at?: string | null
          data_sources?: string[] | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          id?: string
          market_factors?: Json | null
          prediction_type: string
          property_id?: string | null
          roi_score?: number | null
          system_lifecycle_id?: string | null
          urgency_score?: number | null
          valid_until?: string | null
        }
        Update: {
          confidence_level?: number | null
          cost_breakdown?: Json | null
          created_at?: string | null
          data_sources?: string[] | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          id?: string
          market_factors?: Json | null
          prediction_type?: string
          property_id?: string | null
          roi_score?: number | null
          system_lifecycle_id?: string | null
          urgency_score?: number | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_predictions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_predictions_system_lifecycle_id_fkey"
            columns: ["system_lifecycle_id"]
            isOneToOne: false
            referencedRelation: "system_lifecycles"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_events: {
        Row: {
          assumptions_json: Json
          contractor_selected_id: string | null
          created_at: string | null
          decision_type: string
          defer_until: string | null
          home_id: string | null
          id: string
          intervention_id: string | null
          next_review_at: string | null
          system_id: string | null
          user_id: string | null
          user_notes: string | null
        }
        Insert: {
          assumptions_json: Json
          contractor_selected_id?: string | null
          created_at?: string | null
          decision_type: string
          defer_until?: string | null
          home_id?: string | null
          id?: string
          intervention_id?: string | null
          next_review_at?: string | null
          system_id?: string | null
          user_id?: string | null
          user_notes?: string | null
        }
        Update: {
          assumptions_json?: Json
          contractor_selected_id?: string | null
          created_at?: string | null
          decision_type?: string
          defer_until?: string | null
          home_id?: string | null
          id?: string
          intervention_id?: string | null
          next_review_at?: string | null
          system_id?: string | null
          user_id?: string | null
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_events_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_events_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "decision_events_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "home_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          ai_diagnosis: string | null
          created_at: string
          diy_instructions: Json | null
          diy_possible: boolean | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          home_id: string
          id: string
          issue_description: string | null
          photo_url: string
          pro_recommended: boolean | null
          severity: string | null
          user_id: string
        }
        Insert: {
          ai_diagnosis?: string | null
          created_at?: string
          diy_instructions?: Json | null
          diy_possible?: boolean | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          home_id: string
          id?: string
          issue_description?: string | null
          photo_url: string
          pro_recommended?: boolean | null
          severity?: string | null
          user_id: string
        }
        Update: {
          ai_diagnosis?: string | null
          created_at?: string
          diy_instructions?: Json | null
          diy_possible?: boolean | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          home_id?: string
          id?: string
          issue_description?: string | null
          photo_url?: string
          pro_recommended?: boolean | null
          severity?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      diy_guides: {
        Row: {
          created_at: string
          id: string
          match_keywords: string[] | null
          required_parts: string[] | null
          required_tools: string[] | null
          safety_precautions: string[] | null
          steps: string[] | null
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_keywords?: string[] | null
          required_parts?: string[] | null
          required_tools?: string[] | null
          safety_precautions?: string[] | null
          steps?: string[] | null
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_keywords?: string[] | null
          required_parts?: string[] | null
          required_tools?: string[] | null
          safety_precautions?: string[] | null
          steps?: string[] | null
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          expiry_date: string | null
          file_size: number | null
          file_url: string
          home_id: string
          id: string
          name: string
          notes: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          file_size?: number | null
          file_url: string
          home_id: string
          id?: string
          name: string
          notes?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          file_size?: number | null
          file_url?: string
          home_id?: string
          id?: string
          name?: string
          notes?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      energy_comparison: {
        Row: {
          created_at: string
          home_id: string | null
          id: string
          month_year: string
          neighborhood_avg: number
          user_id: string
          user_usage: number
        }
        Insert: {
          created_at?: string
          home_id?: string | null
          id?: string
          month_year: string
          neighborhood_avg: number
          user_id: string
          user_usage: number
        }
        Update: {
          created_at?: string
          home_id?: string | null
          id?: string
          month_year?: string
          neighborhood_avg?: number
          user_id?: string
          user_usage?: number
        }
        Relationships: [
          {
            foreignKeyName: "energy_comparison_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_comparison_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      enrichment_snapshots: {
        Row: {
          address_id: string | null
          payload: Json
          provider: string
          retrieved_at: string | null
          snapshot_id: string
        }
        Insert: {
          address_id?: string | null
          payload: Json
          provider: string
          retrieved_at?: string | null
          snapshot_id?: string
        }
        Update: {
          address_id?: string | null
          payload?: Json
          provider?: string
          retrieved_at?: string | null
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_snapshots_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "properties_sample"
            referencedColumns: ["address_id"]
          },
        ]
      }
      error_tags: {
        Row: {
          address_id: string
          description: string | null
          error_type: string
          field: string
          id: string
          resolution_notes: string | null
          resolved: boolean | null
          tagged_at: string
          tagged_by: string | null
        }
        Insert: {
          address_id: string
          description?: string | null
          error_type: string
          field: string
          id?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          tagged_at?: string
          tagged_by?: string | null
        }
        Update: {
          address_id?: string
          description?: string | null
          error_type?: string
          field?: string
          id?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          tagged_at?: string
          tagged_by?: string | null
        }
        Relationships: []
      }
      habitta_home_systems: {
        Row: {
          created_at: string
          current_age: number | null
          data_source: string | null
          estimated_replacement_cost: number
          evidence_sources: string[] | null
          expected_lifespan: number
          expected_lifespan_years: number
          has_evidence: boolean | null
          health_score: number | null
          id: string
          install_date: string
          instance_key: string | null
          last_maintenance: string | null
          location_hint: string | null
          name: string
          next_maintenance_date: string | null
          normalized_address: string | null
          priority: Database["public"]["Enums"]["habitta_priority_level"] | null
          property_address: string | null
          type: Database["public"]["Enums"]["habitta_system_type"]
          updated_at: string
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["habitta_verification_status"]
            | null
        }
        Insert: {
          created_at?: string
          current_age?: number | null
          data_source?: string | null
          estimated_replacement_cost?: number
          evidence_sources?: string[] | null
          expected_lifespan: number
          expected_lifespan_years?: number
          has_evidence?: boolean | null
          health_score?: number | null
          id?: string
          install_date: string
          instance_key?: string | null
          last_maintenance?: string | null
          location_hint?: string | null
          name: string
          next_maintenance_date?: string | null
          normalized_address?: string | null
          priority?:
            | Database["public"]["Enums"]["habitta_priority_level"]
            | null
          property_address?: string | null
          type: Database["public"]["Enums"]["habitta_system_type"]
          updated_at?: string
          user_id: string
          verification_status?:
            | Database["public"]["Enums"]["habitta_verification_status"]
            | null
        }
        Update: {
          created_at?: string
          current_age?: number | null
          data_source?: string | null
          estimated_replacement_cost?: number
          evidence_sources?: string[] | null
          expected_lifespan?: number
          expected_lifespan_years?: number
          has_evidence?: boolean | null
          health_score?: number | null
          id?: string
          install_date?: string
          instance_key?: string | null
          last_maintenance?: string | null
          location_hint?: string | null
          name?: string
          next_maintenance_date?: string | null
          normalized_address?: string | null
          priority?:
            | Database["public"]["Enums"]["habitta_priority_level"]
            | null
          property_address?: string | null
          type?: Database["public"]["Enums"]["habitta_system_type"]
          updated_at?: string
          user_id?: string
          verification_status?:
            | Database["public"]["Enums"]["habitta_verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "habitta_home_systems_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "habitta_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habitta_maintenance_intelligence: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_cost: number | null
          frequency_months: number | null
          id: string
          is_diy: boolean | null
          last_performed: string | null
          maintenance_type: string
          next_due: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          source: string | null
          system_type: Database["public"]["Enums"]["system_category"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          frequency_months?: number | null
          id?: string
          is_diy?: boolean | null
          last_performed?: string | null
          maintenance_type: string
          next_due?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          source?: string | null
          system_type: Database["public"]["Enums"]["system_category"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          frequency_months?: number | null
          id?: string
          is_diy?: boolean | null
          last_performed?: string | null
          maintenance_type?: string
          next_due?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          source?: string | null
          system_type?: Database["public"]["Enums"]["system_category"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habitta_maintenance_intelligence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "habitta_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habitta_maintenance_tasks: {
        Row: {
          anchor_date: string | null
          cadence_days: number | null
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string
          due_date: string
          estimated_cost: number
          estimated_time: string
          fingerprint: string | null
          id: string
          is_diy: boolean
          normalized_address: string | null
          priority: Database["public"]["Enums"]["habitta_priority_level"]
          property_address: string | null
          superseded_by: string | null
          system_id: string
          task_code: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_date?: string | null
          cadence_days?: number | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description: string
          due_date: string
          estimated_cost?: number
          estimated_time: string
          fingerprint?: string | null
          id?: string
          is_diy?: boolean
          normalized_address?: string | null
          priority?: Database["public"]["Enums"]["habitta_priority_level"]
          property_address?: string | null
          superseded_by?: string | null
          system_id: string
          task_code?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_date?: string | null
          cadence_days?: number | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string
          estimated_cost?: number
          estimated_time?: string
          fingerprint?: string | null
          id?: string
          is_diy?: boolean
          normalized_address?: string | null
          priority?: Database["public"]["Enums"]["habitta_priority_level"]
          property_address?: string | null
          superseded_by?: string | null
          system_id?: string
          task_code?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habitta_maintenance_tasks_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "habitta_maintenance_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habitta_maintenance_tasks_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "habitta_home_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habitta_maintenance_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "habitta_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habitta_permit_insights: {
        Row: {
          confidence: number | null
          created_at: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          lifecycle_impact: string | null
          maintenance_recommendations: Json | null
          metadata: Json | null
          permit_id: string
          processed_date: string | null
          system_type: Database["public"]["Enums"]["system_category"] | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          lifecycle_impact?: string | null
          maintenance_recommendations?: Json | null
          metadata?: Json | null
          permit_id: string
          processed_date?: string | null
          system_type?: Database["public"]["Enums"]["system_category"] | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          lifecycle_impact?: string | null
          maintenance_recommendations?: Json | null
          metadata?: Json | null
          permit_id?: string
          processed_date?: string | null
          system_type?: Database["public"]["Enums"]["system_category"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habitta_permit_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "habitta_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habitta_permits: {
        Row: {
          city: string | null
          contractor_license: string | null
          contractor_name: string | null
          created_at: string | null
          data_source: string
          description: string | null
          estimated_cost: number | null
          expiration_date: string | null
          final_inspection_date: string | null
          id: string
          issue_date: string | null
          last_fetched_at: string | null
          normalized_address: string | null
          permit_number: string
          permit_status: string | null
          permit_type: string
          property_address: string
          raw_data: Json | null
          related_system_id: string | null
          related_system_type: string | null
          state: string | null
          street_address: string | null
          updated_at: string | null
          user_id: string
          work_description: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          contractor_license?: string | null
          contractor_name?: string | null
          created_at?: string | null
          data_source?: string
          description?: string | null
          estimated_cost?: number | null
          expiration_date?: string | null
          final_inspection_date?: string | null
          id?: string
          issue_date?: string | null
          last_fetched_at?: string | null
          normalized_address?: string | null
          permit_number: string
          permit_status?: string | null
          permit_type: string
          property_address: string
          raw_data?: Json | null
          related_system_id?: string | null
          related_system_type?: string | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          user_id: string
          work_description?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          contractor_license?: string | null
          contractor_name?: string | null
          created_at?: string | null
          data_source?: string
          description?: string | null
          estimated_cost?: number | null
          expiration_date?: string | null
          final_inspection_date?: string | null
          id?: string
          issue_date?: string | null
          last_fetched_at?: string | null
          normalized_address?: string | null
          permit_number?: string
          permit_status?: string | null
          permit_type?: string
          property_address?: string
          raw_data?: Json | null
          related_system_id?: string | null
          related_system_type?: string | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          user_id?: string
          work_description?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habitta_permits_related_system_id_fkey"
            columns: ["related_system_id"]
            isOneToOne: false
            referencedRelation: "habitta_home_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      habitta_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          home_address: string | null
          home_type: string | null
          id: string
          normalized_address: string | null
          property_address: string | null
          square_footage: number | null
          updated_at: string
          year_built: number | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          home_address?: string | null
          home_type?: string | null
          id: string
          normalized_address?: string | null
          property_address?: string | null
          square_footage?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          home_address?: string | null
          home_type?: string | null
          id?: string
          normalized_address?: string | null
          property_address?: string | null
          square_footage?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Relationships: []
      }
      habitta_rec_instances: {
        Row: {
          created_at: string | null
          description: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          normalized_address: string | null
          placement: string
          priority_score: number
          property_address: string | null
          status: string
          system_id: string | null
          task_id: string | null
          template_key: string
          title: string
          trigger_context: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          normalized_address?: string | null
          placement: string
          priority_score: number
          property_address?: string | null
          status?: string
          system_id?: string | null
          task_id?: string | null
          template_key: string
          title: string
          trigger_context?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          normalized_address?: string | null
          placement?: string
          priority_score?: number
          property_address?: string | null
          status?: string
          system_id?: string | null
          task_id?: string | null
          template_key?: string
          title?: string
          trigger_context?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habitta_rec_instances_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "habitta_home_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habitta_rec_instances_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "habitta_maintenance_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      habitta_rec_templates: {
        Row: {
          action_type: string
          base_priority_score: number
          created_at: string | null
          description_template: string
          id: string
          placement_tags: string[]
          template_key: string
          title_template: string
          trigger_dsl: Json
          updated_at: string | null
        }
        Insert: {
          action_type: string
          base_priority_score?: number
          created_at?: string | null
          description_template: string
          id?: string
          placement_tags?: string[]
          template_key: string
          title_template: string
          trigger_dsl: Json
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          base_priority_score?: number
          created_at?: string | null
          description_template?: string
          id?: string
          placement_tags?: string[]
          template_key?: string
          title_template?: string
          trigger_dsl?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      habitta_system_events: {
        Row: {
          confidence: number | null
          contractor: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          home_id: string | null
          id: string
          is_canonical: boolean | null
          metadata: Json | null
          normalized_address: string | null
          source: Database["public"]["Enums"]["event_source"]
          source_id: string | null
          system_subtype: string | null
          system_type: Database["public"]["Enums"]["system_category"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          contractor?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          home_id?: string | null
          id?: string
          is_canonical?: boolean | null
          metadata?: Json | null
          normalized_address?: string | null
          source: Database["public"]["Enums"]["event_source"]
          source_id?: string | null
          system_subtype?: string | null
          system_type: Database["public"]["Enums"]["system_category"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          contractor?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          home_id?: string | null
          id?: string
          is_canonical?: boolean | null
          metadata?: Json | null
          normalized_address?: string | null
          source?: Database["public"]["Enums"]["event_source"]
          source_id?: string | null
          system_subtype?: string | null
          system_type?: Database["public"]["Enums"]["system_category"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habitta_system_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "habitta_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habitta_user_verifications: {
        Row: {
          confidence_boost: number | null
          created_at: string | null
          id: string
          question_asked: string
          response_date: string | null
          system_event_id: string | null
          user_id: string
          user_response: string
        }
        Insert: {
          confidence_boost?: number | null
          created_at?: string | null
          id?: string
          question_asked: string
          response_date?: string | null
          system_event_id?: string | null
          user_id: string
          user_response: string
        }
        Update: {
          confidence_boost?: number | null
          created_at?: string | null
          id?: string
          question_asked?: string
          response_date?: string | null
          system_event_id?: string | null
          user_id?: string
          user_response?: string
        }
        Relationships: [
          {
            foreignKeyName: "habitta_user_verifications_system_event_id_fkey"
            columns: ["system_event_id"]
            isOneToOne: false
            referencedRelation: "habitta_system_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habitta_user_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "habitta_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_assets: {
        Row: {
          category: string
          confidence: number
          created_at: string
          home_id: string
          id: string
          install_date: string | null
          kind: string
          manufacturer: string | null
          metadata: Json
          model: string | null
          notes: string | null
          removal_date: string | null
          serial: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          confidence?: number
          created_at?: string
          home_id: string
          id?: string
          install_date?: string | null
          kind: string
          manufacturer?: string | null
          metadata?: Json
          model?: string | null
          notes?: string | null
          removal_date?: string | null
          serial?: string | null
          source: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          home_id?: string
          id?: string
          install_date?: string | null
          kind?: string
          manufacturer?: string | null
          metadata?: Json
          model?: string | null
          notes?: string | null
          removal_date?: string | null
          serial?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_assets_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_assets_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      home_chat_sessions: {
        Row: {
          created_at: string
          home_id: string
          id: string
          message_count: number
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          home_id: string
          id?: string
          message_count?: number
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          home_id?: string
          id?: string
          message_count?: number
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_chat_sessions_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_chat_sessions_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      home_events: {
        Row: {
          asset_id: string | null
          cost_actual: number | null
          cost_estimated: Json | null
          created_at: string
          description: string | null
          event_type: string
          home_id: string
          id: string
          metadata: Json
          related_event_id: string | null
          severity: string
          source: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          cost_actual?: number | null
          cost_estimated?: Json | null
          created_at?: string
          description?: string | null
          event_type: string
          home_id: string
          id?: string
          metadata?: Json
          related_event_id?: string | null
          severity?: string
          source: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          cost_actual?: number | null
          cost_estimated?: Json | null
          created_at?: string
          description?: string | null
          event_type?: string
          home_id?: string
          id?: string
          metadata?: Json
          related_event_id?: string | null
          severity?: string
          source?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "home_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_events_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_events_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "home_events_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "home_events"
            referencedColumns: ["id"]
          },
        ]
      }
      home_interactions: {
        Row: {
          created_at: string | null
          home_id: string
          id: string
          interaction_type: string
          response_value: string | null
        }
        Insert: {
          created_at?: string | null
          home_id: string
          id?: string
          interaction_type: string
          response_value?: string | null
        }
        Update: {
          created_at?: string | null
          home_id?: string
          id?: string
          interaction_type?: string
          response_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_interactions_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_interactions_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      home_review_state: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          home_id: string
          home_state: string
          id: string
          last_annual_report: string | null
          last_monthly_check: string | null
          last_optional_advantage: string | null
          last_quarterly_review: string | null
          next_scheduled_review: string | null
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          home_id: string
          home_state?: string
          id?: string
          last_annual_report?: string | null
          last_monthly_check?: string | null
          last_optional_advantage?: string | null
          last_quarterly_review?: string | null
          next_scheduled_review?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          home_id?: string
          home_state?: string
          id?: string
          last_annual_report?: string | null
          last_monthly_check?: string | null
          last_optional_advantage?: string | null
          last_quarterly_review?: string | null
          next_scheduled_review?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_review_state_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: true
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_review_state_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: true
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      home_systems: {
        Row: {
          baseline_strength: number | null
          brand: string | null
          capacity_rating: string | null
          confidence_score: number | null
          confidence_scores: Json | null
          created_at: string | null
          data_sources: string[] | null
          estimated_impact_cost: Json | null
          expected_lifespan_years: number | null
          field_provenance: Json | null
          fuel_type: string | null
          home_id: string
          id: string
          images: Json | null
          install_date: string | null
          installation_verified: boolean | null
          intervention_score: number | null
          intervention_score_calculated_at: string | null
          last_decision_at: string | null
          last_decision_type: string | null
          last_service_date: string | null
          last_state_change: string | null
          last_state_change_at: string | null
          last_updated_at: string | null
          location_detail: string | null
          manufacture_date: string | null
          manufacture_year: number | null
          model: string | null
          notes: string | null
          purchase_date: string | null
          risk_outlook_12mo: number | null
          serial: string | null
          source: Json | null
          status: string | null
          system_key: string
          updated_at: string | null
        }
        Insert: {
          baseline_strength?: number | null
          brand?: string | null
          capacity_rating?: string | null
          confidence_score?: number | null
          confidence_scores?: Json | null
          created_at?: string | null
          data_sources?: string[] | null
          estimated_impact_cost?: Json | null
          expected_lifespan_years?: number | null
          field_provenance?: Json | null
          fuel_type?: string | null
          home_id: string
          id?: string
          images?: Json | null
          install_date?: string | null
          installation_verified?: boolean | null
          intervention_score?: number | null
          intervention_score_calculated_at?: string | null
          last_decision_at?: string | null
          last_decision_type?: string | null
          last_service_date?: string | null
          last_state_change?: string | null
          last_state_change_at?: string | null
          last_updated_at?: string | null
          location_detail?: string | null
          manufacture_date?: string | null
          manufacture_year?: number | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          risk_outlook_12mo?: number | null
          serial?: string | null
          source?: Json | null
          status?: string | null
          system_key: string
          updated_at?: string | null
        }
        Update: {
          baseline_strength?: number | null
          brand?: string | null
          capacity_rating?: string | null
          confidence_score?: number | null
          confidence_scores?: Json | null
          created_at?: string | null
          data_sources?: string[] | null
          estimated_impact_cost?: Json | null
          expected_lifespan_years?: number | null
          field_provenance?: Json | null
          fuel_type?: string | null
          home_id?: string
          id?: string
          images?: Json | null
          install_date?: string | null
          installation_verified?: boolean | null
          intervention_score?: number | null
          intervention_score_calculated_at?: string | null
          last_decision_at?: string | null
          last_decision_type?: string | null
          last_service_date?: string | null
          last_state_change?: string | null
          last_state_change_at?: string | null
          last_updated_at?: string | null
          location_detail?: string | null
          manufacture_date?: string | null
          manufacture_year?: number | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          risk_outlook_12mo?: number | null
          serial?: string | null
          source?: Json | null
          status?: string | null
          system_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_systems_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_systems_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      homes: {
        Row: {
          address: string
          address_id: string | null
          arch_style: string | null
          bathrooms: number | null
          bedrooms: number | null
          build_quality: string | null
          city: string
          confidence: number | null
          created_at: string
          data_match_confidence: string | null
          fips_code: string | null
          folio: string | null
          folio_source: string | null
          geo_source: string | null
          geo_updated_at: string | null
          gross_sqft: number | null
          ground_floor_sqft: number | null
          id: string
          intervention_threshold: number
          latitude: number | null
          longitude: number | null
          photo_url: string | null
          place_id: string | null
          property_id: string | null
          property_type: string | null
          pulse_status: string | null
          rooms_total: number | null
          square_feet: number | null
          state: string
          status: string | null
          updated_at: string
          user_id: string
          year_built: number | null
          year_built_effective: number | null
          zip_code: string
        }
        Insert: {
          address: string
          address_id?: string | null
          arch_style?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          build_quality?: string | null
          city: string
          confidence?: number | null
          created_at?: string
          data_match_confidence?: string | null
          fips_code?: string | null
          folio?: string | null
          folio_source?: string | null
          geo_source?: string | null
          geo_updated_at?: string | null
          gross_sqft?: number | null
          ground_floor_sqft?: number | null
          id?: string
          intervention_threshold?: number
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          place_id?: string | null
          property_id?: string | null
          property_type?: string | null
          pulse_status?: string | null
          rooms_total?: number | null
          square_feet?: number | null
          state: string
          status?: string | null
          updated_at?: string
          user_id: string
          year_built?: number | null
          year_built_effective?: number | null
          zip_code: string
        }
        Update: {
          address?: string
          address_id?: string | null
          arch_style?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          build_quality?: string | null
          city?: string
          confidence?: number | null
          created_at?: string
          data_match_confidence?: string | null
          fips_code?: string | null
          folio?: string | null
          folio_source?: string | null
          geo_source?: string | null
          geo_updated_at?: string | null
          gross_sqft?: number | null
          ground_floor_sqft?: number | null
          id?: string
          intervention_threshold?: number
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          place_id?: string | null
          property_id?: string | null
          property_type?: string | null
          pulse_status?: string | null
          rooms_total?: number | null
          square_feet?: number | null
          state?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          year_built?: number | null
          year_built_effective?: number | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "homes_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      homesage_raw: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          payload: Json
          property_key: string
          sha256: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          payload: Json
          property_key: string
          sha256: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          payload?: Json
          property_key?: string
          sha256?: string
          user_id?: string
        }
        Relationships: []
      }
      image_assessments: {
        Row: {
          assessment_type: string
          condition_score: number | null
          confidence_score: number | null
          created_at: string
          detected_issues: Json | null
          id: string
          image_url: string
          processed_at: string | null
          property_id: string
          recommendations: Json | null
          user_id: string
        }
        Insert: {
          assessment_type: string
          condition_score?: number | null
          confidence_score?: number | null
          created_at?: string
          detected_issues?: Json | null
          id?: string
          image_url: string
          processed_at?: string | null
          property_id: string
          recommendations?: Json | null
          user_id: string
        }
        Update: {
          assessment_type?: string
          condition_score?: number | null
          confidence_score?: number | null
          created_at?: string
          detected_issues?: Json | null
          id?: string
          image_url?: string
          processed_at?: string | null
          property_id?: string
          recommendations?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      interventions: {
        Row: {
          baseline_strength_snapshot: number
          closed_at: string | null
          closed_reason: string | null
          comparable_homes_count: number | null
          cooldown_until: string | null
          created_at: string | null
          data_sources: Json | null
          home_id: string | null
          id: string
          intervention_score: number
          intervention_threshold_used: number
          last_viewed_at: string | null
          message_order: string[]
          messages: Json
          opened_at: string
          risk_outlook_snapshot: number
          system_id: string | null
          trigger_reason: string
          updated_at: string | null
          urgency_factors_snapshot: Json | null
          urgency_premium_snapshot: number | null
          user_id: string | null
        }
        Insert: {
          baseline_strength_snapshot: number
          closed_at?: string | null
          closed_reason?: string | null
          comparable_homes_count?: number | null
          cooldown_until?: string | null
          created_at?: string | null
          data_sources?: Json | null
          home_id?: string | null
          id?: string
          intervention_score: number
          intervention_threshold_used: number
          last_viewed_at?: string | null
          message_order?: string[]
          messages?: Json
          opened_at?: string
          risk_outlook_snapshot: number
          system_id?: string | null
          trigger_reason: string
          updated_at?: string | null
          urgency_factors_snapshot?: Json | null
          urgency_premium_snapshot?: number | null
          user_id?: string | null
        }
        Update: {
          baseline_strength_snapshot?: number
          closed_at?: string | null
          closed_reason?: string | null
          comparable_homes_count?: number | null
          cooldown_until?: string | null
          created_at?: string | null
          data_sources?: Json | null
          home_id?: string | null
          id?: string
          intervention_score?: number
          intervention_threshold_used?: number
          last_viewed_at?: string | null
          message_order?: string[]
          messages?: Json
          opened_at?: string
          risk_outlook_snapshot?: number
          system_id?: string | null
          trigger_reason?: string
          updated_at?: string | null
          urgency_factors_snapshot?: Json | null
          urgency_premium_snapshot?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "interventions_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "home_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          address_id: string | null
          basement_or_crawlspace: string | null
          created_at: string | null
          doors_age_bucket: string | null
          electrical_gfci_bath: boolean | null
          electrical_gfci_kitchen: boolean | null
          evidence_photo_urls: string | null
          hvac_age_bucket: string | null
          hvac_estimated_remaining_years: number | null
          hvac_present: boolean | null
          hvac_system_type: string | null
          label_date: string | null
          label_id: string
          labeler: string
          labeler_confidence_0_1: number | null
          labeler_notes: string | null
          last_hvac_permit_year: number | null
          last_roof_permit_year: number | null
          last_water_heater_permit_year: number | null
          moisture_risk: boolean | null
          roof_age_bucket: string | null
          roof_estimated_remaining_years: number | null
          roof_material: string | null
          roof_visible_damage: boolean | null
          water_heater_age_bucket: string | null
          water_heater_present: boolean | null
          water_heater_type: string | null
          windows_age_bucket: string | null
        }
        Insert: {
          address_id?: string | null
          basement_or_crawlspace?: string | null
          created_at?: string | null
          doors_age_bucket?: string | null
          electrical_gfci_bath?: boolean | null
          electrical_gfci_kitchen?: boolean | null
          evidence_photo_urls?: string | null
          hvac_age_bucket?: string | null
          hvac_estimated_remaining_years?: number | null
          hvac_present?: boolean | null
          hvac_system_type?: string | null
          label_date?: string | null
          label_id?: string
          labeler: string
          labeler_confidence_0_1?: number | null
          labeler_notes?: string | null
          last_hvac_permit_year?: number | null
          last_roof_permit_year?: number | null
          last_water_heater_permit_year?: number | null
          moisture_risk?: boolean | null
          roof_age_bucket?: string | null
          roof_estimated_remaining_years?: number | null
          roof_material?: string | null
          roof_visible_damage?: boolean | null
          water_heater_age_bucket?: string | null
          water_heater_present?: boolean | null
          water_heater_type?: string | null
          windows_age_bucket?: string | null
        }
        Update: {
          address_id?: string | null
          basement_or_crawlspace?: string | null
          created_at?: string | null
          doors_age_bucket?: string | null
          electrical_gfci_bath?: boolean | null
          electrical_gfci_kitchen?: boolean | null
          evidence_photo_urls?: string | null
          hvac_age_bucket?: string | null
          hvac_estimated_remaining_years?: number | null
          hvac_present?: boolean | null
          hvac_system_type?: string | null
          label_date?: string | null
          label_id?: string
          labeler?: string
          labeler_confidence_0_1?: number | null
          labeler_notes?: string | null
          last_hvac_permit_year?: number | null
          last_roof_permit_year?: number | null
          last_water_heater_permit_year?: number | null
          moisture_risk?: boolean | null
          roof_age_bucket?: string | null
          roof_estimated_remaining_years?: number | null
          roof_material?: string | null
          roof_visible_damage?: boolean | null
          water_heater_age_bucket?: string | null
          water_heater_present?: boolean | null
          water_heater_type?: string | null
          windows_age_bucket?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "properties_sample"
            referencedColumns: ["address_id"]
          },
        ]
      }
      lifespan_reference: {
        Row: {
          climate_zone: string
          created_at: string
          id: string
          max_years: number
          min_years: number
          notes: string | null
          quality_tier: string | null
          system_subtype: string | null
          system_type: string
          typical_years: number
        }
        Insert: {
          climate_zone?: string
          created_at?: string
          id?: string
          max_years: number
          min_years: number
          notes?: string | null
          quality_tier?: string | null
          system_subtype?: string | null
          system_type: string
          typical_years: number
        }
        Update: {
          climate_zone?: string
          created_at?: string
          id?: string
          max_years?: number
          min_years?: number
          notes?: string | null
          quality_tier?: string | null
          system_subtype?: string | null
          system_type?: string
          typical_years?: number
        }
        Relationships: []
      }
      lifestyle_metrics: {
        Row: {
          air_quality: string | null
          comfort_rating: string | null
          comfort_summary: string | null
          created_at: string
          energy_neighborhood_avg: number | null
          energy_trend: string | null
          energy_wellness_score: number | null
          home_id: string | null
          id: string
          monthly_savings: number | null
          outdoor_readiness_status: string | null
          outdoor_systems: string[] | null
          safety_score: number | null
          safety_status: string | null
          safety_summary: string | null
          seasonal_note: string | null
          temperature_stability: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          air_quality?: string | null
          comfort_rating?: string | null
          comfort_summary?: string | null
          created_at?: string
          energy_neighborhood_avg?: number | null
          energy_trend?: string | null
          energy_wellness_score?: number | null
          home_id?: string | null
          id?: string
          monthly_savings?: number | null
          outdoor_readiness_status?: string | null
          outdoor_systems?: string[] | null
          safety_score?: number | null
          safety_status?: string | null
          safety_summary?: string | null
          seasonal_note?: string | null
          temperature_stability?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          air_quality?: string | null
          comfort_rating?: string | null
          comfort_summary?: string | null
          created_at?: string
          energy_neighborhood_avg?: number | null
          energy_trend?: string | null
          energy_wellness_score?: number | null
          home_id?: string | null
          id?: string
          monthly_savings?: number | null
          outdoor_readiness_status?: string | null
          outdoor_systems?: string[] | null
          safety_score?: number | null
          safety_status?: string | null
          safety_summary?: string | null
          seasonal_note?: string | null
          temperature_stability?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifestyle_metrics_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifestyle_metrics_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      local_contractors: {
        Row: {
          business_hours: Json | null
          business_license: string | null
          contact_info: Json | null
          created_at: string | null
          emergency_services: boolean | null
          florida_license_number: string | null
          hurricane_response: boolean | null
          id: string
          insurance_verified: boolean | null
          is_active: boolean | null
          last_verified: string | null
          license_expiration: string | null
          license_type: string | null
          license_verified: boolean | null
          name: string
          pricing_tier: string | null
          ratings: Json | null
          review_count: number | null
          service_areas: string[] | null
          service_radius_miles: number | null
          specialties: string[] | null
          typical_response_time_hours: number | null
        }
        Insert: {
          business_hours?: Json | null
          business_license?: string | null
          contact_info?: Json | null
          created_at?: string | null
          emergency_services?: boolean | null
          florida_license_number?: string | null
          hurricane_response?: boolean | null
          id?: string
          insurance_verified?: boolean | null
          is_active?: boolean | null
          last_verified?: string | null
          license_expiration?: string | null
          license_type?: string | null
          license_verified?: boolean | null
          name: string
          pricing_tier?: string | null
          ratings?: Json | null
          review_count?: number | null
          service_areas?: string[] | null
          service_radius_miles?: number | null
          specialties?: string[] | null
          typical_response_time_hours?: number | null
        }
        Update: {
          business_hours?: Json | null
          business_license?: string | null
          contact_info?: Json | null
          created_at?: string | null
          emergency_services?: boolean | null
          florida_license_number?: string | null
          hurricane_response?: boolean | null
          id?: string
          insurance_verified?: boolean | null
          is_active?: boolean | null
          last_verified?: string | null
          license_expiration?: string | null
          license_type?: string | null
          license_verified?: boolean | null
          name?: string
          pricing_tier?: string | null
          ratings?: Json | null
          review_count?: number | null
          service_areas?: string[] | null
          service_radius_miles?: number | null
          specialties?: string[] | null
          typical_response_time_hours?: number | null
        }
        Relationships: []
      }
      maintenance_signals: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          last_updated: string
          property_id: string
          signal: string
          value: number
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          last_updated?: string
          property_id: string
          signal: string
          value: number
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          last_updated?: string
          property_id?: string
          signal?: string
          value?: number
        }
        Relationships: []
      }
      maintenance_tasks: {
        Row: {
          category: string | null
          completed_date: string | null
          cost: number | null
          created_at: string
          description: string | null
          due_date: string | null
          home_id: string
          id: string
          priority: string | null
          recurrence_interval: string | null
          recurring: boolean | null
          status: string | null
          system_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          home_id: string
          id?: string
          priority?: string | null
          recurrence_interval?: string | null
          recurring?: boolean | null
          status?: string | null
          system_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          home_id?: string
          id?: string
          priority?: string | null
          recurrence_interval?: string | null
          recurring?: boolean | null
          status?: string | null
          system_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      market_data: {
        Row: {
          category: string | null
          data_type: string
          data_values: Json
          id: string
          location_key: string
          reliability_score: number | null
          source: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          category?: string | null
          data_type: string
          data_values: Json
          id?: string
          location_key: string
          reliability_score?: number | null
          source: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          category?: string | null
          data_type?: string
          data_values?: Json
          id?: string
          location_key?: string
          reliability_score?: number | null
          source?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          actual_cost: number | null
          created_at: string
          estimated_cost: number | null
          id: string
          is_purchased: boolean | null
          name: string
          notes: string | null
          project_id: string
          quantity: number
          supplier_name: string | null
          supplier_url: string | null
          unit: string | null
        }
        Insert: {
          actual_cost?: number | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          is_purchased?: boolean | null
          name: string
          notes?: string | null
          project_id: string
          quantity?: number
          supplier_name?: string | null
          supplier_url?: string | null
          unit?: string | null
        }
        Update: {
          actual_cost?: number | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          is_purchased?: boolean | null
          name?: string
          notes?: string | null
          project_id?: string
          quantity?: number
          supplier_name?: string | null
          supplier_url?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_models: {
        Row: {
          accuracy_score: number | null
          created_at: string
          id: string
          is_active: boolean | null
          model_config: Json | null
          model_name: string
          model_type: string
          training_date: string | null
          version: string
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          model_config?: Json | null
          model_name: string
          model_type: string
          training_date?: string | null
          version: string
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          model_config?: Json | null
          model_name?: string
          model_type?: string
          training_date?: string | null
          version?: string
        }
        Relationships: []
      }
      neighborhood_benchmarks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lower_is_better: boolean | null
          metric_name: string
          metric_unit: string
          neighborhood_avg: number
          region: string | null
          zipcode: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lower_is_better?: boolean | null
          metric_name: string
          metric_unit: string
          neighborhood_avg: number
          region?: string | null
          zipcode?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lower_is_better?: boolean | null
          metric_name?: string
          metric_unit?: string
          neighborhood_avg?: number
          region?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      partner_offers: {
        Row: {
          created_at: string
          description: string | null
          expiry_date: string | null
          id: string
          is_qualified: boolean | null
          offer_type: string
          partner_name: string
          title: string
          trigger_condition: string | null
          updated_at: string
          value: number | null
          value_unit: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_qualified?: boolean | null
          offer_type: string
          partner_name: string
          title: string
          trigger_condition?: string | null
          updated_at?: string
          value?: number | null
          value_unit?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_qualified?: boolean | null
          offer_type?: string
          partner_name?: string
          title?: string
          trigger_condition?: string | null
          updated_at?: string
          value?: number | null
          value_unit?: string | null
        }
        Relationships: []
      }
      permits: {
        Row: {
          contractor_license: string | null
          contractor_name: string | null
          created_at: string
          date_finaled: string | null
          date_issued: string | null
          description: string | null
          hash: string | null
          home_id: string
          id: string
          is_energy_related: boolean
          jurisdiction: string | null
          permit_number: string | null
          permit_type: string | null
          raw: Json
          source: string
          source_url: string | null
          status: string | null
          system_tags: string[] | null
          trade: string | null
          updated_at: string
          user_id: string
          valuation: number | null
          work_class: string | null
        }
        Insert: {
          contractor_license?: string | null
          contractor_name?: string | null
          created_at?: string
          date_finaled?: string | null
          date_issued?: string | null
          description?: string | null
          hash?: string | null
          home_id: string
          id?: string
          is_energy_related?: boolean
          jurisdiction?: string | null
          permit_number?: string | null
          permit_type?: string | null
          raw: Json
          source?: string
          source_url?: string | null
          status?: string | null
          system_tags?: string[] | null
          trade?: string | null
          updated_at?: string
          user_id: string
          valuation?: number | null
          work_class?: string | null
        }
        Update: {
          contractor_license?: string | null
          contractor_name?: string | null
          created_at?: string
          date_finaled?: string | null
          date_issued?: string | null
          description?: string | null
          hash?: string | null
          home_id?: string
          id?: string
          is_energy_related?: boolean
          jurisdiction?: string | null
          permit_number?: string | null
          permit_type?: string | null
          raw?: Json
          source?: string
          source_url?: string | null
          status?: string | null
          system_tags?: string[] | null
          trade?: string | null
          updated_at?: string
          user_id?: string
          valuation?: number | null
          work_class?: string | null
        }
        Relationships: []
      }
      photo_transfer_sessions: {
        Row: {
          created_at: string
          expires_at: string
          home_id: string | null
          id: string
          photo_url: string | null
          session_token: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          home_id?: string | null
          id?: string
          photo_url?: string | null
          session_token?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          home_id?: string | null
          id?: string
          photo_url?: string | null
          session_token?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_transfer_sessions_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_transfer_sessions_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      plan_cards: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          home_id: string
          id: string
          is_completed: boolean | null
          priority: string
          rationale: string | null
          system_kind: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          home_id: string
          id?: string
          is_completed?: boolean | null
          priority?: string
          rationale?: string | null
          system_kind?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          home_id?: string
          id?: string
          is_completed?: boolean | null
          priority?: string
          rationale?: string | null
          system_kind?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prediction_accuracy: {
        Row: {
          accuracy_score: number | null
          actual_cost: number | null
          actual_date: string | null
          created_at: string
          id: string
          model_id: string
          predicted_cost: number | null
          predicted_date: string | null
          prediction_type: string
          property_id: string
        }
        Insert: {
          accuracy_score?: number | null
          actual_cost?: number | null
          actual_date?: string | null
          created_at?: string
          id?: string
          model_id: string
          predicted_cost?: number | null
          predicted_date?: string | null
          prediction_type: string
          property_id: string
        }
        Update: {
          accuracy_score?: number | null
          actual_cost?: number | null
          actual_date?: string | null
          created_at?: string
          id?: string
          model_id?: string
          predicted_cost?: number | null
          predicted_date?: string | null
          prediction_type?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_accuracy_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          address_id: string | null
          confidence_0_1: number | null
          data_provenance: Json | null
          field: string
          model_version: string
          predicted_at: string | null
          predicted_value: string
          prediction_id: string
          prediction_run_id: string
        }
        Insert: {
          address_id?: string | null
          confidence_0_1?: number | null
          data_provenance?: Json | null
          field: string
          model_version: string
          predicted_at?: string | null
          predicted_value: string
          prediction_id?: string
          prediction_run_id: string
        }
        Update: {
          address_id?: string | null
          confidence_0_1?: number | null
          data_provenance?: Json | null
          field?: string
          model_version?: string
          predicted_at?: string | null
          predicted_value?: string
          prediction_id?: string
          prediction_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "properties_sample"
            referencedColumns: ["address_id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          demo_mode: boolean
          full_name: string | null
          house_photo_url: string | null
          id: string
          phone: string | null
          photo_url: string | null
          property_type: string | null
          square_feet: number | null
          updated_at: string
          year_purchased: number | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          demo_mode?: boolean
          full_name?: string | null
          house_photo_url?: string | null
          id: string
          phone?: string | null
          photo_url?: string | null
          property_type?: string | null
          square_feet?: number | null
          updated_at?: string
          year_purchased?: number | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          demo_mode?: boolean
          full_name?: string | null
          house_photo_url?: string | null
          id?: string
          phone?: string | null
          photo_url?: string | null
          property_type?: string | null
          square_feet?: number | null
          updated_at?: string
          year_purchased?: number | null
        }
        Relationships: []
      }
      project_budgets: {
        Row: {
          actual_amount: number
          category: string
          created_at: string
          estimated_amount: number
          id: string
          project_id: string
        }
        Insert: {
          actual_amount?: number
          category: string
          created_at?: string
          estimated_amount?: number
          id?: string
          project_id: string
        }
        Update: {
          actual_amount?: number
          category?: string
          created_at?: string
          estimated_amount?: number
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_completed: boolean | null
          name: string
          order_index: number
          project_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          name: string
          order_index: number
          project_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          name?: string
          order_index?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string
          default_materials: Json | null
          default_phases: Json | null
          description: string | null
          estimated_budget_range: Json | null
          id: string
          name: string
          room_type: string
        }
        Insert: {
          created_at?: string
          default_materials?: Json | null
          default_phases?: Json | null
          description?: string | null
          estimated_budget_range?: Json | null
          id?: string
          name: string
          room_type: string
        }
        Update: {
          created_at?: string
          default_materials?: Json | null
          default_phases?: Json | null
          description?: string | null
          estimated_budget_range?: Json | null
          id?: string
          name?: string
          room_type?: string
        }
        Relationships: []
      }
      project_timelines: {
        Row: {
          actual_date: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          milestone_name: string
          notes: string | null
          project_id: string
          target_date: string | null
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          milestone_name: string
          notes?: string | null
          project_id: string
          target_date?: string | null
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          milestone_name?: string
          notes?: string | null
          project_id?: string
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_timelines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          room_type: string
          status: string
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          room_type: string
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          room_type?: string
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          address_std: string | null
          apn: string | null
          created_at: string | null
          health_score: number | null
          id: string
          source_latest: string | null
          square_footage: number | null
          year_built: number | null
          zipcode: string | null
        }
        Insert: {
          address: string
          address_std?: string | null
          apn?: string | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          source_latest?: string | null
          square_footage?: number | null
          year_built?: number | null
          zipcode?: string | null
        }
        Update: {
          address?: string
          address_std?: string | null
          apn?: string | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          source_latest?: string | null
          square_footage?: number | null
          year_built?: number | null
          zipcode?: string | null
        }
        Relationships: []
      }
      properties_sample: {
        Row: {
          address_id: string
          apn: string | null
          assigned_to: string | null
          city: string
          created_at: string | null
          enrichment_completed_at: string | null
          enrichment_error: string | null
          enrichment_started_at: string | null
          enrichment_status: string | null
          lat: number | null
          lon: number | null
          source_list: string | null
          state: string
          status: string | null
          street_address: string
          unit: string | null
          zip: string
        }
        Insert: {
          address_id?: string
          apn?: string | null
          assigned_to?: string | null
          city: string
          created_at?: string | null
          enrichment_completed_at?: string | null
          enrichment_error?: string | null
          enrichment_started_at?: string | null
          enrichment_status?: string | null
          lat?: number | null
          lon?: number | null
          source_list?: string | null
          state: string
          status?: string | null
          street_address: string
          unit?: string | null
          zip: string
        }
        Update: {
          address_id?: string
          apn?: string | null
          assigned_to?: string | null
          city?: string
          created_at?: string | null
          enrichment_completed_at?: string | null
          enrichment_error?: string | null
          enrichment_started_at?: string | null
          enrichment_status?: string | null
          lat?: number | null
          lon?: number | null
          source_list?: string | null
          state?: string
          status?: string | null
          street_address?: string
          unit?: string | null
          zip?: string
        }
        Relationships: []
      }
      property_address_source: {
        Row: {
          components: Json | null
          created_at: string | null
          geometry: Json | null
          home_id: string | null
          id: string
          place_id: string | null
          raw_address: string
          source: string
        }
        Insert: {
          components?: Json | null
          created_at?: string | null
          geometry?: Json | null
          home_id?: string | null
          id?: string
          place_id?: string | null
          raw_address: string
          source: string
        }
        Update: {
          components?: Json | null
          created_at?: string | null
          geometry?: Json | null
          home_id?: string | null
          id?: string
          place_id?: string | null
          raw_address?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_address_source_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_address_source_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_climate_data: {
        Row: {
          average_humidity: number | null
          climate_zone: string | null
          flood_zone: string | null
          historical_weather_events: Json | null
          hurricane_risk_level: string | null
          id: string
          microclimate_factors: Json | null
          prevailing_wind_direction: string | null
          property_id: string | null
          salt_air_exposure: boolean | null
          soil_type: string | null
          updated_at: string | null
        }
        Insert: {
          average_humidity?: number | null
          climate_zone?: string | null
          flood_zone?: string | null
          historical_weather_events?: Json | null
          hurricane_risk_level?: string | null
          id?: string
          microclimate_factors?: Json | null
          prevailing_wind_direction?: string | null
          property_id?: string | null
          salt_air_exposure?: boolean | null
          soil_type?: string | null
          updated_at?: string | null
        }
        Update: {
          average_humidity?: number | null
          climate_zone?: string | null
          flood_zone?: string | null
          historical_weather_events?: Json | null
          hurricane_risk_level?: string | null
          id?: string
          microclimate_factors?: Json | null
          prevailing_wind_direction?: string | null
          property_id?: string | null
          salt_air_exposure?: boolean | null
          soil_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_climate_data_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_enrichment: {
        Row: {
          address_id: string | null
          attributes: Json | null
          id: string
          raw: Json | null
          refreshed_at: string | null
        }
        Insert: {
          address_id?: string | null
          attributes?: Json | null
          id?: string
          raw?: Json | null
          refreshed_at?: string | null
        }
        Update: {
          address_id?: string | null
          attributes?: Json | null
          id?: string
          raw?: Json | null
          refreshed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_enrichment_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      property_snapshot: {
        Row: {
          climate_stress: string | null
          confidence_score: number | null
          cooling_type: string | null
          created_at: string | null
          home_id: string | null
          id: string
          roof_age_band: string | null
          roof_type: string | null
          square_feet: number | null
          year_built: number | null
        }
        Insert: {
          climate_stress?: string | null
          confidence_score?: number | null
          cooling_type?: string | null
          created_at?: string | null
          home_id?: string | null
          id?: string
          roof_age_band?: string | null
          roof_type?: string | null
          square_feet?: number | null
          year_built?: number | null
        }
        Update: {
          climate_stress?: string | null
          confidence_score?: number | null
          cooling_type?: string | null
          created_at?: string | null
          home_id?: string | null
          id?: string
          roof_age_band?: string | null
          roof_type?: string | null
          square_feet?: number | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_snapshot_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: true
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_snapshot_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: true
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      renovation_items: {
        Row: {
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          item_name: string
          last_service_date: string | null
          next_service_due: string | null
          priority: string | null
          property_id: string
          system: string
          urgency: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          item_name: string
          last_service_date?: string | null
          next_service_due?: string | null
          priority?: string | null
          property_id: string
          system: string
          urgency?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          item_name?: string
          last_service_date?: string | null
          next_service_due?: string | null
          priority?: string | null
          property_id?: string
          system?: string
          urgency?: number
        }
        Relationships: [
          {
            foreignKeyName: "renovation_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_contexts: {
        Row: {
          climate_zone: string
          created_at: string | null
          freeze_warning: boolean | null
          heat_wave: boolean | null
          hurricane_season: boolean | null
          id: string
          peak_season_hvac: boolean | null
          peak_season_roofing: boolean | null
          state: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          climate_zone: string
          created_at?: string | null
          freeze_warning?: boolean | null
          heat_wave?: boolean | null
          hurricane_season?: boolean | null
          id?: string
          peak_season_hvac?: boolean | null
          peak_season_roofing?: boolean | null
          state: string
          valid_from: string
          valid_until: string
        }
        Update: {
          climate_zone?: string
          created_at?: string | null
          freeze_warning?: boolean | null
          heat_wave?: boolean | null
          hurricane_season?: boolean | null
          id?: string
          peak_season_hvac?: boolean | null
          peak_season_roofing?: boolean | null
          state?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      seasonal_experiences: {
        Row: {
          bullets: string[] | null
          created_at: string
          id: string
          imagery: string | null
          message: string | null
          primary_cta_route: string | null
          primary_cta_text: string | null
          season: string
          secondary_cta_action: string | null
          secondary_cta_text: string | null
          title: string
          trigger_conditions: string[] | null
        }
        Insert: {
          bullets?: string[] | null
          created_at?: string
          id?: string
          imagery?: string | null
          message?: string | null
          primary_cta_route?: string | null
          primary_cta_text?: string | null
          season: string
          secondary_cta_action?: string | null
          secondary_cta_text?: string | null
          title: string
          trigger_conditions?: string[] | null
        }
        Update: {
          bullets?: string[] | null
          created_at?: string
          id?: string
          imagery?: string | null
          message?: string | null
          primary_cta_route?: string | null
          primary_cta_text?: string | null
          season?: string
          secondary_cta_action?: string | null
          secondary_cta_text?: string | null
          title?: string
          trigger_conditions?: string[] | null
        }
        Relationships: []
      }
      smart_recommendations: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          diy_difficulty: string | null
          energy_savings_potential: number | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          estimated_time_hours: number | null
          id: string
          is_completed: boolean | null
          property_id: string | null
          recommendation_type: string
          roi_potential: number | null
          seasonal_timing: string | null
          system_lifecycle_id: string | null
          title: string
          triggers: Json | null
          urgency_score: number | null
          valid_until: string | null
          weather_dependent: boolean | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          diy_difficulty?: string | null
          energy_savings_potential?: number | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          estimated_time_hours?: number | null
          id?: string
          is_completed?: boolean | null
          property_id?: string | null
          recommendation_type: string
          roi_potential?: number | null
          seasonal_timing?: string | null
          system_lifecycle_id?: string | null
          title: string
          triggers?: Json | null
          urgency_score?: number | null
          valid_until?: string | null
          weather_dependent?: boolean | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          diy_difficulty?: string | null
          energy_savings_potential?: number | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          estimated_time_hours?: number | null
          id?: string
          is_completed?: boolean | null
          property_id?: string | null
          recommendation_type?: string
          roi_potential?: number | null
          seasonal_timing?: string | null
          system_lifecycle_id?: string | null
          title?: string
          triggers?: Json | null
          urgency_score?: number | null
          valid_until?: string | null
          weather_dependent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_recommendations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_recommendations_system_lifecycle_id_fkey"
            columns: ["system_lifecycle_id"]
            isOneToOne: false
            referencedRelation: "system_lifecycles"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_analysis: {
        Row: {
          address_id: string | null
          created_at: string
          id: string
          processed_data: Json
          raw_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          address_id?: string | null
          created_at?: string
          id?: string
          processed_data: Json
          raw_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          address_id?: string | null
          created_at?: string
          id?: string
          processed_data?: Json
          raw_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_catalog: {
        Row: {
          appliance_tier: number | null
          cost_high: number | null
          cost_low: number | null
          created_at: string | null
          display_name: string
          health_weight_cap: number | null
          id: string
          key: string
          maintenance_checks: Json | null
          risk_weights: Json | null
          typical_lifespan_years: number
          updated_at: string | null
        }
        Insert: {
          appliance_tier?: number | null
          cost_high?: number | null
          cost_low?: number | null
          created_at?: string | null
          display_name: string
          health_weight_cap?: number | null
          id?: string
          key: string
          maintenance_checks?: Json | null
          risk_weights?: Json | null
          typical_lifespan_years: number
          updated_at?: string | null
        }
        Update: {
          appliance_tier?: number | null
          cost_high?: number | null
          cost_low?: number | null
          created_at?: string | null
          display_name?: string
          health_weight_cap?: number | null
          id?: string
          key?: string
          maintenance_checks?: Json | null
          risk_weights?: Json | null
          typical_lifespan_years?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      system_images: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          image_type: string | null
          image_url: string
          ocr_data: Json | null
          system_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          image_type?: string | null
          image_url: string
          ocr_data?: Json | null
          system_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          image_type?: string | null
          image_url?: string
          ocr_data?: Json | null
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_images_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "home_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_install_events: {
        Row: {
          created_at: string | null
          home_id: string
          id: string
          metadata: Json | null
          new_install_source: string | null
          new_install_year: number | null
          new_replacement_status: string | null
          prev_install_source: string | null
          prev_install_year: number | null
          prev_replacement_status: string | null
          system_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          home_id: string
          id?: string
          metadata?: Json | null
          new_install_source?: string | null
          new_install_year?: number | null
          new_replacement_status?: string | null
          prev_install_source?: string | null
          prev_install_year?: number | null
          prev_replacement_status?: string | null
          system_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          home_id?: string
          id?: string
          metadata?: Json | null
          new_install_source?: string | null
          new_install_year?: number | null
          new_replacement_status?: string | null
          prev_install_source?: string | null
          prev_install_year?: number | null
          prev_replacement_status?: string | null
          system_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_install_events_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_install_events_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "system_install_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_install_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_lifecycles: {
        Row: {
          brand: string | null
          climate_zone: string | null
          confidence_level: number | null
          created_at: string | null
          estimated_lifespan_years: number | null
          exposure_factors: Json | null
          id: string
          installation_date: string | null
          last_maintenance_date: string | null
          last_prediction_update: string | null
          maintenance_frequency_months: number | null
          maintenance_quality_score: number | null
          model: string | null
          predicted_replacement_date: string | null
          property_id: string | null
          replacement_probability: Json | null
          system_type: string
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          climate_zone?: string | null
          confidence_level?: number | null
          created_at?: string | null
          estimated_lifespan_years?: number | null
          exposure_factors?: Json | null
          id?: string
          installation_date?: string | null
          last_maintenance_date?: string | null
          last_prediction_update?: string | null
          maintenance_frequency_months?: number | null
          maintenance_quality_score?: number | null
          model?: string | null
          predicted_replacement_date?: string | null
          property_id?: string | null
          replacement_probability?: Json | null
          system_type: string
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          climate_zone?: string | null
          confidence_level?: number | null
          created_at?: string | null
          estimated_lifespan_years?: number | null
          exposure_factors?: Json | null
          id?: string
          installation_date?: string | null
          last_maintenance_date?: string | null
          last_prediction_update?: string | null
          maintenance_frequency_months?: number | null
          maintenance_quality_score?: number | null
          model?: string | null
          predicted_replacement_date?: string | null
          property_id?: string | null
          replacement_probability?: Json | null
          system_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_lifecycles_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      system_predictions: {
        Row: {
          confidence: number | null
          forecast_run_at: string | null
          home_system_id: string
          id: string
          maintenance_actions: Json | null
          notes: string | null
          predicted_cost_high: number | null
          predicted_cost_low: number | null
          predicted_cost_mean: number | null
          predicted_replace_date: string | null
          risk_factors: Json | null
        }
        Insert: {
          confidence?: number | null
          forecast_run_at?: string | null
          home_system_id: string
          id?: string
          maintenance_actions?: Json | null
          notes?: string | null
          predicted_cost_high?: number | null
          predicted_cost_low?: number | null
          predicted_cost_mean?: number | null
          predicted_replace_date?: string | null
          risk_factors?: Json | null
        }
        Update: {
          confidence?: number | null
          forecast_run_at?: string | null
          home_system_id?: string
          id?: string
          maintenance_actions?: Json | null
          notes?: string | null
          predicted_cost_high?: number | null
          predicted_cost_low?: number | null
          predicted_cost_mean?: number | null
          predicted_replace_date?: string | null
          risk_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "system_predictions_home_system_id_fkey"
            columns: ["home_system_id"]
            isOneToOne: false
            referencedRelation: "home_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      systems: {
        Row: {
          confidence: number | null
          created_at: string
          home_id: string
          id: string
          install_metadata: Json | null
          install_month: number | null
          install_source: string | null
          install_year: number | null
          kind: string
          material: string | null
          notes: string | null
          raw_data: Json | null
          replacement_status: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          home_id: string
          id?: string
          install_metadata?: Json | null
          install_month?: number | null
          install_source?: string | null
          install_year?: number | null
          kind: string
          material?: string | null
          notes?: string | null
          raw_data?: Json | null
          replacement_status?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          home_id?: string
          id?: string
          install_metadata?: Json | null
          install_month?: number | null
          install_source?: string | null
          install_year?: number | null
          kind?: string
          material?: string | null
          notes?: string | null
          raw_data?: Json | null
          replacement_status?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      systems_backup_20260201: {
        Row: {
          confidence: number | null
          created_at: string | null
          home_id: string | null
          id: string | null
          install_metadata: Json | null
          install_month: number | null
          install_source: string | null
          install_year: number | null
          kind: string | null
          material: string | null
          notes: string | null
          raw_data: Json | null
          replacement_status: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          home_id?: string | null
          id?: string | null
          install_metadata?: Json | null
          install_month?: number | null
          install_source?: string | null
          install_year?: number | null
          kind?: string | null
          material?: string | null
          notes?: string | null
          raw_data?: Json | null
          replacement_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          home_id?: string | null
          id?: string | null
          install_metadata?: Json | null
          install_month?: number | null
          install_source?: string | null
          install_year?: number | null
          kind?: string | null
          material?: string | null
          notes?: string | null
          raw_data?: Json | null
          replacement_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_hours: number | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          is_completed: boolean | null
          order_index: number
          phase_id: string | null
          project_id: string
          title: string
        }
        Insert: {
          actual_hours?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_completed?: boolean | null
          order_index: number
          phase_id?: string | null
          project_id: string
          title: string
        }
        Update: {
          actual_hours?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_completed?: boolean | null
          order_index?: number
          phase_id?: string | null
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_benchmarks: {
        Row: {
          benchmark_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          user_value: number
        }
        Insert: {
          benchmark_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          user_value: number
        }
        Update: {
          benchmark_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          user_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_benchmarks_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "neighborhood_benchmarks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          actual_value: Json | null
          created_at: string
          feedback_text: string | null
          feedback_type: string
          id: string
          predicted_value: Json | null
          property_id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          actual_value?: Json | null
          created_at?: string
          feedback_text?: string | null
          feedback_type: string
          id?: string
          predicted_value?: Json | null
          property_id: string
          rating?: number | null
          user_id: string
        }
        Update: {
          actual_value?: Json | null
          created_at?: string
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          predicted_value?: Json | null
          property_id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_partner_offers: {
        Row: {
          created_at: string
          id: string
          is_qualified: boolean | null
          offer_id: string
          qualified_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_qualified?: boolean | null
          offer_id: string
          qualified_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_qualified?: boolean | null
          offer_id?: string
          qualified_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_partner_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "partner_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      valuations: {
        Row: {
          avm_high: number | null
          avm_low: number | null
          avm_value: number
          confidence: number | null
          created_at: string
          forecast_12mo: number | null
          id: string
          property_id: string
          valuation_date: string
        }
        Insert: {
          avm_high?: number | null
          avm_low?: number | null
          avm_value: number
          confidence?: number | null
          created_at?: string
          forecast_12mo?: number | null
          id?: string
          property_id: string
          valuation_date?: string
        }
        Update: {
          avm_high?: number | null
          avm_low?: number | null
          avm_value?: number
          confidence?: number | null
          created_at?: string
          forecast_12mo?: number | null
          id?: string
          property_id?: string
          valuation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          name?: string
        }
        Relationships: []
      }
      weather_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          location_key: string
          maintenance_actions: string[] | null
          severity: string | null
          source: string | null
          starts_at: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          location_key: string
          maintenance_actions?: string[] | null
          severity?: string | null
          source?: string | null
          starts_at?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          location_key?: string
          maintenance_actions?: string[] | null
          severity?: string | null
          source?: string | null
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_confidence_calibration: {
        Row: {
          accuracy: number | null
          avg_confidence: number | null
          confidence_bucket: string | null
          correct_predictions: number | null
          field: string | null
          total_predictions: number | null
        }
        Relationships: []
      }
      v_dashboard_replacements: {
        Row: {
          cost_avg: number | null
          cost_max: number | null
          cost_min: number | null
          horizon_years: number | null
          predicted_replacement_date: string | null
          property_id: string | null
          replacement_probability: number | null
          system_type: string | null
        }
        Relationships: []
      }
      v_dashboard_smart_tasks: {
        Row: {
          category: string | null
          confidence: number | null
          description: string | null
          due_date: string | null
          estimated_cost: number | null
          estimated_time: number | null
          id: string | null
          preventative_savings: number | null
          priority: string | null
          property_id: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          confidence?: never
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          estimated_time?: never
          id?: string | null
          preventative_savings?: never
          priority?: never
          property_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          confidence?: never
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          estimated_time?: never
          id?: string | null
          preventative_savings?: never
          priority?: never
          property_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_home_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_home_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_profile"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_dashboard_systems: {
        Row: {
          brand: string | null
          confidence_level: number | null
          estimated_lifespan_years: number | null
          id: string | null
          installation_date: string | null
          maintenance_frequency_months: number | null
          model: string | null
          predicted_replacement_date: string | null
          property_id: string | null
          replacement_probability: number | null
          system_type: string | null
          user_id: string | null
        }
        Insert: {
          brand?: never
          confidence_level?: number | null
          estimated_lifespan_years?: never
          id?: string | null
          installation_date?: never
          maintenance_frequency_months?: never
          model?: never
          predicted_replacement_date?: never
          property_id?: string | null
          replacement_probability?: never
          system_type?: string | null
          user_id?: string | null
        }
        Update: {
          brand?: never
          confidence_level?: number | null
          estimated_lifespan_years?: never
          id?: string | null
          installation_date?: never
          maintenance_frequency_months?: never
          model?: never
          predicted_replacement_date?: never
          property_id?: string | null
          replacement_probability?: never
          system_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_latest_labels: {
        Row: {
          address_id: string | null
          basement_or_crawlspace: string | null
          created_at: string | null
          doors_age_bucket: string | null
          electrical_gfci_bath: boolean | null
          electrical_gfci_kitchen: boolean | null
          evidence_photo_urls: string | null
          hvac_age_bucket: string | null
          hvac_estimated_remaining_years: number | null
          hvac_present: boolean | null
          hvac_system_type: string | null
          label_date: string | null
          label_id: string | null
          labeler: string | null
          labeler_confidence_0_1: number | null
          labeler_notes: string | null
          last_hvac_permit_year: number | null
          last_roof_permit_year: number | null
          last_water_heater_permit_year: number | null
          moisture_risk: boolean | null
          roof_age_bucket: string | null
          roof_estimated_remaining_years: number | null
          roof_material: string | null
          roof_visible_damage: boolean | null
          water_heater_age_bucket: string | null
          water_heater_present: boolean | null
          water_heater_type: string | null
          windows_age_bucket: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "properties_sample"
            referencedColumns: ["address_id"]
          },
        ]
      }
      v_latest_predictions: {
        Row: {
          address_id: string | null
          confidence_0_1: number | null
          data_provenance: Json | null
          field: string | null
          model_version: string | null
          predicted_at: string | null
          predicted_value: string | null
          prediction_id: string | null
          prediction_run_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "properties_sample"
            referencedColumns: ["address_id"]
          },
        ]
      }
      v_property_profile: {
        Row: {
          address_std: string | null
          apn: string | null
          last_permit_closed_date: string | null
          property_id: string | null
          roof_brand: string | null
          roof_installation_date: string | null
          roof_model: string | null
          roof_predicted_replacement_date: string | null
          roof_replacement_probability: number | null
          user_id: string | null
          year_built: number | null
          zipcode: string | null
        }
        Relationships: []
      }
      v_scored: {
        Row: {
          actual_value: string | null
          address_id: string | null
          confidence_0_1: number | null
          data_provenance: Json | null
          field: string | null
          match: boolean | null
          predicted_value: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "properties_sample"
            referencedColumns: ["address_id"]
          },
        ]
      }
    }
    Functions: {
      append_event_metadata: {
        Args: {
          p_home_id: string
          p_new_data: Json
          p_system_type: Database["public"]["Enums"]["system_category"]
        }
        Returns: undefined
      }
      cleanup_expired_photo_sessions: { Args: never; Returns: undefined }
      cleanup_expired_recommendations: { Args: never; Returns: undefined }
      compute_canonical_hash: {
        Args: {
          city: string
          line1: string
          postal_code: string
          state: string
        }
        Returns: string
      }
      get_permits_by_property: {
        Args: { p_property_address: string; p_user_id: string }
        Returns: {
          description: string
          estimated_cost: number
          id: string
          issue_date: string
          permit_number: string
          permit_type: string
          related_system_type: string
        }[]
      }
      get_system_age_from_events: {
        Args: {
          p_system_subtype?: string
          p_system_type: Database["public"]["Enums"]["system_category"]
          p_user_id: string
        }
        Returns: number
      }
      get_systems_by_property: {
        Args: { p_property_address: string; p_user_id: string }
        Returns: {
          data_source: string
          health_score: number
          id: string
          name: string
          priority: string
          type: string
          verification_status: Database["public"]["Enums"]["habitta_verification_status"]
        }[]
      }
      get_user_recommendations: {
        Args: {
          p_limit?: number
          p_normalized_address: string
          p_placement?: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          description: string
          id: string
          placement: string
          priority_score: number
          system_id: string
          task_id: string
          template_key: string
          title: string
          trigger_context: Json
        }[]
      }
      get_user_systems_by_address: {
        Args: { p_address: string; p_user_id: string }
        Returns: {
          created_at: string
          current_age: number | null
          data_source: string | null
          estimated_replacement_cost: number
          evidence_sources: string[] | null
          expected_lifespan: number
          expected_lifespan_years: number
          has_evidence: boolean | null
          health_score: number | null
          id: string
          install_date: string
          instance_key: string | null
          last_maintenance: string | null
          location_hint: string | null
          name: string
          next_maintenance_date: string | null
          normalized_address: string | null
          priority: Database["public"]["Enums"]["habitta_priority_level"] | null
          property_address: string | null
          type: Database["public"]["Enums"]["habitta_system_type"]
          updated_at: string
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["habitta_verification_status"]
            | null
        }[]
        SetofOptions: {
          from: "*"
          to: "habitta_home_systems"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      habitta_calculate_health_score: {
        Args: { p_current_age: number; p_expected_lifespan_years: number }
        Returns: number
      }
      habitta_generate_maintenance_tasks: { Args: never; Returns: undefined }
      habitta_parse_date: { Args: { p_text: string }; Returns: string }
      habitta_recompute_system_metrics: { Args: never; Returns: undefined }
      habitta_update_system_priorities: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_home_to_property: { Args: { p_home_id: string }; Returns: Json }
      normalize_address: { Args: { address: string }; Returns: string }
      process_permit_to_system_event: {
        Args: {
          p_contractor?: string
          p_cost?: number
          p_description: string
          p_event_date: string
          p_permit_id: string
          p_permit_type: string
          p_user_id: string
        }
        Returns: string
      }
      promote_validation_to_production: {
        Args: { p_property_id: string }
        Returns: Json
      }
      rpc_accuracy_by_field: {
        Args: never
        Returns: {
          accuracy: number
          field: string
        }[]
      }
      rpc_confidence_calibration: {
        Args: never
        Returns: {
          accuracy: number
          avg_confidence: number
          confidence_bucket: string
          correct_predictions: number
          field: string
          total_predictions: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      event_source:
        | "permit"
        | "user_verified"
        | "attom"
        | "manual_entry"
        | "estimated"
        | "app"
      event_type:
        | "install"
        | "replace"
        | "service"
        | "repair"
        | "inspection"
        | "maintenance_completed"
        | "delta_capture_failed"
      habitta_priority_level: "low" | "medium" | "high" | "critical"
      habitta_system_type:
        | "hvac"
        | "roof"
        | "water_heater"
        | "appliance"
        | "plumbing"
        | "electrical"
        | "pool_equipment"
        | "sprinkler"
        | "garage_door"
        | "security"
        | "other"
      habitta_verification_status:
        | "ai_generated"
        | "user_added"
        | "user_verified"
        | "permit_verified"
      priority_level: "low" | "medium" | "high" | "critical"
      system_category:
        | "hvac"
        | "roof"
        | "water_heater"
        | "electrical_panel"
        | "plumbing"
        | "appliance"
        | "pool"
        | "spa"
        | "solar"
        | "generator"
        | "irrigation"
        | "septic"
        | "water_softener"
        | "security"
        | "garage_door"
        | "deck"
        | "fence"
        | "windows"
        | "siding"
        | "flooring"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      event_source: [
        "permit",
        "user_verified",
        "attom",
        "manual_entry",
        "estimated",
        "app",
      ],
      event_type: [
        "install",
        "replace",
        "service",
        "repair",
        "inspection",
        "maintenance_completed",
        "delta_capture_failed",
      ],
      habitta_priority_level: ["low", "medium", "high", "critical"],
      habitta_system_type: [
        "hvac",
        "roof",
        "water_heater",
        "appliance",
        "plumbing",
        "electrical",
        "pool_equipment",
        "sprinkler",
        "garage_door",
        "security",
        "other",
      ],
      habitta_verification_status: [
        "ai_generated",
        "user_added",
        "user_verified",
        "permit_verified",
      ],
      priority_level: ["low", "medium", "high", "critical"],
      system_category: [
        "hvac",
        "roof",
        "water_heater",
        "electrical_panel",
        "plumbing",
        "appliance",
        "pool",
        "spa",
        "solar",
        "generator",
        "irrigation",
        "septic",
        "water_softener",
        "security",
        "garage_door",
        "deck",
        "fence",
        "windows",
        "siding",
        "flooring",
      ],
    },
  },
} as const
