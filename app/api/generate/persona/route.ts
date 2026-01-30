/**
 * Persona Generation API Route
 *
 * Generates consumer personas using Claude Haiku 4.5 via OpenRouter
 * with brand, product, and intelligence data as context.
 *
 * POST /api/generate/persona
 */

export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generatePersonas,
  PERSONA_GENERATION_MODEL,
  type PersonaGenerationContext,
} from "@/lib/api/openrouter";
import { personaSchema, type PersonaInput } from "@/lib/validations/persona";
import { checkQuota, decrementQuota } from "@/lib/services/usage";
import type {
  Brand,
  Product,
  IntelligenceReport,
  Persona,
  PersonaInsert,
  Json,
} from "@/lib/supabase/database.types";

/**
 * Request body schema
 */
interface GeneratePersonaRequest {
  brand_id: string;
  product_id?: string | null;
  intelligence_report_id?: string | null;
  count?: number;
}

/**
 * Response type for generated personas
 */
interface GeneratedPersonaResponse {
  id: string;
  name: string;
  backstory: string | null;
  quote: string | null;
  demographics: Record<string, unknown>;
  professional: Record<string, unknown>;
  validation_status: string;
  created_at: string;
}

/**
 * Validate that persona fields have specific values, not ranges
 */
function validateSpecificValues(persona: PersonaInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check demographics for specific values
  if (persona.demographics) {
    // Age should be a specific number
    if (typeof persona.demographics.age !== "number") {
      errors.push("Age must be a specific number");
    }

    // Income should be a specific number
    if (typeof persona.demographics.income !== "number") {
      errors.push("Income must be a specific number");
    }

    // Household size should be a specific number
    if (typeof persona.demographics.householdSize !== "number") {
      errors.push("Household size must be a specific number");
    }

    // Location should be specific, not generic
    if (persona.demographics.location) {
      const genericTerms = ["urban", "suburban", "rural", "areas", "regions"];
      const locationLower = persona.demographics.location.toLowerCase();
      if (genericTerms.some((term) => locationLower.includes(term) && !locationLower.includes(","))) {
        errors.push("Location should be specific (e.g., 'Austin, Texas'), not generic");
      }
    }
  }

  // Check professional for specific values
  if (persona.professional) {
    // Years experience should be a specific number
    if (typeof persona.professional.yearsExperience !== "number") {
      errors.push("Years of experience must be a specific number");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert PersonaInput to database insert format
 */
function personaToInsert(
  persona: PersonaInput,
  brandId: string,
  productId: string | null,
  intelligenceReportId: string | null,
  generationParams: Record<string, unknown>
): PersonaInsert {
  return {
    brand_id: brandId,
    product_id: productId,
    intelligence_report_id: intelligenceReportId,
    name: persona.name,
    photo_prompt: persona.photoPrompt || null,
    photo_url: persona.photoUrl || null,
    backstory: persona.backstory || null,
    quote: persona.quote || null,
    day_in_life: persona.dayInLife || null,
    demographics: persona.demographics as unknown as Json,
    professional: persona.professional as unknown as Json,
    psychographics: persona.psychographics as unknown as Json,
    lifestyle: persona.lifestyle as unknown as Json,
    media_tech: persona.mediaTech as unknown as Json,
    buying_behavior: persona.buyingBehavior as unknown as Json,
    beliefs_attitudes: persona.beliefsAttitudes as unknown as Json || null,
    generation_model: persona.generationModel || PERSONA_GENERATION_MODEL,
    generation_params: generationParams as unknown as Json,
    validation_status: persona.validationStatus || "pending",
    validation_notes: persona.validationNotes || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as GeneratePersonaRequest;

    // Validate required fields
    if (!body.brand_id) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    // Validate count
    const count = Math.max(1, Math.min(5, body.count || 1));

    // Get Supabase client
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user owns the brand
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("*")
      .eq("id", body.brand_id)
      .eq("user_id", user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: "Brand not found or access denied" },
        { status: 404 }
      );
    }

    // Check quota using centralized usage service
    const quotaCheck = await checkQuota(supabase, user.id, "personas", count);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.message || "Persona generation quota exceeded",
          remaining: quotaCheck.remaining,
          limit: quotaCheck.limit,
        },
        { status: 429 }
      );
    }

    // Get product if provided
    let product: Product | null = null;
    if (body.product_id) {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", body.product_id)
        .eq("brand_id", body.brand_id)
        .single();

      if (productError || !productData) {
        return NextResponse.json(
          { error: "Product not found or does not belong to this brand" },
          { status: 404 }
        );
      }

      product = productData;
    }

    // Get intelligence report if provided
    let intelligenceReport: IntelligenceReport | null = null;
    if (body.intelligence_report_id) {
      const { data: reportData, error: reportError } = await supabase
        .from("intelligence_reports")
        .select("*")
        .eq("id", body.intelligence_report_id)
        .eq("brand_id", body.brand_id)
        .single();

      if (reportError || !reportData) {
        return NextResponse.json(
          { error: "Intelligence report not found or does not belong to this brand" },
          { status: 404 }
        );
      }

      intelligenceReport = reportData;
    }

    // Fetch existing persona names for this brand to ensure uniqueness
    const { data: existingPersonas } = await supabase
      .from("personas")
      .select("name")
      .eq("brand_id", body.brand_id);

    const existingPersonaNames = (existingPersonas || []).map((p: { name: string }) => p.name);

    // Build context for persona generation
    const context: PersonaGenerationContext = {
      brand: brand as Brand,
      product: product,
      intelligenceReport: intelligenceReport,
      existingPersonaNames,
    };

    // Generate personas via OpenRouter
    const generationResult = await generatePersonas(context, count);

    if (!generationResult.success || generationResult.personas.length === 0) {
      console.error("Persona generation failed:", {
        success: generationResult.success,
        errors: generationResult.errors,
        personaCount: generationResult.personas?.length || 0,
      });
      return NextResponse.json(
        {
          error: "Failed to generate personas",
          details: generationResult.errors,
        },
        { status: 500 }
      );
    }

    // Validate and save each persona
    const savedPersonas: GeneratedPersonaResponse[] = [];
    const validationErrors: string[] = [];

    for (const personaInput of generationResult.personas) {
      // Validate using Zod schema
      const parseResult = personaSchema.safeParse(personaInput);
      if (!parseResult.success) {
        validationErrors.push(
          `Persona "${personaInput.name}": Schema validation failed - ${parseResult.error.errors.map((e) => e.message).join(", ")}`
        );
        continue;
      }

      // Validate specific values (not ranges)
      const specificValidation = validateSpecificValues(personaInput);
      if (!specificValidation.valid) {
        // Log the validation issues but still save with "needs_revision" status
        console.warn(
          `Persona "${personaInput.name}" has non-specific values:`,
          specificValidation.errors
        );
        personaInput.validationStatus = "needs_revision";
        personaInput.validationNotes = specificValidation.errors.join("; ");
      }

      // Convert to database insert format
      const personaInsert = personaToInsert(
        personaInput,
        body.brand_id,
        body.product_id || null,
        body.intelligence_report_id || null,
        {
          temperature: 0.7,
          max_tokens: 8000,
          model: PERSONA_GENERATION_MODEL,
          generated_at: new Date().toISOString(),
          token_usage: generationResult.usage,
        }
      );

      // Save to database
      const { data: savedPersona, error: insertError } = await supabase
        .from("personas")
        .insert(personaInsert as never)
        .select()
        .single();

      if (insertError) {
        console.error("Error saving persona:", insertError);
        validationErrors.push(`Failed to save persona "${personaInput.name}": ${insertError.message}`);
        continue;
      }

      const typedPersona = savedPersona as Persona;

      savedPersonas.push({
        id: typedPersona.id,
        name: typedPersona.name,
        backstory: typedPersona.backstory,
        quote: typedPersona.quote,
        demographics: typedPersona.demographics as Record<string, unknown>,
        professional: typedPersona.professional as Record<string, unknown>,
        validation_status: typedPersona.validation_status,
        created_at: typedPersona.created_at,
      });
    }

    // Decrement quota (increment usage) for successfully saved personas
    if (savedPersonas.length > 0) {
      await decrementQuota(supabase, user.id, "personas", savedPersonas.length);
    }

    // Return response
    return NextResponse.json({
      success: true,
      personas: savedPersonas,
      generated: savedPersonas.length,
      requested: count,
      errors: validationErrors.length > 0 ? validationErrors : undefined,
      usage: {
        tokens: generationResult.usage,
        quota: {
          remaining: quotaCheck.remaining - savedPersonas.length,
          limit: quotaCheck.limit,
        },
      },
    });
  } catch (error) {
    console.error("Error generating personas:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate personas",
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler to retrieve existing personas for a brand
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brand_id");
    const productId = searchParams.get("product_id");
    const status = searchParams.get("status");

    if (!brandId) {
      return NextResponse.json(
        { error: "brand_id query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns the brand
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("user_id", user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: "Brand not found or access denied" },
        { status: 404 }
      );
    }

    // Build query
    let query = supabase
      .from("personas")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    // Apply optional filters
    if (productId) {
      query = query.eq("product_id", productId);
    }

    if (status) {
      query = query.eq("validation_status", status);
    }

    const { data: personas, error: personasError } = await query;

    if (personasError) {
      console.error("Error fetching personas:", personasError);
      return NextResponse.json(
        { error: "Failed to fetch personas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ personas: personas || [] });
  } catch (error) {
    console.error("Error fetching personas:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch personas",
      },
      { status: 500 }
    );
  }
}
