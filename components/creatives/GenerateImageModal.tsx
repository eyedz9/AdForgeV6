/**
 * GenerateImageModal Component
 *
 * Modal for generating AI-powered advertising images from the UI.
 *
 * Features:
 * - Select persona (required)
 * - Image type selector: Hero Ad, Product Focus, Lifestyle, Testimonial, Comparison, UGC Style
 * - Style preset selector: Clean Modern, Bold & Vibrant, Natural Organic, Premium Studio, Authentic Raw
 * - Output format selector with dimension previews
 * - Number of variations (1-5)
 * - Generate button triggers API
 * - Loading state with progress
 * - Success shows generated images
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { getPersonas } from "@/app/actions/personas";
import { getProducts } from "@/app/actions/products";
import type { Persona, Product } from "@/lib/supabase/database.types";

// Image type options
const imageTypes = [
  { value: "hero-ad", label: "Hero Ad", description: "Dramatic, aspirational campaign imagery" },
  { value: "product-focus", label: "Product Focus", description: "Product clearly visible, professional commercial" },
  { value: "lifestyle", label: "Lifestyle", description: "Authentic moments, natural lighting" },
  { value: "testimonial", label: "Testimonial", description: "Portrait style, genuine and approachable" },
  { value: "comparison", label: "Comparison", description: "Before/after or transformation style" },
  { value: "ugc-style", label: "UGC Style", description: "Candid, smartphone aesthetic" },
] as const;

type ImageType = (typeof imageTypes)[number]["value"];

// Style preset options
const stylePresets = [
  { value: "clean-modern", label: "Clean Modern", description: "Minimalist, sleek, contemporary" },
  { value: "bold-vibrant", label: "Bold & Vibrant", description: "High saturation, energetic, eye-catching" },
  { value: "natural-organic", label: "Natural Organic", description: "Earthy tones, warm, authentic" },
  { value: "premium-studio", label: "Premium Studio", description: "High-end, polished, luxury feel" },
  { value: "authentic-raw", label: "Authentic Raw", description: "Candid, relatable, UGC-like" },
] as const;

type StylePreset = (typeof stylePresets)[number]["value"];

// Output format options
const outputFormats = [
  { value: "1080x1080", label: "Square", dimensions: "1080 × 1080", ratio: "1:1", width: 1, height: 1 },
  { value: "1080x1920", label: "Story/Reel", dimensions: "1080 × 1920", ratio: "9:16", width: 9, height: 16 },
  { value: "1080x1350", label: "Portrait", dimensions: "1080 × 1350", ratio: "4:5", width: 4, height: 5 },
  { value: "1200x628", label: "Landscape Link", dimensions: "1200 × 628", ratio: "1.91:1", width: 1.91, height: 1 },
  { value: "1920x1080", label: "Landscape HD", dimensions: "1920 × 1080", ratio: "16:9", width: 16, height: 9 },
] as const;

type OutputFormat = (typeof outputFormats)[number]["value"];

// Demographics type for display
interface DemographicsData {
  age?: number;
  gender?: string;
  location?: string;
}

// Generated creative response from API
interface GeneratedCreativeResponse {
  id: string;
  file_url: string;
  thumbnail_url: string | null;
  creative_type: string;
  subtype: string | null;
  dimensions: {
    width: number;
    height: number;
  } | null;
  generation_prompt: string;
  created_at: string;
}

// API response types
interface GenerateApiResponse {
  success: boolean;
  creatives: GeneratedCreativeResponse[];
  generated: number;
  requested: number;
  errors?: string[];
  usage?: {
    quota: { remaining: number; limit: number };
  };
  generation?: {
    prompt: string;
    style_preset: string;
    output_format: string;
    total_time_ms: number;
  };
}

interface QuotaErrorResponse {
  error: string;
  remaining: number;
  limit: number;
}

// Props for the modal
interface GenerateImageModalProps {
  brandId: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

// Generated image card component
function GeneratedImageCard({ creative }: { creative: GeneratedCreativeResponse }) {
  return (
    <div className="generated-image-card">
      <div className="image-preview">
        <img src={creative.file_url} alt="Generated creative" />
      </div>
      <div className="image-info">
        {creative.dimensions && (
          <span className="image-dimensions">
            {creative.dimensions.width} × {creative.dimensions.height}
          </span>
        )}
        {creative.subtype && (
          <span className="image-subtype">
            {creative.subtype.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        )}
      </div>
    </div>
  );
}

// Persona selector card component
function PersonaSelectorCard({
  persona,
  isSelected,
  onClick,
}: {
  persona: Persona;
  isSelected: boolean;
  onClick: () => void;
}) {
  const demographics = persona.demographics as DemographicsData | null;

  const demographicParts: string[] = [];
  if (demographics?.age) demographicParts.push(`${demographics.age}y`);
  if (demographics?.gender) demographicParts.push(demographics.gender);
  if (demographics?.location) demographicParts.push(demographics.location);

  return (
    <div
      className={`persona-selector-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="persona-selector-avatar">
        {persona.photo_url ? (
          <img src={persona.photo_url} alt={persona.name} />
        ) : (
          <svg
            width="20"
            height="20"
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
        )}
      </div>
      <div className="persona-selector-info">
        <span className="persona-name">{persona.name}</span>
        {demographicParts.length > 0 && (
          <span className="persona-demographics">{demographicParts.join(" • ")}</span>
        )}
      </div>
      {isSelected && (
        <div className="selected-check">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default function GenerateImageModal({
  brandId,
  isOpen,
  onClose,
  onGenerated,
}: GenerateImageModalProps) {
  // State
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [imageType, setImageType] = useState<ImageType>("hero-ad");
  const [stylePreset, setStylePreset] = useState<StylePreset>("clean-modern");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("1080x1080");
  const [imageCount, setImageCount] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCreatives, setGeneratedCreatives] = useState<GeneratedCreativeResponse[]>([]);
  const [quotaInfo, setQuotaInfo] = useState<{ remaining: number; limit: number } | null>(null);
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);

  // Fetch personas and products when modal opens
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [personasResult, productsResult] = await Promise.all([
        getPersonas(brandId),
        getProducts(brandId),
      ]);

      if (personasResult.success) {
        setPersonas(personasResult.data);
        // Auto-select if only one persona
        if (personasResult.data.length === 1) {
          setSelectedPersonaId(personasResult.data[0].id);
        }
      } else {
        setPersonas([]);
        console.warn("Failed to fetch personas:", personasResult.error);
      }

      if (productsResult.success) {
        setProducts(productsResult.data);
        // Auto-select if only one product
        if (productsResult.data.length === 1) {
          setSelectedProductId(productsResult.data[0].id);
        }
      } else {
        setProducts([]);
        console.warn("Failed to fetch products:", productsResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }

    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Reset state when modal opens
      setGeneratedCreatives([]);
      setGenerationErrors([]);
      setQuotaInfo(null);
      setSelectedPersonaId("");
      setSelectedProductId("");
      setImageType("hero-ad");
      setStylePreset("clean-modern");
      setOutputFormat("1080x1080");
      setImageCount(3);
    }
  }, [isOpen, fetchData]);

  // Handle generate button click
  const handleGenerate = async () => {
    // Validate required fields
    if (!selectedPersonaId) {
      setError("Please select a persona");
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedCreatives([]);
    setGenerationErrors([]);

    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand_id: brandId,
          persona_id: selectedPersonaId,
          product_id: selectedProductId || null,
          image_type: imageType,
          style_preset: stylePreset,
          output_format: outputFormat,
          count: imageCount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle quota exceeded
        if (response.status === 429) {
          const quotaError = errorData as QuotaErrorResponse;
          setQuotaInfo({
            remaining: quotaError.remaining,
            limit: quotaError.limit,
          });
          setError(quotaError.error);
          setGenerating(false);
          return;
        }

        setError(errorData.error || "Failed to generate images");
        setGenerating(false);
        return;
      }

      const data: GenerateApiResponse = await response.json();

      if (data.success) {
        setGeneratedCreatives(data.creatives);
        if (data.errors && data.errors.length > 0) {
          setGenerationErrors(data.errors);
        }
        if (data.usage?.quota) {
          setQuotaInfo(data.usage.quota);
        }
      } else {
        setError("Failed to generate images");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate images");
    }

    setGenerating(false);
  };

  // Handle close
  const handleClose = () => {
    if (generatedCreatives.length > 0) {
      onGenerated();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Generate Images</h3>
          <button className="modal-close" onClick={handleClose} disabled={generating}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Loading state */}
          {loading && (
            <div className="modal-loading">
              <div className="spinner" />
              <p>Loading options...</p>
            </div>
          )}

          {/* Generation in progress */}
          {generating && (
            <div className="modal-generating">
              <div className="generating-animation">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="generating-icon"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h4>Generating {imageCount} image{imageCount !== 1 ? "s" : ""}...</h4>
              <p className="generating-message">
                Our AI is creating high-quality advertising images tailored to your persona.
                This may take a moment.
              </p>
              <div className="generating-steps">
                <div className="step active">
                  <span className="step-dot" />
                  Building persona-aware prompt
                </div>
                <div className="step active">
                  <span className="step-dot" />
                  Applying {stylePresets.find((s) => s.value === stylePreset)?.label} style
                </div>
                <div className="step active">
                  <span className="step-dot" />
                  Rendering images
                </div>
              </div>
            </div>
          )}

          {/* Success state */}
          {!loading && !generating && generatedCreatives.length > 0 && (
            <div className="modal-success">
              <div className="success-header">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>
                  <h4>
                    Successfully Generated {generatedCreatives.length} Image
                    {generatedCreatives.length !== 1 ? "s" : ""}!
                  </h4>
                  {quotaInfo && (
                    <p className="quota-remaining">
                      {quotaInfo.remaining} of {quotaInfo.limit} images remaining this month
                    </p>
                  )}
                </div>
              </div>

              {generationErrors.length > 0 && (
                <div className="generation-warnings">
                  <p className="warnings-title">Some issues were encountered:</p>
                  <ul>
                    {generationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="generated-images-grid">
                {generatedCreatives.map((creative) => (
                  <GeneratedImageCard key={creative.id} creative={creative} />
                ))}
              </div>
            </div>
          )}

          {/* Form state */}
          {!loading && !generating && generatedCreatives.length === 0 && (
            <div className="modal-form">
              {/* Error display */}
              {error && (
                <div className="form-error">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                  {quotaInfo && quotaInfo.remaining === 0 && (
                    <a href="/settings/subscription" className="upgrade-link">
                      Upgrade Plan
                    </a>
                  )}
                </div>
              )}

              {/* No personas warning */}
              {personas.length === 0 && (
                <div className="form-warning">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <strong>No personas available</strong>
                    <p>Create a persona first to generate images tailored to your target audience.</p>
                  </div>
                </div>
              )}

              {/* Persona selection */}
              {personas.length > 0 && (
                <div className="form-group">
                  <label>
                    Select Persona <span className="required">*</span>
                  </label>
                  <div className="persona-selector-grid">
                    {personas.map((persona) => (
                      <PersonaSelectorCard
                        key={persona.id}
                        persona={persona}
                        isSelected={selectedPersonaId === persona.id}
                        onClick={() => setSelectedPersonaId(persona.id)}
                      />
                    ))}
                  </div>
                  <p className="form-hint">
                    Images will be generated featuring this persona&apos;s characteristics.
                  </p>
                </div>
              )}

              {/* Product selection (optional) */}
              {products.length > 0 && (
                <div className="form-group">
                  <label htmlFor="product-select">Product (Optional)</label>
                  <select
                    id="product-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">No specific product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <p className="form-hint">
                    Optionally include a product in the generated images.
                  </p>
                </div>
              )}

              {/* Image type selection */}
              <div className="form-group">
                <label>Image Type</label>
                <div className="options-grid image-type-grid">
                  {imageTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`option-card ${imageType === type.value ? "selected" : ""}`}
                      onClick={() => setImageType(type.value)}
                    >
                      <span className="option-label">{type.label}</span>
                      <span className="option-description">{type.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Style preset selection */}
              <div className="form-group">
                <label>Style Preset</label>
                <div className="options-grid style-preset-grid">
                  {stylePresets.map((preset) => (
                    <div
                      key={preset.value}
                      className={`option-card ${stylePreset === preset.value ? "selected" : ""}`}
                      onClick={() => setStylePreset(preset.value)}
                    >
                      <span className="option-label">{preset.label}</span>
                      <span className="option-description">{preset.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Output format selection */}
              <div className="form-group">
                <label>Output Format</label>
                <div className="format-options">
                  {outputFormats.map((format) => (
                    <div
                      key={format.value}
                      className={`format-option ${outputFormat === format.value ? "selected" : ""}`}
                      onClick={() => setOutputFormat(format.value)}
                    >
                      <div
                        className="format-preview"
                        style={{
                          aspectRatio: `${format.width} / ${format.height}`,
                        }}
                      >
                        <span className="format-ratio">{format.ratio}</span>
                      </div>
                      <span className="format-label">{format.label}</span>
                      <span className="format-dimensions">{format.dimensions}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image count */}
              <div className="form-group">
                <label>Number of Variations</label>
                <div className="count-selector">
                  <button
                    type="button"
                    className="count-btn"
                    onClick={() => setImageCount(Math.max(1, imageCount - 1))}
                    disabled={imageCount <= 1}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span className="count-value">{imageCount}</span>
                  <button
                    type="button"
                    className="count-btn"
                    onClick={() => setImageCount(Math.min(5, imageCount + 1))}
                    disabled={imageCount >= 5}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
                <p className="form-hint">
                  Generate 1-5 unique images per request. Each image counts toward your monthly quota.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {/* Form buttons */}
          {!generating && generatedCreatives.length === 0 && (
            <>
              <button className="btn-cancel" onClick={handleClose} disabled={generating}>
                Cancel
              </button>
              <button
                className="btn-generate"
                onClick={handleGenerate}
                disabled={generating || loading || personas.length === 0 || !selectedPersonaId}
              >
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
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Generate {imageCount} Image{imageCount !== 1 ? "s" : ""}
              </button>
            </>
          )}

          {/* Success buttons */}
          {!generating && generatedCreatives.length > 0 && (
            <>
              <button
                className="btn-generate-more"
                onClick={() => {
                  setGeneratedCreatives([]);
                  setGenerationErrors([]);
                }}
              >
                Generate More
              </button>
              <button className="btn-done" onClick={handleClose}>
                Done
              </button>
            </>
          )}

          {/* Generating - just close button */}
          {generating && (
            <button className="btn-cancel" disabled>
              Generating...
            </button>
          )}
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }
        .modal-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .modal-close:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          color: var(--color-text-primary);
        }
        .modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        /* Loading state */
        .modal-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(139, 92, 246, 0.2);
          border-top-color: var(--color-plasma-violet);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .modal-loading p {
          margin: 1rem 0 0;
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Generating state */
        .modal-generating {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          text-align: center;
        }
        .generating-animation {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, var(--color-plasma-violet) 0%, var(--color-plasma-purple) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.4);
        }
        .generating-icon {
          color: white;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .modal-generating h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 0.5rem;
        }
        .generating-message {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0 0 1.5rem;
          max-width: 400px;
          line-height: 1.5;
        }
        .generating-steps {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: left;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }
        .step.active {
          color: var(--color-plasma-violet);
        }
        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }
        .step.active .step-dot {
          animation: dotPulse 1s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Success state */
        .modal-success {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .success-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .success-header h4 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .quota-remaining {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          margin: 0.25rem 0 0;
        }
        .generation-warnings {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          padding: 0.75rem 1rem;
        }
        .warnings-title {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-plasma-amber);
          margin: 0 0 0.5rem;
        }
        .generation-warnings ul {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.75rem;
          color: var(--color-plasma-amber);
        }
        .generated-images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 0.75rem;
        }
        .generated-image-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          overflow: hidden;
        }
        .image-preview {
          aspect-ratio: 1;
          background: rgba(255, 255, 255, 0.03);
        }
        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .image-info {
          padding: 0.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .image-dimensions {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        .image-subtype {
          font-size: 0.6875rem;
          font-weight: 500;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        /* Form state */
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(244, 63, 94, 0.15);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 8px;
          color: var(--color-plasma-rose);
          font-size: 0.875rem;
        }
        .upgrade-link {
          margin-left: auto;
          color: var(--color-plasma-violet);
          font-weight: 500;
          text-decoration: none;
        }
        .upgrade-link:hover {
          text-decoration: underline;
        }
        .form-warning {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          color: var(--color-plasma-amber);
        }
        .form-warning strong {
          font-size: 0.875rem;
          display: block;
          margin-bottom: 0.25rem;
        }
        .form-warning p {
          font-size: 0.8125rem;
          margin: 0;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .required {
          color: var(--color-plasma-rose);
        }
        .form-select {
          padding: 0.625rem 2rem 0.625rem 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
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
        }
        .form-select:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }
        .form-hint {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        /* Persona selector */
        .persona-selector-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
        }
        .persona-selector-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .persona-selector-card:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .persona-selector-card.selected {
          background: rgba(139, 92, 246, 0.12);
          border-color: var(--color-plasma-violet);
        }
        .persona-selector-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-plasma-violet) 0%, var(--color-plasma-purple) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          overflow: hidden;
          flex-shrink: 0;
        }
        .persona-selector-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .persona-selector-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          min-width: 0;
        }
        .persona-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .persona-demographics {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .selected-check {
          width: 24px;
          height: 24px;
          background: var(--color-plasma-violet);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        /* Options grid */
        .options-grid {
          display: grid;
          gap: 0.5rem;
        }
        .image-type-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .style-preset-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .option-card {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .option-card:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .option-card.selected {
          background: rgba(139, 92, 246, 0.12);
          border-color: var(--color-plasma-violet);
        }
        .option-label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .option-description {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          line-height: 1.3;
        }

        /* Format options */
        .format-options {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
        }
        .format-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 90px;
        }
        .format-option:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .format-option.selected {
          background: rgba(139, 92, 246, 0.12);
          border-color: var(--color-plasma-violet);
        }
        .format-preview {
          width: 50px;
          max-height: 70px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .format-ratio {
          font-size: 0.625rem;
          font-weight: 500;
          color: var(--color-text-muted);
        }
        .format-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-text-primary);
          text-align: center;
        }
        .format-dimensions {
          font-size: 0.625rem;
          color: var(--color-text-muted);
        }

        /* Count selector */
        .count-selector {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .count-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .count-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .count-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .count-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--color-text-primary);
          min-width: 2rem;
          text-align: center;
        }

        /* Buttons */
        .btn-cancel {
          padding: 0.625rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-cancel:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .btn-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-generate {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
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
        .btn-generate:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.35);
        }
        .btn-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-generate-more {
          padding: 0.625rem 1rem;
          background: transparent;
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-generate-more:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: var(--color-plasma-violet);
        }
        .btn-done {
          padding: 0.625rem 1.25rem;
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
        .btn-done:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.35);
        }

        @media (max-width: 640px) {
          .modal-content {
            max-height: 100vh;
            border-radius: 0;
          }
          .image-type-grid,
          .style-preset-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .format-options {
            flex-wrap: wrap;
          }
          .format-option {
            min-width: calc(50% - 0.375rem);
          }
          .generated-images-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
