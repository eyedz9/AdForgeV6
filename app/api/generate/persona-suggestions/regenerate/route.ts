/**
 * Persona Suggestion Regenerate API Route
 *
 * Regenerates a single persona suggestion, excluding given names.
 * Does NOT save to DB or check quota.
 *
 * POST /api/generate/persona-suggestions/regenerate
 */

export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMessageForJSON } from "@/lib/api/anthropic";
import type {
  Brand,
  Product,
  IntelligenceReport,
} from "@/lib/supabase/database.types";
import {
  buildSuggestionPrompt,
  type PersonaSuggestion,
  type ReportContext,
} from "../route";
import {
  validateSuggestion,
  CENSUS_SCORE_THRESHOLD,
  MAX_RETRIES_PER_SLOT,
} from "@/lib/services/suggestion-census";

interface RegenerateRequest {
  brand_id: string;
  product_id?: string | null;
  intelligence_report_id?: string | null;
  exclude_names: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegenerateRequest;

    if (!body.brand_id) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify brand ownership
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
          { error: "Intelligence report not found" },
          { status: 404 }
        );
      }
      intelligenceReport = reportData;
    }

    // Fetch existing persona names
    const { data: existingPersonas } = await supabase
      .from("personas")
      .select("name")
      .eq("brand_id", body.brand_id);

    const existingPersonaNames = (existingPersonas || []).map(
      (p: { name: string }) => p.name
    );

    const typedBrand = brand as Brand;

    let reportContext: ReportContext | null = null;
    if (intelligenceReport) {
      const ir = intelligenceReport as IntelligenceReport;
      reportContext = {
        executiveSummary: ir.executive_summary || undefined,
        audienceSegments: ir.synthesized_audience as Array<Record<string, unknown>> | undefined,
        competitors: ir.synthesized_competitors as Array<Record<string, unknown>> | undefined,
      };
    }

    const prompt = buildSuggestionPrompt(
      typedBrand,
      product,
      reportContext,
      existingPersonaNames,
      1,
      body.exclude_names || []
    );

    const suggestions = await sendMessageForJSON<PersonaSuggestion[]>(prompt, {
      systemPrompt:
        "You are an expert persona developer for marketing teams. Create exactly 1 realistic, diverse, actionable persona suggestion. Return ONLY a JSON array with exactly 1 element.",
      maxTokens: 2000,
      temperature: 0.9,
    });

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return NextResponse.json(
        { error: "Failed to regenerate suggestion" },
        { status: 500 }
      );
    }

    // Census-validate the suggestion, retrying if below threshold
    let current = await validateSuggestion(suggestions[0]);

    if (current.censusScore > 0 && current.censusScore < CENSUS_SCORE_THRESHOLD) {
      for (let attempt = 0; attempt < MAX_RETRIES_PER_SLOT; attempt++) {
        try {
          const retryPrompt = buildSuggestionPrompt(
            typedBrand,
            product,
            reportContext,
            existingPersonaNames,
            1,
            [...(body.exclude_names || []), current.name]
          );
          const retryResult = await sendMessageForJSON<PersonaSuggestion[]>(
            retryPrompt,
            {
              systemPrompt:
                "You are an expert persona developer for marketing teams. Create exactly 1 realistic, diverse, actionable persona suggestion. Return ONLY a JSON array with exactly 1 element.",
              maxTokens: 2000,
              temperature: 0.9,
            }
          );

          if (!Array.isArray(retryResult) || retryResult.length === 0) break;

          const validated = await validateSuggestion(retryResult[0]);
          current = validated;

          if (validated.censusScore === 0 || validated.censusScore >= CENSUS_SCORE_THRESHOLD) {
            break;
          }
        } catch {
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      suggestion: current,
    });
  } catch (error) {
    console.error("Error regenerating persona suggestion:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to regenerate suggestion",
      },
      { status: 500 }
    );
  }
}
