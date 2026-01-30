/**
 * Auth Callback Route
 *
 * This route handles:
 * - OAuth redirects (Google, etc.)
 * - Email verification link clicks
 * - Magic link authentication
 *
 * It exchanges the auth code for a session and creates initial subscription
 * records for new users.
 */

import { createClient } from "@/lib/supabase/server";
import { tierLimits } from "@/lib/stripe/client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SubscriptionInsert, UsageTrackingInsert } from "@/lib/supabase/database.types";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirectTo") || "/dashboard";
  const next = requestUrl.searchParams.get("next"); // Alternative redirect param
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth error response
  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(loginUrl);
  }

  // No code means invalid callback
  if (!code) {
    console.error("Auth callback called without code");
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "Invalid callback request");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Code exchange error:", exchangeError);
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", exchangeError.message);
      return NextResponse.redirect(loginUrl);
    }

    const user = data.user;
    if (!user) {
      console.error("No user returned after code exchange");
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "Authentication failed");
      return NextResponse.redirect(loginUrl);
    }

    // Check if account is disabled
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("disabled_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && (profile as { disabled_at: string | null }).disabled_at != null) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "Account disabled. Contact support.");
      return NextResponse.redirect(loginUrl);
    }

    // Check if user is new (needs subscription record)
    const { data: existingSubscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (subError && subError.code !== "PGRST116") {
      // PGRST116 = no rows found, which is expected for new users
      console.error("Error checking subscription:", subError);
    }

    // Create initial subscription record for new users
    if (!existingSubscription) {
      const freeLimits = tierLimits.free;

      const subscriptionData: SubscriptionInsert = {
        user_id: user.id,
        stripe_customer_id: `pending_${user.id}`, // Will be updated when they subscribe
        tier: "free",
        status: "active",
        brands_limit: freeLimits.brands,
        personas_limit: freeLimits.personas,
        images_limit: freeLimits.images,
        videos_limit: freeLimits.videos,
      };

      const { error: insertError } = await supabase
        .from("subscriptions")
        .insert(subscriptionData as never);

      if (insertError) {
        console.error("Error creating subscription:", insertError);
        // Don't fail the auth flow, user can still use the app
        // The subscription record will be created on first API call if needed
      }

      // Create initial usage tracking for the current period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const usageData: UsageTrackingInsert = {
        user_id: user.id,
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
        personas_generated: 0,
        images_generated: 0,
        videos_generated: 0,
        intelligence_reports: 0,
        personas_limit: freeLimits.personas,
        images_limit: freeLimits.images,
        videos_limit: freeLimits.videos,
      };

      const { error: usageError } = await supabase
        .from("usage_tracking")
        .insert(usageData as never);

      if (usageError) {
        console.error("Error creating usage tracking:", usageError);
        // Don't fail the auth flow
      }

      // New user - redirect to onboarding
      const onboardingUrl = new URL("/dashboard", requestUrl.origin);
      onboardingUrl.searchParams.set("welcome", "true");
      return NextResponse.redirect(onboardingUrl);
    }

    // Existing user - redirect to requested destination
    const finalRedirect = next || redirectTo;
    const destinationUrl = new URL(finalRedirect, requestUrl.origin);
    return NextResponse.redirect(destinationUrl);
  } catch (error) {
    console.error("Unexpected error in auth callback:", error);
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "An unexpected error occurred");
    return NextResponse.redirect(loginUrl);
  }
}
