/**
 * Admin Content Moderation Page
 *
 * Displays tabs for Brands, Personas, Creatives, and Reports.
 * Each tab shows a filterable, paginated table with moderation actions.
 * US-113 implements the Brands tab. Remaining tabs are placeholders.
 */

import {
  getAdminBrands,
  getAdminPersonas,
  getAdminCreatives,
  getAdminReports,
} from "@/lib/services/admin-content";
import { Shield } from "lucide-react";
import { ContentTabs } from "./ContentTabs";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

export default async function AdminContentPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const tab = params.tab ?? "brands";
  const page = parseInt(params.page ?? "1", 10) || 1;
  const sortOrder =
    params.sortOrder === "asc" || params.sortOrder === "desc"
      ? params.sortOrder
      : "desc";

  // Fetch data based on active tab
  let brandsResult = null;
  let personasResult = null;
  let creativesResult = null;
  let reportsResult = null;

  if (tab === "brands" || !tab) {
    brandsResult = await getAdminBrands({
      search: params.search,
      moderationStatus: params.status,
      sortBy: params.sortBy ?? "createdAt",
      sortOrder,
      page,
      pageSize: 20,
    });
  }

  if (tab === "personas") {
    personasResult = await getAdminPersonas({
      search: params.search,
      moderationStatus: params.status,
      sortBy: params.sortBy ?? "createdAt",
      sortOrder,
      page,
      pageSize: 20,
    });
  }

  if (tab === "creatives") {
    creativesResult = await getAdminCreatives({
      search: params.search,
      moderationStatus: params.status,
      sortBy: params.sortBy ?? "createdAt",
      sortOrder,
      page,
      pageSize: 20,
    });
  }

  if (tab === "reports") {
    reportsResult = await getAdminReports({
      search: params.search,
      sortBy: params.sortBy ?? "generatedAt",
      sortOrder,
      page,
      pageSize: 20,
    });
  }

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
            <Shield
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-amber)" }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Content Moderation
            </h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              Browse and moderate all platform content
            </p>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <ContentTabs
        activeTab={tab}
        brandsResult={brandsResult}
        personasResult={personasResult}
        creativesResult={creativesResult}
        reportsResult={reportsResult}
        currentSearch={params.search ?? ""}
        currentStatus={params.status ?? "all"}
        currentSortBy={params.sortBy ?? "createdAt"}
        currentSortOrder={sortOrder}
        currentPage={page}
        pageSize={20}
      />
    </div>
  );
}
