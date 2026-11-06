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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      breakdowns: {
        Row: {
          assigned_technician: string | null
          created_at: string
          description: string
          downtime_hours: number
          equipment_id: string
          failure_category: string
          failure_mode: string | null
          id: string
          occurred_at: string
          priority: string
          production_impact: string | null
          reference: string
          repair_cost: number
          reported_by: string | null
          reporter_name: string | null
          resolution: string | null
          severity: string
          status: string
          suspected_cause: string | null
        }
        Insert: {
          assigned_technician?: string | null
          created_at?: string
          description: string
          downtime_hours?: number
          equipment_id: string
          failure_category?: string
          failure_mode?: string | null
          id?: string
          occurred_at?: string
          priority?: string
          production_impact?: string | null
          reference?: string
          repair_cost?: number
          reported_by?: string | null
          reporter_name?: string | null
          resolution?: string | null
          severity?: string
          status?: string
          suspected_cause?: string | null
        }
        Update: {
          assigned_technician?: string | null
          created_at?: string
          description?: string
          downtime_hours?: number
          equipment_id?: string
          failure_category?: string
          failure_mode?: string | null
          id?: string
          occurred_at?: string
          priority?: string
          production_impact?: string | null
          reference?: string
          repair_cost?: number
          reported_by?: string | null
          reporter_name?: string | null
          resolution?: string | null
          severity?: string
          status?: string
          suspected_cause?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breakdowns_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          brand: string | null
          category: string
          code: string
          commissioning_date: string | null
          created_at: string
          criticality: string
          department: string | null
          id: string
          image_url: string | null
          location: string | null
          manufacturer: string | null
          model: string | null
          name: string
          operating_hours: number
          responsible_operator: string | null
          serial_number: string | null
          specifications: string | null
          status: string
          workshop: string | null
          year_manufactured: number | null
        }
        Insert: {
          brand?: string | null
          category?: string
          code: string
          commissioning_date?: string | null
          created_at?: string
          criticality?: string
          department?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          operating_hours?: number
          responsible_operator?: string | null
          serial_number?: string | null
          specifications?: string | null
          status?: string
          workshop?: string | null
          year_manufactured?: number | null
        }
        Update: {
          brand?: string | null
          category?: string
          code?: string
          commissioning_date?: string | null
          created_at?: string
          criticality?: string
          department?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          operating_hours?: number
          responsible_operator?: string | null
          serial_number?: string | null
          specifications?: string | null
          status?: string
          workshop?: string | null
          year_manufactured?: number | null
        }
        Relationships: []
      }
      fmea_items: {
        Row: {
          action: string | null
          action_status: string
          causes: string | null
          created_at: string
          deadline: string | null
          detection: number
          effects: string | null
          equipment_id: string
          failure_mode: string
          function_name: string
          id: string
          occurrence: number
          owner: string | null
          rpn: number | null
          severity: number
        }
        Insert: {
          action?: string | null
          action_status?: string
          causes?: string | null
          created_at?: string
          deadline?: string | null
          detection?: number
          effects?: string | null
          equipment_id: string
          failure_mode: string
          function_name: string
          id?: string
          occurrence?: number
          owner?: string | null
          rpn?: number | null
          severity?: number
        }
        Update: {
          action?: string | null
          action_status?: string
          causes?: string | null
          created_at?: string
          deadline?: string | null
          detection?: number
          effects?: string | null
          equipment_id?: string
          failure_mode?: string
          function_name?: string
          id?: string
          occurrence?: number
          owner?: string | null
          rpn?: number | null
          severity?: number
        }
        Relationships: [
          {
            foreignKeyName: "fmea_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      preventive_plans: {
        Row: {
          active: boolean
          checklist: string | null
          created_at: string
          equipment_id: string
          frequency: string
          id: string
          interval_days: number
          last_done: string | null
          next_due: string
          title: string
        }
        Insert: {
          active?: boolean
          checklist?: string | null
          created_at?: string
          equipment_id: string
          frequency?: string
          id?: string
          interval_days?: number
          last_done?: string | null
          next_due?: string
          title: string
        }
        Update: {
          active?: boolean
          checklist?: string | null
          created_at?: string
          equipment_id?: string
          frequency?: string
          id?: string
          interval_days?: number
          last_done?: string | null
          next_due?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventive_plans_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          specialty: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          specialty?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          specialty?: string | null
        }
        Relationships: []
      }
      sensor_readings: {
        Row: {
          created_at: string
          current_a: number | null
          equipment_id: string
          id: string
          pressure: number | null
          recorded_at: string
          temperature: number | null
          vibration: number | null
        }
        Insert: {
          created_at?: string
          current_a?: number | null
          equipment_id: string
          id?: string
          pressure?: number | null
          recorded_at?: string
          temperature?: number | null
          vibration?: number | null
        }
        Update: {
          created_at?: string
          current_a?: number | null
          equipment_id?: string
          id?: string
          pressure?: number | null
          recorded_at?: string
          temperature?: number | null
          vibration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      spare_parts: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          designation: string
          id: string
          lead_time_days: number
          location: string | null
          manufacturer: string | null
          max_stock: number
          min_stock: number
          quantity: number
          reference: string
          supplier: string | null
          unit_price: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          designation: string
          id?: string
          lead_time_days?: number
          location?: string | null
          manufacturer?: string | null
          max_stock?: number
          min_stock?: number
          quantity?: number
          reference: string
          supplier?: string | null
          unit_price?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          designation?: string
          id?: string
          lead_time_days?: number
          location?: string | null
          manufacturer?: string | null
          max_stock?: number
          min_stock?: number
          quantity?: number
          reference?: string
          supplier?: string | null
          unit_price?: number
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          new_balance: number
          note: string | null
          part_id: string
          previous_balance: number
          quantity: number
          user_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: string
          new_balance?: number
          note?: string | null
          part_id: string
          previous_balance?: number
          quantity: number
          user_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          new_balance?: number
          note?: string | null
          part_id?: string
          previous_balance?: number
          quantity?: number
          user_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "spare_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          actual_hours: number
          assigned_technician: string | null
          breakdown_id: string | null
          comments: string | null
          created_at: string
          description: string
          end_date: string | null
          equipment_id: string
          estimated_hours: number
          id: string
          labor_cost: number
          number: string
          parts_cost: number
          plan_id: string | null
          planned_date: string | null
          priority: string
          start_date: string | null
          status: string
          submitted_at: string | null
          total_cost: number | null
          type: string
          validated_at: string | null
          validated_by: string | null
          validation_comment: string | null
          work_performed: string | null
        }
        Insert: {
          actual_hours?: number
          assigned_technician?: string | null
          breakdown_id?: string | null
          comments?: string | null
          created_at?: string
          description: string
          end_date?: string | null
          equipment_id: string
          estimated_hours?: number
          id?: string
          labor_cost?: number
          number?: string
          parts_cost?: number
          plan_id?: string | null
          planned_date?: string | null
          priority?: string
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          total_cost?: number | null
          type?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_comment?: string | null
          work_performed?: string | null
        }
        Update: {
          actual_hours?: number
          assigned_technician?: string | null
          breakdown_id?: string | null
          comments?: string | null
          created_at?: string
          description?: string
          end_date?: string | null
          equipment_id?: string
          estimated_hours?: number
          id?: string
          labor_cost?: number
          number?: string
          parts_cost?: number
          plan_id?: string | null
          planned_date?: string | null
          priority?: string
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          total_cost?: number | null
          type?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_comment?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_breakdown_id_fkey"
            columns: ["breakdown_id"]
            isOneToOne: false
            referencedRelation: "breakdowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_app_role: { Args: { _user_id: string }; Returns: boolean }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
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
      app_role:
        | "admin"
        | "maintenance_manager"
        | "technician"
        | "operator"
        | "warehouse_manager"
        | "purchasing_manager"
        | "production_manager"
        | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "maintenance_manager",
        "technician",
        "operator",
        "warehouse_manager",
        "purchasing_manager",
        "production_manager",
        "viewer",
      ],
    },
  },
} as const
