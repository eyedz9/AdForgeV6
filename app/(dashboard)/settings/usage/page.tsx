/**
 * Usage Dashboard Page
 *
 * Stunning holographic usage dashboard with progress visualization and upgrade prompts.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Subscription, UsageTracking } from "@/lib/supabase/database.types";
import { tierPricing, SubscriptionTier } from "@/lib/stripe/client";
import {
  ArrowLeft,
  Users,
  Image,
  Video,
  FileText,
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingUp,
  Shield,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

// Usage metric configuration
const usageMetrics = [
  {
    key: "personas" as const,
    label: "Personas",
    usedField: "personas_generated" as const,
    limitField: "personas_limit" as const,
    description: "AI-generated consumer personas",
    icon: Users,
    color: "violet",
  },
  {
    key: "images" as const,
    label: "Images",
    usedField: "images_generated" as const,
    limitField: "images_limit" as const,
    description: "AI-generated creative images",
    icon: Image,
    color: "cyan",
  },
  {
    key: "videos" as const,
    label: "Videos",
    usedField: "videos_generated" as const,
    limitField: "videos_limit" as const,
    description: "AI-generated video content",
    icon: Video,
    color: "fuchsia",
  },
  {
    key: "intelligence_reports" as const,
    label: "Intelligence Reports",
    usedField: "intelligence_reports" as const,
    limitField: null,
    description: "Market intelligence reports generated",
    icon: FileText,
    color: "amber",
  },
];

const intelligenceReportLimits: Record<SubscriptionTier, number> = {
  free: 2,
  starter: 10,
  professional: 50,
  agency: 200,
  enterprise: -1,
};

const colorMap: Record<string, { gradient: string; text: string; glow: string; ring: string }> = {
  violet: {
    gradient: "from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)]",
    text: "text-[var(--color-plasma-violet)]",
    glow: "shadow-[0_0_30px_rgba(139,92,246,0.3)]",
    ring: "rgba(139,92,246,1)",
  },
  cyan: {
    gradient: "from-[var(--color-plasma-cyan)] to-[var(--color-plasma-cyan)]",
    text: "text-[var(--color-plasma-cyan)]",
    glow: "shadow-[0_0_30px_rgba(6,182,212,0.3)]",
    ring: "rgba(6,182,212,1)",
  },
  fuchsia: {
    gradient: "from-[var(--color-plasma-fuchsia)] to-[var(--color-plasma-purple)]",
    text: "text-[var(--color-plasma-fuchsia)]",
    glow: "shadow-[0_0_30px_rgba(217,70,239,0.3)]",
    ring: "rgba(217,70,239,1)",
  },
  amber: {
    gradient: "from-[var(--color-plasma-amber)] to-orange-500",
    text: "text-[var(--color-plasma-amber)]",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]",
    ring: "rgba(245,158,11,1)",
  },
};

export default function UsagePage() {
  const router = useRouter();
  const supabase = createClient();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: subData, error: subError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (subError && subError.code !== "PGRST116") {
          throw subError;
        }

        setSubscription(subData);

        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodStartStr = periodStart.toISOString().split("T")[0];

        const { data: usageData, error: usageError } = await supabase
          .from("usage_tracking")
          .select("*")
          .eq("user_id", user.id)
          .eq("period_start", periodStartStr)
          .single();

        if (usageError && usageError.code !== "PGRST116") {
          throw usageError;
        }

        setUsage(usageData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load usage data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, router]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPercentage = (used: number, limit: number): number => {
    if (limit === -1) return 0;
    if (limit === 0) return 100;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  const getStatusColor = (percentage: number): string => {
    if (percentage >= 100) return "rose";
    if (percentage >= 80) return "amber";
    return "emerald";
  };

  const currentTier: SubscriptionTier =
    (subscription?.tier as SubscriptionTier) || "free";

  const now = new Date();
  const periodStart = usage?.period_start
    ? formatDate(usage.period_start)
    : formatDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
  const periodEnd = usage?.period_end
    ? formatDate(usage.period_end)
    : formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString());

  const getDaysRemaining = (): number => {
    const endDate = usage?.period_end
      ? new Date(usage.period_end)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const diffTime = endDate.getTime() - now.getTime();
    return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--color-plasma-violet)]/20 border-t-[var(--color-plasma-violet)] animate-spin" />
            <div className="absolute inset-0 rounded-full blur-xl bg-[var(--color-plasma-violet)]/20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6 group animate-fade-up"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Settings
      </Link>

      {/* Header */}
      <header className="mb-10 animate-fade-up" style={{ animationDelay: "50ms" }}>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient-static">Usage Dashboard</span>
          </h1>
          <Sparkles className="w-6 h-6 text-[var(--color-plasma-amber)] animate-pulse" />
        </div>
        <p className="text-[var(--color-text-secondary)] text-lg">
          Monitor your usage and manage your limits
        </p>
      </header>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-plasma-rose)]/10 border border-[var(--color-plasma-rose)]/20 mb-8 animate-scale-up">
          <AlertCircle className="w-5 h-5 text-[var(--color-plasma-rose)] shrink-0" />
          <span className="text-sm text-[var(--color-plasma-rose)]">{error}</span>
        </div>
      )}

      {/* Period Card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 mb-8 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 orb orb-fuchsia opacity-30" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
              Current Billing Period
            </div>
            <div className="text-xl font-bold text-white">
              {periodStart} — {periodEnd}
            </div>
          </div>

          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{getDaysRemaining()}</div>
              <div className="text-xs text-white/70 uppercase tracking-wider">Days Left</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{tierPricing[currentTier].name}</div>
              <div className="text-xs text-white/70 uppercase tracking-wider">Plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {usageMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const colors = colorMap[metric.color];
          const used = usage?.[metric.usedField] ?? 0;

          let limit: number;
          if (metric.key === "intelligence_reports") {
            limit = intelligenceReportLimits[currentTier];
          } else if (metric.limitField) {
            limit = usage?.[metric.limitField] ?? subscription?.[metric.limitField as keyof Subscription] as number ?? 0;
          } else {
            limit = 0;
          }

          const isUnlimited = limit === -1;
          const percentage = getPercentage(used, limit);
          const status = getStatusColor(percentage);

          return (
            <div
              key={metric.key}
              className="holo-card p-6 animate-fade-up"
              style={{ animationDelay: `${(index + 2) * 100}ms` }}
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.gradient} ${colors.glow}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                    {metric.label}
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {metric.description}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isUnlimited
                      ? "bg-[var(--color-plasma-violet)]/10 text-[var(--color-plasma-violet)]"
                      : status === "emerald"
                      ? "bg-[var(--color-plasma-emerald)]/10 text-[var(--color-plasma-emerald)]"
                      : status === "amber"
                      ? "bg-[var(--color-plasma-amber)]/10 text-[var(--color-plasma-amber)]"
                      : "bg-[var(--color-plasma-rose)]/10 text-[var(--color-plasma-rose)]"
                  }`}
                >
                  {isUnlimited
                    ? "Unlimited"
                    : percentage >= 100
                    ? "At Limit"
                    : percentage >= 80
                    ? "Near Limit"
                    : "Healthy"}
                </div>
              </div>

              {/* Progress Ring */}
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Background ring */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="8"
                    />
                    {/* Progress ring */}
                    {!isUnlimited && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={
                          status === "emerald"
                            ? "rgb(16,185,129)"
                            : status === "amber"
                            ? "rgb(245,158,11)"
                            : "rgb(244,63,94)"
                        }
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${percentage * 2.51} 251`}
                        className="transition-all duration-1000"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {isUnlimited ? "∞" : `${percentage}%`}
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                      {used.toLocaleString()}
                    </span>
                    <span className="text-[var(--color-text-muted)]">
                      / {isUnlimited ? "Unlimited" : limit.toLocaleString()}
                    </span>
                  </div>

                  {/* Warning message */}
                  {!isUnlimited && percentage >= 80 && (
                    <div
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                        percentage >= 100
                          ? "bg-[var(--color-plasma-rose)]/10 text-[var(--color-plasma-rose)]"
                          : "bg-[var(--color-plasma-amber)]/10 text-[var(--color-plasma-amber)]"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="flex-1">
                        {percentage >= 100
                          ? `You've reached your limit.`
                          : `You're approaching your limit.`}
                      </span>
                      <Link
                        href="/settings/subscription"
                        className="font-semibold underline hover:no-underline"
                      >
                        Upgrade
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upgrade CTA */}
      {(currentTier === "free" || currentTier === "starter") && (
        <div className="gradient-border animate-fade-up mb-8" style={{ animationDelay: "600ms" }}>
          <div className="bg-[var(--color-surface)] rounded-[inherit] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] shadow-[0_0_30px_rgba(139,92,246,0.4)]">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                  Need more capacity?
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Upgrade your plan to unlock higher limits and additional features.
                </p>
              </div>
            </div>
            <Link
              href="/settings/subscription"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] rounded-xl font-semibold text-white transition-all hover:shadow-[0_0_40px_rgba(139,92,246,0.4)]"
            >
              View Plans
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Usage Tips */}
      <section className="animate-fade-up" style={{ animationDelay: "700ms" }}>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">
          <span className="text-gradient-static">Usage Tips</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Clock,
              title: "Usage Resets Monthly",
              description: "Your usage counters reset at the beginning of each billing period.",
              color: "violet",
            },
            {
              icon: Shield,
              title: "Credits Don't Roll Over",
              description: "Make the most of your limits - unused credits expire at period end.",
              color: "cyan",
            },
            {
              icon: TrendingUp,
              title: "Monitor Your Usage",
              description: "Check this page regularly to ensure you have enough capacity.",
              color: "fuchsia",
            },
          ].map((tip, index) => {
            const Icon = tip.icon;
            const colors = colorMap[tip.color];
            return (
              <div key={index} className="holo-card p-5">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg bg-gradient-to-br ${colors.gradient}/20`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                      {tip.title}
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {tip.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Decorative footer */}
      <div className="mt-12 flex justify-center gap-4 animate-fade-up" style={{ animationDelay: "800ms" }}>
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-violet)]/30" />
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-cyan)]/30" />
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-fuchsia)]/30" />
      </div>
    </div>
  );
}
