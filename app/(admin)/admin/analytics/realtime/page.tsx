/**
 * Admin Real-time Monitoring Page
 *
 * Server component that renders the initial real-time monitoring dashboard.
 * The client component polls /api/admin/realtime every 30 seconds for updates.
 */

import { getRealtimeData } from "@/lib/services/admin-analytics";
import { Activity, ChevronRight } from "lucide-react";
import Link from "next/link";
import { RealtimeMonitor } from "./RealtimeMonitor";

export const dynamic = "force-dynamic";

export default async function RealtimeMonitoringPage() {
  const initialData = await getRealtimeData();

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
        <span className="text-[var(--color-text-primary)]">Real-time</span>
      </div>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div
          className="p-2.5 rounded-xl"
          style={{
            background: "rgba(16,185,129,0.15)",
            boxShadow: "0 0 20px rgba(16,185,129,0.2)",
          }}
        >
          <Activity
            className="h-6 w-6"
            style={{ color: "var(--color-plasma-emerald)" }}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Real-time Monitoring
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Live activity, active users, and generation stats
          </p>
        </div>
      </div>

      {/* Client component with polling */}
      <RealtimeMonitor initialData={initialData} />
    </div>
  );
}
