"use server";

/**
 * Server Actions for admin user management.
 *
 * All actions verify the caller is an admin and create audit log entries.
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, createAuditLog } from "@/lib/auth/admin";
import { setImpersonation } from "@/lib/auth/impersonation";
import { tierLimits, type SubscriptionTier } from "@/lib/stripe/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionResult {
  success: boolean;
  error?: string;
}

export interface OverrideLimitsPayload {
  brandsLimit: number;
  personasLimit: number;
  imagesLimit: number;
  videosLimit: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Change Role
// ---------------------------------------------------------------------------

export async function changeUserRole(
  targetUserId: string,
  newRole: "user" | "admin"
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  // Fetch current role
  const { data: profile, error: fetchErr } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", targetUserId)
    .single();

  if (fetchErr || !profile) {
    return { success: false, error: "User profile not found." };
  }

  const oldRole = profile.role;
  if (oldRole === newRole) {
    return { success: false, error: `User already has role '${newRole}'.` };
  }

  const { error: updateErr } = await admin
    .from("user_profiles")
    .update({ role: newRole } as never)
    .eq("id", targetUserId);

  if (updateErr) {
    return { success: false, error: "Failed to update role." };
  }

  await createAuditLog(adminId, "user", targetUserId, "change_role", {
    old_role: oldRole,
    new_role: newRole,
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Disable Account
// ---------------------------------------------------------------------------

export async function disableUserAccount(
  targetUserId: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("user_profiles")
    .update({ disabled_at: now } as never)
    .eq("id", targetUserId);

  if (updateErr) {
    return { success: false, error: "Failed to disable account." };
  }

  await createAuditLog(adminId, "user", targetUserId, "disable_account", {
    disabled_at: now,
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Enable Account
// ---------------------------------------------------------------------------

export async function enableUserAccount(
  targetUserId: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  const { error: updateErr } = await admin
    .from("user_profiles")
    .update({ disabled_at: null } as never)
    .eq("id", targetUserId);

  if (updateErr) {
    return { success: false, error: "Failed to enable account." };
  }

  await createAuditLog(adminId, "user", targetUserId, "enable_account", {});

  revalidatePath(`/admin/users/${targetUserId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete Account
// ---------------------------------------------------------------------------

export async function deleteUserAccount(
  targetUserId: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  // Fetch user email for audit log
  const { data: authData } = await admin.auth.admin.getUserById(targetUserId);
  const email = authData?.user?.email ?? "unknown";

  // Delete user profile (cascade will handle related data via FK constraints)
  const { error: profileErr } = await admin
    .from("user_profiles")
    .delete()
    .eq("id", targetUserId);

  if (profileErr) {
    return { success: false, error: "Failed to delete user profile." };
  }

  // Delete user from auth.users
  const { error: authErr } = await admin.auth.admin.deleteUser(targetUserId);

  if (authErr) {
    return { success: false, error: "Profile deleted but failed to remove auth user." };
  }

  await createAuditLog(adminId, "user", targetUserId, "delete_account", {
    email,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Override Subscription Tier
// ---------------------------------------------------------------------------

export async function overrideSubscriptionTier(
  targetUserId: string,
  newTier: string,
  reason: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  // Fetch current subscription
  const { data: sub, error: fetchErr } = await admin
    .from("subscriptions")
    .select("id, tier, brands_limit, personas_limit, images_limit, videos_limit")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (fetchErr) {
    return { success: false, error: "Failed to fetch subscription." };
  }

  // Get new tier limits
  const limits = tierLimits[newTier as SubscriptionTier] ?? tierLimits.free;

  if (!sub) {
    // No subscription exists — create one for this user
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const { data: inserted, error: insertErr } = await admin
      .from("subscriptions")
      .insert({
        user_id: targetUserId,
        stripe_customer_id: `admin_assigned_${targetUserId}`,
        tier: newTier,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        brands_limit: limits.brands,
        personas_limit: limits.personas,
        images_limit: limits.images,
        videos_limit: limits.videos,
      } as never)
      .select("id")
      .single();

    if (insertErr || !inserted) {
      return { success: false, error: "Failed to create subscription." };
    }

    await createAuditLog(adminId, "subscription", inserted.id, "override_tier", {
      user_id: targetUserId,
      old_tier: null,
      new_tier: newTier,
      reason,
      created: true,
    });

    revalidatePath(`/admin/users/${targetUserId}`);
    return { success: true };
  }

  const oldTier = sub.tier;
  if (oldTier === newTier) {
    return { success: false, error: `User is already on the '${newTier}' tier.` };
  }

  const { error: updateErr } = await admin
    .from("subscriptions")
    .update({
      tier: newTier,
      brands_limit: limits.brands,
      personas_limit: limits.personas,
      images_limit: limits.images,
      videos_limit: limits.videos,
    } as never)
    .eq("id", sub.id);

  if (updateErr) {
    return { success: false, error: "Failed to update subscription tier." };
  }

  await createAuditLog(adminId, "subscription", sub.id, "override_tier", {
    user_id: targetUserId,
    old_tier: oldTier,
    new_tier: newTier,
    reason,
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Override Subscription Limits
// ---------------------------------------------------------------------------

export async function overrideSubscriptionLimits(
  targetUserId: string,
  payload: OverrideLimitsPayload
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  // Fetch current subscription
  const { data: sub, error: fetchErr } = await admin
    .from("subscriptions")
    .select("id, brands_limit, personas_limit, images_limit, videos_limit")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (fetchErr) {
    return { success: false, error: "Failed to fetch subscription." };
  }

  if (!sub) {
    return { success: false, error: "User has no subscription to override." };
  }

  const oldLimits = {
    brands_limit: sub.brands_limit,
    personas_limit: sub.personas_limit,
    images_limit: sub.images_limit,
    videos_limit: sub.videos_limit,
  };

  const { error: updateErr } = await admin
    .from("subscriptions")
    .update({
      brands_limit: payload.brandsLimit,
      personas_limit: payload.personasLimit,
      images_limit: payload.imagesLimit,
      videos_limit: payload.videosLimit,
    } as never)
    .eq("id", sub.id);

  if (updateErr) {
    return { success: false, error: "Failed to update subscription limits." };
  }

  await createAuditLog(adminId, "subscription", sub.id, "override_limits", {
    user_id: targetUserId,
    old_limits: oldLimits,
    new_limits: {
      brands_limit: payload.brandsLimit,
      personas_limit: payload.personasLimit,
      images_limit: payload.imagesLimit,
      videos_limit: payload.videosLimit,
    },
    reason: payload.reason,
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Reset Usage
// ---------------------------------------------------------------------------

export async function resetUsage(
  targetUserId: string,
  reason: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  // Compute current period start
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // Fetch current usage
  const { data: usage, error: fetchErr } = await admin
    .from("usage_tracking")
    .select("id, personas_generated, images_generated, videos_generated, intelligence_reports")
    .eq("user_id", targetUserId)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (fetchErr) {
    return { success: false, error: "Failed to fetch usage data." };
  }

  if (!usage) {
    return { success: false, error: "No usage data found for the current period." };
  }

  const oldUsage = {
    personas_generated: usage.personas_generated,
    images_generated: usage.images_generated,
    videos_generated: usage.videos_generated,
    intelligence_reports: usage.intelligence_reports,
  };

  const { error: updateErr } = await admin
    .from("usage_tracking")
    .update({
      personas_generated: 0,
      images_generated: 0,
      videos_generated: 0,
      intelligence_reports: 0,
    } as never)
    .eq("id", usage.id);

  if (updateErr) {
    return { success: false, error: "Failed to reset usage counters." };
  }

  await createAuditLog(adminId, "usage", usage.id, "reset_usage", {
    user_id: targetUserId,
    period_start: periodStart,
    old_usage: oldUsage,
    reason,
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Extend Trial
// ---------------------------------------------------------------------------

export async function extendTrial(
  targetUserId: string,
  daysToAdd: number,
  reason: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  if (daysToAdd <= 0 || daysToAdd > 365) {
    return { success: false, error: "Days to add must be between 1 and 365." };
  }

  // Fetch current subscription
  const { data: sub, error: fetchErr } = await admin
    .from("subscriptions")
    .select("id, current_period_end, status")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (fetchErr) {
    return { success: false, error: "Failed to fetch subscription." };
  }

  if (!sub) {
    return { success: false, error: "User has no subscription to extend." };
  }

  const oldPeriodEnd = sub.current_period_end;

  // Calculate new period end
  const baseDate = oldPeriodEnd ? new Date(oldPeriodEnd) : new Date();
  const newPeriodEnd = new Date(baseDate);
  newPeriodEnd.setDate(newPeriodEnd.getDate() + daysToAdd);

  const { error: updateErr } = await admin
    .from("subscriptions")
    .update({
      current_period_end: newPeriodEnd.toISOString(),
    } as never)
    .eq("id", sub.id);

  if (updateErr) {
    return { success: false, error: "Failed to extend trial period." };
  }

  await createAuditLog(adminId, "subscription", sub.id, "extend_trial", {
    user_id: targetUserId,
    days_added: daysToAdd,
    old_period_end: oldPeriodEnd,
    new_period_end: newPeriodEnd.toISOString(),
    reason,
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Start Impersonation
// ---------------------------------------------------------------------------

export async function startImpersonation(
  targetUserId: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  // Fetch target user email for display in banner
  const { data: authData } = await admin.auth.admin.getUserById(targetUserId);
  const targetEmail = authData?.user?.email;

  if (!targetEmail) {
    return { success: false, error: "User not found." };
  }

  // Cannot impersonate yourself
  if (targetUserId === adminId) {
    return { success: false, error: "Cannot impersonate yourself." };
  }

  // Set impersonation cookies
  await setImpersonation(targetUserId, targetEmail);

  // Create audit log entry
  await createAuditLog(adminId, "user", targetUserId, "impersonation_start", {
    target_email: targetEmail,
  });

  return { success: true };
}
