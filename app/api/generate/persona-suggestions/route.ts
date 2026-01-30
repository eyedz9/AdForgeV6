/**
 * Persona Suggestions API Route
 *
 * Generates lightweight persona suggestions using Claude via Anthropic.
 * Does NOT save to DB or check/decrement quota — quota is checked
 * when a suggestion is accepted via persona-from-suggestion.
 *
 * POST /api/generate/persona-suggestions
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
  validateAndRetrySuggestions,
  type ValidatedSuggestion,
  type PersonaSuggestion,
} from "@/lib/services/suggestion-census";

export type { PersonaSuggestion };

interface GenerateSuggestionsRequest {
  brand_id: string;
  product_id?: string | null;
  intelligence_report_id?: string | null;
  count?: number;
}

export interface ReportContext {
  executiveSummary?: string;
  audienceSegments?: Array<Record<string, unknown>>;
  competitors?: Array<Record<string, unknown>>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateSuggestionsRequest;

    if (!body.brand_id) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    const count = Math.max(1, Math.min(5, body.count || 3));

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
          { error: "Intelligence report not found or does not belong to this brand" },
          { status: 404 }
        );
      }
      intelligenceReport = reportData;
    }

    // Fetch existing persona names for uniqueness
    const { data: existingPersonas } = await supabase
      .from("personas")
      .select("name")
      .eq("brand_id", body.brand_id);

    const existingPersonaNames = (existingPersonas || []).map(
      (p: { name: string }) => p.name
    );

    // Build context for prompt
    const typedBrand = brand as Brand;

    // Extract structured data from the intelligence report's individual fields
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
      count,
      []
    );

    const suggestions = await sendMessageForJSON<PersonaSuggestion[]>(prompt, {
      systemPrompt:
        "You are an expert persona developer for marketing teams. Create realistic, diverse, actionable persona suggestions based on brand and market data. Return ONLY a JSON array.",
      maxTokens: 4000,
      temperature: 0.8,
    });

    if (!Array.isArray(suggestions)) {
      return NextResponse.json(
        { error: "Failed to generate suggestions" },
        { status: 500 }
      );
    }

    // Census-validate all suggestions, retrying any that score below threshold
    const generateReplacement = async (
      excludeNames: string[]
    ): Promise<PersonaSuggestion | null> => {
      try {
        const replacementPrompt = buildSuggestionPrompt(
          typedBrand,
          product,
          reportContext,
          existingPersonaNames,
          1,
          excludeNames
        );
        const result = await sendMessageForJSON<PersonaSuggestion[]>(
          replacementPrompt,
          {
            systemPrompt:
              "You are an expert persona developer for marketing teams. Create exactly 1 realistic, diverse, actionable persona suggestion. Return ONLY a JSON array with exactly 1 element.",
            maxTokens: 2000,
            temperature: 0.9,
          }
        );
        if (Array.isArray(result) && result.length > 0) {
          return result[0];
        }
        return null;
      } catch {
        return null;
      }
    };

    const validatedSuggestions: ValidatedSuggestion[] =
      await validateAndRetrySuggestions(suggestions, { generateReplacement });

    return NextResponse.json({
      success: true,
      suggestions: validatedSuggestions,
    });
  } catch (error) {
    console.error("Error generating persona suggestions:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate suggestions",
      },
      { status: 500 }
    );
  }
}

/**
 * Build the prompt for generating lightweight persona suggestions.
 */
export function buildSuggestionPrompt(
  brand: Brand,
  product: Product | null,
  reportContext: ReportContext | null,
  existingPersonaNames: string[],
  count: number,
  excludeNames: string[]
): string {
  // Extract intelligence context if available
  let intelligenceContext = "";
  if (reportContext) {
    if (reportContext.executiveSummary) {
      intelligenceContext += `\n## Market Overview:\n${reportContext.executiveSummary}\n`;
    }
    if (reportContext.audienceSegments && reportContext.audienceSegments.length > 0) {
      intelligenceContext += `\n## Audience Segments:\n${reportContext.audienceSegments
        .map(
          (s) =>
            `- ${s.name}: ${s.description || ""}`
        )
        .join("\n")}\n`;
    }
    if (reportContext.competitors && reportContext.competitors.length > 0) {
      intelligenceContext += `\n## Competitors:\n${reportContext.competitors
        .map(
          (c) =>
            `- ${c.name}: ${c.positioning || c.description || ""} (targets: ${c.targetAudience || "N/A"})`
        )
        .join("\n")}\n`;
    }
  }

  const allExcluded = [...existingPersonaNames, ...excludeNames];
  const excludeClause =
    allExcluded.length > 0
      ? `\nDo NOT use any of these names (already exist or excluded): ${allExcluded.join(", ")}\n`
      : "";

  return `Generate ${count} lightweight persona suggestion${count !== 1 ? "s" : ""} for targeted advertising.

## Brand Context:
- Brand: ${brand.name}
- Industry: ${brand.industry || "General"}
- Business Type: ${brand.business_type || "N/A"}
${product ? `\n## Product:\n- Name: ${product.name}\n- Type: ${product.product_type || "N/A"}\n- Description: ${product.short_description || "N/A"}\n- Price: ${product.price ? `$${product.price}` : "N/A"}` : ""}
${intelligenceContext}
${excludeClause}

For each persona, return:
- name: A realistic full name (diverse backgrounds)
- archetype: A short label (e.g., "Tech-Savvy Millennial", "Budget-Conscious Parent")
- headline: One-sentence summary capturing their essence
- demographics: { age (specific number), gender, location (specific US city and state, e.g. "Austin, Texas"), income (string like "$85,000"), occupation }
- psychographics: { values (3-5 items), motivations (3-4 items), painPoints (3-4 items), aspirations (3-4 items) }
- behaviors: { purchaseDrivers (3-4 items), preferredChannels (2-4 items), decisionStyle (one phrase) }
- relevanceScore: 0-1 float indicating fit with the brand/product
- reasoning: 2-3 sentences explaining why this persona is ideal for the brand

Return a JSON array of ${count} persona suggestion objects.`;
}
