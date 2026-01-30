"use client";

/**
 * UsersTable Client Component
 *
 * Renders the user management table with interactive search, filter dropdowns,
 * sortable column headers, and pagination. Uses URL search params for state
 * so that filters persist across navigation.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminUserRow } from "@/lib/services/admin-users";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  Ban,
  CheckCircle,
} from "lucide-react";

interface UsersTableProps {
  users: AdminUserRow[];
  totalCount: number;
  filteredCount: number;
  tiers: string[];
  currentSearch: string;
  currentTier: string;
  currentRole: string;
  currentStatus: string;
  currentSortBy: string;
  currentSortOrder: string;
  currentPage: number;
  pageSize: number;
}

function StatusBadge({ status }: { status: "active" | "disabled" }) {
  if (status === "disabled") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]">
        <Ban className="h-3 w-3" />
        Disabled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-emerald)]/15 text-[var(--color-plasma-emerald)]">
      <CheckCircle className="h-3 w-3" />
      Active
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-amber)]/15 text-[var(--color-plasma-amber)]">
        <ShieldAlert className="h-3 w-3" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-[var(--color-text-muted)]">
      <Shield className="h-3 w-3" />
      User
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    free: "bg-white/10 text-[var(--color-text-muted)]",
    starter: "bg-[var(--color-plasma-cyan)]/15 text-[var(--color-plasma-cyan)]",
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(iso);
}

export function UsersTable({
  users,
  filteredCount,
  tiers,
  currentSearch,
  currentTier,
  currentRole,
  currentStatus,
  currentSortBy,
  currentSortOrder,
  currentPage,
  pageSize,
}: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      return `/admin/users?${params.toString()}`;
    },
    [searchParams]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchValue !== currentSearch) {
        router.push(buildUrl({ search: searchValue, page: "1" }));
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, currentSearch, router, buildUrl]);

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
    { key: "email", label: "Email" },
    { key: "name", label: "Name" },
    { key: "tier", label: "Subscription Tier" },
    { key: "signUpDate", label: "Sign-up Date" },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
              bg-white/[0.04] border border-white/[0.08]
              text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]
              focus:outline-none focus:border-[var(--color-plasma-amber)]/50
              focus:ring-1 focus:ring-[var(--color-plasma-amber)]/25
              transition-colors"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex gap-2">
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
            value={currentRole}
            onChange={(e) => handleFilterChange("role", e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm
              bg-white/[0.04] border border-white/[0.08]
              text-[var(--color-text-primary)]
              focus:outline-none focus:border-[var(--color-plasma-amber)]/50
              transition-colors cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
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
            <option value="disabled">Disabled</option>
          </select>
        </div>
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
                  Role
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Status
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleRowClick(user.id)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-primary)] font-medium">
                        {user.email}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {user.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <TierBadge tier={user.tier} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {formatDate(user.signUpDate)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {formatRelative(user.lastSignIn)}
                      </span>
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
            {users.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
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
