/**
 * Admin Auth Utilities
 *
 * Server-side utilities for admin authentication, authorization,
 * and audit logging.
 */

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Checks whether the given user has the admin role.
 *
 * @param userId - The user's auth.users ID
 * @returns true if the user has role='admin', false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    // PGRST116 = "JSON object requested, return is 0 rows" — no profile row exists
    if (error?.code === "PGRST116") {
      // Auto-create a default 'user' profile for this user
      const { error: insertError } = await adminClient
        .from("user_profiles")
        .insert({ id: userId, role: "user" } as never);

      if (insertError) {
        console.error(
          "[isAdmin] Failed to auto-create profile for userId:",
          userId,
          "error:",
          JSON.stringify(insertError)
        );
      } else {
        console.log("[isAdmin] Auto-created user profile for userId:", userId);
      }
      return false;
    }

    console.error(
      "[isAdmin] Failed for userId:",
      userId,
      "error:",
      JSON.stringify(error),
      "data:",
      data
    );
    return false;
  }

  console.log("[isAdmin] userId:", userId, "role:", data.role);
  return data.role === "admin";
}

/**
 * Checks that the current session user is an admin.
 * If not authenticated or not an admin, redirects to / with an error.
 *
 * @returns The authenticated admin user's ID
 */
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?error=unauthorized");
  }

  const admin = await isAdmin(user.id);
  if (!admin) {
    redirect("/?error=forbidden");
  }

  return user.id;
}

/**
 * Creates an audit log entry for an admin action.
 *
 * @param actorId - The admin user's ID performing the action
 * @param targetType - The type of entity being acted upon (e.g., 'user', 'brand', 'persona')
 * @param targetId - The ID of the target entity
 * @param action - The action performed (e.g., 'disable_account', 'change_role')
 * @param details - Additional details about the action (stored as JSONB)
 */
export async function createAuditLog(
  actorId: string,
  targetType: string,
  targetId: string,
  action: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("audit_logs").insert({
    actor_id: actorId,
    target_type: targetType,
    target_id: targetId,
    action,
    details: details as unknown as Json,
  } as never);

  if (error) {
    console.error("Failed to create audit log:", error);
  }
}
