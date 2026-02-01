/**
 * TypeScript types generated from the AdForge database schema
 * These types provide type-safe queries for all Supabase tables
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string;
          actor_id: string;
          target_type: string;
          target_id: string;
          action: string;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          target_type: string;
          target_id: string;
          action: string;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          target_type?: string;
          target_id?: string;
          action?: string;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      brands: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          business_type: string | null;
          industry: string | null;
          sub_industry: string | null;
          website: string | null;
          social_profiles: Json;
          logo_url: string | null;
          logo_variants: Json;
          visual_guidelines: Json;
          voice_tone: Json;
          moderation_status: string;
          moderation_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          business_type?: string | null;
          industry?: string | null;
          sub_industry?: string | null;
          website?: string | null;
          social_profiles?: Json;
          logo_url?: string | null;
          logo_variants?: Json;
          visual_guidelines?: Json;
          voice_tone?: Json;
          moderation_status?: string;
          moderation_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          business_type?: string | null;
          industry?: string | null;
          sub_industry?: string | null;
          website?: string | null;
          social_profiles?: Json;
          logo_url?: string | null;
          logo_variants?: Json;
          visual_guidelines?: Json;
          voice_tone?: Json;
          moderation_status?: string;
          moderation_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brands_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          id: string;
          brand_id: string;
          product_type: string | null;
          name: string;
          short_description: string | null;
          full_description: string | null;
          sku: string | null;
          price: number | null;
          price_range: string | null;
          images: Json;
          videos: Json;
          variants: Json;
          marketing_attributes: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          product_type?: string | null;
          name: string;
          short_description?: string | null;
          full_description?: string | null;
          sku?: string | null;
          price?: number | null;
          price_range?: string | null;
          images?: Json;
          videos?: Json;
          variants?: Json;
          marketing_attributes?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          product_type?: string | null;
          name?: string;
          short_description?: string | null;
          full_description?: string | null;
          sku?: string | null;
          price?: number | null;
          price_range?: string | null;
          images?: Json;
          videos?: Json;
          variants?: Json;
          marketing_attributes?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };
      intelligence_reports: {
        Row: {
          id: string;
          brand_id: string;
          product_id: string | null;
          report_type: string | null;
          generated_at: string;
          expires_at: string | null;
          status: string;
          competitors: Json;
          search_trends: Json;
          industry_news: Json;
          social_conversations: Json;
          audience_insights: Json;
          sources: Json;
          executive_summary: string | null;
          persona_suggestions: Json;
          raw_data: Json;
          platform_insights: Json;
          content_recommendations: Json;
          synthesized_trends: Json;
          synthesized_audience: Json;
          synthesized_competitors: Json;
          sentiment_analysis: Json;
          topic_clusters: Json;
          purchase_intent: Json;
          competitive_positioning: Json;
          media_affinity: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          product_id?: string | null;
          report_type?: string | null;
          generated_at?: string;
          expires_at?: string | null;
          status?: string;
          competitors?: Json;
          search_trends?: Json;
          industry_news?: Json;
          social_conversations?: Json;
          audience_insights?: Json;
          sources?: Json;
          executive_summary?: string | null;
          persona_suggestions?: Json;
          raw_data?: Json;
          platform_insights?: Json;
          content_recommendations?: Json;
          synthesized_trends?: Json;
          synthesized_audience?: Json;
          synthesized_competitors?: Json;
          sentiment_analysis?: Json;
          topic_clusters?: Json;
          purchase_intent?: Json;
          competitive_positioning?: Json;
          media_affinity?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          product_id?: string | null;
          report_type?: string | null;
          generated_at?: string;
          expires_at?: string | null;
          status?: string;
          competitors?: Json;
          search_trends?: Json;
          industry_news?: Json;
          social_conversations?: Json;
          audience_insights?: Json;
          sources?: Json;
          executive_summary?: string | null;
          persona_suggestions?: Json;
          raw_data?: Json;
          platform_insights?: Json;
          content_recommendations?: Json;
          synthesized_trends?: Json;
          synthesized_audience?: Json;
          synthesized_competitors?: Json;
          sentiment_analysis?: Json;
          topic_clusters?: Json;
          purchase_intent?: Json;
          competitive_positioning?: Json;
          media_affinity?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "intelligence_reports_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "intelligence_reports_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      personas: {
        Row: {
          id: string;
          brand_id: string;
          product_id: string | null;
          intelligence_report_id: string | null;
          name: string;
          photo_prompt: string | null;
          photo_url: string | null;
          backstory: string | null;
          quote: string | null;
          day_in_life: string | null;
          demographics: Json;
          professional: Json;
          psychographics: Json;
          lifestyle: Json;
          media_tech: Json;
          buying_behavior: Json;
          beliefs_attitudes: Json | null;
          media_profile: Json | null;
          creative_messaging: Json | null;
          generation_model: string;
          generation_params: Json;
          validation_status: string;
          validation_notes: string | null;
          moderation_status: string;
          moderation_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          product_id?: string | null;
          intelligence_report_id?: string | null;
          name: string;
          photo_prompt?: string | null;
          photo_url?: string | null;
          backstory?: string | null;
          quote?: string | null;
          day_in_life?: string | null;
          demographics?: Json;
          professional?: Json;
          psychographics?: Json;
          lifestyle?: Json;
          media_tech?: Json;
          buying_behavior?: Json;
          beliefs_attitudes?: Json | null;
          media_profile?: Json | null;
          creative_messaging?: Json | null;
          generation_model?: string;
          generation_params?: Json;
          validation_status?: string;
          validation_notes?: string | null;
          moderation_status?: string;
          moderation_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          product_id?: string | null;
          intelligence_report_id?: string | null;
          name?: string;
          photo_prompt?: string | null;
          photo_url?: string | null;
          backstory?: string | null;
          quote?: string | null;
          day_in_life?: string | null;
          demographics?: Json;
          professional?: Json;
          psychographics?: Json;
          lifestyle?: Json;
          media_tech?: Json;
          buying_behavior?: Json;
          beliefs_attitudes?: Json | null;
          media_profile?: Json | null;
          creative_messaging?: Json | null;
          generation_model?: string;
          generation_params?: Json;
          validation_status?: string;
          validation_notes?: string | null;
          moderation_status?: string;
          moderation_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "personas_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personas_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personas_intelligence_report_id_fkey";
            columns: ["intelligence_report_id"];
            referencedRelation: "intelligence_reports";
            referencedColumns: ["id"];
          }
        ];
      };
      audiences: {
        Row: {
          id: string;
          persona_id: string | null;
          brand_id: string;
          name: string;
          meta_targeting: Json;
          google_targeting: Json;
          linkedin_targeting: Json;
          tiktok_targeting: Json;
          pinterest_targeting: Json;
          snapchat_targeting: Json;
          size_estimates: Json;
          last_exported_at: string | null;
          export_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          persona_id?: string | null;
          brand_id: string;
          name: string;
          meta_targeting?: Json;
          google_targeting?: Json;
          linkedin_targeting?: Json;
          tiktok_targeting?: Json;
          pinterest_targeting?: Json;
          snapchat_targeting?: Json;
          size_estimates?: Json;
          last_exported_at?: string | null;
          export_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          persona_id?: string | null;
          brand_id?: string;
          name?: string;
          meta_targeting?: Json;
          google_targeting?: Json;
          linkedin_targeting?: Json;
          tiktok_targeting?: Json;
          pinterest_targeting?: Json;
          snapchat_targeting?: Json;
          size_estimates?: Json;
          last_exported_at?: string | null;
          export_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audiences_persona_id_fkey";
            columns: ["persona_id"];
            referencedRelation: "personas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audiences_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };
      audience_personas: {
        Row: {
          id: string;
          audience_id: string;
          persona_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          audience_id: string;
          persona_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          audience_id?: string;
          persona_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audience_personas_audience_id_fkey";
            columns: ["audience_id"];
            referencedRelation: "audiences";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audience_personas_persona_id_fkey";
            columns: ["persona_id"];
            referencedRelation: "personas";
            referencedColumns: ["id"];
          }
        ];
      };
      creatives: {
        Row: {
          id: string;
          brand_id: string;
          product_id: string | null;
          persona_id: string | null;
          audience_id: string | null;
          creative_type: string;
          subtype: string | null;
          file_url: string;
          thumbnail_url: string | null;
          file_size: number | null;
          dimensions: Json | null;
          duration_seconds: number | null;
          generation_prompt: string;
          generation_params: Json;
          generation_model: string;
          generation_cost: number | null;
          headline: string | null;
          subheadline: string | null;
          cta: string | null;
          body_copy: string | null;
          status: string;
          rating: number | null;
          tags: Json;
          moderation_status: string;
          moderation_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          product_id?: string | null;
          persona_id?: string | null;
          audience_id?: string | null;
          creative_type: string;
          subtype?: string | null;
          file_url: string;
          thumbnail_url?: string | null;
          file_size?: number | null;
          dimensions?: Json | null;
          duration_seconds?: number | null;
          generation_prompt: string;
          generation_params?: Json;
          generation_model: string;
          generation_cost?: number | null;
          headline?: string | null;
          subheadline?: string | null;
          cta?: string | null;
          body_copy?: string | null;
          status?: string;
          rating?: number | null;
          tags?: Json;
          moderation_status?: string;
          moderation_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          product_id?: string | null;
          persona_id?: string | null;
          audience_id?: string | null;
          creative_type?: string;
          subtype?: string | null;
          file_url?: string;
          thumbnail_url?: string | null;
          file_size?: number | null;
          dimensions?: Json | null;
          duration_seconds?: number | null;
          generation_prompt?: string;
          generation_params?: Json;
          generation_model?: string;
          generation_cost?: number | null;
          headline?: string | null;
          subheadline?: string | null;
          cta?: string | null;
          body_copy?: string | null;
          status?: string;
          rating?: number | null;
          tags?: Json;
          moderation_status?: string;
          moderation_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creatives_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creatives_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creatives_persona_id_fkey";
            columns: ["persona_id"];
            referencedRelation: "personas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creatives_audience_id_fkey";
            columns: ["audience_id"];
            referencedRelation: "audiences";
            referencedColumns: ["id"];
          }
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          tier: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          brands_limit: number;
          personas_limit: number;
          images_limit: number;
          videos_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          tier?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          brands_limit?: number;
          personas_limit?: number;
          images_limit?: number;
          videos_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          tier?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          brands_limit?: number;
          personas_limit?: number;
          images_limit?: number;
          videos_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      system_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_profiles: {
        Row: {
          id: string;
          role: string;
          disabled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: string;
          disabled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: string;
          disabled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      usage_tracking: {
        Row: {
          id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          personas_generated: number;
          images_generated: number;
          videos_generated: number;
          intelligence_reports: number;
          personas_limit: number;
          images_limit: number;
          videos_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period_start: string;
          period_end: string;
          personas_generated?: number;
          images_generated?: number;
          videos_generated?: number;
          intelligence_reports?: number;
          personas_limit: number;
          images_limit: number;
          videos_limit: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period_start?: string;
          period_end?: string;
          personas_generated?: number;
          images_generated?: number;
          videos_generated?: number;
          intelligence_reports?: number;
          personas_limit?: number;
          images_limit?: number;
          videos_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_tracking_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types for easier access to table types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience type aliases for each table
export type Brand = Tables<"brands">;
export type BrandInsert = TablesInsert<"brands">;
export type BrandUpdate = TablesUpdate<"brands">;

export type Product = Tables<"products">;
export type ProductInsert = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;

export type IntelligenceReport = Tables<"intelligence_reports">;
export type IntelligenceReportInsert = TablesInsert<"intelligence_reports">;
export type IntelligenceReportUpdate = TablesUpdate<"intelligence_reports">;

export type Persona = Tables<"personas">;
export type PersonaInsert = TablesInsert<"personas">;
export type PersonaUpdate = TablesUpdate<"personas">;

export type Audience = Tables<"audiences">;
export type AudienceInsert = TablesInsert<"audiences">;
export type AudienceUpdate = TablesUpdate<"audiences">;

export type AudiencePersona = Tables<"audience_personas">;
export type AudiencePersonaInsert = TablesInsert<"audience_personas">;

export type Creative = Tables<"creatives">;
export type CreativeInsert = TablesInsert<"creatives">;
export type CreativeUpdate = TablesUpdate<"creatives">;

export type Subscription = Tables<"subscriptions">;
export type SubscriptionInsert = TablesInsert<"subscriptions">;
export type SubscriptionUpdate = TablesUpdate<"subscriptions">;

export type UsageTracking = Tables<"usage_tracking">;
export type UsageTrackingInsert = TablesInsert<"usage_tracking">;
export type UsageTrackingUpdate = TablesUpdate<"usage_tracking">;

export type UserProfile = Tables<"user_profiles">;
export type UserProfileInsert = TablesInsert<"user_profiles">;
export type UserProfileUpdate = TablesUpdate<"user_profiles">;

export type AuditLog = Tables<"audit_logs">;
export type AuditLogInsert = TablesInsert<"audit_logs">;
export type AuditLogUpdate = TablesUpdate<"audit_logs">;

export type SystemSetting = Tables<"system_settings">;
export type SystemSettingInsert = TablesInsert<"system_settings">;
export type SystemSettingUpdate = TablesUpdate<"system_settings">;

// JSONB field types for structured data
export interface SocialProfiles {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
  pinterest?: string;
  [key: string]: string | undefined;
}

export interface LogoVariants {
  primary?: string;
  secondary?: string;
  icon?: string;
  dark?: string;
  light?: string;
  [key: string]: string | undefined;
}

export interface VisualGuidelines {
  primaryColor?: string;
  secondaryColors?: string[];
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  visualStyle?: string[];
  photographyStyle?: string[];
}

export interface VoiceTone {
  brandVoice?: string;
  toneCharacteristics?: string[];
  keyMessages?: string[];
  tagline?: string;
  wordsToAvoid?: string[];
}

export interface ProductVariant {
  name: string;
  sku?: string;
  price?: number;
  attributes?: Record<string, string>;
}

export interface MarketingAttributes {
  uvp?: string;
  benefits?: string[];
  targetProblems?: string[];
  competitiveAdvantages?: string[];
  socialProof?: string[];
}

export interface SourceAttribution {
  url: string;
  name: string;
  timestamp: string;
  confidence?: number;
}

export interface Demographics {
  age?: number;
  gender?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  education?: string;
  maritalStatus?: string;
  hasChildren?: boolean;
  householdSize?: number;
  income?: number;
  incomeRange?: string;
  ethnicity?: string;
}

export interface Professional {
  occupation?: string;
  jobTitle?: string;
  industry?: string;
  company?: string;
  companySize?: string;
  yearsExperience?: number;
  workStyle?: string;
  careerGoals?: string[];
}

export interface Psychographics {
  values?: string[];
  motivations?: string[];
  fears?: string[];
  aspirations?: string[];
  personalityTraits?: string[];
  attitudes?: string[];
}

export interface Lifestyle {
  hobbies?: string[];
  interests?: string[];
  activities?: string[];
  sports?: string[];
  travel?: string[];
  diet?: string;
  fitnessLevel?: string;
}

export interface MediaTech {
  socialPlatforms?: string[];
  newsSource?: string[];
  podcastsStreaming?: string[];
  devices?: string[];
  contentPreferences?: string[];
  screenTime?: string;
}

export interface BuyingBehavior {
  shoppingPreferences?: string[];
  pricesSensitivity?: string;
  brandLoyalty?: string;
  decisionFactors?: string[];
  purchaseFrequency?: string;
  preferredChannels?: string[];
  researchBehavior?: string;
}

export interface CreativeDimensions {
  width: number;
  height: number;
  aspectRatio?: string;
}

export interface PlatformTargeting {
  demographics?: Record<string, unknown>;
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
  [key: string]: unknown;
}

export interface SizeEstimates {
  meta?: number;
  google?: number;
  linkedin?: number;
  tiktok?: number;
  pinterest?: number;
  snapchat?: number;
}
