"use client";

/**
 * Analytics Charts — Client Component
 *
 * Renders interactive Recharts charts with date range selector.
 * Uses dark theme styling with amber/gold accent colors.
 */

import { useRouter, useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import type {
  DateRange,
  UserGrowthData,
  RevenueData,
  SubscriptionDistributionData,
  UsageOverviewData,
} from "@/lib/services/admin-analytics";
import {
  Users,
  DollarSign,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface AnalyticsChartsProps {
  range: DateRange;
  userGrowth: UserGrowthData;
  revenue: RevenueData;
  subscriptionDistribution: SubscriptionDistributionData;
  usageOverview: UsageOverviewData;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

function formatNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

/**
 * Thin down data points for legibility on wider date ranges.
 * Shows every nth point based on total count.
 */
function thinDataPoints<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  const result: T[] = [];
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }
  // Always include the last point
  if (result[result.length - 1] !== data[data.length - 1]) {
    result.push(data[data.length - 1]);
  }
  return result;
}

// ──────────────────────────────────────────────
// Custom Tooltip
// ──────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 text-sm shadow-xl"
      style={{
        background: "rgba(10, 10, 20, 0.95)",
        borderColor: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
      }}
    >
      <p className="mb-1.5 font-medium text-[var(--color-text-secondary)]">
        {label}
      </p>
      {payload.map((item: TooltipPayloadItem) => (
        <div key={item.dataKey} className="flex items-center gap-2 py-0.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: item.color }}
          />
          <span className="text-[var(--color-text-muted)]">{item.name}:</span>
          <span className="font-medium text-[var(--color-text-primary)]">
            {formatter ? formatter(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Date Range Selector
// ──────────────────────────────────────────────

const rangeOptions: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "1y", label: "1 Year" },
];

function DateRangeSelector({ current }: { current: DateRange }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelect(range: DateRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.push(`/admin/analytics?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      {rangeOptions.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleSelect(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            current === opt.value
              ? "bg-[var(--color-plasma-amber)]/20 text-[var(--color-plasma-amber)] shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              : "bg-white/[0.04] text-[var(--color-text-muted)] hover:bg-white/[0.08] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Stat Card (summary above charts)
// ──────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accentColor: string;
}) {
  return (
    <div className="holo-card p-5">
      <div className="flex items-center gap-3">
        <div
          className="p-2.5 rounded-xl"
          style={{
            background: `${accentColor}15`,
            boxShadow: `0 0 16px ${accentColor}20`,
          }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-bold text-[var(--color-text-primary)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Pie Chart Colors
// ──────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  Free: "rgba(148,163,184,0.8)", // slate
  Starter: "rgba(6,182,212,1)", // cyan
  Professional: "rgba(139,92,246,1)", // violet
  Agency: "rgba(245,158,11,1)", // amber
  Enterprise: "rgba(16,185,129,1)", // emerald
};

// ──────────────────────────────────────────────
// Custom Pie Label
// ──────────────────────────────────────────────

function renderPieLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx);
  const cy = Number(props.cy);
  const midAngle = Number(props.midAngle);
  const innerRadius = Number(props.innerRadius);
  const outerRadius = Number(props.outerRadius);
  const percent = Number(props.percent);
  const tier = String((props as unknown as Record<string, unknown>).tier ?? "");

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const percentage = Math.round(percent * 100);
  if (percentage < 3) return null;

  return (
    <text
      x={x}
      y={y}
      fill="rgba(255,255,255,0.7)"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {tier} ({percentage}%)
    </text>
  );
}

// ──────────────────────────────────────────────
// Custom Pie Tooltip
// ──────────────────────────────────────────────

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { percentage: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      className="rounded-lg border px-3 py-2 text-sm shadow-xl"
      style={{
        background: "rgba(10, 10, 20, 0.95)",
        borderColor: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: TIER_COLORS[item.name] ?? "#888" }}
        />
        <span className="font-medium text-[var(--color-text-primary)]">
          {item.name}
        </span>
      </div>
      <p className="mt-1 text-[var(--color-text-muted)]">
        {item.value} subscriptions ({item.payload.percentage}%)
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function AnalyticsCharts({
  range,
  userGrowth,
  revenue,
  subscriptionDistribution,
  usageOverview,
}: AnalyticsChartsProps) {
  // Thin data for larger ranges
  const maxPoints = range === "1y" ? 52 : range === "90d" ? 45 : 0;
  const userPoints =
    maxPoints > 0
      ? thinDataPoints(userGrowth.points, maxPoints)
      : userGrowth.points;
  const revenuePoints =
    maxPoints > 0
      ? thinDataPoints(revenue.points, maxPoints)
      : revenue.points;
  const usagePoints =
    maxPoints > 0
      ? thinDataPoints(usageOverview.points, maxPoints)
      : usageOverview.points;

  // Chart axis/grid styling for dark theme
  const axisStyle = {
    fontSize: 11,
    fill: "rgba(255,255,255,0.4)",
    fontFamily: "inherit",
  };
  const gridStroke = "rgba(255,255,255,0.06)";

  return (
    <div className="space-y-8">
      {/* Date range selector */}
      <div className="flex items-center justify-between">
        <DateRangeSelector current={range} />
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={
            <Users
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-amber)" }}
            />
          }
          label="Total Users"
          value={formatNumber(userGrowth.totalUsers)}
          accentColor="rgba(245,158,11)"
        />
        <StatCard
          icon={
            <TrendingUp
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-emerald)" }}
            />
          }
          label={`New Users (${range})`}
          value={formatNumber(userGrowth.newUsersInPeriod)}
          accentColor="rgba(16,185,129)"
        />
        <StatCard
          icon={
            <DollarSign
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-cyan)" }}
            />
          }
          label="Current MRR"
          value={formatCurrency(revenue.currentMRR)}
          accentColor="rgba(6,182,212)"
        />
      </div>

      {/* User Growth Chart */}
      <div className="holo-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users
            className="h-5 w-5"
            style={{ color: "var(--color-plasma-amber)" }}
          />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            User Growth
          </h2>
        </div>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={userPoints}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={axisStyle}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="new"
                orientation="left"
                tick={axisStyle}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
                tickFormatter={formatNumber}
              />
              <YAxis
                yAxisId="cumulative"
                orientation="right"
                tick={axisStyle}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
                tickFormatter={formatNumber}
              />
              <Tooltip
                content={<CustomTooltip formatter={formatNumber} />}
              />
              <Legend
                wrapperStyle={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                  paddingTop: 16,
                }}
              />
              <Line
                yAxisId="new"
                type="monotone"
                dataKey="newUsers"
                name="New Sign-ups"
                stroke="rgba(245,158,11,1)"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: "rgba(245,158,11,1)",
                  fill: "rgba(10,10,20,1)",
                  strokeWidth: 2,
                }}
              />
              <Line
                yAxisId="cumulative"
                type="monotone"
                dataKey="cumulativeUsers"
                name="Cumulative Users"
                stroke="rgba(6,182,212,1)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: "rgba(6,182,212,1)",
                  fill: "rgba(10,10,20,1)",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Chart (Stacked Area) */}
      <div className="holo-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign
            className="h-5 w-5"
            style={{ color: "var(--color-plasma-emerald)" }}
          />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Revenue (MRR by Tier)
          </h2>
        </div>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={revenuePoints}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient
                  id="gradStarter"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="rgba(6,182,212,1)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="rgba(6,182,212,1)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
                <linearGradient
                  id="gradProfessional"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="rgba(139,92,246,1)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="rgba(139,92,246,1)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
                <linearGradient
                  id="gradAgency"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="rgba(245,158,11,1)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="rgba(245,158,11,1)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={axisStyle}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={axisStyle}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                content={<CustomTooltip formatter={formatCurrency} />}
              />
              <Legend
                wrapperStyle={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                  paddingTop: 16,
                }}
              />
              <Area
                type="monotone"
                dataKey="starter"
                name="Starter"
                stackId="1"
                stroke="rgba(6,182,212,1)"
                fill="url(#gradStarter)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="professional"
                name="Professional"
                stackId="1"
                stroke="rgba(139,92,246,1)"
                fill="url(#gradProfessional)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="agency"
                name="Agency"
                stackId="1"
                stroke="rgba(245,158,11,1)"
                fill="url(#gradAgency)"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subscription Distribution & Usage Overview — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Distribution (Donut Chart) */}
        <div className="holo-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-amber)" }}
            />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Subscription Distribution
            </h2>
          </div>
          {subscriptionDistribution.total === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-[var(--color-text-muted)]">
              No active subscriptions
            </div>
          ) : (
            <>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subscriptionDistribution.items}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={renderPieLabel}
                    >
                      {subscriptionDistribution.items.map((item) => (
                        <Cell
                          key={item.tier}
                          fill={TIER_COLORS[item.tier] ?? "#888"}
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend below chart */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 justify-center">
                {subscriptionDistribution.items.map((item) => (
                  <div key={item.tier} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: TIER_COLORS[item.tier] ?? "#888" }}
                    />
                    <span className="text-[var(--color-text-muted)]">
                      {item.tier}
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {item.count}
                    </span>
                    <span className="text-[var(--color-text-muted)]">
                      ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
              {/* Total */}
              <p className="text-center mt-3 text-xs text-[var(--color-text-muted)]">
                {subscriptionDistribution.total} active subscriptions
              </p>
            </>
          )}
        </div>

        {/* Usage Overview (Grouped Bar Chart) */}
        <div className="holo-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity
                className="h-5 w-5"
                style={{ color: "var(--color-plasma-emerald)" }}
              />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Usage Overview
              </h2>
            </div>
          </div>

          {/* Usage summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-lg p-3 bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                Personas
              </p>
              <p className="text-lg font-bold text-[var(--color-plasma-amber)]">
                {formatNumber(usageOverview.totalPersonas)}
              </p>
            </div>
            <div className="rounded-lg p-3 bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                Images
              </p>
              <p className="text-lg font-bold text-[var(--color-plasma-cyan,rgba(6,182,212,1))]">
                {formatNumber(usageOverview.totalImages)}
              </p>
            </div>
            <div className="rounded-lg p-3 bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                Videos
              </p>
              <p className="text-lg font-bold" style={{ color: "rgba(139,92,246,1)" }}>
                {formatNumber(usageOverview.totalVideos)}
              </p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={usagePoints}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={axisStyle}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={axisStyle}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                  tickFormatter={formatNumber}
                />
                <Tooltip
                  content={<CustomTooltip formatter={formatNumber} />}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.6)",
                    paddingTop: 12,
                  }}
                />
                <Bar
                  dataKey="personas"
                  name="Personas"
                  fill="rgba(245,158,11,0.8)"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="images"
                  name="Images"
                  fill="rgba(6,182,212,0.8)"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="videos"
                  name="Videos"
                  fill="rgba(139,92,246,0.8)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Links to sub-pages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/analytics/detailed"
          className="holo-card p-5 flex items-center justify-between group hover:border-[var(--color-plasma-amber)]/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <TrendingUp
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-amber)" }}
            />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Detailed Analytics
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Cohort retention, churn metrics, and lifetime value
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-plasma-amber)] transition-colors" />
        </Link>

        <Link
          href="/admin/analytics/realtime"
          className="holo-card p-5 flex items-center justify-between group hover:border-[var(--color-plasma-emerald)]/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Activity
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-emerald)" }}
            />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Real-time Monitoring
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Live activity, active users, and generation stats
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-plasma-emerald)] transition-colors" />
        </Link>
      </div>
    </div>
  );
}
