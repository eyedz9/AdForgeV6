/**
 * Next.js Proxy for Authentication (Next.js 16+)
 *
 * This proxy protects dashboard routes by redirecting unauthenticated
 * users to the login page. It uses Supabase auth helpers to verify sessions.
 *
 * Protected routes: /dashboard/*, /brands/*, /settings/*
 * Public routes: /, /login, /signup, /callback
 */

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/brands", "/settings"];

// Routes that are always public (auth pages, landing, etc.)
const publicRoutes = ["/", "/login", "/signup", "/callback"];

/**
 * Checks if the pathname starts with any of the given prefixes
 */
function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(prefix + "/") ||
      (prefix === "/" && pathname === "/")
  );
}

/**
 * Checks if the request is for a protected route
 */
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

/**
 * Checks if the request is for a public auth route (login, signup)
 * These routes should redirect authenticated users to dashboard
 */
function isAuthRoute(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Update session and get user info
  const { supabaseResponse, user } = await updateSession(request);

  // If user is not authenticated and trying to access protected route
  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    // Store the original URL to redirect back after login
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and trying to access auth routes (login, signup)
  // Redirect them to the dashboard
  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, jpeg, gif, webp, ico)
     * - api routes (handled separately, may need their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
