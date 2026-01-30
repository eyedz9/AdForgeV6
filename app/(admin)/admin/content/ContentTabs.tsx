"use client";

/**
 * ContentTabs Client Component
 *
 * Renders tab navigation (Brands, Personas, Creatives, Reports) and
 * delegates to the active tab's content component.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type {
  AdminBrandsResult,
  AdminPersonasResult,
  AdminCreativesResult,
  AdminReportsResult,
} from "@/lib/services/admin-content";
import { Package, Users, Image, FileText } from "lucide-react";
import { BrandsTab } from "./BrandsTab";
import { PersonasTab } from "./PersonasTab";
import { CreativesTab } from "./CreativesTab";
import { ReportsTab } from "./ReportsTab";

interface ContentTabsProps {
  activeTab: string;
  brandsResult: AdminBrandsResult | null;
  personasResult: AdminPersonasResult | null;
  creativesResult: AdminCreativesResult | null;
  reportsResult: AdminReportsResult | null;
  currentSearch: string;
  currentStatus: string;
  currentSortBy: string;
  currentSortOrder: string;
  currentPage: number;
  pageSize: number;
}

const tabs = [
  { key: "brands", label: "Brands", icon: Package },
  { key: "personas", label: "Personas", icon: Users },
  { key: "creatives", label: "Creatives", icon: Image },
  { key: "reports", label: "Reports", icon: FileText },
];

export function ContentTabs({
  activeTab,
  brandsResult,
  personasResult,
  creativesResult,
  reportsResult,
  currentSearch,
  currentStatus,
  currentSortBy,
  currentSortOrder,
  currentPage,
  pageSize,
}: ContentTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = useCallback(
    (tab: string) => {
      // Reset filters when switching tabs
      const params = new URLSearchParams();
      if (tab !== "brands") {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.push(`/admin/content${qs ? `?${qs}` : ""}`);
    },
    [router]
  );

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/[0.08] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.03]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "brands" && brandsResult && (
        <BrandsTab
          brands={brandsResult.brands}
          totalCount={brandsResult.totalCount}
          filteredCount={brandsResult.filteredCount}
          currentSearch={currentSearch}
          currentStatus={currentStatus}
          currentSortBy={currentSortBy}
          currentSortOrder={currentSortOrder}
          currentPage={currentPage}
          pageSize={pageSize}
        />
      )}

      {activeTab === "personas" && personasResult && (
        <PersonasTab
          personas={personasResult.personas}
          totalCount={personasResult.totalCount}
          filteredCount={personasResult.filteredCount}
          currentSearch={currentSearch}
          currentStatus={currentStatus}
          currentSortBy={currentSortBy}
          currentSortOrder={currentSortOrder}
          currentPage={currentPage}
          pageSize={pageSize}
        />
      )}

      {activeTab === "creatives" && creativesResult && (
        <CreativesTab
          creatives={creativesResult.creatives}
          totalCount={creativesResult.totalCount}
          filteredCount={creativesResult.filteredCount}
          currentSearch={currentSearch}
          currentStatus={currentStatus}
          currentSortBy={currentSortBy}
          currentSortOrder={currentSortOrder}
          currentPage={currentPage}
          pageSize={pageSize}
        />
      )}

      {activeTab === "reports" && reportsResult && (
        <ReportsTab
          reports={reportsResult.reports}
          totalCount={reportsResult.totalCount}
          filteredCount={reportsResult.filteredCount}
          currentSearch={currentSearch}
          currentSortBy={currentSortBy}
          currentSortOrder={currentSortOrder}
          currentPage={currentPage}
          pageSize={pageSize}
        />
      )}
    </div>
  );
}
