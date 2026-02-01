/**
 * Server Actions for Persona CRUD Operations
 *
 * These server actions provide type-safe database operations for personas,
 * including creation, reading, updating, deletion, and validation with proper
 * input validation and brand ownership verification.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createPersonaSchema,
  updatePersonaSchema,
  type CreatePersonaInput,
  type UpdatePersonaInput,
  type Demographics,
  type Professional,
  type Psychographics,
  type Lifestyle,
  type MediaTech,
  type BuyingBehavior,
} from "@/lib/validations/persona";
import type { Persona, PersonaInsert, PersonaUpdate, Json } from "@/lib/supabase/database.types";

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

export type PersonaResponse = ActionResponse<Persona>;
export type PersonasResponse = ActionResponse<Persona[]>;
export type DeleteResponse = ActionResponse<{ id: string }>;

// Validation result types
export interface ValidationIssue {
  field: string;
  issue: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  completeness: number; // 0-100 percentage
  specificity: number; // 0-100 percentage
  consistency: number; // 0-100 percentage
  issues: ValidationIssue[];
}

export type ValidatePersonaResponse = ActionResponse<ValidationResult>;

/**
 * Create a new persona
 *
 * @param input - Persona data validated against createPersonaSchema
 * @returns The created persona or an error
 */
export async function createPersona(input: CreatePersonaInput): Promise<PersonaResponse> {
  try {
    // Validate input
    const validationResult = createPersonaSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      };
    }

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to create a persona",
      };
    }

    const data = validationResult.data;

    // Verify that the brand exists and belongs to the user (RLS will also enforce this)
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("id", data.brandId)
      .single();

    if (brandError || !brand) {
      return {
        success: false,
        error: "Brand not found or you don't have access to it",
      };
    }

    // Verify product exists if provided
    if (data.productId) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, brand_id")
        .eq("id", data.productId)
        .single();

      if (productError || !product) {
        return {
          success: false,
          error: "Product not found or you don't have access to it",
        };
      }

      const typedProduct = product as { id: string; brand_id: string };

      // Verify product belongs to the same brand
      if (typedProduct.brand_id !== data.brandId) {
        return {
          success: false,
          error: "Product does not belong to the specified brand",
        };
      }
    }

    // Verify intelligence report exists if provided
    if (data.intelligenceReportId) {
      const { data: report, error: reportError } = await supabase
        .from("intelligence_reports")
        .select("id, brand_id")
        .eq("id", data.intelligenceReportId)
        .single();

      if (reportError || !report) {
        return {
          success: false,
          error: "Intelligence report not found or you don't have access to it",
        };
      }

      const typedReport = report as { id: string; brand_id: string };

      // Verify report belongs to the same brand
      if (typedReport.brand_id !== data.brandId) {
        return {
          success: false,
          error: "Intelligence report does not belong to the specified brand",
        };
      }
    }

    // Build insert data
    const insertData: PersonaInsert = {
      brand_id: data.brandId,
      product_id: data.productId ?? null,
      intelligence_report_id: data.intelligenceReportId ?? null,
      name: data.name,
      photo_prompt: data.photoPrompt ?? null,
      photo_url: data.photoUrl || null,
      backstory: data.backstory ?? null,
      quote: data.quote ?? null,
      day_in_life: data.dayInLife ?? null,
      demographics: (data.demographics ?? {}) as Json,
      professional: (data.professional ?? {}) as Json,
      psychographics: (data.psychographics ?? {}) as Json,
      lifestyle: (data.lifestyle ?? {}) as Json,
      media_tech: (data.mediaTech ?? {}) as Json,
      buying_behavior: (data.buyingBehavior ?? {}) as Json,
      beliefs_attitudes: data.beliefsAttitudes ? (data.beliefsAttitudes as Json) : null,
      media_profile: data.mediaProfile ? (data.mediaProfile as Json) : null,
      creative_messaging: data.creativeMessaging ? (data.creativeMessaging as Json) : null,
      generation_model: data.generationModel ?? "claude-haiku-4-5",
      generation_params: (data.generationParams ?? {}) as Json,
      validation_status: data.validationStatus ?? "pending",
      validation_notes: data.validationNotes ?? null,
    };

    // Insert persona
    const { data: persona, error } = await supabase
      .from("personas")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("Error creating persona:", error);
      return {
        success: false,
        error: "Failed to create persona. Please try again.",
      };
    }

    // Revalidate brand personas page
    revalidatePath(`/brands/${data.brandId}`);
    revalidatePath(`/brands/${data.brandId}/personas`);

    return {
      success: true,
      data: persona as Persona,
    };
  } catch (err) {
    console.error("Unexpected error in createPersona:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get a single persona by ID
 *
 * @param personaId - UUID of the persona to retrieve
 * @returns The persona or an error
 */
export async function getPersona(personaId: string): Promise<PersonaResponse> {
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
        error: "You must be logged in to view personas",
      };
    }

    const { data: persona, error } = await supabase
      .from("personas")
      .select()
      .eq("id", personaId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Persona not found",
        };
      }
      console.error("Error fetching persona:", error);
      return {
        success: false,
        error: "Failed to fetch persona. Please try again.",
      };
    }

    return {
      success: true,
      data: persona as Persona,
    };
  } catch (err) {
    console.error("Unexpected error in getPersona:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get all personas for a specific brand
 *
 * @param brandId - UUID of the brand to get personas for
 * @param productId - Optional UUID of the product to filter personas
 * @returns Array of personas or an error
 */
export async function getPersonas(
  brandId: string,
  productId?: string | null
): Promise<PersonasResponse> {
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
        error: "You must be logged in to view personas",
      };
    }

    let query = supabase
      .from("personas")
      .select()
      .eq("brand_id", brandId)
      .not("moderation_status", "in", '("disabled","deleted")')
      .order("created_at", { ascending: false });

    // Filter by product if provided
    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data: personas, error } = await query;

    if (error) {
      console.error("Error fetching personas:", error);
      return {
        success: false,
        error: "Failed to fetch personas. Please try again.",
      };
    }

    return {
      success: true,
      data: (personas ?? []) as Persona[],
    };
  } catch (err) {
    console.error("Unexpected error in getPersonas:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Update an existing persona
 *
 * @param personaId - UUID of the persona to update
 * @param input - Persona data validated against updatePersonaSchema
 * @returns The updated persona or an error
 */
export async function updatePersona(
  personaId: string,
  input: UpdatePersonaInput
): Promise<PersonaResponse> {
  try {
    // Validate input
    const validationResult = updatePersonaSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      };
    }

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to update personas",
      };
    }

    const data = validationResult.data;

    // Build update object with only provided fields
    const updateData: PersonaUpdate = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.photoPrompt !== undefined) updateData.photo_prompt = data.photoPrompt;
    if (data.photoUrl !== undefined) updateData.photo_url = data.photoUrl || null;
    if (data.backstory !== undefined) updateData.backstory = data.backstory;
    if (data.quote !== undefined) updateData.quote = data.quote;
    if (data.dayInLife !== undefined) updateData.day_in_life = data.dayInLife;
    if (data.demographics !== undefined) updateData.demographics = data.demographics as Json;
    if (data.professional !== undefined) updateData.professional = data.professional as Json;
    if (data.psychographics !== undefined) updateData.psychographics = data.psychographics as Json;
    if (data.lifestyle !== undefined) updateData.lifestyle = data.lifestyle as Json;
    if (data.mediaTech !== undefined) updateData.media_tech = data.mediaTech as Json;
    if (data.buyingBehavior !== undefined) updateData.buying_behavior = data.buyingBehavior as Json;
    if (data.beliefsAttitudes !== undefined)
      updateData.beliefs_attitudes = data.beliefsAttitudes
        ? (data.beliefsAttitudes as Json)
        : null;
    if (data.mediaProfile !== undefined)
      updateData.media_profile = data.mediaProfile
        ? (data.mediaProfile as Json)
        : null;
    if (data.creativeMessaging !== undefined)
      updateData.creative_messaging = data.creativeMessaging
        ? (data.creativeMessaging as Json)
        : null;
    if (data.generationModel !== undefined) updateData.generation_model = data.generationModel;
    if (data.generationParams !== undefined)
      updateData.generation_params = data.generationParams as Json;
    if (data.validationStatus !== undefined) updateData.validation_status = data.validationStatus;
    if (data.validationNotes !== undefined) updateData.validation_notes = data.validationNotes;

    // Update persona
    const { data: persona, error } = await supabase
      .from("personas")
      .update(updateData as never)
      .eq("id", personaId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Persona not found",
        };
      }
      console.error("Error updating persona:", error);
      return {
        success: false,
        error: "Failed to update persona. Please try again.",
      };
    }

    const typedPersona = persona as Persona;

    // Revalidate persona pages
    revalidatePath(`/brands/${typedPersona.brand_id}`);
    revalidatePath(`/brands/${typedPersona.brand_id}/personas`);
    revalidatePath(`/brands/${typedPersona.brand_id}/personas/${personaId}`);

    return {
      success: true,
      data: typedPersona,
    };
  } catch (err) {
    console.error("Unexpected error in updatePersona:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Delete a persona
 *
 * @param personaId - UUID of the persona to delete
 * @returns Success status or an error
 */
export async function deletePersona(personaId: string): Promise<DeleteResponse> {
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
        error: "You must be logged in to delete personas",
      };
    }

    // First get the persona to know the brand_id for cache revalidation
    const { data: existingPersona, error: fetchError } = await supabase
      .from("personas")
      .select("brand_id")
      .eq("id", personaId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return {
          success: false,
          error: "Persona not found",
        };
      }
      console.error("Error fetching persona for deletion:", fetchError);
      return {
        success: false,
        error: "Failed to delete persona. Please try again.",
      };
    }

    const brandId = (existingPersona as { brand_id: string }).brand_id;

    // Delete persona (RLS ensures user can only delete personas from their own brands)
    const { error } = await supabase.from("personas").delete().eq("id", personaId);

    if (error) {
      console.error("Error deleting persona:", error);
      return {
        success: false,
        error: "Failed to delete persona. Please try again.",
      };
    }

    // Revalidate brand personas page
    revalidatePath(`/brands/${brandId}`);
    revalidatePath(`/brands/${brandId}/personas`);

    return {
      success: true,
      data: { id: personaId },
    };
  } catch (err) {
    console.error("Unexpected error in deletePersona:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Validate a persona for completeness, specificity, and consistency
 *
 * This function checks:
 * - Completeness: Are all required fields present?
 * - Specificity: Are values specific (not ranges)?
 * - Consistency: Are values internally consistent (e.g., age vs career stage)?
 *
 * @param personaId - UUID of the persona to validate
 * @returns Validation result with scores and issues
 */
export async function validatePersona(personaId: string): Promise<ValidatePersonaResponse> {
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
        error: "You must be logged in to validate personas",
      };
    }

    // Fetch the persona
    const { data: persona, error } = await supabase
      .from("personas")
      .select()
      .eq("id", personaId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Persona not found",
        };
      }
      console.error("Error fetching persona:", error);
      return {
        success: false,
        error: "Failed to fetch persona. Please try again.",
      };
    }

    const typedPersona = persona as Persona;
    const issues: ValidationIssue[] = [];

    // Parse JSONB fields
    const demographics = typedPersona.demographics as Demographics | null;
    const professional = typedPersona.professional as Professional | null;
    const psychographics = typedPersona.psychographics as Psychographics | null;
    const lifestyle = typedPersona.lifestyle as Lifestyle | null;
    const mediaTech = typedPersona.media_tech as MediaTech | null;
    const buyingBehavior = typedPersona.buying_behavior as BuyingBehavior | null;

    // ========================================================================
    // COMPLETENESS CHECK
    // Check for required fields in each section
    // ========================================================================

    let completenessScore = 0;
    let totalFields = 0;
    let presentFields = 0;

    // Core fields
    const coreFields = [
      { value: typedPersona.name, field: "name" },
      { value: typedPersona.backstory, field: "backstory" },
      { value: typedPersona.quote, field: "quote" },
    ];

    for (const { value, field } of coreFields) {
      totalFields++;
      if (value && value.length > 0) {
        presentFields++;
      } else {
        issues.push({
          field,
          issue: `${field} is missing`,
          severity: "warning",
        });
      }
    }

    // Demographics completeness
    const demographicsRequired = [
      "age",
      "gender",
      "location",
      "country",
      "education",
      "maritalStatus",
      "hasChildren",
      "householdSize",
      "income",
    ] as const;

    for (const field of demographicsRequired) {
      totalFields++;
      if (demographics && demographics[field] !== undefined && demographics[field] !== null) {
        presentFields++;
      } else {
        issues.push({
          field: `demographics.${field}`,
          issue: `Demographics ${field} is missing`,
          severity: "error",
        });
      }
    }

    // Professional completeness
    const professionalRequired = [
      "jobTitle",
      "occupation",
      "industry",
      "companySize",
      "yearsExperience",
      "workStyle",
      "careerGoals",
    ] as const;

    for (const field of professionalRequired) {
      totalFields++;
      if (professional && professional[field] !== undefined && professional[field] !== null) {
        presentFields++;
      } else {
        issues.push({
          field: `professional.${field}`,
          issue: `Professional ${field} is missing`,
          severity: "error",
        });
      }
    }

    // Psychographics completeness
    const psychographicsRequired = [
      "values",
      "motivations",
      "fears",
      "aspirations",
      "personalityTraits",
    ] as const;

    for (const field of psychographicsRequired) {
      totalFields++;
      if (psychographics && psychographics[field] !== undefined && psychographics[field] !== null) {
        const arr = psychographics[field];
        if (Array.isArray(arr) && arr.length > 0) {
          presentFields++;
        } else {
          issues.push({
            field: `psychographics.${field}`,
            issue: `Psychographics ${field} is empty`,
            severity: "error",
          });
        }
      } else {
        issues.push({
          field: `psychographics.${field}`,
          issue: `Psychographics ${field} is missing`,
          severity: "error",
        });
      }
    }

    // Lifestyle completeness
    const lifestyleRequired = [
      "hobbies",
      "interests",
      "activities",
      "diet",
      "fitnessLevel",
    ] as const;

    for (const field of lifestyleRequired) {
      totalFields++;
      if (lifestyle && lifestyle[field] !== undefined && lifestyle[field] !== null) {
        if (Array.isArray(lifestyle[field])) {
          if ((lifestyle[field] as unknown[]).length > 0) {
            presentFields++;
          } else {
            issues.push({
              field: `lifestyle.${field}`,
              issue: `Lifestyle ${field} is empty`,
              severity: "error",
            });
          }
        } else {
          presentFields++;
        }
      } else {
        issues.push({
          field: `lifestyle.${field}`,
          issue: `Lifestyle ${field} is missing`,
          severity: "error",
        });
      }
    }

    // Media & Tech completeness
    const mediaTechRequired = [
      "socialPlatforms",
      "newsSources",
      "devices",
      "contentPreferences",
      "screenTime",
    ] as const;

    for (const field of mediaTechRequired) {
      totalFields++;
      if (mediaTech && mediaTech[field] !== undefined && mediaTech[field] !== null) {
        if (Array.isArray(mediaTech[field])) {
          if ((mediaTech[field] as unknown[]).length > 0) {
            presentFields++;
          } else {
            issues.push({
              field: `mediaTech.${field}`,
              issue: `Media & Tech ${field} is empty`,
              severity: "error",
            });
          }
        } else {
          presentFields++;
        }
      } else {
        issues.push({
          field: `mediaTech.${field}`,
          issue: `Media & Tech ${field} is missing`,
          severity: "error",
        });
      }
    }

    // Buying behavior completeness
    const buyingBehaviorRequired = [
      "shoppingPreferences",
      "priceSensitivity",
      "brandLoyalty",
      "decisionFactors",
      "purchaseFrequency",
      "researchBehavior",
    ] as const;

    for (const field of buyingBehaviorRequired) {
      totalFields++;
      if (buyingBehavior && buyingBehavior[field] !== undefined && buyingBehavior[field] !== null) {
        if (Array.isArray(buyingBehavior[field])) {
          if ((buyingBehavior[field] as unknown[]).length > 0) {
            presentFields++;
          } else {
            issues.push({
              field: `buyingBehavior.${field}`,
              issue: `Buying Behavior ${field} is empty`,
              severity: "error",
            });
          }
        } else {
          presentFields++;
        }
      } else {
        issues.push({
          field: `buyingBehavior.${field}`,
          issue: `Buying Behavior ${field} is missing`,
          severity: "error",
        });
      }
    }

    completenessScore = Math.round((presentFields / totalFields) * 100);

    // ========================================================================
    // SPECIFICITY CHECK
    // Ensure values are specific, not ranges or vague
    // ========================================================================

    let specificityScore = 100;
    let specificityDeductions = 0;

    // Check age is a number, not a range string
    if (demographics?.age !== undefined) {
      if (typeof demographics.age !== "number") {
        specificityDeductions += 10;
        issues.push({
          field: "demographics.age",
          issue: "Age must be a specific number, not a range (e.g., 32, not '25-35')",
          severity: "error",
        });
      }
    }

    // Check income is a number, not a range string
    if (demographics?.income !== undefined) {
      if (typeof demographics.income !== "number") {
        specificityDeductions += 10;
        issues.push({
          field: "demographics.income",
          issue: "Income must be a specific number, not a range (e.g., 75000, not '$50k-$100k')",
          severity: "error",
        });
      }
    }

    // Check householdSize is a number
    if (demographics?.householdSize !== undefined) {
      if (typeof demographics.householdSize !== "number") {
        specificityDeductions += 5;
        issues.push({
          field: "demographics.householdSize",
          issue: "Household size must be a specific number",
          severity: "error",
        });
      }
    }

    // Check years of experience is a number
    if (professional?.yearsExperience !== undefined) {
      if (typeof professional.yearsExperience !== "number") {
        specificityDeductions += 5;
        issues.push({
          field: "professional.yearsExperience",
          issue: "Years of experience must be a specific number",
          severity: "error",
        });
      }
    }

    // Check location is specific (not "urban areas" or similar)
    if (demographics?.location) {
      const vagueLocationPatterns = [
        /urban\s*areas?/i,
        /suburban\s*areas?/i,
        /rural\s*areas?/i,
        /major\s*cities/i,
        /across\s*the/i,
        /various/i,
        /multiple/i,
      ];

      for (const pattern of vagueLocationPatterns) {
        if (pattern.test(demographics.location)) {
          specificityDeductions += 10;
          issues.push({
            field: "demographics.location",
            issue: `Location is too vague ("${demographics.location}"). Use a specific location (e.g., "Austin, Texas" not "urban areas")`,
            severity: "warning",
          });
          break;
        }
      }
    }

    // Check job title is specific
    if (professional?.jobTitle) {
      // Only flag if the job title is ONLY one of these vague words
      const titleLower = professional.jobTitle.trim().toLowerCase();
      if (titleLower === "professional" || titleLower === "manager" || titleLower === "employee") {
        specificityDeductions += 5;
        issues.push({
          field: "professional.jobTitle",
          issue: `Job title "${professional.jobTitle}" is too generic. Use a specific title (e.g., "Senior Product Designer")`,
          severity: "warning",
        });
      }
    }

    specificityScore = Math.max(0, 100 - specificityDeductions);

    // ========================================================================
    // CONSISTENCY CHECK
    // Ensure values are internally consistent
    // ========================================================================

    let consistencyScore = 100;
    let consistencyDeductions = 0;

    // Check age vs years of experience consistency
    if (demographics?.age && professional?.yearsExperience) {
      const age = typeof demographics.age === "number" ? demographics.age : 0;
      const yearsExp = typeof professional.yearsExperience === "number" ? professional.yearsExperience : 0;

      // If years of experience + 18 (minimum working age) > age, that's inconsistent
      if (yearsExp + 18 > age) {
        consistencyDeductions += 15;
        issues.push({
          field: "demographics.age / professional.yearsExperience",
          issue: `Age (${age}) is inconsistent with years of experience (${yearsExp}). A ${age}-year-old cannot have ${yearsExp} years of experience.`,
          severity: "error",
        });
      }
    }

    // Check education vs age consistency (e.g., doctorate at age 22)
    if (demographics?.age && demographics?.education) {
      const age = typeof demographics.age === "number" ? demographics.age : 0;
      const education = demographics.education;

      const minAges: Record<string, number> = {
        "High School": 18,
        "Some College": 19,
        "Associate Degree": 20,
        "Bachelor's Degree": 22,
        "Master's Degree": 24,
        "Doctorate": 28,
        "Professional Degree": 26,
      };

      const minAge = minAges[education] || 18;
      if (age < minAge) {
        consistencyDeductions += 10;
        issues.push({
          field: "demographics.age / demographics.education",
          issue: `Age (${age}) is too young for education level "${education}" (minimum typically ${minAge})`,
          severity: "warning",
        });
      }
    }

    // Check income vs occupation consistency (very rough heuristic)
    if (demographics?.income && professional?.jobTitle) {
      const income = typeof demographics.income === "number" ? demographics.income : 0;
      const jobTitle = professional.jobTitle.toLowerCase();

      // Very basic check - entry-level jobs with very high income
      const entryLevelPatterns = [/intern/i, /junior/i, /entry/i, /assistant/i];
      const isEntryLevel = entryLevelPatterns.some((p) => p.test(jobTitle));

      if (isEntryLevel && income > 150000) {
        consistencyDeductions += 10;
        issues.push({
          field: "demographics.income / professional.jobTitle",
          issue: `Income ($${income.toLocaleString()}) seems inconsistent with entry-level role "${professional.jobTitle}"`,
          severity: "warning",
        });
      }
    }

    // Check hasChildren vs numberOfChildren consistency
    if (demographics?.hasChildren === false && demographics?.numberOfChildren && demographics.numberOfChildren > 0) {
      consistencyDeductions += 10;
      issues.push({
        field: "demographics.hasChildren / demographics.numberOfChildren",
        issue: "hasChildren is false but numberOfChildren is greater than 0",
        severity: "error",
      });
    }

    if (demographics?.hasChildren === true && (!demographics?.numberOfChildren || demographics.numberOfChildren === 0)) {
      consistencyDeductions += 5;
      issues.push({
        field: "demographics.hasChildren / demographics.numberOfChildren",
        issue: "hasChildren is true but numberOfChildren is 0 or missing",
        severity: "warning",
      });
    }

    consistencyScore = Math.max(0, 100 - consistencyDeductions);

    // ========================================================================
    // DETERMINE OVERALL VALIDITY
    // ========================================================================

    const overallScore = (completenessScore + specificityScore + consistencyScore) / 3;
    const hasErrors = issues.some((issue) => issue.severity === "error");
    const isValid = overallScore >= 70 && !hasErrors;

    return {
      success: true,
      data: {
        isValid,
        completeness: completenessScore,
        specificity: specificityScore,
        consistency: consistencyScore,
        issues,
      },
    };
  } catch (err) {
    console.error("Unexpected error in validatePersona:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
