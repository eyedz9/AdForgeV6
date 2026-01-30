/**
 * Audience Building API Route
 *
 * Creates audience targeting from persona data by translating
 * persona attributes to platform-specific targeting parameters.
 *
 * POST /api/generate/audience - Create audience from persona
 * GET /api/generate/audience - List audiences for a brand/persona
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  translatePersonaToAudiences,
  type PersonaForTranslation,
} from "@/lib/services/audience-translator";
import type {
  Persona,
  Audience,
  AudienceInsert,
  Json,
} from "@/lib/supabase/database.types";
import type {
  Demographics,
  Professional,
  Psychographics,
  Lifestyle,
  MediaTech,
  BuyingBehavior,
} from "@/lib/validations/persona";

/**
 * Request body schema for POST
 */
interface CreateAudienceRequest {
  persona_id: string;
}

/**
 * Response type for created audience
 */
interface AudienceResponse {
  id: string;
  name: string;
  persona_id: string;
  brand_id: string;
  meta_targeting: Record<string, unknown>;
  google_targeting: Record<string, unknown>;
  linkedin_targeting: Record<string, unknown>;
  tiktok_targeting: Record<string, unknown>;
  pinterest_targeting: Record<string, unknown>;
  snapchat_targeting: Record<string, unknown>;
  size_estimates: Record<string, unknown>;
  created_at: string;
}

/**
 * Parse persona JSONB fields into typed objects
 */
function parsePersonaForTranslation(persona: Persona): PersonaForTranslation {
  return {
    name: persona.name,
    demographics: persona.demographics as unknown as Demographics,
    professional: persona.professional as unknown as Professional,
    psychographics: persona.psychographics as unknown as Psychographics,
    lifestyle: persona.lifestyle as unknown as Lifestyle,
    mediaTech: persona.media_tech as unknown as MediaTech,
    buyingBehavior: persona.buying_behavior as unknown as BuyingBehavior,
  };
}

/**
 * POST handler - Create audience from persona
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as CreateAudienceRequest;

    // Validate required fields
    if (!body.persona_id) {
      return NextResponse.json(
        { error: "persona_id is required" },
        { status: 400 }
      );
    }

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

    // Fetch the persona
    const { data: personaData, error: personaError } = await supabase
      .from("personas")
      .select("*")
      .eq("id", body.persona_id)
      .single();

    if (personaError || !personaData) {
      return NextResponse.json(
        { error: "Persona not found" },
        { status: 404 }
      );
    }

    const persona = personaData as Persona;

    // Verify user owns the brand that owns this persona
    const { data: brandData, error: brandError } = await supabase
      .from("brands")
      .select("id, user_id, name")
      .eq("id", persona.brand_id)
      .single();

    if (brandError || !brandData) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    const brand = brandData as { id: string; user_id: string; name: string };
    if (brand.user_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied - you do not own this persona" },
        { status: 403 }
      );
    }

    // Check if an audience already exists for this persona
    const { data: existingAudienceData } = await supabase
      .from("audiences")
      .select("id")
      .eq("persona_id", body.persona_id)
      .single();

    if (existingAudienceData) {
      const existingAudience = existingAudienceData as { id: string };
      return NextResponse.json(
        {
          error: "An audience already exists for this persona",
          existing_audience_id: existingAudience.id,
        },
        { status: 409 }
      );
    }

    // Parse persona data for translation
    const personaForTranslation = parsePersonaForTranslation(persona);

    // Translate persona to all platform targeting
    const audienceTargeting = await translatePersonaToAudiences(personaForTranslation);

    // Generate audience name from persona name
    const audienceName = `${persona.name} - Audience`;

    // Build audience insert object
    const audienceInsert: AudienceInsert = {
      persona_id: body.persona_id,
      brand_id: brand.id,
      name: audienceName,
      meta_targeting: audienceTargeting.meta as unknown as Json,
      google_targeting: audienceTargeting.google as unknown as Json,
      linkedin_targeting: audienceTargeting.linkedin as unknown as Json,
      tiktok_targeting: audienceTargeting.tiktok as unknown as Json,
      pinterest_targeting: audienceTargeting.pinterest as unknown as Json,
      snapchat_targeting: audienceTargeting.snapchat as unknown as Json,
      size_estimates: audienceTargeting.sizeEstimates as unknown as Json,
      export_count: 0,
    };

    // Save audience to database
    const { data: savedAudience, error: insertError } = await supabase
      .from("audiences")
      .insert(audienceInsert as never)
      .select()
      .single();

    if (insertError) {
      console.error("Error saving audience:", insertError);
      return NextResponse.json(
        { error: "Failed to save audience", details: insertError.message },
        { status: 500 }
      );
    }

    const typedAudience = savedAudience as Audience;

    // Build response
    const response: AudienceResponse = {
      id: typedAudience.id,
      name: typedAudience.name,
      persona_id: typedAudience.persona_id,
      brand_id: typedAudience.brand_id,
      meta_targeting: typedAudience.meta_targeting as Record<string, unknown>,
      google_targeting: typedAudience.google_targeting as Record<string, unknown>,
      linkedin_targeting: typedAudience.linkedin_targeting as Record<string, unknown>,
      tiktok_targeting: typedAudience.tiktok_targeting as Record<string, unknown>,
      pinterest_targeting: typedAudience.pinterest_targeting as Record<string, unknown>,
      snapchat_targeting: typedAudience.snapchat_targeting as Record<string, unknown>,
      size_estimates: typedAudience.size_estimates as Record<string, unknown>,
      created_at: typedAudience.created_at,
    };

    return NextResponse.json({
      success: true,
      audience: response,
    });
  } catch (error) {
    console.error("Error creating audience:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create audience",
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - List audiences for a brand or persona
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brand_id");
    const personaId = searchParams.get("persona_id");

    // At least one filter is required
    if (!brandId && !personaId) {
      return NextResponse.json(
        { error: "Either brand_id or persona_id query parameter is required" },
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

    // Build query
    let query = supabase.from("audiences").select(`
      *,
      personas (
        id,
        name,
        photo_url
      )
    `);

    if (personaId) {
      // If filtering by persona, verify ownership through persona -> brand -> user
      const { data: personaData, error: personaError } = await supabase
        .from("personas")
        .select("brand_id")
        .eq("id", personaId)
        .single();

      if (personaError || !personaData) {
        return NextResponse.json(
          { error: "Persona not found" },
          { status: 404 }
        );
      }

      const persona = personaData as { brand_id: string };

      // Verify user owns the brand
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("user_id")
        .eq("id", persona.brand_id)
        .single();

      if (brandError || !brandData) {
        return NextResponse.json(
          { error: "Brand not found" },
          { status: 404 }
        );
      }

      const personaBrand = brandData as { user_id: string };
      if (personaBrand.user_id !== user.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      query = query.eq("persona_id", personaId);
    } else if (brandId) {
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

      query = query.eq("brand_id", brandId);
    }

    // Execute query with ordering
    const { data: audiences, error: audiencesError } = await query.order(
      "created_at",
      { ascending: false }
    );

    if (audiencesError) {
      console.error("Error fetching audiences:", audiencesError);
      return NextResponse.json(
        { error: "Failed to fetch audiences" },
        { status: 500 }
      );
    }

    return NextResponse.json({ audiences: audiences || [] });
  } catch (error) {
    console.error("Error fetching audiences:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch audiences",
      },
      { status: 500 }
    );
  }
}
