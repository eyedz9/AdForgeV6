/**
 * Stripe client initialization and configuration
 *
 * This module provides:
 * - Stripe SDK client for server-side operations
 * - Subscription tier definitions with pricing
 * - Tier limits configuration
 */

import Stripe from "stripe";

// Initialize Stripe client lazily to prevent build-time errors when env vars are not set
let _stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!_stripe) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      console.warn(
        "Warning: STRIPE_SECRET_KEY is not set. Stripe functionality will not work."
      );
      // Return a mock client that will throw on actual use
      // This allows the build to succeed without the env var
      throw new Error("STRIPE_SECRET_KEY is required for Stripe operations");
    }

    _stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// Export a getter for the stripe client - will throw if STRIPE_SECRET_KEY is not set
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

// =============================================================================
// Subscription Tiers
// =============================================================================

export const subscriptionTiers = [
  "free",
  "starter",
  "professional",
  "agency",
  "enterprise",
] as const;

export type SubscriptionTier = (typeof subscriptionTiers)[number];

// =============================================================================
// Stripe Price IDs
// =============================================================================

/**
 * Price IDs for each subscription tier
 * These should be created in the Stripe Dashboard and set via environment variables
 */
export const stripePriceIds = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
  professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID || "price_professional",
  agency: process.env.STRIPE_AGENCY_PRICE_ID || "price_agency",
  // Enterprise is custom pricing - no standard price ID
} as const;

export type StripePriceId = (typeof stripePriceIds)[keyof typeof stripePriceIds];

/**
 * Maps Stripe price IDs back to tier names
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  const entries = Object.entries(stripePriceIds) as [
    Exclude<SubscriptionTier, "free" | "enterprise">,
    string
  ][];

  for (const [tier, id] of entries) {
    if (id === priceId) {
      return tier;
    }
  }
  return null;
}

// =============================================================================
// Tier Pricing (for display purposes)
// =============================================================================

export interface TierPricing {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number; // in cents
  yearlyPrice: number; // in cents (annual total)
  features: string[];
}

export const tierPricing: Record<SubscriptionTier, TierPricing> = {
  free: {
    tier: "free",
    name: "Free",
    description: "Get started with basic features",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "1 Brand",
      "5 Personas per month",
      "20 Images per month",
      "5 Videos per month",
      "Basic intelligence reports",
      "Email support",
    ],
  },
  starter: {
    tier: "starter",
    name: "Starter",
    description: "Perfect for small businesses",
    monthlyPrice: 4900, // $49
    yearlyPrice: 47000, // $470/year (save ~20%)
    features: [
      "3 Brands",
      "25 Personas per month",
      "100 Images per month",
      "25 Videos per month",
      "Full intelligence reports",
      "All export formats",
      "Priority email support",
    ],
  },
  professional: {
    tier: "professional",
    name: "Professional",
    description: "For growing marketing teams",
    monthlyPrice: 14900, // $149
    yearlyPrice: 143000, // $1,430/year (save ~20%)
    features: [
      "10 Brands",
      "100 Personas per month",
      "500 Images per month",
      "100 Videos per month",
      "Advanced intelligence reports",
      "API access",
      "Team collaboration",
      "Priority support",
    ],
  },
  agency: {
    tier: "agency",
    name: "Agency",
    description: "For agencies and large teams",
    monthlyPrice: 39900, // $399
    yearlyPrice: 383000, // $3,830/year (save ~20%)
    features: [
      "Unlimited Brands",
      "500 Personas per month",
      "2000 Images per month",
      "500 Videos per month",
      "White-label exports",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 phone support",
    ],
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    monthlyPrice: 0, // Custom pricing
    yearlyPrice: 0,
    features: [
      "Everything in Agency",
      "Custom limits",
      "SSO integration",
      "Custom AI model tuning",
      "Dedicated infrastructure",
      "SLA guarantees",
      "On-premise deployment option",
    ],
  },
};

// =============================================================================
// Tier Limits
// =============================================================================

export interface TierLimits {
  brands: number;
  personas: number;
  images: number;
  videos: number;
  intelligenceReports: number;
}

/**
 * Usage limits per subscription tier
 * These limits are per billing period (monthly)
 */
export const tierLimits: Record<SubscriptionTier, TierLimits> = {
  free: {
    brands: 1,
    personas: 5,
    images: 20,
    videos: 5,
    intelligenceReports: 2,
  },
  starter: {
    brands: 3,
    personas: 25,
    images: 100,
    videos: 25,
    intelligenceReports: 10,
  },
  professional: {
    brands: 10,
    personas: 100,
    images: 500,
    videos: 100,
    intelligenceReports: 50,
  },
  agency: {
    brands: -1, // Unlimited
    personas: 500,
    images: 2000,
    videos: 500,
    intelligenceReports: 200,
  },
  enterprise: {
    // Enterprise limits are customized per customer
    // These are defaults that can be overridden
    brands: -1, // Unlimited
    personas: -1, // Unlimited
    images: -1, // Unlimited
    videos: -1, // Unlimited
    intelligenceReports: -1, // Unlimited
  },
};

/**
 * Get limits for a specific tier
 * @param tier - The subscription tier
 * @returns The limits object for that tier
 */
export function getLimitsForTier(tier: SubscriptionTier): TierLimits {
  return tierLimits[tier] || tierLimits.free;
}

/**
 * Check if a limit is unlimited (-1 indicates unlimited)
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Check if usage is within limit
 * @param used - Current usage count
 * @param limit - The limit (-1 for unlimited)
 * @returns true if within limit or unlimited, false if exceeded
 */
export function isWithinLimit(used: number, limit: number): boolean {
  if (isUnlimited(limit)) return true;
  return used < limit;
}

// =============================================================================
// Stripe Helpers
// =============================================================================

/**
 * Create a Stripe Checkout session for subscription
 * @param customerId - Stripe customer ID
 * @param priceId - Stripe price ID for the tier
 * @param successUrl - URL to redirect to after successful payment
 * @param cancelUrl - URL to redirect to if user cancels
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 14, // 14-day free trial
    },
  });

  return session;
}

/**
 * Create a Stripe Customer
 * @param email - Customer email
 * @param name - Customer name (optional)
 * @param metadata - Additional metadata (optional)
 */
export async function createStripeCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata,
  });

  return customer;
}

/**
 * Create a billing portal session for managing subscriptions
 * @param customerId - Stripe customer ID
 * @param returnUrl - URL to return to after portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Get subscription details
 * @param subscriptionId - Stripe subscription ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

/**
 * Cancel a subscription at period end
 * @param subscriptionId - Stripe subscription ID
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  return subscription;
}

/**
 * Reactivate a canceled subscription (before period ends)
 * @param subscriptionId - Stripe subscription ID
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
  return subscription;
}
