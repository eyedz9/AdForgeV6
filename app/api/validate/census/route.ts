/**
 * API Route: Census Data Validation
 *
 * POST endpoint that validates a persona's demographics against
 * real US Census Bureau ACS 5-Year data. Can be called on-demand
 * for existing personas or automatically after persona creation.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePersona } from "@/app/actions/personas";
import { validateAgainstCensus } from "@/lib/services/census-validator";
import type { Persona } from "@/lib/supabase/database.types";

interface RequestBody {
  personaId: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const { personaId } = body;

    if (!personaId) {
      return NextResponse.json(
        { error: "personaId is required" },
        { status: 400 }
      );
    }

    // Fetch persona (RLS ensures ownership via brand)
    const { data, error: fetchError } = await supabase
      .from("personas")
      .select()
      .eq("id", personaId)
      .single();

    if (fetchError || !data) {
      return NextResponse.json(
        { error: "Persona not found" },
        { status: 404 }
      );
    }

    const persona = data as Persona;

    // Extract demographics
    const demographics = persona.demographics as Record<string, unknown> | null;
    if (!demographics) {
      return NextResponse.json(
        { error: "Persona has no demographics data" },
        { status: 400 }
      );
    }

    // Run census validation
    const censusResult = await validateAgainstCensus({
      location: demographics.location as string | undefined,
      city: demographics.city as string | undefined,
      state: demographics.state as string | undefined,
      income: demographics.income as number | undefined,
      age: demographics.age as number | undefined,
      education: demographics.education as string | undefined,
      householdSize: demographics.householdSize as number | undefined,
    });

    // Merge census validation into existing generation_params
    const existingParams =
      (persona.generation_params as Record<string, unknown>) ?? {};
    const updatedParams = {
      ...existingParams,
      censusValidation: censusResult,
    };

    // Update the persona
    const updateResult = await updatePersona(personaId, {
      generationParams: updatedParams,
    });

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      censusValidation: censusResult,
    });
  } catch (error) {
    console.error("Census validation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
