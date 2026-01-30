/**
 * Intelligence Report Generation API Route
 *
 * Three-phase approach:
 * 1. Collection Phase: BrightData MCP for real web data
 * 2. Synthesis Phase: Claude AI for structured insights
 * 3. Storage Phase: Save report with raw + synthesized data
 *
 * POST /api/generate/intelligence
 * GET /api/generate/intelligence?brand_id=...
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildSearchQueries,
  type RawIntelligenceData,
  type SearchResult,
  type ScrapedContent,
} from "@/lib/services/intelligence-collector";
import {
  synthesizeFullReport,
  type SynthesizedReport,
} from "@/lib/services/intelligence-synthesizer";
import { checkQuota, decrementQuota } from "@/lib/services/usage";
import type {
  Brand,
  Product,
  IntelligenceReportInsert,
  Json,
} from "@/lib/supabase/database.types";
import type { AttributedSource } from "@/lib/api/brightdata";

// Rate limiting configuration
const SEARCH_DELAY_MS = 500;
const SCRAPE_DELAY_MS = 1000;

/**
 * Request body schema
 */
interface GenerateIntelligenceRequest {
  brand_id: string;
  product_id?: string | null;
  report_type?: string;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute search using BrightData MCP tools
 * Uses the search_engine tool via dynamic import
 */
async function executeSearch(query: string): Promise<SearchResult[]> {
  try {
    // Use fetch to call BrightData's search_engine MCP tool
    // The MCP tools are available through the brightdata MCP server
    const response = await fetch(
      `${process.env.BRIGHTDATA_API_URL || "https://api.brightdata.com"}/serp/${process.env.BRIGHTDATA_SERP_ZONE || "serp"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          search_type: "organic",
          location: "United States",
          limit: 10,
        }),
      }
    );

    if (!response.ok) {
      console.error(`Search failed for "${query}": ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const results = (data.results || []) as Array<{
      url?: string;
      title?: string;
      description?: string;
      snippet?: string;
    }>;

    return results
      .filter((r) => r.url && r.title)
      .map((r, i) => ({
        url: r.url!,
        title: r.title!,
        description: r.description || r.snippet || "",
        position: i + 1,
      }));
  } catch (error) {
    console.error(`Search error for "${query}":`, error);
    return [];
  }
}

/**
 * Scrape URL using BrightData MCP tools
 */
async function scrapeUrl(url: string): Promise<ScrapedContent | null> {
  try {
    const response = await fetch(
      `${process.env.BRIGHTDATA_API_URL || "https://api.brightdata.com"}/web/${process.env.BRIGHTDATA_WEB_ZONE || "web_unlocker"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
        },
        body: JSON.stringify({
          url,
          render: true,
          format: "markdown",
        }),
      }
    );

    if (!response.ok) {
      console.error(`Scrape failed for "${url}": ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return {
      url,
      title: data.title || "",
      content: data.content || data.markdown || data.text || "",
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Scrape error for "${url}":`, error);
    return null;
  }
}

/**
 * Phase 1: Collection - Gather raw data from web
 */
async function collectionPhase(
  context: { brand: Brand; product?: Product | null }
): Promise<RawIntelligenceData> {
  const queries = buildSearchQueries({
    brand: context.brand,
    product: context.product,
  });

  const errors: string[] = [];
  let totalSearches = 0;
  let totalScraped = 0;

  // Execute competitor searches
  const competitorSearches: SearchResult[] = [];
  for (const query of queries.competitors) {
    const results = await executeSearch(query);
    competitorSearches.push(...results);
    totalSearches++;
    await sleep(SEARCH_DELAY_MS);
  }

  // Execute trend searches
  const trendSearches: SearchResult[] = [];
  for (const query of queries.trends) {
    const results = await executeSearch(query);
    trendSearches.push(...results);
    totalSearches++;
    await sleep(SEARCH_DELAY_MS);
  }

  // Execute news searches
  const newsSearches: SearchResult[] = [];
  for (const query of queries.news) {
    const results = await executeSearch(query);
    newsSearches.push(...results);
    totalSearches++;
    await sleep(SEARCH_DELAY_MS);
  }

  // Execute social searches
  const socialSearches: SearchResult[] = [];
  for (const query of queries.social) {
    const results = await executeSearch(query);
    socialSearches.push(...results);
    totalSearches++;
    await sleep(SEARCH_DELAY_MS);
  }

  // Execute audience searches
  const audienceSearches: SearchResult[] = [];
  for (const query of queries.audience) {
    const results = await executeSearch(query);
    audienceSearches.push(...results);
    totalSearches++;
    await sleep(SEARCH_DELAY_MS);
  }

  // Scrape top URLs from each category
  const competitorScraped: ScrapedContent[] = [];
  for (const result of competitorSearches.slice(0, 5)) {
    const content = await scrapeUrl(result.url);
    if (content) {
      competitorScraped.push(content);
      totalScraped++;
    }
    await sleep(SCRAPE_DELAY_MS);
  }

  const trendScraped: ScrapedContent[] = [];
  for (const result of trendSearches.slice(0, 3)) {
    const content = await scrapeUrl(result.url);
    if (content) {
      trendScraped.push(content);
      totalScraped++;
    }
    await sleep(SCRAPE_DELAY_MS);
  }

  const newsScraped: ScrapedContent[] = [];
  for (const result of newsSearches.slice(0, 4)) {
    const content = await scrapeUrl(result.url);
    if (content) {
      newsScraped.push(content);
      totalScraped++;
    }
    await sleep(SCRAPE_DELAY_MS);
  }

  const socialScraped: ScrapedContent[] = [];
  for (const result of socialSearches.slice(0, 5)) {
    const content = await scrapeUrl(result.url);
    if (content) {
      socialScraped.push(content);
      totalScraped++;
    }
    await sleep(SCRAPE_DELAY_MS);
  }

  const audienceScraped: ScrapedContent[] = [];
  for (const result of audienceSearches.slice(0, 3)) {
    const content = await scrapeUrl(result.url);
    if (content) {
      audienceScraped.push(content);
      totalScraped++;
    }
    await sleep(SCRAPE_DELAY_MS);
  }

  return {
    competitors: { searches: competitorSearches, scraped: competitorScraped },
    trends: { searches: trendSearches, scraped: trendScraped },
    news: { searches: newsSearches, scraped: newsScraped },
    social: { searches: socialSearches, scraped: socialScraped },
    audience: { searches: audienceSearches, scraped: audienceScraped },
    // UGC platform categories (basic implementation - stream route has full support)
    reddit: { searches: [], scraped: [] },
    amazon: { searches: [], scraped: [] },
    youtube: { searches: [], scraped: [] },
    googleReviews: { searches: [], scraped: [] },
    forums: { searches: [], scraped: [] },
    metadata: {
      collectedAt: new Date().toISOString(),
      totalSearches,
      totalScraped,
      errors,
      platforms: ["google"],
    },
  };
}

/**
 * Phase 2: Synthesis - Process raw data with Claude AI
 */
async function synthesisPhase(
  rawData: RawIntelligenceData,
  context: { brand: Brand; product?: Product | null }
): Promise<SynthesizedReport> {
  return synthesizeFullReport(rawData, context);
}

/**
 * Build sources array from raw data
 */
function buildSources(rawData: RawIntelligenceData): AttributedSource[] {
  const sources: AttributedSource[] = [];
  const seen = new Set<string>();

  const addSource = (url: string, name: string, confidence: number) => {
    if (!seen.has(url)) {
      seen.add(url);
      sources.push({
        url,
        name,
        timestamp: new Date().toISOString(),
        confidence,
      });
    }
  };

  // Add sources from searches
  rawData.competitors.searches.forEach((s) =>
    addSource(s.url, s.title, 0.75)
  );
  rawData.trends.searches.forEach((s) =>
    addSource(s.url, s.title, 0.9)
  );
  rawData.news.searches.forEach((s) =>
    addSource(s.url, s.title, 0.85)
  );
  rawData.social.searches.forEach((s) =>
    addSource(s.url, s.title, 0.7)
  );
  rawData.audience.searches.forEach((s) =>
    addSource(s.url, s.title, 0.65)
  );

  // Add UGC platform sources
  rawData.reddit?.searches.forEach((s) =>
    addSource(s.url, s.title, 0.8)
  );
  rawData.amazon?.searches.forEach((s) =>
    addSource(s.url, s.title, 0.85)
  );
  rawData.youtube?.searches.forEach((s) =>
    addSource(s.url, s.title, 0.75)
  );
  rawData.googleReviews?.searches.forEach((s) =>
    addSource(s.url, s.title, 0.82)
  );
  rawData.forums?.searches.forEach((s) =>
    addSource(s.url, s.title, 0.7)
  );

  return sources;
}

/**
 * POST handler - Generate new intelligence report
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateIntelligenceRequest;

    if (!body.brand_id) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Authenticate user
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

    // Check quota
    const quotaCheck = await checkQuota(
      supabase,
      user.id,
      "intelligence_reports",
      1
    );
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error:
            quotaCheck.message ||
            "Intelligence report generation quota exceeded",
          remaining: quotaCheck.remaining,
          limit: quotaCheck.limit,
        },
        { status: 429 }
      );
    }

    const context = { brand: brand as Brand, product };

    // Phase 1: Collection
    console.log("Starting Phase 1: Collection");
    const rawData = await collectionPhase(context);

    // Phase 2: Synthesis
    console.log("Starting Phase 2: Synthesis");
    const synthesized = await synthesisPhase(rawData, context);

    // Phase 3: Storage
    console.log("Starting Phase 3: Storage");
    const sources = buildSources(rawData);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Prepare report data with both raw and synthesized data
    const reportData: IntelligenceReportInsert = {
      brand_id: body.brand_id,
      product_id: body.product_id || null,
      report_type: body.report_type || "comprehensive",
      generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "active",

      // Raw data from BrightData (legacy fields)
      competitors: synthesized.competitors as unknown as Json,
      search_trends: synthesized.trends as unknown as Json,
      industry_news: rawData.news.searches as unknown as Json,
      social_conversations: rawData.social.searches as unknown as Json,
      audience_insights: {
        segments: synthesized.audienceSegments,
        totalSegments: synthesized.audienceSegments.length,
      } as unknown as Json,
      sources: sources as unknown as Json,

      // New enhanced fields
      executive_summary: JSON.stringify(synthesized.executiveSummary),
      persona_suggestions: synthesized.personaSuggestions as unknown as Json,
      raw_data: rawData as unknown as Json,
      platform_insights: synthesized.platformInsights as unknown as Json,
      content_recommendations:
        synthesized.contentRecommendations as unknown as Json,
      synthesized_trends: synthesized.trends as unknown as Json,
      synthesized_audience: synthesized.audienceSegments as unknown as Json,
      synthesized_competitors: synthesized.competitors as unknown as Json,
    };

    // Save to database
    const { data: report, error: insertError } = await supabase
      .from("intelligence_reports")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(reportData as any)
      .select()
      .single();

    if (insertError || !report) {
      console.error("Error saving intelligence report:", insertError);
      return NextResponse.json(
        { error: "Failed to save intelligence report" },
        { status: 500 }
      );
    }

    // Cast report to expected type
    const savedReport = report as {
      id: string;
      brand_id: string;
      product_id: string | null;
      report_type: string;
      generated_at: string;
      expires_at: string;
      status: string;
    };

    // Decrement quota
    await decrementQuota(supabase, user.id, "intelligence_reports", 1);

    // Return complete response
    return NextResponse.json({
      id: savedReport.id,
      brand_id: savedReport.brand_id,
      product_id: savedReport.product_id,
      report_type: savedReport.report_type,
      generated_at: savedReport.generated_at,
      expires_at: savedReport.expires_at,
      status: savedReport.status,
      executive_summary: synthesized.executiveSummary,
      competitors: synthesized.competitors,
      trends: synthesized.trends,
      audience_segments: synthesized.audienceSegments,
      persona_suggestions: synthesized.personaSuggestions,
      platform_insights: synthesized.platformInsights,
      content_recommendations: synthesized.contentRecommendations,
      sources,
      metadata: rawData.metadata,
    });
  } catch (error) {
    console.error("Error generating intelligence report:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate intelligence report",
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Retrieve existing reports
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brand_id");

    if (!brandId) {
      return NextResponse.json(
        { error: "brand_id query parameter is required" },
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

    // Verify brand ownership
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

    // Get reports
    const { data: reports, error: reportsError } = await supabase
      .from("intelligence_reports")
      .select("*")
      .eq("brand_id", brandId)
      .order("generated_at", { ascending: false });

    if (reportsError) {
      console.error("Error fetching reports:", reportsError);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    console.error("Error fetching intelligence reports:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch intelligence reports",
      },
      { status: 500 }
    );
  }
}
