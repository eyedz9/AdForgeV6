/**
 * Subscription Pricing Page
 *
 * Stunning holographic subscription page with pricing tiers and billing management.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  tierPricing,
  stripePriceIds,
  SubscriptionTier,
} from "@/lib/stripe/client";
import { Subscription } from "@/lib/supabase/database.types";
import {
  ArrowLeft,
  Check,
  Sparkles,
  Zap,
  Crown,
  Building2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

export default function SubscriptionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Fetch current subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError;
        }

        setSubscription(data);
      } catch (err) {
        console.error("Error fetching subscription:", err);
        setError("Failed to load subscription data");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [supabase, router]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getYearlyMonthlyPrice = (yearlyPrice: number) => {
    return Math.round(yearlyPrice / 12);
  };

  const getCurrentTier = (): SubscriptionTier => {
    return (subscription?.tier as SubscriptionTier) || "free";
  };

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (tier === "free" || tier === "enterprise") return;

    setActionLoading(tier);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: stripePriceIds[tier as keyof typeof stripePriceIds],
          billingCycle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Error creating checkout:", err);
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading("billing");
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create portal session");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Error creating portal session:", err);
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading("cancel");
    setError(null);

    try {
      const response = await fetch("/api/stripe/cancel", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      setSubscription((prev) =>
        prev ? { ...prev, cancel_at_period_end: true } : null
      );
      setShowCancelModal(false);
    } catch (err) {
      console.error("Error canceling subscription:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading("reactivate");
    setError(null);

    try {
      const response = await fetch("/api/stripe/reactivate", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reactivate subscription");
      }

      setSubscription((prev) =>
        prev ? { ...prev, cancel_at_period_end: false } : null
      );
    } catch (err) {
      console.error("Error reactivating:", err);
      setError(err instanceof Error ? err.message : "Failed to reactivate subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const currentTier = getCurrentTier();
  const tiers: SubscriptionTier[] = ["starter", "professional", "agency", "enterprise"];

  const tierIcons: Record<SubscriptionTier, React.ReactNode> = {
    free: <Sparkles className="w-5 h-5" />,
    starter: <Zap className="w-5 h-5" />,
    professional: <Crown className="w-5 h-5" />,
    agency: <Building2 className="w-5 h-5" />,
    enterprise: <Building2 className="w-5 h-5" />,
  };

  const tierColors: Record<SubscriptionTier, { gradient: string; glow: string }> = {
    free: { gradient: "from-gray-500 to-gray-600", glow: "rgba(107,114,128,0.4)" },
    starter: { gradient: "from-[var(--color-plasma-cyan)] to-[var(--color-plasma-cyan)]", glow: "rgba(6,182,212,0.4)" },
    professional: { gradient: "from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)]", glow: "rgba(139,92,246,0.4)" },
    agency: { gradient: "from-[var(--color-plasma-fuchsia)] to-[var(--color-plasma-purple)]", glow: "rgba(217,70,239,0.4)" },
    enterprise: { gradient: "from-[var(--color-plasma-amber)] to-orange-500", glow: "rgba(245,158,11,0.4)" },
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
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
    <div className="max-w-6xl mx-auto">
      {/* Back Link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6 group animate-fade-up"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Settings
      </Link>

      {/* Header */}
      <header className="text-center mb-10 animate-fade-up" style={{ animationDelay: "50ms" }}>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
          <span className="text-gradient-static">Choose Your Plan</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg">
          Scale your advertising with the power of AI
        </p>
      </header>

      {/* Current Plan Banner */}
      {subscription && currentTier !== "free" && (
        <div
          className={`relative overflow-hidden rounded-2xl p-6 mb-8 animate-fade-up bg-gradient-to-r ${tierColors[currentTier].gradient}`}
          style={{ animationDelay: "100ms" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20">
                {tierIcons[currentTier]}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                  Current Plan
                </div>
                <h2 className="text-xl font-bold text-white">
                  {tierPricing[currentTier].name}
                </h2>
              </div>
              {subscription.cancel_at_period_end && (
                <span className="px-3 py-1 rounded-full bg-[var(--color-plasma-amber)] text-[var(--color-void)] text-xs font-semibold">
                  Canceling at period end
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {subscription.cancel_at_period_end ? (
                <button
                  onClick={handleReactivate}
                  disabled={actionLoading === "reactivate"}
                  className="px-5 py-2.5 rounded-xl bg-[var(--color-plasma-emerald)] text-white font-semibold text-sm transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {actionLoading === "reactivate" ? "Reactivating..." : "Reactivate"}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleManageBilling}
                    disabled={actionLoading === "billing"}
                    className="px-5 py-2.5 rounded-xl bg-white text-[var(--color-void)] font-semibold text-sm transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    {actionLoading === "billing" ? "Loading..." : "Manage Billing"}
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-5 py-2.5 rounded-xl border border-white/50 text-white font-semibold text-sm transition-all hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-plasma-rose)]/10 border border-[var(--color-plasma-rose)]/20 mb-8 animate-scale-up">
          <AlertCircle className="w-5 h-5 text-[var(--color-plasma-rose)] shrink-0" />
          <span className="text-sm text-[var(--color-plasma-rose)]">{error}</span>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-10 animate-fade-up" style={{ animationDelay: "150ms" }}>
        <div className="inline-flex p-1 rounded-xl bg-[var(--color-surface)] border border-white/10">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              billingCycle === "monthly"
                ? "bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              billingCycle === "yearly"
                ? "bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Yearly
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-plasma-emerald)]/20 text-[var(--color-plasma-emerald)] text-xs font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {tiers.map((tier, index) => {
          const pricing = tierPricing[tier];
          const isCurrentPlan = currentTier === tier;
          const isPopular = tier === "professional";
          const isEnterprise = tier === "enterprise";
          const colors = tierColors[tier];

          const displayPrice = billingCycle === "yearly"
            ? getYearlyMonthlyPrice(pricing.yearlyPrice)
            : pricing.monthlyPrice;

          return (
            <div
              key={tier}
              className={`relative animate-fade-up ${isPopular ? "lg:-mt-4 lg:mb-4" : ""}`}
              style={{ animationDelay: `${(index + 2) * 100}ms` }}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] text-white text-xs font-bold shadow-[0_0_20px_rgba(139,92,246,0.5)]">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-4 py-1.5 rounded-full bg-[var(--color-plasma-emerald)] text-white text-xs font-bold">
                    Current Plan
                  </div>
                </div>
              )}

              <div
                className={`h-full holo-card p-6 flex flex-col ${
                  isPopular ? "border-[var(--color-plasma-violet)]/50" : ""
                } ${isCurrentPlan ? "border-[var(--color-plasma-emerald)]/50" : ""}`}
              >
                {/* Header */}
                <div className="mb-6">
                  <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${colors.gradient} mb-4`}>
                    {tierIcons[tier]}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                    {pricing.name}
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {pricing.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  {isEnterprise ? (
                    <div className="text-3xl font-bold text-[var(--color-text-primary)]">Custom</div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-[var(--color-text-primary)]">
                          {formatPrice(displayPrice)}
                        </span>
                        <span className="text-[var(--color-text-muted)]">/mo</span>
                      </div>
                      {billingCycle === "yearly" && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          {formatPrice(pricing.yearlyPrice)} billed annually
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {pricing.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-[var(--color-plasma-emerald)] shrink-0 mt-0.5" />
                      <span className="text-[var(--color-text-secondary)]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isEnterprise ? (
                  <a
                    href="mailto:sales@adforge.ai"
                    className="w-full py-3 rounded-xl border border-white/20 text-center font-semibold text-[var(--color-text-primary)] transition-all hover:bg-white/5 hover:border-white/30"
                  >
                    Contact Sales
                  </a>
                ) : isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-[var(--color-elevated)] text-[var(--color-text-muted)] font-semibold cursor-default"
                  >
                    Current Plan
                  </button>
                ) : currentTier !== "free" && tiers.indexOf(tier) < tiers.indexOf(currentTier) ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={actionLoading === "billing"}
                    className="w-full py-3 rounded-xl border border-white/20 text-center font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-white/5"
                  >
                    {actionLoading === "billing" ? "Loading..." : "Downgrade"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={actionLoading === tier}
                    className={`group relative w-full py-3 rounded-xl font-semibold text-white transition-all overflow-hidden bg-gradient-to-r ${colors.gradient}`}
                    style={{ boxShadow: `0 0 30px ${colors.glow}` }}
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {actionLoading === tier ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      {actionLoading === tier
                        ? "Loading..."
                        : currentTier === "free"
                        ? "Start Free Trial"
                        : "Upgrade"}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <section className="animate-fade-up" style={{ animationDelay: "600ms" }}>
        <h2 className="text-2xl font-bold text-center mb-8">
          <span className="text-gradient-static">Feature Comparison</span>
        </h2>

        <div className="holo-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="text-center p-4 text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Free
                  </th>
                  <th className="text-center p-4 text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Starter
                  </th>
                  <th className="text-center p-4 text-sm font-semibold text-[var(--color-plasma-violet)] uppercase tracking-wider">
                    Professional
                  </th>
                  <th className="text-center p-4 text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Agency
                  </th>
                  <th className="text-center p-4 text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { feature: "Brands", values: ["1", "3", "10", "Unlimited", "Unlimited"] },
                  { feature: "Personas / month", values: ["5", "25", "100", "500", "Custom"] },
                  { feature: "Images / month", values: ["20", "100", "500", "2,000", "Custom"] },
                  { feature: "Videos / month", values: ["5", "25", "100", "500", "Custom"] },
                  { feature: "Intelligence Reports", values: ["Basic", "Full", "Advanced", "Advanced", "Custom"] },
                  { feature: "Export Formats", values: [false, true, true, true, true] },
                  { feature: "API Access", values: [false, false, true, true, true] },
                  { feature: "Team Collaboration", values: [false, false, true, true, true] },
                  { feature: "White-Label Exports", values: [false, false, false, true, true] },
                  { feature: "SSO Integration", values: [false, false, false, false, true] },
                  { feature: "Support", values: ["Email", "Priority Email", "Priority", "24/7 Phone", "Dedicated"] },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm font-medium text-[var(--color-text-primary)]">
                      {row.feature}
                    </td>
                    {row.values.map((value, j) => (
                      <td key={j} className="text-center p-4">
                        {typeof value === "boolean" ? (
                          value ? (
                            <Check className="w-5 h-5 text-[var(--color-plasma-emerald)] mx-auto" />
                          ) : (
                            <span className="text-[var(--color-text-ghost)]">—</span>
                          )
                        ) : (
                          <span className="text-sm text-[var(--color-text-secondary)]">{value}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCancelModal(false)}
          />
          <div className="relative w-full max-w-md gradient-border animate-scale-up">
            <div className="bg-[var(--color-surface)] rounded-[inherit] p-6 md:p-8">
              <button
                onClick={() => setShowCancelModal(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-muted)]" />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex p-4 rounded-full bg-[var(--color-plasma-rose)]/10 mb-4">
                  <AlertCircle className="w-8 h-8 text-[var(--color-plasma-rose)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                  Cancel Subscription?
                </h3>
                <p className="text-[var(--color-text-muted)]">
                  Are you sure you want to cancel your{" "}
                  <strong className="text-[var(--color-text-primary)]">
                    {tierPricing[currentTier].name}
                  </strong>{" "}
                  subscription?
                </p>
              </div>

              <ul className="space-y-2 mb-6 text-sm text-[var(--color-text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-plasma-amber)]">•</span>
                  You&apos;ll retain access until the end of your current billing period
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-plasma-amber)]">•</span>
                  After that, you&apos;ll be downgraded to the Free plan
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-plasma-amber)]">•</span>
                  You can reactivate anytime before the period ends
                </li>
              </ul>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/20 font-semibold text-[var(--color-text-primary)] transition-all hover:bg-white/5"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={actionLoading === "cancel"}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-plasma-rose)] font-semibold text-white transition-all hover:shadow-[0_0_30px_rgba(244,63,94,0.4)] disabled:opacity-50"
                >
                  {actionLoading === "cancel" ? "Canceling..." : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decorative footer */}
      <div className="mt-16 flex justify-center gap-4 animate-fade-up" style={{ animationDelay: "700ms" }}>
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-violet)]/30" />
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-cyan)]/30" />
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-fuchsia)]/30" />
      </div>
    </div>
  );
}
