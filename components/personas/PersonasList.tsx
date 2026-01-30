/**
 * PersonasList Component
 *
 * Displays a grid view of persona cards for a brand.
 *
 * Features:
 * - Grid view of persona cards
 * - Each card shows: photo placeholder, name, key demographics, validation status badge
 * - Generate Personas button
 * - Filter by product and validation status
 * - Click card navigates to persona detail
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getPersonas, deletePersona } from "@/app/actions/personas";
import { getProducts } from "@/app/actions/products";
import type { Persona, Product } from "@/lib/supabase/database.types";
import GeneratePersonaModal from "./GeneratePersonaModal";
import { EmptyState, LoadingState } from "@/components/shared";

// Demographics type from JSONB
interface DemographicsData {
  age?: number;
  gender?: string;
  location?: string;
  country?: string;
  education?: string;
  maritalStatus?: string;
  hasChildren?: boolean;
  numberOfChildren?: number;
  householdSize?: number;
  income?: number;
}

// Professional type from JSONB
interface ProfessionalData {
  jobTitle?: string;
  occupation?: string;
  industry?: string;
  companySize?: string;
  yearsExperience?: number;
  workStyle?: string;
  careerGoals?: string[];
}

// Generation params from JSONB (stored when created from suggestion)
interface GenerationParamsData {
  source?: string;
  relevanceScore?: number | null;
  archetype?: string;
  censusValidation?: {
    realismScore: number;
    locationFound: boolean;
  };
}

// Props for the PersonasList component
interface PersonasListProps {
  brandId: string;
}

// Validation status badge component
function ValidationStatusBadge({ status }: { status: string }) {
  const getStatusStyles = () => {
    switch (status) {
      case "validated":
        return { background: "rgba(16, 185, 129, 0.15)", color: "var(--color-plasma-emerald)", border: "rgba(16, 185, 129, 0.25)" };
      case "needs_revision":
        return { background: "rgba(245, 158, 11, 0.15)", color: "var(--color-plasma-amber)", border: "rgba(245, 158, 11, 0.25)" };
      case "rejected":
        return { background: "rgba(244, 63, 94, 0.15)", color: "var(--color-plasma-rose)", border: "rgba(244, 63, 94, 0.25)" };
      case "pending":
      default:
        return { background: "rgba(255, 255, 255, 0.05)", color: "var(--color-text-secondary)", border: "rgba(255, 255, 255, 0.1)" };
    }
  };

  const styles = getStatusStyles();

  return (
    <span
      className="validation-badge"
      style={{ backgroundColor: styles.background, color: styles.color, borderColor: styles.border }}
    >
      {status === "needs_revision" ? "Needs Revision" : status}
      <style>{`
        .validation-badge {
          display: inline-flex;
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          border: 1px solid;
        }
      `}</style>
    </span>
  );
}

// Persona card component
function PersonaCard({
  persona,
  brandId,
  onDelete,
}: {
  persona: Persona;
  brandId: string;
  onDelete: (id: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const demographics = (persona.demographics as DemographicsData | null) ?? {};
  const professional = (persona.professional as ProfessionalData | null) ?? {};
  const generationParams = (persona.generation_params as GenerationParamsData | null) ?? {};
  const matchPct = generationParams.relevanceScore != null
    ? Math.round(generationParams.relevanceScore * 100)
    : null;
  const censusScore = generationParams.censusValidation?.locationFound
    ? generationParams.censusValidation.realismScore
    : null;

  // Format income for display
  const formatIncome = (income: number | undefined) => {
    if (income === undefined) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(income);
  };

  // Build demographic summary
  const demographicParts: string[] = [];
  if (demographics.age) {
    demographicParts.push(`${demographics.age} years old`);
  }
  if (demographics.gender) {
    demographicParts.push(demographics.gender);
  }
  if (demographics.location) {
    demographicParts.push(demographics.location);
  }

  const demographicSummary = demographicParts.join(" • ");

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    const result = await deletePersona(persona.id);
    if (result.success) {
      onDelete(persona.id);
    }
    setDeleting(false);
    setShowConfirm(false);
  };

  return (
    <Link
      href={`/brands/${brandId}/personas/${persona.id}`}
      className="persona-card"
    >
      <div className="persona-photo-container">
        {persona.photo_url ? (
          <img
            src={persona.photo_url}
            alt={persona.name}
            className="persona-photo"
          />
        ) : (
          <div className="persona-photo-placeholder">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
        <div className="persona-status-overlay">
          <ValidationStatusBadge status={persona.validation_status} />
        </div>
        {persona.moderation_status === "flagged" && (
          <div className="persona-flagged-overlay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
        )}

        {/* Delete button */}
        <button
          className="persona-delete-btn"
          onClick={handleDeleteClick}
          title="Delete persona"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>

        {/* Delete confirmation overlay */}
        {showConfirm && (
          <div className="persona-delete-confirm" onClick={(e) => e.preventDefault()}>
            <p>Delete this persona?</p>
            <div className="persona-delete-actions">
              <button
                className="persona-delete-cancel"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="persona-delete-confirm-btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="persona-info">
        <div className="persona-name-row">
          <h3 className="persona-name">{persona.name}</h3>
          <div className="persona-badges">
            {matchPct !== null && (
              <span className="persona-match-badge">{matchPct}% match</span>
            )}
            {censusScore !== null && (
              <span
                className="persona-census-badge"
                style={{
                  backgroundColor:
                    censusScore >= 80
                      ? "rgba(16, 185, 129, 0.15)"
                      : censusScore >= 50
                        ? "rgba(245, 158, 11, 0.15)"
                        : "rgba(244, 63, 94, 0.15)",
                  color:
                    censusScore >= 80
                      ? "var(--color-plasma-emerald)"
                      : censusScore >= 50
                        ? "var(--color-plasma-amber)"
                        : "var(--color-plasma-rose)",
                  borderColor:
                    censusScore >= 80
                      ? "rgba(16, 185, 129, 0.25)"
                      : censusScore >= 50
                        ? "rgba(245, 158, 11, 0.25)"
                        : "rgba(244, 63, 94, 0.25)",
                }}
              >
                Census: {censusScore}%
              </span>
            )}
          </div>
        </div>
        {persona.moderation_status === "flagged" && (
          <p className="persona-flagged-text">Flagged for review</p>
        )}
        {demographicSummary && (
          <p className="persona-demographics">{demographicSummary}</p>
        )}
        <div className="persona-details">
          {professional.jobTitle && (
            <span className="persona-job">{professional.jobTitle}</span>
          )}
          {demographics.income && (
            <span className="persona-income">
              {formatIncome(demographics.income)}
            </span>
          )}
        </div>
        {persona.quote && (
          <blockquote className="persona-quote">
            &ldquo;{persona.quote.slice(0, 100)}
            {persona.quote.length > 100 ? "..." : ""}&rdquo;
          </blockquote>
        )}
      </div>
      <style>{`
        .persona-card {
          display: flex;
          flex-direction: column;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .persona-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 40px -15px rgba(139, 92, 246, 0.25);
          border-color: rgba(139, 92, 246, 0.3);
        }
        .persona-photo-container {
          position: relative;
          aspect-ratio: 1;
          background: linear-gradient(135deg, var(--color-plasma-violet) 0%, var(--color-plasma-purple) 100%);
          overflow: hidden;
        }
        .persona-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .persona-photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.6);
        }
        .persona-status-overlay {
          position: absolute;
          top: 0.625rem;
          right: 0.625rem;
        }
        .persona-flagged-overlay {
          position: absolute;
          top: 0.625rem;
          left: 0.625rem;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.375rem;
          border-radius: 0.5rem;
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: rgb(245, 158, 11);
          backdrop-filter: blur(8px);
        }

        /* Delete button */
        .persona-delete-btn {
          position: absolute;
          top: 0.625rem;
          left: 0.625rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
          z-index: 2;
        }
        .persona-card:hover .persona-delete-btn {
          opacity: 1;
        }
        .persona-delete-btn:hover {
          background: rgba(244, 63, 94, 0.6);
          border-color: rgba(244, 63, 94, 0.5);
          color: white;
        }
        /* Move flagged overlay when delete btn is visible */
        .persona-card:hover .persona-flagged-overlay {
          left: 2.75rem;
        }

        /* Delete confirmation overlay */
        .persona-delete-confirm {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          z-index: 3;
        }
        .persona-delete-confirm p {
          color: white;
          font-size: 0.9375rem;
          font-weight: 600;
          margin: 0;
        }
        .persona-delete-actions {
          display: flex;
          gap: 0.5rem;
        }
        .persona-delete-cancel {
          padding: 0.4375rem 0.875rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: white;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .persona-delete-cancel:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }
        .persona-delete-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .persona-delete-confirm-btn {
          padding: 0.4375rem 0.875rem;
          background: rgba(244, 63, 94, 0.8);
          border: 1px solid rgba(244, 63, 94, 0.6);
          border-radius: 6px;
          color: white;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .persona-delete-confirm-btn:hover:not(:disabled) {
          background: rgba(244, 63, 94, 1);
        }
        .persona-delete-confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .persona-info {
          padding: 1.125rem;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .persona-name-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .persona-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          line-height: 1.3;
          letter-spacing: -0.01em;
        }
        .persona-badges {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .persona-match-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          background: rgba(16, 185, 129, 0.12);
          color: var(--color-plasma-emerald);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 999px;
          font-size: 0.625rem;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .persona-census-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          border: 1px solid;
          border-radius: 999px;
          font-size: 0.625rem;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .persona-flagged-text {
          font-size: 0.75rem;
          font-weight: 500;
          color: rgb(245, 158, 11);
          margin: 0.25rem 0 0;
          line-height: 1.3;
        }
        .persona-demographics {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.4;
        }
        .persona-details {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.25rem;
        }
        .persona-job {
          display: inline-flex;
          padding: 0.25rem 0.5rem;
          background: rgba(139, 92, 246, 0.12);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 500;
        }
        .persona-income {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-plasma-emerald);
        }
        .persona-quote {
          font-size: 0.75rem;
          font-style: italic;
          color: var(--color-text-muted);
          margin: 0.5rem 0 0;
          padding-left: 0.75rem;
          border-left: 2px solid rgba(139, 92, 246, 0.3);
          line-height: 1.5;
        }
      `}</style>
    </Link>
  );
}

// Lightning bolt icon for generate button
function LightningIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// Empty state using shared component
function PersonasEmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <EmptyState
      icon="personas"
      title="No personas yet"
      description="Generate AI-powered consumer personas based on your brand and market intelligence to create targeted advertising campaigns."
      action={{
        label: "Generate Personas",
        onClick: onGenerate,
        icon: <LightningIcon />,
      }}
    />
  );
}

// Loading state using shared component
function PersonasLoadingState() {
  return <LoadingState variant="skeleton" preset="personas" count={4} />;
}

// Error state component
function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-state">
      <div className="error-icon">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="error-title">Failed to load personas</h3>
      <p className="error-message">{error}</p>
      <button className="btn-retry" onClick={onRetry}>
        Try Again
      </button>
      <style>{`
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          background: var(--color-surface);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 16px;
          text-align: center;
          position: relative;
        }
        .error-state::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(244, 63, 94, 0.05) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 16px;
        }
        .error-icon {
          color: var(--color-plasma-rose);
          margin-bottom: 1.25rem;
          filter: drop-shadow(0 0 15px rgba(244, 63, 94, 0.4));
        }
        .error-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.625rem;
          letter-spacing: -0.02em;
        }
        .error-message {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0 0 1.75rem;
          line-height: 1.5;
        }
        .btn-retry {
          display: inline-flex;
          align-items: center;
          padding: 0.75rem 1.25rem;
          background: transparent;
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-retry:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.6);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}

// Filter bar component
function FilterBar({
  products,
  selectedProductId,
  onProductChange,
  selectedStatus,
  onStatusChange,
}: {
  products: Product[];
  selectedProductId: string;
  onProductChange: (productId: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label htmlFor="product-filter" className="filter-label">
          Product
        </label>
        <select
          id="product-filter"
          className="filter-select"
          value={selectedProductId}
          onChange={(e) => onProductChange(e.target.value)}
        >
          <option value="">All Products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label htmlFor="status-filter" className="filter-label">
          Status
        </label>
        <select
          id="status-filter"
          className="filter-select"
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="validated">Validated</option>
          <option value="needs_revision">Needs Revision</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <style>{`
        .filter-bar {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .filter-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .filter-select {
          padding: 0.5rem 2rem 0.5rem 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 0.875rem;
          color: var(--color-text-primary);
          background: var(--color-surface);
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.25rem;
          appearance: none;
          cursor: pointer;
          min-width: 140px;
          transition: all 0.2s ease;
        }
        .filter-select:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }
        .filter-select:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

// Main PersonasList component
export default function PersonasList({ brandId }: PersonasListProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Fetch personas and products
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch personas and products in parallel
      const [personasResult, productsResult] = await Promise.all([
        getPersonas(brandId, selectedProductId || null),
        getProducts(brandId),
      ]);

      if (!personasResult.success) {
        setError(personasResult.error);
        setLoading(false);
        return;
      }

      if (!productsResult.success) {
        // Non-critical: continue with empty products for filtering
        setProducts([]);
      } else {
        setProducts(productsResult.data);
      }

      setPersonas(personasResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }

    setLoading(false);
  }, [brandId, selectedProductId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter personas by validation status (client-side)
  const filteredPersonas = selectedStatus
    ? personas.filter((p) => p.validation_status === selectedStatus)
    : personas;

  // Handle deleting a persona from state
  const handleDeletePersona = (id: string) => {
    setPersonas((prev) => prev.filter((p) => p.id !== id));
  };

  // Handle generate button click
  const handleGenerate = () => {
    setShowGenerateModal(true);
  };

  // Loading state
  if (loading) {
    return <PersonasLoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  // Empty state
  if (personas.length === 0 && !selectedProductId && !selectedStatus) {
    return (
      <>
        <PersonasEmptyState onGenerate={handleGenerate} />
        <GeneratePersonaModal
          brandId={brandId}
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onGenerated={fetchData}
        />
      </>
    );
  }

  // Personas grid
  return (
    <div className="personas-list">
      <div className="personas-header">
        <div className="personas-header-left">
          <p className="personas-count">
            {filteredPersonas.length}{" "}
            {filteredPersonas.length === 1 ? "persona" : "personas"}
            {selectedProductId || selectedStatus
              ? ` (filtered from ${personas.length})`
              : ""}
          </p>
        </div>
        <div className="personas-header-right">
          <FilterBar
            products={products}
            selectedProductId={selectedProductId}
            onProductChange={setSelectedProductId}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />
          <button className="btn-generate" onClick={handleGenerate}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Generate Personas
          </button>
        </div>
      </div>

      {filteredPersonas.length === 0 ? (
        <div className="no-results">
          <p>No personas match your filters</p>
          <button
            className="btn-clear-filters"
            onClick={() => {
              setSelectedProductId("");
              setSelectedStatus("");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="personas-grid">
          {filteredPersonas.map((persona) => (
            <PersonaCard key={persona.id} persona={persona} brandId={brandId} onDelete={handleDeletePersona} />
          ))}
        </div>
      )}

      {/* Generate Personas Modal */}
      <GeneratePersonaModal
        brandId={brandId}
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerated={fetchData}
      />

      <style>{`
        .personas-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .personas-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .personas-header-left {
          display: flex;
          align-items: center;
        }
        .personas-header-right {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .personas-count {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .btn-generate {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.125rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }
        .btn-generate:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.35), 0 8px 20px -8px rgba(139, 92, 246, 0.4);
        }
        .personas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
        }
        .no-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          background: var(--color-surface);
          border: 1px dashed rgba(139, 92, 246, 0.3);
          border-radius: 16px;
          text-align: center;
        }
        .no-results p {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0 0 1rem;
        }
        .btn-clear-filters {
          padding: 0.625rem 1.125rem;
          background: transparent;
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-clear-filters:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.6);
        }

        @media (max-width: 768px) {
          .personas-header {
            flex-direction: column;
            align-items: stretch;
          }
          .personas-header-right {
            flex-direction: column;
            align-items: stretch;
          }
          .btn-generate {
            justify-content: center;
          }
        }
        @media (max-width: 640px) {
          .personas-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
