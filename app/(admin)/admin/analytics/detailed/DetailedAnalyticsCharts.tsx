"use client";

/**
 * Detailed Analytics Charts — Client Component
 *
 * Renders cohort retention heatmap table, churn metrics section,
 * lifetime value metric cards, feature adoption bars, and conversion funnel.
 * Dark theme with amber accents.
 */

import type {
  CohortRetentionData,
  ChurnMetricsData,
  LTVData,
  FeatureAdoptionData,
  ConversionFunnelData,
} from "@/lib/services/admin-analytics";
import {
  Users,
  TrendingDown,
  DollarSign,
  CalendarDays,
  AlertTriangle,
  Layers,
  Filter,
} from "lucide-react";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/**
 * Returns a background color for retention percentage using a green→yellow→red heatmap.
 * High retention = green, low retention = red.
 */
function retentionColor(pct: number): string {
  if (pct >= 80) return "rgba(16,185,129,0.35)"; // emerald
  if (pct >= 60) return "rgba(16,185,129,0.2)";
  if (pct >= 40) return "rgba(245,158,11,0.25)"; // amber
  if (pct >= 20) return "rgba(245,158,11,0.15)";
  return "rgba(244,63,94,0.25)"; // rose
}

function retentionTextColor(pct: number): string {
  if (pct >= 80) return "rgba(16,185,129,1)";
  if (pct >= 60) return "rgba(16,185,129,0.8)";
  if (pct >= 40) return "rgba(245,158,11,1)";
  if (pct >= 20) return "rgba(245,158,11,0.8)";
  return "rgba(244,63,94,1)";
}

/**
 * Returns a color for a feature adoption percentage bar.
 * High = emerald, medium = amber, low = rose.
 */
function adoptionBarColor(pct: number): string {
  if (pct >= 50) return "rgba(16,185,129,1)"; // emerald
  if (pct >= 25) return "rgba(6,182,212,1)"; // cyan
  if (pct >= 10) return "rgba(245,158,11,1)"; // amber
  return "rgba(244,63,94,0.8)"; // rose
}

/** Colors for each funnel stage */
const FUNNEL_COLORS = [
  "rgba(6,182,212,1)", // Sign-up — cyan
  "rgba(16,185,129,1)", // First Brand — emerald
  "rgba(139,92,246,1)", // First Persona — violet
  "rgba(245,158,11,1)", // First Creative — amber
  "rgba(244,63,94,1)", // Paid Subscription — rose
];

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface DetailedAnalyticsChartsProps {
  cohortRetention: CohortRetentionData;
  churnMetrics: ChurnMetricsData;
  ltvData: LTVData;
  featureAdoption: FeatureAdoptionData;
  conversionFunnel: ConversionFunnelData;
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function DetailedAnalyticsCharts({
  cohortRetention,
  churnMetrics,
  ltvData,
  featureAdoption,
  conversionFunnel,
}: DetailedAnalyticsChartsProps) {
  return (
    <div className="space-y-8">
      {/* ── Cohort Retention Table ── */}
      <div className="holo-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users
            className="h-5 w-5"
            style={{ color: "var(--color-plasma-amber)" }}
          />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Cohort Retention
          </h2>
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">
            Monthly cohorts showing retention % over time
          </span>
        </div>

        {cohortRetention.cohorts.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[var(--color-text-muted)]">
            No subscription data available for cohort analysis
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 text-[var(--color-text-muted)] font-medium whitespace-nowrap">
                    Cohort
                  </th>
                  <th className="text-center px-3 py-2 text-[var(--color-text-muted)] font-medium whitespace-nowrap">
                    Size
                  </th>
                  {Array.from(
                    { length: cohortRetention.maxMonths },
                    (_, i) => (
                      <th
                        key={i}
                        className="text-center px-3 py-2 text-[var(--color-text-muted)] font-medium whitespace-nowrap"
                      >
                        M{i}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {cohortRetention.cohorts.map((cohort) => (
                  <tr key={cohort.cohortMonth}>
                    <td className="px-3 py-2 text-[var(--color-text-primary)] font-medium whitespace-nowrap">
                      {formatMonth(cohort.cohortMonth)}
                    </td>
                    <td className="text-center px-3 py-2 text-[var(--color-text-secondary)]">
                      {cohort.cohortSize}
                    </td>
                    {Array.from(
                      { length: cohortRetention.maxMonths },
                      (_, i) => {
                        const pct = cohort.retention[i];
                        if (pct === undefined) {
                          return (
                            <td
                              key={i}
                              className="text-center px-3 py-2 text-[var(--color-text-muted)]"
                            >
                              —
                            </td>
                          );
                        }
                        return (
                          <td
                            key={i}
                            className="text-center px-3 py-2 font-medium rounded-sm"
                            style={{
                              background: retentionColor(pct),
                              color: retentionTextColor(pct),
                            }}
                          >
                            {pct}%
                          </td>
                        );
                      }
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Heatmap legend */}
        {cohortRetention.cohorts.length > 0 && (
          <div className="flex items-center gap-4 mt-4 text-xs text-[var(--color-text-muted)]">
            <span>Retention:</span>
            <div className="flex items-center gap-1.5">
              <div
                className="h-3 w-8 rounded-sm"
                style={{ background: "rgba(244,63,94,0.25)" }}
              />
              <span>0-20%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="h-3 w-8 rounded-sm"
                style={{ background: "rgba(245,158,11,0.15)" }}
              />
              <span>20-40%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="h-3 w-8 rounded-sm"
                style={{ background: "rgba(245,158,11,0.25)" }}
              />
              <span>40-60%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="h-3 w-8 rounded-sm"
                style={{ background: "rgba(16,185,129,0.2)" }}
              />
              <span>60-80%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="h-3 w-8 rounded-sm"
                style={{ background: "rgba(16,185,129,0.35)" }}
              />
              <span>80-100%</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Churn Metrics ── */}
      <div className="holo-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingDown
            className="h-5 w-5"
            style={{ color: "rgba(244,63,94,1)" }}
          />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Churn Metrics
          </h2>
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">
            Current month
          </span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-5 bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle
                className="h-4 w-4"
                style={{
                  color:
                    churnMetrics.monthlyChurnRate > 5
                      ? "rgba(244,63,94,1)"
                      : "var(--color-plasma-amber)",
                }}
              />
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                Monthly Churn Rate
              </p>
            </div>
            <p
              className="text-2xl font-bold"
              style={{
                color:
                  churnMetrics.monthlyChurnRate > 5
                    ? "rgba(244,63,94,1)"
                    : churnMetrics.monthlyChurnRate > 3
                      ? "rgba(245,158,11,1)"
                      : "rgba(16,185,129,1)",
              }}
            >
              {churnMetrics.monthlyChurnRate}%
            </p>
          </div>

          <div className="rounded-xl p-5 bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Users
                className="h-4 w-4"
                style={{ color: "rgba(244,63,94,0.8)" }}
              />
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                Churned This Month
              </p>
            </div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {churnMetrics.totalChurnedThisMonth}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              of {churnMetrics.totalActiveStartOfMonth} paid at start of month
            </p>
          </div>

          <div className="rounded-xl p-5 bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays
                className="h-4 w-4"
                style={{ color: "var(--color-plasma-cyan)" }}
              />
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                Active Paid Subs
              </p>
            </div>
            <p className="text-2xl font-bold text-[var(--color-plasma-cyan,rgba(6,182,212,1))]">
              {churnMetrics.totalActiveStartOfMonth -
                churnMetrics.totalChurnedThisMonth}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              currently active paid subscribers
            </p>
          </div>
        </div>

        {/* Churn breakdown by tier */}
        {churnMetrics.churnByTier.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
              Churn Breakdown by Tier
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {churnMetrics.churnByTier.map((item) => (
                <div
                  key={item.tier}
                  className="rounded-lg p-4 bg-white/[0.02] border border-white/[0.06]"
                >
                  <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {item.tier}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-lg font-bold"
                      style={{
                        color:
                          item.rate > 5
                            ? "rgba(244,63,94,1)"
                            : item.rate > 3
                              ? "rgba(245,158,11,1)"
                              : "rgba(16,185,129,1)",
                      }}
                    >
                      {item.rate}%
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      ({item.churned}/{item.total})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            No paid subscription data available for churn analysis
          </p>
        )}
      </div>

      {/* ── Lifetime Value (LTV) by Tier ── */}
      <div className="holo-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign
            className="h-5 w-5"
            style={{ color: "var(--color-plasma-emerald)" }}
          />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Lifetime Value by Tier
          </h2>
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">
            Average LTV = avg. duration &times; monthly price
          </span>
        </div>

        {ltvData.tiers.some((t) => t.subscriberCount > 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ltvData.tiers.map((item) => {
              const tierColorMap: Record<string, string> = {
                Starter: "rgba(6,182,212,1)",
                Professional: "rgba(139,92,246,1)",
                Agency: "rgba(245,158,11,1)",
              };
              const color = tierColorMap[item.tier] ?? "rgba(255,255,255,0.6)";

              return (
                <div
                  key={item.tier}
                  className="rounded-xl p-5 border"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderColor: `${color}30`,
                    boxShadow: `0 0 20px ${color}10`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p
                      className="text-sm font-semibold uppercase tracking-wider"
                      style={{ color }}
                    >
                      {item.tier}
                    </p>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {item.subscriberCount} subscriber
                      {item.subscriberCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <p
                    className="text-3xl font-bold mb-3"
                    style={{ color }}
                  >
                    {formatCurrency(item.ltv)}
                  </p>

                  <div className="space-y-1.5 text-xs text-[var(--color-text-muted)]">
                    <div className="flex justify-between">
                      <span>Avg. duration</span>
                      <span className="text-[var(--color-text-secondary)]">
                        {item.avgLifetimeMonths} months
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly price</span>
                      <span className="text-[var(--color-text-secondary)]">
                        {formatCurrency(item.monthlyPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            No paid subscription data available for LTV analysis
          </p>
        )}
      </div>

      {/* ── Feature Adoption ── */}
      <div className="holo-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Layers
            className="h-5 w-5"
            style={{ color: "var(--color-plasma-cyan,rgba(6,182,212,1))" }}
          />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Feature Adoption
          </h2>
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">
            % of {featureAdoption.totalUsers} users who used each feature
          </span>
        </div>

        {featureAdoption.totalUsers > 0 ? (
          <div className="space-y-4">
            {featureAdoption.items.map((item) => {
              const barColor = adoptionBarColor(item.percentage);
              return (
                <div key={item.feature}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-[var(--color-text-primary)]">
                      {item.feature}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {item.usersAdopted} / {item.totalUsers}
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: barColor }}
                      >
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(item.percentage, 0.5)}%`,
                        background: barColor,
                        boxShadow: `0 0 8px ${barColor}40`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            No user data available for feature adoption analysis
          </p>
        )}
      </div>

      {/* ── Conversion Funnel ── */}
      <div className="holo-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Filter
            className="h-5 w-5"
            style={{ color: "var(--color-plasma-amber)" }}
          />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Conversion Funnel
          </h2>
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">
            User progression through key stages
          </span>
        </div>

        {conversionFunnel.stages.length > 0 &&
        conversionFunnel.stages[0].count > 0 ? (
          <div className="space-y-3">
            {conversionFunnel.stages.map((stage, i) => {
              const maxCount = conversionFunnel.stages[0].count;
              const widthPct =
                maxCount > 0
                  ? Math.max((stage.count / maxCount) * 100, 4)
                  : 4;
              const stageColor = FUNNEL_COLORS[i] ?? "rgba(245,158,11,1)";

              return (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {stage.stage}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {stage.count.toLocaleString()}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: stageColor }}
                      >
                        {stage.percentage}%
                      </span>
                      {i > 0 && stage.dropoff > 0 && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          ({stage.dropoff}% drop)
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="h-8 rounded-lg overflow-hidden flex items-center px-3 transition-all"
                    style={{
                      width: `${widthPct}%`,
                      background: `${stageColor}25`,
                      borderLeft: `3px solid ${stageColor}`,
                      minWidth: "60px",
                    }}
                  >
                    <span
                      className="text-xs font-medium whitespace-nowrap"
                      style={{ color: stageColor }}
                    >
                      {stage.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            No data available for conversion funnel analysis
          </p>
        )}
      </div>
    </div>
  );
}
