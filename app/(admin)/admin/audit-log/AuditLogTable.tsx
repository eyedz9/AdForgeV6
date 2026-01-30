"use client";

/**
 * AuditLogTable Client Component
 *
 * Renders the audit log table with interactive search, filter dropdowns
 * (action type, target type, date range), sortable column headers, expandable
 * details, and pagination. Uses URL search params for state persistence.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminAuditLogRow } from "@/lib/services/admin-audit-logs";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDownIcon,
  User,
  Package,
  Palette,
  ImageIcon,
  CreditCard,
  BarChart3,
  Shield,
  ExternalLink,
} from "lucide-react";

// =============================================================================
// Sub-Components
// =============================================================================

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

function ActionBadge({ action }: { action: string }) {
  const label = action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Color-code by action category
  const isDestructive =
    action.includes("delete") || action.includes("disable");
  const isPositive = action.includes("enable") || action.includes("restore");
  const isModeration = action.includes("moderation");

  let colorClass =
    "bg-[var(--color-plasma-cyan)]/15 text-[var(--color-plasma-cyan)]";
  if (isDestructive) {
    colorClass =
      "bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]";
  } else if (isPositive) {
    colorClass =
      "bg-[var(--color-plasma-emerald)]/15 text-[var(--color-plasma-emerald)]";
  } else if (isModeration) {
    colorClass =
      "bg-[var(--color-plasma-amber)]/15 text-[var(--color-plasma-amber)]";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

function TargetTypeBadge({ targetType }: { targetType: string }) {
  const icons: Record<string, React.ReactNode> = {
    user: <User className="h-3 w-3" />,
    brand: <Package className="h-3 w-3" />,
    persona: <Palette className="h-3 w-3" />,
    creative: <ImageIcon className="h-3 w-3" />,
    subscription: <CreditCard className="h-3 w-3" />,
    usage: <BarChart3 className="h-3 w-3" />,
  };

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-[var(--color-text-secondary)] capitalize">
      {icons[targetType] ?? <Shield className="h-3 w-3" />}
      {targetType}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Returns the admin detail page URL for a given target type and ID, or null */
function getTargetLink(targetType: string, targetId: string): string | null {
  switch (targetType) {
    case "user":
      return `/admin/users/${targetId}`;
    case "subscription":
    case "usage":
      // These link to the user detail page — but targetId is the subscription/usage row ID, not user ID
      return null;
    case "brand":
    case "persona":
    case "creative":
      return `/admin/content`;
    default:
      return null;
  }
}

// =============================================================================
// Props
// =============================================================================

interface AuditLogTableProps {
  logs: AdminAuditLogRow[];
  totalCount: number;
  filteredCount: number;
  knownActions: string[];
  knownTargetTypes: string[];
  currentSearch: string;
  currentAction: string;
  currentTargetType: string;
  currentDateFrom: string;
  currentDateTo: string;
  currentSortBy: string;
  currentSortOrder: string;
  currentPage: number;
  pageSize: number;
}

// =============================================================================
// Component
// =============================================================================

export function AuditLogTable({
  logs,
  filteredCount,
  knownActions,
  knownTargetTypes,
  currentSearch,
  currentAction,
  currentTargetType,
  currentDateFrom,
  currentDateTo,
  currentSortBy,
  currentSortOrder,
  currentPage,
  pageSize,
}: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local search state for debouncing
  const [searchInput, setSearchInput] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expanded details rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
      return `/admin/audit-log?${params.toString()}`;
    },
    [searchParams]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput !== currentSearch) {
        router.push(buildUrl({ search: searchInput, page: "1" }));
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, currentSearch, router, buildUrl]);

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

  const toggleDetails = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  const sortableColumns = [
    { key: "createdAt", label: "Timestamp" },
    { key: "actorEmail", label: "Admin Email" },
    { key: "action", label: "Action" },
    { key: "targetType", label: "Target Type" },
    { key: "targetId", label: "Target ID" },
  ];

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search target ID, action, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
              bg-white/[0.04] border border-white/[0.08]
              text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-muted)]
              focus:outline-none focus:border-[var(--color-plasma-amber)]/50
              transition-colors"
          />
        </div>

        {/* Action type filter */}
        <select
          value={currentAction}
          onChange={(e) => handleFilterChange("action", e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm
            bg-white/[0.04] border border-white/[0.08]
            text-[var(--color-text-primary)]
            focus:outline-none focus:border-[var(--color-plasma-amber)]/50
            transition-colors cursor-pointer"
        >
          <option value="all">All Actions</option>
          {knownActions.map((a) => (
            <option key={a} value={a}>
              {formatActionLabel(a)}
            </option>
          ))}
        </select>

        {/* Target type filter */}
        <select
          value={currentTargetType}
          onChange={(e) => handleFilterChange("targetType", e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm
            bg-white/[0.04] border border-white/[0.08]
            text-[var(--color-text-primary)]
            focus:outline-none focus:border-[var(--color-plasma-amber)]/50
            transition-colors cursor-pointer"
        >
          <option value="all">All Target Types</option>
          {knownTargetTypes.map((t) => (
            <option key={t} value={t} className="capitalize">
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        {/* Date from */}
        <input
          type="date"
          value={currentDateFrom}
          onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm
            bg-white/[0.04] border border-white/[0.08]
            text-[var(--color-text-primary)]
            focus:outline-none focus:border-[var(--color-plasma-amber)]/50
            transition-colors cursor-pointer"
          title="From date"
        />

        {/* Date to */}
        <input
          type="date"
          value={currentDateTo}
          onChange={(e) => handleFilterChange("dateTo", e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm
            bg-white/[0.04] border border-white/[0.08]
            text-[var(--color-text-primary)]
            focus:outline-none focus:border-[var(--color-plasma-amber)]/50
            transition-colors cursor-pointer"
          title="To date"
        />
      </div>

      {/* Results count */}
      <p className="text-sm text-[var(--color-text-muted)]">
        Showing{" "}
        <span className="font-medium text-[var(--color-text-secondary)]">
          {filteredCount}
        </span>{" "}
        audit log entries
      </p>

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
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    No audit log entries found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedIds.has(log.id);
                  const targetLink = getTargetLink(log.targetType, log.targetId);
                  const hasDetails =
                    log.details &&
                    Object.keys(log.details).length > 0;

                  return (
                    <tr key={log.id} className="group">
                      {/* Timestamp */}
                      <td className="px-5 py-3.5">
                        <div>
                          <span className="text-sm text-[var(--color-text-primary)]">
                            {formatDate(log.createdAt)}
                          </span>
                          <br />
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {formatTime(log.createdAt)}
                          </span>
                        </div>
                      </td>

                      {/* Admin Email */}
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-[var(--color-text-primary)] font-medium">
                          {log.actorEmail}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5">
                        <ActionBadge action={log.action} />
                      </td>

                      {/* Target Type */}
                      <td className="px-5 py-3.5">
                        <TargetTypeBadge targetType={log.targetType} />
                      </td>

                      {/* Target ID */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-sm text-[var(--color-text-muted)] font-mono truncate max-w-[180px]"
                            title={log.targetId}
                          >
                            {log.targetId}
                          </span>
                          {targetLink && (
                            <a
                              href={targetLink}
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(targetLink);
                              }}
                              className="text-[var(--color-plasma-amber)] hover:text-[var(--color-plasma-amber)]/80 transition-colors"
                              title="View target"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Expandable Details */}
                      <td className="px-5 py-3.5">
                        {hasDetails ? (
                          <button
                            onClick={() => toggleDetails(log.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                              bg-white/[0.04] border border-white/[0.08]
                              text-[var(--color-text-secondary)]
                              hover:bg-white/[0.08] hover:text-[var(--color-text-primary)]
                              transition-colors"
                          >
                            {isExpanded ? "Hide" : "Show"}
                            <ChevronDownIcon
                              className={`h-3 w-3 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            &mdash;
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded details rows - rendered below the table to avoid breaking table layout */}
        {logs.some((log) => expandedIds.has(log.id)) && (
          <div className="border-t border-white/[0.06]">
            {logs
              .filter((log) => expandedIds.has(log.id))
              .map((log) => (
                <div
                  key={`detail-${log.id}`}
                  className="px-5 py-4 border-b border-white/[0.04]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Details for
                    </span>
                    <ActionBadge action={log.action} />
                    <span className="text-xs text-[var(--color-text-muted)]">
                      at {formatDate(log.createdAt)} {formatTime(log.createdAt)}
                    </span>
                  </div>
                  <pre className="text-xs text-[var(--color-text-secondary)] bg-white/[0.02] rounded-lg p-3 overflow-x-auto font-mono">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          Showing{" "}
          <span className="font-medium text-[var(--color-text-secondary)]">
            {logs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </span>{" "}
          to{" "}
          <span className="font-medium text-[var(--color-text-secondary)]">
            {Math.min(currentPage * pageSize, filteredCount)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-[var(--color-text-secondary)]">
            {filteredCount}
          </span>{" "}
          entries
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
