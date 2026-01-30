/**
 * Admin Users Service
 *
 * Server-side functions to query and manage users using the admin
 * Supabase client (service role). Used by the admin users management page.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { tierPricing, type SubscriptionTier } from "@/lib/stripe/client";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tier: string;
  subscriptionStatus: string;
  status: "active" | "disabled";
  signUpDate: string;
  lastSignIn: string | null;
}

export interface AdminUsersResult {
  users: AdminUserRow[];
  totalCount: number;
  filteredCount: number;
}

export interface AdminUsersParams {
  search?: string;
  tier?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/**
 * Fetches a paginated, filterable, sortable list of platform users.
 * Joins auth.users (via admin API), user_profiles, and subscriptions.
 */
export async function getAdminUsers(
  params: AdminUsersParams = {}
): Promise<AdminUsersResult> {
  const {
    search,
    tier,
    role,
    status,
    sortBy = "signUpDate",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
  } = params;

  const admin = createAdminClient();

  // Fetch user_profiles with subscription join
  let query = admin
    .from("user_profiles")
    .select("id, role, disabled_at, created_at", { count: "exact" });

  // Apply role filter
  if (role && role !== "all") {
    query = query.eq("role", role);
  }

  // Apply status filter
  if (status === "active") {
    query = query.is("disabled_at", null);
  } else if (status === "disabled") {
    query = query.not("disabled_at", "is", null);
  }

  // Execute the profile query to get all matching IDs
  const { data: profiles, count: totalProfileCount, error: profileError } = await query;

  if (profileError || !profiles) {
    console.error("Failed to fetch user profiles:", profileError);
    return { users: [], totalCount: 0, filteredCount: 0 };
  }

  // Get total count (no filters applied)
  const { count: totalCount } = await admin
    .from("user_profiles")
    .select("id", { count: "exact", head: true });

  // Collect all profile IDs to fetch auth data and subscriptions
  const profileIds = profiles.map((p) => p.id);
  if (profileIds.length === 0) {
    return { users: [], totalCount: totalCount ?? 0, filteredCount: 0 };
  }

  // Fetch auth user data and subscriptions in parallel
  const [authUsers, subsResult] = await Promise.all([
    // Batch fetch auth users
    Promise.all(
      profileIds.map(async (uid) => {
        const { data } = await admin.auth.admin.getUserById(uid);
        return data?.user
          ? {
              id: uid,
              email: data.user.email ?? "",
              name:
                (data.user.user_metadata?.full_name as string) ??
                (data.user.user_metadata?.name as string) ??
                null,
              lastSignIn: data.user.last_sign_in_at ?? null,
            }
          : null;
      })
    ),
    // Fetch subscriptions for all users
    admin
      .from("subscriptions")
      .select("user_id, tier, status")
      .in("user_id", profileIds),
  ]);

  // Build lookup maps
  const authMap = new Map<
    string,
    { email: string; name: string | null; lastSignIn: string | null }
  >();
  for (const user of authUsers) {
    if (user) {
      authMap.set(user.id, {
        email: user.email,
        name: user.name,
        lastSignIn: user.lastSignIn,
      });
    }
  }

  const subsMap = new Map<string, { tier: string; status: string }>();
  for (const sub of subsResult.data ?? []) {
    subsMap.set(sub.user_id, { tier: sub.tier, status: sub.status });
  }

  // Merge into AdminUserRow[]
  let users: AdminUserRow[] = profiles.map((p) => {
    const auth = authMap.get(p.id);
    const sub = subsMap.get(p.id);
    return {
      id: p.id,
      email: auth?.email ?? "Unknown",
      name: auth?.name ?? null,
      role: p.role,
      tier: sub?.tier ?? "free",
      subscriptionStatus: sub?.status ?? "none",
      status: p.disabled_at ? ("disabled" as const) : ("active" as const),
      signUpDate: p.created_at,
      lastSignIn: auth?.lastSignIn ?? null,
    };
  });

  // Apply search filter (client-side since auth data isn't in DB query)
  if (search) {
    const lowerSearch = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(lowerSearch) ||
        (u.name && u.name.toLowerCase().includes(lowerSearch))
    );
  }

  // Apply tier filter
  if (tier && tier !== "all") {
    users = users.filter((u) => u.tier === tier);
  }

  const filteredCount = users.length;

  // Sort
  users.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "email":
        cmp = a.email.localeCompare(b.email);
        break;
      case "name":
        cmp = (a.name ?? "").localeCompare(b.name ?? "");
        break;
      case "tier":
        cmp = a.tier.localeCompare(b.tier);
        break;
      case "signUpDate":
      default:
        cmp =
          new Date(a.signUpDate).getTime() - new Date(b.signUpDate).getTime();
        break;
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  // Paginate
  const offset = (page - 1) * pageSize;
  const paginatedUsers = users.slice(offset, offset + pageSize);

  return {
    users: paginatedUsers,
    totalCount: totalCount ?? 0,
    filteredCount,
  };
}

// =============================================================================
// User Detail
// =============================================================================

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  status: "active" | "disabled";
  disabledAt: string | null;
  signUpDate: string;
  lastSignIn: string | null;
  subscription: {
    id: string;
    tier: string;
    tierName: string;
    status: string;
    stripeCustomerId: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    brandsLimit: number;
    personasLimit: number;
    imagesLimit: number;
    videosLimit: number;
  } | null;
  usage: {
    personasGenerated: number;
    imagesGenerated: number;
    videosGenerated: number;
    intelligenceReports: number;
    personasLimit: number;
    imagesLimit: number;
    videosLimit: number;
  } | null;
  brands: {
    id: string;
    name: string;
    industry: string | null;
    createdAt: string;
    moderationStatus: string;
  }[];
}

/**
 * Fetches full detail for a single user by ID.
 * Joins auth.users, user_profiles, subscriptions, usage_tracking, and brands.
 */
export async function getUserDetail(
  userId: string
): Promise<AdminUserDetail | null> {
  const admin = createAdminClient();

  // Fetch profile, auth, subscription, usage, and brands in parallel
  const [authResult, profileResult, subResult, brandsResult] =
    await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin
        .from("user_profiles")
        .select("id, role, disabled_at, created_at")
        .eq("id", userId)
        .single(),
      admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("brands")
        .select("id, name, industry, created_at, moderation_status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  const authUser = authResult.data?.user;
  const profile = profileResult.data;

  if (!authUser || !profile) {
    return null;
  }

  // Fetch current period usage
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const { data: usageData } = await admin
    .from("usage_tracking")
    .select(
      "personas_generated, images_generated, videos_generated, intelligence_reports, personas_limit, images_limit, videos_limit"
    )
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .maybeSingle();

  const sub = subResult.data;
  const tierKey = (sub?.tier ?? "free") as SubscriptionTier;
  const tierName =
    tierPricing[tierKey]?.name ?? sub?.tier ?? "Free";

  return {
    id: userId,
    email: authUser.email ?? "Unknown",
    name:
      (authUser.user_metadata?.full_name as string) ??
      (authUser.user_metadata?.name as string) ??
      null,
    avatarUrl: (authUser.user_metadata?.avatar_url as string) ?? null,
    role: profile.role,
    status: profile.disabled_at ? "disabled" : "active",
    disabledAt: profile.disabled_at,
    signUpDate: profile.created_at,
    lastSignIn: authUser.last_sign_in_at ?? null,
    subscription: sub
      ? {
          id: sub.id,
          tier: sub.tier,
          tierName,
          status: sub.status,
          stripeCustomerId: sub.stripe_customer_id,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          brandsLimit: sub.brands_limit,
          personasLimit: sub.personas_limit,
          imagesLimit: sub.images_limit,
          videosLimit: sub.videos_limit,
        }
      : null,
    usage: usageData
      ? {
          personasGenerated: usageData.personas_generated,
          imagesGenerated: usageData.images_generated,
          videosGenerated: usageData.videos_generated,
          intelligenceReports: usageData.intelligence_reports,
          personasLimit: usageData.personas_limit,
          imagesLimit: usageData.images_limit,
          videosLimit: usageData.videos_limit,
        }
      : null,
    brands: (brandsResult.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      industry: b.industry,
      createdAt: b.created_at,
      moderationStatus: b.moderation_status,
    })),
  };
}
