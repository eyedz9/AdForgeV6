/**
 * Stripe Checkout API Route
 *
 * Creates a Stripe Checkout session for subscription upgrades.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  stripe,
  createStripeCustomer,
} from "@/lib/stripe/client";
import { Subscription } from "@/lib/supabase/database.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { priceId, billingCycle = "monthly" } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Get or create subscription record
    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const subscription = subscriptionData as Subscription | null;
    let stripeCustomerId = subscription?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(
        user.email || "",
        user.user_metadata?.full_name,
        { user_id: user.id }
      );
      stripeCustomerId = customer.id;

      // Create or update subscription record with customer ID
      if (subscription) {
        await supabase
          .from("subscriptions")
          .update({ stripe_customer_id: stripeCustomerId } as never)
          .eq("id", subscription.id);
      } else {
        await supabase.from("subscriptions").insert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          tier: "free",
          status: "active",
        } as never);
      }
    }

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
    const successUrl = `${baseUrl}/settings/subscription?success=true`;
    const cancelUrl = `${baseUrl}/settings/subscription?canceled=true`;

    // Determine actual price ID based on billing cycle
    // For yearly billing, we'd need separate yearly price IDs in Stripe
    // For now, we use the same price IDs (monthly)
    const actualPriceId = priceId;

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: actualPriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          user_id: user.id,
          billing_cycle: billingCycle,
        },
      },
      metadata: {
        user_id: user.id,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
