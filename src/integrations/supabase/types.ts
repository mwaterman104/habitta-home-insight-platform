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
        ]
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
        ]
      }
      home_systems: {
        Row: {
          brand: string | null
          created_at: string | null
          expected_lifespan_years: number | null
          home_id: string
          id: string
          install_date: string | null
          last_service_date: string | null
          model: string | null
          notes: string | null
          source: Json | null
          system_key: string
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          expected_lifespan_years?: number | null
          home_id: string
          id?: string
          install_date?: string | null
          last_service_date?: string | null
          model?: string | null
          notes?: string | null
          source?: Json | null
          system_key: string
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          expected_lifespan_years?: number | null
          home_id?: string
          id?: string
          install_date?: string | null
          last_service_date?: string | null
          model?: string | null
          notes?: string | null
          source?: Json | null
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
        ]
      }
      homes: {
        Row: {
          address: string
          address_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          confidence: number | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          photo_url: string | null
          property_id: string | null
          property_type: string | null
          square_feet: number | null
          state: string
          status: string | null
          updated_at: string
          user_id: string
          year_built: number | null
          zip_code: string
        }
        Insert: {
          address: string
          address_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          confidence?: number | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          property_id?: string | null
          property_type?: string | null
          square_feet?: number | null
          state: string
          status?: string | null
          updated_at?: string
          user_id: string
          year_built?: number | null
          zip_code: string
        }
        Update: {
          address?: string
          address_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          confidence?: number | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          property_id?: string | null
          property_type?: string | null
          square_feet?: number | null
          state?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          year_built?: number | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          demo_mode: boolean
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          demo_mode?: boolean
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          demo_mode?: boolean
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
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
          cost_high: number | null
          cost_low: number | null
          created_at: string | null
          display_name: string
          id: string
          key: string
          maintenance_checks: Json | null
          risk_weights: Json | null
          typical_lifespan_years: number
          updated_at: string | null
        }
        Insert: {
          cost_high?: number | null
          cost_low?: number | null
          created_at?: string | null
          display_name: string
          id?: string
          key: string
          maintenance_checks?: Json | null
          risk_weights?: Json | null
          typical_lifespan_years: number
          updated_at?: string | null
        }
        Update: {
          cost_high?: number | null
          cost_low?: number | null
          created_at?: string | null
          display_name?: string
          id?: string
          key?: string
          maintenance_checks?: Json | null
          risk_weights?: Json | null
          typical_lifespan_years?: number
          updated_at?: string | null
        }
        Relationships: []
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
          install_source: string | null
          install_year: number | null
          kind: string
          material: string | null
          notes: string | null
          raw_data: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          home_id: string
          id?: string
          install_source?: string | null
          install_year?: number | null
          kind: string
          material?: string | null
          notes?: string | null
          raw_data?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          home_id?: string
          id?: string
          install_source?: string | null
          install_year?: number | null
          kind?: string
          material?: string | null
          notes?: string | null
          raw_data?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
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
      [_ in never]: never
    }
    Functions: {
      compute_canonical_hash: {
        Args: {
          city: string
          line1: string
          postal_code: string
          state: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
