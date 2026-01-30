/**
 * Admin Subscriptions Page
 *
 * Displays a paginated table of all subscriptions with filtering,
 * sorting, and a summary showing total MRR and tier breakdown.
 * All data fetched server-side via admin client.
 */

import { getAdminSubscriptions } from "@/lib/services/admin-subscriptions";
import { subscriptionTiers } from "@/lib/stripe/client";
import { CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { SubscriptionsTable } from "./SubscriptionsTable";

interface PageProps {
  searchParams: Promise<{
    tier?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const page = parseInt(params.page ?? "1", 10) || 1;
  const sortOrder =
    params.sortOrder === "asc" || params.sortOrder === "desc"
      ? params.sortOrder
      : "desc";

  const result = await getAdminSubscriptions({
    tier: params.tier,
    status: params.status,
    sortBy: params.sortBy ?? "createdAt",
    sortOrder,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "rgba(245,158,11,0.15)",
              boxShadow: "0 0 20px rgba(245,158,11,0.2)",
            }}
          >
            <CreditCard
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-amber)" }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Subscriptions
            </h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              Billing overview and subscription management
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total subscriptions */}
        <div className="holo-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ background: "rgba(245,158,11,0.15)" }}
            >
              <CreditCard
                className="h-4 w-4"
                style={{ color: "var(--color-plasma-amber)" }}
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                Total Subscriptions
              </p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                {result.totalCount}
              </p>
            </div>
          </div>
        </div>

        {/* Total MRR */}
        <div className="holo-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ background: "rgba(16,185,129,0.15)" }}
            >
              <DollarSign
                className="h-4 w-4"
                style={{ color: "var(--color-plasma-emerald)" }}
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                Total MRR
              </p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                {formatCurrency(result.totalMRR)}
              </p>
            </div>
          </div>
        </div>

        {/* Tier breakdown */}
        <div className="holo-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="p-2 rounded-lg"
              style={{ background: "rgba(139,92,246,0.15)" }}
            >
              <TrendingUp
                className="h-4 w-4"
                style={{ color: "var(--color-plasma-violet)" }}
              />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              By Tier (Active)
            </p>
          </div>
          <div className="space-y-1.5">
            {result.tierBreakdown.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                No active subscriptions
              </p>
            ) : (
              result.tierBreakdown.map((tb) => (
                <div
                  key={tb.tier}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--color-text-secondary)] capitalize">
                    {tb.tierName}
                  </span>
                  <span className="text-[var(--color-text-muted)]">
                    {tb.count} &middot; {formatCurrency(tb.revenue)}/mo
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Client-side table with controls */}
      <SubscriptionsTable
        subscriptions={result.subscriptions}
        totalCount={result.totalCount}
        filteredCount={result.filteredCount}
        tiers={[...subscriptionTiers]}
        currentTier={params.tier ?? "all"}
        currentStatus={params.status ?? "all"}
        currentSortBy={params.sortBy ?? "createdAt"}
        currentSortOrder={sortOrder}
        currentPage={page}
        pageSize={20}
      />
    </div>
  );
}
