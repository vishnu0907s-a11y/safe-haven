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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          checked_in_at: string
          checked_out_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          status: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_out_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          status?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string
          checked_out_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          admin_level: string | null
          created_at: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_level?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          full_name: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_level?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      danger_zones: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          incident_count: number
          last_incident_at: string
          latitude: number
          longitude: number
          radius_meters: number
          risk_level: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          incident_count?: number
          last_incident_at?: string
          latitude: number
          longitude: number
          radius_meters?: number
          risk_level?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          incident_count?: number
          last_incident_at?: string
          latitude?: number
          longitude?: number
          radius_meters?: number
          risk_level?: string
        }
        Relationships: []
      }
      emergency_alerts: {
        Row: {
          accepted_by: string[] | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_by?: string[] | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_by?: string[] | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aadhaar_url: string | null
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          driving_license_url: string | null
          full_name: string
          id: string
          phone: string | null
          police_id: string | null
          station_name: string | null
          updated_at: string
          user_id: string
          vehicle_number: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          aadhaar_url?: string | null
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          driving_license_url?: string | null
          full_name: string
          id?: string
          phone?: string | null
          police_id?: string | null
          station_name?: string | null
          updated_at?: string
          user_id: string
          vehicle_number?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          aadhaar_url?: string | null
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          driving_license_url?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          police_id?: string | null
          station_name?: string | null
          updated_at?: string
          user_id?: string
          vehicle_number?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      rescue_records: {
        Row: {
          alert_id: string
          created_at: string
          feedback: string | null
          id: string
          points_awarded: number
          rating: number | null
          responder_id: string
          victim_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          points_awarded?: number
          rating?: number | null
          responder_id: string
          victim_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          points_awarded?: number
          rating?: number | null
          responder_id?: string
          victim_id?: string
        }
        Relationships: []
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
      super_admin_vault: {
        Row: {
          admin_email: string
          admin_name: string
          created_at: string | null
          id: string
          last_login_at: string | null
          pass1_hash: string
          pass2_hash: string
          pass3_hash: string
          secret_code_hash: string
          two_fa_enabled: boolean | null
        }
        Insert: {
          admin_email: string
          admin_name: string
          created_at?: string | null
          id?: string
          last_login_at?: string | null
          pass1_hash: string
          pass2_hash: string
          pass3_hash: string
          secret_code_hash: string
          two_fa_enabled?: boolean | null
        }
        Update: {
          admin_email?: string
          admin_name?: string
          created_at?: string | null
          id?: string
          last_login_at?: string | null
          pass1_hash?: string
          pass2_hash?: string
          pass3_hash?: string
          secret_code_hash?: string
          two_fa_enabled?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_nearest_police_stations: {
        Args: {
          user_lat: number
          user_lon: number
          max_count: number
        }
        Returns: {
          id: number
          name: string
          latitude: number
          longitude: number
          phone: string | null
          address: string | null
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_super_admin: {
        Args: {
          p_email: string
          p_pass1: string
          p_pass2: string
          p_pass3: string
          p_secret: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "women" | "driver" | "police" | "protector" | "admin"
      verification_status: "pending" | "verified" | "rejected"
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
      app_role: ["women", "driver", "police", "protector", "admin"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
