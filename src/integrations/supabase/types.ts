export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
          property_type?: string | null
          square_feet?: number | null
          state?: string
          updated_at?: string
          user_id?: string
          year_built?: number | null
          zip_code?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
