/**
 * Server Actions for Creative CRUD Operations
 *
 * These server actions provide type-safe database operations for creatives,
 * including creation, reading, updating, deletion, and rating with proper
 * validation and brand ownership verification. The deleteCreative action
 * also removes the associated file from Supabase Storage.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Creative, CreativeInsert, CreativeUpdate, Json } from "@/lib/supabase/database.types";
import {
  creativeTypes,
  type CreativeType,
  type ImageSubtype,
  type VideoSubtype,
  type CreativeStatus,
} from "@/lib/validations/creative";

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

export type CreativeResponse = ActionResponse<Creative>;
export type CreativesResponse = ActionResponse<Creative[]>;
export type DeleteResponse = ActionResponse<{ id: string }>;

// Note: CreativeType, ImageSubtype, VideoSubtype, CreativeStatus types
// should be imported from "@/lib/validations/creative" directly

// Input types for creative operations
export interface CreateCreativeInput {
  brandId: string;
  productId?: string | null;
  personaId?: string | null;
  audienceId?: string | null;
  creativeType: CreativeType;
  subtype?: string | null;
  fileUrl: string;
  thumbnailUrl?: string | null;
  fileSize?: number | null;
  dimensions?: { width: number; height: number; aspectRatio?: string } | null;
  durationSeconds?: number | null;
  generationPrompt: string;
  generationParams?: Record<string, unknown>;
  generationModel: string;
  generationCost?: number | null;
  headline?: string | null;
  subheadline?: string | null;
  cta?: string | null;
  bodyCopy?: string | null;
  status?: CreativeStatus;
  tags?: string[];
}

export interface UpdateCreativeInput {
  productId?: string | null;
  personaId?: string | null;
  audienceId?: string | null;
  creativeType?: CreativeType;
  subtype?: string | null;
  fileUrl?: string;
  thumbnailUrl?: string | null;
  fileSize?: number | null;
  dimensions?: { width: number; height: number; aspectRatio?: string } | null;
  durationSeconds?: number | null;
  generationPrompt?: string;
  generationParams?: Record<string, unknown>;
  generationModel?: string;
  generationCost?: number | null;
  headline?: string | null;
  subheadline?: string | null;
  cta?: string | null;
  bodyCopy?: string | null;
  status?: CreativeStatus;
  rating?: number | null;
  tags?: string[];
}

export interface GetCreativesFilters {
  creativeType?: CreativeType | null;
  subtype?: string | null;
  personaId?: string | null;
  productId?: string | null;
  status?: CreativeStatus | null;
}

/**
 * Create a new creative
 *
 * @param input - Creative data for creation
 * @returns The created creative or an error
 */
export async function createCreative(input: CreateCreativeInput): Promise<CreativeResponse> {
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
        error: "You must be logged in to create a creative",
      };
    }

    // Validate required fields
    if (
      !input.brandId ||
      !input.creativeType ||
      !input.fileUrl ||
      !input.generationPrompt ||
      !input.generationModel
    ) {
      return {
        success: false,
        error:
          "Brand ID, creative type, file URL, generation prompt, and generation model are required",
      };
    }

    // Validate creative type
    if (!creativeTypes.includes(input.creativeType)) {
      return {
        success: false,
        error: `Invalid creative type. Must be one of: ${creativeTypes.join(", ")}`,
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

    // Verify optional relationships if provided
    if (input.productId) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, brand_id")
        .eq("id", input.productId)
        .single();

      if (productError || !product) {
        return {
          success: false,
          error: "Product not found or you don't have access to it",
        };
      }

      const typedProduct = product as { id: string; brand_id: string };
      if (typedProduct.brand_id !== input.brandId) {
        return {
          success: false,
          error: "Product does not belong to the specified brand",
        };
      }
    }

    if (input.personaId) {
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
      if (typedPersona.brand_id !== input.brandId) {
        return {
          success: false,
          error: "Persona does not belong to the specified brand",
        };
      }
    }

    if (input.audienceId) {
      const { data: audience, error: audienceError } = await supabase
        .from("audiences")
        .select("id, brand_id")
        .eq("id", input.audienceId)
        .single();

      if (audienceError || !audience) {
        return {
          success: false,
          error: "Audience not found or you don't have access to it",
        };
      }

      const typedAudience = audience as { id: string; brand_id: string };
      if (typedAudience.brand_id !== input.brandId) {
        return {
          success: false,
          error: "Audience does not belong to the specified brand",
        };
      }
    }

    // Build insert data
    const insertData: CreativeInsert = {
      brand_id: input.brandId,
      product_id: input.productId ?? null,
      persona_id: input.personaId ?? null,
      audience_id: input.audienceId ?? null,
      creative_type: input.creativeType,
      subtype: input.subtype ?? null,
      file_url: input.fileUrl,
      thumbnail_url: input.thumbnailUrl ?? null,
      file_size: input.fileSize ?? null,
      dimensions: (input.dimensions ?? null) as Json | null,
      duration_seconds: input.durationSeconds ?? null,
      generation_prompt: input.generationPrompt,
      generation_params: (input.generationParams ?? {}) as Json,
      generation_model: input.generationModel,
      generation_cost: input.generationCost ?? null,
      headline: input.headline ?? null,
      subheadline: input.subheadline ?? null,
      cta: input.cta ?? null,
      body_copy: input.bodyCopy ?? null,
      status: input.status ?? "generated",
      tags: (input.tags ?? []) as Json,
    };

    // Insert creative
    const { data: creative, error } = await supabase
      .from("creatives")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("Error creating creative:", error);
      return {
        success: false,
        error: "Failed to create creative. Please try again.",
      };
    }

    // Revalidate relevant pages
    revalidatePath(`/brands/${input.brandId}`);
    revalidatePath(`/brands/${input.brandId}/creatives`);
    if (input.personaId) {
      revalidatePath(`/brands/${input.brandId}/personas/${input.personaId}`);
    }

    return {
      success: true,
      data: creative as Creative,
    };
  } catch (err) {
    console.error("Unexpected error in createCreative:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get a single creative by ID
 *
 * @param creativeId - UUID of the creative to retrieve
 * @returns The creative or an error
 */
export async function getCreative(creativeId: string): Promise<CreativeResponse> {
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
        error: "You must be logged in to view creatives",
      };
    }

    const { data: creative, error } = await supabase
      .from("creatives")
      .select()
      .eq("id", creativeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Creative not found",
        };
      }
      console.error("Error fetching creative:", error);
      return {
        success: false,
        error: "Failed to fetch creative. Please try again.",
      };
    }

    return {
      success: true,
      data: creative as Creative,
    };
  } catch (err) {
    console.error("Unexpected error in getCreative:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get all creatives for a specific brand with optional filters
 *
 * @param brandId - UUID of the brand to get creatives for
 * @param filters - Optional filters for creative type, persona, product, status
 * @returns Array of creatives or an error
 */
export async function getCreatives(
  brandId: string,
  filters?: GetCreativesFilters | null
): Promise<CreativesResponse> {
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
        error: "You must be logged in to view creatives",
      };
    }

    let query = supabase
      .from("creatives")
      .select()
      .eq("brand_id", brandId)
      .not("moderation_status", "in", '("disabled","deleted")')
      .order("created_at", { ascending: false });

    // Apply filters if provided
    if (filters?.creativeType) {
      query = query.eq("creative_type", filters.creativeType);
    }
    if (filters?.subtype) {
      query = query.eq("subtype", filters.subtype);
    }
    if (filters?.personaId) {
      query = query.eq("persona_id", filters.personaId);
    }
    if (filters?.productId) {
      query = query.eq("product_id", filters.productId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data: creatives, error } = await query;

    if (error) {
      console.error("Error fetching creatives:", error);
      return {
        success: false,
        error: "Failed to fetch creatives. Please try again.",
      };
    }

    return {
      success: true,
      data: (creatives ?? []) as Creative[],
    };
  } catch (err) {
    console.error("Unexpected error in getCreatives:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Update an existing creative
 *
 * @param creativeId - UUID of the creative to update
 * @param input - Creative data to update
 * @returns The updated creative or an error
 */
export async function updateCreative(
  creativeId: string,
  input: UpdateCreativeInput
): Promise<CreativeResponse> {
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
        error: "You must be logged in to update creatives",
      };
    }

    // Build update object with only provided fields
    const updateData: CreativeUpdate = {};

    if (input.productId !== undefined) updateData.product_id = input.productId;
    if (input.personaId !== undefined) updateData.persona_id = input.personaId;
    if (input.audienceId !== undefined) updateData.audience_id = input.audienceId;
    if (input.creativeType !== undefined) updateData.creative_type = input.creativeType;
    if (input.subtype !== undefined) updateData.subtype = input.subtype;
    if (input.fileUrl !== undefined) updateData.file_url = input.fileUrl;
    if (input.thumbnailUrl !== undefined) updateData.thumbnail_url = input.thumbnailUrl;
    if (input.fileSize !== undefined) updateData.file_size = input.fileSize;
    if (input.dimensions !== undefined) updateData.dimensions = input.dimensions as Json | null;
    if (input.durationSeconds !== undefined) updateData.duration_seconds = input.durationSeconds;
    if (input.generationPrompt !== undefined) updateData.generation_prompt = input.generationPrompt;
    if (input.generationParams !== undefined)
      updateData.generation_params = input.generationParams as Json;
    if (input.generationModel !== undefined) updateData.generation_model = input.generationModel;
    if (input.generationCost !== undefined) updateData.generation_cost = input.generationCost;
    if (input.headline !== undefined) updateData.headline = input.headline;
    if (input.subheadline !== undefined) updateData.subheadline = input.subheadline;
    if (input.cta !== undefined) updateData.cta = input.cta;
    if (input.bodyCopy !== undefined) updateData.body_copy = input.bodyCopy;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.rating !== undefined) updateData.rating = input.rating;
    if (input.tags !== undefined) updateData.tags = input.tags as Json;

    // Update creative
    const { data: creative, error } = await supabase
      .from("creatives")
      .update(updateData as never)
      .eq("id", creativeId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Creative not found",
        };
      }
      console.error("Error updating creative:", error);
      return {
        success: false,
        error: "Failed to update creative. Please try again.",
      };
    }

    const typedCreative = creative as Creative;

    // Revalidate relevant pages
    revalidatePath(`/brands/${typedCreative.brand_id}`);
    revalidatePath(`/brands/${typedCreative.brand_id}/creatives`);
    if (typedCreative.persona_id) {
      revalidatePath(`/brands/${typedCreative.brand_id}/personas/${typedCreative.persona_id}`);
    }

    return {
      success: true,
      data: typedCreative,
    };
  } catch (err) {
    console.error("Unexpected error in updateCreative:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Delete a creative and remove its file from storage
 *
 * @param creativeId - UUID of the creative to delete
 * @returns Success status or an error
 */
export async function deleteCreative(creativeId: string): Promise<DeleteResponse> {
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
        error: "You must be logged in to delete creatives",
      };
    }

    // First get the creative to know brand_id and file URLs for cache revalidation and storage deletion
    const { data: existingCreative, error: fetchError } = await supabase
      .from("creatives")
      .select("brand_id, persona_id, file_url, thumbnail_url")
      .eq("id", creativeId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return {
          success: false,
          error: "Creative not found",
        };
      }
      console.error("Error fetching creative for deletion:", fetchError);
      return {
        success: false,
        error: "Failed to delete creative. Please try again.",
      };
    }

    const typedExisting = existingCreative as {
      brand_id: string;
      persona_id: string | null;
      file_url: string;
      thumbnail_url: string | null;
    };

    // Delete the creative record first (RLS ensures user can only delete creatives from their own brands)
    const { error } = await supabase.from("creatives").delete().eq("id", creativeId);

    if (error) {
      console.error("Error deleting creative:", error);
      return {
        success: false,
        error: "Failed to delete creative. Please try again.",
      };
    }

    // Now delete the files from storage
    // Extract the storage path from the file URL
    const deleteFilesFromStorage = async (fileUrl: string) => {
      try {
        // Parse the storage path from the full URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/creatives/user_id/filename
        const url = new URL(fileUrl);
        const pathParts = url.pathname.split("/storage/v1/object/public/");
        if (pathParts.length === 2) {
          const [bucket, ...pathSegments] = pathParts[1].split("/");
          const filePath = pathSegments.join("/");

          if (bucket && filePath) {
            const { error: storageError } = await supabase.storage.from(bucket).remove([filePath]);

            if (storageError) {
              // Log but don't fail the deletion - the DB record is already gone
              console.warn(`Failed to delete file from storage: ${filePath}`, storageError);
            }
          }
        }
      } catch (urlError) {
        // If URL parsing fails, log but don't fail the deletion
        console.warn("Failed to parse file URL for storage deletion:", urlError);
      }
    };

    // Delete main file
    if (typedExisting.file_url) {
      await deleteFilesFromStorage(typedExisting.file_url);
    }

    // Delete thumbnail if exists
    if (typedExisting.thumbnail_url) {
      await deleteFilesFromStorage(typedExisting.thumbnail_url);
    }

    // Revalidate relevant pages
    revalidatePath(`/brands/${typedExisting.brand_id}`);
    revalidatePath(`/brands/${typedExisting.brand_id}/creatives`);
    if (typedExisting.persona_id) {
      revalidatePath(`/brands/${typedExisting.brand_id}/personas/${typedExisting.persona_id}`);
    }

    return {
      success: true,
      data: { id: creativeId },
    };
  } catch (err) {
    console.error("Unexpected error in deleteCreative:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Rate a creative (1-5 stars)
 *
 * @param creativeId - UUID of the creative to rate
 * @param rating - Rating value (1-5)
 * @returns The updated creative or an error
 */
export async function rateCreative(creativeId: string, rating: number): Promise<CreativeResponse> {
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
        error: "You must be logged in to rate creatives",
      };
    }

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return {
        success: false,
        error: "Rating must be an integer between 1 and 5",
      };
    }

    // Update creative rating
    const { data: creative, error } = await supabase
      .from("creatives")
      .update({ rating } as never)
      .eq("id", creativeId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Creative not found",
        };
      }
      console.error("Error rating creative:", error);
      return {
        success: false,
        error: "Failed to rate creative. Please try again.",
      };
    }

    const typedCreative = creative as Creative;

    // Revalidate relevant pages
    revalidatePath(`/brands/${typedCreative.brand_id}`);
    revalidatePath(`/brands/${typedCreative.brand_id}/creatives`);

    return {
      success: true,
      data: typedCreative,
    };
  } catch (err) {
    console.error("Unexpected error in rateCreative:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
