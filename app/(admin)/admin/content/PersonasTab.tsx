"use client";

/**
 * PersonasTab Client Component
 *
 * Renders the personas moderation table with search, moderation status filter,
 * sortable columns, pagination, photo thumbnail, and per-row moderation action dropdowns.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { AdminPersonaRow } from "@/lib/services/admin-content";
import { updateModerationStatus, deleteContent } from "./actions";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Flag,
  Ban,
  Trash2,
  RotateCcw,
  MoreVertical,
  AlertTriangle,
  User,
} from "lucide-react";

// =============================================================================
// Sub-Components
// =============================================================================

function ModerationBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-emerald)]/15 text-[var(--color-plasma-emerald)]">
          <CheckCircle className="h-3 w-3" />
          Active
        </span>
      );
    case "flagged":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-amber)]/15 text-[var(--color-plasma-amber)]">
          <Flag className="h-3 w-3" />
          Flagged
        </span>
      );
    case "disabled":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-plasma-rose)]/15 text-[var(--color-plasma-rose)]">
          <Ban className="h-3 w-3" />
          Disabled
        </span>
      );
    case "deleted":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-[var(--color-text-muted)]">
          <Trash2 className="h-3 w-3" />
          Deleted
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-[var(--color-text-muted)]">
          {status}
        </span>
      );
  }
}

function SortIcon({
  column,
  currentSort,
  currentOrder,
}: {
  column: string;
  currentSort: string;
  currentOrder: string;
}) {
  if (currentSort !== column) {
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
  }
  return currentOrder === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// =============================================================================
// Photo Thumbnail
// =============================================================================

function PhotoThumbnail({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-9 w-9 rounded-lg object-cover border border-white/[0.08]"
      />
    );
  }
  return (
    <div className="h-9 w-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
      <User className="h-4 w-4 text-[var(--color-text-muted)]" />
    </div>
  );
}

// =============================================================================
// Moderation Action Menu
// =============================================================================

function ModerationMenu({
  persona,
  onAction,
}: {
  persona: AdminPersonaRow;
  onAction: (
    action: "flag" | "disable" | "restore" | "delete",
    personaId: string
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const status = persona.moderationStatus;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/[0.06] transition-colors"
        aria-label="Moderation actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl bg-[var(--color-bg-secondary)] border border-white/[0.08] shadow-xl py-1">
          {status !== "flagged" && status !== "deleted" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onAction("flag", persona.id);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[var(--color-plasma-amber)] hover:bg-white/[0.04] transition-colors"
            >
              <Flag className="h-3.5 w-3.5" />
              Flag
            </button>
          )}

          {status !== "disabled" && status !== "deleted" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onAction("disable", persona.id);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[var(--color-plasma-rose)] hover:bg-white/[0.04] transition-colors"
            >
              <Ban className="h-3.5 w-3.5" />
              Disable
            </button>
          )}

          {(status === "flagged" || status === "disabled") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onAction("restore", persona.id);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[var(--color-plasma-emerald)] hover:bg-white/[0.04] transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore
            </button>
          )}

          {status !== "deleted" && (
            <>
              <div className="my-1 border-t border-white/[0.06]" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onAction("delete", persona.id);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[var(--color-plasma-rose)] hover:bg-white/[0.04] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Confirm Dialog
// =============================================================================

function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
  isPending,
  children,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  children?: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-white/[0.08] shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-plasma-amber)]/15">
              <AlertTriangle
                className="h-5 w-5"
                style={{ color: "var(--color-plasma-amber)" }}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {title}
              </h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {description}
              </p>
            </div>
          </div>
          {children && <div className="mt-4">{children}</div>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${confirmColor}`}
          >
            {isPending ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface PersonasTabProps {
  personas: AdminPersonaRow[];
  totalCount: number;
  filteredCount: number;
  currentSearch: string;
  currentStatus: string;
  currentSortBy: string;
  currentSortOrder: string;
  currentPage: number;
  pageSize: number;
}

export function PersonasTab({
  personas,
  totalCount,
  filteredCount,
  currentSearch,
  currentStatus,
  currentSortBy,
  currentSortOrder,
  currentPage,
  pageSize,
}: PersonasTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog state
  const [dialog, setDialog] = useState<{
    action: "flag" | "disable" | "restore" | "delete";
    personaId: string;
    personaName: string;
  } | null>(null);
  const [reason, setReason] = useState("");

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      if (searchValue !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchValue.trim()) {
          params.set("search", searchValue.trim());
        } else {
          params.delete("search");
        }
        params.set("page", "1");
        // Ensure tab is preserved
        if (!params.has("tab")) {
          params.set("tab", "personas");
        }
        router.push(`/admin/content?${params.toString()}`);
      }
    }, 400);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchValue, currentSearch, searchParams, router]);

  // URL helpers
  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value && value !== "all" && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      // Ensure tab is preserved
      if (!params.has("tab")) {
        params.set("tab", "personas");
      }
      return `/admin/content?${params.toString()}`;
    },
    [searchParams]
  );

  const handleFilterChange = (key: string, value: string) => {
    router.push(buildUrl({ [key]: value, page: "1" }));
  };

  const handleSort = (column: string) => {
    const newOrder =
      currentSortBy === column && currentSortOrder === "asc" ? "desc" : "asc";
    router.push(buildUrl({ sortBy: column, sortOrder: newOrder, page: "1" }));
  };

  const handlePageChange = (newPage: number) => {
    router.push(buildUrl({ page: String(newPage) }));
  };

  // Moderation actions
  const handleModerationAction = (
    action: "flag" | "disable" | "restore" | "delete",
    personaId: string
  ) => {
    const persona = personas.find((p) => p.id === personaId);
    if (!persona) return;
    setDialog({ action, personaId, personaName: persona.name });
    setReason("");
  };

  const handleConfirm = () => {
    if (!dialog) return;

    startTransition(async () => {
      let result;

      if (dialog.action === "delete") {
        result = await deleteContent("persona", dialog.personaId);
      } else {
        const statusMap = {
          flag: "flagged" as const,
          disable: "disabled" as const,
          restore: "active" as const,
        };
        result = await updateModerationStatus(
          "persona",
          dialog.personaId,
          statusMap[dialog.action],
          reason || `${dialog.action} action taken`
        );
      }

      if (!result.success) {
        alert(result.error ?? "Action failed.");
      }

      setDialog(null);
      setReason("");
      router.refresh();
    });
  };

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  const sortableColumns = [
    { key: "ownerEmail", label: "Owner Email" },
    { key: "brandName", label: "Brand" },
    { key: "name", label: "Persona Name" },
    { key: "createdAt", label: "Created" },
    { key: "moderationStatus", label: "Status" },
  ];

  const dialogConfig = dialog
    ? {
        flag: {
          title: "Flag Persona",
          description: `Flag "${dialog.personaName}" for review? This will mark it as flagged and visible with a warning.`,
          confirmLabel: "Flag Persona",
          confirmColor: "bg-[var(--color-plasma-amber)] hover:bg-[var(--color-plasma-amber)]/80",
          showReason: true,
        },
        disable: {
          title: "Disable Persona",
          description: `Disable "${dialog.personaName}"? This will hide it from the owner and public view.`,
          confirmLabel: "Disable Persona",
          confirmColor: "bg-[var(--color-plasma-rose)] hover:bg-[var(--color-plasma-rose)]/80",
          showReason: true,
        },
        restore: {
          title: "Restore Persona",
          description: `Restore "${dialog.personaName}" to active status?`,
          confirmLabel: "Restore Persona",
          confirmColor: "bg-[var(--color-plasma-emerald)] hover:bg-[var(--color-plasma-emerald)]/80",
          showReason: false,
        },
        delete: {
          title: "Delete Persona",
          description: `Permanently mark "${dialog.personaName}" as deleted? This action cannot be undone.`,
          confirmLabel: "Delete Persona",
          confirmColor: "bg-[var(--color-plasma-rose)] hover:bg-[var(--color-plasma-rose)]/80",
          showReason: false,
        },
      }[dialog.action]
    : null;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
        <span>
          <span className="font-medium text-[var(--color-text-secondary)]">
            {totalCount}
          </span>{" "}
          total personas
        </span>
        {filteredCount !== totalCount && (
          <span>
            <span className="font-medium text-[var(--color-text-secondary)]">
              {filteredCount}
            </span>{" "}
            matching filters
          </span>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by persona name, brand name, or owner email…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm
              bg-white/[0.04] border border-white/[0.08]
              text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-muted)]
              focus:outline-none focus:border-[var(--color-plasma-amber)]/50
              transition-colors"
          />
        </div>

        <select
          value={currentStatus}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm
            bg-white/[0.04] border border-white/[0.08]
            text-[var(--color-text-primary)]
            focus:outline-none focus:border-[var(--color-plasma-amber)]/50
            transition-colors cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Table */}
      <div className="holo-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Photo
                </th>
                {sortableColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider
                      text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)]
                      transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      <SortIcon
                        column={col.key}
                        currentSort={currentSortBy}
                        currentOrder={currentSortOrder}
                      />
                    </div>
                  </th>
                ))}
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {personas.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    No personas found matching your filters.
                  </td>
                </tr>
              ) : (
                personas.map((persona) => (
                  <tr
                    key={persona.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5">
                      <PhotoThumbnail url={persona.photoUrl} name={persona.name} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {persona.ownerEmail}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {persona.brandName}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-primary)] font-medium">
                        {persona.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {formatDate(persona.createdAt)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <ModerationBadge status={persona.moderationStatus} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ModerationMenu
                        persona={persona}
                        onAction={handleModerationAction}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          Showing{" "}
          <span className="font-medium text-[var(--color-text-secondary)]">
            {personas.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </span>{" "}
          to{" "}
          <span className="font-medium text-[var(--color-text-secondary)]">
            {Math.min(currentPage * pageSize, filteredCount)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-[var(--color-text-secondary)]">
            {filteredCount}
          </span>{" "}
          results
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg text-[var(--color-text-muted)]
              hover:text-[var(--color-text-primary)] hover:bg-white/[0.04]
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-sm text-[var(--color-text-secondary)] px-2">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-lg text-[var(--color-text-muted)]
              hover:text-[var(--color-text-primary)] hover:bg-white/[0.04]
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Confirm Dialog */}
      {dialog && dialogConfig && (
        <ConfirmDialog
          isOpen={true}
          title={dialogConfig.title}
          description={dialogConfig.description}
          confirmLabel={dialogConfig.confirmLabel}
          confirmColor={dialogConfig.confirmColor}
          onConfirm={handleConfirm}
          onCancel={() => {
            setDialog(null);
            setReason("");
          }}
          isPending={isPending}
        >
          {dialogConfig.showReason && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for this action…"
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm
                  bg-white/[0.04] border border-white/[0.08]
                  text-[var(--color-text-primary)]
                  placeholder:text-[var(--color-text-muted)]
                  focus:outline-none focus:border-[var(--color-plasma-amber)]/50
                  transition-colors resize-none"
              />
            </div>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
