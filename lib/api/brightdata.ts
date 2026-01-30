/**
 * BrightData API client for market intelligence gathering
 * Provides functions to search competitors, get trends, news, social conversations, and audience insights
 *
 * Documentation: https://docs.brightdata.com/
 */

import type { Brand, Product, SourceAttribution } from "@/lib/supabase/database.types";

// BrightData API configuration
const BRIGHTDATA_API_URL = process.env.BRIGHTDATA_API_URL || "https://api.brightdata.com";
const BRIGHTDATA_SERP_ZONE = process.env.BRIGHTDATA_SERP_ZONE || "serp";
const BRIGHTDATA_WEB_ZONE = process.env.BRIGHTDATA_WEB_ZONE || "web_unlocker";

// Rate limit configuration
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between retries

/**
 * Source attribution with confidence score
 */
export interface AttributedSource extends SourceAttribution {
  url: string;
  name: string;
  timestamp: string;
  confidence: number; // 0-1 confidence score
  platform?: string; // Source platform (google, reddit, amazon, youtube, etc.)
}

/**
 * Competitor data with source attribution
 */
export interface CompetitorData {
  name: string;
  website: string;
  description?: string;
  marketPosition?: string;
  strengths?: string[];
  weaknesses?: string[];
  pricingTier?: string;
  targetAudience?: string;
  uniqueSellingPoints?: string[];
  socialPresence?: {
    platform: string;
    followers?: number;
    engagement?: string;
  }[];
  source: AttributedSource;
}

/**
 * Search trend data with source attribution
 */
export interface SearchTrendData {
  keyword: string;
  volume?: number;
  trend: "rising" | "stable" | "declining";
  trendPercentage?: number;
  relatedKeywords?: string[];
  seasonality?: string;
  competitionLevel?: "low" | "medium" | "high";
  source: AttributedSource;
}

/**
 * Industry news data with source attribution
 */
export interface IndustryNewsData {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  publisher: string;
  category?: string;
  sentiment?: "positive" | "neutral" | "negative";
  relevanceScore?: number;
  entities?: string[];
  source: AttributedSource;
}

/**
 * Social conversation data with source attribution
 */
export interface SocialConversationData {
  platform: string;
  content: string;
  url?: string;
  author?: string;
  postedAt: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
  sentiment?: "positive" | "neutral" | "negative";
  topics?: string[];
  hashtags?: string[];
  source: AttributedSource;
}

/**
 * Audience insight data with source attribution
 */
export interface AudienceInsightData {
  segment: string;
  description: string;
  demographics?: {
    ageRange?: string;
    gender?: string;
    location?: string[];
    income?: string;
    education?: string;
  };
  interests?: string[];
  behaviors?: string[];
  painPoints?: string[];
  purchaseDrivers?: string[];
  preferredChannels?: string[];
  source: AttributedSource;
}

/**
 * Context for market intelligence queries
 */
export interface MarketIntelligenceContext {
  brand: Brand;
  product?: Product | null;
  keywords?: string[];
  location?: string;
}

/**
 * API response types
 */
export interface BrightDataSuccessResponse<T> {
  success: true;
  data: T[];
  sources: AttributedSource[];
  requestId: string;
}

export interface BrightDataErrorResponse {
  success: false;
  error: string;
  code: string;
  retryable: boolean;
}

export type BrightDataResponse<T> = BrightDataSuccessResponse<T> | BrightDataErrorResponse;

/**
 * Internal BrightData API response structure
 */
interface BrightDataAPIResponse {
  results?: unknown[];
  error?: {
    message: string;
    code: string;
  };
  request_id?: string;
}

/**
 * Sleep utility for rate limiting and retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a source attribution object
 */
function createSourceAttribution(
  url: string,
  name: string,
  confidence: number = 0.8
): AttributedSource {
  return {
    url,
    name,
    timestamp: new Date().toISOString(),
    confidence: Math.max(0, Math.min(1, confidence)), // Clamp to 0-1
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `bd_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Get the BrightData API key from environment
 */
function getApiKey(): string | null {
  return process.env.BRIGHTDATA_API_KEY || null;
}

/**
 * Make a request to the BrightData API with retry logic
 */
async function makeRequest(
  endpoint: string,
  payload: Record<string, unknown>,
  retries: number = MAX_RETRIES
): Promise<BrightDataAPIResponse> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("BRIGHTDATA_API_KEY environment variable is not set");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Rate limiting delay (except for first attempt)
      if (attempt > 0) {
        await sleep(RETRY_DELAY_MS);
      }

      const response = await fetch(`${BRIGHTDATA_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_DELAY_MS;
        console.warn(`BrightData rate limited, waiting ${waitTime}ms before retry`);
        await sleep(waitTime);
        continue;
      }

      // Handle server errors (retryable)
      if (response.status >= 500) {
        lastError = new Error(`BrightData server error: ${response.status}`);
        console.warn(`BrightData server error ${response.status}, attempt ${attempt + 1}/${retries}`);
        continue;
      }

      // Handle client errors (not retryable)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: { message?: string } })?.error?.message ||
            `BrightData API error: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as BrightDataAPIResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.warn(`Network error, attempt ${attempt + 1}/${retries}: ${lastError.message}`);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Build search query from brand and product context
 */
function buildSearchQuery(context: MarketIntelligenceContext): string {
  const parts: string[] = [];

  // Add brand name
  parts.push(context.brand.name);

  // Add industry context
  if (context.brand.industry) {
    parts.push(context.brand.industry);
  }

  // Add product context
  if (context.product) {
    parts.push(context.product.name);
    if (context.product.product_type) {
      parts.push(context.product.product_type);
    }
  }

  // Add custom keywords
  if (context.keywords && context.keywords.length > 0) {
    parts.push(...context.keywords);
  }

  return parts.join(" ");
}

/**
 * Search for competitors in the market
 *
 * @param context - Brand and product context for the search
 * @returns Competitor data with source attribution
 */
export async function searchCompetitors(
  context: MarketIntelligenceContext
): Promise<BrightDataResponse<CompetitorData>> {
  const requestId = generateRequestId();

  try {
    const searchQuery = `${context.brand.industry || "business"} competitors ${context.brand.name}`;

    const response = await makeRequest(`/serp/${BRIGHTDATA_SERP_ZONE}`, {
      query: searchQuery,
      search_type: "organic",
      location: context.location || "United States",
      limit: 20,
    });

    if (response.error) {
      return {
        success: false,
        error: response.error.message,
        code: response.error.code,
        retryable: false,
      };
    }

    // Rate limit delay after successful request
    await sleep(RATE_LIMIT_DELAY_MS);

    // Parse and transform results
    const competitors: CompetitorData[] = [];
    const sources: AttributedSource[] = [];

    const results = (response.results || []) as Array<{
      title?: string;
      url?: string;
      description?: string;
      domain?: string;
    }>;

    for (const result of results) {
      if (!result.url || !result.title) continue;

      const source = createSourceAttribution(
        result.url,
        result.domain || new URL(result.url).hostname,
        0.75
      );

      sources.push(source);

      competitors.push({
        name: result.title,
        website: result.url,
        description: result.description,
        source,
      });
    }

    return {
      success: true,
      data: competitors,
      sources,
      requestId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isRetryable =
      error instanceof Error &&
      (error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("server error"));

    return {
      success: false,
      error: errorMessage,
      code: "COMPETITOR_SEARCH_ERROR",
      retryable: isRetryable,
    };
  }
}

/**
 * Get search trends for the brand/product category
 *
 * @param context - Brand and product context for trend analysis
 * @returns Search trend data with source attribution
 */
export async function getSearchTrends(
  context: MarketIntelligenceContext
): Promise<BrightDataResponse<SearchTrendData>> {
  const requestId = generateRequestId();

  try {
    const keywords = context.keywords || [];
    const baseKeywords = [
      context.brand.name,
      context.brand.industry,
      context.product?.name,
      context.product?.product_type,
    ].filter(Boolean) as string[];

    const allKeywords = [...new Set([...baseKeywords, ...keywords])];

    const response = await makeRequest(`/serp/${BRIGHTDATA_SERP_ZONE}`, {
      query: allKeywords.join(" OR "),
      search_type: "trends",
      location: context.location || "United States",
      time_range: "12m", // Last 12 months
    });

    if (response.error) {
      return {
        success: false,
        error: response.error.message,
        code: response.error.code,
        retryable: false,
      };
    }

    await sleep(RATE_LIMIT_DELAY_MS);

    const trends: SearchTrendData[] = [];
    const sources: AttributedSource[] = [];

    const results = (response.results || []) as Array<{
      keyword?: string;
      volume?: number;
      trend?: string;
      trend_percentage?: number;
      related?: string[];
      competition?: string;
    }>;

    for (const result of results) {
      if (!result.keyword) continue;

      const source = createSourceAttribution(
        "https://trends.google.com",
        "Google Trends",
        0.9
      );

      sources.push(source);

      const trendDirection =
        result.trend === "rising" || result.trend === "up"
          ? "rising"
          : result.trend === "declining" || result.trend === "down"
            ? "declining"
            : "stable";

      trends.push({
        keyword: result.keyword,
        volume: result.volume,
        trend: trendDirection,
        trendPercentage: result.trend_percentage,
        relatedKeywords: result.related,
        competitionLevel:
          result.competition === "high"
            ? "high"
            : result.competition === "low"
              ? "low"
              : "medium",
        source,
      });
    }

    return {
      success: true,
      data: trends,
      sources,
      requestId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isRetryable =
      error instanceof Error &&
      (error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("server error"));

    return {
      success: false,
      error: errorMessage,
      code: "TRENDS_ERROR",
      retryable: isRetryable,
    };
  }
}

/**
 * Get industry news articles
 *
 * @param context - Brand and product context for news search
 * @returns Industry news data with source attribution
 */
export async function getIndustryNews(
  context: MarketIntelligenceContext
): Promise<BrightDataResponse<IndustryNewsData>> {
  const requestId = generateRequestId();

  try {
    const searchQuery = buildSearchQuery(context);

    const response = await makeRequest(`/serp/${BRIGHTDATA_SERP_ZONE}`, {
      query: `${searchQuery} news`,
      search_type: "news",
      location: context.location || "United States",
      time_range: "30d", // Last 30 days
      limit: 30,
    });

    if (response.error) {
      return {
        success: false,
        error: response.error.message,
        code: response.error.code,
        retryable: false,
      };
    }

    await sleep(RATE_LIMIT_DELAY_MS);

    const news: IndustryNewsData[] = [];
    const sources: AttributedSource[] = [];

    const results = (response.results || []) as Array<{
      title?: string;
      snippet?: string;
      url?: string;
      date?: string;
      source?: string;
      category?: string;
    }>;

    for (const result of results) {
      if (!result.title || !result.url) continue;

      const source = createSourceAttribution(
        result.url,
        result.source || new URL(result.url).hostname,
        0.85
      );

      sources.push(source);

      news.push({
        title: result.title,
        summary: result.snippet || "",
        url: result.url,
        publishedAt: result.date || new Date().toISOString(),
        publisher: result.source || "Unknown",
        category: result.category,
        source,
      });
    }

    return {
      success: true,
      data: news,
      sources,
      requestId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isRetryable =
      error instanceof Error &&
      (error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("server error"));

    return {
      success: false,
      error: errorMessage,
      code: "NEWS_ERROR",
      retryable: isRetryable,
    };
  }
}

/**
 * Get social media conversations about the brand/product
 *
 * @param context - Brand and product context for social search
 * @returns Social conversation data with source attribution
 */
export async function getSocialConversations(
  context: MarketIntelligenceContext
): Promise<BrightDataResponse<SocialConversationData>> {
  const requestId = generateRequestId();

  try {
    const searchQuery = buildSearchQuery(context);

    // Search across multiple social platforms
    const platforms = ["twitter", "reddit", "facebook"];
    const allConversations: SocialConversationData[] = [];
    const allSources: AttributedSource[] = [];

    for (const platform of platforms) {
      try {
        const response = await makeRequest(`/web/${BRIGHTDATA_WEB_ZONE}`, {
          url: `https://${platform}.com/search`,
          query: searchQuery,
          render: true, // Enable JavaScript rendering for social sites
          limit: 15,
        });

        await sleep(RATE_LIMIT_DELAY_MS);

        if (response.error) continue;

        const results = (response.results || []) as Array<{
          content?: string;
          url?: string;
          author?: string;
          date?: string;
          likes?: number;
          comments?: number;
          shares?: number;
          sentiment?: string;
          hashtags?: string[];
        }>;

        for (const result of results) {
          if (!result.content) continue;

          const source = createSourceAttribution(
            result.url || `https://${platform}.com`,
            platform.charAt(0).toUpperCase() + platform.slice(1),
            0.7
          );

          allSources.push(source);

          allConversations.push({
            platform,
            content: result.content,
            url: result.url,
            author: result.author,
            postedAt: result.date || new Date().toISOString(),
            engagement: {
              likes: result.likes,
              comments: result.comments,
              shares: result.shares,
            },
            sentiment:
              result.sentiment === "positive"
                ? "positive"
                : result.sentiment === "negative"
                  ? "negative"
                  : "neutral",
            hashtags: result.hashtags,
            source,
          });
        }
      } catch {
        // Continue with other platforms if one fails
        console.warn(`Failed to fetch from ${platform}, continuing with other platforms`);
      }
    }

    return {
      success: true,
      data: allConversations,
      sources: allSources,
      requestId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isRetryable =
      error instanceof Error &&
      (error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("server error"));

    return {
      success: false,
      error: errorMessage,
      code: "SOCIAL_ERROR",
      retryable: isRetryable,
    };
  }
}

/**
 * Get audience insights from market research data
 *
 * @param context - Brand and product context for audience analysis
 * @returns Audience insight data with source attribution
 */
export async function getAudienceInsights(
  context: MarketIntelligenceContext
): Promise<BrightDataResponse<AudienceInsightData>> {
  const requestId = generateRequestId();

  try {
    const searchQuery = `${context.brand.industry || "market"} audience demographics consumer behavior`;

    const response = await makeRequest(`/serp/${BRIGHTDATA_SERP_ZONE}`, {
      query: searchQuery,
      search_type: "organic",
      location: context.location || "United States",
      limit: 25,
    });

    if (response.error) {
      return {
        success: false,
        error: response.error.message,
        code: response.error.code,
        retryable: false,
      };
    }

    await sleep(RATE_LIMIT_DELAY_MS);

    const insights: AudienceInsightData[] = [];
    const sources: AttributedSource[] = [];

    const results = (response.results || []) as Array<{
      title?: string;
      snippet?: string;
      url?: string;
      domain?: string;
    }>;

    // Process results to extract audience segments
    // In a real implementation, this would use NLP or AI to extract structured insights
    for (const result of results) {
      if (!result.title || !result.url) continue;

      const source = createSourceAttribution(
        result.url,
        result.domain || new URL(result.url).hostname,
        0.65
      );

      sources.push(source);

      // Create a basic insight from the search result
      insights.push({
        segment: result.title,
        description: result.snippet || "",
        source,
      });
    }

    return {
      success: true,
      data: insights,
      sources,
      requestId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isRetryable =
      error instanceof Error &&
      (error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("server error"));

    return {
      success: false,
      error: errorMessage,
      code: "AUDIENCE_ERROR",
      retryable: isRetryable,
    };
  }
}

/**
 * Gather all market intelligence in one call
 *
 * @param context - Brand and product context
 * @returns Combined intelligence data from all sources
 */
export async function gatherAllIntelligence(context: MarketIntelligenceContext): Promise<{
  competitors: BrightDataResponse<CompetitorData>;
  trends: BrightDataResponse<SearchTrendData>;
  news: BrightDataResponse<IndustryNewsData>;
  social: BrightDataResponse<SocialConversationData>;
  audience: BrightDataResponse<AudienceInsightData>;
}> {
  // Run all intelligence gathering in parallel where possible
  // but with respect for rate limits
  const [competitors, trends, news, social, audience] = await Promise.all([
    searchCompetitors(context),
    getSearchTrends(context),
    getIndustryNews(context),
    getSocialConversations(context),
    getAudienceInsights(context),
  ]);

  return {
    competitors,
    trends,
    news,
    social,
    audience,
  };
}
