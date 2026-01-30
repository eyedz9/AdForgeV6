/**
 * Admin Impersonation Status API
 *
 * GET  - Returns current impersonation state (for client components)
 * POST - Ends impersonation (clears cookies)
 *
 * Both endpoints require the caller to be an authenticated admin.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";
import { getImpersonation, clearImpersonation } from "@/lib/auth/impersonation";
import { createAuditLog } from "@/lib/auth/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isImpersonating: false });
  }

  const adminCheck = await isAdmin(user.id);
  if (!adminCheck) {
    return NextResponse.json({ isImpersonating: false });
  }

  const impersonation = await getImpersonation();

  return NextResponse.json({
    isImpersonating: impersonation != null,
    userId: impersonation?.userId ?? null,
    email: impersonation?.email ?? null,
  });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const adminCheck = await isAdmin(user.id);
  if (!adminCheck) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  const impersonation = await getImpersonation();

  if (impersonation) {
    await createAuditLog(
      user.id,
      "user",
      impersonation.userId,
      "impersonation_end",
      { target_email: impersonation.email }
    );
  }

  await clearImpersonation();

  return NextResponse.json({ success: true });
}
