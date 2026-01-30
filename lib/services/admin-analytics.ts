/**
 * Admin Analytics Service
 *
 * Server-side functions to query analytics data for charts using the admin
 * Supabase client (service role). Used by the admin analytics dashboard.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { tierPricing } from "@/lib/stripe/client";
import type { SubscriptionTier } from "@/lib/stripe/client";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type DateRange = "7d" | "30d" | "90d" | "1y";

export interface UserGrowthPoint {
  date: string; // YYYY-MM-DD
  newUsers: number;
  cumulativeUsers: number;
}

export interface RevenuePoint {
  date: string; // YYYY-MM-DD
  starter: number; // MRR in cents from starter tier
  professional: number;
  agency: number;
  total: number;
}

export interface UserGrowthData {
  points: UserGrowthPoint[];
  totalUsers: number;
  newUsersInPeriod: number;
}

export interface RevenueData {
  points: RevenuePoint[];
  currentMRR: number; // in cents
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getStartDate(range: DateRange): Date {
  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "1y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Generates an array of date strings between start and end (inclusive).
 */
function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ──────────────────────────────────────────────
// User Growth Chart Data
// ──────────────────────────────────────────────

/**
 * Fetches user growth data: new sign-ups per day with cumulative total.
 */
export async function getUserGrowthData(
  range: DateRange
): Promise<UserGrowthData> {
  const admin = createAdminClient();
  const startDate = getStartDate(range);
  const now = new Date();
  const startISO = startDate.toISOString();

  // Fetch all user profiles to compute both new users per day and cumulative
  const [newUsersResult, totalBeforeResult] = await Promise.all([
    // Users created within the date range
    admin
      .from("user_profiles")
      .select("created_at")
      .gte("created_at", startISO)
      .order("created_at", { ascending: true }),

    // Count of users that existed before the start date (for cumulative baseline)
    admin
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .lt("created_at", startISO),
  ]);

  const newUsers = newUsersResult.data ?? [];
  const baselineCount = totalBeforeResult.count ?? 0;

  // Count new users per day
  const dailyCounts = new Map<string, number>();
  for (const user of newUsers) {
    const day = formatDate(new Date(user.created_at));
    dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);
  }

  // Build data points for each day in the range
  const dateRange = generateDateRange(startDate, now);
  let cumulative = baselineCount;
  const points: UserGrowthPoint[] = [];

  for (const date of dateRange) {
    const dayCount = dailyCounts.get(date) ?? 0;
    cumulative += dayCount;
    points.push({
      date,
      newUsers: dayCount,
      cumulativeUsers: cumulative,
    });
  }

  return {
    points,
    totalUsers: cumulative,
    newUsersInPeriod: newUsers.length,
  };
}

// ──────────────────────────────────────────────
// Revenue Chart Data
// ──────────────────────────────────────────────

/**
 * Fetches revenue data: MRR over time broken down by tier.
 *
 * Computes daily MRR snapshots by tracking when subscriptions were created
 * and what tier they belonged to.
 */
export async function getRevenueData(
  range: DateRange
): Promise<RevenueData> {
  const admin = createAdminClient();
  const startDate = getStartDate(range);
  const now = new Date();
  const startISO = startDate.toISOString();

  // Fetch all subscriptions that contribute to MRR
  // We need created_at to know when they started contributing
  const [activeSubsResult, historicalSubsResult] = await Promise.all([
    // Currently active subscriptions (for current MRR)
    admin
      .from("subscriptions")
      .select("id, tier, status, created_at")
      .in("status", ["active", "trialing"]),

    // All subscriptions created within the range (to track MRR growth)
    admin
      .from("subscriptions")
      .select("id, tier, status, created_at, updated_at")
      .order("created_at", { ascending: true }),
  ]);

  const activeSubs = activeSubsResult.data ?? [];
  const allSubs = historicalSubsResult.data ?? [];

  // Calculate current MRR
  let currentMRR = 0;
  for (const sub of activeSubs) {
    const pricing = tierPricing[sub.tier as SubscriptionTier];
    if (pricing) {
      currentMRR += pricing.monthlyPrice;
    }
  }

  // Build daily MRR snapshots
  // For each day, count which subscriptions existed and were active
  const dateRange = generateDateRange(startDate, now);
  const points: RevenuePoint[] = [];

  // Pre-compute: for each subscription, when it was created (to know when to start counting it)
  // Simplification: assume active subs were active from created_at onward
  // and non-active subs contributed until they became inactive
  for (const date of dateRange) {
    const dayEnd = new Date(date + "T23:59:59.999Z");

    let starter = 0;
    let professional = 0;
    let agency = 0;

    for (const sub of allSubs) {
      const createdAt = new Date(sub.created_at);
      if (createdAt > dayEnd) continue; // Sub didn't exist yet

      // For active/trialing subs, count them for all days since creation
      // For canceled/past_due subs, only count if updated_at > dayEnd (still was active on this day)
      const isCurrentlyActive =
        sub.status === "active" || sub.status === "trialing";
      const updatedAt = new Date(sub.updated_at);

      if (!isCurrentlyActive && updatedAt <= dayEnd) {
        // Sub became inactive before this day
        continue;
      }

      const pricing = tierPricing[sub.tier as SubscriptionTier];
      if (!pricing) continue;

      const tier = sub.tier as SubscriptionTier;
      if (tier === "starter") starter += pricing.monthlyPrice;
      else if (tier === "professional") professional += pricing.monthlyPrice;
      else if (tier === "agency") agency += pricing.monthlyPrice;
    }

    points.push({
      date,
      starter,
      professional,
      agency,
      total: starter + professional + agency,
    });
  }

  return {
    points,
    currentMRR,
  };
}

// ──────────────────────────────────────────────
// Subscription Distribution (Donut/Pie Chart)
// ──────────────────────────────────────────────

export interface SubscriptionDistributionItem {
  tier: string;
  count: number;
  percentage: number;
}

export interface SubscriptionDistributionData {
  items: SubscriptionDistributionItem[];
  total: number;
}

/**
 * Fetches subscription distribution: count of users by tier with percentages.
 */
export async function getSubscriptionDistribution(): Promise<SubscriptionDistributionData> {
  const admin = createAdminClient();

  const { data: subs } = await admin
    .from("subscriptions")
    .select("tier, status")
    .in("status", ["active", "trialing"]);

  const allSubs = subs ?? [];

  // Count by tier
  const tierCounts = new Map<string, number>();
  for (const sub of allSubs) {
    const tier = sub.tier ?? "free";
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
  }

  const total = allSubs.length;
  const orderedTiers = ["free", "starter", "professional", "agency", "enterprise"];

  const items: SubscriptionDistributionItem[] = orderedTiers
    .filter((t) => tierCounts.has(t))
    .map((t) => ({
      tier: t.charAt(0).toUpperCase() + t.slice(1),
      count: tierCounts.get(t)!,
      percentage: total > 0 ? Math.round((tierCounts.get(t)! / total) * 100) : 0,
    }));

  return { items, total };
}

// ──────────────────────────────────────────────
// Usage Overview (Bar Chart)
// ──────────────────────────────────────────────

export interface UsageOverviewPoint {
  date: string; // YYYY-MM-DD
  personas: number;
  images: number;
  videos: number;
}

export interface UsageOverviewData {
  points: UsageOverviewPoint[];
  totalPersonas: number;
  totalImages: number;
  totalVideos: number;
}

/**
 * Fetches usage overview data: personas, images, and videos generated per day
 * over the selected date range.
 *
 * Uses created_at from personas, creatives (type image/video) to count daily generation.
 */
// ──────────────────────────────────────────────
// Cohort Retention Data
// ──────────────────────────────────────────────

export interface CohortRow {
  cohortMonth: string; // YYYY-MM
  cohortSize: number;
  retention: number[]; // percentage retained at month 0, 1, 2, ...
}

export interface CohortRetentionData {
  cohorts: CohortRow[];
  maxMonths: number; // maximum columns in the table
}

/**
 * Computes monthly cohort retention from subscription data.
 *
 * A cohort is all subscriptions created in a given month.
 * Retention at month N means the subscription was still active/trialing
 * N months after the cohort month.
 */
export async function getCohortRetentionData(): Promise<CohortRetentionData> {
  const admin = createAdminClient();

  // Fetch all subscriptions
  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, user_id, tier, status, created_at, updated_at")
    .order("created_at", { ascending: true });

  const allSubs = subs ?? [];
  if (allSubs.length === 0) {
    return { cohorts: [], maxMonths: 0 };
  }

  const now = new Date();
  const currentMonth = toYearMonth(now);

  // Group subscriptions by cohort month (YYYY-MM of created_at)
  const cohortMap = new Map<string, typeof allSubs>();
  for (const sub of allSubs) {
    const month = toYearMonth(new Date(sub.created_at));
    if (!cohortMap.has(month)) cohortMap.set(month, []);
    cohortMap.get(month)!.push(sub);
  }

  // Sort cohort months chronologically
  const sortedMonths = Array.from(cohortMap.keys()).sort();

  // Only show last 12 cohort months max (to keep table manageable)
  const recentMonths = sortedMonths.slice(-12);

  const cohorts: CohortRow[] = [];
  let maxMonths = 0;

  for (const cohortMonth of recentMonths) {
    const cohortSubs = cohortMap.get(cohortMonth)!;
    const cohortSize = cohortSubs.length;

    // Calculate how many months from cohort to current month
    const monthsFromCohort = monthDiff(cohortMonth, currentMonth);
    const retentionMonths = Math.min(monthsFromCohort, 12); // cap at 12

    const retention: number[] = [];

    for (let m = 0; m <= retentionMonths; m++) {
      // At month m after cohort, how many subs were still active?
      const targetMonth = addMonths(cohortMonth, m);
      const targetDate = monthEndDate(targetMonth);

      let retained = 0;
      for (const sub of cohortSubs) {
        const createdAt = new Date(sub.created_at);
        if (createdAt > targetDate) continue; // not created yet

        const isCurrentlyActive =
          sub.status === "active" || sub.status === "trialing";
        const updatedAt = new Date(sub.updated_at);

        // If currently active, count it for all months up to now
        // If currently inactive, count it only if it became inactive after the target month end
        if (isCurrentlyActive || updatedAt > targetDate) {
          retained++;
        }
      }

      const pct = cohortSize > 0 ? Math.round((retained / cohortSize) * 100) : 0;
      retention.push(pct);
    }

    if (retention.length > maxMonths) {
      maxMonths = retention.length;
    }

    cohorts.push({
      cohortMonth,
      cohortSize,
      retention,
    });
  }

  return { cohorts, maxMonths };
}

// ──────────────────────────────────────────────
// Churn Metrics
// ──────────────────────────────────────────────

export interface ChurnByTier {
  tier: string;
  churned: number;
  total: number;
  rate: number; // percentage
}

export interface ChurnMetricsData {
  monthlyChurnRate: number; // percentage
  totalChurnedThisMonth: number;
  totalActiveStartOfMonth: number;
  churnByTier: ChurnByTier[];
}

/**
 * Computes churn metrics for the current month.
 *
 * Churn = subscriptions that changed from active/trialing to canceled/past_due
 * during the current month, approximated by status != active/trialing
 * AND updated_at is in the current month.
 */
export async function getChurnMetrics(): Promise<ChurnMetricsData> {
  const admin = createAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartISO = monthStart.toISOString();

  // Fetch all subscriptions
  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, tier, status, created_at, updated_at");

  const allSubs = subs ?? [];

  // Active at start of month = created before month start AND (currently active OR became inactive during this month)
  let activeAtStart = 0;
  let churnedThisMonth = 0;
  const tierChurn = new Map<string, { churned: number; total: number }>();

  const paidTiers = ["starter", "professional", "agency", "enterprise"];

  for (const sub of allSubs) {
    const createdAt = new Date(sub.created_at);
    const updatedAt = new Date(sub.updated_at);
    const tier = sub.tier ?? "free";
    const isActive = sub.status === "active" || sub.status === "trialing";

    // Only count paid tiers for churn (free users aren't churning paying customers)
    if (!paidTiers.includes(tier)) continue;

    // Was this subscription active at the start of the month?
    if (createdAt < monthStart) {
      // It existed before the month started
      if (isActive || updatedAt >= monthStart) {
        // Either still active or became inactive during/after month start
        activeAtStart++;

        if (!tierChurn.has(tier)) tierChurn.set(tier, { churned: 0, total: 0 });
        tierChurn.get(tier)!.total++;

        // Did it churn this month?
        if (!isActive && updatedAt >= monthStart) {
          churnedThisMonth++;
          tierChurn.get(tier)!.churned++;
        }
      }
    }
  }

  const monthlyChurnRate =
    activeAtStart > 0
      ? Math.round((churnedThisMonth / activeAtStart) * 1000) / 10
      : 0;

  const churnByTier: ChurnByTier[] = paidTiers
    .filter((t) => tierChurn.has(t))
    .map((t) => {
      const data = tierChurn.get(t)!;
      return {
        tier: t.charAt(0).toUpperCase() + t.slice(1),
        churned: data.churned,
        total: data.total,
        rate:
          data.total > 0
            ? Math.round((data.churned / data.total) * 1000) / 10
            : 0,
      };
    });

  return {
    monthlyChurnRate,
    totalChurnedThisMonth: churnedThisMonth,
    totalActiveStartOfMonth: activeAtStart,
    churnByTier,
  };
}

// ──────────────────────────────────────────────
// LTV (Lifetime Value) by Tier
// ──────────────────────────────────────────────

export interface LTVByTier {
  tier: string;
  avgLifetimeMonths: number;
  monthlyPrice: number; // cents
  ltv: number; // cents
  subscriberCount: number;
}

export interface LTVData {
  tiers: LTVByTier[];
}

/**
 * Computes average lifetime value by tier.
 *
 * LTV = average subscription duration (months) × monthly price.
 * Duration is from created_at to updated_at for churned subs, or to now for active subs.
 */
export async function getLTVData(): Promise<LTVData> {
  const admin = createAdminClient();

  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, tier, status, created_at, updated_at");

  const allSubs = subs ?? [];
  const now = new Date();

  // Group by tier, compute duration for each
  const tierDurations = new Map<
    string,
    { totalMonths: number; count: number }
  >();

  const paidTiers = ["starter", "professional", "agency"];

  for (const sub of allSubs) {
    const tier = sub.tier ?? "free";
    if (!paidTiers.includes(tier)) continue;

    const createdAt = new Date(sub.created_at);
    const isActive = sub.status === "active" || sub.status === "trialing";
    const endDate = isActive ? now : new Date(sub.updated_at);

    // Duration in months (fractional)
    const durationMs = endDate.getTime() - createdAt.getTime();
    const durationMonths = Math.max(durationMs / (30.44 * 24 * 60 * 60 * 1000), 0.1); // min 0.1 month

    if (!tierDurations.has(tier)) {
      tierDurations.set(tier, { totalMonths: 0, count: 0 });
    }
    const t = tierDurations.get(tier)!;
    t.totalMonths += durationMonths;
    t.count++;
  }

  const tiers: LTVByTier[] = paidTiers.map((tier) => {
    const data = tierDurations.get(tier);
    const pricing = tierPricing[tier as SubscriptionTier];
    const avgMonths = data && data.count > 0 ? data.totalMonths / data.count : 0;
    const ltv = Math.round(avgMonths * (pricing?.monthlyPrice ?? 0));

    return {
      tier: tier.charAt(0).toUpperCase() + tier.slice(1),
      avgLifetimeMonths: Math.round(avgMonths * 10) / 10,
      monthlyPrice: pricing?.monthlyPrice ?? 0,
      ltv,
      subscriberCount: data?.count ?? 0,
    };
  });

  return { tiers };
}

// ──────────────────────────────────────────────
// Feature Adoption
// ──────────────────────────────────────────────

export interface FeatureAdoptionItem {
  feature: string;
  usersAdopted: number;
  totalUsers: number;
  percentage: number;
}

export interface FeatureAdoptionData {
  items: FeatureAdoptionItem[];
  totalUsers: number;
}

/**
 * Computes feature adoption: percentage of users who have used each feature
 * at least once (brands, personas, images, videos, audiences, intelligence reports).
 */
export async function getFeatureAdoptionData(): Promise<FeatureAdoptionData> {
  const admin = createAdminClient();

  // Get total users
  const { count: totalUsers } = await admin
    .from("user_profiles")
    .select("id", { count: "exact", head: true });

  const total = totalUsers ?? 0;

  // Count distinct users who have created at least one of each content type
  // brands: user_id is directly on the table
  // personas: via brands.user_id
  // creatives: via brands.user_id (with creative_type filter)
  // audiences: via brands.user_id
  // intelligence_reports: via brands.user_id
  const [
    brandsResult,
    personasResult,
    imageCreativesResult,
    videoCreativesResult,
    audiencesResult,
    reportsResult,
  ] = await Promise.all([
    // Distinct users with at least one brand
    admin.from("brands").select("user_id"),

    // Distinct users with at least one persona (via brand join)
    admin.from("personas").select("brand_id, brands!inner(user_id)"),

    // Distinct users with at least one image creative
    admin
      .from("creatives")
      .select("brand_id, brands!inner(user_id)")
      .eq("creative_type", "image"),

    // Distinct users with at least one video creative
    admin
      .from("creatives")
      .select("brand_id, brands!inner(user_id)")
      .eq("creative_type", "video"),

    // Distinct users with at least one audience
    admin.from("audiences").select("brand_id, brands!inner(user_id)"),

    // Distinct users with at least one intelligence report
    admin
      .from("intelligence_reports")
      .select("brand_id, brands!inner(user_id)"),
  ]);

  // Extract distinct user IDs from each result
  const brandUserIds = new Set(
    (brandsResult.data ?? []).map((b) => b.user_id)
  );

  const extractUserIds = (
    data: Array<{ brands: unknown }> | null
  ): Set<string> => {
    const ids = new Set<string>();
    for (const row of data ?? []) {
      const brand = row.brands as unknown as { user_id: string };
      if (brand?.user_id) ids.add(brand.user_id);
    }
    return ids;
  };

  const personaUserIds = extractUserIds(
    personasResult.data as Array<{ brands: unknown }> | null
  );
  const imageUserIds = extractUserIds(
    imageCreativesResult.data as Array<{ brands: unknown }> | null
  );
  const videoUserIds = extractUserIds(
    videoCreativesResult.data as Array<{ brands: unknown }> | null
  );
  const audienceUserIds = extractUserIds(
    audiencesResult.data as Array<{ brands: unknown }> | null
  );
  const reportUserIds = extractUserIds(
    reportsResult.data as Array<{ brands: unknown }> | null
  );

  const buildItem = (
    feature: string,
    userIds: Set<string>
  ): FeatureAdoptionItem => ({
    feature,
    usersAdopted: userIds.size,
    totalUsers: total,
    percentage: total > 0 ? Math.round((userIds.size / total) * 1000) / 10 : 0,
  });

  return {
    items: [
      buildItem("Created a Brand", brandUserIds),
      buildItem("Generated a Persona", personaUserIds),
      buildItem("Generated an Image", imageUserIds),
      buildItem("Generated a Video", videoUserIds),
      buildItem("Created an Audience", audienceUserIds),
      buildItem("Generated a Report", reportUserIds),
    ],
    totalUsers: total,
  };
}

// ──────────────────────────────────────────────
// Conversion Funnel
// ──────────────────────────────────────────────

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number; // conversion rate from sign-up
  dropoff: number; // percentage that dropped off from previous stage
}

export interface ConversionFunnelData {
  stages: FunnelStage[];
}

/**
 * Computes conversion funnel: Sign-up → First Brand → First Persona →
 * First Creative → Paid Subscription.
 *
 * Each stage count is the number of unique users who reached that stage.
 */
export async function getConversionFunnelData(): Promise<ConversionFunnelData> {
  const admin = createAdminClient();

  const [
    totalUsersResult,
    brandsResult,
    personasResult,
    creativesResult,
    paidSubsResult,
  ] = await Promise.all([
    // Total sign-ups
    admin
      .from("user_profiles")
      .select("id", { count: "exact", head: true }),

    // Users who created at least one brand
    admin.from("brands").select("user_id"),

    // Users who generated at least one persona (via brand)
    admin.from("personas").select("brands!inner(user_id)"),

    // Users who generated at least one creative (via brand)
    admin.from("creatives").select("brands!inner(user_id)"),

    // Users with a paid subscription (active or trialing, non-free tier)
    admin
      .from("subscriptions")
      .select("user_id, tier, status")
      .in("status", ["active", "trialing"])
      .neq("tier", "free"),
  ]);

  const totalUsers = totalUsersResult.count ?? 0;

  const brandUsers = new Set(
    (brandsResult.data ?? []).map((b) => b.user_id)
  );

  const extractUserIds = (
    data: Array<{ brands: unknown }> | null
  ): Set<string> => {
    const ids = new Set<string>();
    for (const row of data ?? []) {
      const brand = row.brands as unknown as { user_id: string };
      if (brand?.user_id) ids.add(brand.user_id);
    }
    return ids;
  };

  const personaUsers = extractUserIds(
    personasResult.data as Array<{ brands: unknown }> | null
  );
  const creativeUsers = extractUserIds(
    creativesResult.data as Array<{ brands: unknown }> | null
  );
  const paidUsers = new Set(
    (paidSubsResult.data ?? []).map((s) => s.user_id)
  );

  const stages: Array<{ stage: string; count: number }> = [
    { stage: "Sign-up", count: totalUsers },
    { stage: "First Brand", count: brandUsers.size },
    { stage: "First Persona", count: personaUsers.size },
    { stage: "First Creative", count: creativeUsers.size },
    { stage: "Paid Subscription", count: paidUsers.size },
  ];

  const funnelStages: FunnelStage[] = stages.map((s, i) => ({
    stage: s.stage,
    count: s.count,
    percentage:
      totalUsers > 0
        ? Math.round((s.count / totalUsers) * 1000) / 10
        : 0,
    dropoff:
      i === 0
        ? 0
        : stages[i - 1].count > 0
          ? Math.round(
              ((stages[i - 1].count - s.count) / stages[i - 1].count) * 1000
            ) / 10
          : 0,
  }));

  return { stages: funnelStages };
}

// ──────────────────────────────────────────────
// Real-time Monitoring Data
// ──────────────────────────────────────────────

export interface RealtimeEvent {
  id: string;
  type: "new_user" | "subscription_change" | "persona_created" | "creative_created";
  description: string;
  timestamp: string; // ISO string
}

export interface RealtimeGenerationStats {
  personasToday: number;
  imagesToday: number;
  videosToday: number;
  personasSuccessRate: number; // percentage
  imagesSuccessRate: number;
  videosSuccessRate: number;
}

export interface RealtimeData {
  events: RealtimeEvent[];
  activeUsersCount: number;
  generationStats: RealtimeGenerationStats;
}

/**
 * Fetches real-time monitoring data:
 * - Recent events from last 5 minutes
 * - Active user count (activity in last 15 minutes)
 * - Generation stats for today (counts + success rates)
 */
export async function getRealtimeData(): Promise<RealtimeData> {
  const admin = createAdminClient();
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const fiveMinAgoISO = fiveMinAgo.toISOString();
  const fifteenMinAgoISO = fifteenMinAgo.toISOString();
  const todayStartISO = todayStart.toISOString();

  // Fetch all data in parallel
  const [
    recentUsersResult,
    recentSubsResult,
    recentPersonasResult,
    recentCreativesResult,
    activeProfilesResult,
    activeBrandsResult,
    activePersonasResult,
    activeCreativesResult,
    todayPersonasResult,
    todayCreativesResult,
  ] = await Promise.all([
    // Events from last 5 minutes
    admin
      .from("user_profiles")
      .select("id, created_at")
      .gte("created_at", fiveMinAgoISO)
      .order("created_at", { ascending: false }),

    admin
      .from("subscriptions")
      .select("id, user_id, tier, status, updated_at")
      .gte("updated_at", fiveMinAgoISO)
      .order("updated_at", { ascending: false }),

    admin
      .from("personas")
      .select("id, name, created_at, brand_id")
      .gte("created_at", fiveMinAgoISO)
      .order("created_at", { ascending: false }),

    admin
      .from("creatives")
      .select("id, creative_type, subtype, created_at, brand_id")
      .gte("created_at", fiveMinAgoISO)
      .order("created_at", { ascending: false }),

    // Active users: updated_at in last 15 minutes across key tables
    admin
      .from("user_profiles")
      .select("id")
      .gte("updated_at", fifteenMinAgoISO),

    admin
      .from("brands")
      .select("user_id")
      .gte("updated_at", fifteenMinAgoISO),

    admin
      .from("personas")
      .select("brand_id, brands!inner(user_id)")
      .gte("updated_at", fifteenMinAgoISO),

    admin
      .from("creatives")
      .select("brand_id, brands!inner(user_id)")
      .gte("updated_at", fifteenMinAgoISO),

    // Today's generation stats
    admin
      .from("personas")
      .select("id, created_at")
      .gte("created_at", todayStartISO),

    admin
      .from("creatives")
      .select("id, creative_type, status, created_at")
      .gte("created_at", todayStartISO),
  ]);

  // ── Build Live Activity Events ──
  const events: RealtimeEvent[] = [];

  // Collect user IDs for email lookup
  const userIds = new Set<string>();
  for (const u of recentUsersResult.data ?? []) userIds.add(u.id);
  for (const s of recentSubsResult.data ?? []) userIds.add(s.user_id);

  // Get brand→user mappings for personas/creatives
  const brandIds = new Set<string>();
  for (const p of recentPersonasResult.data ?? []) brandIds.add(p.brand_id);
  for (const c of recentCreativesResult.data ?? []) brandIds.add(c.brand_id);

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

  // Batch-fetch emails
  const emailMap = new Map<string, string>();
  if (userIds.size > 0) {
    const emailPromises = Array.from(userIds).map(async (uid) => {
      const { data } = await admin.auth.admin.getUserById(uid);
      if (data?.user?.email) emailMap.set(uid, data.user.email);
    });
    await Promise.all(emailPromises);
  }

  const getEmail = (userId: string) =>
    emailMap.get(userId) ?? "Unknown user";

  for (const u of recentUsersResult.data ?? []) {
    events.push({
      id: `user-${u.id}`,
      type: "new_user",
      description: `New user signed up: ${getEmail(u.id)}`,
      timestamp: u.created_at,
    });
  }

  for (const s of recentSubsResult.data ?? []) {
    events.push({
      id: `sub-${s.id}`,
      type: "subscription_change",
      description: `Subscription ${s.status}: ${getEmail(s.user_id)} → ${s.tier}`,
      timestamp: s.updated_at,
    });
  }

  for (const p of recentPersonasResult.data ?? []) {
    const userId = brandUserMap.get(p.brand_id);
    events.push({
      id: `persona-${p.id}`,
      type: "persona_created",
      description: `Persona generated: "${p.name}" by ${userId ? getEmail(userId) : "Unknown"}`,
      timestamp: p.created_at,
    });
  }

  for (const c of recentCreativesResult.data ?? []) {
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

  // Sort by timestamp descending
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // ── Active Users Count ──
  const activeUserIdSet = new Set<string>();

  for (const row of activeProfilesResult.data ?? []) {
    activeUserIdSet.add(row.id);
  }
  for (const row of activeBrandsResult.data ?? []) {
    activeUserIdSet.add(row.user_id);
  }
  for (const row of activePersonasResult.data ?? []) {
    const brand = (row as { brands: unknown }).brands as unknown as {
      user_id: string;
    };
    if (brand?.user_id) activeUserIdSet.add(brand.user_id);
  }
  for (const row of activeCreativesResult.data ?? []) {
    const brand = (row as { brands: unknown }).brands as unknown as {
      user_id: string;
    };
    if (brand?.user_id) activeUserIdSet.add(brand.user_id);
  }

  // ── Generation Stats (Today) ──
  const todayPersonas = todayPersonasResult.data ?? [];
  const todayCreatives = todayCreativesResult.data ?? [];

  const todayImages = todayCreatives.filter(
    (c) => c.creative_type === "image"
  );
  const todayVideos = todayCreatives.filter(
    (c) => c.creative_type === "video"
  );

  // Success rate: creatives with status !== 'failed'
  // Personas don't have a status field, so assume 100% success
  const calcSuccessRate = (
    items: { status?: string }[]
  ): number => {
    if (items.length === 0) return 100;
    const failed = items.filter((i) => i.status === "failed").length;
    return Math.round(((items.length - failed) / items.length) * 1000) / 10;
  };

  return {
    events,
    activeUsersCount: activeUserIdSet.size,
    generationStats: {
      personasToday: todayPersonas.length,
      imagesToday: todayImages.length,
      videosToday: todayVideos.length,
      personasSuccessRate: 100, // No failure tracking for personas
      imagesSuccessRate: calcSuccessRate(todayImages),
      videosSuccessRate: calcSuccessRate(todayVideos),
    },
  };
}

// ──────────────────────────────────────────────
// Date Helpers (cohort-specific)
// ──────────────────────────────────────────────

/** Convert a Date to YYYY-MM string */
function toYearMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Number of months between two YYYY-MM strings */
function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/** Add N months to a YYYY-MM string, returns YYYY-MM */
function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const totalMonths = y * 12 + (m - 1) + n;
  const newY = Math.floor(totalMonths / 12);
  const newM = (totalMonths % 12) + 1;
  return `${newY}-${String(newM).padStart(2, "0")}`;
}

/** Get the end-of-month date for a YYYY-MM string */
function monthEndDate(ym: string): Date {
  const [y, m] = ym.split("-").map(Number);
  // Day 0 of the next month = last day of this month
  return new Date(y, m, 0, 23, 59, 59, 999);
}

// ──────────────────────────────────────────────
// Usage Overview (Bar Chart)
// ──────────────────────────────────────────────

export async function getUsageOverview(
  range: DateRange
): Promise<UsageOverviewData> {
  const admin = createAdminClient();
  const startDate = getStartDate(range);
  const now = new Date();
  const startISO = startDate.toISOString();

  // Fetch creation timestamps for personas, images, and videos
  const [personasResult, creativesResult] = await Promise.all([
    admin
      .from("personas")
      .select("created_at")
      .gte("created_at", startISO)
      .order("created_at", { ascending: true }),

    admin
      .from("creatives")
      .select("created_at, creative_type")
      .gte("created_at", startISO)
      .order("created_at", { ascending: true }),
  ]);

  const personas = personasResult.data ?? [];
  const creatives = creativesResult.data ?? [];

  // Count per day
  const dailyPersonas = new Map<string, number>();
  const dailyImages = new Map<string, number>();
  const dailyVideos = new Map<string, number>();

  for (const p of personas) {
    const day = formatDate(new Date(p.created_at));
    dailyPersonas.set(day, (dailyPersonas.get(day) ?? 0) + 1);
  }

  for (const c of creatives) {
    const day = formatDate(new Date(c.created_at));
    if (c.creative_type === "image") {
      dailyImages.set(day, (dailyImages.get(day) ?? 0) + 1);
    } else if (c.creative_type === "video") {
      dailyVideos.set(day, (dailyVideos.get(day) ?? 0) + 1);
    }
  }

  // Build data points for each day in the range
  const dateRangeArr = generateDateRange(startDate, now);
  const points: UsageOverviewPoint[] = [];
  let totalPersonas = 0;
  let totalImages = 0;
  let totalVideos = 0;

  for (const date of dateRangeArr) {
    const pCount = dailyPersonas.get(date) ?? 0;
    const iCount = dailyImages.get(date) ?? 0;
    const vCount = dailyVideos.get(date) ?? 0;
    totalPersonas += pCount;
    totalImages += iCount;
    totalVideos += vCount;
    points.push({
      date,
      personas: pCount,
      images: iCount,
      videos: vCount,
    });
  }

  return {
    points,
    totalPersonas,
    totalImages,
    totalVideos,
  };
}
