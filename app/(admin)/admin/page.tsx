/**
 * Admin Overview Dashboard
 *
 * Displays key platform metrics as cards with growth indicators.
 * All data is fetched server-side via the admin Supabase client.
 */

import {
  getPlatformMetrics,
  getRecentActivity,
  type MetricWithGrowth,
  type ActivityType,
} from "@/lib/services/admin-metrics";
import {
  Users,
  CreditCard,
  DollarSign,
  Briefcase,
  UserPlus,
  ImageIcon,
  Video,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Palette,
} from "lucide-react";

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1)}M`;
  }
  if (dollars >= 1_000) {
    return `$${(dollars / 1_000).toFixed(1)}K`;
  }
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function GrowthBadge({ growth }: { growth: number }) {
  const rounded = Math.round(growth * 10) / 10;
  const isPositive = rounded > 0;
  const isNegative = rounded < 0;
  const isNeutral = rounded === 0;

  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isPositive
          ? "bg-[var(--color-plasma-emerald)]/15 text-[var(--color-plasma-emerald)]"
          : isNegative
            ? "bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]"
            : "bg-white/10 text-[var(--color-text-muted)]"
      }`}
    >
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNegative && <TrendingDown className="h-3 w-3" />}
      {isNeutral && <Minus className="h-3 w-3" />}
      <span>
        {isPositive ? "+" : ""}
        {rounded}%
      </span>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  metric: MetricWithGrowth;
  icon: React.ReactNode;
  accentColor: string;
  delay: number;
}

function MetricCard({
  label,
  value,
  metric,
  icon,
  accentColor,
  delay,
}: MetricCardProps) {
  return (
    <div
      className="holo-card p-6 animate-fade-up"
      style={{
        animationDelay: `${delay * 100}ms`,
        borderColor: `${accentColor}10`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-3 rounded-xl"
          style={{
            background: `${accentColor}15`,
            boxShadow: `0 0 20px ${accentColor}20`,
          }}
        >
          {icon}
        </div>
        <GrowthBadge growth={metric.growth} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">
          {value}
        </p>
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        vs. previous 30 days
      </p>
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

const activityIconMap: Record<
  ActivityType,
  { icon: React.ReactNode; color: string }
> = {
  new_user: {
    icon: <UserPlus className="h-4 w-4" />,
    color: "rgba(245,158,11)",
  },
  subscription_change: {
    icon: <CreditCard className="h-4 w-4" />,
    color: "rgba(6,182,212)",
  },
  brand_created: {
    icon: <Briefcase className="h-4 w-4" />,
    color: "rgba(16,185,129)",
  },
  persona_created: {
    icon: <Users className="h-4 w-4" />,
    color: "rgba(139,92,246)",
  },
  creative_created: {
    icon: <Palette className="h-4 w-4" />,
    color: "rgba(217,70,239)",
  },
};

export default async function AdminDashboardPage() {
  const [metrics, recentActivity] = await Promise.all([
    getPlatformMetrics(),
    getRecentActivity(),
  ]);

  const cards = [
    {
      label: "Total Users",
      value: formatNumber(metrics.totalUsers.current),
      metric: metrics.totalUsers,
      icon: <Users className="h-5 w-5" style={{ color: "var(--color-plasma-amber)" }} />,
      accentColor: "rgba(245,158,11)",
    },
    {
      label: "Active Subscriptions",
      value: formatNumber(metrics.activeSubscriptions.current),
      metric: metrics.activeSubscriptions,
      icon: <CreditCard className="h-5 w-5" style={{ color: "var(--color-plasma-cyan)" }} />,
      accentColor: "rgba(6,182,212)",
    },
    {
      label: "Monthly Recurring Revenue",
      value: formatCurrency(metrics.mrr.current),
      metric: metrics.mrr,
      icon: <DollarSign className="h-5 w-5" style={{ color: "var(--color-plasma-emerald)" }} />,
      accentColor: "rgba(16,185,129)",
    },
    {
      label: "Total Brands",
      value: formatNumber(metrics.totalBrands.current),
      metric: metrics.totalBrands,
      icon: <Briefcase className="h-5 w-5" style={{ color: "var(--color-plasma-fuchsia)" }} />,
      accentColor: "rgba(217,70,239)",
    },
    {
      label: "Personas Generated",
      value: formatNumber(metrics.totalPersonasGenerated.current),
      metric: metrics.totalPersonasGenerated,
      icon: <UserPlus className="h-5 w-5" style={{ color: "var(--color-plasma-violet)" }} />,
      accentColor: "rgba(139,92,246)",
    },
    {
      label: "Images Generated",
      value: formatNumber(metrics.totalImagesGenerated.current),
      metric: metrics.totalImagesGenerated,
      icon: <ImageIcon className="h-5 w-5" style={{ color: "var(--color-plasma-amber)" }} />,
      accentColor: "rgba(245,158,11)",
    },
    {
      label: "Videos Generated",
      value: formatNumber(metrics.totalVideosGenerated.current),
      metric: metrics.totalVideosGenerated,
      icon: <Video className="h-5 w-5" style={{ color: "var(--color-plasma-cyan)" }} />,
      accentColor: "rgba(6,182,212)",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Key metrics and platform health at a glance
        </p>
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {cards.map((card, i) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            metric={card.metric}
            icon={card.icon}
            accentColor={card.accentColor}
            delay={i}
          />
        ))}
      </div>

      {/* Recent Activity Feed */}
      <div className="animate-fade-up" style={{ animationDelay: "700ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-[var(--color-plasma-amber)]" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Recent Activity
          </h2>
        </div>
        <div className="holo-card divide-y divide-white/5">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-text-muted)]">
              No recent activity
            </div>
          ) : (
            recentActivity.map((event) => {
              const { icon, color } = activityIconMap[event.type];
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                >
                  {/* Timeline dot + icon */}
                  <div
                    className="flex-shrink-0 p-2 rounded-lg"
                    style={{
                      background: `${color}15`,
                      color: color,
                    }}
                  >
                    {icon}
                  </div>

                  {/* Description */}
                  <p className="flex-1 min-w-0 text-sm text-[var(--color-text-secondary)] truncate">
                    {event.description}
                  </p>

                  {/* Timestamp */}
                  <span className="flex-shrink-0 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
