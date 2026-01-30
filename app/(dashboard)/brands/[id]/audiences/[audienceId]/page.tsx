/**
 * Audience Detail Page (Brand-scoped)
 *
 * Displays audience targeting by platform with:
 * - Tabbed view for each platform (Meta, Google, LinkedIn, TikTok, Pinterest, Snapchat)
 * - Source personas section with links
 * - Platform-specific targeting parameters
 * - Export button to download all platforms as a single CSV
 * - Delete audience functionality
 */

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAudience, deleteAudience, recordAudienceExport } from "@/app/actions/audiences";
import type { AudienceWithPersonas } from "@/app/actions/audiences";
import type { SizeEstimates } from "@/lib/services/audience-translator";
import {
  PLATFORMS,
  type PlatformId,
  formatNumber,
  flattenTargeting,
  renderPlatformTargeting,
} from "@/components/audiences/PlatformTargetingDisplay";

export default function AudienceDetailPage({
  params,
}: {
  params: Promise<{ id: string; audienceId: string }>;
}) {
  const { id: brandId, audienceId } = use(params);
  const router = useRouter();

  const [audience, setAudience] = useState<AudienceWithPersonas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformId>("meta");
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAudience = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAudience(audienceId);
      if (result.success) {
        setAudience(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Error fetching audience:", err);
      setError("Failed to load audience data");
    }

    setLoading(false);
  }, [audienceId]);

  useEffect(() => {
    fetchAudience();
  }, [fetchAudience]);

  // Get linked personas
  const linkedPersonas = (audience?.audience_personas || [])
    .map((ap) => ap.personas)
    .filter((p): p is { id: string; name: string; photo_url: string | null } => !!p);

  // Get size estimate for current platform
  const getSizeEstimate = () => {
    if (!audience?.size_estimates) return null;
    const estimates = audience.size_estimates as unknown as SizeEstimates;
    return estimates[activePlatform] || null;
  };

  // Export all platform targeting data to CSV
  const handleExport = async () => {
    if (!audience) return;

    setIsExporting(true);

    try {
      const rows: string[][] = [["Platform", "Parameter", "Value"]];

      for (const platform of PLATFORMS) {
        const targetingData = audience[
          `${platform.id}_targeting` as keyof typeof audience
        ] as Record<string, unknown> | null;
        if (!targetingData) continue;
        rows.push(...flattenTargeting(targetingData, platform.name));
      }

      const csvContent = rows
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${audience.name.toLowerCase().replace(/\s+/g, "-")}-all-platforms.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Record the export
      const result = await recordAudienceExport(audienceId);
      if (result.success) {
        setAudience(result.data);
      }
    } catch (err) {
      console.error("Error exporting:", err);
      setError("Failed to export targeting data");
    }

    setIsExporting(false);
  };

  // Delete audience
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this audience?")) return;

    setIsDeleting(true);
    try {
      const result = await deleteAudience(audienceId);
      if (result.success) {
        router.push(`/brands/${brandId}?tab=audiences`);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Error deleting audience:", err);
      setError("Failed to delete audience");
    }
    setIsDeleting(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="adp-loading">
        <div className="adp-spinner" />
        <p>Loading audience data...</p>
        <style>{`
          .adp-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 1rem;
          }
          .adp-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(139, 92, 246, 0.15);
            border-top-color: var(--color-plasma-violet);
            border-radius: 50%;
            animation: adp-spin 1s linear infinite;
            filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.4));
          }
          @keyframes adp-spin {
            to { transform: rotate(360deg); }
          }
          .adp-loading p {
            color: var(--color-text-secondary);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error && !audience) {
    return (
      <div className="adp-error-page">
        <div className="adp-error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2>Unable to load audience</h2>
        <p>{error}</p>
        <Link href={`/brands/${brandId}?tab=audiences`} className="adp-back-btn">
          Back to Audiences
        </Link>
        <style>{`
          .adp-error-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            text-align: center;
            padding: 2rem;
            background: var(--color-surface);
            border: 1px solid rgba(244, 63, 94, 0.2);
            border-radius: 16px;
          }
          .adp-error-icon {
            color: var(--color-plasma-rose);
            margin-bottom: 1rem;
            filter: drop-shadow(0 0 12px rgba(244, 63, 94, 0.4));
          }
          .adp-error-page h2 {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--color-text-primary);
            margin: 0 0 0.5rem;
          }
          .adp-error-page p {
            color: var(--color-text-secondary);
            margin: 0 0 1.5rem;
          }
          .adp-back-btn {
            display: inline-flex;
            align-items: center;
            padding: 0.75rem 1.25rem;
            background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
            color: white;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
          }
          .adp-back-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.35);
          }
        `}</style>
      </div>
    );
  }

  if (!audience) return null;

  const sizeEstimate = getSizeEstimate();
  const activePlatformData = PLATFORMS.find((p) => p.id === activePlatform);

  return (
    <div className="adp-page">
      {/* Header */}
      <header className="adp-header">
        <Link href={`/brands/${brandId}?tab=audiences`} className="adp-back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Audiences
        </Link>
        <div className="adp-header-row">
          <div className="adp-header-info">
            <h1 className="adp-title">{audience.name}</h1>
            <div className="adp-stats">
              <span className="adp-stat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {audience.export_count || 0} exports
              </span>
              {audience.last_exported_at && (
                <span className="adp-stat">
                  Last exported: {new Date(audience.last_exported_at).toLocaleDateString()}
                </span>
              )}
              <span className="adp-stat">
                Created: {new Date(audience.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="adp-actions">
            <button
              className="adp-export-btn"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <div className="adp-btn-spinner" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export CSV
                </>
              )}
            </button>
            <button
              className="adp-delete-btn"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </header>

      {/* Source Personas */}
      {linkedPersonas.length > 0 && (
        <section className="adp-personas-section">
          <h3 className="adp-section-label">Source Personas</h3>
          <div className="adp-personas-list">
            {linkedPersonas.map((persona) => (
              <Link
                key={persona.id}
                href={`/brands/${brandId}/personas/${persona.id}`}
                className="adp-persona-chip"
              >
                <div className="adp-persona-avatar">
                  {persona.photo_url ? (
                    <img src={persona.photo_url} alt={persona.name} />
                  ) : (
                    <span>{persona.name.charAt(0)}</span>
                  )}
                </div>
                <span className="adp-persona-chip-name">{persona.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Platform Tabs */}
      <div className="adp-platform-tabs">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const isActive = activePlatform === platform.id;
          return (
            <button
              key={platform.id}
              className={`adp-platform-tab ${isActive ? "active" : ""}`}
              onClick={() => setActivePlatform(platform.id)}
              style={
                isActive
                  ? { borderColor: platform.color, color: platform.color }
                  : undefined
              }
            >
              <Icon />
              <span>{platform.name}</span>
            </button>
          );
        })}
      </div>

      {/* Size Estimate */}
      {sizeEstimate && (
        <div
          className="adp-size-estimate"
          style={{ borderLeftColor: activePlatformData?.color }}
        >
          <div className="adp-estimate-label">Estimated Audience Size</div>
          <div className="adp-estimate-value">
            {formatNumber(sizeEstimate.lower)} - {formatNumber(sizeEstimate.upper)}
          </div>
        </div>
      )}

      {/* Targeting Content */}
      <div className="adp-targeting-content">
        {renderPlatformTargeting(activePlatform, {
          meta_targeting: audience.meta_targeting,
          google_targeting: audience.google_targeting,
          linkedin_targeting: audience.linkedin_targeting,
          tiktok_targeting: audience.tiktok_targeting,
          pinterest_targeting: audience.pinterest_targeting,
          snapchat_targeting: audience.snapchat_targeting,
        })}
      </div>

      {error && (
        <div className="adp-toast-error">
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      <style>{`
        .adp-page {
          max-width: 900px;
          margin: 0 auto;
        }

        /* Header */
        .adp-header {
          margin-bottom: 1.5rem;
        }
        .adp-back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-muted);
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          transition: color 0.15s;
        }
        .adp-back-link:hover {
          color: var(--color-text-primary);
        }
        .adp-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .adp-header-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .adp-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .adp-stats {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .adp-stat {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          color: var(--color-text-muted);
        }
        .adp-actions {
          display: flex;
          gap: 0.75rem;
        }
        .adp-export-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }
        .adp-export-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.35);
        }
        .adp-export-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .adp-btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: adp-spin 0.8s linear infinite;
        }
        .adp-delete-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: transparent;
          color: var(--color-plasma-rose);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .adp-delete-btn:hover:not(:disabled) {
          background: rgba(244, 63, 94, 0.1);
          border-color: rgba(244, 63, 94, 0.5);
        }
        .adp-delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Source Personas */
        .adp-personas-section {
          margin-bottom: 1.5rem;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.25rem;
        }
        .adp-section-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin: 0 0 0.75rem;
        }
        .adp-personas-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .adp-persona-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem 0.375rem 0.375rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 9999px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .adp-persona-chip:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-1px);
        }
        .adp-persona-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          flex-shrink: 0;
        }
        .adp-persona-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .adp-persona-avatar span {
          font-size: 0.6875rem;
          font-weight: 600;
          color: white;
        }
        .adp-persona-chip-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-plasma-violet);
        }

        /* Platform Tabs */
        .adp-platform-tabs {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .adp-platform-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: var(--color-surface);
          border: 2px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--color-text-muted);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .adp-platform-tab:hover:not(.active) {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .adp-platform-tab.active {
          background: rgba(255, 255, 255, 0.04);
          font-weight: 600;
        }

        /* Size Estimate */
        .adp-size-estimate {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-left-width: 4px;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
        }
        .adp-estimate-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin-bottom: 0.25rem;
        }
        .adp-estimate-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        /* Targeting Content */
        .adp-targeting-content {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.5rem;
        }

        /* Toast */
        .adp-toast-error {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.2);
          border-radius: 10px;
          color: var(--color-plasma-rose);
          font-size: 0.875rem;
          z-index: 100;
        }
        .adp-toast-error button {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: var(--color-plasma-rose);
          cursor: pointer;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .adp-header-row {
            flex-direction: column;
            align-items: stretch;
          }
          .adp-actions {
            width: 100%;
          }
          .adp-export-btn {
            flex: 1;
            justify-content: center;
          }
          .adp-platform-tabs {
            margin: 0 -1rem 1.5rem;
            padding: 0 1rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
