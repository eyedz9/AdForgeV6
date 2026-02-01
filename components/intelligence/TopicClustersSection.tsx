"use client";

import { useState } from "react";
import type { TopicCluster } from "@/lib/services/intelligence-synthesizer";

interface TopicClustersSectionProps {
  data: TopicCluster;
}

function getSentimentColor(score: number): string {
  if (score > 0.2) return "var(--color-plasma-emerald)";
  if (score < -0.2) return "var(--color-plasma-rose)";
  return "var(--color-plasma-amber)";
}

function getSentimentBg(score: number): string {
  if (score > 0.2) return "rgba(16, 185, 129, 0.15)";
  if (score < -0.2) return "rgba(244, 63, 94, 0.15)";
  return "rgba(245, 158, 11, 0.15)";
}

function getRelevanceColor(score: number): string {
  if (score >= 0.7) return "var(--color-plasma-emerald)";
  if (score >= 0.4) return "var(--color-plasma-amber)";
  return "var(--color-text-muted)";
}

function getRelevanceBg(score: number): string {
  if (score >= 0.7) return "rgba(16, 185, 129, 0.15)";
  if (score >= 0.4) return "rgba(245, 158, 11, 0.15)";
  return "rgba(255, 255, 255, 0.06)";
}

function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TopicClustersSection({ data }: TopicClustersSectionProps) {
  const [expandedClusters, setExpandedClusters] = useState<Record<number, boolean>>({});

  if (
    !data ||
    ((!data.clusters || data.clusters.length === 0) &&
      (!data.emergingTopics || data.emergingTopics.length === 0) &&
      (!data.decliningTopics || data.decliningTopics.length === 0))
  ) {
    return null;
  }

  const clusters = Array.isArray(data.clusters) ? data.clusters : [];
  const emergingTopics = Array.isArray(data.emergingTopics) ? data.emergingTopics : [];
  const decliningTopics = Array.isArray(data.decliningTopics) ? data.decliningTopics : [];
  const painPoints = Array.isArray(data.painPoints) ? data.painPoints : [];
  const benefits = Array.isArray(data.benefits) ? data.benefits : [];
  const featureFeedback = Array.isArray(data.featureFeedback) ? data.featureFeedback : [];
  const [expandedFeatures, setExpandedFeatures] = useState<Record<number, boolean>>({});

  const toggleCluster = (index: number) => {
    setExpandedClusters((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="tc-section">
      {/* Cluster Cards */}
      {clusters.length > 0 && (
        <div className="tc-clusters">
          {clusters.map((cluster, i) => {
            const isExpanded = !!expandedClusters[i];
            const platformEntries = cluster.platformDistribution
              ? Object.entries(cluster.platformDistribution)
              : [];
            const maxPlatformCount = platformEntries.length > 0
              ? Math.max(...platformEntries.map(([, count]) => count), 1)
              : 1;

            return (
              <div key={i} className="tc-card">
                <button
                  className="tc-card-header"
                  onClick={() => toggleCluster(i)}
                  type="button"
                >
                  <div className="tc-card-title-row">
                    <span className="tc-card-name">{cluster.name}</span>
                    <span
                      className="tc-relevance-badge"
                      style={{
                        background: getRelevanceBg(cluster.relevanceScore ?? 0),
                        color: getRelevanceColor(cluster.relevanceScore ?? 0),
                      }}
                    >
                      {((cluster.relevanceScore ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="tc-card-desc">{cluster.description}</div>
                  <svg
                    className={`tc-chevron ${isExpanded ? "tc-chevron-open" : ""}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="tc-card-body">
                    {/* Themes */}
                    {cluster.themes && cluster.themes.length > 0 && (
                      <div className="tc-detail-block">
                        <h5 className="tc-detail-label">Themes</h5>
                        <div className="tc-tag-list">
                          {cluster.themes.map((theme, j) => (
                            <span key={j} className="tc-theme-tag">
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Platform Distribution */}
                    {platformEntries.length > 0 && (
                      <div className="tc-detail-block">
                        <h5 className="tc-detail-label">Platform Distribution</h5>
                        <div className="tc-platform-bars">
                          {platformEntries
                            .sort(([, a], [, b]) => b - a)
                            .map(([platform, count]) => (
                              <div key={platform} className="tc-platform-row">
                                <span className="tc-platform-name">
                                  {formatLabel(platform)}
                                </span>
                                <div className="tc-bar-track">
                                  <div
                                    className="tc-bar-fill"
                                    style={{
                                      width: `${(count / maxPlatformCount) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span className="tc-platform-count">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Sentiment Average */}
                    <div className="tc-detail-block">
                      <h5 className="tc-detail-label">Sentiment Average</h5>
                      <span
                        className="tc-sentiment-badge"
                        style={{
                          background: getSentimentBg(cluster.sentimentAverage ?? 0),
                          color: getSentimentColor(cluster.sentimentAverage ?? 0),
                        }}
                      >
                        {(cluster.sentimentAverage ?? 0) > 0 ? "+" : ""}
                        {(cluster.sentimentAverage ?? 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Representative Quotes */}
                    {cluster.representativeQuotes && cluster.representativeQuotes.length > 0 && (
                      <div className="tc-detail-block">
                        <h5 className="tc-detail-label">Representative Quotes</h5>
                        <div className="tc-quotes">
                          {cluster.representativeQuotes.map((quote, j) => (
                            <blockquote key={j} className="tc-quote">
                              {quote}
                            </blockquote>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pain Points */}
      {painPoints.length > 0 && (
        <div className="tc-pain-points">
          <h4 className="tc-trend-title">Pain Points</h4>
          <div className="tc-pain-grid">
            {painPoints.map((pp, i) => {
              const severityColors = {
                critical: { bg: "rgba(244, 63, 94, 0.12)", color: "var(--color-plasma-rose)", border: "rgba(244, 63, 94, 0.2)" },
                moderate: { bg: "rgba(245, 158, 11, 0.12)", color: "var(--color-plasma-amber)", border: "rgba(245, 158, 11, 0.2)" },
                minor: { bg: "rgba(255, 255, 255, 0.06)", color: "var(--color-text-muted)", border: "rgba(255, 255, 255, 0.08)" },
              };
              const sev = severityColors[pp.severity] || severityColors.minor;
              return (
                <div key={i} className="tc-pain-card">
                  <div className="tc-pain-header">
                    <span className="tc-pain-name">{pp.painPoint}</span>
                    <span className="tc-severity-badge" style={{ background: sev.bg, color: sev.color, borderColor: sev.border }}>
                      {formatLabel(pp.severity)}
                    </span>
                  </div>
                  {pp.affectedSegments && pp.affectedSegments.length > 0 && (
                    <div className="tc-tag-list">
                      {pp.affectedSegments.map((seg, j) => (
                        <span key={j} className="tc-segment-tag">{seg}</span>
                      ))}
                    </div>
                  )}
                  {pp.suggestedSolution && (
                    <p className="tc-solution"><strong>Solution:</strong> {pp.suggestedSolution}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Benefits */}
      {benefits.length > 0 && (
        <div className="tc-benefits">
          <h4 className="tc-trend-title">Perceived Benefits</h4>
          <div className="tc-benefits-grid">
            {benefits.map((b, i) => {
              const catColors: Record<string, string> = {
                functional: "var(--color-plasma-cyan)",
                emotional: "var(--color-plasma-violet)",
                social: "var(--color-plasma-emerald)",
                financial: "var(--color-plasma-amber)",
              };
              const catColor = catColors[b.category] || "var(--color-text-muted)";
              return (
                <div key={i} className="tc-benefit-card">
                  <div className="tc-benefit-header">
                    <span className="tc-benefit-name">{b.benefit}</span>
                    <span className="tc-benefit-sentiment" style={{ color: getSentimentColor(b.sentiment) }}>
                      {b.sentiment > 0 ? "+" : ""}{b.sentiment.toFixed(2)}
                    </span>
                  </div>
                  <div className="tc-benefit-meta">
                    <span className="tc-category-tag" style={{ color: catColor, borderColor: catColor }}>{formatLabel(b.category)}</span>
                    <span className="tc-freq-text">{b.frequency} mentions</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature Feedback */}
      {featureFeedback.length > 0 && (
        <div className="tc-feature-feedback">
          <h4 className="tc-trend-title">Feature Feedback</h4>
          <div className="tc-feature-list">
            {featureFeedback.map((ff, i) => {
              const isExpanded = !!expandedFeatures[i];
              return (
                <div key={i} className="tc-feature-card">
                  <button
                    className="tc-feature-header"
                    onClick={() => setExpandedFeatures((prev) => ({ ...prev, [i]: !prev[i] }))}
                    type="button"
                  >
                    <div className="tc-feature-title-row">
                      <span className="tc-card-name">{ff.feature}</span>
                      <span className="tc-sentiment-badge" style={{ background: getSentimentBg(ff.overallSentiment), color: getSentimentColor(ff.overallSentiment) }}>
                        {ff.overallSentiment > 0 ? "+" : ""}{ff.overallSentiment.toFixed(2)}
                      </span>
                    </div>
                    <div className="tc-feature-counts">
                      <span className="tc-count-positive">{ff.positiveCount} positive</span>
                      <span className="tc-count-negative">{ff.negativeCount} negative</span>
                    </div>
                    <svg
                      className={`tc-chevron ${isExpanded ? "tc-chevron-open" : ""}`}
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="tc-feature-body">
                      <div className="tc-feedback-columns">
                        {ff.topPraise && ff.topPraise.length > 0 && (
                          <div className="tc-feedback-col tc-praise-col">
                            <h5 className="tc-detail-label">Praise</h5>
                            {ff.topPraise.map((p, j) => (
                              <div key={j} className="tc-feedback-item tc-praise-item">{p}</div>
                            ))}
                          </div>
                        )}
                        {ff.topComplaints && ff.topComplaints.length > 0 && (
                          <div className="tc-feedback-col tc-complaint-col">
                            <h5 className="tc-detail-label">Complaints</h5>
                            {ff.topComplaints.map((c, j) => (
                              <div key={j} className="tc-feedback-item tc-complaint-item">{c}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      {ff.improvementSuggestions && ff.improvementSuggestions.length > 0 && (
                        <div className="tc-detail-block">
                          <h5 className="tc-detail-label">Improvement Suggestions</h5>
                          {ff.improvementSuggestions.map((s, j) => (
                            <div key={j} className="tc-suggestion-item">{s}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emerging & Declining Topics */}
      {(emergingTopics.length > 0 || decliningTopics.length > 0) && (
        <div className="tc-trends">
          {emergingTopics.length > 0 && (
            <div className="tc-trend-group">
              <h4 className="tc-trend-title">Emerging Topics</h4>
              <div className="tc-tag-list">
                {emergingTopics.map((topic, i) => (
                  <span key={i} className="tc-trend-badge tc-emerging">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
          {decliningTopics.length > 0 && (
            <div className="tc-trend-group">
              <h4 className="tc-trend-title">Declining Topics</h4>
              <div className="tc-tag-list">
                {decliningTopics.map((topic, i) => (
                  <span key={i} className="tc-trend-badge tc-declining">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .tc-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Cluster Cards */
        .tc-clusters {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .tc-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tc-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -10px rgba(139, 92, 246, 0.15);
        }
        .tc-card-header {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          padding: 1rem;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          color: inherit;
          position: relative;
        }
        .tc-card-title-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }
        .tc-card-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .tc-relevance-badge {
          display: inline-flex;
          padding: 0.1875rem 0.5rem;
          border-radius: 5px;
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .tc-card-desc {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          padding-right: 1.5rem;
        }
        .tc-chevron {
          position: absolute;
          top: 1rem;
          right: 1rem;
          color: var(--color-text-muted);
          transition: transform 0.25s ease;
          flex-shrink: 0;
        }
        .tc-chevron-open {
          transform: rotate(180deg);
        }

        /* Card Body */
        .tc-card-body {
          padding: 0 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding-top: 1rem;
        }
        .tc-detail-block {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .tc-detail-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        /* Theme Tags */
        .tc-tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        .tc-theme-tag {
          display: inline-flex;
          padding: 0.1875rem 0.5rem;
          background: rgba(139, 92, 246, 0.12);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 5px;
          font-size: 0.6875rem;
          font-weight: 500;
        }

        /* Platform Distribution Bars */
        .tc-platform-bars {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .tc-platform-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }
        .tc-platform-name {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          min-width: 80px;
          flex-shrink: 0;
        }
        .tc-bar-track {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 3px;
          overflow: hidden;
        }
        .tc-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.6), rgba(6, 182, 212, 0.6));
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .tc-platform-count {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          min-width: 24px;
          text-align: right;
        }

        /* Sentiment Badge */
        .tc-sentiment-badge {
          display: inline-flex;
          width: fit-content;
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        /* Quotes */
        .tc-quotes {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .tc-quote {
          margin: 0;
          padding: 0.625rem 0.875rem;
          background: rgba(255, 255, 255, 0.02);
          border-left: 3px solid rgba(139, 92, 246, 0.4);
          border-radius: 0 8px 8px 0;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.55;
          font-style: italic;
        }

        /* Pain Points */
        .tc-pain-points, .tc-benefits, .tc-feature-feedback {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .tc-pain-grid, .tc-benefits-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .tc-pain-card, .tc-benefit-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 0.875rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tc-pain-card:hover { border-color: rgba(244, 63, 94, 0.15); transform: translateY(-1px); }
        .tc-benefit-card:hover { border-color: rgba(16, 185, 129, 0.15); transform: translateY(-1px); }
        .tc-pain-header, .tc-benefit-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .tc-pain-name, .tc-benefit-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .tc-severity-badge {
          display: inline-flex;
          padding: 0.125rem 0.4375rem;
          border: 1px solid;
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .tc-segment-tag {
          display: inline-flex;
          padding: 0.125rem 0.375rem;
          background: rgba(6, 182, 212, 0.1);
          color: var(--color-plasma-cyan);
          border: 1px solid rgba(6, 182, 212, 0.18);
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 500;
        }
        .tc-solution {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0;
        }
        .tc-solution strong {
          color: var(--color-plasma-emerald);
          font-weight: 600;
        }
        .tc-benefit-sentiment {
          font-size: 0.9375rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .tc-benefit-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .tc-category-tag {
          display: inline-flex;
          padding: 0.125rem 0.4375rem;
          border: 1px solid;
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          opacity: 0.8;
        }
        .tc-freq-text {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
        }

        /* Feature Feedback */
        .tc-feature-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .tc-feature-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tc-feature-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
        }
        .tc-feature-header {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          padding: 0.875rem 1rem;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          color: inherit;
          position: relative;
        }
        .tc-feature-title-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }
        .tc-feature-counts {
          display: flex;
          gap: 0.75rem;
          font-size: 0.6875rem;
          padding-right: 1.5rem;
        }
        .tc-count-positive {
          color: var(--color-plasma-emerald);
        }
        .tc-count-negative {
          color: var(--color-plasma-rose);
        }
        .tc-feature-body {
          padding: 0 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding-top: 0.875rem;
        }
        .tc-feedback-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .tc-feedback-col {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .tc-feedback-item {
          padding: 0.375rem 0.625rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.45;
        }
        .tc-praise-item {
          background: rgba(16, 185, 129, 0.06);
          border-left: 3px solid rgba(16, 185, 129, 0.3);
        }
        .tc-complaint-item {
          background: rgba(244, 63, 94, 0.06);
          border-left: 3px solid rgba(244, 63, 94, 0.3);
        }
        .tc-suggestion-item {
          padding: 0.375rem 0.625rem;
          background: rgba(245, 158, 11, 0.06);
          border-left: 3px solid rgba(245, 158, 11, 0.3);
          border-radius: 6px;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.45;
          margin-bottom: 0.25rem;
        }

        @media (max-width: 640px) {
          .tc-feedback-columns {
            grid-template-columns: 1fr;
          }
        }

        /* Emerging & Declining Topics */
        .tc-trends {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .tc-trend-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .tc-trend-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }
        .tc-trend-badge {
          display: inline-flex;
          padding: 0.25rem 0.625rem;
          border-radius: 5px;
          font-size: 0.6875rem;
          font-weight: 600;
          border: 1px solid;
        }
        .tc-emerging {
          background: rgba(16, 185, 129, 0.12);
          color: var(--color-plasma-emerald);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .tc-declining {
          background: rgba(244, 63, 94, 0.12);
          color: var(--color-plasma-rose);
          border-color: rgba(244, 63, 94, 0.2);
        }

        @media (max-width: 640px) {
          .tc-platform-name {
            min-width: 60px;
            font-size: 0.6875rem;
          }
        }
      `}</style>
    </div>
  );
}
