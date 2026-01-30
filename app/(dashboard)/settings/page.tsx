/**
 * Settings Page
 *
 * Main settings page with stunning holographic design and navigation links.
 */

"use client";

import Link from "next/link";
import { User, CreditCard, BarChart3, ArrowRight, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const settingsLinks = [
    {
      href: "/settings/profile",
      title: "Profile",
      description: "Update your name, email, and password",
      icon: User,
      color: "violet",
    },
    {
      href: "/settings/subscription",
      title: "Subscription",
      description: "Manage your subscription plan and billing",
      icon: CreditCard,
      color: "cyan",
    },
    {
      href: "/settings/usage",
      title: "Usage",
      description: "View your usage statistics and limits",
      icon: BarChart3,
      color: "fuchsia",
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
    violet: {
      bg: "from-[var(--color-plasma-violet)]/20 to-[var(--color-plasma-purple)]/10",
      text: "text-[var(--color-plasma-violet)]",
      glow: "shadow-[0_0_30px_rgba(139,92,246,0.3)]",
    },
    cyan: {
      bg: "from-[var(--color-plasma-cyan)]/20 to-[var(--color-plasma-cyan)]/5",
      text: "text-[var(--color-plasma-cyan)]",
      glow: "shadow-[0_0_30px_rgba(6,182,212,0.3)]",
    },
    fuchsia: {
      bg: "from-[var(--color-plasma-fuchsia)]/20 to-[var(--color-plasma-fuchsia)]/5",
      text: "text-[var(--color-plasma-fuchsia)]",
      glow: "shadow-[0_0_30px_rgba(217,70,239,0.3)]",
    },
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-10 animate-fade-up">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient-static">Settings</span>
          </h1>
          <Sparkles className="w-6 h-6 text-[var(--color-plasma-amber)] animate-pulse" />
        </div>
        <p className="text-[var(--color-text-secondary)] text-lg">
          Manage your account and preferences
        </p>
      </header>

      {/* Settings Cards */}
      <div className="space-y-4">
        {settingsLinks.map((link, index) => {
          const Icon = link.icon;
          const colors = colorMap[link.color];
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group block animate-fade-up"
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              <div className="holo-card p-6 flex items-center gap-5">
                {/* Icon */}
                <div
                  className={`relative p-4 rounded-xl bg-gradient-to-br ${colors.bg} ${colors.glow} transition-all duration-300 group-hover:scale-110`}
                >
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-plasma-purple)] transition-colors mb-1">
                    {link.title}
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {link.description}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <div className="p-2 rounded-lg bg-[var(--color-plasma-violet)]/20 text-[var(--color-plasma-violet)]">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Decorative footer */}
      <div className="mt-12 flex justify-center gap-4 animate-fade-up" style={{ animationDelay: "500ms" }}>
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-violet)]/30" />
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-cyan)]/30" />
        <div className="w-12 h-1 rounded-full bg-[var(--color-plasma-fuchsia)]/30" />
      </div>
    </div>
  );
}
