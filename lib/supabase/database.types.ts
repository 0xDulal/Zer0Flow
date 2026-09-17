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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          occurred_at: string
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          occurred_at?: string
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          occurred_at?: string
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          lead_id: string
          tag_id: string
        }
        Insert: {
          lead_id: string
          tag_id: string
        }
        Update: {
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_name: string | null
          created_at: string
          deal_value: number
          email: string | null
          expected_close_date: string | null
          first_name: string | null
          full_name: string
          icp_score: number | null
          id: string
          job_title: string | null
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          next_action: string | null
          next_action_at: string | null
          niche: string | null
          notes: string | null
          opportunity_score: number | null
          phone: string | null
          probability: number
          source: Database["public"]["Enums"]["lead_source"]
          stage: Database["public"]["Enums"]["pipeline_stage"]
          status: Database["public"]["Enums"]["lead_status"]
          temperature: Database["public"]["Enums"]["lead_temperature"]
          updated_at: string
          website: string | null
          website_score: number | null
          workspace_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          deal_value?: number
          email?: string | null
          expected_close_date?: string | null
          first_name?: string | null
          full_name: string
          icp_score?: number | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          next_action?: string | null
          next_action_at?: string | null
          niche?: string | null
          notes?: string | null
          opportunity_score?: number | null
          phone?: string | null
          probability?: number
          source?: Database["public"]["Enums"]["lead_source"]
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          updated_at?: string
          website?: string | null
          website_score?: number | null
          workspace_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          deal_value?: number
          email?: string | null
          expected_close_date?: string | null
          first_name?: string | null
          full_name?: string
          icp_score?: number | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          next_action?: string | null
          next_action_at?: string | null
          niche?: string | null
          notes?: string | null
          opportunity_score?: number | null
          phone?: string | null
          probability?: number
          source?: Database["public"]["Enums"]["lead_source"]
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          updated_at?: string
          website?: string | null
          website_score?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      website_audits: {
        Row: {
          claim_token: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          facts: Json | null
          final_url: string | null
          id: string
          lead_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          updated_at: string
          url: string
          workspace_id: string
        }
        Insert: {
          claim_token?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          facts?: Json | null
          final_url?: string | null
          id?: string
          lead_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          updated_at?: string
          url: string
          workspace_id: string
        }
        Update: {
          claim_token?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          facts?: Json | null
          final_url?: string | null
          id?: string
          lead_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          updated_at?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_audits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_audits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_workspace: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      is_lead_in_member_workspace: {
        Args: { target_lead_id: string }
        Returns: boolean
      }
      is_tag_in_member_workspace: {
        Args: { target_tag_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "NOTE"
        | "LEAD_CREATED"
        | "WEBSITE_AUDIT"
        | "RESEARCH"
        | "CONNECTION_SENT"
        | "EMAIL_SENT"
        | "MESSAGE_SENT"
        | "REPLY_RECEIVED"
        | "CALL_BOOKED"
        | "CALL_COMPLETED"
        | "PROPOSAL_SENT"
        | "PROPOSAL_VIEWED"
        | "FOLLOW_UP"
        | "DEAL_WON"
        | "DEAL_LOST"
      audit_status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"
      lead_source: "LINKEDIN" | "COLD_EMAIL" | "REFERRAL" | "WEBSITE" | "OTHER"
      lead_status: "ACTIVE" | "PAUSED" | "WON" | "LOST" | "NURTURE"
      lead_temperature: "HOT" | "WARM" | "COLD" | "DORMANT"
      pipeline_stage:
        | "PROSPECT"
        | "RESEARCHED"
        | "CONTACTED"
        | "REPLIED"
        | "QUALIFIED"
        | "CALL_BOOKED"
        | "CALL_DONE"
        | "PROPOSAL"
        | "NEGOTIATION"
        | "WON"
        | "LOST"
        | "NURTURE"
      workspace_role: "owner" | "member"
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
      activity_type: [
        "NOTE",
        "LEAD_CREATED",
        "WEBSITE_AUDIT",
        "RESEARCH",
        "CONNECTION_SENT",
        "EMAIL_SENT",
        "MESSAGE_SENT",
        "REPLY_RECEIVED",
        "CALL_BOOKED",
        "CALL_COMPLETED",
        "PROPOSAL_SENT",
        "PROPOSAL_VIEWED",
        "FOLLOW_UP",
        "DEAL_WON",
        "DEAL_LOST",
      ],
      audit_status: ["QUEUED", "RUNNING", "COMPLETED", "FAILED"],
      lead_source: ["LINKEDIN", "COLD_EMAIL", "REFERRAL", "WEBSITE", "OTHER"],
      lead_status: ["ACTIVE", "PAUSED", "WON", "LOST", "NURTURE"],
      lead_temperature: ["HOT", "WARM", "COLD", "DORMANT"],
      pipeline_stage: [
        "PROSPECT",
        "RESEARCHED",
        "CONTACTED",
        "REPLIED",
        "QUALIFIED",
        "CALL_BOOKED",
        "CALL_DONE",
        "PROPOSAL",
        "NEGOTIATION",
        "WON",
        "LOST",
        "NURTURE",
      ],
      workspace_role: ["owner", "member"],
    },
  },
} as const
