/**
 * Persona-level Audience Detail Page
 *
 * Displays audience targeting by platform with:
 * - Tabbed view for each platform (Meta, Google, LinkedIn, TikTok, Pinterest, Snapchat)
 * - Platform-specific targeting parameters
 * - Export button to download all platforms as a single CSV (Platform column for filtering)
 * - Download functionality with export_count tracking
 * - Build audience option if none exists yet
 */

"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { getPersona } from "@/app/actions/personas";
import type { Persona, Audience } from "@/lib/supabase/database.types";
import type {
  MetaTargeting,
  GoogleTargeting,
  LinkedInTargeting,
  TikTokTargeting,
  PinterestTargeting,
  SnapchatTargeting,
  SizeEstimates,
} from "@/lib/services/audience-translator";
import {
  PLATFORMS,
  type PlatformId,
  formatNumber,
  flattenTargeting,
  renderPlatformTargeting,
} from "@/components/audiences/PlatformTargetingDisplay";

// Parse audience data types
interface ParsedAudience {
  id: string;
  name: string;
  persona_id: string | null;
  brand_id: string;
  meta_targeting: MetaTargeting | null;
  google_targeting: GoogleTargeting | null;
  linkedin_targeting: LinkedInTargeting | null;
  tiktok_targeting: TikTokTargeting | null;
  pinterest_targeting: PinterestTargeting | null;
  snapchat_targeting: SnapchatTargeting | null;
  size_estimates: SizeEstimates | null;
  last_exported_at: string | null;
  export_count: number;
  created_at: string;
  updated_at: string;
}

// Main page component
export default function AudienceDetailPage({
  params,
}: {
  params: Promise<{ id: string; personaId: string }>;
}) {
  const { id: brandId, personaId } = use(params);

  const [persona, setPersona] = useState<Persona | null>(null);
  const [audience, setAudience] = useState<ParsedAudience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformId>("meta");
  const [isExporting, setIsExporting] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  // Fetch audience data
  const fetchAudience = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get persona first
      const personaResult = await getPersona(personaId);
      if (!personaResult.success) {
        setError(personaResult.error);
        setLoading(false);
        return;
      }
      setPersona(personaResult.data);

      // Try to get existing audience
      const response = await fetch(`/api/generate/audience?persona_id=${personaId}`);
      const data = await response.json();

      if (response.ok && data.audiences && data.audiences.length > 0) {
        const audienceData = data.audiences[0] as Audience;
        setAudience({
          id: audienceData.id,
          name: audienceData.name,
          persona_id: audienceData.persona_id,
          brand_id: audienceData.brand_id,
          meta_targeting: audienceData.meta_targeting as unknown as MetaTargeting,
          google_targeting: audienceData.google_targeting as unknown as GoogleTargeting,
          linkedin_targeting: audienceData.linkedin_targeting as unknown as LinkedInTargeting,
          tiktok_targeting: audienceData.tiktok_targeting as unknown as TikTokTargeting,
          pinterest_targeting: audienceData.pinterest_targeting as unknown as PinterestTargeting,
          snapchat_targeting: audienceData.snapchat_targeting as unknown as SnapchatTargeting,
          size_estimates: audienceData.size_estimates as unknown as SizeEstimates,
          last_exported_at: audienceData.last_exported_at,
          export_count: audienceData.export_count,
          created_at: audienceData.created_at,
          updated_at: audienceData.updated_at,
        });
      }
    } catch (err) {
      console.error("Error fetching audience:", err);
      setError("Failed to load audience data");
    }

    setLoading(false);
  }, [personaId]);

  useEffect(() => {
    fetchAudience();
  }, [fetchAudience]);

  // Build audience from persona
  const handleBuildAudience = async () => {
    setIsBuilding(true);
    setError(null);

    try {
      const response = await fetch("/api/generate/audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_id: personaId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to build audience");
        setIsBuilding(false);
        return;
      }

      // Refresh to show the new audience
      await fetchAudience();
    } catch (err) {
      console.error("Error building audience:", err);
      setError("Failed to build audience");
    }

    setIsBuilding(false);
  };

  // Export all platform targeting data to CSV
  const handleExport = async () => {
    if (!audience) return;

    setIsExporting(true);

    try {
      const rows: string[][] = [["Platform", "Parameter", "Value"]];

      for (const platform of PLATFORMS) {
        const targetingData = audience[
          `${platform.id}_targeting` as keyof ParsedAudience
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

      setAudience((prev) =>
        prev
          ? {
              ...prev,
              export_count: prev.export_count + 1,
              last_exported_at: new Date().toISOString(),
            }
          : null
      );
    } catch (err) {
      console.error("Error exporting:", err);
      setError("Failed to export targeting data");
    }

    setIsExporting(false);
  };

  // Get size estimate for current platform
  const getSizeEstimate = () => {
    if (!audience?.size_estimates) return null;
    const estimate = audience.size_estimates[activePlatform];
    if (!estimate) return null;
    return estimate;
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading audience data...</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 1rem;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: var(--color-plasma-violet);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-container p {
            color: var(--color-text-secondary);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error && !persona) {
    return (
      <div className="error-container">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2>Unable to load audience</h2>
        <p>{error}</p>
        <Link href={`/brands/${brandId}/personas/${personaId}`} className="back-btn">
          Back to Persona
        </Link>
        <style>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            text-align: center;
            padding: 2rem;
          }
          .error-icon {
            color: var(--color-plasma-rose);
            margin-bottom: 1rem;
          }
          .error-container h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--color-text-primary);
            margin: 0 0 0.5rem;
          }
          .error-container p {
            color: var(--color-text-secondary);
            margin: 0 0 1.5rem;
          }
          .back-btn {
            display: inline-flex;
            align-items: center;
            padding: 0.625rem 1rem;
            background: var(--color-plasma-violet);
            color: white;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.15s;
          }
          .back-btn:hover {
            background: var(--color-plasma-purple);
          }
        `}</style>
      </div>
    );
  }

  // No audience yet - show build option
  if (!audience && persona) {
    return (
      <div className="no-audience-page">
        <header className="page-header">
          <Link href={`/brands/${brandId}/personas/${personaId}`} className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Persona
          </Link>
          <h1 className="page-title">Build Audience</h1>
        </header>

        <div className="build-card">
          <div className="build-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2>No Audience Yet</h2>
          <p>
            Create platform-specific targeting from <strong>{persona.name}</strong>&apos;s
            persona data. This will translate demographics, interests, and behaviors into
            targeting parameters for Meta, Google, LinkedIn, TikTok, Pinterest, and Snapchat.
          </p>
          {error && <p className="error-message">{error}</p>}
          <button
            className="build-btn"
            onClick={handleBuildAudience}
            disabled={isBuilding}
          >
            {isBuilding ? (
              <>
                <span className="spinner" />
                Building Audience...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                Build Audience
              </>
            )}
          </button>
        </div>

        <style>{`
          .no-audience-page {
            max-width: 600px;
            margin: 0 auto;
          }
          .page-header {
            margin-bottom: 2rem;
          }
          .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--color-text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            margin-bottom: 1rem;
            transition: color 0.15s;
          }
          .back-link:hover {
            color: var(--color-text-primary);
          }
          .page-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--color-text-primary);
            margin: 0;
          }
          .build-card {
            background: var(--color-surface);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 3rem 2rem;
            text-align: center;
          }
          .build-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, var(--color-plasma-violet) 0%, var(--color-plasma-purple) 100%);
            border-radius: 24px;
            color: white;
            margin: 0 auto 1.5rem;
          }
          .build-card h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--color-text-primary);
            margin: 0 0 1rem;
          }
          .build-card p {
            font-size: 1rem;
            color: var(--color-text-secondary);
            line-height: 1.6;
            margin: 0 0 2rem;
          }
          .build-card p strong {
            color: var(--color-text-primary);
          }
          .error-message {
            color: var(--color-plasma-rose);
            background: rgba(244, 63, 94, 0.1);
            padding: 0.75rem 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
          }
          .build-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 1.5rem;
            background: var(--color-plasma-emerald);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s;
          }
          .build-btn:hover:not(:disabled) {
            background: #059669;
          }
          .build-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          .spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const sizeEstimate = getSizeEstimate();
  const activePlatformData = PLATFORMS.find((p) => p.id === activePlatform);

  return (
    <div className="audience-page">
      {/* Header */}
      <header className="page-header">
        <Link href={`/brands/${brandId}/personas/${personaId}`} className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Persona
        </Link>
        <div className="header-row">
          <div className="header-info">
            <h1 className="page-title">{audience?.name}</h1>
            <div className="export-stats">
              <span className="stat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {audience?.export_count || 0} exports
              </span>
              {audience?.last_exported_at && (
                <span className="stat">
                  Last exported:{" "}
                  {new Date(audience.last_exported_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <button
            className="export-btn"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className="spinner" />
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
        </div>
      </header>

      {/* Platform Tabs */}
      <div className="platform-tabs">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const isActive = activePlatform === platform.id;
          return (
            <button
              key={platform.id}
              className={`platform-tab ${isActive ? "active" : ""}`}
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
          className="size-estimate"
          style={{ borderLeftColor: activePlatformData?.color }}
        >
          <div className="estimate-label">Estimated Audience Size</div>
          <div className="estimate-value">
            {formatNumber(sizeEstimate.lower)} - {formatNumber(sizeEstimate.upper)}
          </div>
        </div>
      )}

      {/* Targeting Content */}
      <div className="targeting-content">
        {audience && renderPlatformTargeting(activePlatform, {
          meta_targeting: audience.meta_targeting,
          google_targeting: audience.google_targeting,
          linkedin_targeting: audience.linkedin_targeting,
          tiktok_targeting: audience.tiktok_targeting,
          pinterest_targeting: audience.pinterest_targeting,
          snapchat_targeting: audience.snapchat_targeting,
        })}
      </div>

      {error && (
        <div className="toast-error">
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      <style>{`
        .audience-page {
          max-width: 900px;
          margin: 0 auto;
        }

        /* Header */
        .page-header {
          margin-bottom: 1.5rem;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          transition: color 0.15s;
        }
        .back-link:hover {
          color: var(--color-text-primary);
        }
        .header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .header-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .export-stats {
          display: flex;
          gap: 1rem;
        }
        .stat {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }
        .export-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: var(--color-plasma-violet);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .export-btn:hover:not(:disabled) {
          background: var(--color-plasma-purple);
        }
        .export-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .export-btn .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Platform Tabs */
        .platform-tabs {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .platform-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: var(--color-surface);
          border: 2px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--color-text-secondary);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .platform-tab:hover:not(.active) {
          background: var(--color-elevated);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .platform-tab.active {
          background: var(--color-elevated);
          font-weight: 600;
        }

        /* Size Estimate */
        .size-estimate {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-left-width: 4px;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
        }
        .estimate-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-secondary);
          margin-bottom: 0.25rem;
        }
        .estimate-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        /* Targeting Content */
        .targeting-content {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1.5rem;
        }

        /* Toast */
        .toast-error {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.2);
          border-radius: 8px;
          color: var(--color-plasma-rose);
          font-size: 0.875rem;
          z-index: 100;
        }
        .toast-error button {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: var(--color-plasma-rose);
          cursor: pointer;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .header-row {
            flex-direction: column;
            align-items: stretch;
          }
          .export-btn {
            width: 100%;
            justify-content: center;
          }
          .platform-tabs {
            margin: 0 -1rem 1.5rem;
            padding: 0 1rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
