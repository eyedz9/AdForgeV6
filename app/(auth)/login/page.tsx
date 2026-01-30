"use client";

/**
 * Login Page
 *
 * Stunning authentication with holographic effects.
 */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, Loader2, Mail, Lock, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim()) {
        setError("Email is required");
        setLoading(false);
        return;
      }
      if (!password) {
        setError("Password is required");
        setLoading(false);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Check if account is disabled
      if (signInData.user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("disabled_at")
          .eq("id", signInData.user.id)
          .single<{ disabled_at: string | null }>();

        if (profile?.disabled_at != null) {
          await supabase.auth.signOut();
          setError("Account disabled. Contact support.");
          setLoading(false);
          return;
        }
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center animate-fade-up">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome back
        </h2>
        <p className="text-[var(--color-text-muted)] mt-2">
          Sign in to your account to continue
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-plasma-rose)]/10 border border-[var(--color-plasma-rose)]/20 animate-scale-up">
          <AlertCircle className="h-5 w-5 text-[var(--color-plasma-rose)] shrink-0" />
          <span className="text-sm text-[var(--color-plasma-rose)]">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleEmailLogin} className="space-y-5">
        <div className="space-y-2 animate-fade-up delay-1">
          <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)]">
            Email
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-plasma-violet)] transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              required
              className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-elevated)] border border-white/10 rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-300 focus:outline-none focus:border-[var(--color-plasma-violet)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_0_20px_rgba(139,92,246,0.1)] disabled:opacity-50"
            />
          </div>
        </div>

        <div className="space-y-2 animate-fade-up delay-2">
          <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-secondary)]">
            Password
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-plasma-violet)] transition-colors">
              <Lock className="h-5 w-5" />
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
              required
              className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-elevated)] border border-white/10 rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-300 focus:outline-none focus:border-[var(--color-plasma-violet)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_0_20px_rgba(139,92,246,0.1)] disabled:opacity-50"
            />
          </div>
        </div>

        <div className="text-right animate-fade-up delay-3">
          <Link
            href="/forgot-password"
            className="text-sm text-[var(--color-plasma-violet)] hover:text-[var(--color-plasma-purple)] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative w-full py-4 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] rounded-xl font-semibold text-white transition-all duration-300 hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden animate-fade-up delay-4"
        >
          <span className="relative flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </span>
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>
      </form>

      {/* Divider */}
      <div className="relative animate-fade-up delay-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-4 bg-[var(--color-surface)] text-[var(--color-text-muted)]">
            or continue with
          </span>
        </div>
      </div>

      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl font-medium text-[var(--color-text-primary)] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 animate-fade-up delay-6"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z" />
          <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z" />
          <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z" />
          <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z" />
        </svg>
        Continue with Google
      </button>

      {/* Sign up link */}
      <p className="text-center text-sm text-[var(--color-text-muted)] animate-fade-up delay-7">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-[var(--color-plasma-violet)] hover:text-[var(--color-plasma-purple)] font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-plasma-violet)]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
