/**
 * Admin Audit Log Page
 *
 * Displays a paginated table of all admin actions with filtering by
 * action type, target type, date range, and search. All data fetched
 * server-side via admin client (service role).
 */

import {
  getAdminAuditLogs,
  KNOWN_ACTIONS,
  KNOWN_TARGET_TYPES,
} from "@/lib/services/admin-audit-logs";
import { ClipboardList } from "lucide-react";
import { AuditLogTable } from "./AuditLogTable";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    action?: string;
    targetType?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

export default async function AdminAuditLogPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const page = parseInt(params.page ?? "1", 10) || 1;
  const sortOrder =
    params.sortOrder === "asc" || params.sortOrder === "desc"
      ? params.sortOrder
      : "desc";

  const result = await getAdminAuditLogs({
    search: params.search,
    action: params.action,
    targetType: params.targetType,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    sortBy: params.sortBy ?? "createdAt",
    sortOrder,
    page,
    pageSize: 50,
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
            <ClipboardList
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-amber)" }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Audit Log
            </h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              Track all admin actions across the platform
            </p>
          </div>
        </div>
      </div>

      {/* Client-side table with controls */}
      <AuditLogTable
        logs={result.logs}
        totalCount={result.totalCount}
        filteredCount={result.filteredCount}
        knownActions={[...KNOWN_ACTIONS]}
        knownTargetTypes={[...KNOWN_TARGET_TYPES]}
        currentSearch={params.search ?? ""}
        currentAction={params.action ?? "all"}
        currentTargetType={params.targetType ?? "all"}
        currentDateFrom={params.dateFrom ?? ""}
        currentDateTo={params.dateTo ?? ""}
        currentSortBy={params.sortBy ?? "createdAt"}
        currentSortOrder={sortOrder}
        currentPage={page}
        pageSize={50}
      />
    </div>
  );
}
