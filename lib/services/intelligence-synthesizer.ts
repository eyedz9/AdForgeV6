/**
 * Intelligence Synthesizer Service
 *
 * Uses Claude AI to process raw web data into structured insights.
 * Handles competitor analysis, trend synthesis, audience segmentation,
 * and persona suggestions.
 */

import { sendMessageForJSON } from "@/lib/api/anthropic";
import type { RawIntelligenceData } from "./intelligence-collector";
import type { Brand, Product } from "@/lib/supabase/database.types";
import type { AttributedSource } from "@/lib/api/brightdata";

/**
 * Synthesized competitor data
 */
export interface SynthesizedCompetitor {
  name: string;
  website: string;
  description: string;
  positioning: string;
  pricingTier: "budget" | "mid-range" | "premium" | "enterprise" | "unknown";
  strengths: string[];
  weaknesses: string[];
  uniqueSellingPoints: string[];
  targetAudience: string;
  socialPresence?: {
    platform: string;
    followers?: number;
    engagement?: string;
  }[];
  confidence: number;
  source: AttributedSource;
  sourceCitations?: string[]; // URLs where this competitor was found
}

/**
 * Synthesized trend data
 */
export interface SynthesizedTrend {
  name: string;
  description: string;
  direction: "growing" | "stable" | "declining";
  impactLevel: "high" | "medium" | "low";
  timeframe: string;
  relatedKeywords: string[];
  opportunities: string[];
  threats: string[];
  confidence: number;
  source: AttributedSource;
  sourceCitations?: string[]; // URLs that support this trend
}

/**
 * Synthesized audience segment
 */
export interface SynthesizedAudienceSegment {
  name: string;
  description: string;
  size: "large" | "medium" | "small" | "niche";
  demographics: {
    ageRange: string;
    gender: string;
    income: string;
    location: string[];
    education: string;
  };
  psychographics: {
    values: string[];
    interests: string[];
    painPoints: string[];
    motivations: string[];
  };
  behaviors: {
    purchaseDrivers: string[];
    preferredChannels: string[];
    researchBehavior: string;
  };
  confidence: number;
  source: AttributedSource;
  sourceCitations?: string[]; // URLs that support this segment
}

/**
 * Suggested persona from intelligence data
 */
export interface PersonaSuggestion {
  name: string;
  archetype: string;
  headline: string;
  demographics: {
    age: number;
    gender: string;
    location: string;
    income: string;
    occupation: string;
  };
  psychographics: {
    values: string[];
    motivations: string[];
    painPoints: string[];
    aspirations: string[];
  };
  behaviors: {
    purchaseDrivers: string[];
    preferredChannels: string[];
    decisionStyle: string;
  };
  relevanceScore: number;
  reasoning: string;
  dataSupport?: string[]; // Which research data points support this persona
}

/**
 * Platform-specific insights
 */
export interface PlatformInsight {
  platform: string;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  keyTopics: string[];
  engagement: string;
  recommendations: string[];
}

/**
 * Content recommendation
 */
export interface ContentRecommendation {
  type: "image" | "video" | "carousel" | "story" | "text";
  platform: string;
  headline: string;
  description: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
}

/**
 * Executive summary
 */
export interface ExecutiveSummary {
  overview: string;
  keyFindings: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
}

/**
 * Complete synthesized report
 */
export interface SynthesizedReport {
  executiveSummary: ExecutiveSummary;
  competitors: SynthesizedCompetitor[];
  trends: SynthesizedTrend[];
  audienceSegments: SynthesizedAudienceSegment[];
  personaSuggestions: PersonaSuggestion[];
  platformInsights: PlatformInsight[];
  contentRecommendations: ContentRecommendation[];
}

/**
 * Progress callback for synthesis updates
 */
export type SynthesisProgressCallback = (phase: string, message: string, progress: number) => void;

/**
 * Helper to truncate content for Claude context
 */
function truncateContent(content: string, maxLength: number = 2000): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + "...";
}

/**
 * Create source attribution from URL
 */
function createSource(url: string, name: string, confidence: number): AttributedSource {
  return {
    url,
    name,
    timestamp: new Date().toISOString(),
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * Synthesize competitors from raw data
 */
export async function synthesizeCompetitors(
  rawData: RawIntelligenceData,
  context: { brand: Brand; product?: Product | null }
): Promise<SynthesizedCompetitor[]> {
  const searchData = rawData.competitors.searches
    .slice(0, 10)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n");

  const scrapedData = rawData.competitors.scraped
    .slice(0, 3)
    .map((s) => `### ${s.url}\n${truncateContent(s.content, 800)}`)
    .join("\n\n");

  // Include Reddit discussions for competitor mentions
  const redditMentions = rawData.reddit?.scraped
    .slice(0, 2)
    .map((s) => `### Reddit: ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  // Include forum discussions for competitor comparisons
  const forumMentions = rawData.forums?.scraped
    .slice(0, 2)
    .map((s) => `### Forum: ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  const prompt = `Analyze the following REAL search results, scraped content, and user discussions from BrightData to identify competitors for "${context.brand.name}" in the ${context.brand.industry || "business"} industry.

## Search Results (from BrightData SERP):
${searchData}

## Scraped Content (from BrightData):
${scrapedData}

## Reddit Discussions (competitor mentions):
${redditMentions}

## Forum Discussions (competitor comparisons):
${forumMentions}

CRITICAL INSTRUCTIONS:
1. ONLY identify competitors that appear in the provided data above
2. Include the source URL for each competitor identified
3. Do NOT fabricate competitors or their details - everything must be from the research
4. If data is limited, return fewer competitors rather than inventing information

Based on the REAL data above, identify the top 5-7 competitors. For each competitor, provide:
- name: Company name (MUST appear in the research data)
- website: URL (from the search results)
- description: Brief description (cite source URL)
- positioning: Market positioning statement (from research)
- pricingTier: One of "budget", "mid-range", "premium", "enterprise", or "unknown"
- strengths: Array of 3-5 key strengths (with source URLs)
- weaknesses: Array of 2-4 potential weaknesses (from user discussions, cite sources)
- uniqueSellingPoints: Array of 2-4 USPs
- targetAudience: Primary target audience description
- confidence: Confidence score 0-1 based on data quality
- sourceCitations: Array of URLs where this competitor was mentioned

Return as a JSON array of competitor objects.`;

  try {
    const result = await sendMessageForJSON<SynthesizedCompetitor[]>(prompt, {
      systemPrompt: "You are an expert competitive intelligence analyst. Extract accurate competitor information from web data. Be thorough but only include information you can verify from the provided data.",
    });

    // Ensure we have an array
    const competitors = Array.isArray(result) ? result : [];
    if (!Array.isArray(result)) {
      console.warn("Competitors response was not an array:", typeof result);
    }

    // Add source attribution
    return competitors.map((c, i) => ({
      ...c,
      source: createSource(
        rawData.competitors.searches[i]?.url || rawData.competitors.scraped[0]?.url || "",
        "Competitive Analysis",
        c.confidence || 0.75
      ),
    }));
  } catch (error) {
    console.error("Error synthesizing competitors:", error);
    return [];
  }
}

/**
 * Synthesize market trends from raw data
 */
export async function synthesizeTrends(
  rawData: RawIntelligenceData,
  context: { brand: Brand; product?: Product | null }
): Promise<SynthesizedTrend[]> {
  const searchData = rawData.trends.searches
    .slice(0, 10)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n");

  const scrapedData = rawData.trends.scraped
    .slice(0, 3)
    .map((s) => `### ${s.url}\n${truncateContent(s.content, 1000)}`)
    .join("\n\n");

  const prompt = `Analyze the following data to identify market trends for the ${context.brand.industry || "business"} industry.

## Search Results:
${searchData}

## Scraped Content:
${scrapedData}

Identify 4-6 significant market trends. For each trend, provide:
- name: Trend name
- description: Detailed description
- direction: "growing", "stable", or "declining"
- impactLevel: "high", "medium", or "low"
- timeframe: Expected duration/timeline
- relatedKeywords: Array of related keywords
- opportunities: Array of opportunities this trend creates
- threats: Array of potential threats
- confidence: Confidence score 0-1

Return as a JSON array of trend objects.`;

  try {
    const result = await sendMessageForJSON<SynthesizedTrend[]>(prompt, {
      systemPrompt: "You are an expert market trend analyst. Identify actionable trends from web data. Focus on trends relevant to the industry and backed by the data provided.",
    });

    // Ensure we have an array
    const trends = Array.isArray(result) ? result : [];
    if (!Array.isArray(result)) {
      console.warn("Trends response was not an array:", typeof result);
    }

    return trends.map((t, i) => ({
      ...t,
      source: createSource(
        rawData.trends.searches[i]?.url || rawData.trends.scraped[0]?.url || "",
        "Market Trends Analysis",
        t.confidence || 0.8
      ),
    }));
  } catch (error) {
    console.error("Error synthesizing trends:", error);
    return [];
  }
}

/**
 * Synthesize audience segments from raw data
 * Enhanced for product-level research to identify perfect target audiences
 */
export async function synthesizeAudience(
  rawData: RawIntelligenceData,
  context: { brand: Brand; product?: Product | null }
): Promise<SynthesizedAudienceSegment[]> {
  // Collect all search results with source URLs for citations
  const searchData = rawData.audience.searches
    .slice(0, 10)
    .map((s) => `- [Source: ${s.url}] ${s.title}: ${s.description || ""}`)
    .join("\n");

  const scrapedData = rawData.audience.scraped
    .slice(0, 3)
    .map((s) => `### Source: ${s.url}\n${truncateContent(s.content, 1000)}`)
    .join("\n\n");

  const socialData = rawData.social.scraped
    .slice(0, 2)
    .map((s) => `### Source: ${s.url}\n${truncateContent(s.content, 600)}`)
    .join("\n\n");

  // Include UGC platform data for richer audience insights with citations
  const redditData = rawData.reddit?.scraped
    .slice(0, 2)
    .map((s) => `### Reddit Source: ${s.url}\n${truncateContent(s.content, 500)}`)
    .join("\n\n") || "";

  const amazonData = rawData.amazon?.scraped
    .slice(0, 2)
    .map((s) => `### Amazon Source: ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  const forumData = rawData.forums?.scraped
    .slice(0, 2)
    .map((s) => `### Forum Source: ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  // Product-specific context for better targeting
  const productContext = context.product ? `
## PRODUCT RESEARCH CONTEXT:
Product Name: ${context.product.name}
Product Type: ${context.product.product_type || "Not specified"}
Description: ${context.product.short_description || "Not specified"}
Price Point: ${context.product.price ? `$${context.product.price}` : "Not specified"}

IMPORTANT: This is product-level research. Focus on identifying the IDEAL target audience for this specific product. Consider:
- Who would benefit most from this product?
- What demographics are most likely to purchase?
- What are the key purchase motivations?
- What pain points does this product solve?
` : "";

  const prompt = `Analyze the following REAL web research data to identify target audience segments for "${context.brand.name}" in the ${context.brand.industry || "business"} industry.
${productContext}
## Audience Research (from BrightData):
${searchData}

## Scraped Content (from BrightData):
${scrapedData}

## Social Conversations:
${socialData}

## Reddit Discussions:
${redditData}

## Amazon Customer Reviews:
${amazonData}

## Forum Discussions:
${forumData}

CRITICAL INSTRUCTIONS:
1. ALL insights MUST be derived from the provided web research data above
2. Include specific citations to source URLs where you found each insight
3. Do NOT make up or fabricate any demographic data - only use what's supported by the research
4. If data is limited, reduce the number of segments rather than inventing data

Based on the REAL user-generated content and research above, identify 3-5 distinct audience segments. For each segment, provide:
- name: Segment name (e.g., "Young Professionals", "Budget-Conscious Families")
- description: Detailed description WITH citations to source URLs
- size: "large", "medium", "small", or "niche"
- demographics: Object with ageRange, gender, income, location (array), education - ONLY include what's supported by the data
- psychographics: Object with values, interests, painPoints, motivations (all arrays) - cite sources
- behaviors: Object with purchaseDrivers, preferredChannels (arrays), researchBehavior (string)
- confidence: Confidence score 0-1 based on how much data supports this segment
- sourceCitations: Array of URLs that support this segment's existence

Return as a JSON array of audience segment objects.`;

  try {
    const result = await sendMessageForJSON<SynthesizedAudienceSegment[]>(prompt, {
      systemPrompt: "You are an expert audience researcher and market segmentation specialist. Build detailed audience profiles from web data. Be specific with demographics and psychographics.",
    });

    // Ensure we have an array
    const segments = Array.isArray(result) ? result : [];
    if (!Array.isArray(result)) {
      console.warn("Audience segments response was not an array:", typeof result);
    }

    return segments.map((s, i) => ({
      ...s,
      source: createSource(
        rawData.audience.searches[i]?.url || rawData.audience.scraped[0]?.url || "",
        "Audience Research",
        s.confidence || 0.7
      ),
    }));
  } catch (error) {
    console.error("Error synthesizing audience:", error);
    return [];
  }
}

/**
 * Generate persona suggestions from synthesized data
 * Enhanced for product-level targeting to find the PERFECT audience
 */
export async function suggestPersonas(
  audienceSegments: SynthesizedAudienceSegment[],
  competitors: SynthesizedCompetitor[],
  context: { brand: Brand; product?: Product | null }
): Promise<PersonaSuggestion[]> {
  // Product-specific context for better persona creation
  const productDetails = context.product ? `
## PRODUCT-SPECIFIC TARGETING:
Product Name: ${context.product.name}
Product Type: ${context.product.product_type || "General"}
Description: ${context.product.short_description || "Not specified"}
Price: ${context.product.price ? `$${context.product.price}` : "Not specified"}

CRITICAL: These personas should represent the IDEAL buyers for this specific product.
Focus on:
1. Who would get the MOST value from this product?
2. Who has the budget and willingness to purchase?
3. What specific pain points does this product solve for them?
4. What channels would reach these buyers most effectively?
` : "";

  const prompt = `Based on the following REAL research-backed audience segments and competitive landscape, suggest 3-5 marketing personas for "${context.brand.name}" in the ${context.brand.industry || "business"} industry.
${productDetails}
## Research-Backed Audience Segments:
${JSON.stringify(audienceSegments, null, 2)}

## Competitive Landscape:
${competitors.map((c) => `- ${c.name}: ${c.positioning} (targets: ${c.targetAudience})`).join("\n")}

IMPORTANT: These personas MUST be grounded in the audience research data above. Do not invent characteristics not supported by the research.

Create 3-5 distinct personas that represent the BEST target customers. For each persona:
- name: Full name (realistic, diverse)
- archetype: Persona archetype (e.g., "Tech-Savvy Millennial", "Budget-Conscious Parent")
- headline: One-line persona summary that captures their key characteristic
- demographics: Object with age (number), gender, location, income, occupation - BASED ON RESEARCH
- psychographics: Object with values, motivations, painPoints, aspirations (all arrays) - cite which audience segment supports each
- behaviors: Object with purchaseDrivers, preferredChannels (arrays), decisionStyle (string)
- relevanceScore: 0-1 score for how well this persona matches the product/brand
- reasoning: Why this persona would be an ideal customer, with specific references to the research data
- dataSupport: Which audience segments and research points support this persona

Return as a JSON array of persona objects.`;

  try {
    const result = await sendMessageForJSON<PersonaSuggestion[]>(prompt, {
      systemPrompt: "You are an expert persona developer for marketing teams. Create realistic, actionable personas based on market data. Ensure diversity in demographics and psychographics.",
    });

    // Ensure we have an array
    if (!Array.isArray(result)) {
      console.warn("Persona suggestions response was not an array:", typeof result);
      return [];
    }
    return result;
  } catch (error) {
    console.error("Error suggesting personas:", error);
    return [];
  }
}

/**
 * Generate platform-specific insights
 */
export async function analyzePlatforms(
  rawData: RawIntelligenceData,
  context: { brand: Brand }
): Promise<PlatformInsight[]> {
  const socialData = rawData.social.searches
    .slice(0, 6)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n");

  const scrapedSocial = rawData.social.scraped
    .slice(0, 2)
    .map((s) => `### ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n");

  // Reddit-specific data
  const redditSearches = rawData.reddit?.searches
    .slice(0, 6)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n") || "";

  const redditScraped = rawData.reddit?.scraped
    .slice(0, 2)
    .map((s) => `### ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  // Amazon reviews data
  const amazonSearches = rawData.amazon?.searches
    .slice(0, 6)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n") || "";

  const amazonScraped = rawData.amazon?.scraped
    .slice(0, 2)
    .map((s) => `### ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  // YouTube content data
  const youtubeSearches = rawData.youtube?.searches
    .slice(0, 6)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n") || "";

  const youtubeScraped = rawData.youtube?.scraped
    .slice(0, 2)
    .map((s) => `### ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  // Google Reviews data
  const googleReviewsSearches = rawData.googleReviews?.searches
    .slice(0, 6)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n") || "";

  // Forums and review sites data
  const forumsSearches = rawData.forums?.searches
    .slice(0, 6)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n") || "";

  const forumsScraped = rawData.forums?.scraped
    .slice(0, 2)
    .map((s) => `### ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  const prompt = `Analyze discussions and user-generated content about "${context.brand.name}" or the ${context.brand.industry} industry across multiple platforms.

## General Social Search Results:
${socialData}

## General Social Content:
${scrapedSocial}

## Reddit Search Results:
${redditSearches}

## Reddit Discussions:
${redditScraped}

## Amazon Reviews Search:
${amazonSearches}

## Amazon Customer Reviews:
${amazonScraped}

## YouTube Search Results:
${youtubeSearches}

## YouTube Video Content:
${youtubeScraped}

## Google Reviews:
${googleReviewsSearches}

## Forums & Review Sites Search:
${forumsSearches}

## Forum Discussions:
${forumsScraped}

Provide platform-specific insights for each platform where you found relevant data (Reddit, Amazon, YouTube, Google Reviews, Trustpilot, Quora, Twitter/X, Facebook, LinkedIn, etc.). For each platform:
- platform: Platform name
- sentiment: "positive", "neutral", "negative", or "mixed"
- keyTopics: Array of key discussion topics
- engagement: Description of engagement level
- recommendations: Array of recommendations for this platform

Return as a JSON array of platform insight objects.`;

  try {
    const result = await sendMessageForJSON<PlatformInsight[]>(prompt, {
      systemPrompt: "You are a social media and UGC analyst. Extract platform-specific insights from user-generated content across Reddit, Amazon reviews, YouTube, forums, and other platforms. Be specific about sentiment, common themes, and actionable recommendations.",
    });

    // Ensure we have an array
    if (!Array.isArray(result)) {
      console.warn("Platform insights response was not an array:", typeof result);
      return [];
    }
    return result;
  } catch (error) {
    console.error("Error analyzing platforms:", error);
    return [];
  }
}

/**
 * Generate content recommendations
 */
export async function recommendContent(
  trends: SynthesizedTrend[],
  audiences: SynthesizedAudienceSegment[],
  platforms: PlatformInsight[],
  context: { brand: Brand; product?: Product | null }
): Promise<ContentRecommendation[]> {
  const prompt = `Based on the following market intelligence, recommend content strategies for "${context.brand.name}".

## Market Trends:
${trends.map((t) => `- ${t.name}: ${t.description} (${t.direction})`).join("\n")}

## Target Audiences:
${audiences.map((a) => `- ${a.name}: ${a.description}`).join("\n")}

## Platform Insights:
${platforms.map((p) => `- ${p.platform}: ${p.sentiment} sentiment, topics: ${p.keyTopics.join(", ")}`).join("\n")}

${context.product ? `## Product: ${context.product.name} - ${context.product.short_description}` : ""}

Recommend 5-7 content pieces. For each:
- type: "image", "video", "carousel", "story", or "text"
- platform: Target platform
- headline: Content headline/concept
- description: Detailed description
- reasoning: Why this content would work
- priority: "high", "medium", or "low"

Return as a JSON array of content recommendation objects.`;

  try {
    const result = await sendMessageForJSON<ContentRecommendation[]>(prompt, {
      systemPrompt: "You are a content strategist for digital advertising. Recommend specific, actionable content based on market data. Focus on content that addresses audience needs and aligns with trends.",
    });

    // Ensure we have an array
    if (!Array.isArray(result)) {
      console.warn("Content recommendations response was not an array:", typeof result);
      return [];
    }
    return result;
  } catch (error) {
    console.error("Error recommending content:", error);
    return [];
  }
}

/**
 * Generate executive summary
 */
export async function generateExecutiveSummary(
  competitors: SynthesizedCompetitor[],
  trends: SynthesizedTrend[],
  audiences: SynthesizedAudienceSegment[],
  platformInsights: PlatformInsight[],
  contentRecommendations: ContentRecommendation[],
  personaSuggestions: PersonaSuggestion[],
  context: { brand: Brand; product?: Product | null }
): Promise<ExecutiveSummary> {
  const prompt = `Generate a comprehensive executive summary of ALL gathered market intelligence for "${context.brand.name}" in the ${context.brand.industry || "business"} industry.

## Competitors (${competitors.length}):
${competitors.map((c) => `- ${c.name}: ${c.positioning} | Pricing: ${c.pricingTier} | Strengths: ${c.strengths.join(", ")} | Weaknesses: ${c.weaknesses.join(", ")} | USPs: ${c.uniqueSellingPoints.join(", ")}`).join("\n")}

## Market Trends (${trends.length}):
${trends.map((t) => `- ${t.name}: ${t.direction} (${t.impactLevel} impact) | Opportunities: ${t.opportunities.join(", ")} | Threats: ${t.threats.join(", ")}`).join("\n")}

## Audience Segments (${audiences.length}):
${audiences.map((a) => `- ${a.name} (${a.size} segment): ${a.description} | Demographics: ${a.demographics.ageRange}, ${a.demographics.gender}, ${a.demographics.income} | Pain Points: ${a.psychographics.painPoints.join(", ")}`).join("\n")}

## Platform Insights (${platformInsights.length}):
${platformInsights.map((p) => `- ${p.platform}: Sentiment: ${p.sentiment} | Key Topics: ${p.keyTopics.join(", ")} | Recommendations: ${p.recommendations.join(", ")}`).join("\n")}

## Content Recommendations (${contentRecommendations.length}):
${contentRecommendations.map((c) => `- [${c.priority} priority] ${c.type} on ${c.platform}: "${c.headline}" — ${c.reasoning}`).join("\n")}

## Persona Suggestions (${personaSuggestions.length}):
${personaSuggestions.map((p) => `- ${p.name} (${p.archetype}): "${p.headline}" | Relevance: ${p.relevanceScore}/10 | ${p.reasoning}`).join("\n")}

${context.product ? `## Product Context: ${context.product.name}` : ""}

Synthesize ALL of the above data into a comprehensive executive summary with:
- overview: 3-5 sentence market overview that synthesizes insights from competitors, trends, audience segments, platform activity, and persona analysis
- keyFindings: Array of 5-7 key findings drawn from across ALL categories (competitive landscape, market trends, audience insights, platform sentiment, content gaps, and persona opportunities)
- opportunities: Array of 4-6 opportunities informed by trends, platform insights, content recommendations, and underserved audience segments
- threats: Array of 3-5 threats/challenges from competitive pressure, platform sentiment, market trend shifts, and audience pain points
- recommendations: Array of 5-8 actionable recommendations that reference specific personas, platforms, and content strategies where relevant

Return as a JSON object.`;

  try {
    const result = await sendMessageForJSON<ExecutiveSummary>(prompt, {
      systemPrompt: "You are a senior market intelligence consultant. Provide concise, actionable executive summaries that help leadership make decisions.",
    });

    // Ensure the result has all required properties with proper types
    // Handle cases where the response might be wrapped or have different structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawResult = result as any;

    // Check if result is wrapped in a key like "summary" or "executiveSummary"
    const unwrapped = rawResult?.summary || rawResult?.executiveSummary || rawResult?.data || rawResult;

    return {
      overview: typeof unwrapped?.overview === "string"
        ? unwrapped.overview
        : `Market intelligence analysis for ${context.brand.name} in the ${context.brand.industry || "business"} industry.`,
      keyFindings: Array.isArray(unwrapped?.keyFindings) ? unwrapped.keyFindings : [],
      opportunities: Array.isArray(unwrapped?.opportunities) ? unwrapped.opportunities : [],
      threats: Array.isArray(unwrapped?.threats) ? unwrapped.threats : [],
      recommendations: Array.isArray(unwrapped?.recommendations) ? unwrapped.recommendations : [],
    };
  } catch (error) {
    console.error("Error generating executive summary:", error);
    return {
      overview: `Market intelligence analysis for ${context.brand.name}. Unable to generate detailed summary due to data processing.`,
      keyFindings: ["Data collection completed", "Analysis in progress"],
      opportunities: ["Review collected data for insights"],
      threats: ["Market conditions require monitoring"],
      recommendations: ["Review the detailed sections below for specific insights"],
    };
  }
}

/**
 * Synthesize complete report from raw data
 */
export async function synthesizeFullReport(
  rawData: RawIntelligenceData,
  context: { brand: Brand; product?: Product | null },
  onProgress?: SynthesisProgressCallback
): Promise<SynthesizedReport> {
  // Run AI calls sequentially to avoid OpenRouter rate limiting
  // and provide steady progress updates during synthesis

  onProgress?.("synthesizing", "Analyzing competitors...", 0);
  const competitors = await synthesizeCompetitors(rawData, context);

  onProgress?.("synthesizing", "Analyzing market trends...", 14);
  const trends = await synthesizeTrends(rawData, context);

  onProgress?.("synthesizing", "Analyzing target audience...", 28);
  const audienceSegments = await synthesizeAudience(rawData, context);

  onProgress?.("synthesizing", "Analyzing platform insights...", 42);
  const platformInsights = await analyzePlatforms(rawData, context);

  onProgress?.("synthesizing", "Generating persona suggestions...", 56);
  const personaSuggestions = await suggestPersonas(audienceSegments, competitors, context);

  onProgress?.("synthesizing", "Generating content recommendations...", 70);
  const contentRecommendations = await recommendContent(trends, audienceSegments, platformInsights, context);

  onProgress?.("synthesizing", "Generating executive summary...", 85);
  const executiveSummary = await generateExecutiveSummary(
    competitors,
    trends,
    audienceSegments,
    platformInsights,
    contentRecommendations,
    personaSuggestions,
    context
  );

  onProgress?.("complete", "Synthesis complete", 100);

  return {
    executiveSummary,
    competitors,
    trends,
    audienceSegments,
    personaSuggestions,
    platformInsights,
    contentRecommendations,
  };
}
