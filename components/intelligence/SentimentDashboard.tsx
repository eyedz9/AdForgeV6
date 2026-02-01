"use client";

import type { SentimentAnalysis } from "@/lib/services/intelligence-synthesizer";

interface SentimentDashboardProps {
  data: SentimentAnalysis;
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

function getSentimentBorder(score: number): string {
  if (score > 0.2) return "rgba(16, 185, 129, 0.25)";
  if (score < -0.2) return "rgba(244, 63, 94, 0.25)";
  return "rgba(245, 158, 11, 0.25)";
}

function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SentimentDashboard({ data }: SentimentDashboardProps) {
  if (!data || (!data.overall && (!data.byPlatform || data.byPlatform.length === 0) && (!data.topicSentiment || data.topicSentiment.length === 0))) {
    return null;
  }

  const overall = data.overall ?? { score: 0, label: "neutral", intensity: "mild" };
  const byPlatform = Array.isArray(data.byPlatform) ? data.byPlatform : [];
  const topicSentiment = Array.isArray(data.topicSentiment)
    ? [...data.topicSentiment].sort((a, b) => (b.mentions ?? 0) - (a.mentions ?? 0))
    : [];

  const maxMentions = topicSentiment.length > 0
    ? Math.max(...topicSentiment.map((t) => t.mentions ?? 0), 1)
    : 1;

  return (
    <div className="sentiment-dashboard">
      {/* Overall Sentiment */}
      <div className="sentiment-overall">
        <div
          className="overall-score"
          style={{ color: getSentimentColor(overall.score) }}
        >
          {overall.score > 0 ? "+" : ""}
          {overall.score.toFixed(2)}
        </div>
        <div className="overall-meta">
          <span
            className="overall-label"
            style={{
              background: getSentimentBg(overall.score),
              color: getSentimentColor(overall.score),
              borderColor: getSentimentBorder(overall.score),
            }}
          >
            {formatLabel(overall.label)}
          </span>
          <span className="overall-intensity">{formatLabel(overall.intensity)} intensity</span>
        </div>
      </div>

      {/* Per-Platform Breakdown */}
      {byPlatform.length > 0 && (
        <div className="platform-breakdown">
          <h4 className="subsection-title">Per-Platform Breakdown</h4>
          <div className="platform-grid">
            {byPlatform.map((p, i) => (
              <div key={i} className="platform-card">
                <div className="platform-card-header">
                  <span className="platform-name">{formatLabel(p.platform)}</span>
                  <span className="platform-trend">
                    {p.trendDirection === "improving" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                    )}
                    {p.trendDirection === "declining" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
                        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                        <polyline points="17 18 23 18 23 12" />
                      </svg>
                    )}
                    {p.trendDirection === "stable" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                  </span>
                </div>
                <div
                  className="platform-score"
                  style={{ color: getSentimentColor(p.score) }}
                >
                  {p.score > 0 ? "+" : ""}
                  {p.score.toFixed(2)}
                </div>
                <span
                  className="platform-label-badge"
                  style={{
                    background: getSentimentBg(p.score),
                    color: getSentimentColor(p.score),
                    borderColor: getSentimentBorder(p.score),
                  }}
                >
                  {formatLabel(p.label)}
                </span>
                {p.sampleSize > 0 && (
                  <span className="platform-sample">{p.sampleSize} samples</span>
                )}
                {p.topPositiveTopics && p.topPositiveTopics.length > 0 && (
                  <div className="topic-tags">
                    {p.topPositiveTopics.slice(0, 3).map((t, j) => (
                      <span key={j} className="topic-tag positive">{t}</span>
                    ))}
                  </div>
                )}
                {p.topNegativeTopics && p.topNegativeTopics.length > 0 && (
                  <div className="topic-tags">
                    {p.topNegativeTopics.slice(0, 3).map((t, j) => (
                      <span key={j} className="topic-tag negative">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aspect Sentiment Grid */}
      {data.aspectSentiment && data.aspectSentiment.length > 0 && (
        <div className="aspect-sentiment">
          <h4 className="subsection-title">Aspect Sentiment</h4>
          <div className="aspect-grid">
            {data.aspectSentiment.map((a, i) => (
              <div key={i} className="aspect-card">
                <div className="aspect-header">
                  <span className="aspect-name">{formatLabel(a.aspect)}</span>
                  <span
                    className="aspect-score"
                    style={{ color: getSentimentColor(a.sentiment) }}
                  >
                    {a.sentiment > 0 ? "+" : ""}{a.sentiment.toFixed(2)}
                  </span>
                </div>
                <div className="aspect-bar-track">
                  <div
                    className="aspect-bar-fill"
                    style={{
                      width: `${Math.round(((a.sentiment + 1) / 2) * 100)}%`,
                      background: getSentimentColor(a.sentiment),
                      opacity: 0.6,
                    }}
                  />
                </div>
                <span className="aspect-mentions">{a.mentions} mentions</span>
                {a.topPhrases && a.topPhrases.length > 0 && (
                  <div className="aspect-phrases">
                    {a.topPhrases.map((phrase, j) => (
                      <span key={j} className="aspect-phrase">&ldquo;{phrase}&rdquo;</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emotion Detection */}
      {data.emotions && data.emotions.length > 0 && (
        <div className="emotion-detection">
          <h4 className="subsection-title">Emotion Detection</h4>
          <div className="emotion-list">
            {[...data.emotions].sort((a, b) => b.intensity - a.intensity).map((e, i) => (
              <div key={i} className="emotion-row">
                <div className="emotion-info">
                  <span className="emotion-name">{formatLabel(e.emotion)}</span>
                  <span className="emotion-mentions">{e.mentions}</span>
                </div>
                <div className="emotion-bar-container">
                  <div className="emotion-bar-bg">
                    <div
                      className="emotion-bar-fill"
                      style={{
                        width: `${Math.round(e.intensity * 100)}%`,
                        background: e.intensity > 0.6 ? "var(--color-plasma-rose)" : e.intensity > 0.3 ? "var(--color-plasma-amber)" : "var(--color-plasma-cyan)",
                      }}
                    />
                  </div>
                  <span className="emotion-intensity">{(e.intensity * 100).toFixed(0)}%</span>
                </div>
                {e.triggers && e.triggers.length > 0 && (
                  <div className="emotion-triggers">
                    {e.triggers.map((trigger, j) => (
                      <span key={j} className="emotion-trigger-tag">{trigger}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic Sentiment Matrix */}
      {topicSentiment.length > 0 && (
        <div className="topic-sentiment-matrix">
          <h4 className="subsection-title">Topic Sentiment</h4>
          <div className="topic-list">
            {topicSentiment.map((t, i) => {
              const barPercent = Math.round(((t.sentiment + 1) / 2) * 100);
              return (
                <div key={i} className="topic-row">
                  <div className="topic-info">
                    <span className="topic-name">{t.topic}</span>
                    <span className="topic-mentions">{t.mentions}</span>
                  </div>
                  <div className="topic-bar-container">
                    <div className="topic-bar-bg">
                      <div
                        className="topic-bar-fill"
                        style={{
                          width: `${barPercent}%`,
                          background: `linear-gradient(90deg, #f43f5e 0%, #f59e0b 50%, #10b981 100%)`,
                          opacity: 0.4 + (t.mentions / maxMentions) * 0.6,
                        }}
                      />
                      <div
                        className="topic-bar-indicator"
                        style={{
                          left: `${barPercent}%`,
                          background: getSentimentColor(t.sentiment),
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .sentiment-dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Overall Sentiment */
        .sentiment-overall {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .overall-score {
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .overall-meta {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .overall-label {
          display: inline-flex;
          width: fit-content;
          padding: 0.25rem 0.625rem;
          border: 1px solid;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .overall-intensity {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
        }

        /* Per-Platform Breakdown */
        .subsection-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 0.875rem;
        }
        .platform-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.75rem;
        }
        .platform-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .platform-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -10px rgba(139, 92, 246, 0.15);
        }
        .platform-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .platform-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .platform-trend svg {
          filter: drop-shadow(0 0 4px currentColor);
        }
        .platform-score {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .platform-label-badge {
          display: inline-flex;
          width: fit-content;
          padding: 0.1875rem 0.5rem;
          border: 1px solid;
          border-radius: 5px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .platform-sample {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
        }
        .topic-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .topic-tag {
          display: inline-flex;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 500;
        }
        .topic-tag.positive {
          background: rgba(16, 185, 129, 0.12);
          color: var(--color-plasma-emerald);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .topic-tag.negative {
          background: rgba(244, 63, 94, 0.12);
          color: var(--color-plasma-rose);
          border: 1px solid rgba(244, 63, 94, 0.2);
        }

        /* Aspect Sentiment Grid */
        .aspect-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 0.75rem;
        }
        .aspect-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .aspect-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -10px rgba(139, 92, 246, 0.15);
        }
        .aspect-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .aspect-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .aspect-score {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .aspect-bar-track {
          height: 6px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 3px;
          overflow: hidden;
        }
        .aspect-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .aspect-mentions {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
        }
        .aspect-phrases {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-top: 0.25rem;
        }
        .aspect-phrase {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          font-style: italic;
          line-height: 1.4;
        }

        /* Emotion Detection */
        .emotion-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .emotion-row {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          padding: 0.625rem 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .emotion-info {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }
        .emotion-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .emotion-mentions {
          display: inline-flex;
          padding: 0.125rem 0.4375rem;
          background: rgba(139, 92, 246, 0.12);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
        }
        .emotion-bar-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .emotion-bar-bg {
          flex: 1;
          height: 8px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 4px;
          overflow: hidden;
        }
        .emotion-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .emotion-intensity {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          min-width: 32px;
          text-align: right;
        }
        .emotion-triggers {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .emotion-trigger-tag {
          display: inline-flex;
          padding: 0.125rem 0.375rem;
          background: rgba(245, 158, 11, 0.1);
          color: var(--color-plasma-amber);
          border: 1px solid rgba(245, 158, 11, 0.18);
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 500;
        }

        /* Topic Sentiment Matrix */
        .topic-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .topic-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.625rem 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .topic-info {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          min-width: 180px;
          flex-shrink: 0;
        }
        .topic-name {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .topic-mentions {
          display: inline-flex;
          padding: 0.125rem 0.4375rem;
          background: rgba(139, 92, 246, 0.12);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
        }
        .topic-bar-container {
          flex: 1;
          min-width: 0;
        }
        .topic-bar-bg {
          position: relative;
          height: 8px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 4px;
          overflow: visible;
        }
        .topic-bar-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          border-radius: 4px;
        }
        .topic-bar-indicator {
          position: absolute;
          top: -2px;
          width: 4px;
          height: 12px;
          border-radius: 2px;
          transform: translateX(-50%);
          box-shadow: 0 0 6px currentColor;
        }

        @media (max-width: 640px) {
          .platform-grid {
            grid-template-columns: 1fr;
          }
          .topic-info {
            min-width: 120px;
          }
          .overall-score {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
