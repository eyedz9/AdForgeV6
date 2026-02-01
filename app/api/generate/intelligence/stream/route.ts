/**
 * Intelligence Report Generation SSE Stream
 *
 * Provides real-time progress updates during report generation.
 * Uses Server-Sent Events (SSE) to stream updates to the client.
 *
 * POST /api/generate/intelligence/stream
 */

export const maxDuration = 300;

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildSearchQueries,
  type RawIntelligenceData,
  type SearchResult,
  type ScrapedContent,
} from "@/lib/services/intelligence-collector";
import { synthesizeFullReport } from "@/lib/services/intelligence-synthesizer";
import { checkQuota, decrementQuota } from "@/lib/services/usage";
import type {
  Brand,
  Product,
  IntelligenceReportInsert,
  Json,
} from "@/lib/supabase/database.types";
import type { AttributedSource } from "@/lib/api/brightdata";

/**
 * Recursively strip null bytes (\u0000) from all strings in an object.
 * PostgreSQL text columns cannot store null bytes.
 */
function stripNullBytes<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/\0/g, "") as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(stripNullBytes) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      cleaned[k] = stripNullBytes(v);
    }
    return cleaned as T;
  }
  return value;
}

// Rate limiting configuration
const SEARCH_DELAY_MS = 500;
const SCRAPE_DELAY_MS = 1000;

/**
 * SSE Event types
 */
interface SSEEvent {
  type: "progress" | "phase" | "complete" | "error";
  phase?: "collecting" | "scraping" | "synthesizing" | "storing" | "complete";
  message: string;
  progress: number;
  data?: unknown;
}

/**
 * Request body schema
 */
interface GenerateIntelligenceRequest {
  brand_id: string;
  product_id?: string | null;
  report_type?: string;
}

/**
 * Encode SSE event
 */
function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute search using BrightData SERP API directly
 * All data MUST come from BrightData - no mock/fallback data
 */
async function executeSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  if (!apiKey) {
    console.error("BRIGHTDATA_API_KEY not configured");
    return [];
  }

  try {
    // BrightData Web Unlocker to scrape Google search directly
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;

    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        zone: process.env.BRIGHTDATA_ZONE || "web_unlocker1",
        url: searchUrl,
        format: "raw",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`BrightData search failed (${response.status}): ${errorText.slice(0, 200)}`);
      return [];
    }

    const html = await response.text();

    // Parse Google search results from HTML
    const results = parseGoogleSearchResults(html);
    return results;
  } catch (error) {
    console.error("BrightData search error:", error);
    return [];
  }
}

/**
 * Parse Google search results from HTML response
 */
function parseGoogleSearchResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Pattern to match search result links with titles
  // Google wraps results in <a> tags with <h3> for titles
  const patterns = [
    // Main pattern: <a href="url"><h3>title</h3></a>
    /<a[^>]+href="(https?:\/\/(?!www\.google|webcache|translate\.google)[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi,
    // Alternative: data-href pattern
    /<a[^>]+data-href="(https?:\/\/(?!www\.google)[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null && results.length < 10) {
      const url = match[1];
      const title = decodeHtmlEntities(match[2]).trim();

      // Skip if already have this URL or if it's a Google internal link
      if (results.some(r => r.url === url) || url.includes("google.com")) {
        continue;
      }

      if (title.length > 3) {
        results.push({
          url,
          title,
          description: "",
          position: results.length + 1,
        });
      }
    }
  }

  // Try to extract descriptions (snippets)
  for (const result of results) {
    const descPattern = new RegExp(
      escapeRegex(result.url) + '[^>]*>[\\s\\S]*?<span[^>]*>([^<]{20,200})</span>',
      'i'
    );
    const descMatch = html.match(descPattern);
    if (descMatch) {
      result.description = decodeHtmlEntities(descMatch[1]).trim();
    }
  }

  return results;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

/**
 * Escape string for use in regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scrape URL using BrightData Web Unlocker API directly
 */
async function scrapeUrl(url: string): Promise<ScrapedContent | null> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  if (!apiKey) {
    console.warn("BRIGHTDATA_API_KEY not configured, skipping scrape");
    return null;
  }

  try {
    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        zone: process.env.BRIGHTDATA_ZONE || "web_unlocker1",
        url,
        format: "raw",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Scrape failed for ${url} (${response.status}): ${errorText.slice(0, 100)}`);
      return null;
    }

    const html = await response.text();

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : "";

    // Convert HTML to text content
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);

    return {
      url,
      title,
      content: textContent,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(`Scrape error for ${url}:`, error);
    return null;
  }
}

/**
 * Build sources array from raw data
 */
function buildSources(rawData: RawIntelligenceData): AttributedSource[] {
  const sources: AttributedSource[] = [];
  const seen = new Set<string>();

  const addSource = (url: string, name: string, confidence: number, platform?: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      sources.push({
        url,
        name,
        timestamp: new Date().toISOString(),
        confidence,
        platform,
      });
    }
  };

  // Traditional SERP sources
  rawData.competitors.searches.forEach((s) => addSource(s.url, s.title, 0.75, "google"));
  rawData.trends.searches.forEach((s) => addSource(s.url, s.title, 0.9, "google"));
  rawData.news.searches.forEach((s) => addSource(s.url, s.title, 0.85, "google"));
  rawData.social.searches.forEach((s) => addSource(s.url, s.title, 0.7, "social"));
  rawData.audience.searches.forEach((s) => addSource(s.url, s.title, 0.65, "google"));

  // UGC platform sources
  rawData.reddit.searches.forEach((s) => addSource(s.url, s.title, 0.8, "reddit"));
  rawData.amazon.searches.forEach((s) => addSource(s.url, s.title, 0.85, "amazon"));
  rawData.youtube.searches.forEach((s) => addSource(s.url, s.title, 0.75, "youtube"));
  rawData.googleReviews.searches.forEach((s) => addSource(s.url, s.title, 0.82, "google_reviews"));
  rawData.forums.searches.forEach((s) => addSource(s.url, s.title, 0.7, "forums"));

  // Product research platform sources
  rawData.walmart.searches.forEach((s) => addSource(s.url, s.title, 0.83, "walmart"));
  rawData.tiktok.searches.forEach((s) => addSource(s.url, s.title, 0.72, "tiktok"));
  rawData.instagram.searches.forEach((s) => addSource(s.url, s.title, 0.70, "instagram"));
  rawData.twitter.searches.forEach((s) => addSource(s.url, s.title, 0.73, "twitter"));

  return sources;
}

/**
 * POST handler - Generate report with SSE progress
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(encodeSSE(event)));
      };

      // Send SSE keepalive comments to prevent Vercel idle timeout
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          // Stream already closed
          clearInterval(heartbeat);
        }
      }, 10_000);

      try {
        const body = (await request.json()) as GenerateIntelligenceRequest;

        if (!body.brand_id) {
          sendEvent({
            type: "error",
            message: "brand_id is required",
            progress: 0,
          });
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        const supabase = await createClient();

        // Authenticate
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          sendEvent({
            type: "error",
            message: "Unauthorized",
            progress: 0,
          });
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        // Verify brand ownership
        sendEvent({
          type: "phase",
          phase: "collecting",
          message: "Verifying brand access...",
          progress: 1,
        });

        const { data: brand, error: brandError } = await supabase
          .from("brands")
          .select("*")
          .eq("id", body.brand_id)
          .eq("user_id", user.id)
          .single();

        if (brandError || !brand) {
          sendEvent({
            type: "error",
            message: "Brand not found or access denied",
            progress: 0,
          });
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        // Get product if provided
        let product: Product | null = null;
        if (body.product_id) {
          const { data: productData } = await supabase
            .from("products")
            .select("*")
            .eq("id", body.product_id)
            .eq("brand_id", body.brand_id)
            .single();

          if (productData) {
            product = productData;
          }
        }

        // Check quota
        const quotaCheck = await checkQuota(
          supabase,
          user.id,
          "intelligence_reports",
          1
        );
        if (!quotaCheck.allowed) {
          sendEvent({
            type: "error",
            message: quotaCheck.message || "Quota exceeded",
            progress: 0,
          });
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        const context = { brand: brand as Brand, product };
        const queries = buildSearchQueries(context);

        // Phase 1: Collection
        sendEvent({
          type: "phase",
          phase: "collecting",
          message: "Starting data collection...",
          progress: 5,
        });

        const rawData: RawIntelligenceData = {
          competitors: { searches: [], scraped: [] },
          trends: { searches: [], scraped: [] },
          news: { searches: [], scraped: [] },
          social: { searches: [], scraped: [] },
          audience: { searches: [], scraped: [] },
          // UGC platform categories
          reddit: { searches: [], scraped: [] },
          amazon: { searches: [], scraped: [] },
          youtube: { searches: [], scraped: [] },
          googleReviews: { searches: [], scraped: [] },
          forums: { searches: [], scraped: [] },
          // Product research platforms
          walmart: { searches: [], scraped: [] },
          tiktok: { searches: [], scraped: [] },
          instagram: { searches: [], scraped: [] },
          twitter: { searches: [], scraped: [] },
          metadata: {
            collectedAt: new Date().toISOString(),
            totalSearches: 0,
            totalScraped: 0,
            errors: [],
            platforms: [],
          },
        };

        // Search competitors (5% - 7%)
        for (let i = 0; i < queries.competitors.length; i++) {
          const query = queries.competitors[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching competitors: ${query.slice(0, 40)}...`,
            progress: 5 + ((i / queries.competitors.length) * 2),
          });
          const results = await executeSearch(query);
          rawData.competitors.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search trends (7% - 10%)
        for (let i = 0; i < queries.trends.length; i++) {
          const query = queries.trends[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching trends: ${query.slice(0, 40)}...`,
            progress: 7 + ((i / queries.trends.length) * 3),
          });
          const results = await executeSearch(query);
          rawData.trends.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search news (10% - 12%)
        for (let i = 0; i < queries.news.length; i++) {
          const query = queries.news[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching news: ${query.slice(0, 40)}...`,
            progress: 10 + ((i / queries.news.length) * 2),
          });
          const results = await executeSearch(query);
          rawData.news.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search social (12% - 14%)
        for (let i = 0; i < queries.social.length; i++) {
          const query = queries.social[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching social: ${query.slice(0, 40)}...`,
            progress: 12 + ((i / queries.social.length) * 2),
          });
          const results = await executeSearch(query);
          rawData.social.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search audience (14% - 16%)
        for (let i = 0; i < queries.audience.length; i++) {
          const query = queries.audience[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching audience: ${query.slice(0, 40)}...`,
            progress: 14 + ((i / queries.audience.length) * 2),
          });
          const results = await executeSearch(query);
          rawData.audience.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search Reddit discussions (16% - 18%)
        rawData.metadata.platforms.push("reddit");
        for (let i = 0; i < queries.reddit.length; i++) {
          const query = queries.reddit[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching Reddit: ${query.slice(0, 40)}...`,
            progress: 16 + ((i / queries.reddit.length) * 2),
          });
          const results = await executeSearch(query);
          rawData.reddit.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search Amazon reviews (18% - 20%)
        rawData.metadata.platforms.push("amazon");
        for (let i = 0; i < queries.amazon.length; i++) {
          const query = queries.amazon[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching Amazon: ${query.slice(0, 40)}...`,
            progress: 18 + ((i / queries.amazon.length) * 2),
          });
          const results = await executeSearch(query);
          rawData.amazon.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search YouTube content (20% - 22%)
        rawData.metadata.platforms.push("youtube");
        for (let i = 0; i < queries.youtube.length; i++) {
          const query = queries.youtube[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching YouTube: ${query.slice(0, 40)}...`,
            progress: 20 + ((i / queries.youtube.length) * 2),
          });
          const results = await executeSearch(query);
          rawData.youtube.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search Google Reviews (22% - 24%)
        rawData.metadata.platforms.push("google_reviews");
        for (let i = 0; i < queries.googleReviews.length; i++) {
          const query = queries.googleReviews[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching Google Reviews: ${query.slice(0, 40)}...`,
            progress: 22 + ((i / queries.googleReviews.length) * 2),
          });
          const results = await executeSearch(query);
          rawData.googleReviews.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search Forums and review sites (24% - 26%)
        rawData.metadata.platforms.push("forums");
        for (let i = 0; i < queries.forums.length; i++) {
          const query = queries.forums[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching forums: ${query.slice(0, 40)}...`,
            progress: 24 + ((i / queries.forums.length) * 2),
          });
          const results = await executeSearch(query);
          rawData.forums.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Product-specific research for target audience (if product provided) (26% - 28%)
        if (queries.productResearch && queries.productResearch.length > 0) {
          rawData.metadata.platforms.push("product_research");
          for (let i = 0; i < queries.productResearch.length; i++) {
            const query = queries.productResearch[i];
            sendEvent({
              type: "progress",
              phase: "collecting",
              message: `Product research: ${query.slice(0, 40)}...`,
              progress: 26 + ((i / queries.productResearch.length) * 2),
            });
            const results = await executeSearch(query);
            // Add product research results to audience data for synthesis
            rawData.audience.searches.push(...results);
            rawData.metadata.totalSearches++;
            await sleep(SEARCH_DELAY_MS);
          }
        }

        // Search Walmart listings and reviews (28% - 31%)
        rawData.metadata.platforms.push("walmart");
        for (let i = 0; i < queries.walmart.length; i++) {
          const query = queries.walmart[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching Walmart: ${query.slice(0, 40)}...`,
            progress: 28 + ((i / queries.walmart.length) * 3),
          });
          const results = await executeSearch(query);
          rawData.walmart.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search TikTok product videos and trends (31% - 34%)
        rawData.metadata.platforms.push("tiktok");
        for (let i = 0; i < queries.tiktok.length; i++) {
          const query = queries.tiktok[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching TikTok: ${query.slice(0, 40)}...`,
            progress: 31 + ((i / queries.tiktok.length) * 3),
          });
          const results = await executeSearch(query);
          rawData.tiktok.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search Instagram product mentions and influencer posts (34% - 37%)
        rawData.metadata.platforms.push("instagram");
        for (let i = 0; i < queries.instagram.length; i++) {
          const query = queries.instagram[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching Instagram: ${query.slice(0, 40)}...`,
            progress: 34 + ((i / queries.instagram.length) * 3),
          });
          const results = await executeSearch(query);
          rawData.instagram.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Search Twitter/X conversations and sentiment (37% - 40%)
        rawData.metadata.platforms.push("twitter");
        for (let i = 0; i < queries.twitter.length; i++) {
          const query = queries.twitter[i];
          sendEvent({
            type: "progress",
            phase: "collecting",
            message: `Searching Twitter/X: ${query.slice(0, 40)}...`,
            progress: 37 + ((i / queries.twitter.length) * 3),
          });
          const results = await executeSearch(query);
          rawData.twitter.searches.push(...results);
          rawData.metadata.totalSearches++;
          await sleep(SEARCH_DELAY_MS);
        }

        // Phase 2: Scraping (40% - 55%)
        sendEvent({
          type: "phase",
          phase: "scraping",
          message: "Scraping web content from all platforms...",
          progress: 40,
        });

        // Scrape competitor URLs (40% - 41%)
        const competitorUrls = rawData.competitors.searches.slice(0, 4);
        for (let i = 0; i < competitorUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping: ${new URL(competitorUrls[i].url).hostname}`,
              progress: 40 + ((i / Math.max(competitorUrls.length, 1)) * 1),
            });
            const content = await scrapeUrl(competitorUrls[i].url);
            if (content) {
              rawData.competitors.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Scrape trend URLs (41% - 42%)
        const trendUrls = rawData.trends.searches.slice(0, 3);
        for (let i = 0; i < trendUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping trends: ${new URL(trendUrls[i].url).hostname}`,
              progress: 41 + ((i / Math.max(trendUrls.length, 1)) * 1),
            });
            const content = await scrapeUrl(trendUrls[i].url);
            if (content) {
              rawData.trends.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Scrape social URLs (42% - 43%)
        const socialUrls = rawData.social.searches.slice(0, 3);
        for (let i = 0; i < socialUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping social: ${new URL(socialUrls[i].url).hostname}`,
              progress: 42 + ((i / Math.max(socialUrls.length, 1)) * 1),
            });
            const content = await scrapeUrl(socialUrls[i].url);
            if (content) {
              rawData.social.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Scrape Reddit discussions (43% - 44%)
        const redditUrls = rawData.reddit.searches
          .filter((s) => s.url.includes("reddit.com"))
          .slice(0, 4);
        for (let i = 0; i < redditUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping Reddit: ${new URL(redditUrls[i].url).hostname}`,
              progress: 43 + ((i / Math.max(redditUrls.length, 1)) * 1),
            });
            const content = await scrapeUrl(redditUrls[i].url);
            if (content) {
              rawData.reddit.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Scrape Amazon reviews (44% - 45%)
        const amazonUrls = rawData.amazon.searches
          .filter((s) => s.url.includes("amazon.com"))
          .slice(0, 3);
        for (let i = 0; i < amazonUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping Amazon: ${new URL(amazonUrls[i].url).hostname}`,
              progress: 44 + ((i / Math.max(amazonUrls.length, 1)) * 1),
            });
            const content = await scrapeUrl(amazonUrls[i].url);
            if (content) {
              rawData.amazon.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Scrape YouTube content (descriptions/transcripts) (45% - 46%)
        const youtubeUrls = rawData.youtube.searches
          .filter((s) => s.url.includes("youtube.com"))
          .slice(0, 3);
        for (let i = 0; i < youtubeUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping YouTube: ${new URL(youtubeUrls[i].url).hostname}`,
              progress: 45 + ((i / Math.max(youtubeUrls.length, 1)) * 1),
            });
            const content = await scrapeUrl(youtubeUrls[i].url);
            if (content) {
              rawData.youtube.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Scrape forum discussions (46% - 48%)
        const forumUrls = rawData.forums.searches.slice(0, 4);
        for (let i = 0; i < forumUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping forums: ${new URL(forumUrls[i].url).hostname}`,
              progress: 46 + ((i / Math.max(forumUrls.length, 1)) * 2),
            });
            const content = await scrapeUrl(forumUrls[i].url);
            if (content) {
              rawData.forums.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Scrape Walmart product pages (48% - 50%)
        const walmartUrls = rawData.walmart.searches
          .filter((s) => s.url.includes("walmart.com"))
          .slice(0, 3);
        for (let i = 0; i < walmartUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping Walmart: ${new URL(walmartUrls[i].url).hostname}`,
              progress: 48 + ((i / Math.max(walmartUrls.length, 1)) * 2),
            });
            const content = await scrapeUrl(walmartUrls[i].url);
            if (content) {
              rawData.walmart.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Scrape TikTok product content (50% - 51%)
        const tiktokUrls = rawData.tiktok.searches
          .filter((s) => s.url.includes("tiktok.com"))
          .slice(0, 3);
        for (let i = 0; i < tiktokUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping TikTok: ${new URL(tiktokUrls[i].url).hostname}`,
              progress: 50 + ((i / Math.max(tiktokUrls.length, 1)) * 1),
            });
            const content = await scrapeUrl(tiktokUrls[i].url);
            if (content) {
              rawData.tiktok.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Scrape Instagram product content (51% - 53%)
        const instagramUrls = rawData.instagram.searches
          .filter((s) => s.url.includes("instagram.com"))
          .slice(0, 3);
        for (let i = 0; i < instagramUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping Instagram: ${new URL(instagramUrls[i].url).hostname}`,
              progress: 51 + ((i / Math.max(instagramUrls.length, 1)) * 2),
            });
            const content = await scrapeUrl(instagramUrls[i].url);
            if (content) {
              rawData.instagram.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Scrape Twitter/X conversations (53% - 55%)
        const twitterUrls = rawData.twitter.searches
          .filter((s) => s.url.includes("twitter.com") || s.url.includes("x.com"))
          .slice(0, 4);
        for (let i = 0; i < twitterUrls.length; i++) {
          try {
            sendEvent({
              type: "progress",
              phase: "scraping",
              message: `Scraping Twitter/X: ${new URL(twitterUrls[i].url).hostname}`,
              progress: 53 + ((i / Math.max(twitterUrls.length, 1)) * 2),
            });
            const content = await scrapeUrl(twitterUrls[i].url);
            if (content) {
              rawData.twitter.scraped.push(content);
              rawData.metadata.totalScraped++;
            }
            await sleep(SCRAPE_DELAY_MS);
          } catch {
            // Skip invalid URLs
          }
        }

        // Phase 3: Synthesis (55% - 95%)
        sendEvent({
          type: "phase",
          phase: "synthesizing",
          message: "Analyzing data with AI...",
          progress: 55,
        });

        const synthesized = await synthesizeFullReport(
          rawData,
          context,
          (phase, message, progress) => {
            sendEvent({
              type: "progress",
              phase: "synthesizing",
              message,
              progress: 55 + (progress * 0.40), // 55-95%
            });
          }
        );

        // Phase 4: Storage (95% - 100%)
        sendEvent({
          type: "phase",
          phase: "storing",
          message: "Saving report...",
          progress: 95,
        });

        const sources = buildSources(rawData);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const reportData: IntelligenceReportInsert = {
          brand_id: body.brand_id,
          product_id: body.product_id || null,
          report_type: body.report_type || "comprehensive",
          generated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          status: "active",
          competitors: synthesized.competitors as unknown as Json,
          search_trends: synthesized.trends as unknown as Json,
          industry_news: rawData.news.searches as unknown as Json,
          social_conversations: rawData.social.searches as unknown as Json,
          audience_insights: {
            segments: synthesized.audienceSegments,
            totalSegments: synthesized.audienceSegments.length,
          } as unknown as Json,
          sources: sources as unknown as Json,
          executive_summary: JSON.stringify(synthesized.executiveSummary),
          persona_suggestions: synthesized.personaSuggestions as unknown as Json,
          raw_data: rawData as unknown as Json,
          platform_insights: synthesized.platformInsights as unknown as Json,
          content_recommendations:
            synthesized.contentRecommendations as unknown as Json,
          synthesized_trends: synthesized.trends as unknown as Json,
          synthesized_audience: synthesized.audienceSegments as unknown as Json,
          synthesized_competitors: synthesized.competitors as unknown as Json,
          // Product research analysis fields
          sentiment_analysis: synthesized.sentimentAnalysis as unknown as Json,
          topic_clusters: synthesized.topicClusters as unknown as Json,
          purchase_intent: synthesized.purchaseIntentAnalysis as unknown as Json,
          competitive_positioning: synthesized.competitivePositioning as unknown as Json,
          media_affinity: synthesized.mediaAffinity as unknown as Json,
        };

        const cleanedReportData = stripNullBytes(reportData);

        const { data: report, error: insertError } = await supabase
          .from("intelligence_reports")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(cleanedReportData as any)
          .select()
          .single();

        if (insertError || !report) {
          console.error("Failed to save intelligence report:", insertError);
          sendEvent({
            type: "error",
            message: `Failed to save report: ${insertError?.message || "Unknown error"}`,
            progress: 95,
          });
          clearInterval(heartbeat);
          controller.close();
          return;
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

        // Complete
        sendEvent({
          type: "phase",
          phase: "complete",
          message: "Report generation complete!",
          progress: 100,
          data: {
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
            sentiment_analysis: synthesized.sentimentAnalysis,
            topic_clusters: synthesized.topicClusters,
            purchase_intent: synthesized.purchaseIntentAnalysis,
            competitive_positioning: synthesized.competitivePositioning,
            media_affinity: synthesized.mediaAffinity,
            sources,
            metadata: rawData.metadata,
          },
        });

        sendEvent({
          type: "complete",
          message: "Done",
          progress: 100,
        });

        clearInterval(heartbeat);
        controller.close();
      } catch (error) {
        sendEvent({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate report",
          progress: 0,
        });
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
