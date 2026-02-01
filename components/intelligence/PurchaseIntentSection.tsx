"use client";

import { useState } from "react";
import type { PurchaseIntentAnalysis } from "@/lib/services/intelligence-synthesizer";

interface PurchaseIntentSectionProps {
  data: PurchaseIntentAnalysis;
}

const STAGE_ORDER = ["awareness", "consideration", "decision", "post_purchase"] as const;

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  awareness: {
    label: "Awareness",
    color: "var(--color-plasma-cyan)",
    bg: "rgba(6, 182, 212, 0.12)",
    border: "rgba(6, 182, 212, 0.2)",
  },
  consideration: {
    label: "Consideration",
    color: "var(--color-plasma-violet)",
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.2)",
  },
  decision: {
    label: "Decision",
    color: "var(--color-plasma-emerald)",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.2)",
  },
  post_purchase: {
    label: "Post-Purchase",
    color: "var(--color-plasma-amber)",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.2)",
  },
};

const STRENGTH_CONFIG: Record<string, { color: string; bg: string }> = {
  strong: { color: "var(--color-plasma-emerald)", bg: "rgba(16, 185, 129, 0.15)" },
  moderate: { color: "var(--color-plasma-amber)", bg: "rgba(245, 158, 11, 0.15)" },
  weak: { color: "var(--color-text-muted)", bg: "rgba(255, 255, 255, 0.06)" },
};

const FREQUENCY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  common: {
    color: "var(--color-plasma-rose)",
    bg: "rgba(244, 63, 94, 0.12)",
    border: "rgba(244, 63, 94, 0.2)",
  },
  occasional: {
    color: "var(--color-plasma-amber)",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.2)",
  },
  rare: {
    color: "var(--color-text-muted)",
    bg: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.08)",
  },
};

function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PurchaseIntentSection({ data }: PurchaseIntentSectionProps) {
  const [expandedSignals, setExpandedSignals] = useState<Record<string, boolean>>({});

  if (
    !data ||
    ((!data.signals || data.signals.length === 0) &&
      (!data.barriers || data.barriers.length === 0) &&
      (!data.conversionDrivers || data.conversionDrivers.length === 0))
  ) {
    return null;
  }

  const signals = Array.isArray(data.signals) ? data.signals : [];
  const barriers = Array.isArray(data.barriers) ? data.barriers : [];
  const conversionDrivers = Array.isArray(data.conversionDrivers) ? data.conversionDrivers : [];
  const comparison = data.comparisonBehavior ?? {
    topComparedProducts: [],
    comparisonFactors: [],
    decisionTimeline: "",
  };
  const comparedProducts = Array.isArray(comparison.topComparedProducts) ? comparison.topComparedProducts : [];
  const comparisonFactors = Array.isArray(comparison.comparisonFactors) ? comparison.comparisonFactors : [];

  // Group signals by stage
  const signalsByStage: Record<string, typeof signals> = {};
  for (const signal of signals) {
    const stage = signal.stage || "awareness";
    if (!signalsByStage[stage]) signalsByStage[stage] = [];
    signalsByStage[stage].push(signal);
  }

  const toggleExamples = (key: string) => {
    setExpandedSignals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="pi-section">
      {/* Signals by Funnel Stage */}
      {signals.length > 0 && (
        <div className="pi-signals">
          {STAGE_ORDER.map((stage) => {
            const stageSignals = signalsByStage[stage];
            if (!stageSignals || stageSignals.length === 0) return null;
            const config = STAGE_CONFIG[stage];

            return (
              <div key={stage} className="pi-stage-group">
                <div className="pi-stage-header">
                  <span
                    className="pi-stage-indicator"
                    style={{ background: config.color }}
                  />
                  <h4 className="pi-stage-label">{config.label}</h4>
                  <span
                    className="pi-stage-count"
                    style={{ background: config.bg, color: config.color, borderColor: config.border }}
                  >
                    {stageSignals.length}
                  </span>
                </div>

                <div className="pi-signal-list">
                  {stageSignals.map((signal, i) => {
                    const key = `${stage}-${i}`;
                    const isExpanded = !!expandedSignals[key];
                    const strengthCfg = STRENGTH_CONFIG[signal.strength] ?? STRENGTH_CONFIG.weak;
                    const platforms = Array.isArray(signal.platforms) ? signal.platforms : [];
                    const examples = Array.isArray(signal.examples) ? signal.examples : [];

                    return (
                      <div key={key} className="pi-signal-card">
                        <div className="pi-signal-top">
                          <div className="pi-signal-info">
                            <span className="pi-signal-name">{signal.signal}</span>
                            <span
                              className="pi-strength-badge"
                              style={{ background: strengthCfg.bg, color: strengthCfg.color }}
                            >
                              {formatLabel(signal.strength)}
                            </span>
                          </div>
                          <p className="pi-signal-desc">{signal.description}</p>
                          {platforms.length > 0 && (
                            <div className="pi-tag-list">
                              {platforms.map((p, j) => (
                                <span key={j} className="pi-platform-tag">
                                  {formatLabel(p)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {examples.length > 0 && (
                          <div className="pi-examples-section">
                            <button
                              className="pi-examples-toggle"
                              onClick={() => toggleExamples(key)}
                              type="button"
                            >
                              <span>{isExpanded ? "Hide" : "Show"} examples ({examples.length})</span>
                              <svg
                                className={`pi-chevron ${isExpanded ? "pi-chevron-open" : ""}`}
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                            {isExpanded && (
                              <div className="pi-examples-list">
                                {examples.map((ex, j) => (
                                  <div key={j} className="pi-example-item">
                                    {ex}
                                  </div>
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
            );
          })}
        </div>
      )}

      {/* Comparison Behavior */}
      {(comparedProducts.length > 0 || comparisonFactors.length > 0 || comparison.decisionTimeline) && (
        <div className="pi-comparison">
          <h4 className="pi-subsection-title">Comparison Behavior</h4>
          <div className="pi-comparison-grid">
            {comparedProducts.length > 0 && (
              <div className="pi-comparison-block">
                <h5 className="pi-detail-label">Top Compared Products</h5>
                <div className="pi-compared-list">
                  {comparedProducts.map((product, i) => (
                    <div key={i} className="pi-compared-item">
                      <span className="pi-compared-rank">{i + 1}</span>
                      <span className="pi-compared-name">{product}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {comparisonFactors.length > 0 && (
              <div className="pi-comparison-block">
                <h5 className="pi-detail-label">Comparison Factors</h5>
                <div className="pi-tag-list">
                  {comparisonFactors.map((factor, i) => (
                    <span key={i} className="pi-factor-tag">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {comparison.decisionTimeline && (
              <div className="pi-comparison-block">
                <h5 className="pi-detail-label">Decision Timeline</h5>
                <p className="pi-timeline-text">{comparison.decisionTimeline}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barriers */}
      {barriers.length > 0 && (
        <div className="pi-barriers">
          <h4 className="pi-subsection-title">Purchase Barriers</h4>
          <div className="pi-barrier-list">
            {barriers.map((b, i) => {
              const freqCfg = FREQUENCY_CONFIG[b.frequency] ?? FREQUENCY_CONFIG.rare;
              return (
                <div key={i} className="pi-barrier-card">
                  <div className="pi-barrier-top">
                    <span className="pi-barrier-name">{b.barrier}</span>
                    <span
                      className="pi-frequency-badge"
                      style={{ background: freqCfg.bg, color: freqCfg.color, borderColor: freqCfg.border }}
                    >
                      {formatLabel(b.frequency)}
                    </span>
                  </div>
                  {b.suggestedResponse && (
                    <p className="pi-barrier-response">{b.suggestedResponse}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Brand Loyalty Signals */}
      {data.brandLoyaltySignals && data.brandLoyaltySignals.length > 0 && (
        <div className="pi-loyalty">
          <h4 className="pi-subsection-title">Brand Loyalty Signals</h4>
          <div className="pi-loyalty-list">
            {data.brandLoyaltySignals.map((ls, i) => {
              const strengthCfg = STRENGTH_CONFIG[ls.strength] ?? STRENGTH_CONFIG.weak;
              const typeLabels: Record<string, string> = {
                repeat_purchase: "Repeat Purchase",
                brand_advocacy: "Brand Advocacy",
                community_engagement: "Community",
                emotional_attachment: "Emotional",
              };
              return (
                <div key={i} className="pi-loyalty-card">
                  <div className="pi-loyalty-top">
                    <span className="pi-signal-name">{ls.signal}</span>
                    <span className="pi-strength-badge" style={{ background: strengthCfg.bg, color: strengthCfg.color }}>
                      {formatLabel(ls.strength)}
                    </span>
                  </div>
                  <div className="pi-loyalty-meta">
                    <span className="pi-type-badge">{typeLabels[ls.type] || formatLabel(ls.type)}</span>
                    {ls.platforms && ls.platforms.length > 0 && (
                      <div className="pi-tag-list">
                        {ls.platforms.map((p, j) => (
                          <span key={j} className="pi-platform-tag">{formatLabel(p)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {ls.examples && ls.examples.length > 0 && (
                    <div className="pi-loyalty-examples">
                      {ls.examples.map((ex, j) => (
                        <span key={j} className="pi-loyalty-example">&ldquo;{ex}&rdquo;</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Switching Intent Signals */}
      {data.switchingIntentSignals && data.switchingIntentSignals.length > 0 && (
        <div className="pi-switching">
          <h4 className="pi-subsection-title">Switching Intent Signals</h4>
          <div className="pi-switching-list">
            {data.switchingIntentSignals.map((ss, i) => {
              const freqCfg = FREQUENCY_CONFIG[ss.frequency] ?? FREQUENCY_CONFIG.rare;
              return (
                <div key={i} className="pi-switching-card">
                  <div className="pi-switching-top">
                    <span className="pi-signal-name">{ss.signal}</span>
                    <span className="pi-frequency-badge" style={{ background: freqCfg.bg, color: freqCfg.color, borderColor: freqCfg.border }}>
                      {formatLabel(ss.frequency)}
                    </span>
                  </div>
                  {(ss.fromBrand || ss.toBrand) && (
                    <div className="pi-switch-flow">
                      {ss.fromBrand && <span className="pi-switch-from">{ss.fromBrand}</span>}
                      {ss.fromBrand && ss.toBrand && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      )}
                      {ss.toBrand && <span className="pi-switch-to">{ss.toBrand}</span>}
                    </div>
                  )}
                  <p className="pi-switch-reason">{ss.reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback Classification */}
      {data.feedbackClassification && (
        <div className="pi-feedback-class">
          <h4 className="pi-subsection-title">Complaints vs Recommendations</h4>
          {data.feedbackClassification.overallRatio && (
            <div className="pi-ratio-bar">
              <div className="pi-ratio-segment pi-ratio-complaints" style={{ width: `${data.feedbackClassification.overallRatio.complaintsPercent}%` }}>
                {data.feedbackClassification.overallRatio.complaintsPercent > 10 && `${data.feedbackClassification.overallRatio.complaintsPercent}%`}
              </div>
              <div className="pi-ratio-segment pi-ratio-neutral" style={{ width: `${data.feedbackClassification.overallRatio.neutralPercent}%` }}>
                {data.feedbackClassification.overallRatio.neutralPercent > 10 && `${data.feedbackClassification.overallRatio.neutralPercent}%`}
              </div>
              <div className="pi-ratio-segment pi-ratio-recs" style={{ width: `${data.feedbackClassification.overallRatio.recommendationsPercent}%` }}>
                {data.feedbackClassification.overallRatio.recommendationsPercent > 10 && `${data.feedbackClassification.overallRatio.recommendationsPercent}%`}
              </div>
            </div>
          )}
          <div className="pi-feedback-columns">
            {data.feedbackClassification.complaints && data.feedbackClassification.complaints.length > 0 && (
              <div className="pi-feedback-col">
                <h5 className="pi-detail-label pi-complaints-label">Complaints</h5>
                {data.feedbackClassification.complaints.map((c, i) => (
                  <div key={i} className="pi-feedback-card pi-complaint-card">
                    <div className="pi-feedback-card-top">
                      <span className="pi-feedback-topic">{c.topic}</span>
                      <span className="pi-severity-badge pi-severity-{c.severity}">{c.severity}</span>
                    </div>
                    <blockquote className="pi-feedback-quote">{c.representativeQuote}</blockquote>
                  </div>
                ))}
              </div>
            )}
            {data.feedbackClassification.recommendations && data.feedbackClassification.recommendations.length > 0 && (
              <div className="pi-feedback-col">
                <h5 className="pi-detail-label pi-recs-label">Recommendations</h5>
                {data.feedbackClassification.recommendations.map((r, i) => (
                  <div key={i} className="pi-feedback-card pi-rec-card">
                    <div className="pi-feedback-card-top">
                      <span className="pi-feedback-topic">{r.topic}</span>
                      <span className="pi-enthusiasm-badge">{r.enthusiasm}</span>
                    </div>
                    <blockquote className="pi-feedback-quote">{r.representativeQuote}</blockquote>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversion Drivers */}
      {conversionDrivers.length > 0 && (
        <div className="pi-drivers">
          <h4 className="pi-subsection-title">Conversion Drivers</h4>
          <div className="pi-driver-list">
            {conversionDrivers.map((driver, i) => (
              <div key={i} className="pi-driver-item">
                <svg
                  className="pi-check-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-plasma-emerald)"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{driver}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .pi-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Signals by Stage */
        .pi-signals {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .pi-stage-group {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .pi-stage-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .pi-stage-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pi-stage-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .pi-stage-count {
          display: inline-flex;
          padding: 0.125rem 0.4375rem;
          border: 1px solid;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
        }

        .pi-signal-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-left: 1.125rem;
        }
        .pi-signal-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pi-signal-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -10px rgba(139, 92, 246, 0.15);
        }
        .pi-signal-top {
          padding: 0.875rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .pi-signal-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .pi-signal-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .pi-strength-badge {
          display: inline-flex;
          padding: 0.125rem 0.4375rem;
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .pi-signal-desc {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        /* Platform Tags */
        .pi-tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3125rem;
        }
        .pi-platform-tag {
          display: inline-flex;
          padding: 0.125rem 0.4375rem;
          background: rgba(139, 92, 246, 0.1);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.18);
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 500;
        }

        /* Examples Toggle */
        .pi-examples-section {
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }
        .pi-examples-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.015);
          border: none;
          cursor: pointer;
          color: var(--color-text-muted);
          font-size: 0.6875rem;
          font-weight: 500;
        }
        .pi-examples-toggle:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--color-text-secondary);
        }
        .pi-chevron {
          transition: transform 0.25s ease;
        }
        .pi-chevron-open {
          transform: rotate(180deg);
        }
        .pi-examples-list {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          padding: 0.5rem 1rem 0.75rem;
        }
        .pi-example-item {
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-left: 3px solid rgba(139, 92, 246, 0.35);
          border-radius: 0 6px 6px 0;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          font-style: italic;
        }

        /* Comparison Behavior */
        .pi-comparison {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .pi-subsection-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 0.875rem;
        }
        .pi-comparison-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .pi-comparison-block {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pi-detail-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin: 0;
        }
        .pi-compared-list {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .pi-compared-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.375rem 0.625rem;
          background: var(--color-surface);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .pi-compared-rank {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background: rgba(139, 92, 246, 0.12);
          color: var(--color-plasma-violet);
          border-radius: 5px;
          font-size: 0.625rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .pi-compared-name {
          font-size: 0.8125rem;
          color: var(--color-text-primary);
          font-weight: 500;
        }
        .pi-factor-tag {
          display: inline-flex;
          padding: 0.1875rem 0.5rem;
          background: rgba(6, 182, 212, 0.1);
          color: var(--color-plasma-cyan);
          border: 1px solid rgba(6, 182, 212, 0.18);
          border-radius: 5px;
          font-size: 0.6875rem;
          font-weight: 500;
        }
        .pi-timeline-text {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.55;
          margin: 0;
        }

        /* Barriers */
        .pi-barriers {
          display: flex;
          flex-direction: column;
        }
        .pi-barrier-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pi-barrier-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 0.875rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pi-barrier-card:hover {
          border-color: rgba(244, 63, 94, 0.15);
          transform: translateY(-1px);
          box-shadow: 0 4px 20px -8px rgba(244, 63, 94, 0.1);
        }
        .pi-barrier-top {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .pi-barrier-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .pi-frequency-badge {
          display: inline-flex;
          padding: 0.125rem 0.4375rem;
          border: 1px solid;
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .pi-barrier-response {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0;
          padding-left: 0.25rem;
        }

        /* Brand Loyalty */
        .pi-loyalty, .pi-switching, .pi-feedback-class {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .pi-loyalty-list, .pi-switching-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pi-loyalty-card, .pi-switching-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 0.875rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pi-loyalty-card:hover { border-color: rgba(16, 185, 129, 0.15); transform: translateY(-1px); }
        .pi-switching-card:hover { border-color: rgba(245, 158, 11, 0.15); transform: translateY(-1px); }
        .pi-loyalty-top, .pi-switching-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .pi-loyalty-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .pi-type-badge {
          display: inline-flex;
          padding: 0.125rem 0.4375rem;
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-plasma-emerald);
          border: 1px solid rgba(16, 185, 129, 0.18);
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .pi-loyalty-examples {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .pi-loyalty-example {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          font-style: italic;
          line-height: 1.4;
        }

        /* Switching Intent */
        .pi-switch-flow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .pi-switch-from {
          padding: 0.1875rem 0.5rem;
          background: rgba(244, 63, 94, 0.1);
          color: var(--color-plasma-rose);
          border: 1px solid rgba(244, 63, 94, 0.18);
          border-radius: 5px;
          font-size: 0.6875rem;
          font-weight: 600;
        }
        .pi-switch-to {
          padding: 0.1875rem 0.5rem;
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-plasma-emerald);
          border: 1px solid rgba(16, 185, 129, 0.18);
          border-radius: 5px;
          font-size: 0.6875rem;
          font-weight: 600;
        }
        .pi-switch-reason {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        /* Feedback Classification */
        .pi-ratio-bar {
          display: flex;
          height: 10px;
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 1rem;
          background: rgba(255, 255, 255, 0.04);
        }
        .pi-ratio-segment {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.5rem;
          font-weight: 700;
          transition: width 0.3s ease;
        }
        .pi-ratio-complaints {
          background: rgba(244, 63, 94, 0.5);
          color: white;
        }
        .pi-ratio-neutral {
          background: rgba(255, 255, 255, 0.08);
          color: var(--color-text-muted);
        }
        .pi-ratio-recs {
          background: rgba(16, 185, 129, 0.5);
          color: white;
        }
        .pi-feedback-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .pi-feedback-col {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pi-complaints-label { color: var(--color-plasma-rose) !important; }
        .pi-recs-label { color: var(--color-plasma-emerald) !important; }
        .pi-feedback-card {
          padding: 0.625rem 0.75rem;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .pi-complaint-card {
          background: rgba(244, 63, 94, 0.04);
          border-left: 3px solid rgba(244, 63, 94, 0.3);
        }
        .pi-rec-card {
          background: rgba(16, 185, 129, 0.04);
          border-left: 3px solid rgba(16, 185, 129, 0.3);
        }
        .pi-feedback-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .pi-feedback-topic {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .pi-severity-badge, .pi-enthusiasm-badge {
          display: inline-flex;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          background: rgba(255, 255, 255, 0.06);
          color: var(--color-text-muted);
        }
        .pi-feedback-quote {
          margin: 0;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          font-style: italic;
          line-height: 1.45;
        }

        @media (max-width: 640px) {
          .pi-feedback-columns {
            grid-template-columns: 1fr;
          }
        }

        /* Conversion Drivers */
        .pi-drivers {
          display: flex;
          flex-direction: column;
        }
        .pi-driver-list {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .pi-driver-item {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          padding: 0.5rem 0.75rem;
          background: rgba(16, 185, 129, 0.04);
          border-radius: 8px;
          border: 1px solid rgba(16, 185, 129, 0.08);
          font-size: 0.8125rem;
          color: var(--color-text-primary);
          line-height: 1.5;
        }
        .pi-check-icon {
          flex-shrink: 0;
          margin-top: 0.125rem;
          filter: drop-shadow(0 0 3px rgba(16, 185, 129, 0.4));
        }

        @media (max-width: 640px) {
          .pi-signal-list {
            padding-left: 0.625rem;
          }
          .pi-signal-top {
            padding: 0.75rem;
          }
          .pi-examples-list {
            padding: 0.375rem 0.75rem 0.625rem;
          }
        }
      `}</style>
    </div>
  );
}
