/**
 * Stripe Cancel Subscription API Route
 *
 * Cancels the user's subscription at the end of the billing period.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscriptionAtPeriodEnd } from "@/lib/stripe/client";
import { Subscription } from "@/lib/supabase/database.types";

export async function POST() {
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

    // Get subscription record
    const { data: subscriptionData, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    const subscription = subscriptionData as Pick<Subscription, "stripe_subscription_id"> | null;

    if (subError || !subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Cancel subscription at period end
    const updatedSubscription = await cancelSubscriptionAtPeriodEnd(
      subscription.stripe_subscription_id
    );

    // Update local record
    await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
      } as never)
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      cancel_at: updatedSubscription.cancel_at,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
