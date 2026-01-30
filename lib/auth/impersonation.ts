/**
 * Impersonation Utilities
 *
 * Server-side utilities for managing admin user impersonation.
 * Impersonation is tracked via HTTP-only cookies set in server actions.
 */

import { cookies } from "next/headers";

const IMPERSONATE_ID_COOKIE = "adforge-impersonate-id";
const IMPERSONATE_EMAIL_COOKIE = "adforge-impersonate-email";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * Gets the impersonation state from cookies (server-side).
 * Returns null if not impersonating.
 */
export async function getImpersonation(): Promise<{
  userId: string;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(IMPERSONATE_ID_COOKIE)?.value;
  const email = cookieStore.get(IMPERSONATE_EMAIL_COOKIE)?.value;

  if (!userId) return null;

  return { userId, email: email ?? "" };
}

/**
 * Sets impersonation cookies (server-side).
 */
export async function setImpersonation(
  userId: string,
  email: string
): Promise<void> {
  const cookieStore = await cookies();

  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };

  cookieStore.set(IMPERSONATE_ID_COOKIE, userId, opts);
  cookieStore.set(IMPERSONATE_EMAIL_COOKIE, email, opts);
}

/**
 * Clears impersonation cookies (server-side).
 */
export async function clearImpersonation(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(IMPERSONATE_ID_COOKIE, "", { maxAge: 0, path: "/" });
  cookieStore.set(IMPERSONATE_EMAIL_COOKIE, "", { maxAge: 0, path: "/" });
}
