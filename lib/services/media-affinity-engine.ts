/**
 * Media Affinity Engine
 *
 * Calculates where a target audience consumes media expressed as affinity indexes
 * (baseline 100). Above 100 = over-index, below 100 = under-index.
 * Provides channel budget recommendations based on platform engagement data,
 * audience behaviors, and content format preferences.
 */

import { sendMessageForJSON } from "@/lib/api/anthropic";
import type { RawIntelligenceData } from "./intelligence-collector";
import type {
  SynthesizedAudienceSegment,
  PlatformInsight,
} from "./intelligence-synthesizer";
import type { Brand, Product } from "@/lib/supabase/database.types";

/**
 * Media Affinity Report with platform, content, temporal, influencer,
 * interest, and channel recommendation analysis
 */
export interface MediaAffinityReport {
  platformAffinity: {
    platform: string;
    affinityIndex: number;
    reach: "high" | "medium" | "low";
    engagement: "high" | "medium" | "low";
    costEfficiency: "high" | "medium" | "low";
    reasoning: string;
  }[];
  contentFormatAffinity: {
    format:
      | "short_video"
      | "long_video"
      | "image"
      | "carousel"
      | "text"
      | "audio"
      | "live_stream"
      | "stories";
    affinityIndex: number;
    topPlatforms: string[];
    reasoning: string;
  }[];
  timeOfDayPatterns: {
    period:
      | "early_morning"
      | "morning"
      | "midday"
      | "afternoon"
      | "evening"
      | "night"
      | "late_night";
    affinityIndex: number;
    bestPlatforms: string[];
  }[];
  influencerAffinity: {
    type: string;
    affinityIndex: number;
    platforms: string[];
    reasoning: string;
  }[];
  interestCategories: {
    category: string;
    affinityIndex: number;
    relatedPlatforms: string[];
    crossReferenceStrength: "strong" | "moderate" | "weak";
  }[];
  channelRecommendations: {
    channel: string;
    budgetAllocationPercent: number;
    priority: "primary" | "secondary" | "experimental";
    expectedROI: "high" | "medium" | "low";
    reasoning: string;
    tactics: string[];
  }[];
}

/**
 * Helper to truncate content for Claude context
 */
function truncateContent(content: string, maxLength: number = 2000): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + "...";
}

/**
 * Synthesize media affinity report from raw intelligence data,
 * audience segments, and platform insights
 */
export async function synthesizeMediaAffinity(
  rawData: RawIntelligenceData,
  audienceSegments: SynthesizedAudienceSegment[],
  platformInsights: PlatformInsight[],
  context: { brand: Brand; product?: Product | null }
): Promise<MediaAffinityReport> {
  const emptyDefaults: MediaAffinityReport = {
    platformAffinity: [],
    contentFormatAffinity: [],
    timeOfDayPatterns: [],
    influencerAffinity: [],
    interestCategories: [],
    channelRecommendations: [],
  };

  // Collect scraped content from all platforms, truncated to 600 chars, limited to 2 items each
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
      const scraped =
        data?.scraped
          .slice(0, 2)
          .map((s) => `### ${s.url}\n${truncateContent(s.content, 600)}`)
          .join("\n\n") || "";
      return scraped
        ? `## ${key.charAt(0).toUpperCase() + key.slice(1)} Content:\n${scraped}`
        : "";
    })
    .filter(Boolean)
    .join("\n\n");

  // Audience segment summary for context
  const audienceSummary = audienceSegments
    .slice(0, 5)
    .map(
      (seg) =>
        `- ${seg.name} (${seg.size}): ${seg.demographics.ageRange}, ${seg.demographics.income}, interests: ${seg.psychographics.interests.slice(0, 5).join(", ")}, channels: ${seg.behaviors.preferredChannels.join(", ")}`
    )
    .join("\n");

  // Platform insights summary
  const platformInsightsSummary = platformInsights
    .slice(0, 8)
    .map(
      (p) =>
        `- ${p.platform}: ${p.sentiment} sentiment, engagement: ${p.engagement}, topics: ${p.keyTopics.slice(0, 4).join(", ")}`
    )
    .join("\n");

  const productContext = context.product
    ? `Product: ${context.product.name} - ${context.product.short_description || "N/A"} (Price: ${context.product.price ? `$${context.product.price}` : "N/A"})`
    : "";

  const prompt = `Analyze media consumption patterns and calculate affinity indexes for the target audience of "${context.brand.name}" in the ${context.brand.industry || "business"} industry.
${productContext}

## Audience Segments:
${audienceSummary}

## Platform Engagement Data:
${platformInsightsSummary}

## User-Generated Content Across Platforms:
${platformSections}

Calculate affinity indexes with baseline 100 (above 100 = audience over-indexes on this media, below 100 = under-indexes). Return a JSON object with:

1. **platformAffinity**: Array of platform affinity scores, each with:
   - platform: Platform name (e.g., "TikTok", "Instagram", "Reddit", "YouTube", "Twitter/X", "Amazon", "Walmart", "Forums")
   - affinityIndex: Number with baseline 100 (e.g., 145 means 45% above average)
   - reach: "high", "medium", or "low"
   - engagement: "high", "medium", or "low"
   - costEfficiency: "high", "medium", or "low"
   - reasoning: Why this audience over/under-indexes here

2. **contentFormatAffinity**: Array of content format preferences, each with:
   - format: One of "short_video", "long_video", "image", "carousel", "text", "audio", "live_stream", "stories"
   - affinityIndex: Number with baseline 100
   - topPlatforms: Array of best platforms for this format
   - reasoning: Why this format resonates with the audience

3. **timeOfDayPatterns**: Array of time period engagement patterns, each with:
   - period: One of "early_morning", "morning", "midday", "afternoon", "evening", "night", "late_night"
   - affinityIndex: Number with baseline 100
   - bestPlatforms: Array of platforms most active during this period

4. **influencerAffinity**: Array of influencer type affinities, each with:
   - type: Influencer type (e.g., "Micro-influencer (10K-100K)", "Industry Expert", "Celebrity")
   - affinityIndex: Number with baseline 100
   - platforms: Where these influencers are most effective
   - reasoning: Why this influencer type works for the audience

5. **interestCategories**: Array of interest-based affinities, each with:
   - category: Interest category name
   - affinityIndex: Number with baseline 100
   - relatedPlatforms: Platforms where this interest is strongest
   - crossReferenceStrength: "strong", "moderate", or "weak"

6. **channelRecommendations**: Array of channel budget recommendations, each with:
   - channel: Channel name (e.g., "TikTok Ads", "Instagram Reels", "Reddit Sponsored")
   - budgetAllocationPercent: Number (IMPORTANT: all budgetAllocationPercent values MUST sum to exactly 100)
   - priority: "primary", "secondary", or "experimental"
   - expectedROI: "high", "medium", or "low"
   - reasoning: Why this channel deserves this budget allocation
   - tactics: Array of 2-4 specific tactics for this channel

Provide 6-10 platforms, 5-8 content formats, all 7 time periods, 4-6 influencer types, 5-8 interest categories, and 5-8 channel recommendations.`;

  try {
    const result = await sendMessageForJSON<MediaAffinityReport>(prompt, {
      systemPrompt:
        "You are an expert media planner and audience analyst specializing in media affinity modeling, channel planning, and budget allocation. Calculate precise affinity indexes based on audience behavior data, platform engagement patterns, and content consumption signals. Use baseline 100 for all affinity indexes. Be data-driven, precise, and ensure channel budget recommendations sum to 100%.",
    });

    return {
      platformAffinity: Array.isArray(result?.platformAffinity)
        ? result.platformAffinity
        : [],
      contentFormatAffinity: Array.isArray(result?.contentFormatAffinity)
        ? result.contentFormatAffinity
        : [],
      timeOfDayPatterns: Array.isArray(result?.timeOfDayPatterns)
        ? result.timeOfDayPatterns
        : [],
      influencerAffinity: Array.isArray(result?.influencerAffinity)
        ? result.influencerAffinity
        : [],
      interestCategories: Array.isArray(result?.interestCategories)
        ? result.interestCategories
        : [],
      channelRecommendations: Array.isArray(result?.channelRecommendations)
        ? result.channelRecommendations
        : [],
    };
  } catch (error) {
    console.error("Error synthesizing media affinity:", error);
    return emptyDefaults;
  }
}
