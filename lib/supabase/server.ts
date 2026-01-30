/**
 * Supabase Server Client
 *
 * This module provides a Supabase client for use in server-side contexts:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 *
 * It uses the @supabase/ssr package for proper cookie handling in Next.js.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Creates a Supabase client for server-side usage.
 * This client properly handles cookies for authentication in Server Components,
 * Server Actions, and Route Handlers.
 *
 * @returns A typed Supabase client instance
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { createClient } from '@/lib/supabase/server'
 *
 * export default async function BrandsPage() {
 *   const supabase = await createClient()
 *   const { data: brands } = await supabase.from('brands').select()
 *   return <div>...</div>
 * }
 * ```
 *
 * @example
 * ```ts
 * // In a Server Action
 * 'use server'
 * import { createClient } from '@/lib/supabase/server'
 *
 * export async function createBrand(formData: FormData) {
 *   const supabase = await createClient()
 *   const { data, error } = await supabase.from('brands').insert({...})
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
