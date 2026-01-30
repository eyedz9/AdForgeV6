/**
 * Admin Layout (Server Component Wrapper)
 *
 * Forces dynamic rendering for all admin routes. Checks admin
 * authorization on every request and passes the admin user info
 * to the AdminShell client component.
 */

import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect all admin routes — redirects non-admins
  await requireAdmin();

  // Fetch the admin user's info for the shell sidebar
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminUser = user
    ? {
        email: user.email ?? "",
        fullName: user.user_metadata?.full_name ?? "",
        avatarUrl: user.user_metadata?.avatar_url ?? "",
      }
    : null;

  return <AdminShell adminUser={adminUser}>{children}</AdminShell>;
}
