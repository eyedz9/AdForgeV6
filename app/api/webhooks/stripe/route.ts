/**
 * Stripe Webhook API Route
 *
 * Handles Stripe webhook events for subscription management:
 * - checkout.session.completed: Create subscription record
 * - customer.subscription.updated: Update tier and limits
 * - customer.subscription.deleted: Downgrade to free
 * - invoice.payment_failed: Update subscription status
 * - invoice.paid: Reset usage quotas
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifyWebhookSignature,
  processWebhookEvent,
  type CheckoutSessionData,
  type SubscriptionData,
  type InvoiceData,
  type WebhookResult,
} from "@/lib/stripe/webhooks";
import {
  stripe,
  getLimitsForTier,
  getTierFromPriceId,
  tierLimits,
  type SubscriptionTier,
} from "@/lib/stripe/client";
import type { Database } from "@/lib/supabase/database.types";

// Create a Supabase client with secret key for webhook operations
// Webhooks don't have user context, so we need secret key access
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find user ID by Stripe customer ID
 */
async function getUserIdByStripeCustomerId(
  supabase: ReturnType<typeof createServiceClient>,
  stripeCustomerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  return data?.user_id || null;
}

/**
 * Get period dates from subscription data
 */
function getPeriodDates(data: SubscriptionData | InvoiceData): {
  periodStart: Date;
  periodEnd: Date;
} {
  if ("currentPeriodStart" in data && "currentPeriodEnd" in data) {
    return {
      periodStart: data.currentPeriodStart,
      periodEnd: data.currentPeriodEnd,
    };
  }
  // For invoice data, use period_start/period_end if available
  if (data.periodStart && data.periodEnd) {
    return {
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
    };
  }
  // Default to 30-day period from now
  const periodStart = new Date();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return { periodStart, periodEnd };
}

/**
 * Format date for database (ISO string, date only)
 */
function formatDateForDb(date: Date): string {
  return date.toISOString().split("T")[0];
}

// =============================================================================
// Webhook Handlers
// =============================================================================

/**
 * Handle checkout.session.completed event
 * Creates or updates subscription record after successful checkout
 */
async function handleCheckoutCompleted(
  data: CheckoutSessionData
): Promise<WebhookResult> {
  const supabase = createServiceClient();

  // Get subscription details from Stripe
  if (!data.subscriptionId) {
    return { success: false, message: "No subscription ID in checkout session" };
  }

  const subscription = await stripe.subscriptions.retrieve(data.subscriptionId);
  const item = subscription.items.data[0];
  const priceId = item?.price?.id;
  const tier = priceId ? getTierFromPriceId(priceId) || "starter" : "starter";
  const limits = getLimitsForTier(tier);

  // Get period dates from subscription item
  const periodStart = item?.current_period_start
    ? new Date(item.current_period_start * 1000)
    : new Date();
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Look up existing subscription by stripe_customer_id
  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("stripe_customer_id", data.customerId)
    .single();

  if (existingSubscription) {
    // Update existing subscription
    const { error } = await supabase
      .from("subscriptions")
      .update({
        stripe_subscription_id: data.subscriptionId,
        stripe_price_id: priceId,
        tier,
        status: subscription.status,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        brands_limit: limits.brands,
        personas_limit: limits.personas,
        images_limit: limits.images,
        videos_limit: limits.videos,
      })
      .eq("id", existingSubscription.id);

    if (error) {
      console.error("Error updating subscription:", error);
      return { success: false, message: `Failed to update subscription: ${error.message}` };
    }

    // Create or update usage tracking for the new period
    await createOrUpdateUsageTracking(
      supabase,
      existingSubscription.user_id,
      periodStart,
      periodEnd,
      limits
    );

    return {
      success: true,
      message: `Subscription updated for customer ${data.customerId}`,
      data: { subscriptionId: data.subscriptionId, tier },
    };
  }

  // If no existing subscription, we need to look up user by customer metadata
  // The customer should have been created with user_id in metadata
  const customer = await stripe.customers.retrieve(data.customerId);
  if (customer.deleted) {
    return { success: false, message: "Customer has been deleted" };
  }

  const userId = customer.metadata?.user_id;
  if (!userId) {
    return {
      success: false,
      message: "No user_id found in customer metadata. Cannot create subscription.",
    };
  }

  // Create new subscription record
  const { error: insertError } = await supabase.from("subscriptions").insert({
    user_id: userId,
    stripe_customer_id: data.customerId,
    stripe_subscription_id: data.subscriptionId,
    stripe_price_id: priceId,
    tier,
    status: subscription.status,
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    brands_limit: limits.brands,
    personas_limit: limits.personas,
    images_limit: limits.images,
    videos_limit: limits.videos,
  });

  if (insertError) {
    console.error("Error creating subscription:", insertError);
    return { success: false, message: `Failed to create subscription: ${insertError.message}` };
  }

  // Create usage tracking for the new period
  await createOrUpdateUsageTracking(supabase, userId, periodStart, periodEnd, limits);

  return {
    success: true,
    message: `Subscription created for user ${userId}`,
    data: { subscriptionId: data.subscriptionId, tier },
  };
}

/**
 * Handle customer.subscription.updated event
 * Updates tier, limits, and status when subscription changes
 */
async function handleSubscriptionUpdated(
  data: SubscriptionData
): Promise<WebhookResult> {
  const supabase = createServiceClient();

  const userId = await getUserIdByStripeCustomerId(supabase, data.stripeCustomerId);
  if (!userId) {
    return {
      success: false,
      message: `No user found for customer ${data.stripeCustomerId}`,
    };
  }

  // Update subscription record
  const { error } = await supabase
    .from("subscriptions")
    .update({
      stripe_subscription_id: data.stripeSubscriptionId,
      stripe_price_id: data.stripePriceId,
      tier: data.tier,
      status: data.status,
      current_period_start: data.currentPeriodStart.toISOString(),
      current_period_end: data.currentPeriodEnd.toISOString(),
      cancel_at_period_end: data.cancelAtPeriodEnd,
      brands_limit: data.limits.brands,
      personas_limit: data.limits.personas,
      images_limit: data.limits.images,
      videos_limit: data.limits.videos,
    })
    .eq("stripe_customer_id", data.stripeCustomerId);

  if (error) {
    console.error("Error updating subscription:", error);
    return { success: false, message: `Failed to update subscription: ${error.message}` };
  }

  return {
    success: true,
    message: `Subscription updated for user ${userId}`,
    data: { tier: data.tier, status: data.status },
  };
}

/**
 * Handle customer.subscription.deleted event
 * Downgrades user to free tier
 */
async function handleSubscriptionDeleted(
  data: SubscriptionData
): Promise<WebhookResult> {
  const supabase = createServiceClient();

  const userId = await getUserIdByStripeCustomerId(supabase, data.stripeCustomerId);
  if (!userId) {
    return {
      success: false,
      message: `No user found for customer ${data.stripeCustomerId}`,
    };
  }

  // Get free tier limits
  const freeLimits = tierLimits.free;

  // Update subscription to free tier
  const { error } = await supabase
    .from("subscriptions")
    .update({
      stripe_subscription_id: null,
      stripe_price_id: null,
      tier: "free" as SubscriptionTier,
      status: "canceled",
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      brands_limit: freeLimits.brands,
      personas_limit: freeLimits.personas,
      images_limit: freeLimits.images,
      videos_limit: freeLimits.videos,
    })
    .eq("stripe_customer_id", data.stripeCustomerId);

  if (error) {
    console.error("Error downgrading subscription:", error);
    return { success: false, message: `Failed to downgrade subscription: ${error.message}` };
  }

  return {
    success: true,
    message: `Subscription canceled for user ${userId}, downgraded to free tier`,
    data: { tier: "free" },
  };
}

/**
 * Handle invoice.payment_failed event
 * Updates subscription status to reflect payment failure
 */
async function handleInvoicePaymentFailed(
  data: InvoiceData
): Promise<WebhookResult> {
  const supabase = createServiceClient();

  const userId = await getUserIdByStripeCustomerId(supabase, data.customerId);
  if (!userId) {
    return {
      success: false,
      message: `No user found for customer ${data.customerId}`,
    };
  }

  // Update subscription status to past_due
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
    })
    .eq("stripe_customer_id", data.customerId);

  if (error) {
    console.error("Error updating subscription status:", error);
    return { success: false, message: `Failed to update subscription status: ${error.message}` };
  }

  return {
    success: true,
    message: `Subscription marked as past_due for user ${userId}`,
    data: { invoiceId: data.invoiceId, attemptCount: data.attemptCount },
  };
}

/**
 * Handle invoice.paid event
 * Resets usage quotas for the new billing period
 */
async function handleInvoicePaid(data: InvoiceData): Promise<WebhookResult> {
  const supabase = createServiceClient();

  const userId = await getUserIdByStripeCustomerId(supabase, data.customerId);
  if (!userId) {
    return {
      success: false,
      message: `No user found for customer ${data.customerId}`,
    };
  }

  // Get the subscription to retrieve current limits
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("personas_limit, images_limit, videos_limit, status")
    .eq("stripe_customer_id", data.customerId)
    .single();

  if (subError || !subscription) {
    console.error("Error fetching subscription:", subError);
    return { success: false, message: "Failed to fetch subscription" };
  }

  // Update subscription status to active if it was past_due
  if (subscription.status === "past_due") {
    await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("stripe_customer_id", data.customerId);
  }

  // Get period dates
  const { periodStart, periodEnd } = getPeriodDates(data);

  // Create or reset usage tracking for the new period
  const limits = {
    brands: -1, // Not tracked in usage_tracking
    personas: subscription.personas_limit,
    images: subscription.images_limit,
    videos: subscription.videos_limit,
    intelligenceReports: -1, // Not tracked in usage_tracking
  };

  await createOrUpdateUsageTracking(supabase, userId, periodStart, periodEnd, limits);

  return {
    success: true,
    message: `Usage quotas reset for user ${userId}`,
    data: { invoiceId: data.invoiceId, periodStart, periodEnd },
  };
}

/**
 * Create or update usage tracking record for a billing period
 */
async function createOrUpdateUsageTracking(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  limits: { personas: number; images: number; videos: number }
): Promise<void> {
  const periodStartStr = formatDateForDb(periodStart);
  const periodEndStr = formatDateForDb(periodEnd);

  // Check if usage tracking exists for this period
  const { data: existingUsage } = await supabase
    .from("usage_tracking")
    .select("id")
    .eq("user_id", userId)
    .eq("period_start", periodStartStr)
    .single();

  if (existingUsage) {
    // Update existing record (reset counts, update limits)
    await supabase
      .from("usage_tracking")
      .update({
        period_end: periodEndStr,
        personas_generated: 0,
        images_generated: 0,
        videos_generated: 0,
        intelligence_reports: 0,
        personas_limit: limits.personas,
        images_limit: limits.images,
        videos_limit: limits.videos,
      })
      .eq("id", existingUsage.id);
  } else {
    // Create new usage tracking record
    await supabase.from("usage_tracking").insert({
      user_id: userId,
      period_start: periodStartStr,
      period_end: periodEndStr,
      personas_generated: 0,
      images_generated: 0,
      videos_generated: 0,
      intelligence_reports: 0,
      personas_limit: limits.personas,
      images_limit: limits.images,
      videos_limit: limits.videos,
    });
  }
}

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      const error = err as Error;
      console.error("Webhook signature verification failed:", error.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${error.message}` },
        { status: 400 }
      );
    }

    console.log(`Processing Stripe webhook event: ${event.type}`);

    // Process the event with our handlers
    const result = await processWebhookEvent(event, {
      onCheckoutCompleted: handleCheckoutCompleted,
      onSubscriptionUpdated: handleSubscriptionUpdated,
      onSubscriptionDeleted: handleSubscriptionDeleted,
      onInvoicePaymentFailed: handleInvoicePaymentFailed,
      onInvoicePaid: handleInvoicePaid,
    });

    if (!result.success) {
      console.error(`Webhook handler error: ${result.message}`);
      // Return 200 even on handler errors to prevent Stripe from retrying
      // The error is logged for debugging
      return NextResponse.json({ received: true, error: result.message });
    }

    return NextResponse.json({
      received: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Webhook route error:", errorMessage);

    // Return 500 for unexpected errors so Stripe will retry
    return NextResponse.json(
      { error: `Webhook error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
