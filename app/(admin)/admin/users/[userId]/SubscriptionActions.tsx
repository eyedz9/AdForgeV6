"use client";

/**
 * Subscription Management Actions
 *
 * Client component with action buttons and confirmation dialogs for:
 * - Override Tier (select any tier)
 * - Override Limits (custom values for brands, personas, images, videos)
 * - Reset Usage (reset current period counters to 0)
 * - Extend Trial (add days to current_period_end)
 *
 * All overrides require confirmation dialog with a reason field.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  SlidersHorizontal,
  RotateCcw,
  CalendarPlus,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  overrideSubscriptionTier,
  overrideSubscriptionLimits,
  resetUsage,
  extendTrial,
} from "./actions";
import type { OverrideLimitsPayload } from "./actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubscriptionActionsProps {
  userId: string;
  subscription: {
    id: string;
    tier: string;
    status: string;
    currentPeriodEnd: string | null;
    brandsLimit: number;
    personasLimit: number;
    imagesLimit: number;
    videosLimit: number;
  } | null;
  hasUsage: boolean;
}

const TIERS = ["free", "starter", "professional", "agency", "enterprise"] as const;

// ---------------------------------------------------------------------------
// Confirmation Dialog (reused pattern from UserActions)
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmDisabled,
  onConfirm,
  onCancel,
  isPending,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  children?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[var(--color-bg-primary)] shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--color-plasma-amber)]/15">
              <AlertTriangle className="h-5 w-5 text-[var(--color-plasma-amber)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {title}
              </h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {description}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-5 w-5 text-[var(--color-text-muted)]" />
            </button>
          </div>

          {children && <div className="mt-4">{children}</div>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending || confirmDisabled}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 bg-[var(--color-plasma-amber)] hover:bg-[var(--color-plasma-amber)]/80 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          >
            {isPending ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubscriptionActions({
  userId,
  subscription,
  hasUsage,
}: SubscriptionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [dialog, setDialog] = useState<
    "overrideTier" | "overrideLimits" | "resetUsage" | "extendTrial" | null
  >(null);

  // Error / success feedback
  const [error, setError] = useState<string | null>(null);

  // Override Tier state
  const [selectedTier, setSelectedTier] = useState(subscription?.tier ?? "free");
  const [tierReason, setTierReason] = useState("");

  // Override Limits state
  const [limitsForm, setLimitsForm] = useState({
    brandsLimit: subscription?.brandsLimit ?? 1,
    personasLimit: subscription?.personasLimit ?? 5,
    imagesLimit: subscription?.imagesLimit ?? 20,
    videosLimit: subscription?.videosLimit ?? 5,
  });
  const [limitsReason, setLimitsReason] = useState("");

  // Reset Usage state
  const [resetReason, setResetReason] = useState("");

  // Extend Trial state
  const [trialDays, setTrialDays] = useState(7);
  const [trialReason, setTrialReason] = useState("");

  const closeDialog = () => {
    setDialog(null);
    setError(null);
  };

  const openDialog = (
    type: "overrideTier" | "overrideLimits" | "resetUsage" | "extendTrial"
  ) => {
    setError(null);
    // Reset form values to current state when opening
    if (type === "overrideTier") {
      setSelectedTier(subscription?.tier ?? "free");
      setTierReason("");
    } else if (type === "overrideLimits") {
      setLimitsForm({
        brandsLimit: subscription?.brandsLimit ?? 1,
        personasLimit: subscription?.personasLimit ?? 5,
        imagesLimit: subscription?.imagesLimit ?? 20,
        videosLimit: subscription?.videosLimit ?? 5,
      });
      setLimitsReason("");
    } else if (type === "resetUsage") {
      setResetReason("");
    } else if (type === "extendTrial") {
      setTrialDays(7);
      setTrialReason("");
    }
    setDialog(type);
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleOverrideTier = () => {
    if (!tierReason.trim()) {
      setError("Please provide a reason for this override.");
      return;
    }
    startTransition(async () => {
      const result = await overrideSubscriptionTier(
        userId,
        selectedTier,
        tierReason.trim()
      );
      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  const handleOverrideLimits = () => {
    if (!limitsReason.trim()) {
      setError("Please provide a reason for this override.");
      return;
    }
    const payload: OverrideLimitsPayload = {
      brandsLimit: limitsForm.brandsLimit,
      personasLimit: limitsForm.personasLimit,
      imagesLimit: limitsForm.imagesLimit,
      videosLimit: limitsForm.videosLimit,
      reason: limitsReason.trim(),
    };
    startTransition(async () => {
      const result = await overrideSubscriptionLimits(userId, payload);
      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  const handleResetUsage = () => {
    if (!resetReason.trim()) {
      setError("Please provide a reason for this reset.");
      return;
    }
    startTransition(async () => {
      const result = await resetUsage(userId, resetReason.trim());
      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  const handleExtendTrial = () => {
    if (!trialReason.trim()) {
      setError("Please provide a reason for this extension.");
      return;
    }
    if (trialDays <= 0 || trialDays > 365) {
      setError("Days must be between 1 and 365.");
      return;
    }
    startTransition(async () => {
      const result = await extendTrial(userId, trialDays, trialReason.trim());
      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const inputClasses =
    "w-full px-3 py-2 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-plasma-amber)]/40 focus:border-[var(--color-plasma-amber)]/40";

  const selectClasses =
    "w-full px-3 py-2 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-plasma-amber)]/40 focus:border-[var(--color-plasma-amber)]/40";

  return (
    <>
      {/* Subscription Management Section */}
      <div
        className="holo-card p-6 animate-fade-up"
        style={{ animationDelay: "500ms" }}
      >
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
            Subscription Management
          </h2>
        </div>

        <div className="space-y-3">
          {/* Override Tier */}
          <button
            onClick={() => openDialog("overrideTier")}
            disabled={isPending}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50 group"
          >
            <CreditCard className="h-4 w-4 text-[var(--color-plasma-cyan)] transition-transform group-hover:scale-110" />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--color-text-primary)]">
                {subscription ? "Override Tier" : "Assign Tier"}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {subscription
                  ? "Change subscription tier and apply new default limits"
                  : "Create a subscription and assign a tier to this user"}
              </p>
            </div>
          </button>

          {/* Override Limits */}
          <button
            onClick={() => openDialog("overrideLimits")}
            disabled={isPending || !subscription}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50 group"
          >
            <SlidersHorizontal className="h-4 w-4 text-[var(--color-plasma-violet)] transition-transform group-hover:scale-110" />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--color-text-primary)]">Override Limits</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Set custom values for brands, personas, images, and videos limits
              </p>
            </div>
          </button>

          {/* Reset Usage */}
          <button
            onClick={() => openDialog("resetUsage")}
            disabled={isPending || !hasUsage}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50 group"
          >
            <RotateCcw className="h-4 w-4 text-[var(--color-plasma-emerald)] transition-transform group-hover:scale-110" />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--color-text-primary)]">Reset Usage</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Reset all current period usage counters to zero
              </p>
            </div>
          </button>

          {/* Extend Trial */}
          <button
            onClick={() => openDialog("extendTrial")}
            disabled={isPending || !subscription}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50 group"
          >
            <CalendarPlus className="h-4 w-4 text-[var(--color-plasma-amber)] transition-transform group-hover:scale-110" />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--color-text-primary)]">Extend Trial</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Add days to the current billing period end date
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Dialogs                                                             */}
      {/* ------------------------------------------------------------------ */}

      {/* Override Tier Dialog */}
      <ConfirmDialog
        open={dialog === "overrideTier"}
        title="Override Subscription Tier"
        description="Select a new tier for this user. This will also update their limits to the tier defaults."
        confirmLabel="Override Tier"
        confirmDisabled={
          !tierReason.trim() || (!!subscription && selectedTier === subscription.tier)
        }
        onConfirm={handleOverrideTier}
        onCancel={closeDialog}
        isPending={isPending}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              New Tier
            </label>
            <select
              value={selectedTier}
              onChange={(e) => {
                setSelectedTier(e.target.value);
                setError(null);
              }}
              className={selectClasses}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === subscription?.tier ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Reason
            </label>
            <input
              type="text"
              value={tierReason}
              onChange={(e) => {
                setTierReason(e.target.value);
                setError(null);
              }}
              placeholder="Why is this tier being overridden?"
              className={inputClasses}
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--color-plasma-rose)]">{error}</p>
          )}
        </div>
      </ConfirmDialog>

      {/* Override Limits Dialog */}
      <ConfirmDialog
        open={dialog === "overrideLimits"}
        title="Override Subscription Limits"
        description="Set custom limits for this user. Use -1 for unlimited."
        confirmLabel="Save Limits"
        confirmDisabled={!limitsReason.trim()}
        onConfirm={handleOverrideLimits}
        onCancel={closeDialog}
        isPending={isPending}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                Brands Limit
              </label>
              <input
                type="number"
                value={limitsForm.brandsLimit}
                onChange={(e) =>
                  setLimitsForm((f) => ({
                    ...f,
                    brandsLimit: parseInt(e.target.value) || 0,
                  }))
                }
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                Personas Limit
              </label>
              <input
                type="number"
                value={limitsForm.personasLimit}
                onChange={(e) =>
                  setLimitsForm((f) => ({
                    ...f,
                    personasLimit: parseInt(e.target.value) || 0,
                  }))
                }
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                Images Limit
              </label>
              <input
                type="number"
                value={limitsForm.imagesLimit}
                onChange={(e) =>
                  setLimitsForm((f) => ({
                    ...f,
                    imagesLimit: parseInt(e.target.value) || 0,
                  }))
                }
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                Videos Limit
              </label>
              <input
                type="number"
                value={limitsForm.videosLimit}
                onChange={(e) =>
                  setLimitsForm((f) => ({
                    ...f,
                    videosLimit: parseInt(e.target.value) || 0,
                  }))
                }
                className={inputClasses}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Reason
            </label>
            <input
              type="text"
              value={limitsReason}
              onChange={(e) => {
                setLimitsReason(e.target.value);
                setError(null);
              }}
              placeholder="Why are these limits being overridden?"
              className={inputClasses}
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--color-plasma-rose)]">{error}</p>
          )}
        </div>
      </ConfirmDialog>

      {/* Reset Usage Dialog */}
      <ConfirmDialog
        open={dialog === "resetUsage"}
        title="Reset Usage Counters"
        description="This will reset all current period usage counters (personas, images, videos, intelligence reports) to zero."
        confirmLabel="Reset Usage"
        confirmDisabled={!resetReason.trim()}
        onConfirm={handleResetUsage}
        onCancel={closeDialog}
        isPending={isPending}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Reason
            </label>
            <input
              type="text"
              value={resetReason}
              onChange={(e) => {
                setResetReason(e.target.value);
                setError(null);
              }}
              placeholder="Why is usage being reset?"
              className={inputClasses}
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--color-plasma-rose)]">{error}</p>
          )}
        </div>
      </ConfirmDialog>

      {/* Extend Trial Dialog */}
      <ConfirmDialog
        open={dialog === "extendTrial"}
        title="Extend Trial / Billing Period"
        description={`Current period ends: ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}`}
        confirmLabel="Extend Period"
        confirmDisabled={!trialReason.trim() || trialDays <= 0}
        onConfirm={handleExtendTrial}
        onCancel={closeDialog}
        isPending={isPending}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Days to Add
            </label>
            <input
              type="number"
              value={trialDays}
              min={1}
              max={365}
              onChange={(e) => {
                setTrialDays(parseInt(e.target.value) || 0);
                setError(null);
              }}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Reason
            </label>
            <input
              type="text"
              value={trialReason}
              onChange={(e) => {
                setTrialReason(e.target.value);
                setError(null);
              }}
              placeholder="Why is the trial being extended?"
              className={inputClasses}
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--color-plasma-rose)]">{error}</p>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
}
