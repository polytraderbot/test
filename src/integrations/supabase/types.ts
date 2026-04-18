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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          delivered: boolean | null
          id: string
          message: string
          symbol: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          delivered?: boolean | null
          id?: string
          message: string
          symbol: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          delivered?: boolean | null
          id?: string
          message?: string
          symbol?: string
        }
        Relationships: []
      }
      asset_mentions: {
        Row: {
          asset_id: string | null
          asset_symbol: string
          crawl_id: string
          id: string
          mention_context: string | null
          mentioned_at: string
          page_id: string | null
          source_id: string | null
        }
        Insert: {
          asset_id?: string | null
          asset_symbol: string
          crawl_id: string
          id?: string
          mention_context?: string | null
          mentioned_at?: string
          page_id?: string | null
          source_id?: string | null
        }
        Update: {
          asset_id?: string | null
          asset_symbol?: string
          crawl_id?: string
          id?: string
          mention_context?: string | null
          mentioned_at?: string
          page_id?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_mentions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_mentions_crawl_id_fkey"
            columns: ["crawl_id"]
            isOneToOne: false
            referencedRelation: "crawls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_mentions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "crawl_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_mentions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          change_24h: number | null
          crawl_id: string | null
          created_at: string
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          market_cap: number | null
          name: string
          price: number | null
          scrape_id: string
          source_url: string | null
          sources_count: number
          symbol: string
          technical_data: Json | null
          volume_24h: number | null
        }
        Insert: {
          change_24h?: number | null
          crawl_id?: string | null
          created_at?: string
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          market_cap?: number | null
          name: string
          price?: number | null
          scrape_id: string
          source_url?: string | null
          sources_count?: number
          symbol: string
          technical_data?: Json | null
          volume_24h?: number | null
        }
        Update: {
          change_24h?: number | null
          crawl_id?: string | null
          created_at?: string
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          market_cap?: number | null
          name?: string
          price?: number | null
          scrape_id?: string
          source_url?: string | null
          sources_count?: number
          symbol?: string
          technical_data?: Json | null
          volume_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_crawl_id_fkey"
            columns: ["crawl_id"]
            isOneToOne: false
            referencedRelation: "crawls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_scrape_id_fkey"
            columns: ["scrape_id"]
            isOneToOne: false
            referencedRelation: "scrapes"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_pages: {
        Row: {
          content_md: string | null
          crawl_id: string
          created_at: string
          fetched_at: string | null
          id: string
          source_id: string | null
          title: string | null
          url: string
        }
        Insert: {
          content_md?: string | null
          crawl_id: string
          created_at?: string
          fetched_at?: string | null
          id?: string
          source_id?: string | null
          title?: string | null
          url: string
        }
        Update: {
          content_md?: string | null
          crawl_id?: string
          created_at?: string
          fetched_at?: string | null
          id?: string
          source_id?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_pages_crawl_id_fkey"
            columns: ["crawl_id"]
            isOneToOne: false
            referencedRelation: "crawls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_pages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      crawls: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          max_depth: number
          page_limit: number
          pages_count: number | null
          sources_count: number
          start_url: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          max_depth?: number
          page_limit?: number
          pages_count?: number | null
          sources_count?: number
          start_url: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          max_depth?: number
          page_limit?: number
          pages_count?: number | null
          sources_count?: number
          start_url?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      indicators: {
        Row: {
          bb_lower: number | null
          bb_percent_b: number | null
          bb_upper: number | null
          captured_at: string
          id: string
          macd: number | null
          macd_histogram: number | null
          macd_signal: number | null
          rsi: number | null
          symbol: string
          volume_spike: number | null
        }
        Insert: {
          bb_lower?: number | null
          bb_percent_b?: number | null
          bb_upper?: number | null
          captured_at?: string
          id?: string
          macd?: number | null
          macd_histogram?: number | null
          macd_signal?: number | null
          rsi?: number | null
          symbol: string
          volume_spike?: number | null
        }
        Update: {
          bb_lower?: number | null
          bb_percent_b?: number | null
          bb_upper?: number | null
          captured_at?: string
          id?: string
          macd?: number | null
          macd_histogram?: number | null
          macd_signal?: number | null
          rsi?: number | null
          symbol?: string
          volume_spike?: number | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          level: string
          message: string
          meta_json: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          level?: string
          message: string
          meta_json?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          level?: string
          message?: string
          meta_json?: Json | null
        }
        Relationships: []
      }
      news_items: {
        Row: {
          captured_at: string
          id: string
          sentiment_score: number | null
          snippet: string | null
          source: string
          title: string
          url: string | null
        }
        Insert: {
          captured_at?: string
          id?: string
          sentiment_score?: number | null
          snippet?: string | null
          source: string
          title: string
          url?: string | null
        }
        Update: {
          captured_at?: string
          id?: string
          sentiment_score?: number | null
          snippet?: string | null
          source?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      onchain_metrics: {
        Row: {
          captured_at: string
          id: string
          metric_name: string
          metric_value: number | null
          source: string
          symbol: string
        }
        Insert: {
          captured_at?: string
          id?: string
          metric_name: string
          metric_value?: number | null
          source?: string
          symbol: string
        }
        Update: {
          captured_at?: string
          id?: string
          metric_name?: string
          metric_value?: number | null
          source?: string
          symbol?: string
        }
        Relationships: []
      }
      prices: {
        Row: {
          captured_at: string
          change_24h: number | null
          id: string
          market_cap: number | null
          price: number | null
          source: string
          symbol: string
          volume_24h: number | null
        }
        Insert: {
          captured_at?: string
          change_24h?: number | null
          id?: string
          market_cap?: number | null
          price?: number | null
          source?: string
          symbol: string
          volume_24h?: number | null
        }
        Update: {
          captured_at?: string
          change_24h?: number | null
          id?: string
          market_cap?: number | null
          price?: number | null
          source?: string
          symbol?: string
          volume_24h?: number | null
        }
        Relationships: []
      }
      reddit_posts: {
        Row: {
          created_at: string
          engagement_score: number | null
          id: string
          reddit_created_at: string | null
          scrape_id: string | null
          sentiment_label: string | null
          snippet: string | null
          subreddit: string
          symbols: Json | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          engagement_score?: number | null
          id?: string
          reddit_created_at?: string | null
          scrape_id?: string | null
          sentiment_label?: string | null
          snippet?: string | null
          subreddit: string
          symbols?: Json | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          engagement_score?: number | null
          id?: string
          reddit_created_at?: string | null
          scrape_id?: string | null
          sentiment_label?: string | null
          snippet?: string | null
          subreddit?: string
          symbols?: Json | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reddit_posts_scrape_id_fkey"
            columns: ["scrape_id"]
            isOneToOne: false
            referencedRelation: "scrapes"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          meta_json: Json | null
          run_type: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          meta_json?: Json | null
          run_type: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          meta_json?: Json | null
          run_type?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      scrapes: {
        Row: {
          created_at: string
          id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      sentiment: {
        Row: {
          captured_at: string
          id: string
          label: string | null
          score: number | null
          source_count: number | null
          symbol: string
        }
        Insert: {
          captured_at?: string
          id?: string
          label?: string | null
          score?: number | null
          source_count?: number | null
          symbol: string
        }
        Update: {
          captured_at?: string
          id?: string
          label?: string | null
          score?: number | null
          source_count?: number | null
          symbol?: string
        }
        Relationships: []
      }
      signal_evidence: {
        Row: {
          created_at: string
          id: string
          page_url: string | null
          signal_id: string
          snippet: string | null
          source_name: string
          symbol: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_url?: string | null
          signal_id: string
          snippet?: string | null
          source_name: string
          symbol?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_url?: string | null
          signal_id?: string
          snippet?: string | null
          source_name?: string
          symbol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signal_evidence_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          asset_id: string | null
          beginner_explanation: string | null
          confidence: string
          confidence_score: number | null
          conflict_flag: boolean | null
          crawl_id: string
          created_at: string
          id: string
          reason: string | null
          risk_tags: Json | null
          signal_type: string
          sources_count: number
          symbol: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          beginner_explanation?: string | null
          confidence?: string
          confidence_score?: number | null
          conflict_flag?: boolean | null
          crawl_id: string
          created_at?: string
          id?: string
          reason?: string | null
          risk_tags?: Json | null
          signal_type?: string
          sources_count?: number
          symbol?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          beginner_explanation?: string | null
          confidence?: string
          confidence_score?: number | null
          conflict_flag?: boolean | null
          crawl_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          risk_tags?: Json | null
          signal_type?: string
          sources_count?: number
          symbol?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_crawl_id_fkey"
            columns: ["crawl_id"]
            isOneToOne: false
            referencedRelation: "crawls"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          id: string
          interval_seconds: number | null
          is_active: boolean
          name: string | null
          source_type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_seconds?: number | null
          is_active?: boolean
          name?: string | null
          source_type?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_seconds?: number | null
          is_active?: boolean
          name?: string | null
          source_type?: string
          url?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          crawl_id: string | null
          created_at: string
          id: string
          scrape_id: string
          story_json: Json
        }
        Insert: {
          crawl_id?: string | null
          created_at?: string
          id?: string
          scrape_id: string
          story_json: Json
        }
        Update: {
          crawl_id?: string | null
          created_at?: string
          id?: string
          scrape_id?: string
          story_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "stories_crawl_id_fkey"
            columns: ["crawl_id"]
            isOneToOne: false
            referencedRelation: "crawls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_scrape_id_fkey"
            columns: ["scrape_id"]
            isOneToOne: false
            referencedRelation: "scrapes"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          symbol: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          symbol?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          symbol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
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
