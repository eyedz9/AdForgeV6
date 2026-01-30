/**
 * Stripe Webhook utilities
 *
 * This module provides:
 * - Webhook signature verification
 * - Type definitions for webhook events
 * - Helper functions for processing webhook events
 */

import Stripe from "stripe";
import { stripe, getTierFromPriceId, getLimitsForTier, SubscriptionTier } from "./client";

// =============================================================================
// Webhook Configuration
// =============================================================================

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  console.warn(
    "Warning: STRIPE_WEBHOOK_SECRET is not set. Webhook verification will fail."
  );
}

// =============================================================================
// Webhook Signature Verification
// =============================================================================

/**
 * Verify webhook signature and construct event
 * @param payload - Raw request body as string
 * @param signature - Stripe-Signature header value
 * @returns The verified Stripe event
 * @throws Error if verification fails
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!webhookSecret) {
    throw new Error("Webhook secret is not configured");
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (err) {
    const error = err as Error;
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}

// =============================================================================
// Webhook Event Types
// =============================================================================

/**
 * Relevant Stripe webhook event types for subscription management
 */
export const webhookEventTypes = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
  "invoice.paid",
] as const;

export type WebhookEventType = (typeof webhookEventTypes)[number];

/**
 * Check if an event type is one we handle
 */
export function isHandledEventType(type: string): type is WebhookEventType {
  return webhookEventTypes.includes(type as WebhookEventType);
}

// =============================================================================
// Event Data Extraction Helpers
// =============================================================================

/**
 * Extracted subscription data from a Stripe subscription
 */
export interface SubscriptionData {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string | null;
  tier: SubscriptionTier;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  limits: {
    brands: number;
    personas: number;
    images: number;
    videos: number;
  };
}

/**
 * Extract subscription data from a Stripe subscription object
 */
export function extractSubscriptionData(
  subscription: Stripe.Subscription
): SubscriptionData {
  // Get the first item's price (we assume single-product subscriptions)
  const item = subscription.items.data[0];
  const priceId = item?.price?.id || null;

  // Determine tier from price ID
  const tier = priceId ? getTierFromPriceId(priceId) || "free" : "free";
  const limits = getLimitsForTier(tier);

  // Get period dates from the subscription item if available
  const periodStart = item?.current_period_start;
  const periodEnd = item?.current_period_end;

  return {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    stripePriceId: priceId,
    tier,
    status: subscription.status,
    currentPeriodStart: periodStart
      ? new Date(periodStart * 1000)
      : new Date(),
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    limits: {
      brands: limits.brands,
      personas: limits.personas,
      images: limits.images,
      videos: limits.videos,
    },
  };
}

/**
 * Extracted checkout session data
 */
export interface CheckoutSessionData {
  sessionId: string;
  customerId: string;
  subscriptionId: string | null;
  customerEmail: string | null;
  mode: string;
  paymentStatus: string;
}

/**
 * Extract data from a completed checkout session
 */
export function extractCheckoutSessionData(
  session: Stripe.Checkout.Session
): CheckoutSessionData {
  return {
    sessionId: session.id,
    customerId:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id || "",
    subscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null,
    customerEmail: session.customer_email,
    mode: session.mode || "subscription",
    paymentStatus: session.payment_status,
  };
}

/**
 * Extracted invoice data
 */
export interface InvoiceData {
  invoiceId: string;
  customerId: string;
  subscriptionId: string | null;
  status: string | null;
  amountPaid: number;
  amountDue: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  paid: boolean;
  attemptCount: number;
}

/**
 * Extract data from an invoice
 */
export function extractInvoiceData(invoice: Stripe.Invoice): InvoiceData {
  // Get subscription ID from parent if available
  const parentSub = invoice.parent?.subscription_details?.subscription;
  let subscriptionId: string | null = null;
  if (typeof parentSub === "string") {
    subscriptionId = parentSub;
  } else if (parentSub && typeof parentSub === "object" && "id" in parentSub) {
    subscriptionId = parentSub.id;
  }

  // Determine if paid from status
  const isPaid = invoice.status === "paid";

  return {
    invoiceId: invoice.id,
    customerId:
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id || "",
    subscriptionId,
    status: invoice.status,
    amountPaid: invoice.amount_paid,
    amountDue: invoice.amount_due,
    periodStart: invoice.period_start
      ? new Date(invoice.period_start * 1000)
      : null,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    paid: isPaid,
    attemptCount: invoice.attempt_count || 0,
  };
}

// =============================================================================
// Webhook Event Handlers Interface
// =============================================================================

/**
 * Result of processing a webhook event
 */
export interface WebhookResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Handler function type for webhook events
 */
export type WebhookHandler<T> = (data: T) => Promise<WebhookResult>;

/**
 * Map of event types to their handlers
 */
export interface WebhookHandlers {
  onCheckoutCompleted?: WebhookHandler<CheckoutSessionData>;
  onSubscriptionCreated?: WebhookHandler<SubscriptionData>;
  onSubscriptionUpdated?: WebhookHandler<SubscriptionData>;
  onSubscriptionDeleted?: WebhookHandler<SubscriptionData>;
  onInvoicePaymentFailed?: WebhookHandler<InvoiceData>;
  onInvoicePaymentSucceeded?: WebhookHandler<InvoiceData>;
  onInvoicePaid?: WebhookHandler<InvoiceData>;
}

/**
 * Process a webhook event with the provided handlers
 */
export async function processWebhookEvent(
  event: Stripe.Event,
  handlers: WebhookHandlers
): Promise<WebhookResult> {
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const data = extractCheckoutSessionData(session);
        if (handlers.onCheckoutCompleted) {
          return await handlers.onCheckoutCompleted(data);
        }
        return { success: true, message: "Checkout completed event received" };
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const data = extractSubscriptionData(subscription);
        if (handlers.onSubscriptionCreated) {
          return await handlers.onSubscriptionCreated(data);
        }
        return { success: true, message: "Subscription created event received" };
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const data = extractSubscriptionData(subscription);
        if (handlers.onSubscriptionUpdated) {
          return await handlers.onSubscriptionUpdated(data);
        }
        return { success: true, message: "Subscription updated event received" };
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const data = extractSubscriptionData(subscription);
        if (handlers.onSubscriptionDeleted) {
          return await handlers.onSubscriptionDeleted(data);
        }
        return { success: true, message: "Subscription deleted event received" };
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const data = extractInvoiceData(invoice);
        if (handlers.onInvoicePaymentFailed) {
          return await handlers.onInvoicePaymentFailed(data);
        }
        return { success: true, message: "Invoice payment failed event received" };
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const data = extractInvoiceData(invoice);
        if (handlers.onInvoicePaymentSucceeded) {
          return await handlers.onInvoicePaymentSucceeded(data);
        }
        return {
          success: true,
          message: "Invoice payment succeeded event received",
        };
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const data = extractInvoiceData(invoice);
        if (handlers.onInvoicePaid) {
          return await handlers.onInvoicePaid(data);
        }
        return { success: true, message: "Invoice paid event received" };
      }

      default:
        return { success: true, message: `Unhandled event type: ${event.type}` };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, message: `Error processing webhook: ${errorMessage}` };
  }
}

// =============================================================================
// Subscription Status Helpers
// =============================================================================

/**
 * Stripe subscription status types
 */
export const subscriptionStatuses = [
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "paused",
] as const;

export type StripeSubscriptionStatus = (typeof subscriptionStatuses)[number];

/**
 * Check if subscription is in a billable/active state
 */
export function isSubscriptionActive(status: string): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Check if subscription needs attention (payment issues)
 */
export function subscriptionNeedsAttention(status: string): boolean {
  return status === "past_due" || status === "incomplete" || status === "unpaid";
}

/**
 * Check if subscription is canceled or expired
 */
export function isSubscriptionCanceled(status: string): boolean {
  return status === "canceled" || status === "incomplete_expired";
}

/**
 * Get user-friendly status message
 */
export function getStatusMessage(status: string): string {
  switch (status) {
    case "active":
      return "Your subscription is active";
    case "trialing":
      return "Your free trial is active";
    case "past_due":
      return "Payment failed - please update your payment method";
    case "unpaid":
      return "Your subscription is unpaid";
    case "canceled":
      return "Your subscription has been canceled";
    case "incomplete":
      return "Payment required to activate subscription";
    case "incomplete_expired":
      return "Subscription setup expired";
    case "paused":
      return "Your subscription is paused";
    default:
      return "Unknown subscription status";
  }
}
