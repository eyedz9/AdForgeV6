"use server";

/**
 * Server Actions for admin content moderation.
 *
 * All actions verify the caller is an admin and create audit log entries.
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, createAuditLog } from "@/lib/auth/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionResult {
  success: boolean;
  error?: string;
}

type ModerationStatus = "active" | "flagged" | "disabled" | "deleted";
type ContentType = "brand" | "persona" | "creative";

// ---------------------------------------------------------------------------
// Update Moderation Status (generic for brands, personas, creatives)
// ---------------------------------------------------------------------------

function getTableName(contentType: ContentType): "brands" | "personas" | "creatives" {
  switch (contentType) {
    case "brand":
      return "brands";
    case "persona":
      return "personas";
    case "creative":
      return "creatives";
  }
}

export async function updateModerationStatus(
  contentType: ContentType,
  contentId: string,
  newStatus: ModerationStatus,
  reason: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();
  const tableName = getTableName(contentType);

  // Fetch current status
  const { data: existing, error: fetchErr } = await admin
    .from(tableName)
    .select("id, moderation_status, moderation_notes")
    .eq("id", contentId)
    .single();

  if (fetchErr || !existing) {
    return { success: false, error: `${contentType} not found.` };
  }

  const oldStatus = (existing as Record<string, unknown>).moderation_status as string;

  // Build moderation notes: append new reason
  const oldNotes = ((existing as Record<string, unknown>).moderation_notes as string | null) ?? "";
  const timestamp = new Date().toISOString();
  const noteEntry = `[${timestamp}] ${newStatus}: ${reason}`;
  const newNotes = oldNotes ? `${oldNotes}\n${noteEntry}` : noteEntry;

  const { error: updateErr } = await admin
    .from(tableName)
    .update({
      moderation_status: newStatus,
      moderation_notes: newNotes,
    } as never)
    .eq("id", contentId);

  if (updateErr) {
    return {
      success: false,
      error: `Failed to update ${contentType} moderation status.`,
    };
  }

  await createAuditLog(
    adminId,
    contentType,
    contentId,
    "update_moderation_status",
    {
      old_status: oldStatus,
      new_status: newStatus,
      reason,
    }
  );

  revalidatePath("/admin/content");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete Content
// ---------------------------------------------------------------------------

export async function deleteContent(
  contentType: ContentType,
  contentId: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();
  const tableName = getTableName(contentType);

  // First set moderation_status to 'deleted' (soft delete)
  const { error: updateErr } = await admin
    .from(tableName)
    .update({
      moderation_status: "deleted",
      moderation_notes: `[${new Date().toISOString()}] Deleted by admin`,
    } as never)
    .eq("id", contentId);

  if (updateErr) {
    return { success: false, error: `Failed to delete ${contentType}.` };
  }

  await createAuditLog(adminId, contentType, contentId, "delete_content", {});

  revalidatePath("/admin/content");
  return { success: true };
}
