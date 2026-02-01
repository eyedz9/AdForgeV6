/**
 * IntelligenceTab Component
 *
 * Enhanced market intelligence display with:
 * - SSE progress streaming during generation
 * - Executive Summary section
 * - Persona Suggestions panel
 * - Platform Insights visualization
 * - Content Recommendations
 *
 * Features:
 * - Generate Report button with real-time progress
 * - Display competitors section with source links
 * - Display trends section with lists
 * - Display audience insights
 * - Refresh button for existing reports
 * - Show report expiration date
 */

"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { IntelligenceReport, Product } from "@/lib/supabase/database.types";
import { getProducts } from "@/app/actions/products";
import type {
  CompetitorData,
  SearchTrendData,
  IndustryNewsData,
  SocialConversationData,
  AudienceInsightData,
  AttributedSource,
} from "@/lib/api/brightdata";
import type {
  SentimentAnalysis,
  TopicCluster,
  PurchaseIntentAnalysis,
  CompetitivePositioning,
} from "@/lib/services/intelligence-synthesizer";
import type { MediaAffinityReport } from "@/lib/services/media-affinity-engine";
import IntelligenceProgress from "./IntelligenceProgress";
import PersonaSuggestions from "./PersonaSuggestions";
import PlatformInsights from "./PlatformInsights";
import SentimentDashboard from "./SentimentDashboard";
import TopicClustersSection from "./TopicClustersSection";
import PurchaseIntentSection from "./PurchaseIntentSection";
import CompetitivePositioningSection from "./CompetitivePositioningSection";
import MediaAffinityDashboard from "./MediaAffinityDashboard";
import ExportDropdown from "./ExportDropdown";

// Props for the IntelligenceTab component
interface IntelligenceTabProps {
  brandId: string;
  brandName?: string;
}

// Executive Summary type
interface ExecutiveSummary {
  overview: string;
  keyFindings: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
}

// Persona Suggestion type
interface PersonaSuggestion {
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
}

// Platform Insight type
interface PlatformInsight {
  platform: string;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  keyTopics: string[];
  engagement: string;
  recommendations: string[];
}

// Content Recommendation type
interface ContentRecommendation {
  type: "image" | "video" | "carousel" | "story" | "text";
  platform: string;
  headline: string;
  description: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
}

// Parsed report data with typed arrays
interface ParsedReport {
  id: string;
  brand_id: string;
  product_id: string | null;
  report_type: string | null;
  generated_at: string;
  expires_at: string | null;
  status: string;
  competitors: CompetitorData[];
  search_trends: SearchTrendData[];
  industry_news: IndustryNewsData[];
  social_conversations: SocialConversationData[];
  audience_insights: {
    segments?: AudienceInsightData[];
    totalSegments?: number;
  };
  sources: AttributedSource[];
  executive_summary: ExecutiveSummary | null;
  persona_suggestions: PersonaSuggestion[];
  platform_insights: PlatformInsight[];
  content_recommendations: ContentRecommendation[];
  sentiment_analysis: SentimentAnalysis | null;
  topic_clusters: TopicCluster | null;
  purchase_intent: PurchaseIntentAnalysis | null;
  competitive_positioning: CompetitivePositioning | null;
  media_affinity: MediaAffinityReport | null;
  created_at: string;
  updated_at: string;
}

// Parse a report from the database into typed data
function parseReport(report: IntelligenceReport): ParsedReport {
  let executiveSummary: ExecutiveSummary | null = null;
  if (report.executive_summary) {
    try {
      const parsed = typeof report.executive_summary === "string"
        ? JSON.parse(report.executive_summary)
        : report.executive_summary;
      // Ensure all required properties exist with defaults
      executiveSummary = {
        overview: parsed?.overview ?? "No summary available.",
        keyFindings: Array.isArray(parsed?.keyFindings) ? parsed.keyFindings : [],
        opportunities: Array.isArray(parsed?.opportunities) ? parsed.opportunities : [],
        threats: Array.isArray(parsed?.threats) ? parsed.threats : [],
        recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations : [],
      };
    } catch {
      executiveSummary = null;
    }
  }

  return {
    ...report,
    competitors: (report.competitors as CompetitorData[] | null) ?? [],
    search_trends: (report.search_trends as SearchTrendData[] | null) ?? [],
    industry_news: (report.industry_news as IndustryNewsData[] | null) ?? [],
    social_conversations:
      (report.social_conversations as SocialConversationData[] | null) ?? [],
    audience_insights:
      (report.audience_insights as {
        segments?: AudienceInsightData[];
        totalSegments?: number;
      } | null) ?? {},
    sources: (report.sources as AttributedSource[] | null) ?? [],
    executive_summary: executiveSummary,
    persona_suggestions: (report.persona_suggestions as PersonaSuggestion[] | null) ?? [],
    platform_insights: (report.platform_insights as PlatformInsight[] | null) ?? [],
    content_recommendations: (report.content_recommendations as ContentRecommendation[] | null) ?? [],
    sentiment_analysis: parseSentimentAnalysis(report.sentiment_analysis),
    topic_clusters: parseTopicClusters(report.topic_clusters),
    purchase_intent: parsePurchaseIntent(report.purchase_intent),
    competitive_positioning: parseCompetitivePositioning(report.competitive_positioning),
    media_affinity: parseMediaAffinity(report.media_affinity),
  };
}

function parseSentimentAnalysis(raw: unknown): SentimentAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (!data.overall && (!Array.isArray(data.byPlatform) || data.byPlatform.length === 0)) return null;
  return raw as SentimentAnalysis;
}

function parseTopicClusters(raw: unknown): TopicCluster | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.clusters) || data.clusters.length === 0) return null;
  return raw as TopicCluster;
}

function parsePurchaseIntent(raw: unknown): PurchaseIntentAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.signals) || data.signals.length === 0) return null;
  return raw as PurchaseIntentAnalysis;
}

function parseCompetitivePositioning(raw: unknown): CompetitivePositioning | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const hasData =
    (Array.isArray(data.priceComparison) && data.priceComparison.length > 0) ||
    (Array.isArray(data.featureComparison) && data.featureComparison.length > 0) ||
    (Array.isArray(data.reviewComparison) && data.reviewComparison.length > 0);
  if (!hasData) return null;
  return raw as CompetitivePositioning;
}

function parseMediaAffinity(raw: unknown): MediaAffinityReport | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const hasData =
    (Array.isArray(data.platformAffinity) && data.platformAffinity.length > 0) ||
    (Array.isArray(data.contentFormatAffinity) && data.contentFormatAffinity.length > 0) ||
    (Array.isArray(data.channelRecommendations) && data.channelRecommendations.length > 0);
  if (!hasData) return null;
  return raw as MediaAffinityReport;
}

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Generate a descriptive label for a report based on scope + name
// e.g. "brand_nervive" or "product_nerve_relief"
function buildReportLabel(
  report: ParsedReport,
  brandName: string | undefined,
  products: Product[],
): string {
  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  if (report.product_id) {
    const product = products.find((p) => p.id === report.product_id);
    const name = product?.name || "unknown";
    return `product_${slugify(name)}`;
  }
  return `brand_${slugify(brandName || "report")}`;
}

// Format a short date for history items (no time for compact display)
function formatShortDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Check if report is expired
function isReportExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// Calculate days until expiration
function daysUntilExpiration(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expiration = new Date(expiresAt);
  const diffMs = expiration.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Executive Summary Component
function ExecutiveSummarySection({ summary }: { summary: ExecutiveSummary }) {
  // Safely access arrays with fallbacks
  const keyFindings = summary?.keyFindings ?? [];
  const opportunities = summary?.opportunities ?? [];
  const threats = summary?.threats ?? [];
  const recommendations = summary?.recommendations ?? [];
  const overview = summary?.overview ?? "No summary available.";

  return (
    <div className="executive-summary">
      <p className="summary-overview">{overview}</p>

      <div className="summary-grid">
        {keyFindings.length > 0 && (
          <div className="summary-section findings">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Key Findings
            </h4>
            <ul>
              {keyFindings.map((finding, i) => (
                <li key={i}>{finding}</li>
              ))}
            </ul>
          </div>
        )}

        {opportunities.length > 0 && (
          <div className="summary-section opportunities">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              Opportunities
            </h4>
            <ul>
              {opportunities.map((opp, i) => (
                <li key={i}>{opp}</li>
              ))}
            </ul>
          </div>
        )}

        {threats.length > 0 && (
          <div className="summary-section threats">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Threats
            </h4>
            <ul>
              {threats.map((threat, i) => (
                <li key={i}>{threat}</li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="summary-section recommendations">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Recommendations
            </h4>
            <ul>
              {recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style>{`
        .executive-summary {
        }
        .summary-overview {
          font-size: 1rem;
          color: var(--color-text-secondary);
          line-height: 1.7;
          margin: 0 0 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        .summary-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .summary-section h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 600;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .summary-section.findings h4 { color: var(--color-plasma-violet); }
        .summary-section.findings h4 svg { filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.5)); }
        .summary-section.opportunities h4 { color: var(--color-plasma-emerald); }
        .summary-section.opportunities h4 svg { filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.5)); }
        .summary-section.threats h4 { color: var(--color-plasma-rose); }
        .summary-section.threats h4 svg { filter: drop-shadow(0 0 6px rgba(244, 63, 94, 0.5)); }
        .summary-section.recommendations h4 { color: var(--color-plasma-amber); }
        .summary-section.recommendations h4 svg { filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.5)); }
        .summary-section ul {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }
        .summary-section li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        .summary-section li::marker {
          color: var(--color-text-muted);
        }
        @media (max-width: 768px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// Competitors section component
function CompetitorsSection({
  competitors,
}: {
  competitors: CompetitorData[];
}) {
  if (competitors.length === 0) {
    return (
      <div className="section-empty">
        <p>No competitor data available</p>
      </div>
    );
  }

  return (
    <div className="competitors-grid">
      {competitors.map((competitor, index) => (
        <div key={index} className="competitor-card">
          <div className="competitor-header">
            <h4 className="competitor-name">{competitor.name}</h4>
            {competitor.pricingTier && (
              <span className="pricing-badge">{competitor.pricingTier}</span>
            )}
          </div>
          {competitor.description && (
            <p className="competitor-description">{competitor.description}</p>
          )}
          {competitor.marketPosition && (
            <p className="market-position">
              <strong>Position:</strong> {competitor.marketPosition}
            </p>
          )}
          {competitor.strengths && competitor.strengths.length > 0 && (
            <div className="competitor-list">
              <span className="list-label">Strengths:</span>
              <ul>
                {competitor.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {competitor.uniqueSellingPoints &&
            competitor.uniqueSellingPoints.length > 0 && (
              <div className="competitor-list">
                <span className="list-label">USPs:</span>
                <ul>
                  {competitor.uniqueSellingPoints.map((usp, i) => (
                    <li key={i}>{usp}</li>
                  ))}
                </ul>
              </div>
            )}
          <div className="competitor-footer">
            <a
              href={competitor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="source-link"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Visit Site
            </a>
            {competitor.source && (
              <span className="confidence-badge">
                {Math.round((competitor.source.confidence || 0) * 100)}%
                confidence
              </span>
            )}
          </div>
        </div>
      ))}
      <style>{`
        .competitors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
        .competitor-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .competitor-card:hover {
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 40px -15px rgba(139, 92, 246, 0.2);
        }
        .competitor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .competitor-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .pricing-badge {
          display: inline-flex;
          padding: 0.25rem 0.625rem;
          background: rgba(6, 182, 212, 0.15);
          color: var(--color-plasma-cyan);
          border: 1px solid rgba(6, 182, 212, 0.25);
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .competitor-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.5;
        }
        .market-position {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .market-position strong {
          color: var(--color-text-primary);
        }
        .competitor-list {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .list-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .competitor-list ul {
          margin: 0;
          padding-left: 1rem;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }
        .competitor-list li {
          margin-bottom: 0.25rem;
        }
        .competitor-list li::marker {
          color: var(--color-plasma-violet);
        }
        .competitor-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.875rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          margin-top: auto;
        }
        .source-link {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          color: var(--color-plasma-violet);
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .source-link:hover {
          color: var(--color-plasma-purple);
          text-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }
        .confidence-badge {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

// Trends section component
function TrendsSection({ trends }: { trends: SearchTrendData[] }) {
  if (trends.length === 0) {
    return (
      <div className="section-empty">
        <p>No trend data available</p>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    if (trend === "rising" || trend === "growing") {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    }
    if (trend === "declining") {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  };

  return (
    <div className="trends-list">
      {trends.map((trend, index) => (
        <div key={index} className="trend-item">
          <div className="trend-main">
            <div className="trend-keyword">
              {getTrendIcon((trend as { direction?: string }).direction || trend.trend)}
              <span>{(trend as { name?: string }).name || trend.keyword}</span>
            </div>
            <div className="trend-stats">
              {(trend as { impactLevel?: string }).impactLevel && (
                <span className={`impact-badge ${(trend as { impactLevel?: string }).impactLevel}`}>
                  {(trend as { impactLevel?: string }).impactLevel} impact
                </span>
              )}
            </div>
          </div>
          {(trend as { description?: string }).description && (
            <p className="trend-description">{(trend as { description?: string }).description}</p>
          )}
        </div>
      ))}
      <style>{`
        .trends-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .trend-item {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.125rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .trend-item:hover {
          border-color: rgba(139, 92, 246, 0.2);
          background: var(--color-elevated);
        }
        .trend-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .trend-keyword {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .trend-keyword svg {
          filter: drop-shadow(0 0 6px currentColor);
        }
        .trend-stats {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .impact-badge {
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .impact-badge.high {
          background: rgba(244, 63, 94, 0.15);
          color: var(--color-plasma-rose);
          border: 1px solid rgba(244, 63, 94, 0.25);
        }
        .impact-badge.medium {
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-plasma-amber);
          border: 1px solid rgba(245, 158, 11, 0.25);
        }
        .impact-badge.low {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-plasma-emerald);
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .trend-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

// Audience insights section component
function AudienceSection({
  insights,
}: {
  insights: { segments?: AudienceInsightData[]; totalSegments?: number };
}) {
  const segments = insights.segments ?? [];

  if (segments.length === 0) {
    return (
      <div className="section-empty">
        <p>No audience insights available</p>
      </div>
    );
  }

  return (
    <div className="audience-grid">
      {segments.map((segment, index) => (
        <div key={index} className="audience-card">
          <h4 className="audience-name">{(segment as { name?: string }).name || segment.segment}</h4>
          <p className="audience-description">{segment.description}</p>
          {segment.demographics && (
            <div className="audience-demographics">
              {segment.demographics.ageRange && (
                <span className="demo-field">
                  <strong>Age:</strong> {segment.demographics.ageRange}
                  {segment.demographics.confidenceScores?.age != null && (
                    <span className="confidence-dot" style={{ opacity: segment.demographics.confidenceScores.age }} title={`${Math.round(segment.demographics.confidenceScores.age * 100)}% confidence`} />
                  )}
                </span>
              )}
              {segment.demographics.gender && (
                <span className="demo-field">
                  <strong>Gender:</strong> {segment.demographics.gender}
                  {segment.demographics.confidenceScores?.gender != null && (
                    <span className="confidence-dot" style={{ opacity: segment.demographics.confidenceScores.gender }} title={`${Math.round(segment.demographics.confidenceScores.gender * 100)}% confidence`} />
                  )}
                </span>
              )}
              {segment.demographics.income && (
                <span className="demo-field">
                  <strong>Income:</strong> {segment.demographics.income}
                  {segment.demographics.confidenceScores?.income != null && (
                    <span className="confidence-dot" style={{ opacity: segment.demographics.confidenceScores.income }} title={`${Math.round(segment.demographics.confidenceScores.income * 100)}% confidence`} />
                  )}
                </span>
              )}
            </div>
          )}
          {segment.lifeStageSignals && segment.lifeStageSignals.length > 0 && (
            <div className="audience-tags">
              <span className="tag-label">Life Stage:</span>
              {segment.lifeStageSignals.map((ls: { lifeStage: string; confidence: number }, i: number) => (
                <span key={i} className="life-stage-tag" style={{ opacity: 0.5 + ls.confidence * 0.5 }}>
                  {ls.lifeStage.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
          {segment.culturalAffinityMarkers && segment.culturalAffinityMarkers.length > 0 && (
            <div className="audience-tags">
              <span className="tag-label">Cultural Affinity:</span>
              {segment.culturalAffinityMarkers.map((ca: { marker: string; strength: string }, i: number) => {
                const strengthColors: Record<string, string> = {
                  strong: "var(--color-plasma-emerald)",
                  moderate: "var(--color-plasma-amber)",
                  weak: "var(--color-text-muted)",
                };
                return (
                  <span key={i} className="cultural-tag" style={{ color: strengthColors[ca.strength] || "var(--color-text-muted)", borderColor: strengthColors[ca.strength] || "var(--color-text-muted)" }}>
                    {ca.marker}
                  </span>
                );
              })}
            </div>
          )}
          {segment.interests && segment.interests.length > 0 && (
            <div className="audience-tags">
              <span className="tag-label">Interests:</span>
              {segment.interests.slice(0, 4).map((int, i) => (
                <span key={i} className="interest-tag">{int}</span>
              ))}
            </div>
          )}
          {segment.painPoints && segment.painPoints.length > 0 && (
            <div className="audience-tags">
              <span className="tag-label">Pain Points:</span>
              {segment.painPoints.slice(0, 3).map((pp, i) => (
                <span key={i} className="pain-tag">{pp}</span>
              ))}
            </div>
          )}
        </div>
      ))}
      <style>{`
        .audience-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1rem;
        }
        .audience-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.375rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .audience-card:hover {
          border-color: rgba(6, 182, 212, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 40px -15px rgba(6, 182, 212, 0.15);
        }
        .audience-name {
          font-size: 1.0625rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .audience-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.6;
        }
        .audience-demographics {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }
        .audience-demographics strong {
          color: var(--color-text-primary);
        }
        .audience-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          align-items: center;
        }
        .tag-label {
          font-size: 0.625rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-right: 0.375rem;
        }
        .interest-tag {
          display: inline-flex;
          padding: 0.25rem 0.5rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 500;
        }
        .pain-tag {
          display: inline-flex;
          padding: 0.25rem 0.5rem;
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-plasma-amber);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 500;
        }
        .demo-field {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
        }
        .confidence-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-plasma-emerald);
          flex-shrink: 0;
        }
        .life-stage-tag {
          display: inline-flex;
          padding: 0.25rem 0.5rem;
          background: rgba(6, 182, 212, 0.15);
          color: var(--color-plasma-cyan);
          border: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        .cultural-tag {
          display: inline-flex;
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

// Sources section component
function SourcesSection({ sources }: { sources: AttributedSource[] }) {
  if (sources.length === 0) return null;

  const uniqueSources = Array.from(
    new Map(sources.map((s) => [s.url, s])).values()
  );

  return (
    <div className="sources-section">
      <h4 className="sources-title">Data Sources ({uniqueSources.length})</h4>
      <div className="sources-list">
        {uniqueSources.slice(0, 10).map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-item"
          >
            <span className="source-name">{source.name}</span>
            <span className="source-confidence">
              {Math.round((source.confidence || 0) * 100)}%
            </span>
          </a>
        ))}
        {uniqueSources.length > 10 && (
          <span className="sources-more">
            +{uniqueSources.length - 10} more sources
          </span>
        )}
      </div>
      <style>{`
        .sources-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .sources-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-muted);
          margin: 0 0 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .sources-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .source-item {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4375rem 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .source-item:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.2);
          color: var(--color-text-primary);
        }
        .source-name {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .source-confidence {
          font-size: 0.625rem;
          font-weight: 600;
          color: var(--color-plasma-cyan);
          padding: 0.125rem 0.375rem;
          background: rgba(6, 182, 212, 0.1);
          border-radius: 4px;
        }
        .sources-more {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          padding: 0.375rem;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

// Loading state component
function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>Loading intelligence reports...</p>
      <style>{`
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          gap: 1.25rem;
        }
        .loading-spinner {
          width: 44px;
          height: 44px;
          border: 3px solid rgba(139, 92, 246, 0.15);
          border-top-color: var(--color-plasma-violet);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-state p {
          color: var(--color-text-secondary);
          margin: 0;
          font-size: 0.9375rem;
        }
      `}</style>
    </div>
  );
}

// Empty state component
function EmptyState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>
      <h3 className="empty-title">No Intelligence Reports</h3>
      <p className="empty-description">
        Generate a market intelligence report to discover competitors, trends,
        and audience insights for your brand.
      </p>
      <button
        className="btn-generate"
        onClick={onGenerate}
        disabled={isGenerating}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        Generate Report
      </button>
      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          background: var(--color-surface);
          border: 1px dashed rgba(139, 92, 246, 0.3);
          border-radius: 16px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .empty-state::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .empty-icon {
          color: var(--color-plasma-violet);
          margin-bottom: 1.5rem;
          opacity: 0.7;
          filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.3));
        }
        .empty-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.625rem;
          letter-spacing: -0.02em;
        }
        .empty-description {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0 0 1.75rem;
          max-width: 420px;
          line-height: 1.6;
        }
        .btn-generate {
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
          position: relative;
          overflow: hidden;
        }
        .btn-generate::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .btn-generate:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 40px rgba(139, 92, 246, 0.4), 0 10px 30px -10px rgba(139, 92, 246, 0.5);
        }
        .btn-generate:hover:not(:disabled)::before {
          transform: translateX(100%);
        }
        .btn-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// Error state component
function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-state">
      <div className="error-icon">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="error-title">Failed to load reports</h3>
      <p className="error-message">{error}</p>
      <button className="btn-retry" onClick={onRetry}>
        Try Again
      </button>
      <style>{`
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          background: var(--color-surface);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 16px;
          text-align: center;
          position: relative;
        }
        .error-state::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(244, 63, 94, 0.05) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 16px;
        }
        .error-icon {
          color: var(--color-plasma-rose);
          margin-bottom: 1.25rem;
          filter: drop-shadow(0 0 15px rgba(244, 63, 94, 0.4));
        }
        .error-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.625rem;
          letter-spacing: -0.02em;
        }
        .error-message {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0 0 1.75rem;
          max-width: 400px;
          line-height: 1.5;
        }
        .btn-retry {
          display: inline-flex;
          align-items: center;
          padding: 0.75rem 1.25rem;
          background: transparent;
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-retry:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.6);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}

// Main IntelligenceTab component
export default function IntelligenceTab({ brandId, brandName }: IntelligenceTabProps) {
  const [reports, setReports] = useState<ParsedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScopePicker, setShowScopePicker] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<"brand" | string>("brand");
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number>(0);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState<boolean>(false);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    personas: false,
    competitors: false,
    trends: false,
    audience: false,
    platforms: false,
    sentiment: false,
    topicClusters: false,
    purchaseIntent: false,
    competitivePositioning: false,
    mediaAffinity: false,
  });

  // Fetch products for scope picker
  useEffect(() => {
    getProducts(brandId).then((result) => {
      if (result.success) {
        setProducts(result.data);
      }
    });
  }, [brandId]);

  // Group reports by scope (brand vs product)
  const groupedReports = useMemo(() => {
    const groups: Record<string, ParsedReport[]> = { brand: [] };
    for (const product of products) {
      groups[product.id] = [];
    }
    for (const report of reports) {
      const key = report.product_id ?? "brand";
      if (!groups[key]) groups[key] = [];
      groups[key].push(report);
    }
    return groups;
  }, [reports, products]);

  const scopeReports = groupedReports[selectedScope] || [];
  const currentReport = scopeReports[selectedHistoryIndex] ?? null;

  // Build scope tab items
  const scopeTabs = useMemo(() => {
    const tabs: { key: string; label: string; count: number; hasReports: boolean }[] = [
      { key: "brand", label: brandName || "Brand", count: groupedReports.brand?.length || 0, hasReports: (groupedReports.brand?.length || 0) > 0 },
    ];
    for (const product of products) {
      const count = groupedReports[product.id]?.length || 0;
      tabs.push({ key: product.id, label: product.name, count, hasReports: count > 0 });
    }
    return tabs;
  }, [products, groupedReports, brandName]);

  // Reset history index when scope changes
  useEffect(() => {
    setSelectedHistoryIndex(0);
    setShowHistoryDropdown(false);
  }, [selectedScope]);

  // Click-outside handler for history dropdown
  useEffect(() => {
    if (!showHistoryDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(e.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHistoryDropdown]);

  // Fetch existing reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/generate/intelligence?brand_id=${brandId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch reports");
      }

      const parsedReports = (data.reports || []).map(parseReport);
      setReports(parsedReports);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }

    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Generate report for the currently selected scope (no scope picker needed)
  const handleGenerateReport = () => {
    const productId = selectedScope === "brand" ? null : selectedScope;
    startGeneration(productId);
  };

  // Show scope picker for new report (lets user pick a different scope)
  const handleNewReport = () => {
    setSelectedProductId(null);
    setShowScopePicker(true);
    setError(null);
  };

  // Start generating report after scope selection
  const startGeneration = (productId: string | null) => {
    setSelectedProductId(productId);
    setSelectedScope(productId ?? "brand");
    setShowScopePicker(false);
    setIsGenerating(true);
    setError(null);
  };

  // Handle generation complete
  const handleGenerationComplete = useCallback(() => {
    setIsGenerating(false);
    fetchReports();
  }, [fetchReports]);

  // Handle generation error
  const handleGenerationError = useCallback((errorMessage: string) => {
    setIsGenerating(false);
    setError(errorMessage);
  }, []);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Loading state
  if (loading) {
    return <LoadingState />;
  }

  // Error state (only if no reports)
  if (error && reports.length === 0) {
    return <ErrorState error={error} onRetry={fetchReports} />;
  }

  // Generating state with progress
  if (isGenerating) {
    return (
      <IntelligenceProgress
        brandId={brandId}
        productId={selectedProductId}
        onComplete={handleGenerationComplete}
        onError={handleGenerationError}
      />
    );
  }

  // Scope picker overlay
  const scopePickerOverlay = showScopePicker && (
    <div className="scope-picker-overlay" onClick={() => setShowScopePicker(false)}>
      <div className="scope-picker" onClick={(e) => e.stopPropagation()}>
        <div className="scope-picker-header">
          <h3>Choose Research Scope</h3>
          <button className="scope-picker-close" onClick={() => setShowScopePicker(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="scope-options">
          <button
            className="scope-option"
            onClick={() => startGeneration(null)}
          >
            <div className="scope-option-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div className="scope-option-text">
              <span className="scope-option-title">Brand Research</span>
              <span className="scope-option-desc">
                General market intelligence &mdash; competitors, trends, audience insights across your entire brand.
              </span>
            </div>
            <svg className="scope-option-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {products.length > 0 && (
            <div className="scope-product-section">
              <div className="scope-product-label">Product Research</div>
              <p className="scope-product-desc">
                Deep-dive into a specific product &mdash; includes targeted audience, competitive, and purchase intent analysis.
              </p>
              <div className="scope-product-list">
                {products.map((product) => (
                  <button
                    key={product.id}
                    className="scope-product-item"
                    onClick={() => startGeneration(product.id)}
                  >
                    <div className="scope-product-info">
                      <span className="scope-product-name">{product.name}</span>
                      {product.product_type && (
                        <span className="scope-product-type">{product.product_type}</span>
                      )}
                    </div>
                    <svg className="scope-option-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <style>{`
          .scope-picker-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.15s ease;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .scope-picker {
            background: var(--color-surface, #1a1a2e);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 16px;
            width: 90%;
            max-width: 480px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.2s ease;
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .scope-picker-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .scope-picker-header h3 {
            margin: 0;
            font-size: 1.125rem;
            font-weight: 700;
            color: var(--color-text-primary, #fff);
            letter-spacing: -0.02em;
          }
          .scope-picker-close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: none;
            background: rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            color: var(--color-text-secondary, #999);
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .scope-picker-close:hover {
            background: rgba(255, 255, 255, 0.12);
            color: var(--color-text-primary, #fff);
          }
          .scope-options {
            padding: 1rem 1.5rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .scope-option {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1.25rem;
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 12px;
            background: rgba(139, 92, 246, 0.04);
            cursor: pointer;
            text-align: left;
            transition: all 0.2s ease;
            color: var(--color-text-primary, #fff);
            width: 100%;
          }
          .scope-option:hover {
            background: rgba(139, 92, 246, 0.1);
            border-color: rgba(139, 92, 246, 0.5);
            transform: translateY(-1px);
          }
          .scope-option-icon {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            background: rgba(139, 92, 246, 0.12);
            border-radius: 10px;
            color: var(--color-plasma-violet, #8b5cf6);
          }
          .scope-option-text {
            flex: 1;
            min-width: 0;
          }
          .scope-option-title {
            display: block;
            font-size: 0.9375rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
          }
          .scope-option-desc {
            display: block;
            font-size: 0.8125rem;
            color: var(--color-text-secondary, #999);
            line-height: 1.45;
          }
          .scope-option-arrow {
            flex-shrink: 0;
            color: var(--color-text-secondary, #999);
            opacity: 0.5;
          }
          .scope-product-section {
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 1rem 1.25rem;
          }
          .scope-product-label {
            font-size: 0.9375rem;
            font-weight: 600;
            color: var(--color-text-primary, #fff);
            margin-bottom: 0.25rem;
          }
          .scope-product-desc {
            font-size: 0.8125rem;
            color: var(--color-text-secondary, #999);
            line-height: 1.45;
            margin: 0 0 0.75rem;
          }
          .scope-product-list {
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
          }
          .scope-product-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.625rem 0.875rem;
            border: 1px solid rgba(139, 92, 246, 0.15);
            border-radius: 8px;
            background: rgba(139, 92, 246, 0.04);
            cursor: pointer;
            text-align: left;
            transition: all 0.15s ease;
            color: var(--color-text-primary, #fff);
            width: 100%;
          }
          .scope-product-item:hover {
            background: rgba(139, 92, 246, 0.1);
            border-color: rgba(139, 92, 246, 0.4);
          }
          .scope-product-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-width: 0;
          }
          .scope-product-name {
            font-size: 0.875rem;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .scope-product-type {
            font-size: 0.6875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 0.125rem 0.5rem;
            background: rgba(139, 92, 246, 0.15);
            border-radius: 4px;
            color: var(--color-plasma-violet, #8b5cf6);
            flex-shrink: 0;
          }
        `}</style>
      </div>
    </div>
  );

  // Empty state (no reports at all)
  if (reports.length === 0) {
    return (
      <>
        <EmptyState onGenerate={handleNewReport} isGenerating={isGenerating} />
        {scopePickerOverlay}
      </>
    );
  }

  const isExpired = currentReport ? isReportExpired(currentReport.expires_at) : false;
  const daysLeft = currentReport ? daysUntilExpiration(currentReport.expires_at) : null;

  // Find the product name for the selected scope
  const selectedProductName = selectedScope !== "brand"
    ? products.find(p => p.id === selectedScope)?.name
    : null;

  return (
    <>
    <div className="intelligence-tab">
      {/* Scope Navigator */}
      <div className="scope-navigator">
        <div className="scope-tabs">
          {scopeTabs.map((tab) => (
            <button
              key={tab.key}
              className={`scope-tab ${selectedScope === tab.key ? "active" : ""} ${!tab.hasReports ? "no-reports" : ""}`}
              onClick={() => setSelectedScope(tab.key)}
            >
              {tab.key === "brand" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              )}
              <span className="scope-tab-label">{tab.label}</span>
              {tab.count > 0 && <span className="scope-tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>
        <button className="btn-new-report" onClick={handleNewReport} title="New report with scope picker">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Per-scope empty state */}
      {!currentReport && (
        <div className="scope-empty-state">
          <div className="scope-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h3 className="scope-empty-title">
            {selectedScope === "brand"
              ? "No brand-level report yet"
              : `No report for ${selectedProductName || "this product"}`}
          </h3>
          <p className="scope-empty-desc">
            {selectedScope === "brand"
              ? "Generate a brand intelligence report to discover competitors, trends, and audience insights."
              : `Generate a product-specific report for targeted audience, competitive, and purchase intent analysis.`}
          </p>
          <button className="btn-generate" onClick={handleGenerateReport} disabled={isGenerating}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Generate Report
          </button>
        </div>
      )}

      {/* Report content — only when a report exists for this scope */}
      {currentReport && (
      <>
      {/* Report Header */}
      <div className="report-header">
        <div className="report-info">
          <h3 className="report-title">
            {selectedScope === "brand" ? "Brand Intelligence Report" : "Product Report"}
            {selectedScope !== "brand" && selectedProductName && (
              <span className="report-scope-badge">{selectedProductName}</span>
            )}
            {currentReport.report_type && (
              <span className="report-type">{currentReport.report_type}</span>
            )}
          </h3>
          <span className="report-label-slug">{buildReportLabel(currentReport, brandName, products)}</span>
          <div className="report-meta">
            <span>Generated {formatDate(currentReport.generated_at)}</span>
            {scopeReports.length > 1 && (
              <div className="history-container" ref={historyDropdownRef}>
                <button
                  className="history-toggle"
                  onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                >
                  {selectedHistoryIndex + 1} / {scopeReports.length}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showHistoryDropdown && (
                  <div className="history-dropdown">
                    {scopeReports.map((r, i) => (
                      <button
                        key={r.id}
                        className={`history-item ${i === selectedHistoryIndex ? "active" : ""}`}
                        onClick={() => {
                          setSelectedHistoryIndex(i);
                          setShowHistoryDropdown(false);
                        }}
                      >
                        <div className="history-item-info">
                          <span className="history-item-label">{buildReportLabel(r, brandName, products)}</span>
                          <span className="history-item-date">{formatShortDate(r.generated_at)}</span>
                        </div>
                        <span className="history-item-badges">
                          {i === 0 && <span className="history-badge latest">Latest</span>}
                          {isReportExpired(r.expires_at) && <span className="history-badge expired">Expired</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {currentReport.expires_at && (
              <span className={`expiry-badge ${isExpired ? "expired" : daysLeft != null && daysLeft <= 7 ? "expiring" : ""}`}>
                {isExpired
                  ? "Expired"
                  : daysLeft != null
                    ? `Expires in ${daysLeft} days`
                    : ""}
              </span>
            )}
          </div>
        </div>
        <div className="report-actions">
          <ExportDropdown report={currentReport} brandName={brandName || "report"} />
          <button
            className="btn-refresh"
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh Report
          </button>
        </div>
      </div>

      {/* Error message if any */}
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Executive Summary (if available) */}
      {currentReport.executive_summary && (
        <section className="report-section">
          <button
            className="section-header"
            onClick={() => toggleSection("summary")}
          >
            <div className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>Executive Summary</span>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`chevron ${expandedSections.summary ? "expanded" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.summary && (
            <div className="section-content">
              <ExecutiveSummarySection summary={currentReport.executive_summary} />
            </div>
          )}
        </section>
      )}

      {/* Persona Suggestions (if available) */}
      {currentReport.persona_suggestions && currentReport.persona_suggestions.length > 0 && (
        <section className="report-section">
          <button
            className="section-header"
            onClick={() => toggleSection("personas")}
          >
            <div className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Persona Suggestions</span>
              <span className="section-count">{currentReport.persona_suggestions.length}</span>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`chevron ${expandedSections.personas ? "expanded" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.personas && (
            <div className="section-content">
              <PersonaSuggestions
                suggestions={currentReport.persona_suggestions}
                brandId={brandId}
                reportId={currentReport.id}
              />
            </div>
          )}
        </section>
      )}

      {/* Platform Insights & Content Recommendations */}
      {((currentReport.platform_insights && currentReport.platform_insights.length > 0) ||
        (currentReport.content_recommendations && currentReport.content_recommendations.length > 0)) && (
        <section className="report-section">
          <button
            className="section-header"
            onClick={() => toggleSection("platforms")}
          >
            <div className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Platform Insights & Content</span>
              <span className="section-count">
                {(currentReport.platform_insights?.length || 0) + (currentReport.content_recommendations?.length || 0)}
              </span>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`chevron ${expandedSections.platforms ? "expanded" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.platforms && (
            <div className="section-content">
              <PlatformInsights
                insights={currentReport.platform_insights}
                recommendations={currentReport.content_recommendations}
              />
            </div>
          )}
        </section>
      )}

      {/* Sentiment Analysis Section */}
      {currentReport.sentiment_analysis && (
        <section className="report-section">
          <button
            className="section-header"
            onClick={() => toggleSection("sentiment")}
          >
            <div className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
              <span>Sentiment Analysis</span>
              {currentReport.sentiment_analysis.byPlatform && (
                <span className="section-count">{currentReport.sentiment_analysis.byPlatform.length} platforms</span>
              )}
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`chevron ${expandedSections.sentiment ? "expanded" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.sentiment && (
            <div className="section-content">
              <SentimentDashboard data={currentReport.sentiment_analysis} />
            </div>
          )}
        </section>
      )}

      {/* Topic Clusters Section */}
      {currentReport.topic_clusters && (
        <section className="report-section">
          <button
            className="section-header"
            onClick={() => toggleSection("topicClusters")}
          >
            <div className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <circle cx="19" cy="6" r="2" />
                <circle cx="5" cy="6" r="2" />
                <circle cx="19" cy="18" r="2" />
                <circle cx="5" cy="18" r="2" />
                <line x1="14" y1="10" x2="17.5" y2="7.5" />
                <line x1="10" y1="10" x2="6.5" y2="7.5" />
                <line x1="14" y1="14" x2="17.5" y2="16.5" />
                <line x1="10" y1="14" x2="6.5" y2="16.5" />
              </svg>
              <span>Topic Clusters</span>
              {currentReport.topic_clusters.clusters && (
                <span className="section-count">{currentReport.topic_clusters.clusters.length}</span>
              )}
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`chevron ${expandedSections.topicClusters ? "expanded" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.topicClusters && (
            <div className="section-content">
              <TopicClustersSection data={currentReport.topic_clusters} />
            </div>
          )}
        </section>
      )}

      {/* Purchase Intent Section */}
      {currentReport.purchase_intent && (
        <section className="report-section">
          <button
            className="section-header"
            onClick={() => toggleSection("purchaseIntent")}
          >
            <div className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <span>Purchase Intent</span>
              {currentReport.purchase_intent.signals && (
                <span className="section-count">{currentReport.purchase_intent.signals.length} signals</span>
              )}
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`chevron ${expandedSections.purchaseIntent ? "expanded" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.purchaseIntent && (
            <div className="section-content">
              <PurchaseIntentSection data={currentReport.purchase_intent} />
            </div>
          )}
        </section>
      )}

      {/* Competitive Positioning Section */}
      {currentReport.competitive_positioning && (
        <section className="report-section">
          <button
            className="section-header"
            onClick={() => toggleSection("competitivePositioning")}
          >
            <div className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Competitive Positioning</span>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`chevron ${expandedSections.competitivePositioning ? "expanded" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.competitivePositioning && (
            <div className="section-content">
              <CompetitivePositioningSection data={currentReport.competitive_positioning} />
            </div>
          )}
        </section>
      )}

      {/* Media Affinity Section */}
      {currentReport.media_affinity && (
        <section className="report-section">
          <button
            className="section-header"
            onClick={() => toggleSection("mediaAffinity")}
          >
            <div className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
              <span>Media Affinity</span>
              {currentReport.media_affinity.channelRecommendations && (
                <span className="section-count">{currentReport.media_affinity.channelRecommendations.length} channels</span>
              )}
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`chevron ${expandedSections.mediaAffinity ? "expanded" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.mediaAffinity && (
            <div className="section-content">
              <MediaAffinityDashboard data={currentReport.media_affinity} />
            </div>
          )}
        </section>
      )}

      {/* Competitors Section */}
      <section className="report-section">
        <button
          className="section-header"
          onClick={() => toggleSection("competitors")}
        >
          <div className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Competitors</span>
            <span className="section-count">{currentReport.competitors.length}</span>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`chevron ${expandedSections.competitors ? "expanded" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {expandedSections.competitors && (
          <div className="section-content">
            <CompetitorsSection competitors={currentReport.competitors} />
          </div>
        )}
      </section>

      {/* Trends Section */}
      <section className="report-section">
        <button
          className="section-header"
          onClick={() => toggleSection("trends")}
        >
          <div className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <span>Market Trends</span>
            <span className="section-count">{currentReport.search_trends.length}</span>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`chevron ${expandedSections.trends ? "expanded" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {expandedSections.trends && (
          <div className="section-content">
            <TrendsSection trends={currentReport.search_trends} />
          </div>
        )}
      </section>

      {/* Audience Insights Section */}
      <section className="report-section">
        <button
          className="section-header"
          onClick={() => toggleSection("audience")}
        >
          <div className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Audience Insights</span>
            <span className="section-count">{currentReport.audience_insights.totalSegments ?? 0}</span>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`chevron ${expandedSections.audience ? "expanded" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {expandedSections.audience && (
          <div className="section-content">
            <AudienceSection insights={currentReport.audience_insights} />
          </div>
        )}
      </section>

      {/* Sources */}
      <SourcesSection sources={currentReport.sources} />
      </>
      )}

      <style>{`
        .intelligence-tab {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Scope Navigator */
        .scope-navigator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 0.5rem;
        }
        .scope-tabs {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          flex: 1;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scope-tabs::-webkit-scrollbar {
          display: none;
        }
        .scope-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          color: var(--color-text-secondary);
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .scope-tab:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--color-text-primary);
        }
        .scope-tab.active {
          background: rgba(139, 92, 246, 0.12);
          border-color: rgba(139, 92, 246, 0.3);
          color: var(--color-plasma-violet);
          font-weight: 600;
        }
        .scope-tab.active svg {
          filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.5));
        }
        .scope-tab.no-reports {
          opacity: 0.5;
        }
        .scope-tab.no-reports.active {
          opacity: 1;
        }
        .scope-tab-label {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .scope-tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 0.25rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border-radius: 9px;
          font-size: 0.625rem;
          font-weight: 700;
        }
        .btn-new-report {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 8px;
          background: rgba(139, 92, 246, 0.08);
          color: var(--color-plasma-violet);
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .btn-new-report:hover {
          background: rgba(139, 92, 246, 0.18);
          border-color: rgba(139, 92, 246, 0.5);
          transform: scale(1.05);
        }

        /* Report Scope Badge */
        .report-scope-badge {
          display: inline-flex;
          padding: 0.25rem 0.75rem;
          background: rgba(6, 182, 212, 0.15);
          color: var(--color-plasma-cyan);
          border: 1px solid rgba(6, 182, 212, 0.25);
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* History Dropdown */
        .history-container {
          position: relative;
        }
        .history-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.625rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: var(--color-text-secondary);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .history-toggle:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.3);
          color: var(--color-plasma-violet);
        }
        .history-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 260px;
          background: var(--color-elevated, #1e1e36);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 10px;
          padding: 0.375rem;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          z-index: 100;
          animation: slideUp 0.15s ease;
        }
        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--color-text-secondary);
          font-size: 0.8125rem;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }
        .history-item:hover {
          background: rgba(139, 92, 246, 0.1);
          color: var(--color-text-primary);
        }
        .history-item.active {
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          font-weight: 600;
        }
        .history-item-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          flex: 1;
          min-width: 0;
        }
        .history-item-label {
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .history-item-date {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
        }
        .history-item-badges {
          display: flex;
          gap: 0.25rem;
        }
        .history-badge {
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .history-badge.latest {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-plasma-emerald);
        }
        .history-badge.expired {
          background: rgba(244, 63, 94, 0.15);
          color: var(--color-plasma-rose);
        }

        /* Per-scope Empty State */
        .scope-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          background: var(--color-surface);
          border: 1px dashed rgba(139, 92, 246, 0.25);
          border-radius: 16px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .scope-empty-state::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.04) 0%, transparent 70%);
          pointer-events: none;
        }
        .scope-empty-icon {
          color: var(--color-plasma-violet);
          margin-bottom: 1.25rem;
          opacity: 0.6;
          filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.3));
        }
        .scope-empty-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }
        .scope-empty-desc {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0 0 1.5rem;
          max-width: 380px;
          line-height: 1.6;
        }

        /* Report Header */
        .report-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-elevated) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
        }
        .report-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--color-plasma-violet), var(--color-plasma-cyan), transparent);
          opacity: 0.4;
        }
        .report-info {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .report-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.875rem;
          letter-spacing: -0.02em;
        }
        .report-type {
          display: inline-flex;
          padding: 0.25rem 0.75rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 8px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .report-label-slug {
          font-size: 0.75rem;
          font-family: monospace;
          color: var(--color-text-muted);
          opacity: 0.7;
          letter-spacing: 0.02em;
        }
        .report-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }
        .expiry-badge {
          display: inline-flex;
          padding: 0.25rem 0.625rem;
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-plasma-emerald);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .expiry-badge.expiring {
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-plasma-amber);
          border-color: rgba(245, 158, 11, 0.25);
        }
        .expiry-badge.expired {
          background: rgba(244, 63, 94, 0.15);
          color: var(--color-plasma-rose);
          border-color: rgba(244, 63, 94, 0.25);
        }
        .report-actions {
          display: flex;
          gap: 0.75rem;
        }
        .btn-refresh {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
          position: relative;
          overflow: hidden;
        }
        .btn-refresh::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .btn-refresh:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.4), 0 8px 25px -8px rgba(139, 92, 246, 0.4);
        }
        .btn-refresh:hover:not(:disabled)::before {
          transform: translateX(100%);
        }
        .btn-refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Error Banner */
        .error-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.25);
          border-radius: 12px;
        }
        .error-banner p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--color-plasma-rose);
        }
        .error-banner button {
          background: none;
          border: none;
          color: var(--color-plasma-rose);
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: opacity 0.2s;
        }
        .error-banner button:hover {
          opacity: 0.8;
        }

        /* Report Sections */
        .report-section {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .report-section:hover {
          border-color: rgba(139, 92, 246, 0.15);
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 1.125rem 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s ease;
        }
        .section-header:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          letter-spacing: -0.01em;
        }
        .section-title svg {
          color: var(--color-plasma-violet);
          filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.4));
        }
        .section-count {
          display: inline-flex;
          padding: 0.1875rem 0.625rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
        }
        .chevron {
          color: var(--color-text-muted);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .chevron.expanded {
          transform: rotate(180deg);
        }
        .section-content {
          padding: 0 1.5rem 1.5rem;
        }
        .section-empty {
          padding: 2.5rem;
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.9375rem;
        }
        .section-empty p {
          margin: 0;
        }

        @media (max-width: 640px) {
          .scope-navigator {
            border-radius: 10px;
          }
          .scope-tab {
            padding: 0.375rem 0.625rem;
            font-size: 0.75rem;
          }
          .scope-tab-label {
            max-width: 80px;
          }
          .report-header {
            flex-direction: column;
            padding: 1.25rem;
          }
          .report-title {
            flex-wrap: wrap;
          }
          .report-actions {
            width: 100%;
          }
          .btn-refresh {
            flex: 1;
            justify-content: center;
          }
          .section-header {
            padding: 1rem 1.25rem;
          }
          .section-content {
            padding: 0 1.25rem 1.25rem;
          }
          .history-dropdown {
            min-width: 220px;
          }
        }
      `}</style>
    </div>
    {scopePickerOverlay}
    </>
  );
}