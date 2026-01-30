"use client";

/**
 * SubscriptionsTable Client Component
 *
 * Renders the subscriptions table with interactive filter dropdowns,
 * sortable column headers, and pagination. Uses URL search params for state
 * so that filters persist across navigation.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { AdminSubscriptionRow } from "@/lib/services/admin-subscriptions";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  CalendarX,
} from "lucide-react";

interface SubscriptionsTableProps {
  subscriptions: AdminSubscriptionRow[];
  totalCount: number;
  filteredCount: number;
  tiers: string[];
  currentTier: string;
  currentStatus: string;
  currentSortBy: string;
  currentSortOrder: string;
  currentPage: number;
  pageSize: number;
}

function SubscriptionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-emerald)]/15 text-[var(--color-plasma-emerald)]">
          <CheckCircle className="h-3 w-3" />
          Active
        </span>
      );
    case "trialing":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-cyan)]/15 text-[var(--color-plasma-cyan)]">
          <Clock className="h-3 w-3" />
          Trialing
        </span>
      );
    case "past_due":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-amber)]/15 text-[var(--color-plasma-amber)]">
          <AlertTriangle className="h-3 w-3" />
          Past Due
        </span>
      );
    case "canceled":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]">
          <XCircle className="h-3 w-3" />
          Canceled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-[var(--color-text-muted)]">
          {status}
        </span>
      );
  }
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    free: "bg-white/10 text-[var(--color-text-muted)]",
    starter:
      "bg-[var(--color-plasma-cyan)]/15 text-[var(--color-plasma-cyan)]",
    professional:
      "bg-[var(--color-plasma-violet)]/15 text-[var(--color-plasma-violet)]",
    agency:
      "bg-[var(--color-plasma-amber)]/15 text-[var(--color-plasma-amber)]",
    enterprise:
      "bg-[var(--color-plasma-emerald)]/15 text-[var(--color-plasma-emerald)]",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        colors[tier] ?? colors.free
      }`}
    >
      {tier}
    </span>
  );
}

function SortIcon({
  column,
  currentSort,
  currentOrder,
}: {
  column: string;
  currentSort: string;
  currentOrder: string;
}) {
  if (currentSort !== column) {
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
  }
  return currentOrder === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(cents: number): string {
  if (cents === 0) return "$0";
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function SubscriptionsTable({
  subscriptions,
  filteredCount,
  tiers,
  currentTier,
  currentStatus,
  currentSortBy,
  currentSortOrder,
  currentPage,
  pageSize,
}: SubscriptionsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Build URL with updated params
  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value && value !== "all" && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      return `/admin/subscriptions?${params.toString()}`;
    },
    [searchParams]
  );

  const handleFilterChange = (key: string, value: string) => {
    router.push(buildUrl({ [key]: value, page: "1" }));
  };

  const handleSort = (column: string) => {
    const newOrder =
      currentSortBy === column && currentSortOrder === "asc" ? "desc" : "asc";
    router.push(buildUrl({ sortBy: column, sortOrder: newOrder, page: "1" }));
  };

  const handlePageChange = (newPage: number) => {
    router.push(buildUrl({ page: String(newPage) }));
  };

  const handleRowClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  const sortableColumns = [
    { key: "userEmail", label: "User Email" },
    { key: "tier", label: "Tier" },
    { key: "status", label: "Status" },
    { key: "mrr", label: "MRR" },
    { key: "createdAt", label: "Period Start" },
    { key: "periodEnd", label: "Period End" },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={currentTier}
          onChange={(e) => handleFilterChange("tier", e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm
            bg-white/[0.04] border border-white/[0.08]
            text-[var(--color-text-primary)]
            focus:outline-none focus:border-[var(--color-plasma-amber)]/50
            transition-colors cursor-pointer"
        >
          <option value="all">All Tiers</option>
          {tiers.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={currentStatus}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm
            bg-white/[0.04] border border-white/[0.08]
            text-[var(--color-text-primary)]
            focus:outline-none focus:border-[var(--color-plasma-amber)]/50
            transition-colors cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {/* Table */}
      <div className="holo-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {sortableColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider
                      text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)]
                      transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      <SortIcon
                        column={col.key}
                        currentSort={currentSortBy}
                        currentOrder={currentSortOrder}
                      />
                    </div>
                  </th>
                ))}
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Cancel at End
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {subscriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    No subscriptions found matching your filters.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => handleRowClick(sub.userId)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-primary)] font-medium">
                        {sub.userEmail}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <TierBadge tier={sub.tier} />
                    </td>
                    <td className="px-5 py-3.5">
                      <SubscriptionStatusBadge status={sub.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-sm font-medium ${
                          sub.mrrContribution > 0
                            ? "text-[var(--color-plasma-emerald)]"
                            : "text-[var(--color-text-muted)]"
                        }`}
                      >
                        {formatCurrency(sub.mrrContribution)}/mo
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {formatDate(sub.periodStart)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {formatDate(sub.periodEnd)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {sub.cancelAtPeriodEnd ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]">
                          <CalendarX className="h-3 w-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--color-text-muted)]">
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          Showing{" "}
          <span className="font-medium text-[var(--color-text-secondary)]">
            {subscriptions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </span>{" "}
          to{" "}
          <span className="font-medium text-[var(--color-text-secondary)]">
            {Math.min(currentPage * pageSize, filteredCount)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-[var(--color-text-secondary)]">
            {filteredCount}
          </span>{" "}
          results
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg text-[var(--color-text-muted)]
              hover:text-[var(--color-text-primary)] hover:bg-white/[0.04]
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-sm text-[var(--color-text-secondary)] px-2">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-lg text-[var(--color-text-muted)]
              hover:text-[var(--color-text-primary)] hover:bg-white/[0.04]
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
