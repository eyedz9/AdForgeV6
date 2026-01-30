/**
 * Admin User Detail Page
 *
 * Displays a user's full profile, subscription, usage, and brands.
 * All data fetched server-side via admin client (service role).
 */

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserDetail } from "@/lib/services/admin-users";
import UserActions from "./UserActions";
import SubscriptionActions from "./SubscriptionActions";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  CreditCard,
  BarChart3,
  Briefcase,
  AlertCircle,
  CheckCircle,
  XCircle,
  Ban,
  ChevronRight,
} from "lucide-react";

interface PageProps {
  params: Promise<{ userId: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: "active" | "disabled" }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-plasma-emerald)]/15 text-[var(--color-plasma-emerald)]">
        <CheckCircle className="h-3 w-3" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]">
      <Ban className="h-3 w-3" />
      Disabled
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-plasma-amber)]/15 text-[var(--color-plasma-amber)]">
        <Shield className="h-3 w-3" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-[var(--color-text-secondary)]">
      User
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colorMap: Record<string, string> = {
    free: "bg-white/10 text-[var(--color-text-secondary)]",
    starter: "bg-[var(--color-plasma-cyan)]/15 text-[var(--color-plasma-cyan)]",
    professional:
      "bg-[var(--color-plasma-violet)]/15 text-[var(--color-plasma-violet)]",
    agency:
      "bg-[var(--color-plasma-fuchsia)]/15 text-[var(--color-plasma-fuchsia)]",
    enterprise:
      "bg-[var(--color-plasma-amber)]/15 text-[var(--color-plasma-amber)]",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colorMap[tier] ?? colorMap.free}`}
    >
      {tier}
    </span>
  );
}

function SubscriptionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:
      "bg-[var(--color-plasma-emerald)]/15 text-[var(--color-plasma-emerald)]",
    trialing:
      "bg-[var(--color-plasma-cyan)]/15 text-[var(--color-plasma-cyan)]",
    past_due:
      "bg-[var(--color-plasma-amber)]/15 text-[var(--color-plasma-amber)]",
    canceled:
      "bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]",
    unpaid: "bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]",
    incomplete: "bg-white/10 text-[var(--color-text-muted)]",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${styles[status] ?? styles.incomplete}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function ModerationBadge({ status }: { status: string }) {
  const styles: Record<string, { className: string; icon: React.ReactNode }> = {
    active: {
      className:
        "bg-[var(--color-plasma-emerald)]/15 text-[var(--color-plasma-emerald)]",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    flagged: {
      className:
        "bg-[var(--color-plasma-amber)]/15 text-[var(--color-plasma-amber)]",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    disabled: {
      className:
        "bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]",
      icon: <XCircle className="h-3 w-3" />,
    },
    deleted: {
      className:
        "bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]",
      icon: <Ban className="h-3 w-3" />,
    },
  };
  const s = styles[status] ?? styles.active;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${s.className}`}
    >
      {s.icon}
      {status}
    </span>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : limit > 0 ? (used / limit) * 100 : 0;
  const clampedPct = Math.min(percentage, 100);

  let barColor = "var(--color-plasma-emerald)";
  if (percentage >= 100) barColor = "var(--color-plasma-rose)";
  else if (percentage >= 80) barColor = "var(--color-plasma-amber)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-secondary)]">{label}</span>
        <span className="font-medium text-[var(--color-text-primary)]">
          {used.toLocaleString()}
          {isUnlimited ? " / ∞" : ` / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: isUnlimited ? "0%" : `${clampedPct}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 8px ${barColor}40`,
          }}
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-shrink-0 mt-0.5 text-[var(--color-text-muted)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-[var(--color-text-primary)]">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = use(params);

  const userPromise = getUserDetail(userId);
  const user = use(userPromise);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/admin"
          className="hover:text-[var(--color-text-primary)] transition-colors"
        >
          Admin
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href="/admin/users"
          className="hover:text-[var(--color-text-primary)] transition-colors"
        >
          Users
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[var(--color-text-primary)] font-medium truncate max-w-[200px]">
          {user.email}
        </span>
      </nav>

      {/* Back link + header */}
      <div className="flex items-start gap-4">
        <Link
          href="/admin/users"
          className="flex-shrink-0 mt-1 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-secondary)]" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Avatar */}
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name ?? user.email}
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-plasma-amber)] to-[var(--color-plasma-fuchsia)] flex items-center justify-center text-base font-bold shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                {(user.name ?? user.email)
                  .split(/[\s@]/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((s) => s[0].toUpperCase())
                  .join("")}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] truncate">
                {user.name ?? user.email}
              </h1>
              {user.name && (
                <p className="text-sm text-[var(--color-text-muted)] truncate">
                  {user.email}
                </p>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={user.status} />
              <RoleBadge role={user.role} />
              {user.subscription && <TierBadge tier={user.subscription.tier} />}
            </div>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile section — spans left column with actions below */}
        <div className="holo-card p-6 animate-fade-up" style={{ animationDelay: "0ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="p-2 rounded-lg"
              style={{
                background: "rgba(245,158,11,0.15)",
                boxShadow: "0 0 15px rgba(245,158,11,0.15)",
              }}
            >
              <User
                className="h-4 w-4"
                style={{ color: "var(--color-plasma-amber)" }}
              />
            </div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Profile
            </h2>
          </div>

          <div className="divide-y divide-white/[0.04]">
            <InfoRow
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={user.email}
            />
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Name"
              value={user.name ?? "Not set"}
            />
            <InfoRow
              icon={<Shield className="h-4 w-4" />}
              label="Role"
              value={<RoleBadge role={user.role} />}
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Sign-up Date"
              value={formatDate(user.signUpDate)}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label="Last Sign-in"
              value={
                user.lastSignIn
                  ? formatDateTime(user.lastSignIn)
                  : "Never"
              }
            />
            {user.status === "disabled" && user.disabledAt && (
              <InfoRow
                icon={<Ban className="h-4 w-4 text-[var(--color-plasma-rose)]" />}
                label="Disabled At"
                value={
                  <span className="text-[var(--color-plasma-rose)]">
                    {formatDateTime(user.disabledAt)}
                  </span>
                }
              />
            )}
          </div>
        </div>

        {/* Subscription section */}
        <div className="holo-card p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="p-2 rounded-lg"
              style={{
                background: "rgba(6,182,212,0.15)",
                boxShadow: "0 0 15px rgba(6,182,212,0.15)",
              }}
            >
              <CreditCard
                className="h-4 w-4"
                style={{ color: "var(--color-plasma-cyan)" }}
              />
            </div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Subscription
            </h2>
          </div>

          {user.subscription ? (
            <div className="divide-y divide-white/[0.04]">
              <InfoRow
                icon={<CreditCard className="h-4 w-4" />}
                label="Tier"
                value={
                  <div className="flex items-center gap-2">
                    <TierBadge tier={user.subscription.tier} />
                    <span className="text-[var(--color-text-muted)]">
                      ({user.subscription.tierName})
                    </span>
                  </div>
                }
              />
              <InfoRow
                icon={<CheckCircle className="h-4 w-4" />}
                label="Status"
                value={
                  <SubscriptionStatusBadge
                    status={user.subscription.status}
                  />
                }
              />
              <InfoRow
                icon={<CreditCard className="h-4 w-4" />}
                label="Stripe Customer ID"
                value={
                  <span className="font-mono text-xs text-[var(--color-text-muted)]">
                    {user.subscription.stripeCustomerId}
                  </span>
                }
              />
              {user.subscription.currentPeriodStart &&
                user.subscription.currentPeriodEnd && (
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Current Period"
                    value={`${formatDate(user.subscription.currentPeriodStart)} — ${formatDate(user.subscription.currentPeriodEnd)}`}
                  />
                )}
              {user.subscription.cancelAtPeriodEnd && (
                <InfoRow
                  icon={
                    <AlertCircle className="h-4 w-4 text-[var(--color-plasma-amber)]" />
                  }
                  label="Cancel at Period End"
                  value={
                    <span className="text-[var(--color-plasma-amber)] font-medium">
                      Yes — will cancel at end of billing period
                    </span>
                  }
                />
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No subscription found</p>
            </div>
          )}
        </div>

        {/* Usage section */}
        <div className="holo-card p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="p-2 rounded-lg"
              style={{
                background: "rgba(139,92,246,0.15)",
                boxShadow: "0 0 15px rgba(139,92,246,0.15)",
              }}
            >
              <BarChart3
                className="h-4 w-4"
                style={{ color: "var(--color-plasma-violet)" }}
              />
            </div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Current Period Usage
            </h2>
          </div>

          {user.usage ? (
            <div className="space-y-4">
              <UsageBar
                label="Personas"
                used={user.usage.personasGenerated}
                limit={user.usage.personasLimit}
              />
              <UsageBar
                label="Images"
                used={user.usage.imagesGenerated}
                limit={user.usage.imagesLimit}
              />
              <UsageBar
                label="Videos"
                used={user.usage.videosGenerated}
                limit={user.usage.videosLimit}
              />
              <UsageBar
                label="Intelligence Reports"
                used={user.usage.intelligenceReports}
                limit={-1}
              />
            </div>
          ) : (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No usage data for current period</p>
            </div>
          )}
        </div>

        {/* Brands section */}
        <div className="holo-card p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="p-2 rounded-lg"
              style={{
                background: "rgba(16,185,129,0.15)",
                boxShadow: "0 0 15px rgba(16,185,129,0.15)",
              }}
            >
              <Briefcase
                className="h-4 w-4"
                style={{ color: "var(--color-plasma-emerald)" }}
              />
            </div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Brands
            </h2>
            <span className="ml-auto text-xs font-medium text-[var(--color-text-muted)] bg-white/[0.06] px-2 py-0.5 rounded-full">
              {user.brands.length}
            </span>
          </div>

          {user.brands.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {user.brands.map((brand) => (
                <div
                  key={brand.id}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {brand.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {brand.industry ?? "No industry"} &middot;{" "}
                      {formatDate(brand.createdAt)}
                    </p>
                  </div>
                  <ModerationBadge status={brand.moderationStatus} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No brands created</p>
            </div>
          )}
        </div>
      </div>

      {/* Management Actions */}
      <UserActions
        userId={user.id}
        email={user.email}
        currentRole={user.role}
        currentStatus={user.status}
      />

      {/* Subscription Management */}
      <SubscriptionActions
        userId={user.id}
        subscription={
          user.subscription
            ? {
                id: user.subscription.id,
                tier: user.subscription.tier,
                status: user.subscription.status,
                currentPeriodEnd: user.subscription.currentPeriodEnd,
                brandsLimit: user.subscription.brandsLimit,
                personasLimit: user.subscription.personasLimit,
                imagesLimit: user.subscription.imagesLimit,
                videosLimit: user.subscription.videosLimit,
              }
            : null
        }
        hasUsage={user.usage != null}
      />
    </div>
  );
}
