/**
 * Auth Layout (Server Component Wrapper)
 *
 * Forces dynamic rendering for all auth routes to prevent
 * static prerendering issues with client-side Supabase usage.
 */

import AuthShell from "./AuthShell";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthShell>{children}</AuthShell>;
}
