"use client";

/**
 * System Settings Form
 *
 * Client component for editing platform-wide settings:
 * - Default Trial Days (number input)
 * - Maintenance Mode (toggle switch)
 * - Registration Enabled (toggle switch)
 * - Tier limits for each tier (editable number inputs)
 * - Confirmation dialog before saving
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Clock,
  Shield,
  UserPlus,
  Package,
  X,
  AlertTriangle,
  Check,
} from "lucide-react";
import { saveSystemSettings } from "./actions";
import type { SystemSettingsData } from "./page";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SystemSettingsFormProps {
  initialSettings: SystemSettingsData;
}

type TierLimits = SystemSettingsData["tier_limits"];

// ---------------------------------------------------------------------------
// Tier display config
// ---------------------------------------------------------------------------

const TIER_CONFIG: {
  key: string;
  name: string;
  color: string;
  bgColor: string;
}[] = [
  { key: "free", name: "Free", color: "var(--color-text-secondary)", bgColor: "rgba(255,255,255,0.06)" },
  { key: "starter", name: "Starter", color: "var(--color-plasma-cyan)", bgColor: "rgba(34,211,238,0.08)" },
  { key: "professional", name: "Professional", color: "var(--color-plasma-violet)", bgColor: "rgba(139,92,246,0.08)" },
  { key: "agency", name: "Agency", color: "var(--color-plasma-amber)", bgColor: "rgba(245,158,11,0.08)" },
];

const LIMIT_FIELDS = [
  { key: "brands_limit" as const, label: "Brands" },
  { key: "personas_limit" as const, label: "Personas" },
  { key: "images_limit" as const, label: "Images" },
  { key: "videos_limit" as const, label: "Videos" },
];

// ---------------------------------------------------------------------------
// Toggle Switch Component
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
  accentColor,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex-shrink-0 p-2 rounded-lg"
          style={{ background: `${accentColor}22` }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {label}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)] ${
          checked
            ? "bg-[var(--color-plasma-emerald)]"
            : "bg-white/[0.12]"
        }`}
        style={checked ? { boxShadow: "0 0 10px rgba(16,185,129,0.3)" } : undefined}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm Dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  isPending,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
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
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm font-medium text-black bg-[var(--color-plasma-amber)] hover:bg-[var(--color-plasma-amber)]/80 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Form Component
// ---------------------------------------------------------------------------

export function SystemSettingsForm({ initialSettings }: SystemSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [trialDays, setTrialDays] = useState(initialSettings.default_trial_days);
  const [maintenanceMode, setMaintenanceMode] = useState(
    initialSettings.maintenance_mode
  );
  const [registrationEnabled, setRegistrationEnabled] = useState(
    initialSettings.registration_enabled
  );
  const [tierLimits, setTierLimits] = useState<TierLimits>(
    initialSettings.tier_limits
  );

  // UI state
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // -------------------------------------------------------------------------
  // Dirty check
  // -------------------------------------------------------------------------

  const isDirty =
    trialDays !== initialSettings.default_trial_days ||
    maintenanceMode !== initialSettings.maintenance_mode ||
    registrationEnabled !== initialSettings.registration_enabled ||
    JSON.stringify(tierLimits) !== JSON.stringify(initialSettings.tier_limits);

  // -------------------------------------------------------------------------
  // Tier limit helpers
  // -------------------------------------------------------------------------

  const updateTierLimit = (
    tier: string,
    field: keyof TierLimits[string],
    value: number
  ) => {
    setTierLimits((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value,
      },
    }));
  };

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------

  const handleSave = () => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await saveSystemSettings({
        default_trial_days: trialDays,
        maintenance_mode: maintenanceMode,
        registration_enabled: registrationEnabled,
        tier_limits: tierLimits,
      });

      if (result.success) {
        setShowConfirm(false);
        setSuccess(true);
        router.refresh();
        // Auto-hide success message
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* Success notification */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-plasma-emerald)]/10 border border-[var(--color-plasma-emerald)]/20 animate-fade-up">
          <Check className="h-4 w-4 text-[var(--color-plasma-emerald)]" />
          <p className="text-sm font-medium text-[var(--color-plasma-emerald)]">
            Settings saved successfully
          </p>
        </div>
      )}

      {/* General Settings */}
      <div className="holo-card p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center gap-2 mb-2">
          <div
            className="p-2 rounded-lg"
            style={{
              background: "rgba(245,158,11,0.15)",
              boxShadow: "0 0 15px rgba(245,158,11,0.15)",
            }}
          >
            <Shield
              className="h-4 w-4"
              style={{ color: "var(--color-plasma-amber)" }}
            />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            General Settings
          </h2>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {/* Default Trial Days */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex-shrink-0 p-2 rounded-lg"
                style={{ background: "rgba(34,211,238,0.12)" }}
              >
                <Clock
                  className="h-4 w-4"
                  style={{ color: "var(--color-plasma-cyan)" }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Default Trial Days
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Number of trial days for new subscriptions
                </p>
              </div>
            </div>
            <input
              type="number"
              min={0}
              max={365}
              value={trialDays}
              onChange={(e) =>
                setTrialDays(Math.max(0, Math.min(365, parseInt(e.target.value) || 0)))
              }
              className="w-20 px-3 py-2 rounded-xl text-sm text-center bg-white/[0.04] border border-white/[0.08] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-plasma-amber)]/40 focus:border-[var(--color-plasma-amber)]/40"
            />
          </div>

          {/* Maintenance Mode */}
          <ToggleSwitch
            checked={maintenanceMode}
            onChange={setMaintenanceMode}
            label="Maintenance Mode"
            description="When enabled, the platform shows a maintenance page to all non-admin users"
            icon={Shield}
            accentColor="var(--color-plasma-rose)"
          />

          {/* Registration Enabled */}
          <ToggleSwitch
            checked={registrationEnabled}
            onChange={setRegistrationEnabled}
            label="Registration Enabled"
            description="Allow new users to sign up for the platform"
            icon={UserPlus}
            accentColor="var(--color-plasma-emerald)"
          />
        </div>
      </div>

      {/* Tier Limits */}
      <div className="holo-card p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <div
            className="p-2 rounded-lg"
            style={{
              background: "rgba(139,92,246,0.15)",
              boxShadow: "0 0 15px rgba(139,92,246,0.15)",
            }}
          >
            <Package
              className="h-4 w-4"
              style={{ color: "var(--color-plasma-violet)" }}
            />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Tier Limits
          </h2>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Set the default usage limits for each subscription tier. Use{" "}
          <span className="font-mono text-[var(--color-text-secondary)]">-1</span>{" "}
          for unlimited.
        </p>

        <div className="space-y-4">
          {TIER_CONFIG.map((tier) => {
            const limits = tierLimits[tier.key];
            if (!limits) return null;

            return (
              <div
                key={tier.key}
                className="rounded-xl border border-white/[0.06] overflow-hidden"
                style={{ background: tier.bgColor }}
              >
                {/* Tier header */}
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: tier.color }}
                  >
                    {tier.name}
                  </h3>
                </div>

                {/* Limit fields */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
                  {LIMIT_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                        {field.label}
                      </label>
                      <input
                        type="number"
                        min={-1}
                        value={limits[field.key]}
                        onChange={(e) =>
                          updateTierLimit(
                            tier.key,
                            field.key,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-plasma-amber)]/40 focus:border-[var(--color-plasma-amber)]/40"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save bar */}
      <div className="holo-card p-4 animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--color-text-muted)]">
            {isDirty ? (
              <span className="text-[var(--color-plasma-amber)]">
                You have unsaved changes
              </span>
            ) : (
              "All settings saved"
            )}
          </div>
          <button
            onClick={() => {
              setError(null);
              setShowConfirm(true);
            }}
            disabled={!isDirty || isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-black bg-[var(--color-plasma-amber)] hover:bg-[var(--color-plasma-amber)]/80 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirm}
        title="Save System Settings"
        description="Are you sure you want to save these changes? They will take effect immediately across the platform."
        onConfirm={handleSave}
        onCancel={() => setShowConfirm(false)}
        isPending={isPending}
      >
        {error && (
          <p className="text-sm text-[var(--color-plasma-rose)]">{error}</p>
        )}
      </ConfirmDialog>
    </>
  );
}
