/**
 * Admin Subscriptions Service
 *
 * Server-side functions to query subscriptions using the admin Supabase client
 * (service role). Used by the admin subscriptions management page.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  tierPricing,
  subscriptionTiers,
  type SubscriptionTier,
} from "@/lib/stripe/client";

// =============================================================================
// Types
// =============================================================================

export interface AdminSubscriptionRow {
  id: string;
  userId: string;
  userEmail: string;
  tier: string;
  status: string;
  mrrContribution: number; // in cents
  periodStart: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface TierBreakdown {
  tier: string;
  tierName: string;
  count: number;
  revenue: number; // in cents (monthly)
}

export interface AdminSubscriptionsResult {
  subscriptions: AdminSubscriptionRow[];
  totalCount: number;
  filteredCount: number;
  totalMRR: number; // in cents
  tierBreakdown: TierBreakdown[];
}

export interface AdminSubscriptionsParams {
  tier?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Fetches a paginated, filterable, sortable list of all subscriptions.
 * Joins subscriptions with auth.users for email lookup.
 */
export async function getAdminSubscriptions(
  params: AdminSubscriptionsParams = {}
): Promise<AdminSubscriptionsResult> {
  const {
    tier,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
  } = params;

  const admin = createAdminClient();

  // Fetch all subscriptions (we need all for tier breakdown summary)
  const { data: allSubs, error: allSubsError } = await admin
    .from("subscriptions")
    .select(
      "id, user_id, tier, status, current_period_start, current_period_end, cancel_at_period_end, created_at"
    );

  if (allSubsError || !allSubs) {
    console.error("Failed to fetch subscriptions:", allSubsError);
    return {
      subscriptions: [],
      totalCount: 0,
      filteredCount: 0,
      totalMRR: 0,
      tierBreakdown: [],
    };
  }

  const totalCount = allSubs.length;

  // Calculate tier breakdown and total MRR from ALL subscriptions (before filtering)
  const tierCounts = new Map<string, number>();
  let totalMRR = 0;

  for (const sub of allSubs) {
    if (sub.status === "active" || sub.status === "trialing") {
      const pricing = tierPricing[sub.tier as SubscriptionTier];
      const monthlyPrice = pricing?.monthlyPrice ?? 0;
      totalMRR += monthlyPrice;

      tierCounts.set(sub.tier, (tierCounts.get(sub.tier) ?? 0) + 1);
    }
  }

  const tierBreakdown: TierBreakdown[] = subscriptionTiers
    .map((t) => {
      const count = tierCounts.get(t) ?? 0;
      const pricing = tierPricing[t];
      return {
        tier: t,
        tierName: pricing?.name ?? t,
        count,
        revenue: count * (pricing?.monthlyPrice ?? 0),
      };
    })
    .filter((tb) => tb.count > 0);

  // Apply filters
  let filtered = [...allSubs];

  if (tier && tier !== "all") {
    filtered = filtered.filter((s) => s.tier === tier);
  }

  if (status && status !== "all") {
    filtered = filtered.filter((s) => s.status === status);
  }

  const filteredCount = filtered.length;

  // Collect user IDs for email lookup
  const userIds = [...new Set(filtered.map((s) => s.user_id))];

  // Batch fetch user emails
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const emailResults = await Promise.all(
      userIds.map(async (uid) => {
        const { data } = await admin.auth.admin.getUserById(uid);
        return { uid, email: data?.user?.email ?? "Unknown" };
      })
    );
    for (const r of emailResults) {
      emailMap.set(r.uid, r.email);
    }
  }

  // Build rows with MRR contribution
  let rows: AdminSubscriptionRow[] = filtered.map((s) => {
    const pricing = tierPricing[s.tier as SubscriptionTier];
    const isActive = s.status === "active" || s.status === "trialing";
    return {
      id: s.id,
      userId: s.user_id,
      userEmail: emailMap.get(s.user_id) ?? "Unknown",
      tier: s.tier,
      status: s.status,
      mrrContribution: isActive ? (pricing?.monthlyPrice ?? 0) : 0,
      periodStart: s.current_period_start,
      periodEnd: s.current_period_end,
      cancelAtPeriodEnd: s.cancel_at_period_end,
      createdAt: s.created_at,
    };
  });

  // Sort
  rows.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "userEmail":
        cmp = a.userEmail.localeCompare(b.userEmail);
        break;
      case "tier":
        cmp = a.tier.localeCompare(b.tier);
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "mrr":
        cmp = a.mrrContribution - b.mrrContribution;
        break;
      case "periodEnd":
        cmp =
          new Date(a.periodEnd ?? 0).getTime() -
          new Date(b.periodEnd ?? 0).getTime();
        break;
      case "createdAt":
      default:
        cmp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  // Paginate
  const offset = (page - 1) * pageSize;
  const paginatedRows = rows.slice(offset, offset + pageSize);

  return {
    subscriptions: paginatedRows,
    totalCount,
    filteredCount,
    totalMRR,
    tierBreakdown,
  };
}
