/**
 * Server Actions for Audience CRUD Operations
 *
 * These server actions provide type-safe database operations for audiences,
 * including creation, reading, updating, and deletion with proper validation
 * and brand/persona ownership verification.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Audience, AudienceInsert, AudienceUpdate, Json } from "@/lib/supabase/database.types";

// Response types for server actions
export type ActionResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

export type AudienceResponse = ActionResponse<Audience>;
export type AudiencesResponse = ActionResponse<Audience[]>;
export type DeleteResponse = ActionResponse<{ id: string }>;

// Input types for audience operations
export interface CreateAudienceInput {
  personaId: string;
  brandId: string;
  name: string;
  metaTargeting?: Record<string, unknown>;
  googleTargeting?: Record<string, unknown>;
  linkedinTargeting?: Record<string, unknown>;
  tiktokTargeting?: Record<string, unknown>;
  pinterestTargeting?: Record<string, unknown>;
  snapchatTargeting?: Record<string, unknown>;
  sizeEstimates?: Record<string, unknown>;
}

export interface UpdateAudienceInput {
  name?: string;
  metaTargeting?: Record<string, unknown>;
  googleTargeting?: Record<string, unknown>;
  linkedinTargeting?: Record<string, unknown>;
  tiktokTargeting?: Record<string, unknown>;
  pinterestTargeting?: Record<string, unknown>;
  snapchatTargeting?: Record<string, unknown>;
  sizeEstimates?: Record<string, unknown>;
  lastExportedAt?: string | null;
  exportCount?: number;
}

/**
 * Create a new audience
 *
 * @param input - Audience data for creation
 * @returns The created audience or an error
 */
export async function createAudience(input: CreateAudienceInput): Promise<AudienceResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to create an audience",
      };
    }

    // Validate required fields
    if (!input.personaId || !input.brandId || !input.name) {
      return {
        success: false,
        error: "Persona ID, Brand ID, and name are required",
      };
    }

    // Verify that the brand exists and belongs to the user (RLS will also enforce this)
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("id", input.brandId)
      .single();

    if (brandError || !brand) {
      return {
        success: false,
        error: "Brand not found or you don't have access to it",
      };
    }

    // Verify persona exists and belongs to the same brand
    const { data: persona, error: personaError } = await supabase
      .from("personas")
      .select("id, brand_id")
      .eq("id", input.personaId)
      .single();

    if (personaError || !persona) {
      return {
        success: false,
        error: "Persona not found or you don't have access to it",
      };
    }

    const typedPersona = persona as { id: string; brand_id: string };

    // Verify persona belongs to the same brand
    if (typedPersona.brand_id !== input.brandId) {
      return {
        success: false,
        error: "Persona does not belong to the specified brand",
      };
    }

    // Build insert data
    const insertData: AudienceInsert = {
      persona_id: input.personaId,
      brand_id: input.brandId,
      name: input.name,
      meta_targeting: (input.metaTargeting ?? {}) as Json,
      google_targeting: (input.googleTargeting ?? {}) as Json,
      linkedin_targeting: (input.linkedinTargeting ?? {}) as Json,
      tiktok_targeting: (input.tiktokTargeting ?? {}) as Json,
      pinterest_targeting: (input.pinterestTargeting ?? {}) as Json,
      snapchat_targeting: (input.snapchatTargeting ?? {}) as Json,
      size_estimates: (input.sizeEstimates ?? {}) as Json,
    };

    // Insert audience
    const { data: audience, error } = await supabase
      .from("audiences")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("Error creating audience:", error);
      return {
        success: false,
        error: "Failed to create audience. Please try again.",
      };
    }

    // Revalidate relevant pages
    revalidatePath(`/brands/${input.brandId}`);
    revalidatePath(`/brands/${input.brandId}/personas`);
    revalidatePath(`/brands/${input.brandId}/personas/${input.personaId}`);

    return {
      success: true,
      data: audience as Audience,
    };
  } catch (err) {
    console.error("Unexpected error in createAudience:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get a single audience by ID
 *
 * @param audienceId - UUID of the audience to retrieve
 * @returns The audience or an error
 */
export async function getAudience(audienceId: string): Promise<AudienceResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to view audiences",
      };
    }

    const { data: audience, error } = await supabase
      .from("audiences")
      .select()
      .eq("id", audienceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Audience not found",
        };
      }
      console.error("Error fetching audience:", error);
      return {
        success: false,
        error: "Failed to fetch audience. Please try again.",
      };
    }

    return {
      success: true,
      data: audience as Audience,
    };
  } catch (err) {
    console.error("Unexpected error in getAudience:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get all audiences for a specific brand
 *
 * @param brandId - UUID of the brand to get audiences for
 * @param personaId - Optional UUID of the persona to filter audiences
 * @returns Array of audiences or an error
 */
export async function getAudiences(
  brandId: string,
  personaId?: string | null
): Promise<AudiencesResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to view audiences",
      };
    }

    let query = supabase
      .from("audiences")
      .select()
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    // Filter by persona if provided
    if (personaId) {
      query = query.eq("persona_id", personaId);
    }

    const { data: audiences, error } = await query;

    if (error) {
      console.error("Error fetching audiences:", error);
      return {
        success: false,
        error: "Failed to fetch audiences. Please try again.",
      };
    }

    return {
      success: true,
      data: (audiences ?? []) as Audience[],
    };
  } catch (err) {
    console.error("Unexpected error in getAudiences:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Update an existing audience
 *
 * @param audienceId - UUID of the audience to update
 * @param input - Audience data to update
 * @returns The updated audience or an error
 */
export async function updateAudience(
  audienceId: string,
  input: UpdateAudienceInput
): Promise<AudienceResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to update audiences",
      };
    }

    // Build update object with only provided fields
    const updateData: AudienceUpdate = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.metaTargeting !== undefined) updateData.meta_targeting = input.metaTargeting as Json;
    if (input.googleTargeting !== undefined)
      updateData.google_targeting = input.googleTargeting as Json;
    if (input.linkedinTargeting !== undefined)
      updateData.linkedin_targeting = input.linkedinTargeting as Json;
    if (input.tiktokTargeting !== undefined)
      updateData.tiktok_targeting = input.tiktokTargeting as Json;
    if (input.pinterestTargeting !== undefined)
      updateData.pinterest_targeting = input.pinterestTargeting as Json;
    if (input.snapchatTargeting !== undefined)
      updateData.snapchat_targeting = input.snapchatTargeting as Json;
    if (input.sizeEstimates !== undefined) updateData.size_estimates = input.sizeEstimates as Json;
    if (input.lastExportedAt !== undefined) updateData.last_exported_at = input.lastExportedAt;
    if (input.exportCount !== undefined) updateData.export_count = input.exportCount;

    // Update audience
    const { data: audience, error } = await supabase
      .from("audiences")
      .update(updateData as never)
      .eq("id", audienceId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Audience not found",
        };
      }
      console.error("Error updating audience:", error);
      return {
        success: false,
        error: "Failed to update audience. Please try again.",
      };
    }

    const typedAudience = audience as Audience;

    // Revalidate relevant pages
    revalidatePath(`/brands/${typedAudience.brand_id}`);
    revalidatePath(`/brands/${typedAudience.brand_id}/personas`);
    revalidatePath(`/brands/${typedAudience.brand_id}/personas/${typedAudience.persona_id}`);
    revalidatePath(
      `/brands/${typedAudience.brand_id}/personas/${typedAudience.persona_id}/audience`
    );

    return {
      success: true,
      data: typedAudience,
    };
  } catch (err) {
    console.error("Unexpected error in updateAudience:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Delete an audience
 *
 * @param audienceId - UUID of the audience to delete
 * @returns Success status or an error
 */
export async function deleteAudience(audienceId: string): Promise<DeleteResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to delete audiences",
      };
    }

    // First get the audience to know brand_id and persona_id for cache revalidation
    const { data: existingAudience, error: fetchError } = await supabase
      .from("audiences")
      .select("brand_id, persona_id")
      .eq("id", audienceId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return {
          success: false,
          error: "Audience not found",
        };
      }
      console.error("Error fetching audience for deletion:", fetchError);
      return {
        success: false,
        error: "Failed to delete audience. Please try again.",
      };
    }

    const typedExisting = existingAudience as { brand_id: string; persona_id: string };

    // Delete audience (RLS ensures user can only delete audiences from their own brands)
    const { error } = await supabase.from("audiences").delete().eq("id", audienceId);

    if (error) {
      console.error("Error deleting audience:", error);
      return {
        success: false,
        error: "Failed to delete audience. Please try again.",
      };
    }

    // Revalidate relevant pages
    revalidatePath(`/brands/${typedExisting.brand_id}`);
    revalidatePath(`/brands/${typedExisting.brand_id}/personas`);
    revalidatePath(`/brands/${typedExisting.brand_id}/personas/${typedExisting.persona_id}`);

    return {
      success: true,
      data: { id: audienceId },
    };
  } catch (err) {
    console.error("Unexpected error in deleteAudience:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Record an audience export (increments export_count and updates last_exported_at)
 *
 * @param audienceId - UUID of the audience that was exported
 * @returns The updated audience or an error
 */
export async function recordAudienceExport(audienceId: string): Promise<AudienceResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to export audiences",
      };
    }

    // First get current export_count
    const { data: existingAudience, error: fetchError } = await supabase
      .from("audiences")
      .select("export_count")
      .eq("id", audienceId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return {
          success: false,
          error: "Audience not found",
        };
      }
      console.error("Error fetching audience:", fetchError);
      return {
        success: false,
        error: "Failed to record export. Please try again.",
      };
    }

    const currentCount = (existingAudience as { export_count: number }).export_count || 0;

    // Update export tracking
    const { data: audience, error } = await supabase
      .from("audiences")
      .update({
        export_count: currentCount + 1,
        last_exported_at: new Date().toISOString(),
      } as never)
      .eq("id", audienceId)
      .select()
      .single();

    if (error) {
      console.error("Error recording audience export:", error);
      return {
        success: false,
        error: "Failed to record export. Please try again.",
      };
    }

    return {
      success: true,
      data: audience as Audience,
    };
  } catch (err) {
    console.error("Unexpected error in recordAudienceExport:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
