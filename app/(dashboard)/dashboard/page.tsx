/**
 * User Dashboard Page
 *
 * At-a-glance view of the user's account: usage metrics, brands,
 * subscription status, and quick actions. Server component with
 * parallel Supabase queries.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  tierPricing,
  tierLimits,
  isUnlimited,
  type SubscriptionTier,
} from "@/lib/stripe/client";
import type { Subscription, UsageTracking } from "@/lib/supabase/database.types";
import {
  Plus,
  Layers,
  CreditCard,
  Users,
  Image,
  Video,
  ArrowRight,
  Crown,
  Sparkles,
  TrendingUp,
  Calendar,
  Rocket,
} from "lucide-react";

// =============================================================================
// Helpers
// =============================================================================

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getDisplayName(user: {
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}): string {
  const meta = user.user_metadata;
  if (meta?.full_name) return meta.full_name.split(" ")[0];
  if (meta?.name) return meta.name.split(" ")[0];
  if (user.email) return user.email.split("@")[0];
  return "there";
}

function getPercentage(used: number, limit: number): number {
  if (limit === -1) return 0;
  if (limit === 0) return 100;
  return Math.min(Math.round((used / limit) * 100), 100);
}

function getStatusColor(percentage: number): "emerald" | "amber" | "rose" {
  if (percentage >= 100) return "rose";
  if (percentage >= 80) return "amber";
  return "emerald";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Brand initial color palette fallbacks
const brandColors = [
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-red-600",
];

// =============================================================================
// Page
// =============================================================================

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Current billing period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // Parallel data fetching
  const [
    subscriptionResult,
    usageResult,
    brandsResult,
    brandCountResult,
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("usage_tracking")
      .select("*")
      .eq("user_id", user.id)
      .eq("period_start", periodStart)
      .single(),
    supabase
      .from("brands")
      .select("id, name, industry, logo_url, business_type, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("brands").select("*", { count: "exact", head: true }),
  ]);

  const subscription = subscriptionResult.data as Subscription | null;
  const usage = usageResult.data as UsageTracking | null;
  const brands = (brandsResult.data ?? []) as Array<{
    id: string;
    name: string;
    industry: string | null;
    logo_url: string | null;
    business_type: string | null;
    created_at: string;
  }>;
  const brandCount = brandCountResult.count ?? 0;

  const currentTier: SubscriptionTier =
    (subscription?.tier as SubscriptionTier) || "free";
  const limits = tierLimits[currentTier] ?? tierLimits.free;
  const tierInfo = tierPricing[currentTier];

  const displayName = getDisplayName(user);
  const greeting = getTimeOfDay();
  const hasBrands = brandCount > 0;

  // Billing period info
  const billingStart = subscription?.current_period_start
    ? formatDate(subscription.current_period_start)
    : formatDate(
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      );
  const billingEnd = subscription?.current_period_end
    ? formatDate(subscription.current_period_end)
    : formatDate(
        new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
      );
  const daysRemaining = Math.max(
    Math.ceil(
      ((subscription?.current_period_end
        ? new Date(subscription.current_period_end).getTime()
        : new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime()) -
        now.getTime()) /
        (1000 * 60 * 60 * 24)
    ),
    0
  );

  // Usage numbers
  const personasUsed = usage?.personas_generated ?? 0;
  const imagesUsed = usage?.images_generated ?? 0;
  const videosUsed = usage?.videos_generated ?? 0;

  // Subscription status flags
  const isCanceled = subscription?.cancel_at_period_end === true;
  const isTrialing = subscription?.status === "trialing";
  const showUpgradeCTA =
    currentTier === "free" || currentTier === "starter";

  // Usage metric cards config
  const usageCards = [
    {
      label: "Personas",
      used: personasUsed,
      limit: limits.personas,
      icon: Users,
      ringColor: "rgb(139,92,246)",
      gradientClass:
        "from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)]",
    },
    {
      label: "Images",
      used: imagesUsed,
      limit: limits.images,
      icon: Image,
      ringColor: "rgb(6,182,212)",
      gradientClass:
        "from-[var(--color-plasma-cyan)] to-blue-500",
    },
    {
      label: "Videos",
      used: videosUsed,
      limit: limits.videos,
      icon: Video,
      ringColor: "rgb(217,70,239)",
      gradientClass:
        "from-[var(--color-plasma-fuchsia)] to-[var(--color-plasma-purple)]",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ================================================================= */}
      {/* Welcome Header                                                     */}
      {/* ================================================================= */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Good {greeting},{" "}
            <span className="text-gradient-static">{displayName}</span>
          </h1>
          <Sparkles className="w-6 h-6 text-[var(--color-plasma-amber)] animate-pulse" />
        </div>
        <p className="text-[var(--color-text-secondary)] text-lg">
          Here&apos;s what&apos;s happening with your AdForge account
        </p>
      </header>

      {/* ================================================================= */}
      {/* Account Summary Banner                                             */}
      {/* ================================================================= */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] animate-fade-up"
        style={{ animationDelay: "50ms" }}
      >
        {/* Decorative layers */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[var(--color-plasma-fuchsia)]/20 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          {/* Left: tier + billing */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Tier badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-sm font-bold text-white backdrop-blur-sm">
                <Crown className="w-4 h-4" />
                {tierInfo.name}
              </span>

              {/* Status badges */}
              {isCanceled && subscription?.current_period_end && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-sm font-semibold text-amber-200 backdrop-blur-sm">
                  Cancels {formatDate(subscription.current_period_end)}
                </span>
              )}
              {isTrialing && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-200 backdrop-blur-sm">
                  Trial
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Calendar className="w-4 h-4" />
              {billingStart} — {billingEnd}
            </div>
          </div>

          {/* Right: stats */}
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {daysRemaining}
              </div>
              <div className="text-xs text-white/70 uppercase tracking-wider">
                Days Left
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {isUnlimited(limits.brands)
                  ? brandCount.toString()
                  : `${brandCount} / ${limits.brands}`}
              </div>
              <div className="text-xs text-white/70 uppercase tracking-wider">
                Brands
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Main content: either empty state or full dashboard                  */}
      {/* ================================================================= */}
      {!hasBrands ? (
        /* ─────────────── Empty State (new user) ─────────────── */
        <div
          className="holo-card p-12 flex flex-col items-center text-center animate-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] shadow-[0_0_40px_rgba(139,92,246,0.3)] mb-6">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Welcome to AdForge
          </h2>
          <p className="text-[var(--color-text-muted)] max-w-md mb-8">
            Create your first brand to start generating AI-powered personas
            and creative assets.
          </p>
          <Link
            href="/brands/new"
            className="group inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] rounded-xl font-semibold text-white transition-all hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5" />
            Create Your First Brand
          </Link>
        </div>
      ) : (
        <>
          {/* ─────────────── Usage Metrics ─────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {usageCards.map((card, i) => {
              const Icon = card.icon;
              const unlimited = isUnlimited(card.limit);
              const pct = getPercentage(card.used, card.limit);
              const status = getStatusColor(pct);

              // SVG ring calculations
              const circumference = 2 * Math.PI * 40; // r=40
              const dashOffset = unlimited
                ? circumference
                : circumference - (pct / 100) * circumference;

              const ringStroke =
                unlimited
                  ? "rgb(139,92,246)"
                  : status === "emerald"
                  ? "rgb(16,185,129)"
                  : status === "amber"
                  ? "rgb(245,158,11)"
                  : "rgb(244,63,94)";

              return (
                <div
                  key={card.label}
                  className="holo-card p-6 animate-fade-up"
                  style={{ animationDelay: `${(i + 2) * 50}ms` }}
                >
                  {/* Icon + label */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={`p-2.5 rounded-xl bg-gradient-to-br ${card.gradientClass} shadow-lg`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                      {card.label}
                    </h3>
                    {/* Status badge */}
                    <span
                      className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        unlimited
                          ? "bg-[var(--color-plasma-violet)]/10 text-[var(--color-plasma-violet)]"
                          : status === "emerald"
                          ? "bg-[var(--color-plasma-emerald)]/10 text-[var(--color-plasma-emerald)]"
                          : status === "amber"
                          ? "bg-[var(--color-plasma-amber)]/10 text-[var(--color-plasma-amber)]"
                          : "bg-[var(--color-plasma-rose)]/10 text-[var(--color-plasma-rose)]"
                      }`}
                    >
                      {unlimited
                        ? "Unlimited"
                        : pct >= 100
                        ? "At Limit"
                        : pct >= 80
                        ? "Near Limit"
                        : "Healthy"}
                    </span>
                  </div>

                  {/* Ring + numbers */}
                  <div className="flex items-center gap-5">
                    <div className="relative w-24 h-24 shrink-0">
                      <svg
                        className="w-full h-full -rotate-90"
                        viewBox="0 0 100 100"
                      >
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
                        {!unlimited && (
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={ringStroke}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${circumference}`}
                            strokeDashoffset={dashOffset}
                            className="transition-all duration-1000"
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                          {unlimited ? "∞" : `${pct}%`}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                          {card.used}
                        </span>
                        <span className="text-sm text-[var(--color-text-muted)]">
                          /{" "}
                          {unlimited
                            ? "∞"
                            : card.limit.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        used this month
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─────────────── Quick Actions ─────────────── */}
          <div
            className="flex flex-wrap gap-3 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <Link
              href="/brands/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] rounded-xl font-semibold text-white text-sm transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Create Brand
            </Link>
            <Link
              href="/brands"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border border-white/10 text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
            >
              <Layers className="w-4 h-4" />
              View All Brands
            </Link>
            <Link
              href="/settings/subscription"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border border-white/10 text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Manage Subscription
            </Link>
          </div>

          {/* ─────────────── Recent Brands ─────────────── */}
          <section
            className="animate-fade-up"
            style={{ animationDelay: "250ms" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                <span className="text-gradient-static">Recent Brands</span>
              </h2>
              {brandCount > 6 && (
                <Link
                  href="/brands"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((brand, i) => {
                const initial = brand.name.charAt(0).toUpperCase();
                const colorClass =
                  brandColors[i % brandColors.length];

                return (
                  <Link
                    key={brand.id}
                    href={`/brands/${brand.id}`}
                    className="group holo-card p-4 flex items-center gap-4 transition-all hover:scale-[1.01]"
                  >
                    {/* Logo / Initial */}
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="w-11 h-11 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                      >
                        {initial}
                      </div>
                    )}

                    {/* Name + industry */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--color-text-primary)] truncate">
                        {brand.name}
                      </p>
                      {brand.industry && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {brand.industry}
                        </span>
                      )}
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-1 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ─────────────── Upgrade CTA ─────────────── */}
          {showUpgradeCTA && (
            <div
              className="gradient-border animate-fade-up"
              style={{ animationDelay: "300ms" }}
            >
              <div className="bg-[var(--color-surface)] rounded-[inherit] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] shadow-[0_0_30px_rgba(139,92,246,0.4)]">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      Unlock more with{" "}
                      {currentTier === "free" ? "Starter" : "Professional"}
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Get higher limits, advanced reports, and priority
                      support.
                    </p>
                  </div>
                </div>
                <Link
                  href="/settings/subscription"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] rounded-xl font-semibold text-white transition-all hover:shadow-[0_0_40px_rgba(139,92,246,0.4)]"
                >
                  View Plans
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}