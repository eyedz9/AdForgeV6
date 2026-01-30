/**
 * Admin Audit Logs Service
 *
 * Server-side functions to query audit logs using the admin Supabase client
 * (service role). Used by the admin audit log page.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// =============================================================================
// Types
// =============================================================================

export interface AdminAuditLogRow {
  id: string;
  actorEmail: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AdminAuditLogsResult {
  logs: AdminAuditLogRow[];
  totalCount: number;
  filteredCount: number;
}

export interface AdminAuditLogsParams {
  search?: string;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/** Known action types for filter dropdown */
export const KNOWN_ACTIONS = [
  "change_role",
  "disable_account",
  "enable_account",
  "delete_account",
  "override_tier",
  "override_limits",
  "reset_usage",
  "extend_trial",
  "update_moderation_status",
  "delete_content",
] as const;

/** Known target types for filter dropdown */
export const KNOWN_TARGET_TYPES = [
  "user",
  "brand",
  "persona",
  "creative",
  "subscription",
  "usage",
] as const;

// =============================================================================
// Service
// =============================================================================

/**
 * Fetches a paginated, filterable, sortable list of all audit log entries.
 * Joins with auth.users for actor email lookup.
 */
export async function getAdminAuditLogs(
  params: AdminAuditLogsParams = {}
): Promise<AdminAuditLogsResult> {
  const {
    search,
    action,
    targetType,
    dateFrom,
    dateTo,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 50,
  } = params;

  const admin = createAdminClient();

  // Build query with server-side filters where possible
  let query = admin
    .from("audit_logs")
    .select("id, actor_id, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false });

  // Server-side filters
  if (action && action !== "all") {
    query = query.eq("action", action);
  }
  if (targetType && targetType !== "all") {
    query = query.eq("target_type", targetType);
  }
  if (dateFrom) {
    query = query.gte("created_at", new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    // End of the selected day
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    query = query.lte("created_at", endDate.toISOString());
  }

  const { data: allLogs, error } = await query;

  if (error || !allLogs) {
    console.error("Failed to fetch audit logs:", error);
    return { logs: [], totalCount: 0, filteredCount: 0 };
  }

  const totalCount = allLogs.length;

  // Collect unique actor IDs for email lookup
  const actorIds = [...new Set(allLogs.map((log) => log.actor_id))];

  // Batch fetch actor emails
  const emailMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const emailResults = await Promise.all(
      actorIds.map(async (uid) => {
        const { data } = await admin.auth.admin.getUserById(uid);
        return { uid, email: data?.user?.email ?? "Unknown" };
      })
    );
    for (const r of emailResults) {
      emailMap.set(r.uid, r.email);
    }
  }

  // Build rows
  let rows: AdminAuditLogRow[] = allLogs.map((log) => ({
    id: log.id,
    actorEmail: emailMap.get(log.actor_id) ?? "Unknown",
    actorId: log.actor_id,
    action: log.action,
    targetType: log.target_type,
    targetId: log.target_id,
    details: (log.details as Record<string, unknown>) ?? {},
    createdAt: log.created_at,
  }));

  // Client-side search filter (target ID or action description or actor email)
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.targetId.toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        row.actorEmail.toLowerCase().includes(q) ||
        row.targetType.toLowerCase().includes(q)
    );
  }

  const filteredCount = rows.length;

  // Sort
  rows.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "actorEmail":
        cmp = a.actorEmail.localeCompare(b.actorEmail);
        break;
      case "action":
        cmp = a.action.localeCompare(b.action);
        break;
      case "targetType":
        cmp = a.targetType.localeCompare(b.targetType);
        break;
      case "targetId":
        cmp = a.targetId.localeCompare(b.targetId);
        break;
      case "createdAt":
      default:
        cmp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  // Paginate
  const offset = (page - 1) * pageSize;
  const paginatedRows = rows.slice(offset, offset + pageSize);

  return {
    logs: paginatedRows,
    totalCount,
    filteredCount,
  };
}
