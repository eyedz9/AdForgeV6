/**
 * Stripe Reactivate Subscription API Route
 *
 * Reactivates a subscription that was set to cancel at period end.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reactivateSubscription } from "@/lib/stripe/client";
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
      .select("stripe_subscription_id, cancel_at_period_end")
      .eq("user_id", user.id)
      .single();

    const subscription = subscriptionData as Pick<Subscription, "stripe_subscription_id" | "cancel_at_period_end"> | null;

    if (subError || !subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: "Subscription is not set to cancel" },
        { status: 400 }
      );
    }

    // Reactivate subscription
    await reactivateSubscription(subscription.stripe_subscription_id);

    // Update local record
    await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: false,
      } as never)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return NextResponse.json(
      { error: "Failed to reactivate subscription" },
      { status: 500 }
    );
  }
}
