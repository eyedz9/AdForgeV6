/**
 * Intelligence Collector Service
 *
 * Wraps BrightData MCP tools for real web data collection.
 * Collects data from multiple sources including:
 * - Google SERP (competitors, trends, news)
 * - Reddit (discussions, opinions, recommendations)
 * - Amazon (product reviews, ratings, Q&A)
 * - YouTube (video content, comments, engagement)
 * - Google Reviews (business reviews, ratings)
 * - Other UGC platforms (forums, review sites)
 */

import type { Brand, Product } from "@/lib/supabase/database.types";

// Rate limiting configuration
const SEARCH_DELAY_MS = 500;
const SCRAPE_DELAY_MS = 1000;
const MAX_SEARCHES_PER_CATEGORY = 3;
const MAX_URLS_PER_CATEGORY = 5;

/**
 * Context for intelligence collection
 */
export interface CollectionContext {
  brand: Brand;
  product?: Product | null;
  location?: string;
}

/**
 * Search result from BrightData
 */
export interface SearchResult {
  url: string;
  title: string;
  description?: string;
  position: number;
  source?: string;
}

/**
 * Scraped content from a URL
 */
export interface ScrapedContent {
  url: string;
  title?: string;
  content: string;
  scrapedAt: string;
  source?: string;
}

/**
 * Platform-specific data
 */
export interface PlatformData {
  searches: SearchResult[];
  scraped: ScrapedContent[];
}

/**
 * Raw intelligence data collected from web
 */
export interface RawIntelligenceData {
  competitors: PlatformData;
  trends: PlatformData;
  news: PlatformData;
  social: PlatformData;
  audience: PlatformData;
  // New UGC-focused categories
  reddit: PlatformData;
  amazon: PlatformData;
  youtube: PlatformData;
  googleReviews: PlatformData;
  forums: PlatformData;
  metadata: {
    collectedAt: string;
    totalSearches: number;
    totalScraped: number;
    errors: string[];
    platforms: string[];
  };
}

/**
 * Progress callback for real-time updates
 */
export type ProgressCallback = (phase: string, message: string, progress: number) => void;

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build search queries for different intelligence categories and platforms
 * Supports both brand-level and product-level research
 */
export function buildSearchQueries(context: CollectionContext): {
  competitors: string[];
  trends: string[];
  news: string[];
  social: string[];
  audience: string[];
  reddit: string[];
  amazon: string[];
  youtube: string[];
  googleReviews: string[];
  forums: string[];
  productResearch: string[];
} {
  const brandName = context.brand.name;
  const industry = context.brand.industry || "business";
  const subIndustry = context.brand.sub_industry || "";
  const product = context.product;
  const productName = product?.name || "";
  const productType = product?.product_type || industry;
  const productDescription = product?.short_description || "";
  const pricePoint = product?.price ? `$${product.price}` : "";

  // Determine if this is product-focused research
  const isProductResearch = !!product;

  return {
    // Competitor analysis - brand or product level
    competitors: isProductResearch ? [
      `"${productName}" alternatives comparison`,
      `best ${productType} products 2026`,
      `${productType} competitors market leaders`,
      `"${productName}" vs competitors review`,
    ] : [
      `${brandName} competitors ${industry}`,
      `best ${industry} companies 2026`,
      `top ${industry} brands market share`,
    ],

    // Market trends
    trends: [
      `${productType || industry} trends 2026`,
      `${industry} market growth forecast analysis`,
      subIndustry ? `${subIndustry} emerging trends 2026` : `${industry} innovations technology`,
      isProductResearch ? `${productType} consumer trends buying behavior` : `${industry} market trends`,
    ],

    // Industry/product news
    news: [
      isProductResearch ? `"${productName}" news launch` : `${brandName} news`,
      `${industry} news latest developments 2026`,
      isProductResearch ? `${productType} industry news reviews` : `${brandName} announcements`,
    ],

    // Social mentions and sentiment
    social: [
      isProductResearch ? `"${productName}" reviews customer feedback` : `"${brandName}" reviews`,
      `${productType || brandName} customer experience sentiment`,
      `${productType || brandName} social media mentions`,
    ],

    // Target audience research - CRITICAL for product research
    audience: isProductResearch ? [
      `"${productType}" buyer demographics profile 2026`,
      `who buys ${productType} target customer demographics`,
      `${productType} consumer persona characteristics age income`,
      `${productType} target market segmentation analysis`,
      `"${productType}" ideal customer profile B2C`,
      pricePoint ? `${pricePoint} ${productType} buyer profile income level` : `${productType} price sensitivity demographics`,
    ] : [
      `${industry} buyer demographics consumer profile`,
      `who buys ${industry} products target audience`,
      `${industry} customer persona characteristics`,
      `${industry} market segmentation demographics`,
    ],

    // Reddit discussions - excellent for authentic audience insights
    reddit: isProductResearch ? [
      `site:reddit.com "${productType}" recommendations`,
      `site:reddit.com "looking for" ${productType}`,
      `site:reddit.com "${productType}" worth it review`,
      `site:reddit.com who buys "${productType}" demographics`,
      `site:reddit.com r/BuyItForLife "${productType}"`,
    ] : [
      `site:reddit.com "${brandName}"`,
      `site:reddit.com ${productType} recommendations`,
      `site:reddit.com "${industry}" best brands`,
    ],

    // Amazon reviews - rich source for product audience insights
    amazon: isProductResearch ? [
      `site:amazon.com "${productType}" reviews verified purchase`,
      `site:amazon.com best seller ${productType} reviews`,
      `"${productType}" amazon customer reviews demographics`,
      `site:amazon.com ${productType} "bought this for" OR "perfect for"`,
    ] : [
      `site:amazon.com "${brandName}" reviews`,
      `site:amazon.com ${productType} customer reviews`,
    ],

    // YouTube content - video reviews reveal audience demographics
    youtube: isProductResearch ? [
      `site:youtube.com "${productType}" review 2026`,
      `site:youtube.com best ${productType} comparison`,
      `site:youtube.com "${productType}" buyer's guide`,
      `site:youtube.com who should buy "${productType}"`,
    ] : [
      `site:youtube.com "${brandName}" review`,
      `site:youtube.com ${productType} comparison`,
    ],

    // Google Reviews - local business insights
    googleReviews: [
      `"${brandName}" google reviews rating`,
      `"${brandName}" customer reviews testimonials`,
      isProductResearch ? `${productType} store reviews customer demographics` : `site:google.com/maps "${brandName}" reviews`,
    ],

    // Forums and review platforms
    forums: isProductResearch ? [
      `site:quora.com "who buys" ${productType}`,
      `site:quora.com ${productType} target audience demographics`,
      `site:trustpilot.com ${productType} reviews`,
      `"${productType}" forum discussion buyer profile`,
      `site:g2.com ${productType} reviews user demographics`,
    ] : [
      `"${brandName}" forum discussion`,
      `site:quora.com "${brandName}" OR "${productType}"`,
      `site:trustpilot.com "${brandName}"`,
    ],

    // Product-specific research queries for target audience identification
    productResearch: isProductResearch ? [
      `"${productType}" target market demographics 2026`,
      `"${productType}" ideal customer persona age gender income`,
      `"${productType}" consumer behavior purchase decision`,
      `"${productType}" market research buyer profile`,
      `"${productType}" advertising target audience best practices`,
      `"${productType}" customer segmentation psychographics`,
      `why people buy "${productType}" motivations pain points`,
      `"${productType}" customer journey purchase funnel`,
    ] : [],
  };
}

/**
 * Build platform-specific search queries for detailed UGC collection
 */
export function buildPlatformQueries(context: CollectionContext): Map<string, string[]> {
  const brandName = context.brand.name;
  const industry = context.brand.industry || "business";
  const productName = context.product?.name;
  const productType = context.product?.product_type || industry;

  const queries = new Map<string, string[]>();

  // Reddit subreddit-specific queries
  queries.set("reddit", [
    `site:reddit.com/r/entrepreneur "${brandName}"`,
    `site:reddit.com/r/smallbusiness "${industry}"`,
    `site:reddit.com/r/Frugal "${productType}" recommendations`,
    `site:reddit.com inurl:comments "${brandName}"`,
  ]);

  // Amazon category-specific
  queries.set("amazon", [
    `site:amazon.com "${productName || productType}" reviews verified purchase`,
    `site:amazon.com/review "${brandName}"`,
  ]);

  // YouTube creator content
  queries.set("youtube", [
    `site:youtube.com "${brandName}" honest review`,
    `site:youtube.com "${productType}" buyer's guide 2026`,
  ]);

  // Review aggregators
  queries.set("reviews", [
    `site:g2.com "${brandName}"`,
    `site:capterra.com "${brandName}"`,
    `site:yelp.com "${brandName}"`,
    `site:bbb.org "${brandName}"`,
  ]);

  return queries;
}

/**
 * Execute a search using BrightData MCP
 */
async function executeSearch(
  query: string,
  engine: "google" | "bing" | "yandex" = "google"
): Promise<SearchResult[]> {
  try {
    const response = await fetch("/api/mcp/brightdata/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, engine }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.results || []).map((r: { url: string; title: string; description?: string }, i: number) => ({
      url: r.url,
      title: r.title,
      description: r.description,
      position: i + 1,
    }));
  } catch (error) {
    console.error(`Search error for query "${query}":`, error);
    return [];
  }
}

/**
 * Scrape content from a URL using BrightData MCP
 */
async function scrapeUrl(url: string): Promise<ScrapedContent | null> {
  try {
    const response = await fetch("/api/mcp/brightdata/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Scrape failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      url,
      title: data.title,
      content: data.content || data.markdown || "",
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Scrape error for URL "${url}":`, error);
    return null;
  }
}

/**
 * Execute batch searches with rate limiting
 */
async function batchSearch(
  queries: string[],
  source: string,
  onProgress?: ProgressCallback
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const limitedQueries = queries.slice(0, MAX_SEARCHES_PER_CATEGORY);

  for (let i = 0; i < limitedQueries.length; i++) {
    const query = limitedQueries[i];
    onProgress?.(
      "searching",
      `Searching ${source}: ${query.slice(0, 40)}...`,
      ((i + 1) / limitedQueries.length) * 100
    );

    const results = await executeSearch(query);
    // Tag results with source
    const taggedResults = results.map(r => ({ ...r, source }));
    allResults.push(...taggedResults);

    if (i < limitedQueries.length - 1) {
      await sleep(SEARCH_DELAY_MS);
    }
  }

  return allResults;
}

/**
 * Scrape URLs with rate limiting
 */
async function batchScrape(
  urls: string[],
  source: string,
  maxUrls: number = MAX_URLS_PER_CATEGORY,
  onProgress?: ProgressCallback
): Promise<ScrapedContent[]> {
  const scraped: ScrapedContent[] = [];
  const uniqueUrls = [...new Set(urls)].slice(0, maxUrls);

  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i];
    try {
      const hostname = new URL(url).hostname;
      onProgress?.(
        "scraping",
        `Scraping ${source}: ${hostname}`,
        ((i + 1) / uniqueUrls.length) * 100
      );
    } catch {
      // Invalid URL, skip
      continue;
    }

    const content = await scrapeUrl(url);
    if (content) {
      scraped.push({ ...content, source });
    }

    if (i < uniqueUrls.length - 1) {
      await sleep(SCRAPE_DELAY_MS);
    }
  }

  return scraped;
}

/**
 * Collect all intelligence data for a brand including UGC platforms
 */
export async function collectIntelligence(
  context: CollectionContext,
  onProgress?: ProgressCallback
): Promise<RawIntelligenceData> {
  const errors: string[] = [];
  const queries = buildSearchQueries(context);
  const platforms: string[] = [];
  let totalSearches = 0;
  let totalScraped = 0;

  const emptyPlatformData = (): PlatformData => ({ searches: [], scraped: [] });

  onProgress?.("starting", "Building search queries...", 0);

  // Initialize result structure
  const result: RawIntelligenceData = {
    competitors: emptyPlatformData(),
    trends: emptyPlatformData(),
    news: emptyPlatformData(),
    social: emptyPlatformData(),
    audience: emptyPlatformData(),
    reddit: emptyPlatformData(),
    amazon: emptyPlatformData(),
    youtube: emptyPlatformData(),
    googleReviews: emptyPlatformData(),
    forums: emptyPlatformData(),
    metadata: {
      collectedAt: new Date().toISOString(),
      totalSearches: 0,
      totalScraped: 0,
      errors: [],
      platforms: [],
    },
  };

  // Phase 1: Core SERP searches (competitors, trends, news)
  onProgress?.("collecting", "Searching for competitor data...", 5);
  result.competitors.searches = await batchSearch(queries.competitors, "competitors");
  totalSearches += queries.competitors.length;
  platforms.push("google");

  onProgress?.("collecting", "Searching for market trends...", 10);
  result.trends.searches = await batchSearch(queries.trends, "trends");
  totalSearches += queries.trends.length;

  onProgress?.("collecting", "Searching for industry news...", 15);
  result.news.searches = await batchSearch(queries.news, "news");
  totalSearches += queries.news.length;

  // Phase 2: UGC Platform searches
  onProgress?.("collecting", "Searching Reddit discussions...", 20);
  result.reddit.searches = await batchSearch(queries.reddit, "reddit");
  totalSearches += queries.reddit.length;
  platforms.push("reddit");

  onProgress?.("collecting", "Searching Amazon reviews...", 28);
  result.amazon.searches = await batchSearch(queries.amazon, "amazon");
  totalSearches += queries.amazon.length;
  platforms.push("amazon");

  onProgress?.("collecting", "Searching YouTube content...", 36);
  result.youtube.searches = await batchSearch(queries.youtube, "youtube");
  totalSearches += queries.youtube.length;
  platforms.push("youtube");

  onProgress?.("collecting", "Searching Google Reviews...", 42);
  result.googleReviews.searches = await batchSearch(queries.googleReviews, "googleReviews");
  totalSearches += queries.googleReviews.length;
  platforms.push("google_reviews");

  onProgress?.("collecting", "Searching forums and review sites...", 48);
  result.forums.searches = await batchSearch(queries.forums, "forums");
  totalSearches += queries.forums.length;
  platforms.push("forums");

  // Phase 3: Audience research
  onProgress?.("collecting", "Researching target audience...", 52);
  result.audience.searches = await batchSearch(queries.audience, "audience");
  totalSearches += queries.audience.length;

  // Phase 4: Scrape top URLs from each category
  onProgress?.("scraping", "Scraping competitor websites...", 55);
  const competitorUrls = result.competitors.searches.slice(0, 3).map(r => r.url);
  result.competitors.scraped = await batchScrape(competitorUrls, "competitors", 3);
  totalScraped += result.competitors.scraped.length;

  onProgress?.("scraping", "Scraping Reddit discussions...", 60);
  const redditUrls = result.reddit.searches
    .filter(r => r.url.includes("reddit.com"))
    .slice(0, 5)
    .map(r => r.url);
  result.reddit.scraped = await batchScrape(redditUrls, "reddit", 5);
  totalScraped += result.reddit.scraped.length;

  onProgress?.("scraping", "Scraping Amazon reviews...", 68);
  const amazonUrls = result.amazon.searches
    .filter(r => r.url.includes("amazon.com"))
    .slice(0, 3)
    .map(r => r.url);
  result.amazon.scraped = await batchScrape(amazonUrls, "amazon", 3);
  totalScraped += result.amazon.scraped.length;

  onProgress?.("scraping", "Scraping YouTube content...", 75);
  const youtubeUrls = result.youtube.searches
    .filter(r => r.url.includes("youtube.com"))
    .slice(0, 3)
    .map(r => r.url);
  result.youtube.scraped = await batchScrape(youtubeUrls, "youtube", 3);
  totalScraped += result.youtube.scraped.length;

  onProgress?.("scraping", "Scraping forum discussions...", 82);
  const forumUrls = result.forums.searches.slice(0, 4).map(r => r.url);
  result.forums.scraped = await batchScrape(forumUrls, "forums", 4);
  totalScraped += result.forums.scraped.length;

  onProgress?.("scraping", "Scraping trend reports...", 88);
  const trendUrls = result.trends.searches.slice(0, 2).map(r => r.url);
  result.trends.scraped = await batchScrape(trendUrls, "trends", 2);
  totalScraped += result.trends.scraped.length;

  onProgress?.("scraping", "Scraping news articles...", 94);
  const newsUrls = result.news.searches.slice(0, 2).map(r => r.url);
  result.news.scraped = await batchScrape(newsUrls, "news", 2);
  totalScraped += result.news.scraped.length;

  onProgress?.("complete", "Data collection complete", 100);

  // Update metadata
  result.metadata = {
    collectedAt: new Date().toISOString(),
    totalSearches,
    totalScraped,
    errors,
    platforms: [...new Set(platforms)],
  };

  return result;
}

/**
 * Direct search using BrightData MCP (server-side)
 */
export async function directSearch(
  query: string,
  mcpSearch: (query: string) => Promise<{ url: string; title: string; description?: string }[]>
): Promise<SearchResult[]> {
  try {
    const results = await mcpSearch(query);
    return results.map((r, i) => ({
      url: r.url,
      title: r.title,
      description: r.description,
      position: i + 1,
    }));
  } catch (error) {
    console.error(`Direct search error for "${query}":`, error);
    return [];
  }
}

/**
 * Direct scrape using BrightData MCP (server-side)
 */
export async function directScrape(
  url: string,
  mcpScrape: (url: string) => Promise<string>
): Promise<ScrapedContent | null> {
  try {
    const content = await mcpScrape(url);
    return {
      url,
      content,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Direct scrape error for "${url}":`, error);
    return null;
  }
}

/**
 * Extract platform name from URL
 */
export function getPlatformFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("reddit")) return "reddit";
    if (hostname.includes("amazon")) return "amazon";
    if (hostname.includes("youtube")) return "youtube";
    if (hostname.includes("google.com/maps")) return "google_reviews";
    if (hostname.includes("yelp")) return "yelp";
    if (hostname.includes("trustpilot")) return "trustpilot";
    if (hostname.includes("g2.com")) return "g2";
    if (hostname.includes("capterra")) return "capterra";
    if (hostname.includes("quora")) return "quora";
    if (hostname.includes("twitter") || hostname.includes("x.com")) return "twitter";
    if (hostname.includes("facebook")) return "facebook";
    if (hostname.includes("instagram")) return "instagram";
    if (hostname.includes("tiktok")) return "tiktok";
    if (hostname.includes("linkedin")) return "linkedin";
    return "web";
  } catch {
    return "web";
  }
}
