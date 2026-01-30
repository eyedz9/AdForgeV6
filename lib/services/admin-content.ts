/**
 * Admin Content Service
 *
 * Server-side functions to query brands, personas, creatives, and intelligence
 * reports for content moderation using the admin Supabase client (service role).
 */

import { createAdminClient } from "@/lib/supabase/admin";

// =============================================================================
// Types
// =============================================================================

export interface AdminBrandRow {
  id: string;
  ownerEmail: string;
  userId: string;
  name: string;
  industry: string | null;
  createdAt: string;
  moderationStatus: string;
  moderationNotes: string | null;
}

export interface AdminBrandsResult {
  brands: AdminBrandRow[];
  totalCount: number;
  filteredCount: number;
}

export interface AdminBrandsParams {
  search?: string;
  moderationStatus?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface AdminPersonaRow {
  id: string;
  ownerEmail: string;
  userId: string;
  brandName: string;
  name: string;
  photoUrl: string | null;
  createdAt: string;
  moderationStatus: string;
  moderationNotes: string | null;
}

export interface AdminPersonasResult {
  personas: AdminPersonaRow[];
  totalCount: number;
  filteredCount: number;
}

export interface AdminPersonasParams {
  search?: string;
  moderationStatus?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface AdminCreativeRow {
  id: string;
  ownerEmail: string;
  userId: string;
  brandName: string;
  creativeType: string;
  subtype: string | null;
  thumbnailUrl: string | null;
  fileUrl: string;
  createdAt: string;
  moderationStatus: string;
  moderationNotes: string | null;
}

export interface AdminCreativesResult {
  creatives: AdminCreativeRow[];
  totalCount: number;
  filteredCount: number;
}

export interface AdminCreativesParams {
  search?: string;
  moderationStatus?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface AdminReportRow {
  id: string;
  ownerEmail: string;
  userId: string;
  brandName: string;
  reportType: string | null;
  generatedAt: string;
  status: string;
}

export interface AdminReportsResult {
  reports: AdminReportRow[];
  totalCount: number;
  filteredCount: number;
}

export interface AdminReportsParams {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Fetches a paginated, filterable, sortable list of all brands across the platform.
 * Joins brands with auth.users for owner email lookup.
 */
export async function getAdminBrands(
  params: AdminBrandsParams = {}
): Promise<AdminBrandsResult> {
  const {
    search,
    moderationStatus,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
  } = params;

  const admin = createAdminClient();

  // Fetch all brands
  const { data: allBrands, error: brandsError } = await admin
    .from("brands")
    .select(
      "id, user_id, name, industry, created_at, moderation_status, moderation_notes"
    );

  if (brandsError || !allBrands) {
    console.error("Failed to fetch brands:", brandsError);
    return { brands: [], totalCount: 0, filteredCount: 0 };
  }

  const totalCount = allBrands.length;

  // Apply moderation status filter
  let filtered = [...allBrands];

  if (moderationStatus && moderationStatus !== "all") {
    filtered = filtered.filter(
      (b) => b.moderation_status === moderationStatus
    );
  }

  // Collect user IDs for email lookup
  const userIds = [...new Set(filtered.map((b) => b.user_id))];

  // Batch fetch user emails
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const emailResults = await Promise.all(
      userIds.map(async (uid) => {
        const { data } = await admin.auth.admin.getUserById(uid);
        return { uid, email: data?.user?.email ?? "Unknown" };
      })
    );
    for (const r of emailResults) {
      emailMap.set(r.uid, r.email);
    }
  }

  // Apply search filter (after email lookup so we can search by email)
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((b) => {
      const ownerEmail = emailMap.get(b.user_id) ?? "";
      return (
        b.name.toLowerCase().includes(q) ||
        ownerEmail.toLowerCase().includes(q)
      );
    });
  }

  const filteredCount = filtered.length;

  // Build rows
  let rows: AdminBrandRow[] = filtered.map((b) => ({
    id: b.id,
    ownerEmail: emailMap.get(b.user_id) ?? "Unknown",
    userId: b.user_id,
    name: b.name,
    industry: b.industry,
    createdAt: b.created_at,
    moderationStatus: b.moderation_status,
    moderationNotes: b.moderation_notes,
  }));

  // Sort
  rows.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "ownerEmail":
        cmp = a.ownerEmail.localeCompare(b.ownerEmail);
        break;
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "industry":
        cmp = (a.industry ?? "").localeCompare(b.industry ?? "");
        break;
      case "moderationStatus":
        cmp = a.moderationStatus.localeCompare(b.moderationStatus);
        break;
      case "createdAt":
      default:
        cmp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  // Paginate
  const offset = (page - 1) * pageSize;
  const paginatedRows = rows.slice(offset, offset + pageSize);

  return {
    brands: paginatedRows,
    totalCount,
    filteredCount,
  };
}

// =============================================================================
// Personas
// =============================================================================

/**
 * Fetches a paginated, filterable, sortable list of all personas across the platform.
 * Joins personas with brands (for brand name) and auth.users (for owner email).
 */
export async function getAdminPersonas(
  params: AdminPersonasParams = {}
): Promise<AdminPersonasResult> {
  const {
    search,
    moderationStatus,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
  } = params;

  const admin = createAdminClient();

  // Fetch all personas with brand join for brand name and user_id
  const { data: allPersonas, error: personasError } = await admin
    .from("personas")
    .select(
      "id, brand_id, name, photo_url, created_at, moderation_status, moderation_notes, brands!inner(name, user_id)"
    );

  if (personasError || !allPersonas) {
    console.error("Failed to fetch personas:", personasError);
    return { personas: [], totalCount: 0, filteredCount: 0 };
  }

  const totalCount = allPersonas.length;

  // Apply moderation status filter
  let filtered = [...allPersonas];

  if (moderationStatus && moderationStatus !== "all") {
    filtered = filtered.filter(
      (p) => p.moderation_status === moderationStatus
    );
  }

  // Collect user IDs for email lookup (from the joined brand)
  const userIds = [
    ...new Set(
      filtered.map((p) => {
        const brand = p.brands as unknown as { name: string; user_id: string };
        return brand.user_id;
      })
    ),
  ];

  // Batch fetch user emails
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const emailResults = await Promise.all(
      userIds.map(async (uid) => {
        const { data } = await admin.auth.admin.getUserById(uid);
        return { uid, email: data?.user?.email ?? "Unknown" };
      })
    );
    for (const r of emailResults) {
      emailMap.set(r.uid, r.email);
    }
  }

  // Apply search filter (after email lookup so we can search by email, persona name, brand name)
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((p) => {
      const brand = p.brands as unknown as { name: string; user_id: string };
      const ownerEmail = emailMap.get(brand.user_id) ?? "";
      return (
        p.name.toLowerCase().includes(q) ||
        brand.name.toLowerCase().includes(q) ||
        ownerEmail.toLowerCase().includes(q)
      );
    });
  }

  const filteredCount = filtered.length;

  // Build rows
  let rows: AdminPersonaRow[] = filtered.map((p) => {
    const brand = p.brands as unknown as { name: string; user_id: string };
    return {
      id: p.id,
      ownerEmail: emailMap.get(brand.user_id) ?? "Unknown",
      userId: brand.user_id,
      brandName: brand.name,
      name: p.name,
      photoUrl: p.photo_url,
      createdAt: p.created_at,
      moderationStatus: p.moderation_status,
      moderationNotes: p.moderation_notes,
    };
  });

  // Sort
  rows.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "ownerEmail":
        cmp = a.ownerEmail.localeCompare(b.ownerEmail);
        break;
      case "brandName":
        cmp = a.brandName.localeCompare(b.brandName);
        break;
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "moderationStatus":
        cmp = a.moderationStatus.localeCompare(b.moderationStatus);
        break;
      case "createdAt":
      default:
        cmp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  // Paginate
  const offset = (page - 1) * pageSize;
  const paginatedRows = rows.slice(offset, offset + pageSize);

  return {
    personas: paginatedRows,
    totalCount,
    filteredCount,
  };
}

// =============================================================================
// Creatives
// =============================================================================

/**
 * Fetches a paginated, filterable, sortable list of all creatives across the platform.
 * Joins creatives with brands (for brand name) and auth.users (for owner email).
 */
export async function getAdminCreatives(
  params: AdminCreativesParams = {}
): Promise<AdminCreativesResult> {
  const {
    search,
    moderationStatus,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
  } = params;

  const admin = createAdminClient();

  // Fetch all creatives with brand join for brand name and user_id
  const { data: allCreatives, error: creativesError } = await admin
    .from("creatives")
    .select(
      "id, brand_id, creative_type, subtype, file_url, thumbnail_url, created_at, moderation_status, moderation_notes, brands!inner(name, user_id)"
    );

  if (creativesError || !allCreatives) {
    console.error("Failed to fetch creatives:", creativesError);
    return { creatives: [], totalCount: 0, filteredCount: 0 };
  }

  const totalCount = allCreatives.length;

  // Apply moderation status filter
  let filtered = [...allCreatives];

  if (moderationStatus && moderationStatus !== "all") {
    filtered = filtered.filter(
      (c) => c.moderation_status === moderationStatus
    );
  }

  // Collect user IDs for email lookup (from the joined brand)
  const userIds = [
    ...new Set(
      filtered.map((c) => {
        const brand = c.brands as unknown as { name: string; user_id: string };
        return brand.user_id;
      })
    ),
  ];

  // Batch fetch user emails
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const emailResults = await Promise.all(
      userIds.map(async (uid) => {
        const { data } = await admin.auth.admin.getUserById(uid);
        return { uid, email: data?.user?.email ?? "Unknown" };
      })
    );
    for (const r of emailResults) {
      emailMap.set(r.uid, r.email);
    }
  }

  // Apply search filter (after email lookup so we can search by email, brand name, type)
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((c) => {
      const brand = c.brands as unknown as { name: string; user_id: string };
      const ownerEmail = emailMap.get(brand.user_id) ?? "";
      return (
        c.creative_type.toLowerCase().includes(q) ||
        (c.subtype ?? "").toLowerCase().includes(q) ||
        brand.name.toLowerCase().includes(q) ||
        ownerEmail.toLowerCase().includes(q)
      );
    });
  }

  const filteredCount = filtered.length;

  // Build rows
  let rows: AdminCreativeRow[] = filtered.map((c) => {
    const brand = c.brands as unknown as { name: string; user_id: string };
    return {
      id: c.id,
      ownerEmail: emailMap.get(brand.user_id) ?? "Unknown",
      userId: brand.user_id,
      brandName: brand.name,
      creativeType: c.creative_type,
      subtype: c.subtype,
      thumbnailUrl: c.thumbnail_url,
      fileUrl: c.file_url,
      createdAt: c.created_at,
      moderationStatus: c.moderation_status,
      moderationNotes: c.moderation_notes,
    };
  });

  // Sort
  rows.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "ownerEmail":
        cmp = a.ownerEmail.localeCompare(b.ownerEmail);
        break;
      case "brandName":
        cmp = a.brandName.localeCompare(b.brandName);
        break;
      case "creativeType":
        cmp = a.creativeType.localeCompare(b.creativeType);
        break;
      case "subtype":
        cmp = (a.subtype ?? "").localeCompare(b.subtype ?? "");
        break;
      case "moderationStatus":
        cmp = a.moderationStatus.localeCompare(b.moderationStatus);
        break;
      case "createdAt":
      default:
        cmp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  // Paginate
  const offset = (page - 1) * pageSize;
  const paginatedRows = rows.slice(offset, offset + pageSize);

  return {
    creatives: paginatedRows,
    totalCount,
    filteredCount,
  };
}

// =============================================================================
// Intelligence Reports
// =============================================================================

/**
 * Fetches a paginated, sortable list of all intelligence reports across the platform.
 * Reports are view-only (no moderation actions). Joins with brands for brand name
 * and auth.users for owner email.
 */
export async function getAdminReports(
  params: AdminReportsParams = {}
): Promise<AdminReportsResult> {
  const {
    search,
    sortBy = "generatedAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
  } = params;

  const admin = createAdminClient();

  // Fetch all intelligence reports with brand join
  const { data: allReports, error: reportsError } = await admin
    .from("intelligence_reports")
    .select(
      "id, brand_id, report_type, generated_at, status, brands!inner(name, user_id)"
    );

  if (reportsError || !allReports) {
    console.error("Failed to fetch intelligence reports:", reportsError);
    return { reports: [], totalCount: 0, filteredCount: 0 };
  }

  const totalCount = allReports.length;

  // Collect user IDs for email lookup (from the joined brand)
  const userIds = [
    ...new Set(
      allReports.map((r) => {
        const brand = r.brands as unknown as { name: string; user_id: string };
        return brand.user_id;
      })
    ),
  ];

  // Batch fetch user emails
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const emailResults = await Promise.all(
      userIds.map(async (uid) => {
        const { data } = await admin.auth.admin.getUserById(uid);
        return { uid, email: data?.user?.email ?? "Unknown" };
      })
    );
    for (const r of emailResults) {
      emailMap.set(r.uid, r.email);
    }
  }

  // Apply search filter
  let filtered = [...allReports];
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((r) => {
      const brand = r.brands as unknown as { name: string; user_id: string };
      const ownerEmail = emailMap.get(brand.user_id) ?? "";
      return (
        brand.name.toLowerCase().includes(q) ||
        ownerEmail.toLowerCase().includes(q) ||
        (r.report_type ?? "").toLowerCase().includes(q)
      );
    });
  }

  const filteredCount = filtered.length;

  // Build rows
  let rows: AdminReportRow[] = filtered.map((r) => {
    const brand = r.brands as unknown as { name: string; user_id: string };
    return {
      id: r.id,
      ownerEmail: emailMap.get(brand.user_id) ?? "Unknown",
      userId: brand.user_id,
      brandName: brand.name,
      reportType: r.report_type,
      generatedAt: r.generated_at,
      status: r.status,
    };
  });

  // Sort
  rows.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "ownerEmail":
        cmp = a.ownerEmail.localeCompare(b.ownerEmail);
        break;
      case "brandName":
        cmp = a.brandName.localeCompare(b.brandName);
        break;
      case "reportType":
        cmp = (a.reportType ?? "").localeCompare(b.reportType ?? "");
        break;
      case "generatedAt":
      default:
        cmp =
          new Date(a.generatedAt).getTime() -
          new Date(b.generatedAt).getTime();
        break;
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  // Paginate
  const offset = (page - 1) * pageSize;
  const paginatedRows = rows.slice(offset, offset + pageSize);

  return {
    reports: paginatedRows,
    totalCount,
    filteredCount,
  };
}
