/**
 * Supabase Browser Client
 *
 * This module provides a Supabase client for use in browser/client-side components.
 * It uses the @supabase/ssr package for proper cookie handling in Next.js.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Creates a Supabase client for browser-side usage.
 * This client automatically handles cookie-based session management.
 *
 * @returns A typed Supabase client instance
 *
 * @example
 * ```tsx
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 *
 * export function MyComponent() {
 *   const supabase = createClient()
 *   // Use supabase.from('brands').select()...
 * }
 * ```
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
