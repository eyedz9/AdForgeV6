/**
 * GeneratePersonaModal Component
 *
 * Two-step suggestion-review flow for persona generation.
 *
 * Flow:
 *   Form -> Generating Suggestions -> Review Suggestions -> Done
 *
 * - "Generate Suggestions" calls /api/generate/persona-suggestions
 *   to create lightweight suggestion cards (NOT saved to DB).
 * - User reviews each card: Accept / Reject / Regenerate
 * - Accept calls /api/generate/persona-from-suggestion (creates full persona + portrait)
 * - Reject removes from view
 * - Regenerate replaces with a new suggestion
 * - "Accept All" processes all remaining suggestions
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getProducts } from "@/app/actions/products";
import type { Product, IntelligenceReport } from "@/lib/supabase/database.types";

// ─── Types ────────────────────────────────────────────────────────────

interface Demographics {
  age: number;
  gender: string;
  location: string;
  income: string;
  occupation: string;
}

interface Psychographics {
  values: string[];
  motivations: string[];
  painPoints: string[];
  aspirations: string[];
}

interface Behaviors {
  purchaseDrivers: string[];
  preferredChannels: string[];
  decisionStyle: string;
}

interface PersonaSuggestion {
  name: string;
  archetype: string;
  headline: string;
  demographics: Demographics;
  psychographics: Psychographics;
  behaviors: Behaviors;
  relevanceScore: number;
  reasoning: string;
  censusScore?: number;
  censusPlaceName?: string;
}

type CardStatus = "idle" | "accepting" | "regenerating" | "accepted" | "rejected";

interface SuggestionCard {
  id: string; // client-side identifier
  suggestion: PersonaSuggestion;
  status: CardStatus;
}

interface IntelligenceReportsApiResponse {
  reports: IntelligenceReport[];
}

type ModalState = "form" | "generating" | "reviewing" | "done";

interface GeneratePersonaModalProps {
  brandId: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────

let _idCounter = 0;
function nextId() {
  return `suggestion-${Date.now()}-${++_idCounter}`;
}

function RelevanceIndicator({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const getColor = () => {
    if (percentage >= 80) return "#10b981";
    if (percentage >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="sg-relevance">
      <div className="sg-relevance-bar">
        <div
          className="sg-relevance-fill"
          style={{ width: `${percentage}%`, backgroundColor: getColor() }}
        />
      </div>
      <span className="sg-relevance-text" style={{ color: getColor() }}>
        {percentage}%
      </span>
    </div>
  );
}

function CensusScoreIndicator({
  score,
  placeName,
}: {
  score?: number;
  placeName?: string;
}) {
  if (score == null) return null;

  const getColor = () => {
    if (score >= 85) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="sg-census-score" title={placeName ? `Census data: ${placeName}` : "Census realism score"}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={getColor()} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <div className="sg-census-bar">
        <div
          className="sg-census-fill"
          style={{ width: `${score}%`, backgroundColor: getColor() }}
        />
      </div>
      <span className="sg-census-label" style={{ color: getColor() }}>
        {score}%
      </span>
    </div>
  );
}

// ─── Suggestion Card ──────────────────────────────────────────────────

function SuggestionCardView({
  card,
  onAccept,
  onReject,
  onRegenerate,
}: {
  card: SuggestionCard;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
}) {
  const { suggestion, status } = card;
  const isLoading = status === "accepting" || status === "regenerating";

  return (
    <div className={`sg-card ${status === "accepted" ? "sg-card-accepted" : ""}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="sg-card-loading-overlay">
          <div className="sg-card-spinner" />
          <span>{status === "accepting" ? "Creating persona..." : "Regenerating..."}</span>
        </div>
      )}

      {/* Header */}
      <div className="sg-card-header">
        <div className="sg-avatar">
          {suggestion.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div className="sg-card-info">
          <h4 className="sg-card-name">{suggestion.name}</h4>
          <span className="sg-card-archetype">{suggestion.archetype}</span>
        </div>
        <RelevanceIndicator score={suggestion.relevanceScore} />
      </div>

      {/* Headline */}
      <p className="sg-card-headline">{suggestion.headline}</p>

      {/* Demographics grid */}
      <div className="sg-section">
        <h5 className="sg-section-label">Demographics</h5>
        <div className="sg-demo-grid">
          <div className="sg-demo-item">
            <span className="sg-demo-label">Age</span>
            <span className="sg-demo-value">{suggestion.demographics.age}</span>
          </div>
          <div className="sg-demo-item">
            <span className="sg-demo-label">Gender</span>
            <span className="sg-demo-value">{suggestion.demographics.gender}</span>
          </div>
          <div className="sg-demo-item">
            <span className="sg-demo-label">Location</span>
            <span className="sg-demo-value">{suggestion.demographics.location}</span>
          </div>
          <div className="sg-demo-item">
            <span className="sg-demo-label">Income</span>
            <span className="sg-demo-value">{suggestion.demographics.income}</span>
          </div>
          <div className="sg-demo-item sg-demo-full">
            <span className="sg-demo-label">Occupation</span>
            <span className="sg-demo-value">{suggestion.demographics.occupation}</span>
          </div>
        </div>
        <CensusScoreIndicator
          score={suggestion.censusScore}
          placeName={suggestion.censusPlaceName}
        />
      </div>

      {/* Psychographics tags */}
      <div className="sg-section">
        <h5 className="sg-section-label">Psychographics</h5>
        <div className="sg-tags-group">
          {suggestion.psychographics.values.length > 0 && (
            <div className="sg-tags-row">
              <span className="sg-tags-label">Values</span>
              <div className="sg-tag-list">
                {suggestion.psychographics.values.slice(0, 3).map((v, i) => (
                  <span key={i} className="sg-tag sg-tag-value">{v}</span>
                ))}
              </div>
            </div>
          )}
          {suggestion.psychographics.painPoints.length > 0 && (
            <div className="sg-tags-row">
              <span className="sg-tags-label">Pain Points</span>
              <div className="sg-tag-list">
                {suggestion.psychographics.painPoints.slice(0, 3).map((p, i) => (
                  <span key={i} className="sg-tag sg-tag-pain">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reasoning */}
      <div className="sg-section">
        <h5 className="sg-section-label">Why This Persona?</h5>
        <p className="sg-reasoning">{suggestion.reasoning}</p>
      </div>

      {/* Action buttons */}
      {status === "idle" && (
        <div className="sg-card-actions">
          <button className="sg-btn sg-btn-accept" onClick={onAccept}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Accept
          </button>
          <button className="sg-btn sg-btn-regenerate" onClick={onRegenerate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Regenerate
          </button>
          <button className="sg-btn sg-btn-reject" onClick={onReject}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Reject
          </button>
        </div>
      )}

      {status === "accepted" && (
        <div className="sg-card-accepted-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Persona created
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export default function GeneratePersonaModal({
  brandId,
  isOpen,
  onClose,
  onGenerated,
}: GeneratePersonaModalProps) {
  // Data loading state
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<IntelligenceReport[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [personaCount, setPersonaCount] = useState(3);

  // Flow state
  const [modalState, setModalState] = useState<ModalState>("form");
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<SuggestionCard[]>([]);
  const [acceptedCount, setAcceptedCount] = useState(0);

  // Track if accept-all is running
  const acceptAllRef = useRef(false);

  // ─── Data Loading ─────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [productsResult, reportsResponse] = await Promise.all([
        getProducts(brandId),
        fetch(`/api/generate/intelligence?brand_id=${brandId}`),
      ]);

      if (productsResult.success) {
        setProducts(productsResult.data);
        if (productsResult.data.length === 1) {
          setSelectedProductId(productsResult.data[0].id);
        }
      } else {
        setProducts([]);
      }

      if (reportsResponse.ok) {
        const reportsData: IntelligenceReportsApiResponse =
          await reportsResponse.json();
        const activeReports = (reportsData.reports || []).filter(
          (r) => r.status === "active"
        );
        setReports(activeReports);
        if (activeReports.length === 1) {
          setSelectedReportId(activeReports[0].id);
        }
      } else {
        setReports([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }

    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setModalState("form");
      setCards([]);
      setAcceptedCount(0);
      setSelectedProductId("");
      setSelectedReportId("");
      setPersonaCount(3);
      setError(null);
      acceptAllRef.current = false;
    }
  }, [isOpen, fetchData]);

  // ─── Generate Suggestions ────────────────────────────────────────

  const handleGenerateSuggestions = async () => {
    if (products.length > 1 && !selectedProductId) {
      setError("Please select a product");
      return;
    }
    if (!selectedReportId) {
      setError("Please select an intelligence report");
      return;
    }

    setModalState("generating");
    setError(null);

    try {
      const response = await fetch("/api/generate/persona-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brandId,
          product_id:
            selectedProductId ||
            (products.length === 1 ? products[0].id : null),
          intelligence_report_id: selectedReportId,
          count: personaCount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to generate suggestions");
        setModalState("form");
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.suggestions)) {
        setCards(
          data.suggestions.map((s: PersonaSuggestion) => ({
            id: nextId(),
            suggestion: s,
            status: "idle" as CardStatus,
          }))
        );
        setModalState("reviewing");
      } else {
        setError("No suggestions returned");
        setModalState("form");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate suggestions");
      setModalState("form");
    }
  };

  // ─── Card Actions ─────────────────────────────────────────────────

  const updateCard = (id: string, updates: Partial<SuggestionCard>) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleAccept = async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status !== "idle") return;

    updateCard(cardId, { status: "accepting" });

    try {
      const response = await fetch("/api/generate/persona-from-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          suggestion: {
            name: card.suggestion.name,
            archetype: card.suggestion.archetype,
            age: card.suggestion.demographics.age,
            gender: card.suggestion.demographics.gender,
            location: card.suggestion.demographics.location,
            income: card.suggestion.demographics.income,
            occupation: card.suggestion.demographics.occupation,
            values: card.suggestion.psychographics.values,
            motivations: card.suggestion.psychographics.motivations,
            painPoints: card.suggestion.psychographics.painPoints,
            aspirations: card.suggestion.psychographics.aspirations,
            purchaseDrivers: card.suggestion.behaviors.purchaseDrivers,
            preferredChannels: card.suggestion.behaviors.preferredChannels,
            decisionStyle: card.suggestion.behaviors.decisionStyle,
            relevanceScore: card.suggestion.relevanceScore,
            intelligenceReportId: selectedReportId || undefined,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        updateCard(cardId, { status: "idle" });
        setError(data.error || `Failed to create persona "${card.suggestion.name}"`);
        return;
      }

      updateCard(cardId, { status: "accepted" });
      setAcceptedCount((prev) => prev + 1);
    } catch (err) {
      updateCard(cardId, { status: "idle" });
      setError(
        err instanceof Error
          ? err.message
          : `Failed to create persona "${card.suggestion.name}"`
      );
    }
  };

  const handleReject = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleRegenerate = async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status !== "idle") return;

    updateCard(cardId, { status: "regenerating" });

    // Collect all current suggestion names to exclude
    const excludeNames = cards.map((c) => c.suggestion.name);

    try {
      const response = await fetch(
        "/api/generate/persona-suggestions/regenerate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand_id: brandId,
            product_id:
              selectedProductId ||
              (products.length === 1 ? products[0].id : null),
            intelligence_report_id: selectedReportId || null,
            exclude_names: excludeNames,
          }),
        }
      );

      if (!response.ok) {
        updateCard(cardId, { status: "idle" });
        const data = await response.json();
        setError(data.error || "Failed to regenerate suggestion");
        return;
      }

      const data = await response.json();
      if (data.success && data.suggestion) {
        updateCard(cardId, {
          suggestion: data.suggestion,
          status: "idle",
        });
      } else {
        updateCard(cardId, { status: "idle" });
        setError("Regeneration returned no data");
      }
    } catch (err) {
      updateCard(cardId, { status: "idle" });
      setError(
        err instanceof Error ? err.message : "Failed to regenerate"
      );
    }
  };

  const handleAcceptAll = async () => {
    acceptAllRef.current = true;
    const idleCards = cards.filter((c) => c.status === "idle");
    for (const card of idleCards) {
      if (!acceptAllRef.current) break;
      await handleAccept(card.id);
    }
    acceptAllRef.current = false;
  };

  // ─── Close Logic ──────────────────────────────────────────────────

  const handleClose = () => {
    acceptAllRef.current = false;
    if (acceptedCount > 0) {
      onGenerated();
    }
    onClose();
  };

  // ─── Derived state ────────────────────────────────────────────────

  const visibleCards = cards.filter((c) => c.status !== "rejected");
  const idleCards = visibleCards.filter((c) => c.status === "idle");
  const anyLoading = visibleCards.some(
    (c) => c.status === "accepting" || c.status === "regenerating"
  );

  // ─── Report helpers ───────────────────────────────────────────────

  const formatReportDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const isReportExpired = (report: IntelligenceReport) => {
    if (!report.expires_at) return false;
    return new Date(report.expires_at) < new Date();
  };

  if (!isOpen) return null;

  return (
    <div className="sg-modal-overlay" onClick={handleClose}>
      <div
        className={`sg-modal-content ${modalState === "reviewing" ? "sg-modal-wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sg-modal-header">
          <h3>
            {modalState === "reviewing"
              ? "Review Persona Suggestions"
              : "Generate Personas"}
          </h3>
          <button
            className="sg-modal-close"
            onClick={handleClose}
            disabled={modalState === "generating"}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="sg-modal-body">
          {/* Loading options */}
          {loading && (
            <div className="sg-loading">
              <div className="sg-spinner" />
              <p>Loading options...</p>
            </div>
          )}

          {/* Generating state */}
          {modalState === "generating" && (
            <div className="sg-generating">
              <div className="sg-generating-orb">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sg-generating-icon">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h4>Generating {personaCount} suggestion{personaCount !== 1 ? "s" : ""}...</h4>
              <p className="sg-generating-msg">
                Analyzing brand context and market intelligence to create persona
                suggestions for your review.
              </p>
              <div className="sg-generating-steps">
                <div className="sg-step sg-step-active">
                  <span className="sg-step-dot" />
                  Analyzing brand context
                </div>
                <div className="sg-step sg-step-active">
                  <span className="sg-step-dot" />
                  Processing market intelligence
                </div>
                <div className="sg-step sg-step-active">
                  <span className="sg-step-dot" />
                  Crafting suggestions
                </div>
                <div className="sg-step sg-step-active">
                  <span className="sg-step-dot" />
                  Validating against US Census data
                </div>
              </div>
            </div>
          )}

          {/* Review state */}
          {modalState === "reviewing" && (
            <div className="sg-reviewing">
              {acceptedCount > 0 && (
                <div className="sg-accepted-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {acceptedCount} persona{acceptedCount !== 1 ? "s" : ""} created
                </div>
              )}

              {error && (
                <div className="sg-error-inline">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="sg-error-dismiss">Dismiss</button>
                </div>
              )}

              {visibleCards.length === 0 ? (
                <div className="sg-no-cards">
                  <p>All suggestions have been processed.</p>
                </div>
              ) : (
                <div className="sg-cards-grid">
                  {visibleCards.map((card) => (
                    <SuggestionCardView
                      key={card.id}
                      card={card}
                      onAccept={() => handleAccept(card.id)}
                      onReject={() => handleReject(card.id)}
                      onRegenerate={() => handleRegenerate(card.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form state */}
          {!loading && modalState === "form" && (
            <div className="sg-form">
              {error && (
                <div className="sg-form-error">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {reports.length === 0 && (
                <div className="sg-form-warning">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <strong>No intelligence reports available</strong>
                    <p>Generate a market intelligence report first to create personas with better context.</p>
                  </div>
                </div>
              )}

              {/* Product selection */}
              {products.length > 1 && (
                <div className="sg-form-group">
                  <label htmlFor="sg-product-select">
                    Product <span className="sg-required">*</span>
                  </label>
                  <select
                    id="sg-product-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="sg-form-select"
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <p className="sg-form-hint">Personas will be tailored for this specific product.</p>
                </div>
              )}

              {products.length === 1 && (
                <div className="sg-form-info">
                  <span className="sg-form-info-label">Product:</span>
                  <span className="sg-form-info-value">{products[0].name}</span>
                </div>
              )}

              {products.length === 0 && (
                <div className="sg-form-info">
                  <span className="sg-form-info-label">Product:</span>
                  <span className="sg-form-info-value sg-form-info-none">
                    Brand-level personas (no specific product)
                  </span>
                </div>
              )}

              {/* Report selection */}
              <div className="sg-form-group">
                <label htmlFor="sg-report-select">
                  Intelligence Report <span className="sg-required">*</span>
                </label>
                <select
                  id="sg-report-select"
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="sg-form-select"
                  disabled={reports.length === 0}
                >
                  <option value="">
                    {reports.length === 0
                      ? "No reports available"
                      : "Select an intelligence report..."}
                  </option>
                  {reports.map((report) => (
                    <option
                      key={report.id}
                      value={report.id}
                      disabled={isReportExpired(report)}
                    >
                      {report.report_type || "Market Intelligence"} -{" "}
                      {formatReportDate(report.generated_at)}
                      {isReportExpired(report) ? " (Expired)" : ""}
                    </option>
                  ))}
                </select>
                <p className="sg-form-hint">
                  Market intelligence provides context for more accurate personas.
                </p>
              </div>

              {/* Count selector */}
              <div className="sg-form-group">
                <label>Number of Suggestions</label>
                <div className="sg-count-selector">
                  <button
                    type="button"
                    className="sg-count-btn"
                    onClick={() => setPersonaCount(Math.max(1, personaCount - 1))}
                    disabled={personaCount <= 1}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span className="sg-count-value">{personaCount}</span>
                  <button
                    type="button"
                    className="sg-count-btn"
                    onClick={() => setPersonaCount(Math.min(5, personaCount + 1))}
                    disabled={personaCount >= 5}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
                <p className="sg-form-hint">
                  Generate 1-5 suggestions. Each accepted persona counts toward your monthly quota.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sg-modal-footer">
          {/* Form buttons */}
          {modalState === "form" && (
            <>
              <button className="sg-btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="sg-btn-primary"
                onClick={handleGenerateSuggestions}
                disabled={loading || reports.length === 0}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate Suggestions
              </button>
            </>
          )}

          {/* Generating — disabled close */}
          {modalState === "generating" && (
            <button className="sg-btn-secondary" disabled>
              Generating...
            </button>
          )}

          {/* Reviewing buttons */}
          {modalState === "reviewing" && (
            <>
              {idleCards.length > 1 && (
                <button
                  className="sg-btn-accept-all"
                  onClick={handleAcceptAll}
                  disabled={anyLoading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Accept All ({idleCards.length})
                </button>
              )}
              <button className="sg-btn-done" onClick={handleClose} disabled={anyLoading}>
                Done
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        /* ─── Overlay ──────────────────────────────────────────────── */
        .sg-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        /* ─── Content ──────────────────────────────────────────────── */
        .sg-modal-content {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          max-width: 560px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sg-modal-wide {
          max-width: 820px;
        }

        /* ─── Header ──────────────────────────────────────────────── */
        .sg-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }
        .sg-modal-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .sg-modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px; height: 32px;
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .sg-modal-close:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          color: var(--color-text-primary);
        }
        .sg-modal-close:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ─── Body ─────────────────────────────────────────────────── */
        .sg-modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        /* ─── Footer ──────────────────────────────────────────────── */
        .sg-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        /* ─── Loading ──────────────────────────────────────────────── */
        .sg-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3rem 1rem;
        }
        .sg-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.08);
          border-top-color: var(--color-plasma-violet);
          border-radius: 50%;
          animation: sg-spin 0.8s linear infinite;
        }
        .sg-loading p {
          margin: 1rem 0 0;
          color: var(--color-text-muted);
          font-size: 0.9375rem;
        }
        @keyframes sg-spin { to { transform: rotate(360deg); } }

        /* ─── Generating ───────────────────────────────────────────── */
        .sg-generating {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1rem;
          text-align: center;
        }
        .sg-generating-orb {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          animation: sg-pulse 2s ease-in-out infinite;
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.4);
        }
        .sg-generating-icon { color: white; }
        @keyframes sg-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .sg-generating h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 0.5rem;
        }
        .sg-generating-msg {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0 0 1.5rem;
          max-width: 400px;
          line-height: 1.5;
        }
        .sg-generating-steps {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: left;
        }
        .sg-step {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.875rem; color: var(--color-text-muted);
        }
        .sg-step-active { color: var(--color-plasma-violet); }
        .sg-step-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: currentColor;
        }
        .sg-step-active .sg-step-dot { animation: sg-dot-pulse 1s ease-in-out infinite; }
        @keyframes sg-dot-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* ─── Reviewing ────────────────────────────────────────────── */
        .sg-reviewing {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .sg-accepted-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #34d399;
        }
        .sg-error-inline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #f87171;
          font-size: 0.8125rem;
        }
        .sg-error-inline span { flex: 1; }
        .sg-error-dismiss {
          background: none; border: none;
          color: #f87171; cursor: pointer;
          font-size: 0.75rem; text-decoration: underline;
        }
        .sg-no-cards {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--color-text-muted);
        }
        .sg-no-cards p { margin: 0; }

        /* ─── Cards Grid ───────────────────────────────────────────── */
        .sg-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.25rem;
        }

        /* ─── Card ─────────────────────────────────────────────────── */
        .sg-card {
          position: relative;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sg-card:hover {
          border-color: rgba(139, 92, 246, 0.3);
        }
        .sg-card-accepted {
          border-color: rgba(16, 185, 129, 0.3);
          opacity: 0.7;
        }

        /* Card loading overlay */
        .sg-card-loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(2px);
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          z-index: 2;
          color: var(--color-text-secondary);
          font-size: 0.8125rem;
        }
        .sg-card-spinner {
          width: 28px; height: 28px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--color-plasma-violet);
          border-radius: 50%;
          animation: sg-spin 0.8s linear infinite;
        }

        /* Card header */
        .sg-card-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        .sg-avatar {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }
        .sg-card-info {
          flex: 1;
          min-width: 0;
        }
        .sg-card-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .sg-card-archetype {
          font-size: 0.75rem;
          color: var(--color-plasma-violet);
          font-weight: 500;
        }

        /* Relevance */
        .sg-relevance {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
          flex-shrink: 0;
        }
        .sg-relevance-bar {
          width: 56px; height: 4px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 2px;
          overflow: hidden;
        }
        .sg-relevance-fill { height: 100%; border-radius: 2px; }
        .sg-relevance-text { font-size: 0.625rem; font-weight: 600; }

        /* Census score */
        .sg-census-score {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0;
        }
        .sg-census-bar {
          width: 48px; height: 3px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 2px;
          overflow: hidden;
        }
        .sg-census-fill { height: 100%; border-radius: 2px; }
        .sg-census-label { font-size: 0.5625rem; font-weight: 600; }

        /* Headline */
        .sg-card-headline {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        /* Section */
        .sg-section {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .sg-section-label {
          font-size: 0.5625rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        /* Demographics grid */
        .sg-demo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.375rem;
          padding: 0.625rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }
        .sg-demo-item {
          display: flex;
          flex-direction: column;
          gap: 0.0625rem;
        }
        .sg-demo-full { grid-column: 1 / -1; }
        .sg-demo-label {
          font-size: 0.5625rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .sg-demo-value {
          font-size: 0.75rem;
          color: var(--color-text-primary);
          font-weight: 500;
        }

        /* Psychographics tags */
        .sg-tags-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .sg-tags-row {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .sg-tags-label {
          font-size: 0.5625rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .sg-tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
        }
        .sg-tag {
          display: inline-flex;
          padding: 0.2rem 0.4rem;
          border-radius: 5px;
          font-size: 0.625rem;
          font-weight: 500;
        }
        .sg-tag-value {
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
        .sg-tag-pain {
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-plasma-amber, #f59e0b);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        /* Reasoning */
        .sg-reasoning {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        /* Card actions */
        .sg-card-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .sg-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          flex: 1;
          justify-content: center;
        }
        .sg-btn-accept {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.25);
        }
        .sg-btn-accept:hover {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.4);
        }
        .sg-btn-regenerate {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.25);
        }
        .sg-btn-regenerate:hover {
          background: rgba(245, 158, 11, 0.2);
          border-color: rgba(245, 158, 11, 0.4);
        }
        .sg-btn-reject {
          background: rgba(255, 255, 255, 0.04);
          color: var(--color-text-muted);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .sg-btn-reject:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--color-text-secondary);
        }

        /* Accepted badge */
        .sg-card-accepted-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
          font-size: 0.8125rem;
          font-weight: 500;
        }

        /* ─── Form Styles ──────────────────────────────────────────── */
        .sg-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .sg-form-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #f87171;
          font-size: 0.875rem;
        }
        .sg-form-warning {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          color: #fbbf24;
        }
        .sg-form-warning strong {
          font-size: 0.875rem;
          display: block;
          margin-bottom: 0.25rem;
        }
        .sg-form-warning p { font-size: 0.8125rem; margin: 0; }

        .sg-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .sg-form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .sg-required { color: #f87171; }

        .sg-form-select {
          padding: 0.625rem 2rem 0.625rem 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          background: rgba(255, 255, 255, 0.03);
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5rem;
          appearance: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sg-form-select:focus {
          outline: none;
          border-color: var(--color-plasma-violet);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }
        .sg-form-select:disabled {
          opacity: 0.5; cursor: not-allowed;
        }

        .sg-form-hint {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          margin: 0;
        }
        .sg-form-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
        }
        .sg-form-info-label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }
        .sg-form-info-value {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .sg-form-info-none {
          color: var(--color-text-muted);
          font-weight: 400;
          font-style: italic;
        }

        /* Count selector */
        .sg-count-selector {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .sg-count-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sg-count-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .sg-count-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sg-count-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--color-text-primary);
          min-width: 2rem;
          text-align: center;
        }

        /* ─── Footer Buttons ───────────────────────────────────────── */
        .sg-btn-secondary {
          padding: 0.625rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          color: var(--color-text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sg-btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
        }
        .sg-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

        .sg-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }
        .sg-btn-primary:hover:not(:disabled) {
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
          transform: translateY(-1px);
        }
        .sg-btn-primary:disabled {
          opacity: 0.5; cursor: not-allowed; box-shadow: none;
        }

        .sg-btn-accept-all {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sg-btn-accept-all:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.5);
        }
        .sg-btn-accept-all:disabled { opacity: 0.5; cursor: not-allowed; }

        .sg-btn-done {
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }
        .sg-btn-done:hover:not(:disabled) {
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
          transform: translateY(-1px);
        }
        .sg-btn-done:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ─── Responsive ───────────────────────────────────────────── */
        @media (max-width: 768px) {
          .sg-modal-content, .sg-modal-wide {
            max-width: 100%;
            max-height: 100vh;
            border-radius: 0;
          }
          .sg-cards-grid {
            grid-template-columns: 1fr;
          }
          .sg-card-actions {
            flex-wrap: wrap;
          }
          .sg-btn {
            flex: 0 0 auto;
          }
        }
      `}</style>
    </div>
  );
}
