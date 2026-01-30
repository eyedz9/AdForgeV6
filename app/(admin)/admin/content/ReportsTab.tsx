"use client";

/**
 * ReportsTab Client Component
 *
 * Renders a view-only table of intelligence reports with search,
 * sortable columns, and pagination. No moderation actions needed.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminReportRow } from "@/lib/services/admin-content";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-emerald)]/15 text-[var(--color-plasma-emerald)]">
        <CheckCircle className="h-3 w-3" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-[var(--color-text-muted)]">
      {status}
    </span>
  );
}

function ReportTypeBadge({ reportType }: { reportType: string | null }) {
  if (!reportType) return <span className="text-[var(--color-text-muted)]">—</span>;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-violet)]/15 text-[var(--color-plasma-violet)]">
      <FileText className="h-3 w-3" />
      {reportType}
    </span>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface ReportsTabProps {
  reports: AdminReportRow[];
  totalCount: number;
  filteredCount: number;
  currentSearch: string;
  currentSortBy: string;
  currentSortOrder: string;
  currentPage: number;
  pageSize: number;
}

export function ReportsTab({
  reports,
  totalCount,
  filteredCount,
  currentSearch,
  currentSortBy,
  currentSortOrder,
  currentPage,
  pageSize,
}: ReportsTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      if (searchValue !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchValue.trim()) {
          params.set("search", searchValue.trim());
        } else {
          params.delete("search");
        }
        params.set("page", "1");
        if (!params.has("tab")) {
          params.set("tab", "reports");
        }
        router.push(`/admin/content?${params.toString()}`);
      }
    }, 400);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchValue, currentSearch, searchParams, router]);

  // URL helpers
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
      if (!params.has("tab")) {
        params.set("tab", "reports");
      }
      return `/admin/content?${params.toString()}`;
    },
    [searchParams]
  );

  const handleSort = (column: string) => {
    const newOrder =
      currentSortBy === column && currentSortOrder === "asc" ? "desc" : "asc";
    router.push(buildUrl({ sortBy: column, sortOrder: newOrder, page: "1" }));
  };

  const handlePageChange = (newPage: number) => {
    router.push(buildUrl({ page: String(newPage) }));
  };

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  const sortableColumns = [
    { key: "ownerEmail", label: "Owner Email" },
    { key: "brandName", label: "Brand Name" },
    { key: "reportType", label: "Report Type" },
    { key: "generatedAt", label: "Generated" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
        <span>
          <span className="font-medium text-[var(--color-text-secondary)]">
            {totalCount}
          </span>{" "}
          total reports
        </span>
        {filteredCount !== totalCount && (
          <span>
            <span className="font-medium text-[var(--color-text-secondary)]">
              {filteredCount}
            </span>{" "}
            matching search
          </span>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by brand name, owner email, or report type…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm
              bg-white/[0.04] border border-white/[0.08]
              text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-muted)]
              focus:outline-none focus:border-[var(--color-plasma-amber)]/50
              transition-colors"
          />
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
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {reports.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    No intelligence reports found matching your search.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {report.ownerEmail}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-primary)] font-medium">
                        {report.brandName}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <ReportTypeBadge reportType={report.reportType} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {formatDate(report.generatedAt)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={report.status} />
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
            {reports.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
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
