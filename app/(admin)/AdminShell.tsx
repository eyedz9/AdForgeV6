"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
} from "lucide-react";

interface AdminUser {
  email: string;
  fullName: string;
  avatarUrl: string;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/content", label: "Content", icon: FileText },
  {
    href: "/admin/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
  },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/system", label: "System", icon: Settings },
  { href: "/admin/audit-log", label: "Audit Log", icon: ClipboardList },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminShell({
  children,
  adminUser,
}: {
  children: React.ReactNode;
  adminUser: AdminUser | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close menus on navigation
  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const displayName =
    adminUser?.fullName || adminUser?.email?.split("@")[0] || "Admin";

  const initials = (() => {
    const parts = displayName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  })();

  return (
    <div className="min-h-screen flex bg-[var(--color-void)]">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[50vw] h-[50vw] orb orb-violet opacity-10 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[40vw] h-[40vw] orb orb-cyan opacity-5 pointer-events-none" />

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
          "fixed top-0 left-0 bottom-0 w-72 glass-strong flex flex-col z-50 transition-transform duration-500 ease-out",
          "md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar glow effect — amber instead of violet */}
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-[var(--color-plasma-amber)]/30 to-transparent" />

        {/* Logo + Admin badge */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-3 group">
            <Image
              src="/logos/AdForge_logo_wht.png"
              alt="AdForge"
              width={110}
              height={30}
              className="object-contain transition-all duration-300 group-hover:brightness-125"
              priority
            />
            <span className="px-2 py-0.5 rounded-md bg-[var(--color-plasma-amber)]/20 text-[var(--color-plasma-amber)] text-xs font-semibold uppercase tracking-wider border border-[var(--color-plasma-amber)]/30">
              Admin
            </span>
          </Link>
          <button
            className="md:hidden p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Admin user info in sidebar header */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              {adminUser?.avatarUrl ? (
                <img
                  src={adminUser.avatarUrl}
                  alt={displayName}
                  className="w-9 h-9 rounded-lg object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--color-plasma-amber)] to-[#d97706] flex items-center justify-center text-xs font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--color-plasma-emerald)] border-2 border-[var(--color-surface)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">
                {displayName}
              </p>
              <p className="text-xs truncate text-[var(--color-text-muted)]">
                {adminUser?.email}
              </p>
            </div>
            <Shield className="h-4 w-4 text-[var(--color-plasma-amber)] shrink-0" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                  active
                    ? "bg-gradient-to-r from-[var(--color-plasma-amber)]/20 to-transparent text-[var(--color-text-primary)] shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300",
                    active
                      ? "bg-[var(--color-plasma-amber)]/20 text-[var(--color-plasma-amber)] shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      : "bg-white/5 text-[var(--color-text-muted)] group-hover:bg-white/10 group-hover:text-[var(--color-text-secondary)]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span>{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-plasma-amber)] shadow-[0_0_10px_var(--color-plasma-amber)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Back to User Dashboard link at bottom */}
        <div className="p-4 border-t border-white/5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-white/5">
              <LogOut className="h-4 w-4" />
            </div>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col md:ml-72">
        {/* Header */}
        <header className="sticky top-0 z-30 glass-strong border-b border-white/5">
          <div className="flex items-center gap-4 px-6 py-4">
            <button
              className="md:hidden p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Admin indicator */}
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--color-plasma-amber)]" />
              <span className="text-sm font-medium text-[var(--color-plasma-amber)]">
                Admin Panel
              </span>
            </div>

            <div className="flex-1" />

            {/* User dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                {adminUser?.avatarUrl ? (
                  <img
                    src={adminUser.avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-plasma-amber)] to-[#d97706] flex items-center justify-center text-xs font-bold text-black">
                    {initials}
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium text-[var(--color-text-primary)]">
                  {displayName}
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
                        {displayName}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {adminUser?.email}
                      </p>
                    </div>

                    <div className="p-2">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        User Dashboard
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

        {/* Main content */}
        <main className="flex-1 p-6 relative">{children}</main>
      </div>
    </div>
  );
}
