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
      access_logs: {
        Row: {
          additional_data: Json | null
          attempted_path: string
          created_at: string
          id: string
          ip_address: unknown
          reason: string
          session_id: string | null
          timestamp: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          additional_data?: Json | null
          attempted_path: string
          created_at?: string
          id?: string
          ip_address?: unknown
          reason: string
          session_id?: string | null
          timestamp?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          additional_data?: Json | null
          attempted_path?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          reason?: string
          session_id?: string | null
          timestamp?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          action_type: string | null
          admin_user_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          action_type?: string | null
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_type?: string | null
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_request_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string
          output_tokens: number | null
          provider: string
          source: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model: string
          output_tokens?: number | null
          provider: string
          source?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string
          output_tokens?: number | null
          provider?: string
          source?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          service_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          service_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          service_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          archived: boolean | null
          city: string | null
          correlation_id: string | null
          country_code: string | null
          created_at: string
          environment: string | null
          error_message: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          region: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string | null
          response_time_ms: number | null
          retention_until: string | null
          risk_score: number | null
          session_id: string | null
          severity: string
          source_system: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          archived?: boolean | null
          city?: string | null
          correlation_id?: string | null
          country_code?: string | null
          created_at?: string
          environment?: string | null
          error_message?: string | null
          event_details?: Json | null
          event_type: string
          id: string
          ip_address?: unknown
          region?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          response_time_ms?: number | null
          retention_until?: string | null
          risk_score?: number | null
          session_id?: string | null
          severity?: string
          source_system?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          archived?: boolean | null
          city?: string | null
          correlation_id?: string | null
          country_code?: string | null
          created_at?: string
          environment?: string | null
          error_message?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          region?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          response_time_ms?: number | null
          retention_until?: string | null
          risk_score?: number | null
          session_id?: string | null
          severity?: string
          source_system?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      budget_deletion_audit: {
        Row: {
          budget_data: Json
          budget_id: string
          can_restore: boolean | null
          created_at: string | null
          deleted_by: string
          deletion_reason: string | null
          deletion_type: string
          id: string
          parts_data: Json | null
        }
        Insert: {
          budget_data: Json
          budget_id: string
          can_restore?: boolean | null
          created_at?: string | null
          deleted_by: string
          deletion_reason?: string | null
          deletion_type: string
          id?: string
          parts_data?: Json | null
        }
        Update: {
          budget_data?: Json
          budget_id?: string
          can_restore?: boolean | null
          created_at?: string | null
          deleted_by?: string
          deletion_reason?: string | null
          deletion_type?: string
          id?: string
          parts_data?: Json | null
        }
        Relationships: []
      }
      budget_parts: {
        Row: {
          brand_id: string | null
          budget_id: string
          cash_price: number | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          installment_count: number
          installment_price: number | null
          name: string
          part_type: string | null
          price: number
          quantity: number
          warranty_months: number | null
        }
        Insert: {
          brand_id?: string | null
          budget_id: string
          cash_price?: number | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          installment_count?: number
          installment_price?: number | null
          name: string
          part_type?: string | null
          price: number
          quantity?: number
          warranty_months?: number | null
        }
        Update: {
          brand_id?: string | null
          budget_id?: string
          cash_price?: number | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          installment_count?: number
          installment_price?: number | null
          name?: string
          part_type?: string | null
          price?: number
          quantity?: number
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_parts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_budget_parts_budget_id"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          approved_at: string | null
          cash_price: number | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          custom_services: string | null
          deleted_at: string | null
          deleted_by: string | null
          delivery_confirmed_at: string | null
          delivery_date: string | null
          device_model: string
          device_type: string
          expires_at: string | null
          id: string
          includes_delivery: boolean | null
          includes_screen_protector: boolean | null
          installment_price: number | null
          installments: number | null
          is_delivered: boolean
          is_paid: boolean
          issue: string | null
          notes: string | null
          owner_id: string
          part_quality: string | null
          part_type: string | null
          payment_condition: string | null
          payment_confirmed_at: string | null
          search_vector: unknown
          sequential_number: number | null
          status: string
          total_price: number
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          warranty_months: number | null
          workflow_status: string
        }
        Insert: {
          approved_at?: string | null
          cash_price?: number | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          custom_services?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_confirmed_at?: string | null
          delivery_date?: string | null
          device_model: string
          device_type: string
          expires_at?: string | null
          id?: string
          includes_delivery?: boolean | null
          includes_screen_protector?: boolean | null
          installment_price?: number | null
          installments?: number | null
          is_delivered?: boolean
          is_paid?: boolean
          issue?: string | null
          notes?: string | null
          owner_id?: string
          part_quality?: string | null
          part_type?: string | null
          payment_condition?: string | null
          payment_confirmed_at?: string | null
          search_vector?: unknown
          sequential_number?: number | null
          status?: string
          total_price: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          warranty_months?: number | null
          workflow_status?: string
        }
        Update: {
          approved_at?: string | null
          cash_price?: number | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          custom_services?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_confirmed_at?: string | null
          delivery_date?: string | null
          device_model?: string
          device_type?: string
          expires_at?: string | null
          id?: string
          includes_delivery?: boolean | null
          includes_screen_protector?: boolean | null
          installment_price?: number | null
          installments?: number | null
          is_delivered?: boolean
          is_paid?: boolean
          issue?: string | null
          notes?: string | null
          owner_id?: string
          part_quality?: string | null
          part_type?: string | null
          payment_condition?: string | null
          payment_confirmed_at?: string | null
          search_vector?: unknown
          sequential_number?: number | null
          status?: string
          total_price?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          warranty_months?: number | null
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_budgets_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_mood: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          last_negative_at: string | null
          mood_level: number
          negative_interactions: number | null
          positive_interactions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          last_negative_at?: string | null
          mood_level?: number
          negative_interactions?: number | null
          positive_interactions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          last_negative_at?: string | null
          mood_level?: number
          negative_interactions?: number | null
          positive_interactions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chronic_problems: {
        Row: {
          created_at: string | null
          description: string | null
          device_model: string
          frequency: string | null
          id: string
          solution: string | null
          store_id: string
          symptom: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          device_model: string
          frequency?: string | null
          id?: string
          solution?: string | null
          store_id: string
          symptom: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          device_model?: string
          frequency?: string | null
          id?: string
          solution?: string | null
          store_id?: string
          symptom?: string
        }
        Relationships: [
          {
            foreignKeyName: "chronic_problems_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_logs: {
        Row: {
          cleanup_date: string | null
          created_at: string | null
          deleted_count: number
          details: Json | null
          id: string
        }
        Insert: {
          cleanup_date?: string | null
          created_at?: string | null
          deleted_count?: number
          details?: Json | null
          id?: string
        }
        Update: {
          cleanup_date?: string | null
          created_at?: string | null
          deleted_count?: number
          details?: Json | null
          id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_default: boolean | null
          is_favorite: boolean | null
          name: string
          notes: string | null
          phone: string
          state: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          name: string
          notes?: string | null
          phone: string
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          name?: string
          notes?: string | null
          phone?: string
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      company_info: {
        Row: {
          additional_images: string[] | null
          address: string | null
          business_hours: string | null
          cnpj: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          updated_at: string | null
          warranty_cancellation_terms: string | null
          warranty_legal_reminders: string | null
          website: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          additional_images?: string[] | null
          address?: string | null
          business_hours?: string | null
          cnpj?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id: string
          phone?: string | null
          updated_at?: string | null
          warranty_cancellation_terms?: string | null
          warranty_legal_reminders?: string | null
          website?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          additional_images?: string[] | null
          address?: string | null
          business_hours?: string | null
          cnpj?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string | null
          warranty_cancellation_terms?: string | null
          warranty_legal_reminders?: string | null
          website?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_info_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_share_settings: {
        Row: {
          created_at: string | null
          custom_message: string | null
          id: string
          owner_id: string
          show_address: boolean | null
          show_business_hours: boolean | null
          show_company_name: boolean | null
          show_description: boolean | null
          show_email: boolean | null
          show_logo: boolean | null
          show_phone: boolean | null
          show_special_instructions: boolean | null
          show_warranty_info: boolean | null
          show_welcome_message: boolean | null
          show_whatsapp_button: boolean | null
          special_instructions: string | null
          theme_color: string | null
          updated_at: string | null
          warranty_info: string | null
          welcome_message: string | null
        }
        Insert: {
          created_at?: string | null
          custom_message?: string | null
          id?: string
          owner_id: string
          show_address?: boolean | null
          show_business_hours?: boolean | null
          show_company_name?: boolean | null
          show_description?: boolean | null
          show_email?: boolean | null
          show_logo?: boolean | null
          show_phone?: boolean | null
          show_special_instructions?: boolean | null
          show_warranty_info?: boolean | null
          show_welcome_message?: boolean | null
          show_whatsapp_button?: boolean | null
          special_instructions?: string | null
          theme_color?: string | null
          updated_at?: string | null
          warranty_info?: string | null
          welcome_message?: string | null
        }
        Update: {
          created_at?: string | null
          custom_message?: string | null
          id?: string
          owner_id?: string
          show_address?: boolean | null
          show_business_hours?: boolean | null
          show_company_name?: boolean | null
          show_description?: boolean | null
          show_email?: boolean | null
          show_logo?: boolean | null
          show_phone?: boolean | null
          show_special_instructions?: boolean | null
          show_warranty_info?: boolean | null
          show_welcome_message?: boolean | null
          show_whatsapp_button?: boolean | null
          special_instructions?: string | null
          theme_color?: string | null
          updated_at?: string | null
          warranty_info?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_share_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: string | null
          discount_applied: number
          id: string
          order_id: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id?: string | null
          discount_applied: number
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string | null
          discount_applied?: number
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      device_test_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          device_info: Json | null
          expires_at: string | null
          id: string
          overall_score: number | null
          service_order_id: string | null
          share_token: string
          started_at: string | null
          status: string
          test_results: Json | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          overall_score?: number | null
          service_order_id?: string | null
          share_token: string
          started_at?: string | null
          status?: string
          test_results?: Json | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          overall_score?: number | null
          service_order_id?: string | null
          share_token?: string
          started_at?: string | null
          status?: string
          test_results?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_test_sessions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      device_types: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_purchase_amount: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_purchase_amount?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_purchase_amount?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      drippy_settings: {
        Row: {
          active_model: string
          active_provider: string
          created_at: string | null
          id: string
          max_tokens: number | null
          temperature: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active_model?: string
          active_provider?: string
          created_at?: string | null
          id?: string
          max_tokens?: number | null
          temperature?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active_model?: string
          active_provider?: string
          created_at?: string | null
          id?: string
          max_tokens?: number | null
          temperature?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      evolution_config: {
        Row: {
          api_url: string
          created_at: string
          global_api_key: string
          id: string
        }
        Insert: {
          api_url: string
          created_at?: string
          global_api_key: string
          id?: string
        }
        Update: {
          api_url?: string
          created_at?: string
          global_api_key?: string
          id?: string
        }
        Relationships: []
      }
      file_upload_audit: {
        Row: {
          created_at: string | null
          error_message: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          ip_address: string | null
          upload_path: string | null
          upload_status: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ip_address?: string | null
          upload_path?: string | null
          upload_status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ip_address?: string | null
          upload_path?: string | null
          upload_status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      game_settings: {
        Row: {
          boss_bug_damage: number | null
          boss_bug_points: number | null
          boss_bug_spawn_rate: number | null
          boss_bug_timer: number | null
          bug_damage: number | null
          bug_spawn_percentage: number | null
          created_at: string
          hit_sound_enabled: boolean | null
          hit_sound_volume: number | null
          id: string
          speed_bug_spawn_rate: number
          speed_bug_speed_multiplier: number
          updated_at: string
        }
        Insert: {
          boss_bug_damage?: number | null
          boss_bug_points?: number | null
          boss_bug_spawn_rate?: number | null
          boss_bug_timer?: number | null
          bug_damage?: number | null
          bug_spawn_percentage?: number | null
          created_at?: string
          hit_sound_enabled?: boolean | null
          hit_sound_volume?: number | null
          id?: string
          speed_bug_spawn_rate?: number
          speed_bug_speed_multiplier?: number
          updated_at?: string
        }
        Update: {
          boss_bug_damage?: number | null
          boss_bug_points?: number | null
          boss_bug_spawn_rate?: number | null
          boss_bug_timer?: number | null
          bug_damage?: number | null
          bug_spawn_percentage?: number | null
          created_at?: string
          hit_sound_enabled?: boolean | null
          hit_sound_volume?: number | null
          id?: string
          speed_bug_spawn_rate?: number
          speed_bug_speed_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      ia_configs: {
        Row: {
          active_topics: Json | null
          ai_name: string | null
          away_message: string | null
          created_at: string | null
          custom_knowledge: string | null
          id: string
          owner_id: string
          personality: string | null
          updated_at: string | null
          web_search_enabled: boolean | null
          welcome_message: string | null
        }
        Insert: {
          active_topics?: Json | null
          ai_name?: string | null
          away_message?: string | null
          created_at?: string | null
          custom_knowledge?: string | null
          id?: string
          owner_id: string
          personality?: string | null
          updated_at?: string | null
          web_search_enabled?: boolean | null
          welcome_message?: string | null
        }
        Update: {
          active_topics?: Json | null
          ai_name?: string | null
          away_message?: string | null
          created_at?: string | null
          custom_knowledge?: string | null
          id?: string
          owner_id?: string
          personality?: string | null
          updated_at?: string | null
          web_search_enabled?: boolean | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      ia_product_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          owner_id: string
          price_max: number | null
          price_min: number | null
          product_name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          owner_id: string
          price_max?: number | null
          price_min?: number | null
          product_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          owner_id?: string
          price_max?: number | null
          price_min?: number | null
          product_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ia_web_search_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          id: string
          owner_id: string
          provider: string | null
          query: string
          results_count: number | null
          tokens_used: number | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          id?: string
          owner_id: string
          provider?: string | null
          query: string
          results_count?: number | null
          tokens_used?: number | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          id?: string
          owner_id?: string
          provider?: string | null
          query?: string
          results_count?: number | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      kowalski_admin_notifications: {
        Row: {
          admin_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          admin_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          admin_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kowalski_allowed_groups: {
        Row: {
          created_at: string | null
          group_jid: string
          group_name: string | null
          id: string
          instance_id: string
          is_active: boolean | null
          mode: string | null
        }
        Insert: {
          created_at?: string | null
          group_jid: string
          group_name?: string | null
          id?: string
          instance_id: string
          is_active?: boolean | null
          mode?: string | null
        }
        Update: {
          created_at?: string | null
          group_jid?: string
          group_name?: string | null
          id?: string
          instance_id?: string
          is_active?: boolean | null
          mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kowalski_allowed_groups_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "kowalski_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      kowalski_instances: {
        Row: {
          created_at: string | null
          evolution_instance_id: string | null
          id: string
          instance_name: string
          is_active: boolean | null
          max_messages_per_hour: number | null
          max_messages_per_minute: number | null
          mode: string | null
          owner_id: string
          personality_override: Json | null
          response_delay_ms: number | null
          search_enabled: boolean | null
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          evolution_instance_id?: string | null
          id?: string
          instance_name: string
          is_active?: boolean | null
          max_messages_per_hour?: number | null
          max_messages_per_minute?: number | null
          mode?: string | null
          owner_id: string
          personality_override?: Json | null
          response_delay_ms?: number | null
          search_enabled?: boolean | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          evolution_instance_id?: string | null
          id?: string
          instance_name?: string
          is_active?: boolean | null
          max_messages_per_hour?: number | null
          max_messages_per_minute?: number | null
          mode?: string | null
          owner_id?: string
          personality_override?: Json | null
          response_delay_ms?: number | null
          search_enabled?: boolean | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kowalski_messages: {
        Row: {
          ai_context: Json | null
          ai_response: string | null
          budget_created_id: string | null
          created_at: string | null
          detected_intent: string | null
          error_message: string | null
          group_jid: string
          id: string
          incoming_content: string | null
          instance_id: string
          message_type: string
          processing_time_ms: number | null
          sender_name: string | null
          sender_phone: string
          status: string | null
        }
        Insert: {
          ai_context?: Json | null
          ai_response?: string | null
          budget_created_id?: string | null
          created_at?: string | null
          detected_intent?: string | null
          error_message?: string | null
          group_jid: string
          id?: string
          incoming_content?: string | null
          instance_id: string
          message_type: string
          processing_time_ms?: number | null
          sender_name?: string | null
          sender_phone: string
          status?: string | null
        }
        Update: {
          ai_context?: Json | null
          ai_response?: string | null
          budget_created_id?: string | null
          created_at?: string | null
          detected_intent?: string | null
          error_message?: string | null
          group_jid?: string
          id?: string
          incoming_content?: string | null
          instance_id?: string
          message_type?: string
          processing_time_ms?: number | null
          sender_name?: string | null
          sender_phone?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kowalski_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "kowalski_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      kowalski_rate_limits: {
        Row: {
          id: string
          instance_id: string
          message_count: number | null
          sender_phone: string
          window_start: string | null
        }
        Insert: {
          id?: string
          instance_id: string
          message_count?: number | null
          sender_phone: string
          window_start?: string | null
        }
        Update: {
          id?: string
          instance_id?: string
          message_count?: number | null
          sender_phone?: string
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kowalski_rate_limits_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "kowalski_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      kowalski_user_treatments: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string
          nickname: string
          phone_number: string
          treatment_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_id: string
          nickname: string
          phone_number: string
          treatment_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string
          nickname?: string
          phone_number?: string
          treatment_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kowalski_user_treatments_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "kowalski_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      license_activation_log: {
        Row: {
          activation_timestamp: string | null
          days_granted: number | null
          id: string
          ip_address: unknown
          license_code: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activation_timestamp?: string | null
          days_granted?: number | null
          id?: string
          ip_address?: unknown
          license_code: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activation_timestamp?: string | null
          days_granted?: number | null
          id?: string
          ip_address?: unknown
          license_code?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      license_cleanup_logs: {
        Row: {
          cleanup_date: string | null
          cleanup_type: string
          created_at: string | null
          deleted_count: number
          details: Json | null
          executed_by: string | null
          execution_time_ms: number | null
          id: string
          updated_count: number
        }
        Insert: {
          cleanup_date?: string | null
          cleanup_type: string
          created_at?: string | null
          deleted_count?: number
          details?: Json | null
          executed_by?: string | null
          execution_time_ms?: number | null
          id?: string
          updated_count?: number
        }
        Update: {
          cleanup_date?: string | null
          cleanup_type?: string
          created_at?: string | null
          deleted_count?: number
          details?: Json | null
          executed_by?: string | null
          execution_time_ms?: number | null
          id?: string
          updated_count?: number
        }
        Relationships: []
      }
      license_expiration_log: {
        Row: {
          created_at: string
          details: Json | null
          execution_time: string
          id: number
          updated_count: number
        }
        Insert: {
          created_at?: string
          details?: Json | null
          execution_time?: string
          id?: number
          updated_count?: number
        }
        Update: {
          created_at?: string
          details?: Json | null
          execution_time?: string
          id?: number
          updated_count?: number
        }
        Relationships: []
      }
      license_history: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          license_id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          license_id: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          license_id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "license_history_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "admin_license_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_history_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      license_validation_audit: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          ip_address: string | null
          license_id: string | null
          request_data: Json | null
          response_data: Json | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
          validation_result: Json | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          license_id?: string | null
          request_data?: Json | null
          response_data?: Json | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
          validation_result?: Json | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          license_id?: string | null
          request_data?: Json | null
          response_data?: Json | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
          validation_result?: Json | null
        }
        Relationships: []
      }
      licenses: {
        Row: {
          activated_at: string | null
          code: string
          created_at: string
          created_by_admin_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_validation: string | null
          license_type: string | null
          mercadopago_subscription_id: string | null
          metadata: Json | null
          notes: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          code: string
          created_at?: string
          created_by_admin_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_validation?: string | null
          license_type?: string | null
          mercadopago_subscription_id?: string | null
          metadata?: Json | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          code?: string
          created_at?: string
          created_by_admin_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_validation?: string | null
          license_type?: string | null
          mercadopago_subscription_id?: string | null
          metadata?: Json | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_mercadopago_subscription_id_fkey"
            columns: ["mercadopago_subscription_id"]
            isOneToOne: false
            referencedRelation: "mercadopago_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      mercadopago_subscription_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          subscription_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          subscription_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mercadopago_subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "mercadopago_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      mercadopago_subscriptions: {
        Row: {
          billing_interval: string
          cancel_at: string | null
          created_at: string
          id: string
          latest_payment_status: string | null
          mercadopago_preapproval_id: string
          next_billing_date: string | null
          plan_type: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval: string
          cancel_at?: string | null
          created_at?: string
          id?: string
          latest_payment_status?: string | null
          mercadopago_preapproval_id: string
          next_billing_date?: string | null
          plan_type: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          cancel_at?: string | null
          created_at?: string
          id?: string
          latest_payment_status?: string | null
          mercadopago_preapproval_id?: string
          next_billing_date?: string | null
          plan_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_views: {
        Row: {
          id: string
          notification_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          notification_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          notification_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_views_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          message: string
          target_type: string
          target_user_id: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          target_type: string
          target_user_id?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          target_type?: string
          target_user_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      os_pdf_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          template_content: string
          template_name: string
          template_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          template_content: string
          template_name: string
          template_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          template_content?: string
          template_name?: string
          template_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          mercadopago_payment_id: string | null
          mercadopago_preapproval_id: string | null
          metadata: Json | null
          payment_method: string | null
          plan_type: string
          shopify_checkout_id: string | null
          shopify_order_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_preapproval_id?: string | null
          metadata?: Json | null
          payment_method?: string | null
          plan_type: string
          shopify_checkout_id?: string | null
          shopify_order_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_preapproval_id?: string | null
          metadata?: Json | null
          payment_method?: string | null
          plan_type?: string
          shopify_checkout_id?: string | null
          shopify_order_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pdf_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          service_section_template: string
          template_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          service_section_template: string
          template_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          service_section_template?: string
          template_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      peliculas_compatíveis: {
        Row: {
          compatibilidades: string[]
          created_at: string | null
          id: string
          modelo: string
          updated_at: string | null
        }
        Insert: {
          compatibilidades: string[]
          created_at?: string | null
          id?: string
          modelo: string
          updated_at?: string | null
        }
        Update: {
          compatibilidades?: string[]
          created_at?: string | null
          id?: string
          modelo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      peliculas_suggestions: {
        Row: {
          brand: string | null
          created_at: string | null
          id: string
          model: string
          notes: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          id?: string
          model: string
          notes?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          id?: string
          model?: string
          notes?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      persistent_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_name: string | null
          device_type: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_trusted: boolean
          last_activity: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          device_type?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_trusted?: boolean
          last_activity?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          device_type?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_trusted?: boolean
          last_activity?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pix_transactions: {
        Row: {
          amount: number
          created_at: string | null
          expires_at: string | null
          external_reference: string | null
          id: string
          mercado_pago_id: string | null
          plan_type: string
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          expires_at?: string | null
          external_reference?: string | null
          id?: string
          mercado_pago_id?: string | null
          plan_type: string
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          expires_at?: string | null
          external_reference?: string | null
          id?: string
          mercado_pago_id?: string | null
          plan_type?: string
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      purchase_registrations: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          license_code: string | null
          license_id: string | null
          mercadopago_payment_id: string | null
          metadata: Json | null
          payment_id: string | null
          payment_method: string | null
          plan_id: string | null
          plan_type: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          license_code?: string | null
          license_id?: string | null
          mercadopago_payment_id?: string | null
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          plan_id?: string | null
          plan_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          license_code?: string | null
          license_id?: string | null
          mercadopago_payment_id?: string | null
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          plan_id?: string | null
          plan_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_registrations_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "admin_license_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_registrations_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_registrations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_logs: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          delivered_at: string | null
          dismissed_at: string | null
          error_message: string | null
          id: string
          notification_id: string
          response_data: Json | null
          sent_at: string | null
          status: string
          subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          dismissed_at?: string | null
          error_message?: string | null
          id?: string
          notification_id: string
          response_data?: Json | null
          sent_at?: string | null
          status: string
          subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          dismissed_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string
          response_data?: Json | null
          sent_at?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "push_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notification_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notifications: {
        Row: {
          actions: Json | null
          badge: string | null
          body: string
          click_action: string | null
          created_at: string | null
          created_by: string
          data: Json | null
          expires_at: string | null
          icon: string | null
          id: string
          image: string | null
          is_active: boolean | null
          metadata: Json | null
          priority: number | null
          require_interaction: boolean | null
          scheduled_at: string | null
          silent: boolean | null
          target_group: string | null
          target_role: string | null
          target_type: string
          target_user_id: string | null
          title: string
          total_delivered: number | null
          total_failed: number | null
          total_sent: number | null
          vibrate: number[] | null
        }
        Insert: {
          actions?: Json | null
          badge?: string | null
          body: string
          click_action?: string | null
          created_at?: string | null
          created_by: string
          data?: Json | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          priority?: number | null
          require_interaction?: boolean | null
          scheduled_at?: string | null
          silent?: boolean | null
          target_group?: string | null
          target_role?: string | null
          target_type: string
          target_user_id?: string | null
          title: string
          total_delivered?: number | null
          total_failed?: number | null
          total_sent?: number | null
          vibrate?: number[] | null
        }
        Update: {
          actions?: Json | null
          badge?: string | null
          body?: string
          click_action?: string | null
          created_at?: string | null
          created_by?: string
          data?: Json | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          priority?: number | null
          require_interaction?: boolean | null
          scheduled_at?: string | null
          silent?: boolean | null
          target_group?: string | null
          target_role?: string | null
          target_type?: string
          target_user_id?: string | null
          title?: string
          total_delivered?: number | null
          total_failed?: number | null
          total_sent?: number | null
          vibrate?: number[] | null
        }
        Relationships: []
      }
      ranking_invaders: {
        Row: {
          created_at: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_invaders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_tracking: {
        Row: {
          action_type: string
          attempt_count: number | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action_type: string
          attempt_count?: number | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action_type?: string
          attempt_count?: number | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      rate_limiting: {
        Row: {
          block_expires_at: string | null
          block_reason: string | null
          created_at: string
          endpoint: string | null
          id: string
          is_blocked: boolean
          key_type: string
          key_value: string
          last_request_at: string
          method: string | null
          penalty_expires_at: string | null
          penalty_level: number
          request_count: number
          spam_score: number
          updated_at: string
          user_agent: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          block_expires_at?: string | null
          block_reason?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          is_blocked?: boolean
          key_type: string
          key_value: string
          last_request_at?: string
          method?: string | null
          penalty_expires_at?: string | null
          penalty_level?: number
          request_count?: number
          spam_score?: number
          updated_at?: string
          user_agent?: string | null
          window_end: string
          window_start: string
        }
        Update: {
          block_expires_at?: string | null
          block_reason?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          is_blocked?: boolean
          key_type?: string
          key_value?: string
          last_request_at?: string
          method?: string | null
          penalty_expires_at?: string | null
          penalty_level?: number
          request_count?: number
          spam_score?: number
          updated_at?: string
          user_agent?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      repair_dashboard_columns: {
        Row: {
          created_at: string
          id: string
          show_assistant_profit: boolean
          show_charged_amount: boolean
          show_cost_amount: boolean
          show_technician_profit: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          show_assistant_profit?: boolean
          show_charged_amount?: boolean
          show_cost_amount?: boolean
          show_technician_profit?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          show_assistant_profit?: boolean
          show_charged_amount?: boolean
          show_cost_amount?: boolean
          show_technician_profit?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repair_dashboard_layout: {
        Row: {
          created_at: string
          id: string
          show_assistant_net_profit: boolean
          show_monthly_revenue: boolean
          show_parts_costs: boolean
          show_technician_profit: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          show_assistant_net_profit?: boolean
          show_monthly_revenue?: boolean
          show_parts_costs?: boolean
          show_technician_profit?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          show_assistant_net_profit?: boolean
          show_monthly_revenue?: boolean
          show_parts_costs?: boolean
          show_technician_profit?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repair_monthly_closings: {
        Row: {
          closed_at: string
          id: string
          notes: string | null
          reference_month: string
          status: string
          total_commissions: number
          total_net_profit: number
          total_revenue: number
          total_services: number
          user_id: string
        }
        Insert: {
          closed_at?: string
          id?: string
          notes?: string | null
          reference_month: string
          status?: string
          total_commissions?: number
          total_net_profit?: number
          total_revenue?: number
          total_services?: number
          user_id: string
        }
        Update: {
          closed_at?: string
          id?: string
          notes?: string | null
          reference_month?: string
          status?: string
          total_commissions?: number
          total_net_profit?: number
          total_revenue?: number
          total_services?: number
          user_id?: string
        }
        Relationships: []
      }
      repair_services: {
        Row: {
          archived_at: string | null
          charged_amount: number
          client_name: string | null
          client_phone: string | null
          closing_id: string | null
          commission_amount: number | null
          cost_amount: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          device_checklist: Json | null
          device_name: string
          device_password_metadata: Json | null
          device_password_type: string | null
          device_password_value: string | null
          has_commission: boolean | null
          id: string
          imei_serial: string | null
          net_profit: number | null
          service_description: string
          service_order_number: string | null
          technician_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          charged_amount?: number
          client_name?: string | null
          client_phone?: string | null
          closing_id?: string | null
          commission_amount?: number | null
          cost_amount?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          device_checklist?: Json | null
          device_name: string
          device_password_metadata?: Json | null
          device_password_type?: string | null
          device_password_value?: string | null
          has_commission?: boolean | null
          id?: string
          imei_serial?: string | null
          net_profit?: number | null
          service_description: string
          service_order_number?: string | null
          technician_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          charged_amount?: number
          client_name?: string | null
          client_phone?: string | null
          closing_id?: string | null
          commission_amount?: number | null
          cost_amount?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          device_checklist?: Json | null
          device_name?: string
          device_password_metadata?: Json | null
          device_password_type?: string | null
          device_password_value?: string | null
          has_commission?: boolean | null
          id?: string
          imei_serial?: string | null
          net_profit?: number | null
          service_description?: string
          service_order_number?: string | null
          technician_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_services_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "repair_monthly_closings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_services_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "repair_technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_technician_vales_monthly: {
        Row: {
          commissions_gross: number
          commissions_net: number
          created_at: string
          id: string
          reference_month: string
          updated_at: string
          user_id: string
          vale_amount: number
        }
        Insert: {
          commissions_gross?: number
          commissions_net?: number
          created_at?: string
          id?: string
          reference_month: string
          updated_at?: string
          user_id: string
          vale_amount?: number
        }
        Update: {
          commissions_gross?: number
          commissions_net?: number
          created_at?: string
          id?: string
          reference_month?: string
          updated_at?: string
          user_id?: string
          vale_amount?: number
        }
        Relationships: []
      }
      repair_technicians: {
        Row: {
          created_at: string
          default_commission_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_commission_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_commission_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          affected_entities: Json | null
          alert_group: string | null
          alert_type: string
          confidence_level: number | null
          correlation_id: string | null
          created_at: string | null
          description: string | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_level: number | null
          event_data: Json | null
          expires_at: string | null
          id: string
          last_notification_at: string | null
          metadata: Json | null
          notification_attempts: number | null
          notification_channels: Json | null
          notification_sent: boolean | null
          parent_alert_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          risk_score: number | null
          severity: string
          source_function: string | null
          source_system: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          affected_entities?: Json | null
          alert_group?: string | null
          alert_type: string
          confidence_level?: number | null
          correlation_id?: string | null
          created_at?: string | null
          description?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          event_data?: Json | null
          expires_at?: string | null
          id?: string
          last_notification_at?: string | null
          metadata?: Json | null
          notification_attempts?: number | null
          notification_channels?: Json | null
          notification_sent?: boolean | null
          parent_alert_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_score?: number | null
          severity: string
          source_function?: string | null
          source_system?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          affected_entities?: Json | null
          alert_group?: string | null
          alert_type?: string
          confidence_level?: number | null
          correlation_id?: string | null
          created_at?: string | null
          description?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          event_data?: Json | null
          expires_at?: string | null
          id?: string
          last_notification_at?: string | null
          metadata?: Json | null
          notification_attempts?: number | null
          notification_channels?: Json | null
          notification_sent?: boolean | null
          parent_alert_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_score?: number | null
          severity?: string
          source_function?: string | null
          source_system?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_parent_alert_id_fkey"
            columns: ["parent_alert_id"]
            isOneToOne: false
            referencedRelation: "security_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_attachments: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          service_order_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          service_order_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          service_order_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_attachments_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_message: string | null
          customer_visible: boolean | null
          event_type: string
          id: string
          notification_sent: boolean | null
          payload: Json | null
          service_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_message?: string | null
          customer_visible?: boolean | null
          event_type: string
          id?: string
          notification_sent?: boolean | null
          payload?: Json | null
          service_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_message?: string | null
          customer_visible?: boolean | null
          event_type?: string
          id?: string
          notification_sent?: boolean | null
          payload?: Json | null
          service_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_events_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_images: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          height: number | null
          id: string
          image_index: number | null
          is_compressed: boolean | null
          metadata: Json | null
          mime_type: string
          original_filename: string | null
          original_format: string | null
          original_size: number | null
          processed_filename: string | null
          processed_format: string | null
          processed_size: number | null
          service_order_id: string | null
          storage_path: string | null
          thumbnail_path: string | null
          upload_order: number
          upload_status: string | null
          uploaded_by: string | null
          uploadthing_key: string
          uploadthing_url: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          height?: number | null
          id?: string
          image_index?: number | null
          is_compressed?: boolean | null
          metadata?: Json | null
          mime_type: string
          original_filename?: string | null
          original_format?: string | null
          original_size?: number | null
          processed_filename?: string | null
          processed_format?: string | null
          processed_size?: number | null
          service_order_id?: string | null
          storage_path?: string | null
          thumbnail_path?: string | null
          upload_order?: number
          upload_status?: string | null
          uploaded_by?: string | null
          uploadthing_key: string
          uploadthing_url: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          height?: number | null
          id?: string
          image_index?: number | null
          is_compressed?: boolean | null
          metadata?: Json | null
          mime_type?: string
          original_filename?: string | null
          original_format?: string | null
          original_size?: number | null
          processed_filename?: string | null
          processed_format?: string | null
          processed_size?: number | null
          service_order_id?: string | null
          storage_path?: string | null
          thumbnail_path?: string | null
          upload_order?: number
          upload_status?: string | null
          uploaded_by?: string | null
          uploadthing_key?: string
          uploadthing_url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_images_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_items: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          item_type: string | null
          name: string
          notes: string | null
          quantity: number | null
          service_order_id: string | null
          unit_price: number
          warranty_months: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          item_type?: string | null
          name: string
          notes?: string | null
          quantity?: number | null
          service_order_id?: string | null
          unit_price: number
          warranty_months?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          item_type?: string | null
          name?: string
          notes?: string | null
          quantity?: number | null
          service_order_id?: string | null
          unit_price?: number
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_photos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          photo_type: string | null
          photo_url: string
          service_order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          photo_type?: string | null
          photo_url: string
          service_order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          photo_type?: string | null
          photo_url?: string
          service_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_photos_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_shares: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          service_order_id: string
          share_token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          service_order_id: string
          share_token?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          service_order_id?: string
          share_token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_shares_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          actual_completion: string | null
          client_id: string | null
          created_at: string | null
          customer_notes: string | null
          customer_visible: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          delivery_date: string | null
          device_checklist: Json | null
          device_model: string
          device_password_metadata: Json | null
          device_password_type: string | null
          device_password_value: string | null
          device_type: string
          entry_date: string | null
          estimated_completion: string | null
          exit_date: string | null
          id: string
          imei_serial: string | null
          is_paid: boolean | null
          labor_cost: number | null
          last_customer_update: string | null
          notes: string | null
          owner_id: string
          parts_cost: number | null
          payment_status: string | null
          priority: string | null
          reported_issue: string
          search_vector: unknown
          sequential_number: number | null
          status: string | null
          technician_notes: string | null
          total_price: number | null
          updated_at: string | null
          warranty_months: number | null
        }
        Insert: {
          actual_completion?: string | null
          client_id?: string | null
          created_at?: string | null
          customer_notes?: string | null
          customer_visible?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_date?: string | null
          device_checklist?: Json | null
          device_model: string
          device_password_metadata?: Json | null
          device_password_type?: string | null
          device_password_value?: string | null
          device_type: string
          entry_date?: string | null
          estimated_completion?: string | null
          exit_date?: string | null
          id?: string
          imei_serial?: string | null
          is_paid?: boolean | null
          labor_cost?: number | null
          last_customer_update?: string | null
          notes?: string | null
          owner_id?: string
          parts_cost?: number | null
          payment_status?: string | null
          priority?: string | null
          reported_issue: string
          search_vector?: unknown
          sequential_number?: number | null
          status?: string | null
          technician_notes?: string | null
          total_price?: number | null
          updated_at?: string | null
          warranty_months?: number | null
        }
        Update: {
          actual_completion?: string | null
          client_id?: string | null
          created_at?: string | null
          customer_notes?: string | null
          customer_visible?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_date?: string | null
          device_checklist?: Json | null
          device_model?: string
          device_password_metadata?: Json | null
          device_password_type?: string | null
          device_password_value?: string | null
          device_type?: string
          entry_date?: string | null
          estimated_completion?: string | null
          exit_date?: string | null
          id?: string
          imei_serial?: string | null
          is_paid?: boolean | null
          labor_cost?: number | null
          last_customer_update?: string | null
          notes?: string | null
          owner_id?: string
          parts_cost?: number | null
          payment_status?: string | null
          priority?: string | null
          reported_issue?: string
          search_vector?: unknown
          sequential_number?: number | null
          status?: string | null
          technician_notes?: string | null
          total_price?: number | null
          updated_at?: string | null
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_service_orders_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      service_sync_links: {
        Row: {
          budget_part_id: string
          created_at: string
          id: string
          last_synced_at: string
          owner_id: string
          store_service_id: string
          sync_direction: string
        }
        Insert: {
          budget_part_id: string
          created_at?: string
          id?: string
          last_synced_at?: string
          owner_id: string
          store_service_id: string
          sync_direction?: string
        }
        Update: {
          budget_part_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string
          owner_id?: string
          store_service_id?: string
          sync_direction?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_sync_links_budget_part_id_fkey"
            columns: ["budget_part_id"]
            isOneToOne: true
            referencedRelation: "budget_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_sync_links_store_service_id_fkey"
            columns: ["store_service_id"]
            isOneToOne: true
            referencedRelation: "store_services"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          active: boolean | null
          additional_images: string[] | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          installment_price: number | null
          interest_rate: number | null
          max_installments: number | null
          name: string
          price: number | null
          store_id: string
          video_urls: string[] | null
        }
        Insert: {
          active?: boolean | null
          additional_images?: string[] | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          installment_price?: number | null
          interest_rate?: number | null
          max_installments?: number | null
          name: string
          price?: number | null
          store_id: string
          video_urls?: string[] | null
        }
        Update: {
          active?: boolean | null
          additional_images?: string[] | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          installment_price?: number | null
          interest_rate?: number | null
          max_installments?: number | null
          name?: string
          price?: number | null
          store_id?: string
          video_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_profiles: {
        Row: {
          address: string
          cnpj: string | null
          contact_phone: string
          created_at: string
          id: string
          logo_url: string | null
          shop_name: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          address: string
          cnpj?: string | null
          contact_phone: string
          created_at?: string
          id?: string
          logo_url?: string | null
          shop_name: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          address?: string
          cnpj?: string | null
          contact_phone?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          shop_name?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_events: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          risk_level: string | null
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          risk_level?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          risk_level?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          additional_info: string
          benefits_data: Json | null
          benefits_section_subtitle: string | null
          benefits_section_title: string | null
          created_at: string
          cta_button_text: string
          default_budget_validity_days: number
          dev_warning_message: string | null
          dev_warning_title: string | null
          faq_data: Json | null
          faq_section_subtitle: string | null
          faq_section_title: string | null
          id: string
          page_subtitle: string
          page_title: string
          payment_url: string
          plan_currency: string
          plan_description: string
          plan_features: Json
          plan_name: string
          plan_period: string
          plan_price: number
          popular_badge_text: string
          show_benefits_section: boolean | null
          show_dev_warning: boolean
          show_faq_section: boolean | null
          show_popular_badge: boolean
          show_support_info: boolean
          show_testimonials_section: boolean | null
          support_text: string
          testimonials_data: Json | null
          testimonials_section_subtitle: string | null
          testimonials_section_title: string | null
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          additional_info?: string
          benefits_data?: Json | null
          benefits_section_subtitle?: string | null
          benefits_section_title?: string | null
          created_at?: string
          cta_button_text?: string
          default_budget_validity_days?: number
          dev_warning_message?: string | null
          dev_warning_title?: string | null
          faq_data?: Json | null
          faq_section_subtitle?: string | null
          faq_section_title?: string | null
          id?: string
          page_subtitle?: string
          page_title?: string
          payment_url?: string
          plan_currency?: string
          plan_description?: string
          plan_features?: Json
          plan_name?: string
          plan_period?: string
          plan_price?: number
          popular_badge_text?: string
          show_benefits_section?: boolean | null
          show_dev_warning?: boolean
          show_faq_section?: boolean | null
          show_popular_badge?: boolean
          show_support_info?: boolean
          show_testimonials_section?: boolean | null
          support_text?: string
          testimonials_data?: Json | null
          testimonials_section_subtitle?: string | null
          testimonials_section_title?: string | null
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          additional_info?: string
          benefits_data?: Json | null
          benefits_section_subtitle?: string | null
          benefits_section_title?: string | null
          created_at?: string
          cta_button_text?: string
          default_budget_validity_days?: number
          dev_warning_message?: string | null
          dev_warning_title?: string | null
          faq_data?: Json | null
          faq_section_subtitle?: string | null
          faq_section_title?: string | null
          id?: string
          page_subtitle?: string
          page_title?: string
          payment_url?: string
          plan_currency?: string
          plan_description?: string
          plan_features?: Json
          plan_name?: string
          plan_period?: string
          plan_price?: number
          popular_badge_text?: string
          show_benefits_section?: boolean | null
          show_dev_warning?: boolean
          show_faq_section?: boolean | null
          show_popular_badge?: boolean
          show_support_info?: boolean
          show_testimonials_section?: boolean | null
          support_text?: string
          testimonials_data?: Json | null
          testimonials_section_subtitle?: string | null
          testimonials_section_title?: string | null
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      spam_patterns: {
        Row: {
          block_duration_minutes: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          pattern_name: string
          pattern_type: string
          penalty_multiplier: number
          regex_pattern: string | null
          severity: string
          threshold_value: number
          time_window_minutes: number
          updated_at: string
        }
        Insert: {
          block_duration_minutes?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          pattern_name: string
          pattern_type: string
          penalty_multiplier?: number
          regex_pattern?: string | null
          severity: string
          threshold_value: number
          time_window_minutes: number
          updated_at?: string
        }
        Update: {
          block_duration_minutes?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          pattern_name?: string
          pattern_type?: string
          penalty_multiplier?: number
          regex_pattern?: string | null
          severity?: string
          threshold_value?: number
          time_window_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_brands: {
        Row: {
          created_at: string | null
          id: string
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_brands_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_budgets: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          device_imei: string | null
          device_model: string
          id: string
          items: Json | null
          notes: string | null
          problem_description: string | null
          public_token: string | null
          status: string | null
          store_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          device_imei?: string | null
          device_model: string
          id?: string
          items?: Json | null
          notes?: string | null
          problem_description?: string | null
          public_token?: string | null
          status?: string | null
          store_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          device_imei?: string | null
          device_model?: string
          id?: string
          items?: Json | null
          notes?: string | null
          problem_description?: string | null
          public_token?: string | null
          status?: string | null
          store_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_budgets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_devices: {
        Row: {
          brand_id: string | null
          chronic_issues: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          store_id: string
        }
        Insert: {
          brand_id?: string | null
          chronic_issues?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          store_id: string
        }
        Update: {
          brand_id?: string | null
          chronic_issues?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_devices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "store_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_devices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          device_id: string | null
          estimated_time_minutes: number | null
          id: string
          installment_price: number | null
          interest_rate: number | null
          is_active: boolean | null
          max_installments: number | null
          name: string
          price: number | null
          store_id: string
          warranty_days: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          device_id?: string | null
          estimated_time_minutes?: number | null
          id?: string
          installment_price?: number | null
          interest_rate?: number | null
          is_active?: boolean | null
          max_installments?: number | null
          name: string
          price?: number | null
          store_id: string
          warranty_days?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          device_id?: string | null
          estimated_time_minutes?: number | null
          id?: string
          installment_price?: number | null
          interest_rate?: number | null
          is_active?: boolean | null
          max_installments?: number | null
          name?: string
          price?: number | null
          store_id?: string
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_services_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "store_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_services_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          banner_url: string | null
          contact_info: Json | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          policies: Json | null
          slug: string
          theme_config: Json | null
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          policies?: Json | null
          slug: string
          theme_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          policies?: Json | null
          slug?: string
          theme_config?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean | null
          created_at: string
          days: number
          description: string | null
          features: string[] | null
          id: string
          name: string
          plan_type: string
          price: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          days?: number
          description?: string | null
          features?: string[] | null
          id?: string
          name: string
          plan_type: string
          price: number
        }
        Update: {
          active?: boolean | null
          created_at?: string
          days?: number
          description?: string | null
          features?: string[] | null
          id?: string
          name?: string
          plan_type?: string
          price?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json | null
          plan_type: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          plan_type: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          plan_type?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          log_level: string
          message: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          log_level: string
          message: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          log_level?: string
          message?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_status: {
        Row: {
          created_at: string | null
          estimated_resolution: string | null
          id: string
          maintenance_mode_active: boolean | null
          message: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_resolution?: string | null
          id?: string
          maintenance_mode_active?: boolean | null
          message: string
          status: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_resolution?: string | null
          id?: string
          maintenance_mode_active?: boolean | null
          message?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      updates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          link_text: string | null
          link_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          ip_address: unknown
          metadata: Json | null
          timestamp: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          timestamp?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          timestamp?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          recorded_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value?: number
          recorded_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          recorded_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hint: string | null
          service_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_key: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hint?: string | null
          service_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hint?: string | null
          service_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_cookie_preferences: {
        Row: {
          analytics: boolean
          auto_cleanup: boolean
          created_at: string
          essential: boolean
          expiration_days: number
          functional: boolean
          granular: Json
          id: string
          marketing: boolean
          performance: boolean
          social: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analytics?: boolean
          auto_cleanup?: boolean
          created_at?: string
          essential?: boolean
          expiration_days?: number
          functional?: boolean
          granular?: Json
          id?: string
          marketing?: boolean
          performance?: boolean
          social?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analytics?: boolean
          auto_cleanup?: boolean
          created_at?: string
          essential?: boolean
          expiration_days?: number
          functional?: boolean
          granular?: Json
          id?: string
          marketing?: boolean
          performance?: boolean
          social?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_evolution_config: {
        Row: {
          api_key: string
          api_url: string
          created_at: string
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          api_key: string
          api_url: string
          created_at?: string
          id?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_license_analytics: {
        Row: {
          action_date: string | null
          action_type: string
          created_at: string | null
          id: string
          license_id: string | null
          metadata: Json | null
          performed_by: string | null
          user_id: string | null
        }
        Insert: {
          action_date?: string | null
          action_type: string
          created_at?: string | null
          id?: string
          license_id?: string | null
          metadata?: Json | null
          performed_by?: string | null
          user_id?: string | null
        }
        Update: {
          action_date?: string | null
          action_type?: string
          created_at?: string | null
          id?: string
          license_id?: string | null
          metadata?: Json | null
          performed_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_license_bulk_operations: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          license_data: Json | null
          operation_type: string
          performed_by: string | null
          results: Json | null
          status: string | null
          user_ids: string[]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          license_data?: Json | null
          operation_type: string
          performed_by?: string | null
          results?: Json | null
          status?: string | null
          user_ids: string[]
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          license_data?: Json | null
          operation_type?: string
          performed_by?: string | null
          results?: Json | null
          status?: string | null
          user_ids?: string[]
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          delivery_status: string | null
          id: string
          notification_id: string
          read_at: string | null
          sent_at: string | null
          user_deleted_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_status?: string | null
          id?: string
          notification_id: string
          read_at?: string | null
          sent_at?: string | null
          user_deleted_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_status?: string | null
          id?: string
          notification_id?: string
          read_at?: string | null
          sent_at?: string | null
          user_deleted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications_read: {
        Row: {
          id: string
          is_deleted: boolean | null
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_deleted?: boolean | null
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_deleted?: boolean | null
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_read_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          advanced_features_enabled: boolean
          budget_limit: number | null
          budget_warning_days: number
          budget_warning_enabled: boolean
          created_at: string
          id: string
          name: string
          onboarding_completed: boolean
          role: string | null
          updated_at: string
          updated_by: string | null
          username: string | null
        }
        Insert: {
          advanced_features_enabled?: boolean
          budget_limit?: number | null
          budget_warning_days?: number
          budget_warning_enabled?: boolean
          created_at?: string
          id: string
          name: string
          onboarding_completed?: boolean
          role?: string | null
          updated_at?: string
          updated_by?: string | null
          username?: string | null
        }
        Update: {
          advanced_features_enabled?: boolean
          budget_limit?: number | null
          budget_warning_days?: number
          budget_warning_enabled?: boolean
          created_at?: string
          id?: string
          name?: string
          onboarding_completed?: boolean
          role?: string | null
          updated_at?: string
          updated_by?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh_key: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh_key: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh_key?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sequence_control_budgets: {
        Row: {
          created_at: string | null
          current_number: number
          id: string
          last_reset_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_number?: number
          id?: string
          last_reset_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_number?: number
          id?: string
          last_reset_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sequence_control_service_orders: {
        Row: {
          created_at: string | null
          current_number: number
          id: string
          last_reset_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_number?: number
          id?: string
          last_reset_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_number?: number
          id?: string
          last_reset_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_update_preferences: {
        Row: {
          created_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          id: string
          update_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          update_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_update_preferences_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          charged_amount: number | null
          client_name: string | null
          client_phone: string | null
          cost_amount: number | null
          created_at: string | null
          deleted_at: string | null
          device_checklist: Json | null
          device_name: string | null
          id: string
          imei_serial: string | null
          owner_id: string
          reason: string
          reopen_count: number
          repair_service_id: string | null
          service_description: string | null
          service_order_id: string | null
          status: string
          technician_name: string | null
          updated_at: string | null
        }
        Insert: {
          charged_amount?: number | null
          client_name?: string | null
          client_phone?: string | null
          cost_amount?: number | null
          created_at?: string | null
          deleted_at?: string | null
          device_checklist?: Json | null
          device_name?: string | null
          id?: string
          imei_serial?: string | null
          owner_id: string
          reason: string
          reopen_count?: number
          repair_service_id?: string | null
          service_description?: string | null
          service_order_id?: string | null
          status?: string
          technician_name?: string | null
          updated_at?: string | null
        }
        Update: {
          charged_amount?: number | null
          client_name?: string | null
          client_phone?: string | null
          cost_amount?: number | null
          created_at?: string | null
          deleted_at?: string | null
          device_checklist?: Json | null
          device_name?: string | null
          id?: string
          imei_serial?: string | null
          owner_id?: string
          reason?: string
          reopen_count?: number
          repair_service_id?: string | null
          service_description?: string | null
          service_order_id?: string | null
          status?: string
          technician_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_repair_service_id_fkey"
            columns: ["repair_service_id"]
            isOneToOne: false
            referencedRelation: "repair_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_periods: {
        Row: {
          created_at: string
          id: string
          label: string
          months: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          months: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          months?: number
        }
        Relationships: []
      }
      whatsapp_agents: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          model: string
          name: string
          owner_id: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          name: string
          owner_id: string
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          name?: string
          owner_id?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          ai_paused: boolean
          ai_paused_at: string | null
          ai_paused_by: string | null
          assigned_to: string | null
          client_id: string | null
          created_at: string
          id: string
          instance_id: string | null
          last_message_at: string | null
          owner_id: string
          phone_number: string
          remote_jid: string | null
          remote_jid_alt: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_paused?: boolean
          ai_paused_at?: string | null
          ai_paused_by?: string | null
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          last_message_at?: string | null
          owner_id: string
          phone_number: string
          remote_jid?: string | null
          remote_jid_alt?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_paused?: boolean
          ai_paused_at?: string | null
          ai_paused_by?: string | null
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          last_message_at?: string | null
          owner_id?: string
          phone_number?: string
          remote_jid?: string | null
          remote_jid_alt?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          ai_agent_id: string | null
          ai_enabled: boolean | null
          ai_mode: string
          connected_at: string | null
          connected_phone: string | null
          created_at: string
          id: string
          instance_id: string
          instance_name: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_agent_id?: string | null
          ai_enabled?: boolean | null
          ai_mode?: string
          connected_at?: string | null
          connected_phone?: string | null
          created_at?: string
          id?: string
          instance_id: string
          instance_name: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_agent_id?: string | null
          ai_enabled?: boolean | null
          ai_mode?: string
          connected_at?: string | null
          connected_phone?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          instance_name?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          message_template: string
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          message_template: string
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          message_template?: string
          template_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          agent_id: string | null
          content: string
          conversation_id: string
          created_at: string
          direction: string
          external_id: string | null
          id: string
          owner_id: string
          raw_payload: Json | null
        }
        Insert: {
          agent_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          external_id?: string | null
          id?: string
          owner_id: string
          raw_payload?: Json | null
        }
        Update: {
          agent_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          external_id?: string | null
          id?: string
          owner_id?: string
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sends: {
        Row: {
          budget_id: string | null
          created_at: string | null
          id: string
          message: string
          phone: string
          sent_at: string | null
          user_id: string | null
        }
        Insert: {
          budget_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          phone: string
          sent_at?: string | null
          user_id?: string | null
        }
        Update: {
          budget_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          phone?: string
          sent_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sends_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          created_at: string
          evolution_api_url: string | null
          evolution_instance_id: string | null
          id: string
          is_active: boolean
          owner_id: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string
          evolution_api_url?: string | null
          evolution_instance_id?: string | null
          id?: string
          is_active?: boolean
          owner_id: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string
          evolution_api_url?: string | null
          evolution_instance_id?: string | null
          id?: string
          is_active?: boolean
          owner_id?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      whatsapp_webhook_events: {
        Row: {
          conversation_id: string | null
          error_message: string | null
          event_type: string | null
          id: string
          owner_id: string | null
          payload: Json | null
          phone_number: string | null
          processed_at: string | null
          received_at: string
          request_id: string | null
          source: string
          status: string
        }
        Insert: {
          conversation_id?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          owner_id?: string | null
          payload?: Json | null
          phone_number?: string | null
          processed_at?: string | null
          received_at?: string
          request_id?: string | null
          source: string
          status?: string
        }
        Update: {
          conversation_id?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          owner_id?: string | null
          payload?: Json | null
          phone_number?: string | null
          processed_at?: string | null
          received_at?: string
          request_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_zapi_logs: {
        Row: {
          ai_json: Json | null
          budget_id: string | null
          chat_id: string | null
          created_at: string
          error_message: string | null
          from_phone: string | null
          id: string
          is_group: boolean
          owner_id: string | null
          raw_message: string | null
          status: string
        }
        Insert: {
          ai_json?: Json | null
          budget_id?: string | null
          chat_id?: string | null
          created_at?: string
          error_message?: string | null
          from_phone?: string | null
          id?: string
          is_group?: boolean
          owner_id?: string | null
          raw_message?: string | null
          status?: string
        }
        Update: {
          ai_json?: Json | null
          budget_id?: string | null
          chat_id?: string | null
          created_at?: string
          error_message?: string | null
          from_phone?: string | null
          id?: string
          is_group?: boolean
          owner_id?: string | null
          raw_message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_zapi_logs_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_zapi_settings: {
        Row: {
          admin_notification_phone: string | null
          allowed_groups: string | null
          allowed_numbers: string | null
          buyer_notification_template: string | null
          created_at: string
          evolution_instance_name: string | null
          id: string
          is_active: boolean
          owner_id: string
          provider: string
          purchase_approved_template: string | null
          updated_at: string
          waha_session: string | null
        }
        Insert: {
          admin_notification_phone?: string | null
          allowed_groups?: string | null
          allowed_numbers?: string | null
          buyer_notification_template?: string | null
          created_at?: string
          evolution_instance_name?: string | null
          id?: string
          is_active?: boolean
          owner_id: string
          provider?: string
          purchase_approved_template?: string | null
          updated_at?: string
          waha_session?: string | null
        }
        Update: {
          admin_notification_phone?: string | null
          allowed_groups?: string | null
          allowed_numbers?: string | null
          buyer_notification_template?: string | null
          created_at?: string
          evolution_instance_name?: string | null
          id?: string
          is_active?: boolean
          owner_id?: string
          provider?: string
          purchase_approved_template?: string | null
          updated_at?: string
          waha_session?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_license_expiration_monitor: {
        Row: {
          current_time: string | null
          expired_active_licenses: number | null
          expiring_soon_licenses: number | null
          last_job_execution: string | null
          last_job_updated_count: number | null
          total_active_licenses: number | null
        }
        Relationships: []
      }
      admin_license_overview: {
        Row: {
          activated_at: string | null
          code: string | null
          created_at: string | null
          expires_at: string | null
          expires_soon: boolean | null
          id: string | null
          is_active: boolean | null
          last_validation: string | null
          status: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_license: {
        Args: { p_license_code: string; p_user_id?: string }
        Returns: Json
      }
      activate_license_by_code: { Args: { p_code: string }; Returns: Json }
      activate_license_enhanced: {
        Args: { license_code: string; p_user_id: string }
        Returns: Json
      }
      activate_license_fixed: {
        Args: { p_license_code: string; p_user_id: string }
        Returns: Json
      }
      admin_activate_license: { Args: { p_license_id: string }; Returns: Json }
      admin_activate_user_license: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_bulk_activate_licenses: {
        Args: { p_license_ids: string[] }
        Returns: Json
      }
      admin_bulk_deactivate_licenses: {
        Args: { p_license_ids: string[] }
        Returns: Json
      }
      admin_bulk_license_action: {
        Args: {
          p_action: string
          p_license_ids: string[]
          p_notes?: string
          p_value?: boolean
        }
        Returns: number
      }
      admin_bulk_license_operation: {
        Args: {
          p_license_data?: Json
          p_operation_type: string
          p_user_ids: string[]
        }
        Returns: string
      }
      admin_cleanup_all_user_data: { Args: never; Returns: Json }
      admin_convert_legacy_license: {
        Args: { p_days: number; p_license_code: string; p_notes?: string }
        Returns: Json
      }
      admin_create_13_digit_license: {
        Args: { p_notes?: string }
        Returns: Json
      }
      admin_create_active_license: {
        Args: { p_code: string; p_expires_at?: string; p_user_id?: string }
        Returns: string
      }
      admin_create_bulk_licenses: {
        Args: { p_expires_in_days?: number; p_quantity: number }
        Returns: Json
      }
      admin_create_custom_license:
        | {
            Args: {
              p_days: number
              p_is_active?: boolean
              p_license_type?: string
              p_notes?: string
              p_user_id: string
            }
            Returns: {
              activated_at: string | null
              code: string
              created_at: string
              created_by_admin_id: string | null
              expires_at: string | null
              id: string
              is_active: boolean
              last_validation: string | null
              license_type: string | null
              mercadopago_subscription_id: string | null
              metadata: Json | null
              notes: string | null
              updated_at: string | null
              user_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "licenses"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_code?: string
              p_days: number
              p_is_active?: boolean
              p_license_name?: string
              p_license_type?: string
              p_notes?: string
              p_user_id: string
            }
            Returns: {
              activated_at: string | null
              code: string
              created_at: string
              created_by_admin_id: string | null
              expires_at: string | null
              id: string
              is_active: boolean
              last_validation: string | null
              license_type: string | null
              mercadopago_subscription_id: string | null
              metadata: Json | null
              notes: string | null
              updated_at: string | null
              user_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "licenses"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      admin_create_inactive_license: {
        Args: { p_code: string; p_expires_at?: string }
        Returns: Json
      }
      admin_create_license:
        | {
            Args: {
              p_code?: string
              p_expires_at?: string
              p_notes?: string
              p_user_id?: string
            }
            Returns: string
          }
        | { Args: { p_expires_at?: string }; Returns: Json }
      admin_create_license_advanced: {
        Args: {
          p_activate_immediately?: boolean
          p_code: string
          p_expires_at?: string
          p_notes?: string
          p_user_id?: string
        }
        Returns: string
      }
      admin_create_license_with_days:
        | { Args: { p_days: number; p_quantity?: number }; Returns: Json }
        | {
            Args: { p_days: number; p_notes?: string; p_quantity?: number }
            Returns: Json
          }
      admin_create_mixed_licenses: {
        Args: { p_license_configs: Json }
        Returns: Json
      }
      admin_create_multiple_licenses: {
        Args: {
          p_activate_immediately?: boolean
          p_expires_at?: string
          p_notes?: string
          p_quantity: number
        }
        Returns: number
      }
      admin_create_notification: {
        Args: {
          p_expires_at?: string
          p_message: string
          p_target_type: string
          p_target_user_id?: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      admin_create_trial_for_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_deactivate_license: {
        Args: { p_license_id: string }
        Returns: Json
      }
      admin_deactivate_user_license: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_delete_license: {
        Args: { p_license_id: string; p_reason?: string }
        Returns: boolean
      }
      admin_delete_logs: {
        Args: {
          p_log_ids?: string[]
          p_log_type?: string
          p_older_than_days?: number
        }
        Returns: {
          deleted_count: number
          log_type: string
        }[]
      }
      admin_delete_notification: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      admin_delete_user: { Args: { p_user_id: string }; Returns: boolean }
      admin_delete_user_completely: {
        Args: {
          p_confirmation_code: string
          p_delete_auth_user?: boolean
          p_user_id: string
        }
        Returns: Json
      }
      admin_delete_user_completely_enhanced: {
        Args: {
          p_confirmation_code: string
          p_delete_auth_user?: boolean
          p_user_id: string
        }
        Returns: Json
      }
      admin_extend_license: {
        Args: { p_extend_days: number; p_license_id: string }
        Returns: Json
      }
      admin_get_all_licenses: {
        Args: never
        Returns: {
          activated_at: string
          code: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          last_validation: string
          license_type: string
          metadata: Json
          notes: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_get_all_logs: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_log_type?: string
          p_offset?: number
          p_start_date?: string
        }
        Returns: {
          action: string
          created_at: string
          details: Json
          id: string
          log_type: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          role: string
          updated_at: string
        }[]
      }
      admin_get_all_users_detailed: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_role_filter?: string
          p_search?: string
          p_status_filter?: string
        }
        Returns: {
          created_at: string
          email: string
          id: string
          license_code: string
          license_expires_at: string
          license_id: string
          license_is_active: boolean
          name: string
        }[]
      }
      admin_get_all_users_for_assignment: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
          status: string
        }[]
      }
      admin_get_dashboard_stats: {
        Args: never
        Returns: {
          active_users: number
          total_budgets: number
          total_clients: number
          total_licenses: number
          total_users: number
        }[]
      }
      admin_get_database_stats: { Args: never; Returns: Json }
      admin_get_enhanced_users: {
        Args: {
          p_license_status?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by?: string
          p_sort_order?: string
        }
        Returns: {
          active_licenses: number
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          last_license_activity: string
          last_sign_in_at: string
          license_count: number
          phone: string
          total_license_value: number
          user_metadata: Json
        }[]
      }
      admin_get_license_history: {
        Args: { p_license_id: string }
        Returns: {
          action_type: string
          admin_email: string
          admin_id: string
          admin_name: string
          created_at: string
          id: string
          new_values: Json
          notes: string
          old_values: Json
        }[]
      }
      admin_get_license_statistics: {
        Args: never
        Returns: {
          active_licenses: number
          expired_licenses: number
          licenses_created_today: number
          licenses_expiring_soon: number
          suspended_licenses: number
          total_licenses: number
          total_users: number
          users_with_licenses: number
        }[]
      }
      admin_get_license_stats: {
        Args: never
        Returns: {
          active_licenses: number
          expired_licenses: number
          expiring_soon: number
          inactive_licenses: number
          total_licenses: number
          unassigned_licenses: number
        }[]
      }
      admin_get_license_stats_by_days: {
        Args: never
        Returns: {
          active_licenses: number
          days_encoded: number
          expired_licenses: number
          inactive_licenses: number
          total_licenses: number
        }[]
      }
      admin_get_licenses_with_users: {
        Args: never
        Returns: {
          code: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_get_log_types: {
        Args: never
        Returns: {
          count: number
          description: string
          log_type: string
        }[]
      }
      admin_get_logs: {
        Args: never
        Returns: {
          action: string
          admin_name: string
          admin_user_id: string
          created_at: string
          details: Json
          id: string
          target_name: string
          target_user_id: string
        }[]
      }
      admin_get_logs_statistics: {
        Args: never
        Returns: {
          admin_logs: number
          budget_deletion_logs: number
          file_upload_logs: number
          license_validation_logs: number
          logs_this_month: number
          logs_this_week: number
          logs_today: number
          total_logs: number
        }[]
      }
      admin_get_recent_activity: { Args: never; Returns: Json }
      admin_get_system_stats: { Args: never; Returns: Json }
      admin_get_user_license_analytics: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_start_date?: string
          p_user_id?: string
        }
        Returns: {
          action_date: string
          action_type: string
          id: string
          license_id: string
          metadata: Json
          performed_by: string
          performer_email: string
          user_email: string
          user_id: string
        }[]
      }
      admin_get_user_metrics: { Args: { p_user_id: string }; Returns: Json }
      admin_get_user_real_email: {
        Args: { p_user_id: string }
        Returns: string
      }
      admin_get_users_paginated: {
        Args: {
          p_limit?: number
          p_page?: number
          p_role_filter?: string
          p_search?: string
          p_sort_by?: string
          p_sort_order?: string
          p_status_filter?: string
        }
        Returns: Json
      }
      admin_get_users_with_license_details: {
        Args: never
        Returns: {
          budget_count: number
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          license_activated_at: string
          license_active: boolean
          license_code: string
          license_expires_at: string
          name: string
          role: string
        }[]
      }
      admin_list_licenses: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          code: string
          created_at: string
          derived_status: string
          expires_at: string
          id: string
          is_active: boolean
          license_name: string
          license_type: string
          notes: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_list_notifications: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_active: boolean
          message: string
          target_type: string
          target_user_id: string
          title: string
          type: string
          updated_at: string
        }[]
      }
      admin_list_user_notifications: {
        Args: {
          p_limit?: number
          p_notification_id?: string
          p_offset?: number
          p_user_id?: string
        }
        Returns: {
          created_at: string
          delivery_status: string
          id: string
          notification_id: string
          notification_title: string
          notification_type: string
          sent_at: string
          user_email: string
          user_id: string
        }[]
      }
      admin_manual_license_cleanup: { Args: never; Returns: Json }
      admin_optimize_database: { Args: never; Returns: Json }
      admin_preview_cleanup: { Args: never; Returns: Json }
      admin_renew_license: {
        Args: { additional_days?: number; license_id: string }
        Returns: Json
      }
      admin_renew_user_license: {
        Args: { p_additional_days: number; p_user_id: string }
        Returns: boolean
      }
      admin_repair_missing_trial_licenses: { Args: never; Returns: Json }
      admin_reset_user_sequence: {
        Args: { p_admin_id: string; p_user_id: string }
        Returns: boolean
      }
      admin_toggle_license_status: {
        Args: { p_license_id: string }
        Returns: Json
      }
      admin_transfer_license: {
        Args: { p_license_id: string; p_new_user_id: string }
        Returns: Json
      }
      admin_update_license: {
        Args: {
          p_expires_at?: string
          p_is_active?: boolean
          p_license_code?: string
          p_license_id: string
          p_notes?: string
        }
        Returns: Json
      }
      admin_update_license_full:
        | {
            Args: {
              p_expires_at?: string
              p_is_active?: boolean
              p_license_id: string
              p_license_type?: string
              p_notes?: string
              p_user_id?: string
            }
            Returns: {
              activated_at: string | null
              code: string
              created_at: string
              created_by_admin_id: string | null
              expires_at: string | null
              id: string
              is_active: boolean
              last_validation: string | null
              license_type: string | null
              mercadopago_subscription_id: string | null
              metadata: Json | null
              notes: string | null
              updated_at: string | null
              user_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "licenses"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_expires_at: string
              p_is_active: boolean
              p_license_id: string
              p_license_name?: string
              p_license_type: string
              p_notes: string
              p_user_id: string
            }
            Returns: {
              activated_at: string | null
              code: string
              created_at: string
              created_by_admin_id: string | null
              expires_at: string | null
              id: string
              is_active: boolean
              last_validation: string | null
              license_type: string | null
              mercadopago_subscription_id: string | null
              metadata: Json | null
              notes: string | null
              updated_at: string | null
              user_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "licenses"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      admin_update_user: {
        Args: { p_name: string; p_role: string; p_user_id: string }
        Returns: boolean
      }
      audit_rls_policies: {
        Args: never
        Returns: {
          policy_count: number
          recommendations: string
          rls_enabled: boolean
          security_status: string
          table_name: string
        }[]
      }
      auto_resolve_expired_alerts: { Args: never; Returns: number }
      backup_licenses_before_migration: { Args: never; Returns: Json }
      calculate_audit_risk_score: {
        Args: {
          p_event_details: Json
          p_event_type: string
          p_ip_address: unknown
          p_success: boolean
          p_user_id: string
        }
        Returns: number
      }
      can_access_service_order: {
        Args: { service_order_id: string }
        Returns: boolean
      }
      check_budgets_integrity: {
        Args: never
        Returns: {
          orphaned_budgets: number
          total_budgets: number
          valid_budgets: number
        }[]
      }
      check_cleanup_dependencies: {
        Args: never
        Returns: {
          can_cleanup: boolean
          dependency_count: number
          table_name: string
        }[]
      }
      check_cleanup_status: { Args: never; Returns: Json }
      check_if_user_is_admin: { Args: { user_id: string }; Returns: boolean }
      check_license_system_integrity: { Args: never; Returns: Json }
      check_migration_status: { Args: never; Returns: Json }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      check_shop_profile_exists: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_table_permissions: {
        Args: never
        Returns: {
          grantee: string
          privilege_type: string
          table_name: string
        }[]
      }
      clean_expired_rate_limiting: { Args: never; Returns: number }
      cleanup_all_expired_licenses: { Args: never; Returns: Json }
      cleanup_all_user_data: { Args: never; Returns: Json }
      cleanup_all_user_data_complete: { Args: never; Returns: Json }
      cleanup_expired_trial_licenses: { Args: never; Returns: number }
      cleanup_expired_trial_licenses_enhanced: { Args: never; Returns: Json }
      cleanup_licenses_complete: { Args: never; Returns: Json }
      cleanup_old_audit_logs: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      cleanup_old_deleted_budgets: { Args: never; Returns: undefined }
      cleanup_old_deleted_service_orders: {
        Args: never
        Returns: {
          cleanup_date: string
          deleted_count: number
        }[]
      }
      cleanup_old_logs: { Args: never; Returns: undefined }
      cleanup_old_notification_logs: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      cleanup_old_security_alerts: {
        Args: { retention_days?: number }
        Returns: number
      }
      cleanup_old_security_logs: { Args: never; Returns: number }
      cleanup_public_data_only: { Args: never; Returns: Json }
      cleanup_security_logs: { Args: never; Returns: number }
      correlate_security_alerts: {
        Args: { alert_id: string }
        Returns: {
          affected_entities: Json | null
          alert_group: string | null
          alert_type: string
          confidence_level: number | null
          correlation_id: string | null
          created_at: string | null
          description: string | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_level: number | null
          event_data: Json | null
          expires_at: string | null
          id: string
          last_notification_at: string | null
          metadata: Json | null
          notification_attempts: number | null
          notification_channels: Json | null
          notification_sent: boolean | null
          parent_alert_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          risk_score: number | null
          severity: string
          source_function: string | null
          source_system: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "security_alerts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      count_active_budgets: { Args: { p_user_id: string }; Returns: number }
      count_user_budgets: { Args: { p_user_id: string }; Returns: number }
      create_cleanup_backup: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_expires_at?: string
          p_message: string
          p_target_type: string
          p_target_user_id?: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_push_notification: {
        Args: {
          p_actions?: Json
          p_badge?: string
          p_body: string
          p_click_action?: string
          p_data?: Json
          p_expires_at?: string
          p_icon?: string
          p_image?: string
          p_metadata?: Json
          p_priority?: number
          p_require_interaction?: boolean
          p_scheduled_at?: string
          p_silent?: boolean
          p_target_group?: string
          p_target_role?: string
          p_target_type: string
          p_target_user_id?: string
          p_title: string
          p_vibrate?: number[]
        }
        Returns: string
      }
      create_service_order: {
        Args: { p_description: string; p_priority?: string; p_title: string }
        Returns: string
      }
      create_test_session: {
        Args: { p_service_order_id: string }
        Returns: string
      }
      create_trial_license: { Args: { p_user_id: string }; Returns: Json }
      create_trial_licenses_for_existing_users: { Args: never; Returns: Json }
      debug_admin_access: {
        Args: never
        Returns: {
          current_user_id: string
          is_admin_result: boolean
          profile_exists: boolean
          user_email: string
          user_role: string
        }[]
      }
      debug_current_user: {
        Args: never
        Returns: {
          is_active: boolean
          is_admin: boolean
          user_email: string
          user_id: string
          user_role: string
        }[]
      }
      debug_get_notifications: {
        Args: never
        Returns: {
          expires_at: string
          is_active: boolean
          message: string
          notification_id: string
          target_type: string
          title: string
          type: string
          user_notifications_count: number
        }[]
      }
      debug_oliveira_license: {
        Args: never
        Returns: {
          result: Json
          step: string
        }[]
      }
      debug_token_status: {
        Args: { token_to_check: string }
        Returns: {
          expires_at: string
          found: boolean
          is_active: boolean
          is_expired: boolean
          service_order_id: string
          token_id: string
        }[]
      }
      debug_user_context: { Args: never; Returns: Json }
      decode_license_days: { Args: { p_license_code: string }; Returns: number }
      delete_service_order: { Args: { p_id: string }; Returns: boolean }
      delete_user_notification: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      detect_sql_injection: { Args: { input_text: string }; Returns: boolean }
      detect_suspicious_license_activity: {
        Args: { p_failure_threshold?: number; p_time_window?: string }
        Returns: {
          failure_count: number
          first_failure: string
          ip_address: string
          last_failure: string
          risk_level: string
          user_id: string
        }[]
      }
      dismiss_update: { Args: { update_uuid: string }; Returns: undefined }
      empty_service_orders_trash: { Args: never; Returns: number }
      escalate_unresolved_alerts: {
        Args: { escalation_threshold_hours?: number; risk_threshold?: number }
        Returns: number
      }
      execute_safe_cleanup: {
        Args: never
        Returns: {
          rows_deleted: number
          status: string
          step_name: string
        }[]
      }
      fix_oliveira_license_association: { Args: never; Returns: Json }
      fix_orphaned_budgets: { Args: never; Returns: number }
      format_budget_id: { Args: { seq_number: number }; Returns: string }
      format_sequential_number: {
        Args: { seq_number: number }
        Returns: string
      }
      format_service_order_id: { Args: { seq_number: number }; Returns: string }
      generate_13_digit_license_code: { Args: never; Returns: string }
      generate_budget_sequential_number: {
        Args: { p_user_id: string }
        Returns: number
      }
      generate_license_code: { Args: never; Returns: string }
      generate_license_code_with_days: {
        Args: { p_days: number }
        Returns: string
      }
      generate_sequential_number: { Args: never; Returns: number }
      generate_service_order_sequential_number: {
        Args: { p_user_id: string }
        Returns: number
      }
      generate_service_order_share_token:
        | {
            Args: { p_service_order_id: string }
            Returns: {
              expires_at: string
              share_token: string
              share_url: string
            }[]
          }
        | {
            Args: { p_base_url?: string; p_service_order_id: string }
            Returns: {
              expires_at: string
              share_token: string
              share_url: string
            }[]
          }
      generate_test_token: { Args: never; Returns: string }
      get_admin_notifications: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_active: boolean
          message: string
          target_type: string
          target_user_id: string
          title: string
          total_users_deleted: number
          type: string
          updated_at: string
        }[]
      }
      get_allowed_redirect_domains: { Args: never; Returns: string[] }
      get_api_key: { Args: { service_name: string }; Returns: string }
      get_budget_details_by_email: {
        Args: { target_budget_id: string; user_email: string }
        Returns: {
          budget_id: string
          client_name: string
          client_phone: string
          created_at: string
          device_model: string
          device_type: string
          issue: string
          parts: Json
          sequential_number: number
          status: string
          total_price: number
          workflow_status: string
        }[]
      }
      get_budget_with_parts: {
        Args: { p_device_model: string; p_part_type: string; p_user_id: string }
        Returns: {
          company_name: string
          custom_services: string
          device_model: string
          notes: string
          part_type: string
          parts: Json
          valid_until: string
        }[]
      }
      get_budgets_with_part_quality: {
        Args: { p_user_id: string }
        Returns: {
          cash_price: number
          client_name: string
          client_phone: string
          created_at: string
          delivery_date: string
          device_model: string
          device_type: string
          expires_at: string
          id: string
          installment_price: number
          is_delivered: boolean
          is_paid: boolean
          issue: string
          part_quality: string
          status: string
          total_price: number
          updated_at: string
          valid_until: string
          workflow_status: string
        }[]
      }
      get_budgets_with_parts: {
        Args: { p_limit?: number; p_search_term?: string; p_user_id: string }
        Returns: {
          created_at: string
          custom_services: string
          device_model: string
          device_type: string
          id: string
          notes: string
          part_type: string
          parts: Json
          sequential_number: number
          valid_until: string
        }[]
      }
      get_cleanup_preview: { Args: never; Returns: Json }
      get_cleanup_statistics: { Args: never; Returns: Json }
      get_client_budget_count: { Args: { client_id: string }; Returns: number }
      get_client_service_order_count: {
        Args: { client_id: string }
        Returns: number
      }
      get_company_info: {
        Args: { p_owner_id?: string }
        Returns: {
          address: string
          logo_url: string
          name: string
          whatsapp_phone: string
        }[]
      }
      get_company_info_by_formatted_id: {
        Args: { p_formatted_id: string }
        Returns: {
          address: string
          logo_url: string
          name: string
          whatsapp_phone: string
        }[]
      }
      get_company_info_by_share_token: {
        Args: { p_share_token: string }
        Returns: {
          address: string
          logo_url: string
          name: string
          whatsapp_phone: string
        }[]
      }
      get_current_user_profile: {
        Args: never
        Returns: {
          advanced_features_enabled: boolean
          budget_limit: number | null
          budget_warning_days: number
          budget_warning_enabled: boolean
          created_at: string
          id: string
          name: string
          onboarding_completed: boolean
          role: string | null
          updated_at: string
          updated_by: string | null
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "user_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_deleted_service_orders: {
        Args: never
        Returns: {
          client_id: string
          created_at: string
          deleted_at: string
          deleted_by: string
          delivery_date: string
          device_model: string
          device_type: string
          id: string
          imei_serial: string
          is_paid: boolean
          labor_cost: number
          notes: string
          owner_id: string
          parts_cost: number
          priority: string
          reported_issue: string
          sequential_number: number
          status: string
          total_price: number
          updated_at: string
          warranty_months: number
        }[]
      }
      get_dismissals_count: { Args: never; Returns: number }
      get_enhanced_share_data: {
        Args: { share_token_param: string }
        Returns: Json
      }
      get_expiring_budgets: {
        Args: { p_user_id: string }
        Returns: {
          budget_id: string
          client_name: string
          days_until_expiry: number
          expires_at: string
        }[]
      }
      get_license_audit_stats: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id?: string }
        Returns: Json
      }
      get_license_expiration_history: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          details: Json
          execution_time: string
          id: number
          updated_count: number
        }[]
      }
      get_license_expiration_job_status: {
        Args: never
        Returns: {
          active: boolean
          job_name: string
          last_execution: string
          next_execution: string
          schedule: string
        }[]
      }
      get_license_statistics: { Args: never; Returns: Json }
      get_next_sequential_number: { Args: never; Returns: number }
      get_optimized_budgets:
        | {
            Args: {
              p_limit?: number
              p_offset?: number
              p_search_term?: string
              p_user_id: string
            }
            Returns: {
              client_name: string
              client_phone: string
              created_at: string
              device_model: string
              device_type: string
              id: string
              total_price: number
              updated_at: string
              workflow_status: string
            }[]
          }
        | {
            Args: {
              p_limit?: number
              p_offset?: number
              p_search_term?: string
              p_status_filter?: string
              p_user_id: string
            }
            Returns: {
              approved_at: string
              cash_price: number
              client_id: string
              client_name: string
              client_phone: string
              created_at: string
              custom_services: string
              deleted_at: string
              deleted_by: string
              delivery_confirmed_at: string
              delivery_date: string
              device_model: string
              device_type: string
              expires_at: string
              id: string
              includes_delivery: boolean
              includes_screen_protector: boolean
              installment_price: number
              installments: number
              is_delivered: boolean
              is_paid: boolean
              issue: string
              notes: string
              owner_id: string
              part_quality: string
              part_type: string
              payment_condition: string
              payment_confirmed_at: string
              sequential_number: number
              status: string
              total_price: number
              updated_at: string
              updated_by: string
              valid_until: string
              warranty_months: number
              workflow_status: string
            }[]
          }
        | {
            Args: {
              limit_count?: number
              offset_count?: number
              search_term?: string
              status_filter?: string
            }
            Returns: {
              cash_price: number
              client_id: string
              client_name: string
              client_phone: string
              created_at: string
              custom_services: string
              device_brand: string
              device_model: string
              id: string
              includes_delivery: boolean
              includes_screen_protector: boolean
              installment_price: number
              installments: number
              is_delivered: boolean
              is_paid: boolean
              issue: string
              notes: string
              payment_condition: string
              piece_quality: string
              sequential_number: number
              total_price: number
              updated_at: string
              user_id: string
              warranty_months: number
            }[]
          }
      get_public_company_info: {
        Args: { p_owner_id: string }
        Returns: {
          address: string
          business_hours: string
          cnpj: string
          description: string
          email: string
          id: string
          logo_url: string
          name: string
          website: string
          whatsapp_phone: string
        }[]
      }
      get_public_os_status: {
        Args: { p_order_id: string }
        Returns: {
          device_model: string
          entry_date: string
          id: string
          sequential_number: number
          shop_name: string
          shop_phone: string
          status: string
          updated_at: string
        }[]
      }
      get_public_service_order_images: {
        Args: { share_token: string }
        Returns: {
          created_at: string
          id: string
          image_index: number
          metadata: Json
          processed_filename: string
          storage_path: string
          thumbnail_path: string
        }[]
      }
      get_push_notification_stats: {
        Args: {
          p_end_date?: string
          p_notification_id?: string
          p_start_date?: string
        }
        Returns: {
          click_rate: number
          delivery_rate: number
          total_clicked: number
          total_delivered: number
          total_failed: number
          total_notifications: number
          total_sent: number
        }[]
      }
      get_rate_limiting_summary: {
        Args: never
        Returns: {
          blocked_entries: number
          high_risk_entries: number
          pattern_matches: Json
          recent_attacks: number
          top_blocked_ips: Json
          total_entries: number
        }[]
      }
      get_secure_user_data: { Args: { p_user_id: string }; Returns: Json }
      get_security_dashboard_summary: { Args: never; Returns: Json }
      get_security_stats: {
        Args: { user_id_param?: string }
        Returns: {
          failed_access_attempts: number
          last_activity: string
          license_related_failures: number
          recent_activity_count: number
          total_access_attempts: number
        }[]
      }
      get_service_order_by_formatted_id: {
        Args: { p_formatted_id: string }
        Returns: {
          actual_completion: string
          client_email: string
          client_name: string
          client_phone: string
          created_at: string
          customer_notes: string
          customer_visible: boolean
          delivery_date: string
          device_checklist: Json
          device_model: string
          device_password_metadata: Json
          device_password_type: string
          device_password_value: string
          device_type: string
          entry_date: string
          estimated_completion: string
          exit_date: string
          formatted_id: string
          id: string
          imei_serial: string
          is_paid: boolean
          labor_cost: number
          last_customer_update: string
          notes: string
          owner_id: string
          parts_cost: number
          payment_status: string
          priority: string
          reported_issue: string
          sequential_number: number
          status: string
          technician_notes: string
          total_price: number
          updated_at: string
          warranty_months: number
        }[]
      }
      get_service_order_by_id: {
        Args: { p_id: string }
        Returns: {
          created_at: string
          description: string
          id: string
          owner_id: string
          owner_name: string
          priority: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_service_order_by_share_token:
        | {
            Args: { p_share_token: string }
            Returns: {
              actual_completion: string
              client_email: string
              client_name: string
              client_phone: string
              created_at: string
              customer_notes: string
              customer_visible: boolean
              delivery_date: string
              device_checklist: Json
              device_model: string
              device_password_metadata: Json
              device_password_type: string
              device_password_value: string
              device_type: string
              entry_date: string
              estimated_completion: string
              exit_date: string
              formatted_id: string
              id: string
              imei_serial: string
              is_paid: boolean
              labor_cost: number
              last_customer_update: string
              notes: string
              parts_cost: number
              payment_status: string
              priority: string
              reported_issue: string
              sequential_number: number
              status: string
              technician_notes: string
              total_price: number
              updated_at: string
              warranty_months: number
            }[]
          }
        | {
            Args: { share_token_param: string }
            Returns: {
              actual_completion: string
              client_email: string
              client_id: string
              client_name: string
              client_phone: string
              created_at: string
              customer_notes: string
              customer_visible: boolean
              delivery_date: string
              device_model: string
              device_type: string
              entry_date: string
              estimated_completion: string
              exit_date: string
              formatted_id: string
              id: string
              imei_serial: string
              is_paid: boolean
              labor_cost: number
              last_customer_update: string
              notes: string
              parts_cost: number
              payment_status: string
              priority: string
              reported_issue: string
              sequential_number: number
              status: string
              technician_notes: string
              total_price: number
              updated_at: string
              warranty_months: number
            }[]
          }
      get_service_order_details: {
        Args: { p_service_order_id: string }
        Returns: {
          attachments_count: number
          client_address: string
          client_id: string
          client_name: string
          client_phone: string
          created_at: string
          delivery_date: string
          device_model: string
          device_type: string
          events_count: number
          formatted_id: string
          id: string
          imei_serial: string
          is_paid: boolean
          items_count: number
          labor_cost: number
          notes: string
          parts_cost: number
          priority: string
          reported_issue: string
          status: string
          total_price: number
          updated_at: string
          warranty_months: number
        }[]
      }
      get_service_order_edit_data: {
        Args: { p_service_order_id: string }
        Returns: Json
      }
      get_service_order_edit_data_debug: {
        Args: { p_service_order_id: string }
        Returns: Json
      }
      get_service_order_image_urls: {
        Args: { p_service_order_id: string }
        Returns: {
          image_id: string
          image_index: number
          original_filename: string
          storage_path: string
          thumbnail_path: string
        }[]
      }
      get_service_orders: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by?: string
          p_sort_order?: string
          p_start_date?: string
          p_status?: string
        }
        Returns: {
          created_at: string
          description: string
          id: string
          owner_id: string
          owner_name: string
          priority: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_service_orders_stats: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: {
          avg_completion_time: string
          cancelled_orders: number
          completed_orders: number
          high_priority_orders: number
          in_progress_orders: number
          pending_orders: number
          total_orders: number
          total_revenue: number
        }[]
      }
      get_service_orders_summary: {
        Args: never
        Returns: {
          cancelled_orders: number
          completed_orders: number
          in_progress_orders: number
          pending_orders: number
          total_orders: number
        }[]
      }
      get_service_orders_with_sequence: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: {
          created_at: string
          device_model: string
          device_type: string
          formatted_id: string
          id: string
          status: string
        }[]
      }
      get_shop_profile: { Args: { p_user_id: string }; Returns: Json }
      get_top_rankings: {
        Args: never
        Returns: {
          created_at: string
          id: string
          score: number
          user_name: string
        }[]
      }
      get_trial_license_statistics: { Args: never; Returns: Json }
      get_user_audit_summary: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          avg_risk_score: number
          event_type: string
          failed_events: number
          last_event: string
          successful_events: number
          total_events: number
        }[]
      }
      get_user_budgets_by_email: {
        Args: { user_email: string }
        Returns: {
          budget_id: string
          client_name: string
          client_phone: string
          created_at: string
          device_model: string
          device_type: string
          parts_count: number
          sequential_number: number
          status: string
          total_price: number
          workflow_status: string
        }[]
      }
      get_user_by_email: {
        Args: { input_email: string }
        Returns: {
          created_at: string
          email: string
          id: string
        }[]
      }
      get_user_clients_by_email: {
        Args: { user_email: string }
        Returns: {
          budgets_count: number
          city: string
          client_id: string
          created_at: string
          email: string
          name: string
          phone: string
          state: string
        }[]
      }
      get_user_license_details: { Args: { p_user_id: string }; Returns: Json }
      get_user_license_status: { Args: { p_user_id: string }; Returns: Json }
      get_user_notifications: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_active: boolean
          is_read: boolean
          message: string
          read_at: string
          target_type: string
          target_user_id: string
          title: string
          type: string
          updated_at: string
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      get_user_trial_license_status: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      get_username_from_email: { Args: { email: string }; Returns: string }
      get_worm_budgets_with_sequence: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          client_name: string
          created_at: string
          device_type: string
          formatted_id: string
          id: string
          total_price: number
        }[]
      }
      hard_delete_service_order: {
        Args: { service_order_id: string }
        Returns: boolean
      }
      has_reached_budget_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      insert_budget_parts_from_whatsapp: {
        Args: { budget_id: string; owner_id: string; parts: Json }
        Returns: undefined
      }
      insert_shop_profile: {
        Args: {
          p_address: string
          p_contact_phone: string
          p_shop_name: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id?: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_domain_allowed: { Args: { domain: string }; Returns: boolean }
      is_legacy_license_code: { Args: { p_code: string }; Returns: boolean }
      is_license_valid: { Args: { p_user_id: string }; Returns: boolean }
      is_maintenance_mode_active: { Args: never; Returns: boolean }
      is_user_admin: { Args: never; Returns: boolean }
      is_user_license_active: { Args: { p_user_id: string }; Returns: boolean }
      is_valid_test_token: { Args: { p_token: string }; Returns: boolean }
      list_user_sequences: {
        Args: never
        Returns: {
          created_at: string
          current_number: number
          last_reset_at: string
          next_number: number
          remaining_numbers: number
          status: string
          total_budgets: number
          total_service_orders: number
          updated_at: string
        }[]
      }
      list_user_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      log_admin_access: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: undefined
      }
      log_admin_action: {
        Args: { p_action: string; p_details?: Json; p_target_user_id: string }
        Returns: undefined
      }
      log_cleanup_step: {
        Args: {
          p_error_message?: string
          p_execution_time_ms?: number
          p_rows_affected?: number
          p_status: string
          p_step_name: string
        }
        Returns: undefined
      }
      log_customer_view: {
        Args: { p_service_order_id: string; p_share_token?: string }
        Returns: string
      }
      log_license_validation: {
        Args: {
          p_ip_address?: unknown
          p_license_id: string
          p_result: Json
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_login_attempt: {
        Args: { p_email: string; p_failure_reason?: string; p_success: boolean }
        Returns: undefined
      }
      log_progress_update: {
        Args: {
          p_details?: Json
          p_message: string
          p_service_order_id: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_severity?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      log_service_order_event: {
        Args: {
          p_customer_message?: string
          p_customer_visible?: boolean
          p_event_type: string
          p_payload?: Json
          p_service_order_id: string
        }
        Returns: string
      }
      manage_persistent_session: {
        Args: {
          p_device_fingerprint: string
          p_device_name?: string
          p_device_type?: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      manual_update_expired_licenses: {
        Args: never
        Returns: {
          details: Json
          execution_time: string
          updated_count: number
        }[]
      }
      mark_notification_as_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      migrate_existing_licenses: { Args: never; Returns: Json }
      migrate_existing_licenses_safely: { Args: never; Returns: Json }
      preview_license_duration: {
        Args: { p_license_code: string }
        Returns: Json
      }
      reset_user_sequence: { Args: never; Returns: boolean }
      restore_deleted_budget: { Args: { p_budget_id: string }; Returns: Json }
      restore_service_order: { Args: { p_id: string }; Returns: boolean }
      restore_user_notification: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      rollback_license_migration: { Args: never; Returns: Json }
      run_database_cleanup: {
        Args: never
        Returns: {
          execution_summary: string
        }[]
      }
      schedule_daily_cleanup: { Args: never; Returns: undefined }
      schedule_license_cleanup: { Args: never; Returns: undefined }
      search_by_sequential_id: {
        Args: { p_search_term: string; p_user_id: string }
        Returns: {
          created_at: string
          formatted_id: string
          id: string
          item_type: string
          title: string
        }[]
      }
      search_by_sequential_number: {
        Args: { search_number: number }
        Returns: {
          created_at: string
          formatted_id: string
          id: string
          item_type: string
          title: string
        }[]
      }
      search_service_orders: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_device_type?: string
          p_limit?: number
          p_offset?: number
          p_priority?: string
          p_search_query?: string
          p_status?: string
        }
        Returns: {
          client_name: string
          client_phone: string
          created_at: string
          delivery_date: string
          device_model: string
          id: string
          order_number: string
          priority: string
          search_rank: number
          status: string
          total_price: number
        }[]
      }
      security_health_check: {
        Args: never
        Returns: {
          policy_count: number
          rls_enabled: boolean
          security_status: string
          table_name: string
        }[]
      }
      send_push_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: boolean
      }
      send_push_to_subscribed_users: {
        Args: {
          p_message: string
          p_notification_id: string
          p_title: string
          p_type?: string
        }
        Returns: number
      }
      set_user_admin_by_email: { Args: { p_email: string }; Returns: Json }
      set_user_budget_limit: {
        Args: { p_budget_limit: number; p_user_id: string }
        Returns: boolean
      }
      should_maintain_login: {
        Args: { p_device_fingerprint: string }
        Returns: Json
      }
      soft_delete_all_user_budgets: {
        Args: { p_deletion_reason?: string }
        Returns: Json
      }
      soft_delete_budget_with_audit: {
        Args: { p_budget_id: string; p_deletion_reason?: string }
        Returns: Json
      }
      soft_delete_service_order: { Args: { p_id: string }; Returns: boolean }
      test_admin_access: { Args: never; Returns: Json }
      test_admin_permissions: {
        Args: never
        Returns: {
          details: string
          result: boolean
          test_name: string
        }[]
      }
      test_admin_with_user: { Args: { test_user_id: string }; Returns: Json }
      test_generate_share_token: {
        Args: never
        Returns: {
          expires_at: string
          service_order_id: string
          share_token: string
          share_url: string
        }[]
      }
      test_user_permissions: {
        Args: never
        Returns: {
          description: string
          result: boolean
          test_name: string
        }[]
      }
      toggle_maintenance_mode: { Args: { active: boolean }; Returns: boolean }
      trust_device: { Args: { p_device_fingerprint: string }; Returns: Json }
      unblock_expired_entries: { Args: never; Returns: number }
      update_expired_licenses_daily: {
        Args: never
        Returns: {
          details: Json
          execution_time: string
          updated_count: number
        }[]
      }
      update_notification_log_status: {
        Args: {
          p_error_message?: string
          p_log_id: string
          p_response_data?: Json
          p_status: string
        }
        Returns: boolean
      }
      update_service_order:
        | {
            Args: {
              p_delivery_date?: string
              p_device_model?: string
              p_device_type?: string
              p_id: string
              p_imei_serial?: string
              p_is_paid?: boolean
              p_labor_cost?: number
              p_notes?: string
              p_parts_cost?: number
              p_priority?: string
              p_reported_issue?: string
              p_status?: string
              p_total_price?: number
              p_warranty_months?: number
            }
            Returns: boolean
          }
        | {
            Args: {
              p_description?: string
              p_id: string
              p_priority?: string
              p_status?: string
              p_title?: string
            }
            Returns: boolean
          }
      update_service_order_status:
        | { Args: { p_id: string; p_status: string }; Returns: boolean }
        | {
            Args: {
              p_new_status: string
              p_notes?: string
              p_service_order_id: string
            }
            Returns: boolean
          }
      update_shop_profile: {
        Args: {
          p_address: string
          p_contact_phone: string
          p_shop_name: string
          p_user_id: string
        }
        Returns: boolean
      }
      user_dismissed_update: { Args: { update_uuid: string }; Returns: boolean }
      user_permissions_check: { Args: { p_user_id: string }; Returns: Json }
      validate_admin_email_change: {
        Args: { p_new_email: string; p_user_id: string }
        Returns: Json
      }
      validate_admin_password_reset: {
        Args: { p_new_password: string; p_user_id: string }
        Returns: Json
      }
      validate_license_migration: { Args: never; Returns: Json }
      validate_migration_integrity: { Args: never; Returns: Json }
      validate_rls_security: {
        Args: never
        Returns: {
          policy_count: number
          rls_enabled: boolean
          security_status: string
          table_name: string
        }[]
      }
      validate_sequence_integrity: {
        Args: never
        Returns: {
          description: string
          issue_type: string
          user_id: string
        }[]
      }
      validate_user_license: { Args: { p_user_id: string }; Returns: Json }
      validate_user_license_complete: {
        Args: { p_user_id: string }
        Returns: Json
      }
      verify_admin_system: { Args: never; Returns: Json }
      verify_vip_removal: {
        Args: never
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
      }
    }
    Enums: {
      payment_status: "succeeded" | "failed" | "pending" | "refunded"
      service_order_event_type_new:
        | "created"
        | "status_changed"
        | "payment_status_changed"
        | "delivery_date_changed"
        | "priority_changed"
        | "item_added"
        | "item_updated"
        | "item_removed"
        | "estimated_completion_set"
        | "estimated_completion_changed"
        | "actual_completion_set"
        | "customer_notes_added"
        | "customer_notes_updated"
        | "technician_notes_added"
        | "technician_notes_updated"
        | "shared_with_customer"
        | "customer_viewed"
        | "progress_update"
        | "diagnostic_completed"
        | "repair_started"
        | "repair_completed"
        | "quality_check"
        | "ready_for_pickup"
        | "delivered"
      service_order_priority: "low" | "medium" | "high" | "urgent"
      service_order_status:
        | "opened"
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "delivered"
        | "pending_approval"
        | "under_warranty"
        | "ready_for_pickup"
        | "waiting_parts"
        | "waiting_client"
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
      payment_status: ["succeeded", "failed", "pending", "refunded"],
      service_order_event_type_new: [
        "created",
        "status_changed",
        "payment_status_changed",
        "delivery_date_changed",
        "priority_changed",
        "item_added",
        "item_updated",
        "item_removed",
        "estimated_completion_set",
        "estimated_completion_changed",
        "actual_completion_set",
        "customer_notes_added",
        "customer_notes_updated",
        "technician_notes_added",
        "technician_notes_updated",
        "shared_with_customer",
        "customer_viewed",
        "progress_update",
        "diagnostic_completed",
        "repair_started",
        "repair_completed",
        "quality_check",
        "ready_for_pickup",
        "delivered",
      ],
      service_order_priority: ["low", "medium", "high", "urgent"],
      service_order_status: [
        "opened",
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "delivered",
        "pending_approval",
        "under_warranty",
        "ready_for_pickup",
        "waiting_parts",
        "waiting_client",
      ],
    },
  },
} as const
