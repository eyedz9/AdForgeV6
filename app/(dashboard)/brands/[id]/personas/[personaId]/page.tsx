/**
 * Persona Detail Page
 *
 * Displays full persona details with:
 * - Persona photo (placeholder if none)
 * - Sections: Demographics, Professional, Psychographics, Lifestyle, Media & Tech, Buying Behavior
 * - Expandable/collapsible sections
 * - Backstory and quote
 * - Validation status with notes
 * - Edit and Delete buttons
 * - Build Audience button
 */

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPersona, deletePersona } from "@/app/actions/personas";
import type { Persona } from "@/lib/supabase/database.types";
import type {
  Demographics,
  Professional,
  Psychographics,
  Lifestyle,
  MediaTech,
  BuyingBehavior,
  BeliefsAttitudes,
  MediaProfile,
  CreativeMessaging,
} from "@/lib/validations/persona";

// Census validation result shape (from generation_params)
interface CensusValidationData {
  locationFound: boolean;
  placeName: string;
  censusData: {
    medianIncome: number | null;
    medianAge: number | null;
    totalPopulation: number | null;
    malePercent: number | null;
    femalePercent: number | null;
    averageHouseholdSize: number | null;
    educationDistribution: {
      highSchool: number;
      someCollege: number;
      associates: number;
      bachelors: number;
      masters: number;
      professional: number;
      doctorate: number;
    };
  };
  comparisons: {
    income: { personaValue: number; censusMedian: number; ratio: number; assessment: string } | null;
    age: { personaValue: number; censusMedian: number; difference: number; assessment: string } | null;
    householdSize: { personaValue: number; censusAverage: number; assessment: string } | null;
    education: { personaLevel: string; percentWithSameOrHigher: number; assessment: string } | null;
  };
  realismScore: number;
  notes: string[];
}

// Type for parsed persona data
interface ParsedPersona {
  id: string;
  brand_id: string;
  product_id: string | null;
  intelligence_report_id: string | null;
  name: string;
  photo_prompt: string | null;
  photo_url: string | null;
  backstory: string | null;
  quote: string | null;
  day_in_life: string | null;
  demographics: Demographics | null;
  professional: Professional | null;
  psychographics: Psychographics | null;
  lifestyle: Lifestyle | null;
  media_tech: MediaTech | null;
  buying_behavior: BuyingBehavior | null;
  beliefs_attitudes: BeliefsAttitudes | null;
  media_profile: MediaProfile | null;
  creative_messaging: CreativeMessaging | null;
  generation_model: string;
  generation_params: Record<string, unknown> | null;
  validation_status: string;
  validation_notes: string | null;
  created_at: string;
  updated_at: string;
}

// Validation status badge component
function ValidationStatusBadge({ status }: { status: string }) {
  const getStatusConfig = () => {
    switch (status) {
      case "validated":
        return { bg: "rgba(16, 185, 129, 0.15)", color: "var(--color-plasma-emerald)", label: "Validated" };
      case "needs_revision":
        return { bg: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", label: "Needs Revision" };
      case "rejected":
        return { bg: "rgba(244, 63, 94, 0.15)", color: "var(--color-plasma-rose)", label: "Rejected" };
      case "pending":
      default:
        return { bg: "rgba(255, 255, 255, 0.08)", color: "var(--color-text-muted)", label: "Pending Review" };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className="validation-badge"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
      <style>{`
        .validation-badge {
          display: inline-flex;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </span>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  icon,
  children,
  defaultExpanded = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section className="collapsible-section">
      <button
        className="section-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="section-title-group">
          <span className="section-icon">{icon}</span>
          <h3 className="section-title">{title}</h3>
        </div>
        <svg
          className={`chevron ${isExpanded ? "expanded" : ""}`}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isExpanded && <div className="section-content">{children}</div>}
      <style>{`
        .collapsible-section {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .collapsible-section:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }
        .section-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .section-header:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .section-title-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .section-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(139, 92, 246, 0.15);
          border-radius: 8px;
          color: var(--color-plasma-violet);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .section-header:hover .section-icon {
          background: rgba(139, 92, 246, 0.2);
        }
        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .chevron {
          color: var(--color-text-muted);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .chevron.expanded {
          transform: rotate(180deg);
        }
        .section-content {
          padding: 0 1.25rem 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
      `}</style>
    </section>
  );
}

// Info row component for displaying labeled values
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
      <style>{`
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 0.625rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .info-label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          flex-shrink: 0;
        }
        .info-value {
          font-size: 0.875rem;
          color: var(--color-text-primary);
          text-align: right;
          max-width: 60%;
        }
      `}</style>
    </div>
  );
}

// Tags display component
function TagsList({ label, items }: { label: string; items: string[] | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="tags-section">
      <span className="tags-label">{label}</span>
      <div className="tags-list">
        {items.map((item, index) => (
          <span key={index} className="tag">
            {item}
          </span>
        ))}
      </div>
      <style>{`
        .tags-section {
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .tags-section:last-child {
          border-bottom: none;
        }
        .tags-label {
          display: block;
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: 0.5rem;
        }
        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        .tag {
          display: inline-flex;
          padding: 0.25rem 0.625rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border-radius: 6px;
          font-size: 0.8125rem;
          border: 1px solid rgba(139, 92, 246, 0.2);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tag:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.3);
        }
      `}</style>
    </div>
  );
}

// Delete confirmation modal
function DeleteConfirmModal({
  personaName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  personaName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="modal-title">Delete Persona</h3>
        <p className="modal-message">
          Are you sure you want to delete <strong>{personaName}</strong>? This action
          cannot be undone. Any associated audiences will also be deleted.
        </p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Persona"}
          </button>
        </div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .modal-icon {
          color: var(--color-plasma-rose);
          margin-bottom: 1rem;
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 0.75rem;
        }
        .modal-message {
          font-size: 0.9375rem;
          color: var(--color-text-muted);
          margin: 0 0 1.5rem;
          line-height: 1.5;
        }
        .modal-message strong {
          color: var(--color-text-primary);
        }
        .modal-actions {
          display: flex;
          gap: 0.75rem;
        }
        .btn-cancel,
        .btn-delete-confirm {
          flex: 1;
          padding: 0.625rem 1rem;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-cancel {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--color-text-secondary);
        }
        .btn-cancel:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .btn-delete-confirm {
          background: linear-gradient(135deg, var(--color-plasma-rose), #be123c);
          border: none;
          color: white;
          box-shadow: 0 0 20px rgba(244, 63, 94, 0.3);
        }
        .btn-delete-confirm:hover:not(:disabled) {
          box-shadow: 0 0 30px rgba(244, 63, 94, 0.4);
          transform: translateY(-1px);
        }
        .btn-cancel:disabled,
        .btn-delete-confirm:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// Format currency helper
function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Icons for sections
const DemographicsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ProfessionalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const PsychographicsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
    <path d="M12 2a10 10 0 0 1 10 10" />
    <circle cx="12" cy="12" r="6" />
  </svg>
);

const LifestyleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const MediaTechIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const BuyingBehaviorIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const BeliefsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CensusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-8 4 4 4-6" />
  </svg>
);

const MediaAffinityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const DaypartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const GenreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const CreativeMessagingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string; personaId: string }>;
}) {
  const { id: brandId, personaId } = use(params);
  const router = useRouter();

  const [persona, setPersona] = useState<ParsedPersona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingPhoto, setIsRegeneratingPhoto] = useState(false);
  const [isValidatingCensus, setIsValidatingCensus] = useState(false);

  // Parse persona data from database
  const parsePersona = useCallback((raw: Persona): ParsedPersona => {
    return {
      id: raw.id,
      brand_id: raw.brand_id,
      product_id: raw.product_id,
      intelligence_report_id: raw.intelligence_report_id,
      name: raw.name,
      photo_prompt: raw.photo_prompt,
      photo_url: raw.photo_url,
      backstory: raw.backstory,
      quote: raw.quote,
      day_in_life: raw.day_in_life,
      demographics: raw.demographics as Demographics | null,
      professional: raw.professional as Professional | null,
      psychographics: raw.psychographics as Psychographics | null,
      lifestyle: raw.lifestyle as Lifestyle | null,
      media_tech: raw.media_tech as MediaTech | null,
      buying_behavior: raw.buying_behavior as BuyingBehavior | null,
      beliefs_attitudes: raw.beliefs_attitudes as BeliefsAttitudes | null,
      media_profile: raw.media_profile as MediaProfile | null,
      creative_messaging: raw.creative_messaging as CreativeMessaging | null,
      generation_model: raw.generation_model,
      generation_params: raw.generation_params as Record<string, unknown> | null,
      validation_status: raw.validation_status,
      validation_notes: raw.validation_notes,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
  }, []);

  // Fetch persona data
  const fetchPersona = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getPersona(personaId);

    if (result.success) {
      setPersona(parsePersona(result.data));
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [personaId, parsePersona]);

  useEffect(() => {
    fetchPersona();
  }, [fetchPersona]);

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);

    const result = await deletePersona(personaId);

    if (result.success) {
      router.push(`/brands/${brandId}?tab=personas`);
    } else {
      setError(result.error);
      setShowDeleteModal(false);
    }

    setIsDeleting(false);
  };

  // Handle regenerate portrait
  const handleRegeneratePhoto = async () => {
    if (!persona || isRegeneratingPhoto) return;

    setIsRegeneratingPhoto(true);

    try {
      const response = await fetch("/api/generate/persona-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id,
          brandId: brandId,
          age: persona.demographics?.age || 35,
          gender: persona.demographics?.gender || "person",
          ethnicity: persona.demographics?.ethnicity || undefined,
          occupation: persona.professional?.jobTitle || persona.professional?.occupation || undefined,
          style: "job-adaptive",
        }),
      });

      const data = await response.json();

      if (data.success && data.photoUrl) {
        setPersona((prev) =>
          prev ? { ...prev, photo_url: data.photoUrl, photo_prompt: data.photoPrompt } : prev
        );
      } else {
        setError(data.error || "Failed to regenerate portrait");
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate portrait");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsRegeneratingPhoto(false);
    }
  };

  // Handle census validation
  const handleCensusValidation = async () => {
    if (!persona || isValidatingCensus) return;

    setIsValidatingCensus(true);

    try {
      const response = await fetch("/api/validate/census", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: persona.id }),
      });

      const data = await response.json();

      if (data.success && data.censusValidation) {
        setPersona((prev) =>
          prev
            ? {
                ...prev,
                generation_params: {
                  ...(prev.generation_params ?? {}),
                  censusValidation: data.censusValidation,
                },
              }
            : prev
        );
      } else {
        setError(data.error || "Census validation failed");
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Census validation failed");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsValidatingCensus(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading persona...</p>
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
            border: 3px solid rgba(255, 255, 255, 0.08);
            border-top-color: var(--color-plasma-violet);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-container p {
            color: var(--color-text-muted);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error || !persona) {
    return (
      <div className="error-container">
        <div className="error-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2>Unable to load persona</h2>
        <p>{error || "Persona not found"}</p>
        <Link href={`/brands/${brandId}?tab=personas`} className="back-btn">
          Back to Personas
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
            color: var(--color-text-muted);
            margin: 0 0 1.5rem;
          }
          .back-btn {
            display: inline-flex;
            align-items: center;
            padding: 0.625rem 1rem;
            background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
            color: white;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
          }
          .back-btn:hover {
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.4);
            transform: translateY(-1px);
          }
        `}</style>
      </div>
    );
  }

  const { demographics, professional, psychographics, lifestyle, media_tech, buying_behavior, beliefs_attitudes } = persona;

  return (
    <div className="persona-detail-page">
      {/* Header */}
      <header className="page-header">
        <Link href={`/brands/${brandId}?tab=personas`} className="back-link">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Personas
        </Link>
        <div className="header-row">
          <div className="header-info">
            <h1 className="page-title">{persona.name}</h1>
            <ValidationStatusBadge status={persona.validation_status} />
          </div>
          <div className="header-actions">
            <Link
              href={`/brands/${brandId}/personas/${personaId}/audience`}
              className="btn-build-audience"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Build Audience
            </Link>
            <Link
              href={`/brands/${brandId}/personas/${personaId}/edit`}
              className="btn-edit"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </Link>
            <button className="btn-delete" onClick={() => setShowDeleteModal(true)}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="content-grid">
        {/* Left Column - Photo and Core Info */}
        <div className="left-column">
          {/* Photo */}
          <div className="photo-container">
            {persona.photo_url ? (
              <img
                src={persona.photo_url}
                alt={persona.name}
                className="persona-photo"
              />
            ) : (
              <div className="photo-placeholder">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>No photo generated</span>
              </div>
            )}
            {/* Regenerate Photo Overlay */}
            {isRegeneratingPhoto ? (
              <div className="photo-overlay photo-overlay--loading">
                <div className="photo-regen-spinner" />
                <span>Generating...</span>
              </div>
            ) : (
              <button
                className="photo-overlay photo-overlay--button"
                onClick={handleRegeneratePhoto}
                title={persona.photo_url ? "Regenerate portrait" : "Generate portrait"}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span>{persona.photo_url ? "Regenerate" : "Generate"}</span>
              </button>
            )}
          </div>

          {/* Quote */}
          {persona.quote && (
            <div className="quote-card">
              <svg
                className="quote-icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
              </svg>
              <blockquote className="quote-text">{persona.quote}</blockquote>
            </div>
          )}

          {/* Backstory */}
          {persona.backstory && (
            <div className="backstory-card">
              <h3 className="card-title">Backstory</h3>
              <p className="backstory-text">{persona.backstory}</p>
            </div>
          )}

          {/* Day in Life */}
          {persona.day_in_life && (
            <div className="day-in-life-card">
              <h3 className="card-title">A Day in Their Life</h3>
              <p className="day-in-life-text">{persona.day_in_life}</p>
            </div>
          )}

          {/* Validation Notes */}
          {persona.validation_notes && (
            <div className="validation-notes-card">
              <h3 className="card-title">Validation Notes</h3>
              <p className="validation-notes-text">{persona.validation_notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="metadata-card">
            <div className="metadata-row">
              <span>Created</span>
              <span>
                {new Date(persona.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="metadata-row">
              <span>Last Updated</span>
              <span>
                {new Date(persona.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Data Sections */}
        <div className="right-column">
          {/* Demographics Section */}
          {demographics && (
            <CollapsibleSection title="Demographics" icon={<DemographicsIcon />}>
              <div className="section-data">
                <InfoRow label="Age" value={demographics.age ? `${demographics.age} years old` : undefined} />
                <InfoRow label="Gender" value={demographics.gender} />
                <InfoRow label="Location" value={demographics.location} />
                <InfoRow label="Country" value={demographics.country} />
                <InfoRow label="Education" value={demographics.education} />
                <InfoRow label="Marital Status" value={demographics.maritalStatus} />
                <InfoRow
                  label="Children"
                  value={
                    demographics.hasChildren !== undefined
                      ? demographics.hasChildren
                        ? `Yes${demographics.numberOfChildren ? ` (${demographics.numberOfChildren})` : ""}`
                        : "No"
                      : undefined
                  }
                />
                <InfoRow label="Household Size" value={demographics.householdSize ? `${demographics.householdSize} people` : undefined} />
                <InfoRow label="Annual Income" value={demographics.income ? formatCurrency(demographics.income) : undefined} />
                <InfoRow label="Ethnicity" value={demographics.ethnicity} />
                <InfoRow label="Life Stage" value={demographics.lifeStage ? demographics.lifeStage.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) : undefined} />
              </div>
            </CollapsibleSection>
          )}

          {/* Census Validation Section */}
          {(() => {
            const censusValidation = persona.generation_params?.censusValidation as CensusValidationData | undefined;
            if (censusValidation && censusValidation.locationFound) {
              const score = censusValidation.realismScore;
              const scoreColor =
                score >= 80
                  ? "var(--color-plasma-emerald)"
                  : score >= 50
                    ? "var(--color-plasma-amber)"
                    : "var(--color-plasma-rose)";
              const scoreBg =
                score >= 80
                  ? "rgba(16, 185, 129, 0.15)"
                  : score >= 50
                    ? "rgba(245, 158, 11, 0.15)"
                    : "rgba(244, 63, 94, 0.15)";
              return (
                <CollapsibleSection title="Census Validation" icon={<CensusIcon />} defaultExpanded={false}>
                  <div className="section-data">
                    <div className="census-score-header">
                      <div className="census-score-pill" style={{ background: scoreBg, color: scoreColor }}>
                        {score}% Realism
                      </div>
                      {censusValidation.censusData.totalPopulation && (
                        <span className="census-population">
                          {censusValidation.placeName} — pop. {censusValidation.censusData.totalPopulation.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {censusValidation.comparisons.income && (
                      <InfoRow
                        label="Income"
                        value={`$${censusValidation.comparisons.income.personaValue.toLocaleString()} vs $${censusValidation.comparisons.income.censusMedian.toLocaleString()} median (${censusValidation.comparisons.income.ratio}x)`}
                      />
                    )}

                    {censusValidation.comparisons.age && (
                      <InfoRow
                        label="Age"
                        value={`${censusValidation.comparisons.age.personaValue} vs ${censusValidation.comparisons.age.censusMedian} median (${censusValidation.comparisons.age.assessment})`}
                      />
                    )}

                    {censusValidation.comparisons.householdSize && (
                      <InfoRow
                        label="Household Size"
                        value={`${censusValidation.comparisons.householdSize.personaValue} vs ${censusValidation.comparisons.householdSize.censusAverage} avg (${censusValidation.comparisons.householdSize.assessment.toLowerCase()})`}
                      />
                    )}

                    {censusValidation.comparisons.education && (
                      <InfoRow
                        label="Education"
                        value={`${censusValidation.comparisons.education.personaLevel} — ${censusValidation.comparisons.education.percentWithSameOrHigher}% of locals have same or higher`}
                      />
                    )}

                    {censusValidation.notes.length > 0 && (
                      <div className="census-notes">
                        {censusValidation.notes.map((note, i) => (
                          <p key={i} className="census-note">{note}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              );
            }

            // No census data yet — show validate button
            return (
              <div className="census-validate-prompt">
                <button
                  className="btn-validate-census"
                  onClick={handleCensusValidation}
                  disabled={isValidatingCensus}
                >
                  {isValidatingCensus ? (
                    <>
                      <div className="btn-spinner" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <CensusIcon />
                      Validate Against Census
                    </>
                  )}
                </button>
              </div>
            );
          })()}

          {/* Professional Section */}
          {professional && (
            <CollapsibleSection title="Professional" icon={<ProfessionalIcon />}>
              <div className="section-data">
                <InfoRow label="Job Title" value={professional.jobTitle} />
                <InfoRow label="Occupation" value={professional.occupation} />
                <InfoRow label="Industry" value={professional.industry} />
                <InfoRow label="Company" value={professional.company} />
                <InfoRow label="Company Size" value={professional.companySize} />
                <InfoRow label="Experience" value={professional.yearsExperience !== undefined ? `${professional.yearsExperience} years` : undefined} />
                <InfoRow label="Work Style" value={professional.workStyle} />
                <InfoRow label="Weekly Hours" value={professional.weeklyWorkHours !== undefined ? `${professional.weeklyWorkHours} hours` : undefined} />
                <InfoRow label="Commute" value={professional.commuteMinutes !== undefined ? `${professional.commuteMinutes} minutes` : undefined} />
                <TagsList label="Career Goals" items={professional.careerGoals} />
              </div>
            </CollapsibleSection>
          )}

          {/* Psychographics Section */}
          {psychographics && (
            <CollapsibleSection title="Psychographics" icon={<PsychographicsIcon />}>
              <div className="section-data">
                <TagsList label="Core Values" items={psychographics.values} />
                <TagsList label="Motivations" items={psychographics.motivations} />
                <TagsList label="Fears & Concerns" items={psychographics.fears} />
                <TagsList label="Aspirations" items={psychographics.aspirations} />
                <TagsList label="Personality Traits" items={psychographics.personalityTraits} />
                <TagsList label="Attitudes" items={psychographics.attitudes} />
              </div>
            </CollapsibleSection>
          )}

          {/* Lifestyle Section */}
          {lifestyle && (
            <CollapsibleSection title="Lifestyle" icon={<LifestyleIcon />}>
              <div className="section-data">
                <TagsList label="Hobbies" items={lifestyle.hobbies} />
                <TagsList label="Interests" items={lifestyle.interests} />
                <TagsList label="Activities" items={lifestyle.activities} />
                <TagsList label="Sports" items={lifestyle.sports} />
                <TagsList label="Travel" items={lifestyle.travel} />
                <InfoRow label="Diet" value={lifestyle.diet} />
                <InfoRow label="Fitness Level" value={lifestyle.fitnessLevel} />
                <InfoRow label="Wake Time" value={lifestyle.wakeTime} />
                <InfoRow label="Sleep Time" value={lifestyle.sleepTime} />
              </div>
            </CollapsibleSection>
          )}

          {/* Media & Tech Section */}
          {media_tech && (
            <CollapsibleSection title="Media & Tech" icon={<MediaTechIcon />}>
              <div className="section-data">
                <TagsList label="Social Platforms" items={media_tech.socialPlatforms} />
                <InfoRow label="Primary Platform" value={media_tech.primaryPlatform} />
                <TagsList label="News Sources" items={media_tech.newsSources} />
                <TagsList label="Podcasts/Streaming" items={media_tech.podcastsStreaming} />
                <TagsList label="Devices" items={media_tech.devices} />
                <InfoRow label="Primary Device" value={media_tech.primaryDevice} />
                <TagsList label="Content Preferences" items={media_tech.contentPreferences} />
                <InfoRow label="Screen Time" value={media_tech.screenTime} />
                <TagsList label="Influencers Followed" items={media_tech.influencersFollowed} />
              </div>
            </CollapsibleSection>
          )}

          {/* Buying Behavior Section */}
          {buying_behavior && (
            <CollapsibleSection title="Buying Behavior" icon={<BuyingBehaviorIcon />}>
              <div className="section-data">
                <TagsList label="Shopping Preferences" items={buying_behavior.shoppingPreferences} />
                <InfoRow label="Primary Channel" value={buying_behavior.primaryChannel} />
                <InfoRow label="Price Sensitivity" value={buying_behavior.priceSensitivity} />
                <InfoRow label="Brand Loyalty" value={buying_behavior.brandLoyalty} />
                <TagsList label="Decision Factors" items={buying_behavior.decisionFactors} />
                <InfoRow label="Purchase Frequency" value={buying_behavior.purchaseFrequency} />
                <InfoRow label="Research Behavior" value={buying_behavior.researchBehavior} />
                <TagsList label="Current Brands" items={buying_behavior.currentBrands} />
                <InfoRow
                  label="Avg Monthly Spend"
                  value={buying_behavior.averageMonthlySpend !== undefined ? formatCurrency(buying_behavior.averageMonthlySpend) : undefined}
                />
                <TagsList label="Purchase Triggers" items={buying_behavior.purchaseTriggers} />
              </div>
            </CollapsibleSection>
          )}

          {/* Media Affinity Rankings Section */}
          {persona.media_profile && persona.media_profile.platformRankings && persona.media_profile.platformRankings.length > 0 && (
            <CollapsibleSection title="Media Affinity Rankings" icon={<MediaAffinityIcon />}>
              <div className="section-data">
                <p className="affinity-explainer">Index 100 = average. Higher = stronger affinity for this persona.</p>
                <div className="platform-rankings-table">
                  <div className="rankings-header">
                    <span>Platform</span>
                    <span>Affinity</span>
                    <span>Confidence</span>
                    <span>Reach</span>
                    <span>Engagement</span>
                  </div>
                  {persona.media_profile.platformRankings.map((pr, i) => {
                    const indexColor = pr.affinityIndex > 120
                      ? "var(--color-plasma-emerald)"
                      : pr.affinityIndex < 80
                        ? "var(--color-plasma-rose)"
                        : "var(--color-text-secondary)";
                    return (
                      <div key={i} className="rankings-row">
                        <span className="platform-name">{pr.platform}</span>
                        <span className="affinity-index" style={{ color: indexColor, fontWeight: 600 }}>{pr.affinityIndex}</span>
                        <span className="confidence-bar-cell">
                          <div className="confidence-bar-track">
                            <div className="confidence-bar-fill" style={{ width: `${Math.round(pr.confidence * 100)}%` }} />
                          </div>
                          <span className="confidence-value">{Math.round(pr.confidence * 100)}%</span>
                        </span>
                        <span className={`level-badge level-${pr.reach}`}>{pr.reach}</span>
                        <span className={`level-badge level-${pr.engagement}`}>{pr.engagement}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Daypart Recommendations Section */}
          {persona.media_profile && persona.media_profile.daypartRecommendations && persona.media_profile.daypartRecommendations.length > 0 && (
            <CollapsibleSection title="Daypart Recommendations" icon={<DaypartIcon />}>
              <div className="section-data">
                <div className="daypart-grid">
                  {persona.media_profile.daypartRecommendations.map((dp, i) => {
                    const indexColor = dp.affinityIndex > 120
                      ? "var(--color-plasma-emerald)"
                      : dp.affinityIndex < 80
                        ? "var(--color-plasma-rose)"
                        : "var(--color-text-secondary)";
                    return (
                      <div key={i} className="daypart-card">
                        <div className="daypart-header">
                          <span className="daypart-name">{dp.daypart.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                          <span className="daypart-affinity" style={{ color: indexColor }}>{dp.affinityIndex}</span>
                        </div>
                        <span className="daypart-time">{dp.timeRange}</span>
                        <div className="daypart-platforms">
                          {dp.bestPlatforms.map((p, j) => (
                            <span key={j} className="tag">{p}</span>
                          ))}
                        </div>
                        <p className="daypart-reasoning">{dp.reasoning}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Genre & Content Alignment Section */}
          {persona.media_profile && (
            (persona.media_profile.genreAlignment?.length ?? 0) > 0 ||
            (persona.media_profile.contentFormatRankings?.length ?? 0) > 0
          ) && (
            <CollapsibleSection title="Genre & Content Alignment" icon={<GenreIcon />}>
              <div className="section-data">
                {persona.media_profile.genreAlignment && persona.media_profile.genreAlignment.length > 0 && (
                  <>
                    <span className="subsection-label">Genre Alignment</span>
                    <div className="genre-cards">
                      {persona.media_profile.genreAlignment.map((ga, i) => (
                        <div key={i} className="genre-card">
                          <div className="genre-header">
                            <span className="genre-name">{ga.genre}</span>
                            <span className="genre-affinity" style={{
                              color: ga.affinityIndex > 120 ? "var(--color-plasma-emerald)"
                                : ga.affinityIndex < 80 ? "var(--color-plasma-rose)"
                                : "var(--color-text-secondary)"
                            }}>{ga.affinityIndex}</span>
                            <span className={`level-badge level-${ga.relevance}`}>{ga.relevance}</span>
                          </div>
                          <div className="genre-platforms">
                            {ga.platforms.map((p, j) => (
                              <span key={j} className="tag">{p}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {persona.media_profile.contentFormatRankings && persona.media_profile.contentFormatRankings.length > 0 && (
                  <>
                    <span className="subsection-label" style={{ marginTop: "1rem" }}>Content Format Rankings</span>
                    <div className="format-bars">
                      {persona.media_profile.contentFormatRankings.map((cf, i) => (
                        <div key={i} className="format-bar-row">
                          <span className="format-name">{cf.format.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                          <div className="format-bar-track">
                            <div
                              className="format-bar-fill"
                              style={{
                                width: `${Math.min(100, (cf.affinityIndex / 200) * 100)}%`,
                                background: cf.affinityIndex > 120
                                  ? "linear-gradient(90deg, var(--color-plasma-emerald), #059669)"
                                  : cf.affinityIndex < 80
                                    ? "linear-gradient(90deg, var(--color-plasma-rose), #be123c)"
                                    : "linear-gradient(90deg, var(--color-plasma-violet), var(--color-plasma-purple))",
                              }}
                            />
                          </div>
                          <span className="format-score">{cf.affinityIndex}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Creative Messaging Insights Section */}
          {persona.creative_messaging && (
            <CollapsibleSection title="Creative Messaging Insights" icon={<CreativeMessagingIcon />}>
              <div className="section-data">
                {/* Language Profile */}
                {persona.creative_messaging.languageProfile && (
                  <>
                    <span className="subsection-label">Language Profile</span>
                    <div className="language-profile">
                      <InfoRow label="Tone" value={persona.creative_messaging.languageProfile.tone?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} />
                      <InfoRow label="Sentence Style" value={persona.creative_messaging.languageProfile.sentenceStyle?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} />
                      <InfoRow label="Reading Level" value={persona.creative_messaging.languageProfile.readingLevel?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} />
                      {persona.creative_messaging.languageProfile.vocabulary && persona.creative_messaging.languageProfile.vocabulary.length > 0 && (
                        <div className="tags-section">
                          <span className="tags-label">Resonant Words</span>
                          <div className="tags-list">
                            {persona.creative_messaging.languageProfile.vocabulary.map((w, i) => (
                              <span key={i} className="tag">{w}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {persona.creative_messaging.languageProfile.avoidWords && persona.creative_messaging.languageProfile.avoidWords.length > 0 && (
                        <div className="tags-section">
                          <span className="tags-label">Words to Avoid</span>
                          <div className="tags-list">
                            {persona.creative_messaging.languageProfile.avoidWords.map((w, i) => (
                              <span key={i} className="tag tag-avoid">{w}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Messaging Themes */}
                {persona.creative_messaging.messagingThemes && persona.creative_messaging.messagingThemes.length > 0 && (
                  <>
                    <span className="subsection-label" style={{ marginTop: "1rem" }}>Messaging Themes</span>
                    <div className="messaging-themes">
                      {persona.creative_messaging.messagingThemes.map((mt, i) => (
                        <div key={i} className="theme-card">
                          <div className="theme-header">
                            <span className="theme-name">{mt.theme}</span>
                            <span className={`level-badge level-${mt.relevance}`}>{mt.relevance}</span>
                          </div>
                          <p className="theme-angle">{mt.messagingAngle}</p>
                          {mt.sampleHeadlines && mt.sampleHeadlines.length > 0 && (
                            <div className="sample-headlines">
                              {mt.sampleHeadlines.map((h, j) => (
                                <p key={j} className="headline-sample">&ldquo;{h}&rdquo;</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Proof Points */}
                {persona.creative_messaging.proofPoints && persona.creative_messaging.proofPoints.length > 0 && (
                  <>
                    <span className="subsection-label" style={{ marginTop: "1rem" }}>Proof Points</span>
                    <div className="proof-points">
                      {persona.creative_messaging.proofPoints.map((pp, i) => (
                        <div key={i} className="proof-point-card">
                          <div className="proof-header">
                            <span className="proof-type-badge">{pp.type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                            <span className={`level-badge level-${pp.effectiveness}`}>{pp.effectiveness}</span>
                          </div>
                          <p className="proof-description">{pp.description}</p>
                          {pp.examples && pp.examples.length > 0 && (
                            <div className="proof-examples">
                              {pp.examples.map((ex, j) => (
                                <span key={j} className="proof-example">{ex}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* CTA Style */}
                {persona.creative_messaging.callToActionStyle && (
                  <>
                    <span className="subsection-label" style={{ marginTop: "1rem" }}>Call to Action Style</span>
                    <InfoRow label="Style" value={persona.creative_messaging.callToActionStyle.style?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} />
                    {persona.creative_messaging.callToActionStyle.examples && persona.creative_messaging.callToActionStyle.examples.length > 0 && (
                      <div className="cta-examples">
                        {persona.creative_messaging.callToActionStyle.examples.map((cta, i) => (
                          <span key={i} className="cta-example">&ldquo;{cta}&rdquo;</span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Visual Preferences */}
                {persona.creative_messaging.visualPreferences && (
                  <>
                    <span className="subsection-label" style={{ marginTop: "1rem" }}>Visual Preferences</span>
                    <InfoRow label="Style" value={persona.creative_messaging.visualPreferences.style?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} />
                    {persona.creative_messaging.visualPreferences.colorSensitivity && persona.creative_messaging.visualPreferences.colorSensitivity.length > 0 && (
                      <div className="tags-section">
                        <span className="tags-label">Color Sensitivity</span>
                        <div className="tags-list">
                          {persona.creative_messaging.visualPreferences.colorSensitivity.map((c, i) => (
                            <span key={i} className="tag">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {persona.creative_messaging.visualPreferences.imageryTypes && persona.creative_messaging.visualPreferences.imageryTypes.length > 0 && (
                      <div className="tags-section">
                        <span className="tags-label">Imagery Types</span>
                        <div className="tags-list">
                          {persona.creative_messaging.visualPreferences.imageryTypes.map((it, i) => (
                            <span key={i} className="tag">{it.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Beliefs & Attitudes Section */}
          {beliefs_attitudes && (
            <CollapsibleSection title="Beliefs & Attitudes" icon={<BeliefsIcon />} defaultExpanded={false}>
              <div className="section-data">
                <TagsList label="Category Beliefs" items={beliefs_attitudes.categoryBeliefs} />
                {beliefs_attitudes.advertisingAttitude && (
                  <div className="text-block">
                    <span className="text-label">Advertising Attitude</span>
                    <p className="text-content">{beliefs_attitudes.advertisingAttitude}</p>
                  </div>
                )}
                {beliefs_attitudes.socialConsciousness && (
                  <div className="text-block">
                    <span className="text-label">Social Consciousness</span>
                    <p className="text-content">{beliefs_attitudes.socialConsciousness}</p>
                  </div>
                )}
                {beliefs_attitudes.trustLevel && (
                  <div className="text-block">
                    <span className="text-label">Trust Level</span>
                    <p className="text-content">{beliefs_attitudes.trustLevel}</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          personaName={persona.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isDeleting}
        />
      )}

      <style>{`
        .persona-detail-page {
          max-width: 1200px;
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
          color: var(--color-text-muted);
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .back-link:hover {
          color: var(--color-text-primary);
        }

        .header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .btn-build-audience,
        .btn-edit,
        .btn-delete {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
        }

        .btn-build-audience {
          background: linear-gradient(135deg, var(--color-plasma-emerald), #059669);
          color: white;
          border: none;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }
        .btn-build-audience:hover {
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }

        .btn-edit {
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }
        .btn-edit:hover {
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.4);
          transform: translateY(-1px);
        }

        .btn-delete {
          background: rgba(255, 255, 255, 0.03);
          color: var(--color-plasma-rose);
          border: 1px solid rgba(244, 63, 94, 0.3);
        }
        .btn-delete:hover {
          background: rgba(244, 63, 94, 0.1);
          border-color: rgba(244, 63, 94, 0.5);
        }

        /* Content Grid */
        .content-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 2rem;
        }

        /* Left Column */
        .left-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .photo-container {
          aspect-ratio: 1;
          background: linear-gradient(135deg, var(--color-plasma-violet) 0%, var(--color-plasma-purple) 100%);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
        }

        .persona-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .photo-placeholder span {
          font-size: 0.9375rem;
        }

        .photo-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: white;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .photo-overlay--button {
          background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
          opacity: 0;
        }
        .photo-container:hover .photo-overlay--button {
          opacity: 1;
        }
        .photo-overlay--button:hover {
          background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.2) 100%);
        }

        .photo-overlay--loading {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          top: 0;
          cursor: default;
        }

        .photo-regen-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .quote-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1.25rem;
          position: relative;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .quote-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }

        .quote-icon {
          color: rgba(139, 92, 246, 0.4);
          margin-bottom: 0.5rem;
        }

        .quote-text {
          font-size: 1.0625rem;
          font-style: italic;
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .backstory-card,
        .day-in-life-card,
        .validation-notes-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .backstory-card:hover,
        .day-in-life-card:hover,
        .validation-notes-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }

        .card-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 0.75rem;
        }

        .backstory-text,
        .day-in-life-text,
        .validation-notes-text {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          line-height: 1.7;
          margin: 0;
          white-space: pre-wrap;
        }

        .validation-notes-card {
          background: rgba(251, 191, 36, 0.08);
          border-color: rgba(251, 191, 36, 0.2);
        }
        .validation-notes-card:hover {
          border-color: rgba(251, 191, 36, 0.3);
        }

        .metadata-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1rem 1.25rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .metadata-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }

        .metadata-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.8125rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .metadata-row:last-child {
          border-bottom: none;
        }
        .metadata-row span:first-child {
          color: var(--color-text-muted);
        }
        .metadata-row span:last-child {
          color: var(--color-text-secondary);
        }
        .metadata-row .mono {
          font-family: monospace;
          font-size: 0.75rem;
        }

        /* Right Column */
        .right-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-data {
          padding-top: 0.75rem;
        }

        .text-block {
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .text-block:last-child {
          border-bottom: none;
        }
        .text-label {
          display: block;
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: 0.375rem;
        }
        .text-content {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        /* Census Validation */
        .census-score-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          flex-wrap: wrap;
        }
        .census-score-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.875rem;
          border-radius: 999px;
          font-size: 0.9375rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .census-population {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
        }
        .census-notes {
          padding: 0.75rem 0;
        }
        .census-note {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0 0 0.375rem;
        }
        .census-note:last-child {
          margin-bottom: 0;
        }
        .census-validate-prompt {
          display: flex;
          justify-content: center;
          padding: 0;
        }
        .btn-validate-census {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 10px;
          color: var(--color-plasma-violet);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
          justify-content: center;
        }
        .btn-validate-census:hover:not(:disabled) {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-1px);
        }
        .btn-validate-census:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-top-color: var(--color-plasma-violet);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Affinity explainer */
        .affinity-explainer {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          margin: 0 0 1rem;
          font-style: italic;
        }

        /* Platform Rankings Table */
        .platform-rankings-table {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .rankings-header {
          display: grid;
          grid-template-columns: 1.5fr 0.7fr 1.2fr 0.7fr 0.7fr;
          gap: 0.5rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rankings-row {
          display: grid;
          grid-template-columns: 1.5fr 0.7fr 1.2fr 0.7fr 0.7fr;
          gap: 0.5rem;
          padding: 0.625rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          align-items: center;
          font-size: 0.875rem;
        }
        .rankings-row:last-child {
          border-bottom: none;
        }
        .platform-name {
          color: var(--color-text-primary);
          font-weight: 500;
        }
        .confidence-bar-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .confidence-bar-track {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          overflow: hidden;
        }
        .confidence-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-plasma-violet), var(--color-plasma-purple));
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .confidence-value {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          min-width: 30px;
        }

        /* Level badges */
        .level-badge {
          display: inline-flex;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        .level-high {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-plasma-emerald);
        }
        .level-medium {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }
        .level-low {
          background: rgba(244, 63, 94, 0.15);
          color: var(--color-plasma-rose);
        }

        /* Daypart Grid */
        .daypart-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 0.75rem;
        }
        .daypart-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 0.875rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .daypart-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
        }
        .daypart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }
        .daypart-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .daypart-affinity {
          font-size: 1rem;
          font-weight: 700;
        }
        .daypart-time {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          display: block;
          margin-bottom: 0.5rem;
        }
        .daypart-platforms {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }
        .daypart-reasoning {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.4;
          margin: 0;
        }

        /* Subsection labels */
        .subsection-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 0.75rem;
        }

        /* Genre Cards */
        .genre-cards {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .genre-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 0.75rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .genre-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }
        .genre-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .genre-name {
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--color-text-primary);
          flex: 1;
        }
        .genre-affinity {
          font-size: 0.9375rem;
          font-weight: 700;
        }
        .genre-platforms {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        /* Content Format Bars */
        .format-bars {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .format-bar-row {
          display: grid;
          grid-template-columns: 120px 1fr 40px;
          gap: 0.75rem;
          align-items: center;
        }
        .format-name {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }
        .format-bar-track {
          height: 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }
        .format-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        .format-score {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-align: right;
        }

        /* Creative Messaging */
        .tag-avoid {
          background: rgba(244, 63, 94, 0.15) !important;
          color: var(--color-plasma-rose) !important;
          border-color: rgba(244, 63, 94, 0.2) !important;
        }

        /* Messaging Themes */
        .messaging-themes {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .theme-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 0.875rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .theme-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }
        .theme-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .theme-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--color-text-primary);
          flex: 1;
        }
        .theme-angle {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0 0 0.5rem;
        }
        .sample-headlines {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .headline-sample {
          font-size: 0.8125rem;
          color: var(--color-plasma-violet);
          font-style: italic;
          margin: 0;
          padding-left: 0.75rem;
          border-left: 2px solid rgba(139, 92, 246, 0.3);
        }

        /* Proof Points */
        .proof-points {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .proof-point-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 0.875rem;
        }
        .proof-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .proof-type-badge {
          display: inline-flex;
          padding: 0.125rem 0.5rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .proof-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0 0 0.5rem;
        }
        .proof-examples {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        .proof-example {
          display: inline-flex;
          padding: 0.25rem 0.625rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }

        /* CTA Examples */
        .cta-examples {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.5rem 0;
        }
        .cta-example {
          display: inline-flex;
          padding: 0.375rem 0.75rem;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08));
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          font-size: 0.875rem;
          color: var(--color-plasma-violet);
          font-style: italic;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .left-column {
            max-width: 400px;
            margin: 0 auto;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .header-row {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            justify-content: flex-start;
          }

          .header-info {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
