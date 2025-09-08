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
      homes: {
        Row: {
          address: string
          bathrooms: number | null
          bedrooms: number | null
          city: string
          created_at: string
          id: string
          photo_url: string | null
          property_id: string | null
          property_type: string | null
          square_feet: number | null
          state: string
          updated_at: string
          user_id: string
          year_built: number | null
          zip_code: string
        }
        Insert: {
          address: string
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          created_at?: string
          id?: string
          photo_url?: string | null
          property_id?: string | null
          property_type?: string | null
          square_feet?: number | null
          state: string
          updated_at?: string
          user_id: string
          year_built?: number | null
          zip_code: string
        }
        Update: {
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          property_id?: string | null
          property_type?: string | null
          square_feet?: number | null
          state?: string
          updated_at?: string
          user_id?: string
          year_built?: number | null
          zip_code?: string
        }
        Relationships: [
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
