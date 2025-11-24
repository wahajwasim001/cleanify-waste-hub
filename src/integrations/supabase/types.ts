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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      donations: {
        Row: {
          allocated_to: string | null
          amount_pkr: number
          created_at: string | null
          donation_type: string | null
          donor_email: string | null
          donor_name: string
          id: string
        }
        Insert: {
          allocated_to?: string | null
          amount_pkr: number
          created_at?: string | null
          donation_type?: string | null
          donor_email?: string | null
          donor_name: string
          id?: string
        }
        Update: {
          allocated_to?: string | null
          amount_pkr?: number
          created_at?: string | null
          donation_type?: string | null
          donor_email?: string | null
          donor_name?: string
          id?: string
        }
        Relationships: []
      }
      kiosks: {
        Row: {
          address: string
          created_at: string | null
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          name: string
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          name: string
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_pkr: number
          created_at: string | null
          id: string
          related_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_pkr: number
          created_at?: string | null
          id?: string
          related_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_pkr?: number
          created_at?: string | null
          id?: string
          related_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          updated_at: string | null
          wallet_balance: number
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          updated_at?: string | null
          wallet_balance?: number
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      recycling_transactions: {
        Row: {
          bottles: number | null
          cans: number | null
          citizen_id: string
          created_at: string | null
          id: string
          reward_pkr: number
          total_items: number | null
        }
        Insert: {
          bottles?: number | null
          cans?: number | null
          citizen_id: string
          created_at?: string | null
          id?: string
          reward_pkr?: number
          total_items?: number | null
        }
        Update: {
          bottles?: number | null
          cans?: number | null
          citizen_id?: string
          created_at?: string | null
          id?: string
          reward_pkr?: number
          total_items?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recycling_transactions_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_earnings: {
        Row: {
          amount_pkr: number
          created_at: string | null
          id: string
          is_leader: boolean | null
          payment_amount: number
          team_member_id: string
          waste_request_id: string
        }
        Insert: {
          amount_pkr: number
          created_at?: string | null
          id?: string
          is_leader?: boolean | null
          payment_amount?: number
          team_member_id: string
          waste_request_id: string
        }
        Update: {
          amount_pkr?: number
          created_at?: string | null
          id?: string
          is_leader?: boolean | null
          payment_amount?: number
          team_member_id?: string
          waste_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_earnings_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_earnings_waste_request_id_fkey"
            columns: ["waste_request_id"]
            isOneToOne: false
            referencedRelation: "waste_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_pkr: number
          created_at: string | null
          description: string | null
          id: string
          related_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount_pkr: number
          created_at?: string | null
          description?: string | null
          id?: string
          related_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount_pkr?: number
          created_at?: string | null
          description?: string | null
          id?: string
          related_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      waste_requests: {
        Row: {
          address: string | null
          after_photo_url: string | null
          assigned_member_id: string | null
          assigned_team_id: string | null
          before_photo_url: string | null
          citizen_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          number_of_bags: number
          photo_url: string | null
          reward_pkr: number
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          after_photo_url?: string | null
          assigned_member_id?: string | null
          assigned_team_id?: string | null
          before_photo_url?: string | null
          citizen_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          number_of_bags: number
          photo_url?: string | null
          reward_pkr?: number
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          after_photo_url?: string | null
          assigned_member_id?: string | null
          assigned_team_id?: string | null
          before_photo_url?: string | null
          citizen_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          number_of_bags?: number
          photo_url?: string | null
          reward_pkr?: number
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waste_requests_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_requests_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_requests_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      app_role: "admin" | "team_leader" | "team_member" | "citizen"
      payment_status: "pending" | "completed" | "failed"
      request_status: "pending" | "assigned" | "in_progress" | "completed"
      user_role: "citizen" | "cleaning_team" | "admin"
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
      app_role: ["admin", "team_leader", "team_member", "citizen"],
      payment_status: ["pending", "completed", "failed"],
      request_status: ["pending", "assigned", "in_progress", "completed"],
      user_role: ["citizen", "cleaning_team", "admin"],
    },
  },
} as const
