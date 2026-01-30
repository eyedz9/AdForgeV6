/**
 * BrightData Search API Endpoint
 *
 * Proxies search requests to BrightData's SERP API.
 * Uses the MCP-compatible search_engine endpoint.
 */

import { NextRequest, NextResponse } from "next/server";

interface SearchRequest {
  query: string;
  engine?: "google" | "bing" | "yandex";
}

interface SearchResult {
  url: string;
  title: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchRequest;

    if (!body.query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const apiKey = process.env.BRIGHTDATA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "BRIGHTDATA_API_KEY not configured" },
        { status: 500 }
      );
    }

    const engine = body.engine || "google";

    // Call BrightData SERP API
    // Format: https://api.brightdata.com/datasets/v3/trigger
    // Or use their SERP collector endpoint
    const response = await fetch(
      "https://api.brightdata.com/serp/req",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: body.query,
          search_engine: engine,
          country: "us",
          pages: 1,
        }),
      }
    );

    if (!response.ok) {
      // Try alternative endpoint format
      const altResponse = await fetch(
        `https://api.brightdata.com/dca/trigger?collector=serp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            query: body.query,
            engine: engine,
          }),
        }
      );

      if (!altResponse.ok) {
        // Final fallback: use Web Unlocker to scrape Google directly
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(body.query)}`;
        const scrapeResponse = await fetch(
          "https://api.brightdata.com/request",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              zone: process.env.BRIGHTDATA_WEB_ZONE || "web_unlocker1",
              url: searchUrl,
              format: "raw",
            }),
          }
        );

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          console.error("BrightData scrape search failed:", errorText);
          return NextResponse.json({ results: [], error: "Search failed" });
        }

        const html = await scrapeResponse.text();
        const results = parseGoogleResults(html);
        return NextResponse.json({ results });
      }

      const altData = await altResponse.json();
      return NextResponse.json({ results: altData.results || [] });
    }

    const data = await response.json();

    // Transform results to standard format
    const results: SearchResult[] = (data.organic || data.results || []).map(
      (r: Record<string, unknown>) => ({
        url: String(r.link || r.url || ""),
        title: String(r.title || ""),
        description: String(r.snippet || r.description || ""),
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("BrightData search error:", error);
    return NextResponse.json(
      { error: "Internal server error", results: [] },
      { status: 500 }
    );
  }
}

/**
 * Parse Google search results from HTML
 */
function parseGoogleResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Match search result divs - looking for links with h3 titles
  const linkPattern = /<a[^>]+href="(https?:\/\/(?!www\.google)[^"]+)"[^>]*>.*?<h3[^>]*>([^<]+)<\/h3>/gi;
  let match;

  while ((match = linkPattern.exec(html)) !== null && results.length < 10) {
    const url = match[1];
    const title = match[2].replace(/&#\d+;/g, " ").trim();

    // Skip Google internal links
    if (!url.includes("google.com") && !url.includes("webcache")) {
      results.push({
        url,
        title,
        description: "", // Would need more parsing for descriptions
      });
    }
  }

  // Fallback: try simpler pattern
  if (results.length === 0) {
    const simplePattern = /href="(https?:\/\/(?!www\.google|webcache)[^"]+)"[^>]*>[^<]*<[^>]*>([^<]{10,})</gi;
    while ((match = simplePattern.exec(html)) !== null && results.length < 10) {
      const url = match[1];
      const title = match[2].trim();
      if (title.length > 5 && !url.includes("google.com")) {
        results.push({ url, title, description: "" });
      }
    }
  }

  return results;
}
