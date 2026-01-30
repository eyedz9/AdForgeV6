"use client";

/**
 * User Management Actions
 *
 * Client component with action buttons and confirmation dialogs for:
 * - Change Role (toggle user/admin)
 * - Disable / Enable Account
 * - Delete Account (double confirmation requiring email input)
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Ban, CheckCircle, Trash2, X, AlertTriangle, Eye } from "lucide-react";
import {
  changeUserRole,
  disableUserAccount,
  enableUserAccount,
  deleteUserAccount,
  startImpersonation,
} from "./actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserActionsProps {
  userId: string;
  email: string;
  currentRole: string;
  currentStatus: "active" | "disabled";
}

// ---------------------------------------------------------------------------
// Confirmation Dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  isPending,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "warning" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  children?: React.ReactNode;
}) {
  if (!open) return null;

  const buttonStyles: Record<string, string> = {
    danger:
      "bg-[var(--color-plasma-rose)] hover:bg-[var(--color-plasma-rose)]/80 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]",
    warning:
      "bg-[var(--color-plasma-amber)] hover:bg-[var(--color-plasma-amber)]/80 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]",
    primary:
      "bg-[var(--color-plasma-amber)] hover:bg-[var(--color-plasma-amber)]/80 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]",
  };

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
            <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--color-plasma-rose)]/15">
              <AlertTriangle className="h-5 w-5 text-[var(--color-plasma-rose)]" />
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
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${buttonStyles[confirmVariant]}`}
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

export default function UserActions({
  userId,
  email,
  currentRole,
  currentStatus,
}: UserActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [dialog, setDialog] = useState<
    "changeRole" | "disable" | "enable" | "delete" | "impersonate" | null
  >(null);

  // For delete confirmation, require typing the email
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");

  // Error feedback
  const [error, setError] = useState<string | null>(null);

  const closeDialog = () => {
    setDialog(null);
    setDeleteConfirmEmail("");
    setError(null);
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleChangeRole = () => {
    startTransition(async () => {
      const newRole = currentRole === "admin" ? "user" : "admin";
      const result = await changeUserRole(userId, newRole as "user" | "admin");
      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  const handleDisable = () => {
    startTransition(async () => {
      const result = await disableUserAccount(userId);
      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  const handleEnable = () => {
    startTransition(async () => {
      const result = await enableUserAccount(userId);
      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  const handleDelete = () => {
    if (deleteConfirmEmail !== email) {
      setError("Email does not match. Please type the exact email to confirm.");
      return;
    }
    startTransition(async () => {
      const result = await deleteUserAccount(userId);
      if (result.success) {
        closeDialog();
        router.push("/admin/users");
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  const handleImpersonate = () => {
    startTransition(async () => {
      const result = await startImpersonation(userId);
      if (result.success) {
        closeDialog();
        router.push("/dashboard");
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const newRole = currentRole === "admin" ? "user" : "admin";

  return (
    <>
      {/* Action buttons */}
      <div className="holo-card p-6 animate-fade-up" style={{ animationDelay: "400ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <div
            className="p-2 rounded-lg"
            style={{
              background: "rgba(244,63,94,0.15)",
              boxShadow: "0 0 15px rgba(244,63,94,0.15)",
            }}
          >
            <Shield
              className="h-4 w-4"
              style={{ color: "var(--color-plasma-rose)" }}
            />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Management Actions
          </h2>
        </div>

        <div className="space-y-3">
          {/* Change Role */}
          <button
            onClick={() => setDialog("changeRole")}
            disabled={isPending}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50 group"
          >
            <Shield className="h-4 w-4 text-[var(--color-plasma-amber)] transition-transform group-hover:scale-110" />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--color-text-primary)]">Change Role</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Switch from {currentRole} to {newRole}
              </p>
            </div>
          </button>

          {/* Disable / Enable */}
          {currentStatus === "active" ? (
            <button
              onClick={() => setDialog("disable")}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50 group"
            >
              <Ban className="h-4 w-4 text-[var(--color-plasma-amber)] transition-transform group-hover:scale-110" />
              <div className="flex-1 min-w-0">
                <p className="text-[var(--color-text-primary)]">Disable Account</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Prevent this user from accessing the platform
                </p>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setDialog("enable")}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50 group"
            >
              <CheckCircle className="h-4 w-4 text-[var(--color-plasma-emerald)] transition-transform group-hover:scale-110" />
              <div className="flex-1 min-w-0">
                <p className="text-[var(--color-text-primary)]">Enable Account</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Restore this user&apos;s access to the platform
                </p>
              </div>
            </button>
          )}

          {/* Impersonate */}
          <button
            onClick={() => setDialog("impersonate")}
            disabled={isPending}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-[var(--color-plasma-cyan)]/5 hover:bg-[var(--color-plasma-cyan)]/10 border border-[var(--color-plasma-cyan)]/20 transition-all disabled:opacity-50 group"
          >
            <Eye className="h-4 w-4 text-[var(--color-plasma-cyan)] transition-transform group-hover:scale-110" />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--color-text-primary)]">Impersonate User</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                View the dashboard as this user (read-only)
              </p>
            </div>
          </button>

          {/* Delete */}
          <button
            onClick={() => setDialog("delete")}
            disabled={isPending}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-[var(--color-plasma-rose)]/5 hover:bg-[var(--color-plasma-rose)]/10 border border-[var(--color-plasma-rose)]/20 transition-all disabled:opacity-50 group"
          >
            <Trash2 className="h-4 w-4 text-[var(--color-plasma-rose)] transition-transform group-hover:scale-110" />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--color-plasma-rose)]">Delete Account</p>
              <p className="text-xs text-[var(--color-plasma-rose)]/60">
                Permanently remove this user and all their data
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Dialogs                                                             */}
      {/* ------------------------------------------------------------------ */}

      {/* Change Role Dialog */}
      <ConfirmDialog
        open={dialog === "changeRole"}
        title="Change User Role"
        description={`Are you sure you want to change this user's role from "${currentRole}" to "${newRole}"?`}
        confirmLabel={`Change to ${newRole}`}
        confirmVariant="warning"
        onConfirm={handleChangeRole}
        onCancel={closeDialog}
        isPending={isPending}
      >
        {error && (
          <p className="text-sm text-[var(--color-plasma-rose)]">{error}</p>
        )}
      </ConfirmDialog>

      {/* Disable Account Dialog */}
      <ConfirmDialog
        open={dialog === "disable"}
        title="Disable Account"
        description={`Are you sure you want to disable the account for ${email}? They will no longer be able to sign in.`}
        confirmLabel="Disable Account"
        confirmVariant="danger"
        onConfirm={handleDisable}
        onCancel={closeDialog}
        isPending={isPending}
      >
        {error && (
          <p className="text-sm text-[var(--color-plasma-rose)]">{error}</p>
        )}
      </ConfirmDialog>

      {/* Enable Account Dialog */}
      <ConfirmDialog
        open={dialog === "enable"}
        title="Enable Account"
        description={`Are you sure you want to re-enable the account for ${email}? They will be able to sign in again.`}
        confirmLabel="Enable Account"
        confirmVariant="primary"
        onConfirm={handleEnable}
        onCancel={closeDialog}
        isPending={isPending}
      >
        {error && (
          <p className="text-sm text-[var(--color-plasma-rose)]">{error}</p>
        )}
      </ConfirmDialog>

      {/* Impersonate User Dialog */}
      <ConfirmDialog
        open={dialog === "impersonate"}
        title="Impersonate User"
        description={`You will be redirected to the dashboard and see it as ${email}. All actions will be disabled (read-only). You can exit impersonation at any time via the banner.`}
        confirmLabel="Start Impersonation"
        confirmVariant="primary"
        onConfirm={handleImpersonate}
        onCancel={closeDialog}
        isPending={isPending}
      >
        {error && (
          <p className="text-sm text-[var(--color-plasma-rose)]">{error}</p>
        )}
      </ConfirmDialog>

      {/* Delete Account Dialog — requires email confirmation */}
      <ConfirmDialog
        open={dialog === "delete"}
        title="Delete Account"
        description="This action is permanent and cannot be undone. All user data, brands, personas, and creatives will be removed."
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={closeDialog}
        isPending={isPending}
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Type <span className="font-mono font-medium text-[var(--color-text-primary)]">{email}</span> to confirm:
          </p>
          <input
            type="text"
            value={deleteConfirmEmail}
            onChange={(e) => {
              setDeleteConfirmEmail(e.target.value);
              setError(null);
            }}
            placeholder="Enter user email"
            className="w-full px-3 py-2 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-plasma-amber)]/40 focus:border-[var(--color-plasma-amber)]/40"
          />
          {error && (
            <p className="text-sm text-[var(--color-plasma-rose)]">{error}</p>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
}
