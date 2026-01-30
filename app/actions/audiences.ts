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

// Enriched audience with linked personas
export interface AudienceWithPersonas extends Audience {
  audience_personas?: Array<{
    persona_id: string;
    personas: {
      id: string;
      name: string;
      photo_url: string | null;
    } | null;
  }>;
}

export type AudienceResponse = ActionResponse<AudienceWithPersonas>;
export type AudiencesResponse = ActionResponse<AudienceWithPersonas[]>;
export type DeleteResponse = ActionResponse<{ id: string }>;

// Input types for audience operations
export interface CreateAudienceInput {
  personaIds: string[];
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
 * Create a new audience from one or more personas
 */
export async function createAudience(input: CreateAudienceInput): Promise<AudienceResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be logged in to create an audience" };
    }

    if (!input.personaIds || input.personaIds.length === 0 || !input.brandId || !input.name) {
      return { success: false, error: "At least one persona, Brand ID, and name are required" };
    }

    // Verify brand exists and belongs to user
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("id", input.brandId)
      .single();

    if (brandError || !brand) {
      return { success: false, error: "Brand not found or you don't have access to it" };
    }

    // Verify all personas exist and belong to the same brand
    const { data: personas, error: personaError } = await supabase
      .from("personas")
      .select("id, brand_id")
      .in("id", input.personaIds);

    if (personaError || !personas || personas.length !== input.personaIds.length) {
      return { success: false, error: "One or more personas not found" };
    }

    const typedPersonas = personas as Array<{ id: string; brand_id: string }>;
    const allBelongToBrand = typedPersonas.every((p) => p.brand_id === input.brandId);
    if (!allBelongToBrand) {
      return { success: false, error: "All personas must belong to the specified brand" };
    }

    // Insert audience with persona_id null (using junction table instead)
    const insertData: AudienceInsert = {
      persona_id: null,
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

    const { data: audience, error } = await supabase
      .from("audiences")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("Error creating audience:", error);
      return { success: false, error: "Failed to create audience. Please try again." };
    }

    const typedAudience = audience as Audience;

    // Insert junction table rows
    const junctionRows = input.personaIds.map((personaId) => ({
      audience_id: typedAudience.id,
      persona_id: personaId,
    }));

    const { error: junctionError } = await supabase
      .from("audience_personas")
      .insert(junctionRows as never[]);

    if (junctionError) {
      console.error("Error creating audience_personas:", junctionError);
      // Clean up the audience if junction insert fails
      await supabase.from("audiences").delete().eq("id", typedAudience.id);
      return { success: false, error: "Failed to link personas to audience. Please try again." };
    }

    // Revalidate relevant pages
    revalidatePath(`/brands/${input.brandId}`);

    // Fetch the full audience with personas for the response
    const result = await getAudience(typedAudience.id);
    return result;
  } catch (err) {
    console.error("Unexpected error in createAudience:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Get a single audience by ID with linked personas
 */
export async function getAudience(audienceId: string): Promise<AudienceResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be logged in to view audiences" };
    }

    const { data: audience, error } = await supabase
      .from("audiences")
      .select(`
        *,
        audience_personas (
          persona_id,
          personas (
            id,
            name,
            photo_url
          )
        )
      `)
      .eq("id", audienceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Audience not found" };
      }
      console.error("Error fetching audience:", error);
      return { success: false, error: "Failed to fetch audience. Please try again." };
    }

    return { success: true, data: audience as AudienceWithPersonas };
  } catch (err) {
    console.error("Unexpected error in getAudience:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Get all audiences for a specific brand with linked personas
 */
export async function getAudiences(
  brandId: string,
  personaId?: string | null
): Promise<AudiencesResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be logged in to view audiences" };
    }

    let query = supabase
      .from("audiences")
      .select(`
        *,
        audience_personas (
          persona_id,
          personas (
            id,
            name,
            photo_url
          )
        )
      `)
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    // Filter by persona through junction table if provided
    if (personaId) {
      // Get audience IDs that have this persona
      const { data: junctionData } = await supabase
        .from("audience_personas")
        .select("audience_id")
        .eq("persona_id", personaId);

      if (junctionData && junctionData.length > 0) {
        const audienceIds = (junctionData as Array<{ audience_id: string }>).map((j) => j.audience_id);
        query = query.in("id", audienceIds);
      } else {
        return { success: true, data: [] };
      }
    }

    const { data: audiences, error } = await query;

    if (error) {
      console.error("Error fetching audiences:", error);
      return { success: false, error: "Failed to fetch audiences. Please try again." };
    }

    return { success: true, data: (audiences ?? []) as AudienceWithPersonas[] };
  } catch (err) {
    console.error("Unexpected error in getAudiences:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Update an existing audience
 */
export async function updateAudience(
  audienceId: string,
  input: UpdateAudienceInput
): Promise<AudienceResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be logged in to update audiences" };
    }

    const updateData: AudienceUpdate = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.metaTargeting !== undefined) updateData.meta_targeting = input.metaTargeting as Json;
    if (input.googleTargeting !== undefined) updateData.google_targeting = input.googleTargeting as Json;
    if (input.linkedinTargeting !== undefined) updateData.linkedin_targeting = input.linkedinTargeting as Json;
    if (input.tiktokTargeting !== undefined) updateData.tiktok_targeting = input.tiktokTargeting as Json;
    if (input.pinterestTargeting !== undefined) updateData.pinterest_targeting = input.pinterestTargeting as Json;
    if (input.snapchatTargeting !== undefined) updateData.snapchat_targeting = input.snapchatTargeting as Json;
    if (input.sizeEstimates !== undefined) updateData.size_estimates = input.sizeEstimates as Json;
    if (input.lastExportedAt !== undefined) updateData.last_exported_at = input.lastExportedAt;
    if (input.exportCount !== undefined) updateData.export_count = input.exportCount;

    const { data: audience, error } = await supabase
      .from("audiences")
      .update(updateData as never)
      .eq("id", audienceId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Audience not found" };
      }
      console.error("Error updating audience:", error);
      return { success: false, error: "Failed to update audience. Please try again." };
    }

    const typedAudience = audience as Audience;
    revalidatePath(`/brands/${typedAudience.brand_id}`);

    return await getAudience(audienceId);
  } catch (err) {
    console.error("Unexpected error in updateAudience:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Delete an audience
 */
export async function deleteAudience(audienceId: string): Promise<DeleteResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be logged in to delete audiences" };
    }

    const { data: existingAudience, error: fetchError } = await supabase
      .from("audiences")
      .select("brand_id")
      .eq("id", audienceId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return { success: false, error: "Audience not found" };
      }
      console.error("Error fetching audience for deletion:", fetchError);
      return { success: false, error: "Failed to delete audience. Please try again." };
    }

    const typedExisting = existingAudience as { brand_id: string };

    const { error } = await supabase.from("audiences").delete().eq("id", audienceId);

    if (error) {
      console.error("Error deleting audience:", error);
      return { success: false, error: "Failed to delete audience. Please try again." };
    }

    revalidatePath(`/brands/${typedExisting.brand_id}`);

    return { success: true, data: { id: audienceId } };
  } catch (err) {
    console.error("Unexpected error in deleteAudience:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Record an audience export (increments export_count and updates last_exported_at)
 */
export async function recordAudienceExport(audienceId: string): Promise<AudienceResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be logged in to export audiences" };
    }

    const { data: existingAudience, error: fetchError } = await supabase
      .from("audiences")
      .select("export_count")
      .eq("id", audienceId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return { success: false, error: "Audience not found" };
      }
      console.error("Error fetching audience:", fetchError);
      return { success: false, error: "Failed to record export. Please try again." };
    }

    const currentCount = (existingAudience as { export_count: number }).export_count || 0;

    const { error } = await supabase
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
      return { success: false, error: "Failed to record export. Please try again." };
    }

    return await getAudience(audienceId);
  } catch (err) {
    console.error("Unexpected error in recordAudienceExport:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
