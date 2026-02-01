"use client";

import { useState } from "react";
import type { MediaAffinityReport } from "@/lib/services/media-affinity-engine";

interface MediaAffinityDashboardProps {
  data: MediaAffinityReport;
}

function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getAffinityColor(index: number): string {
  if (index > 120) return "var(--color-plasma-emerald)";
  if (index < 80) return "var(--color-plasma-rose)";
  return "var(--color-plasma-amber)";
}

function getAffinityBg(index: number): string {
  if (index > 120) return "rgba(16, 185, 129, 0.15)";
  if (index < 80) return "rgba(244, 63, 94, 0.15)";
  return "rgba(245, 158, 11, 0.15)";
}

function getAffinityBorder(index: number): string {
  if (index > 120) return "rgba(16, 185, 129, 0.25)";
  if (index < 80) return "rgba(244, 63, 94, 0.25)";
  return "rgba(245, 158, 11, 0.25)";
}

function getAffinityGlow(index: number): string {
  if (index > 120) return "0 0 20px rgba(16, 185, 129, 0.2)";
  if (index < 80) return "0 0 20px rgba(244, 63, 94, 0.2)";
  return "none";
}

function getLevelBadgeStyle(level: "high" | "medium" | "low"): {
  background: string;
  color: string;
  border: string;
} {
  switch (level) {
    case "high":
      return {
        background: "rgba(16, 185, 129, 0.12)",
        color: "var(--color-plasma-emerald)",
        border: "1px solid rgba(16, 185, 129, 0.2)",
      };
    case "medium":
      return {
        background: "rgba(245, 158, 11, 0.12)",
        color: "var(--color-plasma-amber)",
        border: "1px solid rgba(245, 158, 11, 0.2)",
      };
    case "low":
      return {
        background: "rgba(107, 114, 128, 0.12)",
        color: "var(--color-text-muted)",
        border: "1px solid rgba(107, 114, 128, 0.2)",
      };
  }
}

function getAffinityInterpretation(index: number): string {
  const diff = Math.abs(index - 100);
  if (index > 100) return `${diff}% above average`;
  if (index < 100) return `${diff}% below average`;
  return "At baseline";
}

/** Plasma gradient color for heatmap (violet → cyan) based on index value */
function getHeatmapColor(index: number, minIndex: number, maxIndex: number): string {
  const range = maxIndex - minIndex || 1;
  const normalized = (index - minIndex) / range;
  // Violet (139, 92, 246) → Cyan (6, 182, 212)
  const r = Math.round(139 + (6 - 139) * normalized);
  const g = Math.round(92 + (182 - 92) * normalized);
  const b = Math.round(246 + (212 - 246) * normalized);
  return `rgb(${r}, ${g}, ${b})`;
}

function getHeatmapBg(index: number, minIndex: number, maxIndex: number): string {
  const range = maxIndex - minIndex || 1;
  const normalized = (index - minIndex) / range;
  const r = Math.round(139 + (6 - 139) * normalized);
  const g = Math.round(92 + (182 - 92) * normalized);
  const b = Math.round(246 + (212 - 246) * normalized);
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
}

const TIME_PERIOD_ORDER = [
  "early_morning",
  "morning",
  "midday",
  "afternoon",
  "evening",
  "night",
  "late_night",
] as const;

export default function MediaAffinityDashboard({
  data,
}: MediaAffinityDashboardProps) {
  const [expandedInfluencers, setExpandedInfluencers] = useState<
    Record<number, boolean>
  >({});
  const [expandedChannels, setExpandedChannels] = useState<
    Record<number, boolean>
  >({});

  if (
    !data ||
    ((!data.platformAffinity || data.platformAffinity.length === 0) &&
      (!data.contentFormatAffinity ||
        data.contentFormatAffinity.length === 0) &&
      (!data.timeOfDayPatterns || data.timeOfDayPatterns.length === 0) &&
      (!data.influencerAffinity || data.influencerAffinity.length === 0) &&
      (!data.interestCategories || data.interestCategories.length === 0) &&
      (!data.channelRecommendations ||
        data.channelRecommendations.length === 0))
  ) {
    return null;
  }

  const platformAffinity = Array.isArray(data.platformAffinity)
    ? data.platformAffinity
    : [];
  const contentFormatAffinity = Array.isArray(data.contentFormatAffinity)
    ? [...data.contentFormatAffinity].sort(
        (a, b) => b.affinityIndex - a.affinityIndex
      )
    : [];
  const timeOfDayPatterns = Array.isArray(data.timeOfDayPatterns)
    ? data.timeOfDayPatterns
    : [];
  const influencerAffinity = Array.isArray(data.influencerAffinity)
    ? data.influencerAffinity
    : [];
  const interestCategories = Array.isArray(data.interestCategories)
    ? data.interestCategories
    : [];
  const channelRecommendations = Array.isArray(data.channelRecommendations)
    ? data.channelRecommendations
    : [];

  const maxContentIndex =
    contentFormatAffinity.length > 0
      ? Math.max(...contentFormatAffinity.map((c) => c.affinityIndex), 1)
      : 1;

  // Sort time periods by defined order
  const sortedTimePatterns = [...timeOfDayPatterns].sort((a, b) => {
    const aIdx = TIME_PERIOD_ORDER.indexOf(
      a.period as (typeof TIME_PERIOD_ORDER)[number]
    );
    const bIdx = TIME_PERIOD_ORDER.indexOf(
      b.period as (typeof TIME_PERIOD_ORDER)[number]
    );
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  const timeMinIndex =
    sortedTimePatterns.length > 0
      ? Math.min(...sortedTimePatterns.map((t) => t.affinityIndex))
      : 0;
  const timeMaxIndex =
    sortedTimePatterns.length > 0
      ? Math.max(...sortedTimePatterns.map((t) => t.affinityIndex))
      : 100;

  return (
    <div className="ma-dashboard">
      {/* Platform Affinity Section */}
      {platformAffinity.length > 0 && (
        <div className="ma-section">
          <h4 className="ma-subsection-title">Platform Affinity</h4>
          <div className="ma-platform-grid">
            {platformAffinity.map((p, i) => (
              <div
                key={i}
                className="ma-platform-card"
                style={{ boxShadow: getAffinityGlow(p.affinityIndex) }}
              >
                <div className="ma-platform-header">
                  <span className="ma-platform-name">{p.platform}</span>
                </div>
                <div
                  className="ma-affinity-index"
                  style={{ color: getAffinityColor(p.affinityIndex) }}
                >
                  {p.affinityIndex}
                </div>
                <div className="ma-interpretation">
                  {getAffinityInterpretation(p.affinityIndex)}
                </div>
                <div className="ma-badges-row">
                  <span
                    className="ma-level-badge"
                    style={getLevelBadgeStyle(p.reach)}
                  >
                    Reach: {p.reach}
                  </span>
                  <span
                    className="ma-level-badge"
                    style={getLevelBadgeStyle(p.engagement)}
                  >
                    Eng: {p.engagement}
                  </span>
                  <span
                    className="ma-level-badge"
                    style={getLevelBadgeStyle(p.costEfficiency)}
                  >
                    Cost: {p.costEfficiency}
                  </span>
                </div>
                {p.reasoning && (
                  <div className="ma-reasoning">{p.reasoning}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Format Affinity Section */}
      {contentFormatAffinity.length > 0 && (
        <div className="ma-section">
          <h4 className="ma-subsection-title">Content Format Affinity</h4>
          <div className="ma-content-bars">
            {contentFormatAffinity.map((c, i) => {
              const barWidth = Math.round(
                (c.affinityIndex / maxContentIndex) * 100
              );
              return (
                <div key={i} className="ma-bar-row">
                  <div className="ma-bar-label">
                    <span className="ma-bar-name">
                      {formatLabel(c.format)}
                    </span>
                    <span
                      className="ma-bar-value"
                      style={{ color: getAffinityColor(c.affinityIndex) }}
                    >
                      {c.affinityIndex}
                    </span>
                  </div>
                  <div className="ma-bar-track">
                    <div
                      className="ma-bar-fill"
                      style={{
                        width: `${barWidth}%`,
                        background: `linear-gradient(90deg, ${getAffinityColor(c.affinityIndex)} 0%, ${getAffinityColor(c.affinityIndex)}88 100%)`,
                      }}
                    />
                  </div>
                  {c.topPlatforms && c.topPlatforms.length > 0 && (
                    <div className="ma-bar-platforms">
                      {c.topPlatforms.slice(0, 4).map((plat, j) => (
                        <span key={j} className="ma-mini-tag">
                          {plat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time-of-Day Patterns Section */}
      {sortedTimePatterns.length > 0 && (
        <div className="ma-section">
          <h4 className="ma-subsection-title">Time-of-Day Engagement</h4>
          <div className="ma-time-heatmap">
            {sortedTimePatterns.map((t, i) => (
              <div key={i} className="ma-time-cell">
                <div
                  className="ma-time-cell-inner"
                  style={{
                    background: getHeatmapBg(
                      t.affinityIndex,
                      timeMinIndex,
                      timeMaxIndex
                    ),
                    borderColor: `${getHeatmapColor(t.affinityIndex, timeMinIndex, timeMaxIndex)}33`,
                  }}
                >
                  <span className="ma-time-period">
                    {formatLabel(t.period)}
                  </span>
                  <span
                    className="ma-time-index"
                    style={{
                      color: getHeatmapColor(
                        t.affinityIndex,
                        timeMinIndex,
                        timeMaxIndex
                      ),
                    }}
                  >
                    {t.affinityIndex}
                  </span>
                  {t.bestPlatforms && t.bestPlatforms.length > 0 && (
                    <div className="ma-time-platforms">
                      {t.bestPlatforms.slice(0, 3).map((plat, j) => (
                        <span key={j} className="ma-time-plat-tag">
                          {plat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Influencer Affinity Section */}
      {influencerAffinity.length > 0 && (
        <div className="ma-section">
          <h4 className="ma-subsection-title">Influencer Affinity</h4>
          <div className="ma-influencer-grid">
            {influencerAffinity.map((inf, i) => (
              <div key={i} className="ma-influencer-card">
                <div className="ma-influencer-header">
                  <span className="ma-influencer-type">{inf.type}</span>
                  <span
                    className="ma-influencer-index"
                    style={{ color: getAffinityColor(inf.affinityIndex) }}
                  >
                    {inf.affinityIndex}
                  </span>
                </div>
                {inf.platforms && inf.platforms.length > 0 && (
                  <div className="ma-influencer-platforms">
                    {inf.platforms.map((plat, j) => (
                      <span key={j} className="ma-mini-tag">
                        {plat}
                      </span>
                    ))}
                  </div>
                )}
                {inf.reasoning && (
                  <>
                    <button
                      type="button"
                      className="ma-expand-btn"
                      onClick={() =>
                        setExpandedInfluencers((prev) => ({
                          ...prev,
                          [i]: !prev[i],
                        }))
                      }
                    >
                      {expandedInfluencers[i] ? "Hide" : "Show"} reasoning
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          transform: expandedInfluencers[i]
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {expandedInfluencers[i] && (
                      <div className="ma-reasoning">{inf.reasoning}</div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interest Categories Section */}
      {interestCategories.length > 0 && (
        <div className="ma-section">
          <h4 className="ma-subsection-title">Interest Categories</h4>
          <div className="ma-interest-list">
            {interestCategories.map((cat, i) => {
              const strengthStyle =
                cat.crossReferenceStrength === "strong"
                  ? {
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "var(--color-plasma-emerald)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                    }
                  : cat.crossReferenceStrength === "moderate"
                    ? {
                        background: "rgba(245, 158, 11, 0.12)",
                        color: "var(--color-plasma-amber)",
                        border: "1px solid rgba(245, 158, 11, 0.2)",
                      }
                    : {
                        background: "rgba(107, 114, 128, 0.12)",
                        color: "var(--color-text-muted)",
                        border: "1px solid rgba(107, 114, 128, 0.2)",
                      };

              return (
                <div key={i} className="ma-interest-row">
                  <div className="ma-interest-info">
                    <span className="ma-interest-name">{cat.category}</span>
                    <span
                      className="ma-interest-index"
                      style={{ color: getAffinityColor(cat.affinityIndex) }}
                    >
                      {cat.affinityIndex}
                    </span>
                    <span className="ma-strength-badge" style={strengthStyle}>
                      {cat.crossReferenceStrength}
                    </span>
                  </div>
                  {cat.relatedPlatforms && cat.relatedPlatforms.length > 0 && (
                    <div className="ma-interest-platforms">
                      {cat.relatedPlatforms.map((plat, j) => (
                        <span key={j} className="ma-mini-tag">
                          {plat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Channel Recommendations Section */}
      {channelRecommendations.length > 0 && (
        <div className="ma-section">
          <h4 className="ma-subsection-title">Channel Budget Recommendations</h4>
          <div className="ma-channel-list">
            {channelRecommendations.map((ch, i) => {
              const priorityStyle =
                ch.priority === "primary"
                  ? {
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "var(--color-plasma-emerald)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                    }
                  : ch.priority === "secondary"
                    ? {
                        background: "rgba(6, 182, 212, 0.12)",
                        color: "var(--color-plasma-cyan)",
                        border: "1px solid rgba(6, 182, 212, 0.2)",
                      }
                    : {
                        background: "rgba(245, 158, 11, 0.12)",
                        color: "var(--color-plasma-amber)",
                        border: "1px solid rgba(245, 158, 11, 0.2)",
                      };

              const roiStyle =
                ch.expectedROI === "high"
                  ? {
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "var(--color-plasma-emerald)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                    }
                  : ch.expectedROI === "medium"
                    ? {
                        background: "rgba(245, 158, 11, 0.12)",
                        color: "var(--color-plasma-amber)",
                        border: "1px solid rgba(245, 158, 11, 0.2)",
                      }
                    : {
                        background: "rgba(107, 114, 128, 0.12)",
                        color: "var(--color-text-muted)",
                        border: "1px solid rgba(107, 114, 128, 0.2)",
                      };

              return (
                <div key={i} className="ma-channel-row">
                  <div className="ma-channel-header">
                    <div className="ma-channel-info">
                      <span className="ma-channel-name">{ch.channel}</span>
                      <div className="ma-channel-badges">
                        <span
                          className="ma-priority-badge"
                          style={priorityStyle}
                        >
                          {ch.priority}
                        </span>
                        <span className="ma-roi-badge" style={roiStyle}>
                          ROI: {ch.expectedROI}
                        </span>
                      </div>
                    </div>
                    <span className="ma-channel-percent">
                      {ch.budgetAllocationPercent}%
                    </span>
                  </div>
                  <div className="ma-channel-bar-track">
                    <div
                      className="ma-channel-bar-fill"
                      style={{
                        width: `${ch.budgetAllocationPercent}%`,
                        background:
                          ch.priority === "primary"
                            ? "linear-gradient(90deg, var(--color-plasma-emerald) 0%, rgba(16, 185, 129, 0.5) 100%)"
                            : ch.priority === "secondary"
                              ? "linear-gradient(90deg, var(--color-plasma-cyan) 0%, rgba(6, 182, 212, 0.5) 100%)"
                              : "linear-gradient(90deg, var(--color-plasma-amber) 0%, rgba(245, 158, 11, 0.5) 100%)",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="ma-expand-btn"
                    onClick={() =>
                      setExpandedChannels((prev) => ({
                        ...prev,
                        [i]: !prev[i],
                      }))
                    }
                  >
                    {expandedChannels[i] ? "Hide" : "Show"} details
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{
                        transform: expandedChannels[i]
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {expandedChannels[i] && (
                    <div className="ma-channel-details">
                      {ch.reasoning && (
                        <div className="ma-reasoning">{ch.reasoning}</div>
                      )}
                      {ch.tactics && ch.tactics.length > 0 && (
                        <div className="ma-tactics">
                          <span className="ma-tactics-label">Tactics:</span>
                          <ul className="ma-tactics-list">
                            {ch.tactics.map((tactic, j) => (
                              <li key={j} className="ma-tactic-item">
                                {tactic}
                              </li>
                            ))}
                          </ul>
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

      <style>{`
        .ma-dashboard {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .ma-section {
          display: flex;
          flex-direction: column;
        }
        .ma-subsection-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 0.875rem;
        }

        /* Platform Affinity Grid */
        .ma-platform-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 0.75rem;
        }
        .ma-platform-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ma-platform-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -10px rgba(139, 92, 246, 0.15);
        }
        .ma-platform-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ma-platform-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .ma-affinity-index {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .ma-interpretation {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .ma-badges-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .ma-level-badge {
          display: inline-flex;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .ma-reasoning {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin-top: 0.25rem;
        }

        /* Content Format Affinity Bars */
        .ma-content-bars {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .ma-bar-row {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.625rem 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .ma-bar-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ma-bar-name {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .ma-bar-value {
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .ma-bar-track {
          height: 8px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 4px;
          overflow: hidden;
        }
        .ma-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ma-bar-platforms {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-top: 0.125rem;
        }
        .ma-mini-tag {
          display: inline-flex;
          padding: 0.0625rem 0.3125rem;
          background: rgba(139, 92, 246, 0.1);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.18);
          border-radius: 3px;
          font-size: 0.5625rem;
          font-weight: 500;
        }

        /* Time-of-Day Heatmap */
        .ma-time-heatmap {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }
        .ma-time-cell {
          display: flex;
        }
        .ma-time-cell-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          padding: 0.75rem 0.5rem;
          border-radius: 10px;
          border: 1px solid;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ma-time-cell-inner:hover {
          transform: translateY(-2px);
        }
        .ma-time-period {
          font-size: 0.625rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          line-height: 1.2;
        }
        .ma-time-index {
          font-size: 1.375rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .ma-time-platforms {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          align-items: center;
        }
        .ma-time-plat-tag {
          display: inline-flex;
          padding: 0.0625rem 0.25rem;
          background: rgba(255, 255, 255, 0.06);
          color: var(--color-text-muted);
          border-radius: 3px;
          font-size: 0.5rem;
          font-weight: 500;
        }

        /* Influencer Affinity Grid */
        .ma-influencer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 0.75rem;
        }
        .ma-influencer-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ma-influencer-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -10px rgba(139, 92, 246, 0.15);
        }
        .ma-influencer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .ma-influencer-type {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .ma-influencer-index {
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .ma-influencer-platforms {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .ma-expand-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0;
          background: none;
          border: none;
          color: var(--color-text-muted);
          font-size: 0.6875rem;
          cursor: pointer;
          width: fit-content;
        }
        .ma-expand-btn:hover {
          color: var(--color-text-secondary);
        }

        /* Interest Categories List */
        .ma-interest-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .ma-interest-row {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          padding: 0.625rem 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .ma-interest-info {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          flex-wrap: wrap;
        }
        .ma-interest-name {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .ma-interest-index {
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .ma-strength-badge {
          display: inline-flex;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .ma-interest-platforms {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        /* Channel Recommendations */
        .ma-channel-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .ma-channel-row {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          padding: 0.875rem;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ma-channel-row:hover {
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -10px rgba(139, 92, 246, 0.15);
        }
        .ma-channel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .ma-channel-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .ma-channel-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .ma-channel-badges {
          display: flex;
          gap: 0.25rem;
        }
        .ma-priority-badge,
        .ma-roi-badge {
          display: inline-flex;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .ma-channel-percent {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
          letter-spacing: -0.02em;
          flex-shrink: 0;
        }
        .ma-channel-bar-track {
          height: 8px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 4px;
          overflow: hidden;
        }
        .ma-channel-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ma-channel-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-top: 0.25rem;
        }
        .ma-tactics {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .ma-tactics-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .ma-tactics-list {
          margin: 0;
          padding-left: 1.25rem;
          list-style: none;
        }
        .ma-tactic-item {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
          position: relative;
        }
        .ma-tactic-item::before {
          content: "";
          position: absolute;
          left: -1rem;
          top: 0.5em;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--color-plasma-violet);
        }

        @media (max-width: 768px) {
          .ma-platform-grid {
            grid-template-columns: 1fr;
          }
          .ma-time-heatmap {
            grid-template-columns: repeat(4, 1fr);
          }
          .ma-influencer-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 480px) {
          .ma-time-heatmap {
            grid-template-columns: repeat(2, 1fr);
          }
          .ma-affinity-index {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
