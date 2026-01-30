/**
 * Admin Detailed Analytics Page
 *
 * Server component that fetches cohort retention, churn metrics, and LTV data.
 * Renders as a subpage of analytics with link back to overview.
 */

import {
  getCohortRetentionData,
  getChurnMetrics,
  getLTVData,
  getFeatureAdoptionData,
  getConversionFunnelData,
} from "@/lib/services/admin-analytics";
import { BarChart3, ChevronRight } from "lucide-react";
import Link from "next/link";
import { DetailedAnalyticsCharts } from "./DetailedAnalyticsCharts";

export const dynamic = "force-dynamic";

export default async function DetailedAnalyticsPage() {
  const [cohortRetention, churnMetrics, ltvData, featureAdoption, conversionFunnel] =
    await Promise.all([
      getCohortRetentionData(),
      getChurnMetrics(),
      getLTVData(),
      getFeatureAdoptionData(),
      getConversionFunnelData(),
    ]);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/admin"
          className="hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Admin
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href="/admin/analytics"
          className="hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Analytics
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[var(--color-text-primary)]">Detailed</span>
      </div>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div
          className="p-2.5 rounded-xl"
          style={{
            background: "rgba(245,158,11,0.15)",
            boxShadow: "0 0 20px rgba(245,158,11,0.2)",
          }}
        >
          <BarChart3
            className="h-6 w-6"
            style={{ color: "var(--color-plasma-amber)" }}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Detailed Analytics
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Cohort retention, churn metrics, lifetime value, feature adoption,
            and conversion funnel
          </p>
        </div>
      </div>

      {/* Charts (client component) */}
      <DetailedAnalyticsCharts
        cohortRetention={cohortRetention}
        churnMetrics={churnMetrics}
        ltvData={ltvData}
        featureAdoption={featureAdoption}
        conversionFunnel={conversionFunnel}
      />
    </div>
  );
}
