/**
 * Usage Quota Service
 *
 * Centralized service for checking and decrementing usage quotas
 * for personas, images, videos, and intelligence reports.
 *
 * This service enforces subscription limits and tracks usage per billing period.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  UsageTracking,
  Subscription,
} from "@/lib/supabase/database.types";

/**
 * Supported quota types
 */
export type QuotaType = "personas" | "images" | "videos" | "intelligence_reports";

/**
 * Quota check result
 */
export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  message?: string;
}

/**
 * Current usage data
 */
export interface CurrentUsage {
  personas_generated: number;
  personas_limit: number;
  images_generated: number;
  images_limit: number;
  videos_generated: number;
  videos_limit: number;
  intelligence_reports: number;
}

/**
 * Default limits for free tier
 */
export const DEFAULT_LIMITS = {
  personas: 5,
  images: 20,
  videos: 5,
  intelligence_reports: 10,
} as const;

/**
 * Map quota type to usage field names
 */
const QUOTA_FIELD_MAP: Record<QuotaType, { generated: keyof UsageTracking; limit: keyof UsageTracking | null }> = {
  personas: { generated: "personas_generated", limit: "personas_limit" },
  images: { generated: "images_generated", limit: "images_limit" },
  videos: { generated: "videos_generated", limit: "videos_limit" },
  intelligence_reports: { generated: "intelligence_reports", limit: null }, // intelligence_reports doesn't have a limit in usage_tracking
};

/**
 * Map quota type to subscription limit field names
 */
const SUBSCRIPTION_LIMIT_MAP: Record<QuotaType, keyof Subscription | null> = {
  personas: "personas_limit",
  images: "images_limit",
  videos: "videos_limit",
  intelligence_reports: null, // Use tier-based limit
};

/**
 * Get tier-based intelligence report limits
 */
const TIER_INTELLIGENCE_LIMITS: Record<string, number> = {
  free: 10,
  starter: 25,
  professional: 100,
  agency: 500,
  enterprise: -1, // Unlimited
};

/**
 * Get the current billing period start date (first of month)
 */
export function getPeriodStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
}

/**
 * Get the current billing period end date (last of month)
 */
export function getPeriodEnd(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
}

/**
 * Check if user has quota remaining for a specific resource type
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param type - Quota type (personas, images, videos, intelligence_reports)
 * @param count - Number of resources to generate (default: 1)
 * @returns QuotaCheckResult with allowed status, remaining, and limit
 */
export async function checkQuota(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: QuotaType,
  count: number = 1
): Promise<QuotaCheckResult> {
  const periodStart = getPeriodStart();
  const fields = QUOTA_FIELD_MAP[type];

  // Get current usage
  const { data: usage } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .single();

  // Get subscription for limits
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  const sub = subscription as Subscription | null;
  const typedUsage = usage as UsageTracking | null;

  // Determine the limit
  let limit: number;
  if (type === "intelligence_reports") {
    // Intelligence reports use tier-based limits
    const tier = sub?.tier || "free";
    limit = TIER_INTELLIGENCE_LIMITS[tier] ?? DEFAULT_LIMITS.intelligence_reports;
  } else {
    // Other types use subscription limits or defaults
    const subscriptionLimitField = SUBSCRIPTION_LIMIT_MAP[type];
    if (subscriptionLimitField && sub) {
      limit = (sub[subscriptionLimitField] as number) ?? DEFAULT_LIMITS[type];
    } else {
      limit = DEFAULT_LIMITS[type];
    }
  }

  // Handle unlimited (-1)
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1, // Unlimited
      limit: -1,
    };
  }

  // Calculate current usage
  let generated: number = 0;
  if (typedUsage) {
    generated = (typedUsage[fields.generated] as number) ?? 0;
  }

  const remaining = Math.max(0, limit - generated);

  // Build user-friendly message
  const typeLabel = getTypeLabel(type);
  const message = count > remaining
    ? `Cannot generate ${count} ${typeLabel}. You have ${remaining} remaining this month.`
    : undefined;

  return {
    allowed: count <= remaining,
    remaining,
    limit,
    message,
  };
}

/**
 * Decrement (increment usage count) after successful generation
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param type - Quota type (personas, images, videos, intelligence_reports)
 * @param count - Number of resources generated (default: 1)
 */
export async function decrementQuota(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: QuotaType,
  count: number = 1
): Promise<void> {
  const periodStart = getPeriodStart();
  const periodEnd = getPeriodEnd();
  const fields = QUOTA_FIELD_MAP[type];

  // Get current usage
  const { data: currentUsage } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .single();

  if (currentUsage) {
    // Update existing usage record
    const typedUsage = currentUsage as UsageTracking;
    const currentGenerated = (typedUsage[fields.generated] as number) ?? 0;

    await supabase
      .from("usage_tracking")
      .update({
        [fields.generated]: currentGenerated + count,
      } as never)
      .eq("user_id", userId)
      .eq("period_start", periodStart);
  } else {
    // Create new usage record if it doesn't exist
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("personas_limit, images_limit, videos_limit")
      .eq("user_id", userId)
      .single();

    const sub = subscription as Pick<Subscription, "personas_limit" | "images_limit" | "videos_limit"> | null;

    // Build initial usage record with all fields at 0 except the one being incremented
    const initialUsage: Record<string, unknown> = {
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      personas_generated: type === "personas" ? count : 0,
      images_generated: type === "images" ? count : 0,
      videos_generated: type === "videos" ? count : 0,
      intelligence_reports: type === "intelligence_reports" ? count : 0,
      personas_limit: sub?.personas_limit ?? DEFAULT_LIMITS.personas,
      images_limit: sub?.images_limit ?? DEFAULT_LIMITS.images,
      videos_limit: sub?.videos_limit ?? DEFAULT_LIMITS.videos,
    };

    await supabase
      .from("usage_tracking")
      .insert(initialUsage as never);
  }
}

/**
 * Get current usage for all quota types
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Current usage data
 */
export async function getCurrentUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<CurrentUsage | null> {
  const periodStart = getPeriodStart();

  const { data: usage } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .single();

  if (!usage) {
    return null;
  }

  const typedUsage = usage as UsageTracking;

  return {
    personas_generated: typedUsage.personas_generated ?? 0,
    personas_limit: typedUsage.personas_limit ?? DEFAULT_LIMITS.personas,
    images_generated: typedUsage.images_generated ?? 0,
    images_limit: typedUsage.images_limit ?? DEFAULT_LIMITS.images,
    videos_generated: typedUsage.videos_generated ?? 0,
    videos_limit: typedUsage.videos_limit ?? DEFAULT_LIMITS.videos,
    intelligence_reports: typedUsage.intelligence_reports ?? 0,
  };
}

/**
 * Get human-readable label for quota type
 */
function getTypeLabel(type: QuotaType): string {
  switch (type) {
    case "personas":
      return "personas";
    case "images":
      return "images";
    case "videos":
      return "videos";
    case "intelligence_reports":
      return "intelligence reports";
    default:
      return type;
  }
}

/**
 * Check quota and return 429 response if exceeded
 * Helper function for API routes
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param type - Quota type
 * @param count - Number of resources to generate
 * @returns null if quota is available, or a NextResponse with 429 if exceeded
 */
export async function checkQuotaOrFail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: QuotaType,
  count: number = 1
): Promise<{ error: true; response: { error: string; remaining: number; limit: number } } | { error: false; quota: QuotaCheckResult }> {
  const quota = await checkQuota(supabase, userId, type, count);

  if (!quota.allowed) {
    return {
      error: true,
      response: {
        error: quota.message || `${getTypeLabel(type)} generation quota exceeded`,
        remaining: quota.remaining,
        limit: quota.limit,
      },
    };
  }

  return {
    error: false,
    quota,
  };
}
