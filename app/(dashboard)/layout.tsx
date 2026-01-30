/**
 * Dashboard Layout (Server Component Wrapper)
 *
 * Forces dynamic rendering for all dashboard routes to prevent
 * static prerendering issues with auth-dependent pages.
 */

import DashboardShell from "./DashboardShell";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
