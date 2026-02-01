"use client";

import type { CompetitivePositioning } from "@/lib/services/intelligence-synthesizer";

interface CompetitivePositioningSectionProps {
  data: CompetitivePositioning;
}

function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPricePositionStyle(position: string): { bg: string; color: string; border: string } {
  switch (position) {
    case "cheaper":
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        color: "var(--color-plasma-emerald)",
        border: "rgba(16, 185, 129, 0.2)",
      };
    case "premium":
      return {
        bg: "rgba(244, 63, 94, 0.12)",
        color: "var(--color-plasma-rose)",
        border: "rgba(244, 63, 94, 0.2)",
      };
    default:
      return {
        bg: "rgba(245, 158, 11, 0.12)",
        color: "var(--color-plasma-amber)",
        border: "rgba(245, 158, 11, 0.2)",
      };
  }
}

function renderStars(rating: number | null): string {
  if (rating == null) return "N/A";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty) + ` ${rating.toFixed(1)}`;
}

export default function CompetitivePositioningSection({ data }: CompetitivePositioningSectionProps) {
  const priceComparison = Array.isArray(data?.priceComparison) ? data.priceComparison : [];
  const featureComparison = Array.isArray(data?.featureComparison) ? data.featureComparison : [];
  const reviewComparison = Array.isArray(data?.reviewComparison) ? data.reviewComparison : [];
  const marketPosition = data?.marketPosition ?? { quadrant: "", differentiators: [], vulnerabilities: [] };

  const hasData =
    priceComparison.length > 0 ||
    featureComparison.length > 0 ||
    reviewComparison.length > 0 ||
    marketPosition.quadrant;

  if (!data || !hasData) {
    return (
      <div className="cp-empty">
        <span style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          No competitive data available
        </span>
      </div>
    );
  }

  // Collect all unique competitor names for the feature comparison table
  const allCompetitors = Array.from(
    new Set(
      featureComparison.flatMap((f) =>
        f.competitors ? Object.keys(f.competitors) : []
      )
    )
  );

  return (
    <div className="cp-dashboard">
      {/* Price Comparison */}
      {priceComparison.length > 0 && (
        <div className="cp-section">
          <h4 className="cp-subsection-title">Price Comparison</h4>
          <div className="cp-table-wrapper">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Competitor</th>
                  <th>Price</th>
                  <th>Position</th>
                  <th>Value Perception</th>
                </tr>
              </thead>
              <tbody>
                {priceComparison.map((item, i) => {
                  const posStyle = getPricePositionStyle(item.pricePosition);
                  return (
                    <tr key={i}>
                      <td className="cp-cell-name">{item.competitor}</td>
                      <td className="cp-cell-price">{item.price}</td>
                      <td>
                        <span
                          className="cp-badge"
                          style={{
                            background: posStyle.bg,
                            color: posStyle.color,
                            borderColor: posStyle.border,
                          }}
                        >
                          {formatLabel(item.pricePosition)}
                        </span>
                      </td>
                      <td className="cp-cell-perception">{item.valuePerception}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Comparison */}
      {featureComparison.length > 0 && allCompetitors.length > 0 && (
        <div className="cp-section">
          <h4 className="cp-subsection-title">Feature Comparison</h4>
          <div className="cp-table-wrapper">
            <table className="cp-table cp-feature-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="cp-col-our">Our Product</th>
                  {allCompetitors.map((comp) => (
                    <th key={comp}>{comp}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((item, i) => (
                  <tr key={i}>
                    <td className="cp-cell-feature">{item.feature}</td>
                    <td className="cp-cell-our">{item.ourProduct}</td>
                    {allCompetitors.map((comp) => (
                      <td key={comp} className="cp-cell-comp">
                        {item.competitors?.[comp] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Comparison */}
      {reviewComparison.length > 0 && (
        <div className="cp-section">
          <h4 className="cp-subsection-title">Review Comparison</h4>
          <div className="cp-review-grid">
            {reviewComparison.map((item, i) => {
              const praise = Array.isArray(item.topPraise) ? item.topPraise : [];
              const complaints = Array.isArray(item.topComplaints) ? item.topComplaints : [];
              return (
                <div key={i} className="cp-review-card">
                  <div className="cp-review-header">
                    <span className="cp-review-name">{item.competitor}</span>
                    <span className="cp-review-volume">{item.reviewVolume}</span>
                  </div>
                  <div className="cp-review-rating" style={{
                    color: item.avgRating != null && item.avgRating >= 4
                      ? "var(--color-plasma-emerald)"
                      : item.avgRating != null && item.avgRating >= 3
                        ? "var(--color-plasma-amber)"
                        : "var(--color-plasma-rose)",
                  }}>
                    {renderStars(item.avgRating)}
                  </div>
                  {praise.length > 0 && (
                    <div className="cp-review-list">
                      <span className="cp-review-list-label" style={{ color: "var(--color-plasma-emerald)" }}>
                        Praise
                      </span>
                      {praise.map((p, j) => (
                        <div key={j} className="cp-review-item cp-review-praise">
                          {p}
                        </div>
                      ))}
                    </div>
                  )}
                  {complaints.length > 0 && (
                    <div className="cp-review-list">
                      <span className="cp-review-list-label" style={{ color: "var(--color-plasma-rose)" }}>
                        Complaints
                      </span>
                      {complaints.map((c, j) => (
                        <div key={j} className="cp-review-item cp-review-complaint">
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Market Position */}
      {marketPosition.quadrant && (
        <div className="cp-section">
          <h4 className="cp-subsection-title">Market Position</h4>
          <div className="cp-market">
            <div className="cp-market-quadrant">{marketPosition.quadrant}</div>
            <div className="cp-market-lists">
              {Array.isArray(marketPosition.differentiators) && marketPosition.differentiators.length > 0 && (
                <div className="cp-market-group">
                  <span className="cp-market-group-label">Differentiators</span>
                  <div className="cp-tag-list">
                    {marketPosition.differentiators.map((d, i) => (
                      <span key={i} className="cp-tag cp-tag-green">{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(marketPosition.vulnerabilities) && marketPosition.vulnerabilities.length > 0 && (
                <div className="cp-market-group">
                  <span className="cp-market-group-label">Vulnerabilities</span>
                  <div className="cp-tag-list">
                    {marketPosition.vulnerabilities.map((v, i) => (
                      <span key={i} className="cp-tag cp-tag-amber">{v}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cp-dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .cp-empty {
          padding: 1.5rem;
          text-align: center;
        }
        .cp-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .cp-subsection-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        /* Tables */
        .cp-table-wrapper {
          overflow-x: auto;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .cp-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }
        .cp-table th {
          padding: 0.625rem 0.875rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .cp-table td {
          padding: 0.625rem 0.875rem;
          color: var(--color-text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          vertical-align: middle;
        }
        .cp-table tbody tr:last-child td {
          border-bottom: none;
        }
        .cp-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .cp-cell-name {
          font-weight: 600;
          color: var(--color-text-primary);
          white-space: nowrap;
        }
        .cp-cell-price {
          font-weight: 600;
          color: var(--color-text-primary);
          font-variant-numeric: tabular-nums;
        }
        .cp-cell-perception {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          max-width: 260px;
        }
        .cp-badge {
          display: inline-flex;
          padding: 0.1875rem 0.5rem;
          border: 1px solid;
          border-radius: 5px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }

        /* Feature table */
        .cp-feature-table th,
        .cp-feature-table td {
          min-width: 100px;
        }
        .cp-cell-feature {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .cp-col-our {
          color: var(--color-plasma-violet) !important;
        }
        .cp-cell-our {
          color: var(--color-plasma-violet);
          font-weight: 500;
        }
        .cp-cell-comp {
          color: var(--color-text-secondary);
        }

        /* Review cards */
        .cp-review-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 0.75rem;
        }
        .cp-review-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cp-review-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -10px rgba(139, 92, 246, 0.15);
        }
        .cp-review-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cp-review-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .cp-review-volume {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
        }
        .cp-review-rating {
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .cp-review-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .cp-review-list-label {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 0.125rem;
        }
        .cp-review-item {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          line-height: 1.4;
        }
        .cp-review-praise {
          background: rgba(16, 185, 129, 0.08);
          color: rgba(16, 185, 129, 0.9);
          border-left: 2px solid rgba(16, 185, 129, 0.3);
        }
        .cp-review-complaint {
          background: rgba(244, 63, 94, 0.08);
          color: rgba(244, 63, 94, 0.9);
          border-left: 2px solid rgba(244, 63, 94, 0.3);
        }

        /* Market Position */
        .cp-market {
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .cp-market-quadrant {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--color-text-primary);
          letter-spacing: -0.01em;
        }
        .cp-market-lists {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .cp-market-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .cp-market-group-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .cp-tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        .cp-tag {
          display: inline-flex;
          padding: 0.1875rem 0.5rem;
          border: 1px solid;
          border-radius: 5px;
          font-size: 0.6875rem;
          font-weight: 500;
        }
        .cp-tag-green {
          background: rgba(16, 185, 129, 0.12);
          color: var(--color-plasma-emerald);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .cp-tag-amber {
          background: rgba(245, 158, 11, 0.12);
          color: var(--color-plasma-amber);
          border-color: rgba(245, 158, 11, 0.2);
        }

        @media (max-width: 640px) {
          .cp-review-grid {
            grid-template-columns: 1fr;
          }
          .cp-cell-perception {
            max-width: none;
          }
          .cp-market-quadrant {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </div>
  );
}
