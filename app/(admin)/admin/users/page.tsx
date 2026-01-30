/**
 * Admin Users Management Page
 *
 * Displays a paginated table of all platform users with search, filtering,
 * and sorting capabilities. All data fetched server-side via admin client.
 */

import { getAdminUsers } from "@/lib/services/admin-users";
import { subscriptionTiers } from "@/lib/stripe/client";
import { Users } from "lucide-react";
import { UsersTable } from "./UsersTable";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    tier?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const page = parseInt(params.page ?? "1", 10) || 1;
  const sortOrder =
    params.sortOrder === "asc" || params.sortOrder === "desc"
      ? params.sortOrder
      : "desc";

  const result = await getAdminUsers({
    search: params.search,
    tier: params.tier,
    role: params.role,
    status: params.status,
    sortBy: params.sortBy ?? "signUpDate",
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
            <Users
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-amber)" }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              User Management
            </h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              Browse, search, and manage platform users
            </p>
          </div>
        </div>
      </div>

      {/* Counts */}
      <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
        <span>
          <span className="font-semibold text-[var(--color-text-primary)]">
            {result.totalCount}
          </span>{" "}
          total users
        </span>
        {result.filteredCount !== result.totalCount && (
          <span>
            <span className="font-semibold text-[var(--color-plasma-amber)]">
              {result.filteredCount}
            </span>{" "}
            matching filters
          </span>
        )}
      </div>

      {/* Client-side table with controls */}
      <UsersTable
        users={result.users}
        totalCount={result.totalCount}
        filteredCount={result.filteredCount}
        tiers={[...subscriptionTiers]}
        currentSearch={params.search ?? ""}
        currentTier={params.tier ?? "all"}
        currentRole={params.role ?? "all"}
        currentStatus={params.status ?? "all"}
        currentSortBy={params.sortBy ?? "signUpDate"}
        currentSortOrder={sortOrder}
        currentPage={page}
        pageSize={20}
      />
    </div>
  );
}
