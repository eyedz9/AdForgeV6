/**
 * Audience Building API Route
 *
 * Creates audience targeting from persona data by translating
 * persona attributes to platform-specific targeting parameters.
 *
 * POST /api/generate/audience - Create audience from one or more personas
 * GET /api/generate/audience - List audiences for a brand/persona
 */

export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  translatePersonaToAudiences,
  translateMultiplePersonasToAudiences,
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
  persona_id?: string;
  persona_ids?: string[];
  name?: string;
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
 * POST handler - Create audience from one or more personas
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAudienceRequest;

    // Support both single persona_id and array persona_ids
    const personaIds: string[] = body.persona_ids
      ? body.persona_ids
      : body.persona_id
        ? [body.persona_id]
        : [];

    if (personaIds.length === 0) {
      return NextResponse.json(
        { error: "persona_id or persona_ids is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all specified personas
    const { data: personasData, error: personaError } = await supabase
      .from("personas")
      .select("*")
      .in("id", personaIds);

    if (personaError || !personasData || personasData.length !== personaIds.length) {
      return NextResponse.json(
        { error: "One or more personas not found" },
        { status: 404 }
      );
    }

    const personas = personasData as Persona[];

    // Verify all personas belong to the same brand
    const brandIds = [...new Set(personas.map((p) => p.brand_id))];
    if (brandIds.length !== 1) {
      return NextResponse.json(
        { error: "All personas must belong to the same brand" },
        { status: 400 }
      );
    }

    const brandId = brandIds[0];

    // Verify user owns the brand
    const { data: brandData, error: brandError } = await supabase
      .from("brands")
      .select("id, user_id, name")
      .eq("id", brandId)
      .single();

    if (brandError || !brandData) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const brand = brandData as { id: string; user_id: string; name: string };
    if (brand.user_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied - you do not own these personas" },
        { status: 403 }
      );
    }

    // Translate personas to targeting
    const personasForTranslation = personas.map(parsePersonaForTranslation);
    const audienceTargeting =
      personasForTranslation.length === 1
        ? await translatePersonaToAudiences(personasForTranslation[0])
        : await translateMultiplePersonasToAudiences(personasForTranslation);

    // Generate audience name
    const audienceName =
      body.name ||
      (personas.length === 1
        ? `${personas[0].name} - Audience`
        : `Combined Audience (${personas.length} personas)`);

    // Build audience insert
    const audienceInsert: AudienceInsert = {
      persona_id: null,
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

    // Save audience
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

    // Insert junction table rows
    const junctionRows = personaIds.map((pid) => ({
      audience_id: typedAudience.id,
      persona_id: pid,
    }));

    const { error: junctionError } = await supabase
      .from("audience_personas")
      .insert(junctionRows as never[]);

    if (junctionError) {
      console.error("Error inserting audience_personas:", junctionError);
      // Clean up
      await supabase.from("audiences").delete().eq("id", typedAudience.id);
      return NextResponse.json(
        { error: "Failed to link personas to audience" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audience: {
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
      },
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

    if (!brandId && !personaId) {
      return NextResponse.json(
        { error: "Either brand_id or persona_id query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query with junction table
    let query = supabase.from("audiences").select(`
      *,
      audience_personas (
        persona_id,
        personas (
          id,
          name,
          photo_url
        )
      )
    `);

    if (personaId) {
      // Filter by persona through junction table
      const { data: junctionData } = await supabase
        .from("audience_personas")
        .select("audience_id")
        .eq("persona_id", personaId);

      if (!junctionData || junctionData.length === 0) {
        return NextResponse.json({ audiences: [] });
      }

      const audienceIds = (junctionData as Array<{ audience_id: string }>).map((j) => j.audience_id);
      query = query.in("id", audienceIds);
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
