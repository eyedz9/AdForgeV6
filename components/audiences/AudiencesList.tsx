/**
 * AudiencesList Component
 *
 * Displays a grid view of audience cards for a brand.
 * Shows source personas, platform badges, size estimates.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAudiences, deleteAudience } from "@/app/actions/audiences";
import type { AudienceWithPersonas } from "@/app/actions/audiences";
import { EmptyState, LoadingState } from "@/components/shared";
import CreateAudienceModal from "./CreateAudienceModal";
import { PLATFORMS, formatNumber } from "./PlatformTargetingDisplay";

interface AudiencesListProps {
  brandId: string;
}

function AudienceCard({
  audience,
  brandId,
  onDelete,
}: {
  audience: AudienceWithPersonas;
  brandId: string;
  onDelete: (id: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Get linked personas
  const linkedPersonas = (audience.audience_personas || [])
    .map((ap) => ap.personas)
    .filter((p): p is { id: string; name: string; photo_url: string | null } => !!p);

  // Get size estimate (use largest platform)
  const sizeEstimates = audience.size_estimates as Record<string, { lower: number; upper: number }> | null;
  let maxEstimate: { lower: number; upper: number } | null = null;
  if (sizeEstimates) {
    for (const platform of PLATFORMS) {
      const est = sizeEstimates[platform.id];
      if (est && (!maxEstimate || est.upper > maxEstimate.upper)) {
        maxEstimate = est;
      }
    }
  }

  // Check which platforms have targeting data
  const activePlatforms = PLATFORMS.filter((p) => {
    const targeting = audience[`${p.id}_targeting` as keyof typeof audience];
    return targeting && typeof targeting === "object" && Object.keys(targeting as object).length > 0;
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this audience?")) return;

    setIsDeleting(true);
    const result = await deleteAudience(audience.id);
    if (result.success) {
      onDelete(audience.id);
    }
    setIsDeleting(false);
  };

  return (
    <Link href={`/brands/${brandId}/audiences/${audience.id}`} className="audience-card">
      <div className="audience-card-header">
        <h3 className="audience-card-name">{audience.name}</h3>
        <button
          className="audience-card-delete"
          onClick={handleDelete}
          disabled={isDeleting}
          title="Delete audience"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Source Personas */}
      {linkedPersonas.length > 0 && (
        <div className="audience-personas-row">
          <div className="audience-avatar-group">
            {linkedPersonas.slice(0, 4).map((persona) => (
              <div key={persona.id} className="audience-avatar" title={persona.name}>
                {persona.photo_url ? (
                  <img src={persona.photo_url} alt={persona.name} />
                ) : (
                  <span>{persona.name.charAt(0)}</span>
                )}
              </div>
            ))}
            {linkedPersonas.length > 4 && (
              <div className="audience-avatar audience-avatar-more">
                +{linkedPersonas.length - 4}
              </div>
            )}
          </div>
          <span className="audience-persona-names">
            {linkedPersonas.length === 1
              ? linkedPersonas[0].name
              : `${linkedPersonas.length} personas`}
          </span>
        </div>
      )}

      {/* Platform Badges */}
      <div className="audience-platforms">
        {activePlatforms.map((platform) => (
          <span
            key={platform.id}
            className="platform-badge"
            style={{ backgroundColor: platform.color }}
            title={platform.name}
          />
        ))}
        <span className="platform-count">{activePlatforms.length} platforms</span>
      </div>

      {/* Size Estimate */}
      {maxEstimate && (
        <div className="audience-size">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {formatNumber(maxEstimate.lower)} - {formatNumber(maxEstimate.upper)}
        </div>
      )}

      {/* Footer */}
      <div className="audience-card-footer">
        <span className="audience-exports">
          {audience.export_count || 0} export{audience.export_count !== 1 ? "s" : ""}
        </span>
        <span className="audience-date">
          {new Date(audience.created_at).toLocaleDateString()}
        </span>
      </div>

      <style>{`
        .audience-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.25rem;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
          position: relative;
        }
        .audience-card:hover {
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -5px rgba(139, 92, 246, 0.15);
        }
        .audience-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .audience-card-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .audience-card-delete {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 6px;
          opacity: 0;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .audience-card:hover .audience-card-delete {
          opacity: 1;
        }
        .audience-card-delete:hover {
          color: var(--color-plasma-rose);
          background: rgba(244, 63, 94, 0.1);
        }
        .audience-personas-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .audience-avatar-group {
          display: flex;
        }
        .audience-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid var(--color-surface);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          margin-left: -6px;
          flex-shrink: 0;
        }
        .audience-avatar:first-child {
          margin-left: 0;
        }
        .audience-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .audience-avatar span {
          font-size: 0.6875rem;
          font-weight: 600;
          color: white;
        }
        .audience-avatar-more {
          font-size: 0.625rem;
          font-weight: 700;
          color: white;
          background: rgba(139, 92, 246, 0.5);
        }
        .audience-persona-names {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }
        .audience-platforms {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .platform-badge {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .platform-count {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-left: 0.25rem;
        }
        .audience-size {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          color: var(--color-plasma-cyan);
          font-weight: 500;
        }
        .audience-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .audience-exports,
        .audience-date {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </Link>
  );
}

export default function AudiencesList({ brandId }: AudiencesListProps) {
  const [audiences, setAudiences] = useState<AudienceWithPersonas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAudiences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAudiences(brandId);
      if (result.success) {
        setAudiences(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Error fetching audiences:", err);
      setError("Failed to load audiences");
    }
    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    fetchAudiences();
  }, [fetchAudiences]);

  const handleDelete = (id: string) => {
    setAudiences((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCreated = () => {
    setShowCreateModal(false);
    fetchAudiences();
  };

  if (loading) {
    return <LoadingState variant="skeleton" preset="audiences" count={4} />;
  }

  if (error) {
    return (
      <div className="audiences-error">
        <p>{error}</p>
        <button onClick={fetchAudiences}>Retry</button>
        <style>{`
          .audiences-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            gap: 1rem;
            padding: 2rem;
            background: var(--color-surface);
            border: 1px solid rgba(244, 63, 94, 0.2);
            border-radius: 16px;
          }
          .audiences-error p {
            color: var(--color-plasma-rose);
            margin: 0;
          }
          .audiences-error button {
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }

  if (audiences.length === 0) {
    return (
      <>
        <EmptyState
          icon="audiences"
          title="No audiences yet"
          description="Create an audience by selecting one or more personas. Each audience generates platform-specific targeting for Meta, Google, LinkedIn, TikTok, Pinterest, and Snapchat."
          action={{
            label: "Create Audience",
            onClick: () => setShowCreateModal(true),
          }}
        />
        <CreateAudienceModal
          brandId={brandId}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      </>
    );
  }

  return (
    <div className="audiences-list">
      <div className="audiences-header">
        <span className="audiences-count">
          {audiences.length} audience{audiences.length !== 1 ? "s" : ""}
        </span>
        <button className="audiences-create-btn" onClick={() => setShowCreateModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Audience
        </button>
      </div>

      <div className="audiences-grid">
        {audiences.map((audience) => (
          <AudienceCard
            key={audience.id}
            audience={audience}
            brandId={brandId}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <CreateAudienceModal
        brandId={brandId}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />

      <style>{`
        .audiences-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .audiences-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .audiences-count {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
        }
        .audiences-create-btn {
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
        .audiences-create-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.35);
        }
        .audiences-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        @media (max-width: 640px) {
          .audiences-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
