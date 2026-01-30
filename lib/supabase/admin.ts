/**
 * Supabase Admin Client
 *
 * This module provides a Supabase client that uses the service role key
 * to bypass RLS. Use this only in server-side contexts for admin operations
 * that need unrestricted database access.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Creates a Supabase client with service role privileges that bypasses RLS.
 * This should only be used in server-side code (Server Components, Server Actions,
 * Route Handlers) for admin operations.
 *
 * @returns A typed Supabase client with service role access
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
    );
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey);
}
