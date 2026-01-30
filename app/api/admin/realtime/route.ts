/**
 * Admin Realtime Monitoring API Route
 *
 * Returns real-time monitoring data for the admin dashboard.
 * Protected by admin role check. Polled by the client every 30 seconds.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";
import { getRealtimeData } from "@/lib/services/admin-analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdmin(user.id);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await getRealtimeData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching realtime data:", error);
    return NextResponse.json(
      { error: "Failed to fetch realtime data" },
      { status: 500 }
    );
  }
}
