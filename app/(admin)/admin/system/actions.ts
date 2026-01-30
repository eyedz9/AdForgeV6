"use server";

/**
 * Server Actions for admin system settings.
 *
 * All actions verify the caller is an admin and create audit log entries.
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, createAuditLog } from "@/lib/auth/admin";
import type { Json } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionResult {
  success: boolean;
  error?: string;
}

export interface SystemSettingsPayload {
  default_trial_days: number;
  maintenance_mode: boolean;
  registration_enabled: boolean;
  tier_limits: Record<
    string,
    {
      brands_limit: number;
      personas_limit: number;
      images_limit: number;
      videos_limit: number;
    }
  >;
}

// ---------------------------------------------------------------------------
// Save System Settings
// ---------------------------------------------------------------------------

export async function saveSystemSettings(
  payload: SystemSettingsPayload
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  // Fetch current settings for audit log comparison
  const { data: currentSettings, error: fetchErr } = await admin
    .from("system_settings")
    .select("key, value");

  if (fetchErr) {
    return { success: false, error: "Failed to fetch current settings." };
  }

  const currentMap: Record<string, Json> = {};
  for (const row of currentSettings ?? []) {
    currentMap[row.key] = row.value;
  }

  // Upsert each setting
  const settingsToSave: { key: string; value: Json }[] = [
    { key: "default_trial_days", value: payload.default_trial_days as unknown as Json },
    { key: "maintenance_mode", value: payload.maintenance_mode as unknown as Json },
    { key: "registration_enabled", value: payload.registration_enabled as unknown as Json },
  ];

  // Add tier limits
  for (const [tier, limits] of Object.entries(payload.tier_limits)) {
    settingsToSave.push({
      key: `tier_limits_${tier}`,
      value: limits as unknown as Json,
    });
  }

  // Upsert all settings
  for (const setting of settingsToSave) {
    const { error: upsertErr } = await admin
      .from("system_settings")
      .upsert(
        {
          key: setting.key,
          value: setting.value,
          updated_by: adminId,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "key" }
      );

    if (upsertErr) {
      return {
        success: false,
        error: `Failed to save setting '${setting.key}': ${upsertErr.message}`,
      };
    }
  }

  // Build audit log details with old vs new values
  const changes: Record<string, { old: Json; new: Json }> = {};

  for (const setting of settingsToSave) {
    const oldVal = currentMap[setting.key] ?? null;
    const newVal = setting.value;
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[setting.key] = { old: oldVal, new: newVal };
    }
  }

  if (Object.keys(changes).length > 0) {
    await createAuditLog(adminId, "system", "system_settings", "update_settings", {
      changes,
    });
  }

  revalidatePath("/admin/system");
  return { success: true };
}
