/**
 * Admin Metrics Service
 *
 * Server-side functions to query platform metrics using the admin
 * Supabase client (service role). Used by the admin overview dashboard.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { tierPricing } from "@/lib/stripe/client";
import type { SubscriptionTier } from "@/lib/stripe/client";

export interface MetricWithGrowth {
  current: number;
  previous: number;
  growth: number; // percentage change
}

export interface PlatformMetrics {
  totalUsers: MetricWithGrowth;
  activeSubscriptions: MetricWithGrowth;
  mrr: MetricWithGrowth; // in cents
  totalBrands: MetricWithGrowth;
  totalPersonasGenerated: MetricWithGrowth;
  totalImagesGenerated: MetricWithGrowth;
  totalVideosGenerated: MetricWithGrowth;
}

function calcGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Fetches all platform metrics for the admin overview dashboard.
 * Compares current values against 30 days ago for growth indicators.
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const admin = createAdminClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
  const sixtyDaysAgoISO = sixtyDaysAgo.toISOString();

  // Run all queries in parallel
  const [
    totalUsersResult,
    usersBefore30dResult,
    usersBefore60dResult,
    activeSubsResult,
    activeSubsBefore30dResult,
    subTiersResult,
    subTiersBefore30dResult,
    totalBrandsResult,
    brandsBefore30dResult,
    brandsBefore60dResult,
    usageCurrentResult,
    usagePreviousResult,
  ] = await Promise.all([
    // Total users (all time)
    admin.from("user_profiles").select("id", { count: "exact", head: true }),

    // Users that existed 30 days ago (created_at <= 30 days ago)
    admin
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .lte("created_at", thirtyDaysAgoISO),

    // Users that existed 60 days ago
    admin
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .lte("created_at", sixtyDaysAgoISO),

    // Active subscriptions (active or trialing)
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),

    // Active subscriptions 30 days ago approximation:
    // subscriptions created before 30 days ago that are still active
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"])
      .lte("created_at", thirtyDaysAgoISO),

    // Current subscription tier distribution (for MRR)
    admin
      .from("subscriptions")
      .select("tier")
      .in("status", ["active", "trialing"]),

    // Subscription tier distribution 30 days ago (for MRR growth)
    admin
      .from("subscriptions")
      .select("tier")
      .in("status", ["active", "trialing"])
      .lte("created_at", thirtyDaysAgoISO),

    // Total brands (all time)
    admin.from("brands").select("id", { count: "exact", head: true }),

    // Brands before 30 days ago
    admin
      .from("brands")
      .select("id", { count: "exact", head: true })
      .lte("created_at", thirtyDaysAgoISO),

    // Brands before 60 days ago
    admin
      .from("brands")
      .select("id", { count: "exact", head: true })
      .lte("created_at", sixtyDaysAgoISO),

    // Current period usage totals (last 30 days)
    admin
      .from("usage_tracking")
      .select("personas_generated, images_generated, videos_generated")
      .gte("period_start", thirtyDaysAgoISO),

    // Previous period usage totals (30-60 days ago)
    admin
      .from("usage_tracking")
      .select("personas_generated, images_generated, videos_generated")
      .gte("period_start", sixtyDaysAgoISO)
      .lt("period_start", thirtyDaysAgoISO),
  ]);

  // Calculate total users metric
  const totalUsersCurrent = totalUsersResult.count ?? 0;
  // Growth: users at end of current period vs users at end of previous period
  // Current period users = totalUsersCurrent
  // Previous period snapshot (30d ago) = usersBefore30dResult.count
  const totalUsersPrevious = usersBefore30dResult.count ?? 0;

  // Active subscriptions
  const activeSubsCurrent = activeSubsResult.count ?? 0;
  const activeSubsPrevious = activeSubsBefore30dResult.count ?? 0;

  // MRR calculation from tier distribution
  const mrrCurrent = calculateMRR(subTiersResult.data ?? []);
  const mrrPrevious = calculateMRR(subTiersBefore30dResult.data ?? []);

  // Total brands
  const totalBrandsCurrent = totalBrandsResult.count ?? 0;
  const totalBrandsPrevious = brandsBefore30dResult.count ?? 0;

  // Usage totals
  const currentUsage = sumUsage(usageCurrentResult.data ?? []);
  const previousUsage = sumUsage(usagePreviousResult.data ?? []);

  return {
    totalUsers: {
      current: totalUsersCurrent,
      previous: totalUsersPrevious,
      growth: calcGrowth(totalUsersCurrent, totalUsersPrevious),
    },
    activeSubscriptions: {
      current: activeSubsCurrent,
      previous: activeSubsPrevious,
      growth: calcGrowth(activeSubsCurrent, activeSubsPrevious),
    },
    mrr: {
      current: mrrCurrent,
      previous: mrrPrevious,
      growth: calcGrowth(mrrCurrent, mrrPrevious),
    },
    totalBrands: {
      current: totalBrandsCurrent,
      previous: totalBrandsPrevious,
      growth: calcGrowth(totalBrandsCurrent, totalBrandsPrevious),
    },
    totalPersonasGenerated: {
      current: currentUsage.personas,
      previous: previousUsage.personas,
      growth: calcGrowth(currentUsage.personas, previousUsage.personas),
    },
    totalImagesGenerated: {
      current: currentUsage.images,
      previous: previousUsage.images,
      growth: calcGrowth(currentUsage.images, previousUsage.images),
    },
    totalVideosGenerated: {
      current: currentUsage.videos,
      previous: previousUsage.videos,
      growth: calcGrowth(currentUsage.videos, previousUsage.videos),
    },
  };
}

function calculateMRR(subscriptions: { tier: string }[]): number {
  let mrr = 0;
  for (const sub of subscriptions) {
    const pricing = tierPricing[sub.tier as SubscriptionTier];
    if (pricing) {
      mrr += pricing.monthlyPrice;
    }
  }
  return mrr;
}

function sumUsage(
  rows: {
    personas_generated: number;
    images_generated: number;
    videos_generated: number;
  }[]
): { personas: number; images: number; videos: number } {
  let personas = 0;
  let images = 0;
  let videos = 0;
  for (const row of rows) {
    personas += row.personas_generated ?? 0;
    images += row.images_generated ?? 0;
    videos += row.videos_generated ?? 0;
  }
  return { personas, images, videos };
}

// ──────────────────────────────────────────────
// Recent Activity Feed
// ──────────────────────────────────────────────

export type ActivityType =
  | "new_user"
  | "subscription_change"
  | "brand_created"
  | "persona_created"
  | "creative_created";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string; // ISO date string
}

/**
 * Fetches recent platform activity events, merges and sorts by timestamp.
 * Returns the latest 20 events across new users, subscription changes,
 * brands, personas, and creatives.
 */
export async function getRecentActivity(): Promise<ActivityEvent[]> {
  const admin = createAdminClient();

  // Fetch recent events from each source in parallel
  // We fetch more than 20 from each to have enough after merging
  const [usersResult, subsResult, brandsResult, personasResult, creativesResult] =
    await Promise.all([
      // Recent user sign-ups
      admin
        .from("user_profiles")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(20),

      // Recent subscription changes
      admin
        .from("subscriptions")
        .select("id, user_id, tier, status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(20),

      // Recent brands
      admin
        .from("brands")
        .select("id, user_id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(20),

      // Recent personas
      admin
        .from("personas")
        .select("id, name, created_at, brand_id")
        .order("created_at", { ascending: false })
        .limit(20),

      // Recent creatives
      admin
        .from("creatives")
        .select("id, creative_type, subtype, created_at, brand_id")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  // Collect all user IDs we need emails for
  const userIds = new Set<string>();

  for (const u of usersResult.data ?? []) {
    userIds.add(u.id);
  }
  for (const s of subsResult.data ?? []) {
    userIds.add(s.user_id);
  }
  for (const b of brandsResult.data ?? []) {
    userIds.add(b.user_id);
  }

  // For personas and creatives, we need brand→user mapping
  const brandIds = new Set<string>();
  for (const p of personasResult.data ?? []) {
    brandIds.add(p.brand_id);
  }
  for (const c of creativesResult.data ?? []) {
    brandIds.add(c.brand_id);
  }

  // Fetch brand→user mappings
  const brandUserMap = new Map<string, string>();
  if (brandIds.size > 0) {
    const { data: brandUsers } = await admin
      .from("brands")
      .select("id, user_id")
      .in("id", Array.from(brandIds));
    for (const bu of brandUsers ?? []) {
      brandUserMap.set(bu.id, bu.user_id);
      userIds.add(bu.user_id);
    }
  }

  // Batch-fetch user emails via auth admin API
  const emailMap = new Map<string, string>();
  const userIdArray = Array.from(userIds);
  // Supabase auth.admin.listUsers supports pagination; fetch in batches
  // For up to ~60 users, we can fetch individually or use listUsers
  const emailPromises = userIdArray.map(async (uid) => {
    const { data } = await admin.auth.admin.getUserById(uid);
    if (data?.user?.email) {
      emailMap.set(uid, data.user.email);
    }
  });
  await Promise.all(emailPromises);

  const getEmail = (userId: string) =>
    emailMap.get(userId) ?? "Unknown user";

  // Build activity events
  const events: ActivityEvent[] = [];

  // New user sign-ups
  for (const u of usersResult.data ?? []) {
    events.push({
      id: `user-${u.id}`,
      type: "new_user",
      description: `New user signed up: ${getEmail(u.id)}`,
      timestamp: u.created_at,
    });
  }

  // Subscription changes
  for (const s of subsResult.data ?? []) {
    events.push({
      id: `sub-${s.id}`,
      type: "subscription_change",
      description: `Subscription ${s.status}: ${getEmail(s.user_id)} → ${s.tier}`,
      timestamp: s.updated_at,
    });
  }

  // Brand created
  for (const b of brandsResult.data ?? []) {
    events.push({
      id: `brand-${b.id}`,
      type: "brand_created",
      description: `New brand created: "${b.name}" by ${getEmail(b.user_id)}`,
      timestamp: b.created_at,
    });
  }

  // Persona created
  for (const p of personasResult.data ?? []) {
    const userId = brandUserMap.get(p.brand_id);
    events.push({
      id: `persona-${p.id}`,
      type: "persona_created",
      description: `Persona generated: "${p.name}" by ${userId ? getEmail(userId) : "Unknown"}`,
      timestamp: p.created_at,
    });
  }

  // Creative created
  for (const c of creativesResult.data ?? []) {
    const userId = brandUserMap.get(c.brand_id);
    const typeLabel = c.subtype
      ? `${c.creative_type} (${c.subtype})`
      : c.creative_type;
    events.push({
      id: `creative-${c.id}`,
      type: "creative_created",
      description: `Creative generated: ${typeLabel} by ${userId ? getEmail(userId) : "Unknown"}`,
      timestamp: c.created_at,
    });
  }

  // Sort by timestamp descending and return latest 20
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return events.slice(0, 20);
}
