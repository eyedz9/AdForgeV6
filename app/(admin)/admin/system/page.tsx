/**
 * Admin System Settings Page
 *
 * Displays editable platform-wide settings:
 * - Default trial days, maintenance mode, registration toggle
 * - Tier limits for each subscription tier
 * All data fetched server-side via admin client.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { Settings } from "lucide-react";
import { SystemSettingsForm } from "./SystemSettingsForm";
import type { Json } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemSettingsData {
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
// Default tier limits (mirrors lib/stripe/client.ts tierLimits)
// ---------------------------------------------------------------------------

const DEFAULT_TIER_LIMITS: SystemSettingsData["tier_limits"] = {
  free: { brands_limit: 1, personas_limit: 5, images_limit: 20, videos_limit: 5 },
  starter: { brands_limit: 3, personas_limit: 25, images_limit: 100, videos_limit: 25 },
  professional: { brands_limit: 10, personas_limit: 100, images_limit: 500, videos_limit: 100 },
  agency: { brands_limit: -1, personas_limit: 500, images_limit: 2000, videos_limit: 500 },
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getSystemSettings(): Promise<SystemSettingsData> {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("system_settings")
    .select("key, value");

  if (error) {
    console.error("Failed to fetch system settings:", error);
  }

  const settingsMap: Record<string, Json> = {};
  for (const row of rows ?? []) {
    settingsMap[row.key] = row.value;
  }

  // Parse scalar settings with safe defaults
  const defaultTrialDays =
    typeof settingsMap.default_trial_days === "number"
      ? settingsMap.default_trial_days
      : 14;
  const maintenanceMode =
    typeof settingsMap.maintenance_mode === "boolean"
      ? settingsMap.maintenance_mode
      : false;
  const registrationEnabled =
    typeof settingsMap.registration_enabled === "boolean"
      ? settingsMap.registration_enabled
      : true;

  // Parse tier limits from stored settings or fallback to defaults
  const tierLimits: SystemSettingsData["tier_limits"] = {};
  for (const tier of ["free", "starter", "professional", "agency"] as const) {
    const storedKey = `tier_limits_${tier}`;
    const stored = settingsMap[storedKey];
    if (
      stored &&
      typeof stored === "object" &&
      !Array.isArray(stored) &&
      stored !== null
    ) {
      const obj = stored as Record<string, unknown>;
      tierLimits[tier] = {
        brands_limit: typeof obj.brands_limit === "number" ? obj.brands_limit : DEFAULT_TIER_LIMITS[tier].brands_limit,
        personas_limit: typeof obj.personas_limit === "number" ? obj.personas_limit : DEFAULT_TIER_LIMITS[tier].personas_limit,
        images_limit: typeof obj.images_limit === "number" ? obj.images_limit : DEFAULT_TIER_LIMITS[tier].images_limit,
        videos_limit: typeof obj.videos_limit === "number" ? obj.videos_limit : DEFAULT_TIER_LIMITS[tier].videos_limit,
      };
    } else {
      tierLimits[tier] = { ...DEFAULT_TIER_LIMITS[tier] };
    }
  }

  return {
    default_trial_days: defaultTrialDays,
    maintenance_mode: maintenanceMode,
    registration_enabled: registrationEnabled,
    tier_limits: tierLimits,
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function AdminSystemPage() {
  const settings = await getSystemSettings();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "rgba(245,158,11,0.15)",
              boxShadow: "0 0 20px rgba(245,158,11,0.2)",
            }}
          >
            <Settings
              className="h-5 w-5"
              style={{ color: "var(--color-plasma-amber)" }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              System Settings
            </h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              Configure platform-wide settings and tier limits
            </p>
          </div>
        </div>
      </div>

      {/* Client-side form */}
      <SystemSettingsForm initialSettings={settings} />
    </div>
  );
}
