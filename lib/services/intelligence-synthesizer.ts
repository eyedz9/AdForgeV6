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
import { synthesizeMediaAffinity, type MediaAffinityReport } from "./media-affinity-engine";

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
    confidenceScores?: {
      age: number;
      gender: number;
      income: number;
      location: number;
      education: number;
    };
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
  lifeStageSignals?: {
    lifeStage: string;
    confidence: number;
    indicators: string[];
  }[];
  culturalAffinityMarkers?: {
    marker: string;
    strength: "strong" | "moderate" | "weak";
    evidence: string[];
  }[];
  confidence: number;
  source: AttributedSource;
  sourceCitations?: string[];
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
 * Sentiment analysis with per-platform breakdown and topic drivers
 */
export interface SentimentAnalysis {
  overall: {
    score: number;
    label: string;
    intensity: "strong" | "moderate" | "mild";
  };
  byPlatform: {
    platform: string;
    score: number; // -1 to 1
    label: "very_positive" | "positive" | "neutral" | "negative" | "very_negative";
    intensity: "strong" | "moderate" | "mild";
    sampleSize: number;
    topPositiveTopics: string[];
    topNegativeTopics: string[];
    trendDirection: "improving" | "stable" | "declining";
  }[];
  topicSentiment: {
    topic: string;
    sentiment: number; // -1 to 1
    mentions: number;
    platforms: string[];
  }[];
  aspectSentiment?: {
    aspect: string;
    sentiment: number; // -1 to 1
    mentions: number;
    topPhrases: string[];
    platforms: string[];
  }[];
  emotions?: {
    emotion: string;
    intensity: number; // 0 to 1
    mentions: number;
    triggers: string[];
    platforms: string[];
  }[];
}

/**
 * Topic clustering with recurring UGC themes across platforms
 */
export interface TopicCluster {
  clusters: {
    name: string;
    description: string;
    themes: string[];
    platformDistribution: Record<string, number>;
    sentimentAverage: number;
    representativeQuotes: string[];
    relevanceScore: number; // 0-1
  }[];
  emergingTopics: string[];
  decliningTopics: string[];
  painPoints?: {
    painPoint: string;
    severity: "critical" | "moderate" | "minor";
    frequency: number;
    affectedSegments: string[];
    suggestedSolution: string;
    platforms: string[];
  }[];
  benefits?: {
    benefit: string;
    category: "functional" | "emotional" | "social" | "financial";
    frequency: number;
    sentiment: number;
    platforms: string[];
  }[];
  featureFeedback?: {
    feature: string;
    overallSentiment: number;
    positiveCount: number;
    negativeCount: number;
    topPraise: string[];
    topComplaints: string[];
    improvementSuggestions: string[];
  }[];
}

/**
 * Purchase intent signals with funnel stage indicators and comparison behavior
 */
export interface PurchaseIntentAnalysis {
  signals: {
    signal: string;
    description: string;
    stage: "awareness" | "consideration" | "decision" | "post_purchase";
    strength: "strong" | "moderate" | "weak";
    platforms: string[];
    examples: string[];
  }[];
  comparisonBehavior: {
    topComparedProducts: string[];
    comparisonFactors: string[];
    decisionTimeline: string;
  };
  barriers: {
    barrier: string;
    frequency: "common" | "occasional" | "rare";
    suggestedResponse: string;
  }[];
  conversionDrivers: string[];
  brandLoyaltySignals?: {
    signal: string;
    type: "repeat_purchase" | "brand_advocacy" | "community_engagement" | "emotional_attachment";
    strength: "strong" | "moderate" | "weak";
    platforms: string[];
    examples: string[];
  }[];
  switchingIntentSignals?: {
    signal: string;
    fromBrand?: string;
    toBrand?: string;
    reason: string;
    frequency: "common" | "occasional" | "rare";
    platforms: string[];
  }[];
  feedbackClassification?: {
    complaints: {
      topic: string;
      severity: "high" | "medium" | "low";
      frequency: number;
      platforms: string[];
      representativeQuote: string;
    }[];
    recommendations: {
      topic: string;
      enthusiasm: "high" | "medium" | "low";
      frequency: number;
      platforms: string[];
      representativeQuote: string;
    }[];
    overallRatio: {
      complaintsPercent: number;
      recommendationsPercent: number;
      neutralPercent: number;
    };
  };
}

/**
 * Competitive positioning with price, feature, and review comparison
 */
export interface CompetitivePositioning {
  priceComparison: {
    competitor: string;
    price: string;
    pricePosition: "cheaper" | "similar" | "premium";
    valuePerception: string;
  }[];
  featureComparison: {
    feature: string;
    ourProduct: string;
    competitors: Record<string, string>;
  }[];
  reviewComparison: {
    competitor: string;
    avgRating: number | null;
    reviewVolume: string;
    topPraise: string[];
    topComplaints: string[];
  }[];
  marketPosition: {
    quadrant: string;
    differentiators: string[];
    vulnerabilities: string[];
  };
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
  sentimentAnalysis: SentimentAnalysis;
  topicClusters: TopicCluster;
  purchaseIntentAnalysis: PurchaseIntentAnalysis;
  competitivePositioning: CompetitivePositioning;
  mediaAffinity: MediaAffinityReport;
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

  // Include Walmart data for competitor pricing and product comparisons
  const walmartMentions = rawData.walmart?.scraped
    .slice(0, 2)
    .map((s) => `### Walmart: ${s.url}\n${truncateContent(s.content, 400)}`)
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

## Walmart Listings (competitor products & pricing):
${walmartMentions}

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

  // New platform data for richer audience insights
  const tiktokData = rawData.tiktok?.scraped
    .slice(0, 2)
    .map((s) => `### TikTok Source: ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  const instagramData = rawData.instagram?.scraped
    .slice(0, 2)
    .map((s) => `### Instagram Source: ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  const twitterData = rawData.twitter?.scraped
    .slice(0, 2)
    .map((s) => `### Twitter/X Source: ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  const walmartData = rawData.walmart?.scraped
    .slice(0, 2)
    .map((s) => `### Walmart Source: ${s.url}\n${truncateContent(s.content, 400)}`)
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

## TikTok Content:
${tiktokData}

## Instagram Content:
${instagramData}

## Twitter/X Conversations:
${twitterData}

## Walmart Customer Data:
${walmartData}

CRITICAL INSTRUCTIONS:
1. ALL insights MUST be derived from the provided web research data above
2. Include specific citations to source URLs where you found each insight
3. Do NOT make up or fabricate any demographic data - only use what's supported by the research
4. If data is limited, reduce the number of segments rather than inventing data

Based on the REAL user-generated content and research above, identify 3-5 distinct audience segments. For each segment, provide:
- name: Segment name (e.g., "Young Professionals", "Budget-Conscious Families")
- description: Detailed description WITH citations to source URLs
- size: "large", "medium", "small", or "niche"
- demographics: Object with ageRange, gender, income, location (array), education - ONLY include what's supported by the data. Also include a "confidenceScores" object with confidence (0-1) for each demographic field: { age, gender, income, location, education }
- psychographics: Object with values, interests, painPoints, motivations (all arrays) - cite sources
- behaviors: Object with purchaseDrivers, preferredChannels (arrays), researchBehavior (string)
- lifeStageSignals: Array of life stage indicators, each with:
  - lifeStage: e.g., "parent", "student", "young_professional", "mid_career", "retiree"
  - confidence: 0-1
  - indicators: Array of data points that suggest this life stage
- culturalAffinityMarkers: Array of cultural/lifestyle markers, each with:
  - marker: e.g., "health-conscious", "eco-friendly", "tech-early-adopter", "budget-optimizer"
  - strength: "strong", "moderate", or "weak"
  - evidence: Array of supporting evidence from the data
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

  // Walmart data
  const walmartSearches = rawData.walmart?.searches
    .slice(0, 6)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n") || "";

  const walmartScraped = rawData.walmart?.scraped
    .slice(0, 2)
    .map((s) => `### ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  // TikTok data
  const tiktokSearches = rawData.tiktok?.searches
    .slice(0, 6)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n") || "";

  const tiktokScraped = rawData.tiktok?.scraped
    .slice(0, 2)
    .map((s) => `### ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  // Instagram data
  const instagramSearches = rawData.instagram?.searches
    .slice(0, 6)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n") || "";

  const instagramScraped = rawData.instagram?.scraped
    .slice(0, 2)
    .map((s) => `### ${s.url}\n${truncateContent(s.content, 400)}`)
    .join("\n\n") || "";

  // Twitter/X data
  const twitterSearches = rawData.twitter?.searches
    .slice(0, 6)
    .map((s) => `- ${s.title}: ${s.description || ""}`)
    .join("\n") || "";

  const twitterScraped = rawData.twitter?.scraped
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

## Walmart Search Results:
${walmartSearches}

## Walmart Product Listings & Reviews:
${walmartScraped}

## TikTok Search Results:
${tiktokSearches}

## TikTok Content:
${tiktokScraped}

## Instagram Search Results:
${instagramSearches}

## Instagram Content:
${instagramScraped}

## Twitter/X Search Results:
${twitterSearches}

## Twitter/X Conversations:
${twitterScraped}

Provide platform-specific insights for each platform where you found relevant data (Reddit, Amazon, YouTube, Google Reviews, Forums, Walmart, TikTok, Instagram, Twitter/X, etc.). For each platform:
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
 * Synthesize deep sentiment analysis from all platform data
 */
export async function synthesizeSentiment(
  rawData: RawIntelligenceData,
  context: { brand: Brand; product?: Product | null }
): Promise<SentimentAnalysis> {
  // Collect scraped content from ALL platforms, truncated to 600 chars, limited to 2 items each
  const platformSections = [
    { key: "reddit", data: rawData.reddit },
    { key: "amazon", data: rawData.amazon },
    { key: "youtube", data: rawData.youtube },
    { key: "forums", data: rawData.forums },
    { key: "walmart", data: rawData.walmart },
    { key: "tiktok", data: rawData.tiktok },
    { key: "instagram", data: rawData.instagram },
    { key: "twitter", data: rawData.twitter },
  ]
    .map(({ key, data }) => {
      const scraped = data?.scraped
        .slice(0, 2)
        .map((s) => `### ${s.url}\n${truncateContent(s.content, 600)}`)
        .join("\n\n") || "";
      return scraped ? `## ${key.charAt(0).toUpperCase() + key.slice(1)} Content:\n${scraped}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  const productContext = context.product
    ? `Product: ${context.product.name} - ${context.product.short_description || "N/A"}`
    : "";

  const prompt = `Analyze the sentiment across all platforms for "${context.brand.name}" in the ${context.brand.industry || "business"} industry.
${productContext}

${platformSections}

Provide a deep sentiment analysis with:

1. **overall**: Overall sentiment across all platforms
   - score: number (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
   - label: text description of overall sentiment
   - intensity: "strong", "moderate", or "mild"

2. **byPlatform**: Per-platform sentiment breakdown (only platforms with data)
   - platform: platform name
   - score: -1 to 1
   - label: "very_positive", "positive", "neutral", "negative", or "very_negative"
   - intensity: "strong", "moderate", or "mild"
   - sampleSize: estimated number of data points analyzed
   - topPositiveTopics: array of top positive discussion topics
   - topNegativeTopics: array of top negative discussion topics
   - trendDirection: "improving", "stable", or "declining"

3. **topicSentiment**: Topic-level sentiment analysis
   - topic: topic name
   - sentiment: -1 to 1
   - mentions: estimated mention count
   - platforms: which platforms discuss this topic

4. **aspectSentiment**: Aspect-based sentiment (sentiment toward specific product/brand attributes)
   - aspect: attribute name (e.g., "price", "quality", "taste", "convenience", "packaging", "customer_service")
   - sentiment: -1 to 1
   - mentions: estimated mention count for this aspect
   - topPhrases: array of 2-3 representative phrases/expressions about this aspect
   - platforms: which platforms mention this aspect

5. **emotions**: Emotion detection across all content
   - emotion: emotion name (e.g., "joy", "frustration", "surprise", "trust", "anticipation", "anger", "fear", "sadness")
   - intensity: 0 to 1 (how strongly the emotion is expressed)
   - mentions: estimated mention count
   - triggers: array of 2-3 things that trigger this emotion
   - platforms: which platforms show this emotion

Return as a JSON object with all five keys.`;

  try {
    const result = await sendMessageForJSON<SentimentAnalysis>(prompt, {
      systemPrompt: "You are an expert sentiment analyst specializing in consumer and product sentiment across digital platforms. Analyze user-generated content to extract nuanced sentiment patterns, topic drivers, and trend directions. Be data-driven and precise.",
    });

    return {
      overall: result?.overall || { score: 0, label: "neutral", intensity: "mild" },
      byPlatform: Array.isArray(result?.byPlatform) ? result.byPlatform : [],
      topicSentiment: Array.isArray(result?.topicSentiment) ? result.topicSentiment : [],
      aspectSentiment: Array.isArray(result?.aspectSentiment) ? result.aspectSentiment : [],
      emotions: Array.isArray(result?.emotions) ? result.emotions : [],
    };
  } catch (error) {
    console.error("Error synthesizing sentiment:", error);
    return {
      overall: { score: 0, label: "neutral", intensity: "mild" },
      byPlatform: [],
      topicSentiment: [],
      aspectSentiment: [],
      emotions: [],
    };
  }
}

/**
 * Synthesize topic clusters from UGC across all platforms
 */
export async function synthesizeTopicClusters(
  rawData: RawIntelligenceData,
  context: { brand: Brand; product?: Product | null }
): Promise<TopicCluster> {
  // Collect scraped content from ALL platforms, truncated to 600 chars, limited to 2 items each
  const platformSections = [
    { key: "reddit", data: rawData.reddit },
    { key: "amazon", data: rawData.amazon },
    { key: "youtube", data: rawData.youtube },
    { key: "forums", data: rawData.forums },
    { key: "walmart", data: rawData.walmart },
    { key: "tiktok", data: rawData.tiktok },
    { key: "instagram", data: rawData.instagram },
    { key: "twitter", data: rawData.twitter },
  ]
    .map(({ key, data }) => {
      const scraped = data?.scraped
        .slice(0, 2)
        .map((s) => `### ${s.url}\n${truncateContent(s.content, 600)}`)
        .join("\n\n") || "";
      return scraped ? `## ${key.charAt(0).toUpperCase() + key.slice(1)} Content:\n${scraped}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  const productContext = context.product
    ? `Product: ${context.product.name} - ${context.product.short_description || "N/A"}`
    : "";

  const prompt = `Analyze user-generated content across all platforms for "${context.brand.name}" in the ${context.brand.industry || "business"} industry to identify recurring discussion themes and topic clusters.
${productContext}

${platformSections}

Identify recurring themes and cluster them. Return a JSON object with:

1. **clusters**: Array of topic clusters, each with:
   - name: Cluster name (e.g., "Product Quality Concerns", "Value for Money")
   - description: What this cluster is about
   - themes: Array of specific themes within this cluster
   - platformDistribution: Object mapping platform name to mention count (e.g., {"reddit": 5, "amazon": 3})
   - sentimentAverage: Average sentiment for this cluster (-1 to 1)
   - representativeQuotes: Array of 1-3 representative quotes or paraphrased user statements from the data
   - relevanceScore: 0-1 score indicating how relevant this cluster is to the brand/product

2. **emergingTopics**: Array of topic names that appear to be newly trending or gaining traction

3. **decliningTopics**: Array of topic names that appear to be losing interest or relevance

4. **painPoints**: Array of customer pain points identified from UGC, each with:
   - painPoint: Description of the pain point
   - severity: "critical", "moderate", or "minor"
   - frequency: Estimated mention count
   - affectedSegments: Array of customer segments affected (e.g., "budget shoppers", "power users")
   - suggestedSolution: How the brand could address this pain point
   - platforms: Which platforms mention this pain point

5. **benefits**: Array of perceived product/brand benefits, each with:
   - benefit: Description of the benefit
   - category: "functional", "emotional", "social", or "financial"
   - frequency: Estimated mention count
   - sentiment: Average sentiment score (-1 to 1) when this benefit is discussed
   - platforms: Which platforms mention this benefit

6. **featureFeedback**: Array of feature-level feedback, each with:
   - feature: Feature name
   - overallSentiment: -1 to 1
   - positiveCount: Estimated positive mention count
   - negativeCount: Estimated negative mention count
   - topPraise: Array of 2-3 things users praise about this feature
   - topComplaints: Array of 2-3 things users complain about
   - improvementSuggestions: Array of 2-3 improvement suggestions from users

Return 5-10 clusters sorted by relevance score descending, plus 3-6 pain points, 3-6 benefits, and 3-6 feature feedback items.`;

  try {
    const result = await sendMessageForJSON<TopicCluster>(prompt, {
      systemPrompt: "You are an expert UGC analyst specializing in topic modeling and thematic analysis across digital platforms. Identify recurring discussion themes, cluster related topics, and detect emerging/declining trends from user-generated content. Be data-driven and precise.",
    });

    return {
      clusters: Array.isArray(result?.clusters) ? result.clusters : [],
      emergingTopics: Array.isArray(result?.emergingTopics) ? result.emergingTopics : [],
      decliningTopics: Array.isArray(result?.decliningTopics) ? result.decliningTopics : [],
      painPoints: Array.isArray(result?.painPoints) ? result.painPoints : [],
      benefits: Array.isArray(result?.benefits) ? result.benefits : [],
      featureFeedback: Array.isArray(result?.featureFeedback) ? result.featureFeedback : [],
    };
  } catch (error) {
    console.error("Error synthesizing topic clusters:", error);
    return {
      clusters: [],
      emergingTopics: [],
      decliningTopics: [],
      painPoints: [],
      benefits: [],
      featureFeedback: [],
    };
  }
}

/**
 * Synthesize purchase intent signals from UGC data
 */
export async function synthesizePurchaseIntent(
  rawData: RawIntelligenceData,
  context: { brand: Brand; product?: Product | null }
): Promise<PurchaseIntentAnalysis> {
  // Focus on platforms where purchase intent signals are strongest
  const platformSections = [
    { key: "reddit", data: rawData.reddit },
    { key: "amazon", data: rawData.amazon },
    { key: "forums", data: rawData.forums },
    { key: "walmart", data: rawData.walmart },
    { key: "twitter", data: rawData.twitter },
  ]
    .map(({ key, data }) => {
      const scraped = data?.scraped
        .slice(0, 2)
        .map((s) => `### ${s.url}\n${truncateContent(s.content, 600)}`)
        .join("\n\n") || "";
      return scraped ? `## ${key.charAt(0).toUpperCase() + key.slice(1)} Content:\n${scraped}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  const productContext = context.product
    ? `Product: ${context.product.name} - ${context.product.short_description || "N/A"} (Price: ${context.product.price ? `$${context.product.price}` : "N/A"})`
    : "";

  const prompt = `Analyze user-generated content to identify purchase intent signals for "${context.brand.name}" in the ${context.brand.industry || "business"} industry.
${productContext}

${platformSections}

Analyze the content above for buying signals, consideration-stage indicators, and comparison shopping behavior. Return a JSON object with:

1. **signals**: Array of purchase intent signals, each with:
   - signal: Signal name (e.g., "Price comparison requests", "Feature inquiries")
   - description: What this signal indicates about buyer intent
   - stage: "awareness", "consideration", "decision", or "post_purchase"
   - strength: "strong", "moderate", or "weak"
   - platforms: Which platforms show this signal
   - examples: 1-3 example phrases or paraphrased user statements from the data

2. **comparisonBehavior**: Object with:
   - topComparedProducts: Array of products/brands being compared against
   - comparisonFactors: Array of factors users compare on (e.g., "price", "durability", "features")
   - decisionTimeline: Text describing typical decision-making timeline (e.g., "1-2 weeks of research")

3. **barriers**: Array of purchase barriers, each with:
   - barrier: Barrier name (e.g., "High price perception", "Quality uncertainty")
   - frequency: "common", "occasional", or "rare"
   - suggestedResponse: How to address this barrier in marketing

4. **conversionDrivers**: Array of strings describing what drives conversions (e.g., "Free trial availability", "Social proof from reviews")

5. **brandLoyaltySignals**: Array of brand loyalty indicators, each with:
   - signal: Description of the loyalty signal
   - type: "repeat_purchase", "brand_advocacy", "community_engagement", or "emotional_attachment"
   - strength: "strong", "moderate", or "weak"
   - platforms: Which platforms show this signal
   - examples: 1-2 example phrases from users

6. **switchingIntentSignals**: Array of brand switching indicators, each with:
   - signal: Description of the switching signal
   - fromBrand: Brand being switched from (if identifiable)
   - toBrand: Brand being switched to (if identifiable)
   - reason: Why users are considering switching
   - frequency: "common", "occasional", or "rare"
   - platforms: Which platforms show this signal

7. **feedbackClassification**: Object classifying user feedback into complaints vs recommendations:
   - complaints: Array of complaint topics, each with: topic, severity ("high"/"medium"/"low"), frequency (number), platforms, representativeQuote
   - recommendations: Array of recommendation topics, each with: topic, enthusiasm ("high"/"medium"/"low"), frequency (number), platforms, representativeQuote
   - overallRatio: Object with complaintsPercent, recommendationsPercent, neutralPercent (should sum to 100)

Return 5-10 signals, 3-5 barriers, 3-5 conversion drivers, 3-5 loyalty signals, 2-4 switching signals, and 3-5 items each for complaints and recommendations.`;

  try {
    const result = await sendMessageForJSON<PurchaseIntentAnalysis>(prompt, {
      systemPrompt: "You are an expert consumer behavior analyst specializing in purchase intent modeling and conversion funnel analysis. Analyze user-generated content to identify buying signals, comparison behavior, barriers to purchase, and conversion drivers. Be data-driven and precise.",
    });

    return {
      signals: Array.isArray(result?.signals) ? result.signals : [],
      comparisonBehavior: {
        topComparedProducts: Array.isArray(result?.comparisonBehavior?.topComparedProducts) ? result.comparisonBehavior.topComparedProducts : [],
        comparisonFactors: Array.isArray(result?.comparisonBehavior?.comparisonFactors) ? result.comparisonBehavior.comparisonFactors : [],
        decisionTimeline: typeof result?.comparisonBehavior?.decisionTimeline === "string" ? result.comparisonBehavior.decisionTimeline : "",
      },
      barriers: Array.isArray(result?.barriers) ? result.barriers : [],
      conversionDrivers: Array.isArray(result?.conversionDrivers) ? result.conversionDrivers : [],
      brandLoyaltySignals: Array.isArray(result?.brandLoyaltySignals) ? result.brandLoyaltySignals : [],
      switchingIntentSignals: Array.isArray(result?.switchingIntentSignals) ? result.switchingIntentSignals : [],
      feedbackClassification: result?.feedbackClassification && typeof result.feedbackClassification === "object" ? {
        complaints: Array.isArray(result.feedbackClassification.complaints) ? result.feedbackClassification.complaints : [],
        recommendations: Array.isArray(result.feedbackClassification.recommendations) ? result.feedbackClassification.recommendations : [],
        overallRatio: result.feedbackClassification.overallRatio || { complaintsPercent: 0, recommendationsPercent: 0, neutralPercent: 100 },
      } : undefined,
    };
  } catch (error) {
    console.error("Error synthesizing purchase intent:", error);
    return {
      signals: [],
      comparisonBehavior: {
        topComparedProducts: [],
        comparisonFactors: [],
        decisionTimeline: "",
      },
      barriers: [],
      conversionDrivers: [],
      brandLoyaltySignals: [],
      switchingIntentSignals: [],
    };
  }
}

/**
 * Synthesize competitive positioning from competitor, Amazon, Walmart, and forum data
 */
export async function synthesizeCompetitivePositioning(
  rawData: RawIntelligenceData,
  context: { brand: Brand; product?: Product | null }
): Promise<CompetitivePositioning> {
  const emptyDefaults: CompetitivePositioning = {
    priceComparison: [],
    featureComparison: [],
    reviewComparison: [],
    marketPosition: { quadrant: "", differentiators: [], vulnerabilities: [] },
  };

  // Return empty defaults when no product context
  if (!context.product) {
    return emptyDefaults;
  }

  // Focus on platforms with competitive/review data
  const platformSections = [
    { key: "competitors", data: rawData.competitors },
    { key: "amazon", data: rawData.amazon },
    { key: "walmart", data: rawData.walmart },
    { key: "forums", data: rawData.forums },
  ]
    .map(({ key, data }) => {
      const scraped = data?.scraped
        .slice(0, 2)
        .map((s) => `### ${s.url}\n${truncateContent(s.content, 600)}`)
        .join("\n\n") || "";
      return scraped ? `## ${key.charAt(0).toUpperCase() + key.slice(1)} Content:\n${scraped}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  const prompt = `Analyze competitive positioning for "${context.brand.name}" product "${context.product.name}" in the ${context.brand.industry || "business"} industry.
Product: ${context.product.name} - ${context.product.short_description || "N/A"} (Price: ${context.product.price ? `$${context.product.price}` : "N/A"})

${platformSections}

Provide a detailed competitive positioning analysis. Return a JSON object with:

1. **priceComparison**: Array of competitor price comparisons, each with:
   - competitor: Competitor name
   - price: Price as string (e.g., "$29.99", "Free tier + $49/mo")
   - pricePosition: "cheaper", "similar", or "premium" relative to our product
   - valuePerception: How users perceive the value (e.g., "Best value for features offered")

2. **featureComparison**: Array of feature comparisons, each with:
   - feature: Feature name
   - ourProduct: How our product handles this feature (string)
   - competitors: Object mapping competitor name to their capability for this feature

3. **reviewComparison**: Array of competitor review comparisons, each with:
   - competitor: Competitor name
   - avgRating: Average rating as number (1-5) or null if unknown
   - reviewVolume: Description of review volume (e.g., "High - 10,000+ reviews")
   - topPraise: Array of top things customers praise
   - topComplaints: Array of top customer complaints

4. **marketPosition**: Object with:
   - quadrant: Market position description (e.g., "Premium Quality Leader", "Value Innovator")
   - differentiators: Array of key differentiators for our product
   - vulnerabilities: Array of competitive vulnerabilities

Return 3-5 competitors in price and review comparisons, 5-8 features in feature comparison.`;

  try {
    const result = await sendMessageForJSON<CompetitivePositioning>(prompt, {
      systemPrompt: "You are an expert competitive intelligence analyst specializing in product-level competitive positioning, pricing analysis, and feature benchmarking. Analyze real market data to provide actionable competitive insights. Be data-driven and precise.",
    });

    return {
      priceComparison: Array.isArray(result?.priceComparison) ? result.priceComparison : [],
      featureComparison: Array.isArray(result?.featureComparison) ? result.featureComparison : [],
      reviewComparison: Array.isArray(result?.reviewComparison) ? result.reviewComparison : [],
      marketPosition: {
        quadrant: typeof result?.marketPosition?.quadrant === "string" ? result.marketPosition.quadrant : "",
        differentiators: Array.isArray(result?.marketPosition?.differentiators) ? result.marketPosition.differentiators : [],
        vulnerabilities: Array.isArray(result?.marketPosition?.vulnerabilities) ? result.marketPosition.vulnerabilities : [],
      },
    };
  } catch (error) {
    console.error("Error synthesizing competitive positioning:", error);
    return emptyDefaults;
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

## Available Platforms for Targeting:
Reddit, Amazon, YouTube, Google Reviews, Forums, Walmart, TikTok, Instagram, Twitter/X

${context.product ? `## Product: ${context.product.name} - ${context.product.short_description}` : ""}

Recommend 5-7 content pieces targeting platforms from the list above where audience engagement is strongest. For each:
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
  context: { brand: Brand; product?: Product | null },
  sentimentAnalysis?: SentimentAnalysis,
  topicClusters?: TopicCluster,
  purchaseIntentAnalysis?: PurchaseIntentAnalysis,
  competitivePositioning?: CompetitivePositioning,
  mediaAffinity?: MediaAffinityReport
): Promise<ExecutiveSummary> {
  // Build optional sections for new analysis data
  const sentimentSection = sentimentAnalysis?.byPlatform?.length
    ? `\n## Sentiment Analysis:\n- Overall: ${sentimentAnalysis.overall.label} (${sentimentAnalysis.overall.intensity}), score ${sentimentAnalysis.overall.score.toFixed(2)}\n${sentimentAnalysis.byPlatform.slice(0, 5).map((p) => `- ${p.platform}: ${p.label} (${p.trendDirection})`).join("\n")}`
    : "";

  const topicsSection = topicClusters?.clusters?.length
    ? `\n## Top Discussion Topics (${topicClusters.clusters.length}):\n${topicClusters.clusters.slice(0, 4).map((c) => `- ${c.name}: ${c.description} (relevance ${(c.relevanceScore * 100).toFixed(0)}%)`).join("\n")}${topicClusters.emergingTopics?.length ? `\n- Emerging: ${topicClusters.emergingTopics.slice(0, 3).join(", ")}` : ""}`
    : "";

  const intentSection = purchaseIntentAnalysis?.signals?.length
    ? `\n## Purchase Intent Signals (${purchaseIntentAnalysis.signals.length}):\n${purchaseIntentAnalysis.signals.slice(0, 4).map((s) => `- ${s.signal} (${s.stage}, ${s.strength})`).join("\n")}${purchaseIntentAnalysis.barriers?.length ? `\n- Top barriers: ${purchaseIntentAnalysis.barriers.slice(0, 2).map((b) => b.barrier).join(", ")}` : ""}`
    : "";

  const competitiveSection = competitivePositioning?.marketPosition?.quadrant
    ? `\n## Competitive Position:\n- Market quadrant: ${competitivePositioning.marketPosition.quadrant}\n- Differentiators: ${competitivePositioning.marketPosition.differentiators?.slice(0, 3).join(", ") || "None identified"}\n- Vulnerabilities: ${competitivePositioning.marketPosition.vulnerabilities?.slice(0, 2).join(", ") || "None identified"}`
    : "";

  const affinitySection = mediaAffinity?.channelRecommendations?.length
    ? `\n## Media Affinity - Top Channels:\n${mediaAffinity.channelRecommendations.slice(0, 4).map((c) => `- ${c.channel}: ${c.budgetAllocationPercent}% budget (${c.priority})`).join("\n")}`
    : "";

  const prompt = `Generate an executive summary of market intelligence for "${context.brand.name}" (${context.brand.industry || "business"}).
${context.product ? `Product: ${context.product.name}` : ""}

## Competitors (${competitors.length}):
${competitors.slice(0, 5).map((c) => `- ${c.name}: ${c.positioning} (${c.pricingTier})`).join("\n")}

## Trends (${trends.length}):
${trends.slice(0, 5).map((t) => `- ${t.name}: ${t.direction}, ${t.impactLevel} impact`).join("\n")}

## Audience (${audiences.length}):
${audiences.slice(0, 4).map((a) => `- ${a.name} (${a.size}): ${a.demographics.ageRange}, ${a.demographics.income}`).join("\n")}

## Platforms (${platformInsights.length}):
${platformInsights.slice(0, 5).map((p) => `- ${p.platform}: ${p.sentiment} sentiment`).join("\n")}

## Content Recs (${contentRecommendations.length}):
${contentRecommendations.slice(0, 4).map((c) => `- ${c.type} on ${c.platform}: "${c.headline}"`).join("\n")}
${sentimentSection}${topicsSection}${intentSection}${competitiveSection}${affinitySection}

Return a JSON object with:
- overview: 2-3 sentence market overview
- keyFindings: Array of 4-5 key findings
- opportunities: Array of 3-4 opportunities
- threats: Array of 2-3 threats
- recommendations: Array of 3-5 actionable recommendations

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
 *
 * Uses parallel batching to reduce total execution time:
 * - Batch 1: competitors, trends, audience (no dependencies)
 * - Batch 2: sentiment, topicClusters, purchaseIntent, platforms (raw data only)
 * - Batch 3: competitivePositioning, mediaAffinity (depend on batch 1)
 * - Batch 4: contentRecommendations, personaSuggestions (depend on earlier results)
 * - Final: executiveSummary (depends on all above)
 */
export async function synthesizeFullReport(
  rawData: RawIntelligenceData,
  context: { brand: Brand; product?: Product | null },
  onProgress?: SynthesisProgressCallback
): Promise<SynthesizedReport> {
  // Default values for error cases
  const defaultSentiment: SentimentAnalysis = { overall: { score: 0, label: "neutral", intensity: "mild" }, byPlatform: [], topicSentiment: [] };
  const defaultTopics: TopicCluster = { clusters: [], emergingTopics: [], decliningTopics: [] };
  const defaultIntent: PurchaseIntentAnalysis = { signals: [], comparisonBehavior: { topComparedProducts: [], comparisonFactors: [], decisionTimeline: "" }, barriers: [], conversionDrivers: [] };
  const defaultPositioning: CompetitivePositioning = { priceComparison: [], featureComparison: [], reviewComparison: [], marketPosition: { quadrant: "", differentiators: [], vulnerabilities: [] } };
  const defaultAffinity: MediaAffinityReport = { platformAffinity: [], contentFormatAffinity: [], timeOfDayPatterns: [], influencerAffinity: [], interestCategories: [], channelRecommendations: [] };

  // ========== BATCH 1: No dependencies (parallel) ==========
  // These 3 calls can run simultaneously - ~30-60s each, ~60s total in parallel vs ~180s sequential
  onProgress?.("synthesizing", "Analyzing competitors, trends, and audience...", 0);

  const [competitors, trends, audienceSegments] = await Promise.all([
    synthesizeCompetitors(rawData, context).catch((error) => {
      console.error("Error synthesizing competitors (non-fatal):", error);
      return [] as SynthesizedCompetitor[];
    }),
    synthesizeTrends(rawData, context).catch((error) => {
      console.error("Error synthesizing trends (non-fatal):", error);
      return [] as SynthesizedTrend[];
    }),
    synthesizeAudience(rawData, context).catch((error) => {
      console.error("Error synthesizing audience (non-fatal):", error);
      return [] as SynthesizedAudienceSegment[];
    }),
  ]);

  // ========== BATCH 2: Raw data only dependencies (parallel) ==========
  // These 4 calls only need rawData, can run in parallel - ~30-60s each, ~60s total in parallel vs ~240s sequential
  onProgress?.("synthesizing", "Analyzing sentiment, topics, intent, and platforms...", 25);

  const [sentimentAnalysis, topicClusters, purchaseIntentAnalysis, platformInsights] = await Promise.all([
    synthesizeSentiment(rawData, context).catch((error) => {
      console.error("Error in sentiment analysis (non-fatal):", error);
      return defaultSentiment;
    }),
    synthesizeTopicClusters(rawData, context).catch((error) => {
      console.error("Error in topic clustering (non-fatal):", error);
      return defaultTopics;
    }),
    synthesizePurchaseIntent(rawData, context).catch((error) => {
      console.error("Error in purchase intent analysis (non-fatal):", error);
      return defaultIntent;
    }),
    analyzePlatforms(rawData, context).catch((error) => {
      console.error("Error analyzing platforms (non-fatal):", error);
      return [] as PlatformInsight[];
    }),
  ]);

  // ========== BATCH 3: Depends on Batch 1 results (parallel) ==========
  // competitivePositioning needs rawData + context.product
  // mediaAffinity needs rawData + audienceSegments + platformInsights
  onProgress?.("synthesizing", "Analyzing competitive positioning and media affinity...", 50);

  const [competitivePositioning, mediaAffinity] = await Promise.all([
    synthesizeCompetitivePositioning(rawData, context).catch((error) => {
      console.error("Error in competitive positioning (non-fatal):", error);
      return defaultPositioning;
    }),
    synthesizeMediaAffinity(rawData, audienceSegments, platformInsights, context).catch((error) => {
      console.error("Error in media affinity analysis (non-fatal):", error);
      return defaultAffinity;
    }),
  ]);

  // ========== BATCH 4: Depends on multiple earlier results (parallel) ==========
  // contentRecommendations needs trends + audienceSegments + platformInsights
  // personaSuggestions needs audienceSegments + competitors
  onProgress?.("synthesizing", "Generating content recommendations and persona suggestions...", 70);

  const [contentRecommendations, personaSuggestions] = await Promise.all([
    recommendContent(trends, audienceSegments, platformInsights, context).catch((error) => {
      console.error("Error generating content recommendations (non-fatal):", error);
      return [] as ContentRecommendation[];
    }),
    suggestPersonas(audienceSegments, competitors, context).catch((error) => {
      console.error("Error generating persona suggestions (non-fatal):", error);
      return [] as PersonaSuggestion[];
    }),
  ]);

  // ========== FINAL: Executive summary depends on everything ==========
  onProgress?.("synthesizing", "Generating executive summary...", 90);
  const executiveSummary = await generateExecutiveSummary(
    competitors,
    trends,
    audienceSegments,
    platformInsights,
    contentRecommendations,
    personaSuggestions,
    context,
    sentimentAnalysis,
    topicClusters,
    purchaseIntentAnalysis,
    competitivePositioning,
    mediaAffinity
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
    sentimentAnalysis,
    topicClusters,
    purchaseIntentAnalysis,
    competitivePositioning,
    mediaAffinity,
  };
}
