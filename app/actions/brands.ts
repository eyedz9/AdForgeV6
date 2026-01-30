/**
 * Server Actions for Brand CRUD Operations
 *
 * These server actions provide type-safe database operations for brands,
 * including creation, reading, updating, and deletion with proper validation
 * and subscription limit checking.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createBrandSchema,
  updateBrandSchema,
  type CreateBrandInput,
  type UpdateBrandInput,
} from "@/lib/validations/brand";
import type { Brand, BrandInsert, BrandUpdate, Subscription, Json } from "@/lib/supabase/database.types";

// Response types for server actions
export type ActionResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export type BrandResponse = ActionResponse<Brand>;
export type BrandsResponse = ActionResponse<Brand[]>;
export type DeleteResponse = ActionResponse<{ id: string }>;

/**
 * Check if user can create more brands based on subscription limits
 */
async function checkBrandLimit(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const supabase = await createClient();

  // Get user's subscription to check brand limit
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("brands_limit")
    .eq("user_id", userId)
    .single();

  // Default to free tier limit if no subscription found
  const sub = subscription as Pick<Subscription, "brands_limit"> | null;
  const limit = sub?.brands_limit ?? 1;

  if (subError && subError.code !== "PGRST116") {
    // PGRST116 = no rows returned (user has no subscription yet)
    console.error("Error fetching subscription:", subError);
  }

  // Count existing brands
  const { count, error: countError } = await supabase
    .from("brands")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    console.error("Error counting brands:", countError);
    return { allowed: false, remaining: 0, limit };
  }

  const currentCount = count ?? 0;

  // -1 means unlimited (agency/enterprise tiers)
  if (limit < 0) {
    return { allowed: true, remaining: Infinity, limit };
  }

  const remaining = Math.max(0, limit - currentCount);

  return {
    allowed: currentCount < limit,
    remaining,
    limit,
  };
}

/**
 * Create a new brand
 *
 * @param input - Brand data validated against createBrandSchema
 * @returns The created brand or an error
 */
export async function createBrand(input: CreateBrandInput): Promise<BrandResponse> {
  try {
    // Validate input
    const validationResult = createBrandSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      };
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to create a brand",
      };
    }

    // Check subscription limit
    const limitCheck = await checkBrandLimit(user.id);
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `You have reached your brand limit (${limitCheck.limit}). Please upgrade your subscription to create more brands.`,
      };
    }

    const data = validationResult.data;

    // Build insert data
    const insertData: BrandInsert = {
      user_id: user.id,
      name: data.name,
      business_type: data.businessType ?? null,
      industry: data.industry ?? null,
      sub_industry: data.subIndustry ?? null,
      website: data.website || null,
      social_profiles: (data.socialProfiles ?? {}) as Json,
      logo_url: data.logoUrl || null,
      logo_variants: (data.logoVariants ?? {}) as Json,
      visual_guidelines: (data.visualGuidelines ?? {}) as Json,
      voice_tone: (data.voiceTone ?? {}) as Json,
    };

    // Insert brand
    const { data: brand, error } = await supabase
      .from("brands")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("Error creating brand:", error);
      return {
        success: false,
        error: "Failed to create brand. Please try again.",
      };
    }

    // Revalidate brands list page
    revalidatePath("/brands");

    return {
      success: true,
      data: brand as Brand,
    };
  } catch (err) {
    console.error("Unexpected error in createBrand:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get a single brand by ID
 *
 * @param brandId - UUID of the brand to retrieve
 * @returns The brand or an error
 */
export async function getBrand(brandId: string): Promise<BrandResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to view brands",
      };
    }

    const { data: brand, error } = await supabase
      .from("brands")
      .select()
      .eq("id", brandId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Brand not found",
        };
      }
      console.error("Error fetching brand:", error);
      return {
        success: false,
        error: "Failed to fetch brand. Please try again.",
      };
    }

    return {
      success: true,
      data: brand as Brand,
    };
  } catch (err) {
    console.error("Unexpected error in getBrand:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get all brands for the authenticated user
 *
 * @returns Array of brands or an error
 */
export async function getBrands(): Promise<BrandsResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to view brands",
      };
    }

    const { data: brands, error } = await supabase
      .from("brands")
      .select()
      .not("moderation_status", "in", '("disabled","deleted")')
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching brands:", error);
      return {
        success: false,
        error: "Failed to fetch brands. Please try again.",
      };
    }

    return {
      success: true,
      data: (brands ?? []) as Brand[],
    };
  } catch (err) {
    console.error("Unexpected error in getBrands:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Update an existing brand
 *
 * @param brandId - UUID of the brand to update
 * @param input - Brand data validated against updateBrandSchema
 * @returns The updated brand or an error
 */
export async function updateBrand(
  brandId: string,
  input: UpdateBrandInput
): Promise<BrandResponse> {
  try {
    // Validate input
    const validationResult = updateBrandSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      };
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to update brands",
      };
    }

    const data = validationResult.data;

    // Build update object with only provided fields
    const updateData: BrandUpdate = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.businessType !== undefined) updateData.business_type = data.businessType;
    if (data.industry !== undefined) updateData.industry = data.industry;
    if (data.subIndustry !== undefined) updateData.sub_industry = data.subIndustry;
    if (data.website !== undefined) updateData.website = data.website || null;
    if (data.socialProfiles !== undefined) updateData.social_profiles = data.socialProfiles as Json;
    if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl || null;
    if (data.logoVariants !== undefined) updateData.logo_variants = data.logoVariants as Json;
    if (data.visualGuidelines !== undefined) updateData.visual_guidelines = data.visualGuidelines as Json;
    if (data.voiceTone !== undefined) updateData.voice_tone = data.voiceTone as Json;

    // Update brand
    const { data: brand, error } = await supabase
      .from("brands")
      .update(updateData as never)
      .eq("id", brandId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Brand not found",
        };
      }
      console.error("Error updating brand:", error);
      return {
        success: false,
        error: "Failed to update brand. Please try again.",
      };
    }

    // Revalidate brand pages
    revalidatePath("/brands");
    revalidatePath(`/brands/${brandId}`);

    return {
      success: true,
      data: brand as Brand,
    };
  } catch (err) {
    console.error("Unexpected error in updateBrand:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Delete a brand
 *
 * @param brandId - UUID of the brand to delete
 * @returns Success status or an error
 */
export async function deleteBrand(brandId: string): Promise<DeleteResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to delete brands",
      };
    }

    // Delete brand (RLS ensures user can only delete their own brands)
    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("id", brandId);

    if (error) {
      console.error("Error deleting brand:", error);
      return {
        success: false,
        error: "Failed to delete brand. Please try again.",
      };
    }

    // Revalidate brands list page
    revalidatePath("/brands");

    return {
      success: true,
      data: { id: brandId },
    };
  } catch (err) {
    console.error("Unexpected error in deleteBrand:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get remaining brand count for subscription
 *
 * @returns Brand limit information or an error
 */
export async function getBrandLimitInfo(): Promise<ActionResponse<{ used: number; remaining: number; limit: number }>> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to view brand limits",
      };
    }

    const limitInfo = await checkBrandLimit(user.id);
    const unlimited = limitInfo.limit < 0;

    return {
      success: true,
      data: {
        used: unlimited ? 0 : limitInfo.limit - limitInfo.remaining,
        remaining: unlimited ? -1 : limitInfo.remaining,
        limit: limitInfo.limit,
      },
    };
  } catch (err) {
    console.error("Unexpected error in getBrandLimitInfo:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
