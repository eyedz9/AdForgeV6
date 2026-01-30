"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ImpersonationProvider } from "@/lib/context/impersonation-context";
import {
  Layers,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CreditCard,
  BarChart3,
  Sparkles,
  Home,
  Shield,
  Eye,
  XCircle,
} from "lucide-react";

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Impersonation state
  const [impersonating, setImpersonating] = useState(false);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(null);
  const [exitingImpersonation, setExitingImpersonation] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser as User | null);

      if (authUser) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role, disabled_at")
          .eq("id", authUser.id)
          .single<{ role: string; disabled_at: string | null }>();

        // If account is disabled, sign out immediately
        if (profile?.disabled_at != null) {
          await supabase.auth.signOut();
          router.push("/login?error=" + encodeURIComponent("Account disabled. Contact support."));
          return;
        }

        setIsAdmin(profile?.role === "admin");

        // Check impersonation status (only relevant for admins)
        if (profile?.role === "admin") {
          try {
            const res = await fetch("/api/admin/impersonation");
            if (res.ok) {
              const data = await res.json();
              setImpersonating(data.isImpersonating ?? false);
              setImpersonatedUserId(data.userId ?? null);
              setImpersonatedEmail(data.email ?? null);
            }
          } catch {
            // Ignore fetch errors — impersonation state stays false
          }
        }
      }

      setLoading(false);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((session?.user as User) || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Block form submissions and action button clicks in main content during impersonation
  useEffect(() => {
    if (!impersonating || !mainRef.current) return;

    const mainEl = mainRef.current;

    const blockSubmit = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const blockClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest("button, [type='submit'], input[type='submit']");
      // Allow links (navigation) but block buttons and form submissions
      if (clickable) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    mainEl.addEventListener("submit", blockSubmit, true);
    mainEl.addEventListener("click", blockClick, true);

    return () => {
      mainEl.removeEventListener("submit", blockSubmit, true);
      mainEl.removeEventListener("click", blockClick, true);
    };
  }, [impersonating]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleExitImpersonation = useCallback(async () => {
    setExitingImpersonation(true);
    try {
      const res = await fetch("/api/admin/impersonation", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Redirect back to admin user detail page
          const targetId = impersonatedUserId;
          setImpersonating(false);
          setImpersonatedUserId(null);
          setImpersonatedEmail(null);
          router.push(targetId ? `/admin/users/${targetId}` : "/admin/users");
          router.refresh();
        }
      }
    } finally {
      setExitingImpersonation(false);
    }
  }, [impersonatedUserId, router]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/brands", label: "Brands", icon: Layers },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const settingsSubItems = [
    { href: "/settings/profile", label: "Profile", icon: User },
    { href: "/settings/subscription", label: "Subscription", icon: CreditCard },
    { href: "/settings/usage", label: "Usage", icon: BarChart3 },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/brands") {
      return pathname === "/brands" || pathname.startsWith("/brands/");
    }
    if (href === "/settings") {
      return pathname === "/settings" || pathname.startsWith("/settings/");
    }
    return pathname === href;
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-void)]">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--color-plasma-violet)]/20 border-t-[var(--color-plasma-violet)] animate-spin" />
          <div className="absolute inset-0 rounded-full blur-xl bg-[var(--color-plasma-violet)]/20" />
        </div>
      </div>
    );
  }

  return (
    <ImpersonationProvider
      value={{
        isImpersonating: impersonating,
        impersonatedUserId,
        impersonatedEmail,
      }}
    >
    <div className={cn("min-h-screen flex flex-col bg-[var(--color-void)]", impersonating && "pt-[44px]")}>
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-[var(--color-plasma-amber)]/15 border-b border-[var(--color-plasma-amber)]/30 backdrop-blur-md">
          <div className="flex items-center justify-center gap-4 px-6 py-2.5">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[var(--color-plasma-amber)]" />
              <p className="text-sm font-medium text-[var(--color-plasma-amber)]">
                Viewing as{" "}
                <span className="font-semibold">{impersonatedEmail}</span>
                <span className="ml-2 text-[var(--color-plasma-amber)]/70">
                  (read-only)
                </span>
              </p>
            </div>
            <button
              onClick={handleExitImpersonation}
              disabled={exitingImpersonation}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium bg-[var(--color-plasma-amber)]/20 hover:bg-[var(--color-plasma-amber)]/30 text-[var(--color-plasma-amber)] border border-[var(--color-plasma-amber)]/30 transition-colors disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              {exitingImpersonation ? "Exiting..." : "Exit Impersonation"}
            </button>
          </div>
        </div>
      )}

      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[50vw] h-[50vw] orb orb-violet opacity-20 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[40vw] h-[40vw] orb orb-cyan opacity-10 pointer-events-none" />

      {/* Header — full width, sticky */}
      <header className={cn(
        "sticky top-0 z-50 glass-strong border-b border-white/5 h-16",
        impersonating && "top-[44px]"
      )}>
        <div className="flex items-center gap-4 px-6 h-full">
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link href="/brands" className="flex items-center group">
            <Image
              src="/logos/AdForge_logo_wht.png"
              alt="AdForge"
              width={130}
              height={35}
              className="object-contain transition-all duration-300 group-hover:brightness-125"
              priority
            />
          </Link>

          <div className="flex-1" />

          {/* User dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={getUserDisplayName()}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-plasma-violet)] to-[var(--color-plasma-fuchsia)] flex items-center justify-center text-xs font-bold">
                  {getUserInitials()}
                </div>
              )}
              <span className="hidden sm:block text-sm font-medium text-[var(--color-text-primary)]">
                {getUserDisplayName()}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200",
                  userMenuOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 glass-strong rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-scale-up">
                  <div className="p-4 border-b border-white/5">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {user?.email}
                    </p>
                  </div>

                  <div className="p-2">
                    <Link
                      href="/settings/profile"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings/subscription"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <CreditCard className="h-4 w-4" />
                      Subscription
                    </Link>
                  </div>

                  <div className="p-2 border-t border-white/5">
                    <button
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[var(--color-plasma-rose)] hover:bg-[var(--color-plasma-rose)]/10 transition-colors"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar + Content row */}
      <div className="flex-1 flex relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 bottom-0 w-72 glass-strong flex flex-col z-[45] transition-transform duration-500 ease-out",
          impersonating ? "top-[108px]" : "top-16",
          "md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar glow effect */}
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-[var(--color-plasma-violet)]/30 to-transparent" />

        {/* Mobile close button */}
        <div className="flex items-center justify-end p-4 md:hidden">
          <button
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                  active
                    ? "bg-gradient-to-r from-[var(--color-plasma-violet)]/20 to-transparent text-[var(--color-text-primary)] shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300",
                    active
                      ? "bg-[var(--color-plasma-violet)]/20 text-[var(--color-plasma-violet)] shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                      : "bg-white/5 text-[var(--color-text-muted)] group-hover:bg-white/10 group-hover:text-[var(--color-text-secondary)]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span>{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-plasma-violet)] shadow-[0_0_10px_var(--color-plasma-violet)]" />
                )}
              </Link>
            );
          })}

          {/* Settings sub-items when on settings page */}
          {pathname.startsWith("/settings") && (
            <div className="pl-4 mt-3 space-y-1 animate-fade-up">
              {settingsSubItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200",
                      active
                        ? "bg-[var(--color-plasma-violet)]/10 text-[var(--color-plasma-purple)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Admin Dashboard link - only visible to admin users */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <Link
                href="/admin"
                className="group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 text-[var(--color-plasma-amber)] hover:bg-[var(--color-plasma-amber)]/10"
              >
                <div className="p-2 rounded-lg transition-all duration-300 bg-[var(--color-plasma-amber)]/15 text-[var(--color-plasma-amber)] shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Shield className="h-4 w-4" />
                </div>
                <span>Admin Dashboard</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User section at bottom */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors cursor-pointer group">
            <div className="relative">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={getUserDisplayName()}
                  className="w-10 h-10 rounded-xl object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-plasma-violet)] to-[var(--color-plasma-fuchsia)] flex items-center justify-center text-sm font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  {getUserInitials()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--color-plasma-emerald)] border-2 border-[var(--color-surface)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">
                {getUserDisplayName()}
              </p>
              <p className="text-xs truncate text-[var(--color-text-muted)]">
                {user?.email}
              </p>
            </div>
            <Sparkles className="h-4 w-4 text-[var(--color-plasma-amber)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-72 p-6 relative" ref={mainRef}>
        {children}
      </main>
      </div>
    </div>
    </ImpersonationProvider>
  );
}
