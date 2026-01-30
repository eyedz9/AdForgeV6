"use client";

/**
 * Signup Page
 *
 * Stunning registration with holographic effects.
 */

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, CheckCircle2, Loader2, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";

function SignupForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  const supabase = createClient();

  const handleEmailSignup = async (e: React.FormEvent) => {
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

      if (password.length < 8) {
        setError("Password must be at least 8 characters long");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setShowVerificationMessage(true);
      setLoading(false);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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

  // Verification success state
  if (showVerificationMessage) {
    return (
      <div className="text-center space-y-6 animate-scale-up">
        {/* Success icon */}
        <div className="relative inline-flex">
          <div className="w-20 h-20 rounded-full bg-[var(--color-plasma-emerald)]/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-[var(--color-plasma-emerald)]" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[var(--color-plasma-amber)] flex items-center justify-center animate-bounce">
            <Sparkles className="w-4 h-4 text-[var(--color-void)]" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Check your email</h2>
          <p className="text-[var(--color-text-secondary)] leading-relaxed">
            We&apos;ve sent a verification link to{" "}
            <span className="text-[var(--color-text-primary)] font-medium">{email}</span>.
            Please click the link to verify your email address.
          </p>
        </div>

        <p className="text-sm text-[var(--color-text-muted)]">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <button
            type="button"
            className="text-[var(--color-plasma-violet)] hover:text-[var(--color-plasma-purple)] underline transition-colors"
            onClick={handleEmailSignup}
            disabled={loading}
          >
            {loading ? "Sending..." : "resend"}
          </button>
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] rounded-xl font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
        >
          Back to login
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center animate-fade-up">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Create your account
        </h2>
        <p className="text-[var(--color-text-muted)] mt-2">
          Get started with AdForge for free
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
      <form onSubmit={handleEmailSignup} className="space-y-5">
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
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={loading}
              required
              minLength={8}
              className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-elevated)] border border-white/10 rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-300 focus:outline-none focus:border-[var(--color-plasma-violet)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_0_20px_rgba(139,92,246,0.1)] disabled:opacity-50"
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)] pl-1">
            Must be at least 8 characters
          </p>
        </div>

        <div className="space-y-2 animate-fade-up delay-3">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-text-secondary)]">
            Confirm Password
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-plasma-violet)] transition-colors">
              <Lock className="h-5 w-5" />
            </div>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              disabled={loading}
              required
              minLength={8}
              className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-elevated)] border border-white/10 rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-300 focus:outline-none focus:border-[var(--color-plasma-violet)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_0_20px_rgba(139,92,246,0.1)] disabled:opacity-50"
            />
          </div>
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
                Creating account...
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </span>
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
        onClick={handleGoogleSignup}
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

      {/* Sign in link */}
      <p className="text-center text-sm text-[var(--color-text-muted)] animate-fade-up delay-7">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[var(--color-plasma-violet)] hover:text-[var(--color-plasma-purple)] font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>

      {/* Terms */}
      <p className="text-center text-xs text-[var(--color-text-muted)] leading-relaxed animate-fade-up delay-8">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline transition-colors">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline transition-colors">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-plasma-violet)]" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
