/**
 * Profile Settings Page
 *
 * Stunning holographic profile settings with personal information and password management.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  User,
  Lock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  // User profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/login");
          return;
        }

        const userProfile: UserProfile = {
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        };

        setProfile(userProfile);
        setName(userProfile.name || "");
        setEmail(userProfile.email);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase, router]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      // Update user metadata (name)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { name, full_name: name },
      });

      if (updateError) {
        throw updateError;
      }

      // Check if email changed
      if (email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });

        if (emailError) {
          throw emailError;
        }
      }

      // Update local state
      setProfile((prev) => (prev ? { ...prev, name, email } : null));
      setProfileSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setProfileError(
        err instanceof Error ? err.message : "Failed to update profile"
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validate passwords
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      setPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      setPasswordLoading(false);
      return;
    }

    try {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Clear form and show success
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating password:", err);
      setPasswordError(
        err instanceof Error ? err.message : "Failed to update password"
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--color-plasma-violet)]/20 border-t-[var(--color-plasma-violet)] animate-spin" />
            <div className="absolute inset-0 rounded-full blur-xl bg-[var(--color-plasma-violet)]/20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6 group animate-fade-up"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Settings
      </Link>

      {/* Header */}
      <header className="mb-10 animate-fade-up" style={{ animationDelay: "50ms" }}>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient-static">Profile Settings</span>
          </h1>
        </div>
        <p className="text-[var(--color-text-secondary)] text-lg">
          Update your personal information and password
        </p>
      </header>

      {/* Personal Information Section */}
      <section className="mb-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="gradient-border">
          <div className="bg-[var(--color-surface)] rounded-[inherit] p-6 md:p-8 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-plasma-violet)]/5 to-transparent pointer-events-none" />

            <div className="relative">
              {/* Section Header */}
              <div className="flex items-start gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="p-3 rounded-xl bg-[var(--color-plasma-violet)]/20 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                  <User className="w-6 h-6 text-[var(--color-plasma-violet)]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                    Personal Information
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Update your name and email address
                  </p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Success Message */}
                {profileSuccess && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-plasma-emerald)]/10 border border-[var(--color-plasma-emerald)]/20 animate-scale-up">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-plasma-emerald)] shrink-0" />
                    <span className="text-sm text-[var(--color-plasma-emerald)]">
                      Profile updated successfully
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {profileError && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-plasma-rose)]/10 border border-[var(--color-plasma-rose)]/20 animate-scale-up">
                    <AlertCircle className="w-5 h-5 text-[var(--color-plasma-rose)] shrink-0" />
                    <span className="text-sm text-[var(--color-plasma-rose)]">
                      {profileError}
                    </span>
                  </div>
                )}

                {/* Name Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-[var(--color-text-secondary)]"
                  >
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-plasma-violet)] transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-elevated)] border border-white/10 rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-300 focus:outline-none focus:border-[var(--color-plasma-violet)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_0_20px_rgba(139,92,246,0.1)]"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[var(--color-text-secondary)]"
                  >
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-plasma-violet)] transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-elevated)] border border-white/10 rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-300 focus:outline-none focus:border-[var(--color-plasma-violet)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_0_20px_rgba(139,92,246,0.1)]"
                    />
                  </div>
                  {email !== profile?.email && (
                    <p className="text-xs text-[var(--color-plasma-amber)] pl-1">
                      Changing your email will require verification of the new address.
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="group relative px-6 py-3 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] rounded-xl font-semibold text-white transition-all duration-300 hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className="relative flex items-center gap-2">
                    {profileLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Password Section */}
      <section className="mb-8 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="gradient-border">
          <div className="bg-[var(--color-surface)] rounded-[inherit] p-6 md:p-8 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-plasma-cyan)]/5 to-transparent pointer-events-none" />

            <div className="relative">
              {/* Section Header */}
              <div className="flex items-start gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="p-3 rounded-xl bg-[var(--color-plasma-cyan)]/20 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                  <Lock className="w-6 h-6 text-[var(--color-plasma-cyan)]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                    Change Password
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Update your password to keep your account secure
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {/* Success Message */}
                {passwordSuccess && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-plasma-emerald)]/10 border border-[var(--color-plasma-emerald)]/20 animate-scale-up">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-plasma-emerald)] shrink-0" />
                    <span className="text-sm text-[var(--color-plasma-emerald)]">
                      Password updated successfully
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {passwordError && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-plasma-rose)]/10 border border-[var(--color-plasma-rose)]/20 animate-scale-up">
                    <AlertCircle className="w-5 h-5 text-[var(--color-plasma-rose)] shrink-0" />
                    <span className="text-sm text-[var(--color-plasma-rose)]">
                      {passwordError}
                    </span>
                  </div>
                )}

                {/* Current Password Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-[var(--color-text-secondary)]"
                  >
                    Current Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-plasma-cyan)] transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-elevated)] border border-white/10 rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-300 focus:outline-none focus:border-[var(--color-plasma-cyan)] focus:shadow-[0_0_0_3px_rgba(6,182,212,0.15),0_0_20px_rgba(6,182,212,0.1)]"
                    />
                  </div>
                </div>

                {/* New Password Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-[var(--color-text-secondary)]"
                  >
                    New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-plasma-cyan)] transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      minLength={8}
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-elevated)] border border-white/10 rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-300 focus:outline-none focus:border-[var(--color-plasma-cyan)] focus:shadow-[0_0_0_3px_rgba(6,182,212,0.15),0_0_20px_rgba(6,182,212,0.1)]"
                    />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] pl-1">
                    Must be at least 8 characters
                  </p>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-[var(--color-text-secondary)]"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-plasma-cyan)] transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      minLength={8}
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-elevated)] border border-white/10 rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-300 focus:outline-none focus:border-[var(--color-plasma-cyan)] focus:shadow-[0_0_0_3px_rgba(6,182,212,0.15),0_0_20px_rgba(6,182,212,0.1)]"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    passwordLoading ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  className="group relative px-6 py-3 bg-gradient-to-r from-[var(--color-plasma-cyan)] to-[var(--color-plasma-cyan)] rounded-xl font-semibold text-white transition-all duration-300 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className="relative flex items-center gap-2">
                    {passwordLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Account Info Section */}
      <section className="animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="holo-card p-6 md:p-8">
          {/* Section Header */}
          <div className="flex items-start gap-4 mb-6 pb-4 border-b border-white/10">
            <div className="p-3 rounded-xl bg-[var(--color-plasma-fuchsia)]/20 shadow-[0_0_30px_rgba(217,70,239,0.3)]">
              <Shield className="w-6 h-6 text-[var(--color-plasma-fuchsia)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                Account Information
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Your account details
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                Account ID
              </span>
              <p className="mt-1 text-sm font-mono text-[var(--color-text-secondary)]">
                {profile?.id?.slice(0, 8)}...
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                Email Status
              </span>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-plasma-emerald)]/10 text-xs font-medium text-[var(--color-plasma-emerald)]">
                  <Sparkles className="w-3 h-3" />
                  Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Decorative footer */}
      <div className="mt-12 flex justify-center gap-4 animate-fade-up" style={{ animationDelay: "400ms" }}>
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-violet)]/30" />
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-cyan)]/30" />
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-fuchsia)]/30" />
      </div>
    </div>
  );
}
