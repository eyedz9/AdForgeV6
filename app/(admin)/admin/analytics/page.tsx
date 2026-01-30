/**
 * Admin Analytics Page
 *
 * Server component that fetches analytics data and renders charts.
 * Charts use Recharts with dark theme styling and amber/gold accents.
 */

import {
  getUserGrowthData,
  getRevenueData,
  getSubscriptionDistribution,
  getUsageOverview,
  type DateRange,
} from "@/lib/services/admin-analytics";
import { BarChart3 } from "lucide-react";
import { AnalyticsCharts } from "./AnalyticsCharts";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const range = (
    ["7d", "30d", "90d", "1y"].includes(params.range ?? "")
      ? params.range
      : "30d"
  ) as DateRange;

  const [userGrowth, revenue, subscriptionDistribution, usageOverview] =
    await Promise.all([
      getUserGrowthData(range),
      getRevenueData(range),
      getSubscriptionDistribution(),
      getUsageOverview(range),
    ]);

  return (
    <div className="space-y-8">
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
            Analytics
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            User growth, revenue trends, and platform insights
          </p>
        </div>
      </div>

      {/* Charts (client component for interactivity) */}
      <AnalyticsCharts
        range={range}
        userGrowth={userGrowth}
        revenue={revenue}
        subscriptionDistribution={subscriptionDistribution}
        usageOverview={usageOverview}
      />
    </div>
  );
}
