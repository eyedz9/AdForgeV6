/**
 * Stripe Billing Portal API Route
 *
 * Creates a Stripe Billing Portal session for managing subscriptions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBillingPortalSession } from "@/lib/stripe/client";
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

    // Get subscription record
    const { data: subscriptionData, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    const subscription = subscriptionData as Pick<Subscription, "stripe_customer_id"> | null;

    if (subError || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    // Build return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
    const returnUrl = `${baseUrl}/settings/subscription`;

    // Create Billing Portal session
    const session = await createBillingPortalSession(
      subscription.stripe_customer_id,
      returnUrl
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
