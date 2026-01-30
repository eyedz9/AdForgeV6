/**
 * BrightData Scrape API Endpoint
 *
 * Proxies scrape requests to BrightData's Web Unlocker API.
 * Returns content as markdown or text.
 */

import { NextRequest, NextResponse } from "next/server";

interface ScrapeRequest {
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScrapeRequest;

    if (!body.url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const apiKey = process.env.BRIGHTDATA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "BRIGHTDATA_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Call BrightData Web Unlocker API
    const response = await fetch(
      "https://api.brightdata.com/request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          zone: process.env.BRIGHTDATA_WEB_ZONE || "web_unlocker1",
          url: body.url,
          format: "raw",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`BrightData scrape failed for ${body.url}:`, errorText.slice(0, 200));
      return NextResponse.json({ content: "", error: "Scrape failed" });
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Convert HTML to text content
    const textContent = htmlToText(html);

    return NextResponse.json({
      url: body.url,
      title,
      content: textContent,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("BrightData scrape error:", error);
    return NextResponse.json(
      { error: "Internal server error", content: "" },
      { status: 500 }
    );
  }
}

/**
 * Convert HTML to plain text
 */
function htmlToText(html: string): string {
  return html
    // Remove scripts and styles
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Convert block elements to newlines
    .replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, "\n")
    // Remove remaining tags
    .replace(/<[^>]+>/g, " ")
    // Decode HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    // Clean up whitespace
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim()
    // Limit content size
    .slice(0, 8000);
}
